// Steg 2: återkommande dragningar hos samma mottagare som inga regler känner till (t.ex. ett lokalt gym).
import { BankTransactionItem } from '../../../services/bankService';
import { getLogoUrl } from '../../logo';
import { getNormalizedBankTxAmount } from '../normalization';
import {
  VARIABLE_SPENDING_EXCLUSIONS,
  buildEvidenceSummary,
  cleanDisplayMerchantName,
  getDayOfMonthFromIso,
  inferFrequencyFromDates,
  inferTrueRecurringDayOfMonth,
  normalizeMerchantKey,
} from '../merchantRules';
import {
  getBankTxCodeDescription,
  getTxDate,
  getTxText,
  hasVariableAmounts,
  includesAny,
} from '../txFields';
import { DetectedFixedWithTxIds, absRoundedAmount, collectTxDates, countDistinctMonths } from './shared';

/** Ord som visar att det är en räkning/avtal även om den bara syns en gång. */
const EXPLICIT_BILL_WORDS = ['autogiro', 'bankgiro', 'plusgiro', 'hyresavi', 'förskola', 'forskola'];

/** Sant om utgiften ska vara med i grupperingen (lagom belopp, inte vardagsköp eller Swish). */
function isRecurringMerchantCandidate(tx: BankTransactionItem): boolean {
  const absAmount = absRoundedAmount(tx);
  if (absAmount < 25 || absAmount > 50000) return false;
  const text = getTxText(tx);
  if (includesAny(text, VARIABLE_SPENDING_EXCLUSIONS)) return false;
  const isSwishOrTransfer = includesAny(text, ['swish', 'överföring', 'overforing']);
  return !(isSwishOrTransfer && !text.includes('autogiro'));
}

/** Grupperar utgifter som inte redan är fasta per mottagare (normaliserat namn). */
function groupOutflowsByMerchant(
  outflows: BankTransactionItem[],
  fixedTransactionIds: Set<string>
): Map<string, BankTransactionItem[]> {
  const groups = new Map<string, BankTransactionItem[]>();
  for (const tx of outflows) {
    if (fixedTransactionIds.has(tx.id) || !isRecurringMerchantCandidate(tx)) continue;
    const normKey = normalizeMerchantKey(tx.counterparty_name || tx.description || '');
    if (!normKey || normKey.length < 3) continue;
    const list = groups.get(normKey) || [];
    list.push(tx);
    groups.set(normKey, list);
  }
  return groups;
}

/** Sant om senaste dragningen har bankkod eller ord för autogiro/bankgiro/avtal. */
function hasExplicitBillSignal(latestTx: BankTransactionItem): boolean {
  return (
    getBankTxCodeDescription(latestTx) === 'direct debit' ||
    includesAny(getTxText(latestTx), EXPLICIT_BILL_WORDS)
  );
}

/** Antal dragningar vars belopp ligger inom ±35 % av det senaste. */
function countConsistentAmounts(groupTxs: BankTransactionItem[], latestAmount: number): number {
  return groupTxs.filter((t) => {
    const ratio = Math.abs(getNormalizedBankTxAmount(t)) / (latestAmount || 1);
    return ratio >= 0.65 && ratio <= 1.35;
  }).length;
}

/** Gissar kategori: stort belopp i slutet av månaden = boende, litet = abonnemang, annars räkning. */
function guessRecurringCategory(latestAmount: number, deductionDay: number): string {
  if (latestAmount >= 3500 && deductionDay >= 24) return 'Boende';
  if (latestAmount <= 350) return 'Abonnemang';
  return 'Räkningar';
}

/** Bygger en fast utgift av en grupp som bevisat återkommer. */
function buildRecurringExpense(
  normKey: string,
  groupTxs: BankTransactionItem[],
  distinctMonths: number,
  isExplicitBill: boolean
): DetectedFixedWithTxIds {
  const latestTx = groupTxs[0];
  const latestAmount = absRoundedAmount(latestTx);
  const displayName = cleanDisplayMerchantName(
    latestTx.counterparty_name || latestTx.description || normKey
  );
  const txDate = getTxDate(latestTx) || undefined;
  const deductionDay = getDayOfMonthFromIso(txDate, 27);
  const category = guessRecurringCategory(latestAmount, deductionDay);
  const dates = collectTxDates(groupTxs);
  const amounts = groupTxs.map(absRoundedAmount);
  const frequency = inferFrequencyFromDates(dates);
  const isVariable = hasVariableAmounts(amounts);
  const occurrences = distinctMonths || groupTxs.length;

  return {
    name: displayName,
    amount: latestAmount,
    category,
    frequency,
    deductionDay: inferTrueRecurringDayOfMonth(dates, 'expense', category, displayName, deductionDay),
    paymentMethod: isExplicitBill ? 'Autogiro' : 'Kort',
    isVariable,
    logo: getLogoUrl(displayName, category),
    detectedOccurrences: occurrences,
    lastDate: txDate,
    evidenceDates: dates.slice(0, 6),
    evidenceAmounts: amounts.slice(0, 6),
    evidenceSummary: buildEvidenceSummary(occurrences, dates, amounts, frequency, isVariable),
    matchedTxIds: new Set(groupTxs.map((t) => t.id)),
  };
}

/**
 * Steg 2: hittar dragningar hos samma mottagare i minst två månader (högst ~1 per månad)
 * eller med tydligt autogiro/bankgiro. Lägger in dem i `detected` och markerar transaktionerna.
 */
export function detectRecurringMerchantExpenses(
  outflows: BankTransactionItem[],
  detected: Map<string, DetectedFixedWithTxIds>,
  fixedTransactionIds: Set<string>
): void {
  const groups = groupOutflowsByMerchant(outflows, fixedTransactionIds);
  for (const [normKey, groupTxs] of groups.entries()) {
    const distinctMonths = countDistinctMonths(groupTxs.map(getTxDate));
    const latestAmount = absRoundedAmount(groupTxs[0]);
    const isExplicitBill = hasExplicitBillSignal(groupTxs[0]);
    const isRecurring =
      (distinctMonths >= 2 &&
        countConsistentAmounts(groupTxs, latestAmount) >= 2 &&
        groupTxs.length <= distinctMonths * 1.5) ||
      (isExplicitBill && latestAmount >= 49);
    if (!isRecurring) continue;

    for (const t of groupTxs) fixedTransactionIds.add(t.id);
    detected.set(`recurring_${normKey}`, buildRecurringExpense(normKey, groupTxs, distinctMonths, isExplicitBill));
  }
}
