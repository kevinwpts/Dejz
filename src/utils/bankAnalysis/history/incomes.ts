// Steg 3: lön och andra återkommande inkomster (CSN, Försäkringskassan, a-kassa, pension) och lönedag.
// Överföringar och återbetalningar får aldrig automatiskt bli lön.
import { BankAccount, BankTransactionItem } from '../../../services/bank/types';
import { Frequency } from '../../../types';
import { getLogoUrl } from '../../logo';
import { DetectedIncomeWithEvidence } from '../types';
import { isLikelyPersonFullName } from '../accounts';
import { getNormalizedBankTxAmount } from '../normalization/amount';
import { isInternalTransferOrMicroSavings } from '../normalization/internalTransfer';
import {
  VARIABLE_SPENDING_EXCLUSIONS,
  buildEvidenceSummary,
  cleanDisplayMerchantName,
  getDayOfMonthFromIso,
  inferTrueRecurringDayOfMonth,
  normalizeMerchantKey,
} from '../merchantRules';
import {
  getBankTxCodeDescription,
  getTxDate,
  getTxText,
  hasVariableAmounts,
  includesAny,
  isTransferBankCode,
} from '../txFields';
import { countDistinctMonths } from './shared';

/** Insättningar med dessa ord är överföringar, returer eller butiker – aldrig inkomst. */
const REFUND_OR_TRANSFER_EXCLUSIONS = [
  'överföring', 'overforing', 'egna konton', 'sparkonto', 'enkla vardagen', 'enkla sparkontot',
  'swish', 'återköp', 'aterkop', 'retur', 'refund', 'kreditering', 'återbetalning', 'aterbetalning',
  'tillgodo', 'apotea', 'apoteket', 'ica ', 'coop ', 'willys', 'hemköp', 'lidl', 'ikea', 'h&m',
  'zara', 'elgiganten', 'klarna', 'apple.com', 'zalando', 'boozt',
];

/** Ord per inkomsttyp. */
const SALARY_WORDS = ['lön', 'lon ', 'salary', 'löneutbetalning', 'loneutbetalning', 'arvode'];
const CSN_WORDS = ['csn', 'studiestöd', 'studiestod', 'centrala studiestödsnämnden'];
const FK_WORDS = [
  'försäkringskassan', 'forsakringskassan', 'fkassa', 'föräldrapenning', 'foraldrapenning',
  'sjukpenning', 'bostadsbidrag', 'aktivitetsstöd', 'aktivitetsersättning', 'sjukersättning',
  'underhållsstöd',
];
const PENSION_WORDS = ['pension', 'pensionsmyndigheten', 'alecta', 'amf ', 'min pension', 'kåpan', 'spv '];
const AKASSA_WORDS = [
  'a-kassa', 'a kassa', 'akassa', 'arbetslöshetsersättning', 'arbetsloshetsersattning',
  'alfakassan', 'alfa-kassan', 'unionen', 'akademikernas', 'småa', 'smaa',
];
const INCOME_BANK_CODE_WORDS = ['salary', 'pension', 'social benefit'];

/** Ord som räcker för att en grupp ska räknas som inkomst redan efter en utbetalning. */
const EXPLICIT_INCOME_WORDS = [
  'lön', 'lon ', 'salary', 'löneutbetalning', 'loneutbetalning', 'utbetalning', 'arvode', 'csn',
  'studiestöd', 'studiestod', 'försäkringskassan', 'forsakringskassan', 'fkassa', 'föräldrapenning',
  'foraldrapenning', 'sjukpenning', 'bostadsbidrag', 'aktivitetsstöd', 'barnbidrag', 'pension',
  'a-kassa', 'a kassa', 'akassa', 'alfakassan', 'alfa-kassan', 'unionen', 'akademikernas', 'småa',
  'smaa', 'arbetslös',
];

/** Inkomstgrupp under insamlingen. Första (nyaste) transaktionen bestämmer namn och typ. */
interface IncomeGroup {
  name: string;
  category: string;
  isPrimarySalary: boolean;
  txs: BankTransactionItem[];
  dates: string[];
  amounts: number[];
}

/** Vilken typ av inkomst en transaktion ser ut att vara. */
interface IncomeSignals {
  isExplicitSalary: boolean;
  isCsn: boolean;
  isFk: boolean;
  isBarnbidrag: boolean;
  isPension: boolean;
  isAkassa: boolean;
  isAnyIncome: boolean;
}

