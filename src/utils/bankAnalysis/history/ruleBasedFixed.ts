// Steg 1: fasta utgifter som matchar kända svenska räkningar och abonnemang (Netflix, hyra, el …).
import { BankTransactionItem } from '../../../services/bankService';
import { SWEDISH_EXPENSE_PRESETS, SwedishExpensePreset } from '../../../data/swedishExpensePresets';
import { FixedExpense, Frequency } from '../../../types';
import { getLogoUrl } from '../../logo';
import {
  EXTENDED_FIXED_EXPENSE_RULES,
  KeywordRule,
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
import { DetectedFixedWithTxIds, absRoundedAmount, countDistinctMonths } from './shared';

/** Vanliga prisnivåer i App Store/Google Play – sådana belopp är nästan alltid abonnemang. */
const STANDARD_APPLE_GOOGLE_SUB_TIERS = new Set([
  9, 10, 12, 15, 19, 20, 25, 29, 30, 35, 39, 45, 49, 55, 59, 65, 69, 75, 79, 85, 89, 95, 99,
  105, 109, 115, 119, 125, 129, 135, 139, 145, 149, 155, 159, 165, 169, 175, 179, 185, 189,
  195, 199, 209, 219, 229, 239, 249, 259, 269, 279, 289, 299, 319, 329, 349, 359, 379, 399,
  449, 499,
]);

/** Apple-belopp som är iCloud+-lagring. */
const ICLOUD_PLUS_AMOUNTS = [12, 39, 129];

/** Ord som betyder avtal/räkning, och kategorier som nästan alltid är fasta. */
const AGREEMENT_WORDS = ['hyra', 'hyresavi', 'bolån', 'csn'];
const AGREEMENT_CATEGORIES = ['Boende', 'Försäkringar', 'Streaming', 'Abonnemang', 'Hälsa', 'Räkningar'];

/** Hela ord för el ("El", "Elnät") – inte bokstäverna "el" i t.ex. Telia, Hotel eller Tele2. */
const UTILITY_NAME_PATTERN = /(^|[^a-zåäö])(el|elnät|elnat|elavtal|elräkning|elrakning|elhandel)([^a-zåäö]|$)/;
const UTILITY_NAME_WORDS = ['öresund', 'oresund', 'tibber', 'vattenfall', 'fortum', 'trängselskatt'];

/** En kandidat under insamlingen, innan vi vet om den återkommer. */
type RuleCandidate = Omit<FixedExpense, 'id'> & {
  detectedOccurrences: number;
  lastDate?: string;
  matchedTxIds: Set<string>;
  dates: string[];
  amounts: number[];
  hasExplicitAutogiroOrInvoice: boolean;
  requireMultipleMonthsForCard?: boolean;
};

/** Det en enskild transaktion bidrar med till en kandidat. */
interface RuleMatch {
  key: string;
  txDate: string | undefined;
  absAmount: number;
  hasExplicitAutogiroOrInvoice: boolean;
  createCandidate: () => RuleCandidate;
}

/** Första regeln vars nyckelord finns i texten, eller null. */
function findMatchingRule(text: string): KeywordRule | null {
  return (
    EXTENDED_FIXED_EXPENSE_RULES.find((rule) =>
      rule.keywords.some((kw) => text.includes(kw.toLowerCase()))
    ) || null
  );
}

/** Namnet som visas: "Hyra (Heimstaden)", "Apple / iCloud+" eller förvalets namn. */
function buildRuleDisplayName(
  rule: KeywordRule,
  preset: SwedishExpensePreset | undefined,
  cleanedRawName: string,
  absAmount: number
): string {
  if (rule.presetId === 'hyra-bostad' && cleanedRawName.length >= 3) return `Hyra (${cleanedRawName})`;
  const isAppleBillingRule =
    rule.fallbackName === 'Apple / iCloud' || rule.keywords.includes('apple.com/bill');
  if (isAppleBillingRule) {
    return ICLOUD_PLUS_AMOUNTS.includes(absAmount) ? 'Apple / iCloud+' : 'Apple-abonnemang';
  }
  return preset?.name || rule.fallbackName;
}

/** Nyckeln som grupperar dragningar (hyra per hyresvärd, ibland per exakt belopp). */
function buildRuleGroupKey(rule: KeywordRule, cleanedRawName: string, absAmount: number): string {
  const baseKey =
    rule.presetId === 'hyra-bostad'
      ? `housing_${normalizeMerchantKey(cleanedRawName)}`
      : rule.presetId || rule.fallbackName.toLowerCase();
  return rule.splitByExactAmount ? `${baseKey}_${absAmount}` : baseKey;
}

/** Betalsätt utifrån bankkod och text: Autogiro, Bankgiro eller förvalets/regelns. */
function resolveRulePaymentMethod(
  bankTxCode: string,
  text: string,
  fallback: string
): { paymentMethod: string; isDirectDebit: boolean; isGiroPayment: boolean } {
  const isDirectDebit = bankTxCode === 'direct debit' || text.includes('autogiro');
  const isGiroPayment =
    bankTxCode === 'payment' || text.includes('bankgiro') || text.includes('plusgiro');
  const paymentMethod = isDirectDebit ? 'Autogiro' : isGiroPayment ? 'Bankgiro' : fallback;
  return { paymentMethod, isDirectDebit, isGiroPayment };
}

/** Tolkar en utgift mot reglerna. Ger null om ingen regel passar eller om det är vardagsköp. */
function matchTxToRule(tx: BankTransactionItem): RuleMatch | null {
  const absAmount = absRoundedAmount(tx);
  if (absAmount <= 0 || absAmount > 60000) return null;
  const text = getTxText(tx);
  if (includesAny(text, VARIABLE_SPENDING_EXCLUSIONS)) return null;
  const rule = findMatchingRule(text);
  if (!rule) return null;

  const preset = rule.presetId ? SWEDISH_EXPENSE_PRESETS.find((p) => p.id === rule.presetId) : undefined;
  const cleanedRawName = cleanDisplayMerchantName(tx.counterparty_name || tx.description || '');
  const displayName = buildRuleDisplayName(rule, preset, cleanedRawName, absAmount);
  const txDate = getTxDate(tx) || undefined;
  const category = preset?.category || rule.category;
  const { paymentMethod, isDirectDebit, isGiroPayment } = resolveRulePaymentMethod(
    getBankTxCodeDescription(tx),
    text,
    preset?.paymentMethod || rule.paymentMethod
  );
  const isStandardSubTier = Boolean(
    rule.requireMultipleMonthsForCard && STANDARD_APPLE_GOOGLE_SUB_TIERS.has(absAmount)
  );
  const hasExplicitAutogiroOrInvoice =
    (!rule.requireMultipleMonthsForCard || isStandardSubTier) &&
    (isDirectDebit ||
      isGiroPayment ||
      includesAny(text, AGREEMENT_WORDS) ||
      paymentMethod === 'Autogiro' ||
      paymentMethod === 'Bankgiro' ||
      AGREEMENT_CATEGORIES.includes(category));

  const createCandidate = (): RuleCandidate => ({
    name: displayName,
    amount: absAmount,
    category,
    frequency: Frequency.MONTHLY,
    deductionDay: getDayOfMonthFromIso(txDate, preset?.deductionDay || 27),
    paymentMethod,
    logo: getLogoUrl(displayName, category),
    detectedOccurrences: 1,
    lastDate: txDate,
    matchedTxIds: new Set([tx.id]),
    dates: txDate ? [txDate] : [],
    amounts: [absAmount],
    hasExplicitAutogiroOrInvoice,
    requireMultipleMonthsForCard: rule.requireMultipleMonthsForCard && !isStandardSubTier,
  });

  const key = buildRuleGroupKey(rule, cleanedRawName, absAmount);
  return { key, txDate, absAmount, hasExplicitAutogiroOrInvoice, createCandidate };
}

/** Samlar alla utgifter som matchar en regel, grupperade per nyckel (nyast först). */
function collectRuleCandidates(outflows: BankTransactionItem[]): Map<string, RuleCandidate> {
  const candidates = new Map<string, RuleCandidate>();
  for (const tx of outflows) {
    const match = matchTxToRule(tx);
    if (!match) continue;
    const existing = candidates.get(match.key);
    if (!existing) {
      candidates.set(match.key, match.createCandidate());
      continue;
    }
    existing.detectedOccurrences += 1;
    existing.matchedTxIds.add(tx.id);
    if (match.txDate) existing.dates.push(match.txDate);
    existing.amounts.push(match.absAmount);
    if (match.hasExplicitAutogiroOrInvoice) existing.hasExplicitAutogiroOrInvoice = true;
  }
  return candidates;
}

/** Sant om kandidaten bevisat återkommer (minst två månader/datum, eller tydligt avtal). */
function isConfirmedRecurring(cand: RuleCandidate): boolean {
  const months = countDistinctMonths(cand.dates);
  if (cand.requireMultipleMonthsForCard) return months >= 2;
  return months >= 2 || new Set(cand.dates).size >= 2 || cand.hasExplicitAutogiroOrInvoice;
}

/** Sant om namnet är el, trängselskatt eller liknande som varierar varje månad. */
function isUtilityVariableName(name: string): boolean {
  const lower = String(name || '').toLowerCase();
  return UTILITY_NAME_PATTERN.test(lower) || includesAny(lower, UTILITY_NAME_WORDS);
}

/** Gör om en bekräftad kandidat till en hittad fast utgift med bevis. */
function toDetectedFixed(cand: RuleCandidate): DetectedFixedWithTxIds {
  const frequency = inferFrequencyFromDates(cand.dates);
  const isVariable = isUtilityVariableName(cand.name) || hasVariableAmounts(cand.amounts);
  return {
    name: cand.name,
    amount: cand.amount,
    category: cand.category,
    frequency,
    deductionDay: inferTrueRecurringDayOfMonth(
      cand.dates,
      'expense',
      cand.category,
      cand.name,
      cand.deductionDay || 27
    ),
    paymentMethod: cand.paymentMethod,
    isVariable,
    logo: cand.logo,
    detectedOccurrences: cand.detectedOccurrences,
    lastDate: cand.lastDate,
    evidenceDates: cand.dates.slice(0, 6),
    evidenceAmounts: cand.amounts.slice(0, 6),
    evidenceSummary: buildEvidenceSummary(
      cand.detectedOccurrences,
      cand.dates,
      cand.amounts,
      frequency,
      isVariable
    ),
    matchedTxIds: cand.matchedTxIds,
  };
}

/**
 * Steg 1: hittar fasta utgifter via kända regler. Lägger in dem i `detected` och
 * markerar deras transaktioner i `fixedTransactionIds`.
 */
export function detectRuleBasedFixedExpenses(
  outflows: BankTransactionItem[],
  detected: Map<string, DetectedFixedWithTxIds>,
  fixedTransactionIds: Set<string>
): void {
  const candidates = collectRuleCandidates(outflows);
  for (const [key, cand] of candidates.entries()) {
    if (!isConfirmedRecurring(cand)) continue;
    for (const txId of cand.matchedTxIds) fixedTransactionIds.add(txId);
    detected.set(key, toDetectedFixed(cand));
  }
}