/** Sant om insättningen kan vara inkomst (minst 1 000 kr, inte överföring, retur eller butik). */
function isPossibleIncomeInflow(tx: BankTransactionItem, userAccounts: BankAccount[]): boolean {
  if (getNormalizedBankTxAmount(tx) < 1000) return false;
  if (isTransferBankCode(getBankTxCodeDescription(tx))) return false;
  if (isInternalTransferOrMicroSavings(tx, userAccounts)) return false;
  const text = getTxText(tx);
  return (
    !includesAny(text, REFUND_OR_TRANSFER_EXCLUSIONS) &&
    !includesAny(text, VARIABLE_SPENDING_EXCLUSIONS)
  );
}

/** Läser av vilka inkomstord och bankkoder transaktionen har. */
function readIncomeSignals(tx: BankTransactionItem): IncomeSignals {
  const text = getTxText(tx);
  const signals = {
    isExplicitSalary: includesAny(text, SALARY_WORDS),
    isCsn: includesAny(text, CSN_WORDS),
    isFk: includesAny(text, FK_WORDS),
    isBarnbidrag: text.includes('barnbidrag'),
    isPension: includesAny(text, PENSION_WORDS),
    isAkassa: includesAny(text, AKASSA_WORDS),
  };
  const isBankCodeIncome = includesAny(getBankTxCodeDescription(tx), INCOME_BANK_CODE_WORDS);
  const isAnyIncome =
    Object.values(signals).some(Boolean) || isBankCodeIncome || text.includes('utbetalning');
  return { ...signals, isAnyIncome };
}

type IncomeGroupIdentity = { key: string; name: string; category: string; isPrimarySalary: boolean };

/** A-kassans namn från motparten om det ser ut som en kassa, annars "A-kassa". */
function akassaDisplayName(tx: BankTransactionItem): string {
  const clean = tx.counterparty_name ? cleanDisplayMerchantName(tx.counterparty_name) : 'A-kassa';
  const lower = clean.toLowerCase();
  return lower.includes('kassa') || lower.includes('unionen') ? clean : 'A-kassa';
}

/** Lön eller okänd inkomst: grupperas per arbetsgivare/avsändare. */
function employerIdentity(tx: BankTransactionItem, amt: number, isExplicitSalary: boolean): IncomeGroupIdentity {
  const isPrimarySalary = isExplicitSalary || amt >= 10000;
  if (tx.counterparty_name) {
    const cleanEmp = cleanDisplayMerchantName(tx.counterparty_name);
    return {
      key: `salary_${normalizeMerchantKey(cleanEmp)}`,
      name: isExplicitSalary ? `Lön (${cleanEmp})` : cleanEmp || 'Lön',
      category: 'Lön',
      isPrimarySalary,
    };
  }
  const cleanDesc = cleanDisplayMerchantName(tx.description || '');
  if (cleanDesc && !['lön', 'insättning', 'utbetalning'].includes(cleanDesc.toLowerCase())) {
    return {
      key: `income_${normalizeMerchantKey(cleanDesc)}`,
      name: isExplicitSalary ? `Lön (${cleanDesc})` : cleanDesc,
      category: 'Lön',
      isPrimarySalary,
    };
  }
  return { key: 'salary', name: 'Lön', category: 'Lön', isPrimarySalary };
}

/** Bestämmer inkomstgrupp (barnbidrag, CSN, FK, a-kassa, pension eller lön per arbetsgivare). */
function identifyIncomeGroup(tx: BankTransactionItem, amt: number, s: IncomeSignals): IncomeGroupIdentity {
  if (s.isBarnbidrag) return { key: 'barnbidrag', name: 'Barnbidrag', category: 'Bidrag', isPrimarySalary: false };
  if (s.isCsn) return { key: 'csn', name: 'CSN', category: 'CSN', isPrimarySalary: false };
  if (s.isFk) return { key: 'fk', name: 'Försäkringskassan', category: 'Bidrag', isPrimarySalary: false };
  if (s.isAkassa) {
    return { key: 'akassa', name: akassaDisplayName(tx), category: 'Ersättning', isPrimarySalary: true };
  }
  if (s.isPension) return { key: 'pension', name: 'Pension', category: 'Pension', isPrimarySalary: true };
  return employerIdentity(tx, amt, s.isExplicitSalary);
}

/** Grupperar möjliga inkomster per källa, nyast först inom varje grupp. */
function groupIncomeInflows(inflows: BankTransactionItem[], userAccounts: BankAccount[]): Map<string, IncomeGroup> {
  const groups = new Map<string, IncomeGroup>();
  for (const tx of inflows) {
    if (!isPossibleIncomeInflow(tx, userAccounts)) continue;
    const amt = Math.round(getNormalizedBankTxAmount(tx));
    const signals = readIncomeSignals(tx);
    // Små insättningar utan några inkomstord är troligen inte inkomst
    if (!signals.isAnyIncome && amt < 5000) continue;

    const identity = identifyIncomeGroup(tx, amt, signals);
    const txDate = getTxDate(tx);
    const existing = groups.get(identity.key);
    if (!existing) {
      const { name, category, isPrimarySalary } = identity;
      groups.set(identity.key, { name, category, isPrimarySalary, txs: [tx], dates: txDate ? [txDate] : [], amounts: [amt] });
      continue;
    }
    existing.txs.push(tx);
    if (txDate) existing.dates.push(txDate);
    existing.amounts.push(amt);
  }
  return groups;
}

/** Sant om gruppens första transaktion uttryckligen nämner lön, bidrag, pension eller liknande. */
function hasExplicitIncomeKeyword(tx: BankTransactionItem): boolean {
  return (
    includesAny(getTxText(tx), EXPLICIT_INCOME_WORDS) ||
    includesAny(getBankTxCodeDescription(tx), INCOME_BANK_CODE_WORDS)
  );
}

/** Sant om gruppen räknas som inkomst: tydliga ord, eller minst två månader och inte en privatperson. */
function isAcceptedIncomeGroup(grp: IncomeGroup): boolean {
  if (hasExplicitIncomeKeyword(grp.txs[0])) return true;
  return countDistinctMonths(grp.dates) >= 2 && !isLikelyPersonFullName(grp.name);
}

/** Gör om en inkomstgrupp till en hittad inkomst med bevis och utbetalningsdag. */
function toDetectedIncome(grp: IncomeGroup): DetectedIncomeWithEvidence {
  const latestDate = grp.dates[0];
  const deductionDay = inferTrueRecurringDayOfMonth(
    grp.dates,
    'income',
    grp.category,
    grp.name,
    getDayOfMonthFromIso(latestDate, 25)
  );
  const isVariable = hasVariableAmounts(grp.amounts);
  return {
    name: grp.name,
    amount: grp.amounts[0],
    category: grp.category,
    deductionDay,
    isVariable,
    icon: 'Wallet',
    logo: getLogoUrl(grp.name, grp.category),
    detectedOccurrences: grp.txs.length,
    lastDate: latestDate,
    evidenceDates: grp.dates.slice(0, 6),
    evidenceAmounts: grp.amounts.slice(0, 6),
    evidenceSummary: buildEvidenceSummary(grp.txs.length, grp.dates, grp.amounts, Frequency.MONTHLY, isVariable),
  };
}

/**
 * Steg 3: hittar inkomster och föreslår lönedag. Lönedagen tas från första
 * huvudinkomsten (lön, a-kassa, pension), annars från den största inkomsten.
 */
export function detectIncomes(
  inflows: BankTransactionItem[],
  userAccounts: BankAccount[]
): { detectedIncomes: DetectedIncomeWithEvidence[]; suggestedPayday: number | null } {
  const detectedIncomes: DetectedIncomeWithEvidence[] = [];
  let suggestedPayday: number | null = null;

  for (const grp of groupIncomeInflows(inflows, userAccounts).values()) {
    if (!isAcceptedIncomeGroup(grp)) continue;
    const income = toDetectedIncome(grp);
    if (grp.isPrimarySalary && suggestedPayday === null) suggestedPayday = income.deductionDay ?? null;
    detectedIncomes.push(income);
  }

  // Största inkomsten först
  detectedIncomes.sort((a, b) => b.amount - a.amount);
  if (suggestedPayday === null && detectedIncomes.length > 0) {
    suggestedPayday = detectedIncomes[0].deductionDay || 25;
  }
  return { detectedIncomes, suggestedPayday };
}
