// Kandidater för AI-granskning i introduktionen: både det reglerna hittat och okända dragningar/inkomster.
import { BankAccount, BankTransactionItem } from '../../../services/bankService';
import { AnalyzedBankOnboardingData, DetectedFixedExpenseWithEvidence, DetectedIncomeWithEvidence } from '../types';
import { isLikelyPersonFullName } from '../accounts';
import { getNormalizedBankTxAmount, isInternalTransferOrMicroSavings } from '../normalization';
import {
  VARIABLE_SPENDING_EXCLUSIONS,
  cleanDisplayMerchantName,
  getDayOfMonthFromIso,
  inferTrueRecurringDayOfMonth,
  normalizeMerchantKey,
} from '../merchantRules';
import { getBankTxCodeDescription, getTxDate, getTxText, includesAny, isTransferBankCode } from '../txFields';
import { CoreBankDetectionResult } from './core';
import { analyzeOnboardingWithCore } from './onboarding';
import { absRoundedAmount, collectTxDates, countDistinctMonths } from './shared';

export interface OnboardingAiCandidateGroup {
  key: string;
  name: string;
  rawSample: string;
  category?: string;
  paymentMethod?: string;
  latestAmount: number;
  amounts: number[];
  datesWithWeekday: string[];
  rawDates: string[];
  occurrences: number;
  ruleDay: number;
  isRuleDetected: boolean;
}

/** Max antal okända kandidater som skickas till AI:n. */
const MAX_UNMATCHED_EXPENSES = 30;
const MAX_UNMATCHED_INCOMES = 12;

/** Vardagsköp (kaféer, restauranger, parkering, Swish …) som inte är abonnemang. */
const EVERYDAY_PURCHASE_PATTERN =
  /(kafé|kafe|cafe|coffee|bageri|konditori|restaurang|pizza|sushi|burger|krog|bar |pub |lunch|kiosk|automat|parkster|easypark|aimo|\buber\b|bolt|voi |tier |ryde |taxi|swish|7-eleven|pressbyr)/;

/** Insättningar som är överföringar eller returer, inte inkomst. */
const TRANSFER_OR_REFUND_PATTERN =
  /(överföring|overforing|egna konton|sparkonto|swish|återköp|aterkop|retur|refund|kreditering|återbetalning|aterbetalning)/;

/** Datum med engelsk veckodag för AI:n, t.ex. "2026-11-12 (Thu)". Ogiltigt datum ges tillbaka som det är. */
export function formatDateWithWeekday(isoDate: string): string {
  const m = (isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return isoDate;
  const dt = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${m[1]}-${m[2]}-${m[3]} (${days[dt.getDay()] || ''})`;
}

/** Datum för en grupp: högst sex, utan tomma. */
function groupDates(groupTxs: BankTransactionItem[]): string[] {
  return collectTxDates(groupTxs).slice(0, 6);
}

/** Lägger transaktionen i gruppen för dess normaliserade mottagarnamn. */
function addToGroup(groups: Map<string, BankTransactionItem[]>, key: string, tx: BankTransactionItem): void {
  const list = groups.get(key) || [];
  list.push(tx);
  groups.set(key, list);
}

/** Kandidat från något reglerna redan hittat (fast utgift eller inkomst). */
function candidateFromDetected(
  det: DetectedFixedExpenseWithEvidence | DetectedIncomeWithEvidence,
  key: string,
  fallbackDay: number
): Omit<OnboardingAiCandidateGroup, 'category' | 'paymentMethod'> {
  const rawDates = det.evidenceDates || (det.lastDate ? [det.lastDate] : []);
  return {
    key,
    name: det.name,
    rawSample: det.name,
    latestAmount: Math.round(det.amount),
    amounts: (det.evidenceAmounts || [det.amount]).map((a) => Math.round(a)),
    datesWithWeekday: rawDates.map(formatDateWithWeekday),
    rawDates,
    occurrences: det.detectedOccurrences || rawDates.length || 1,
    ruleDay: det.deductionDay || fallbackDay,
    isRuleDetected: true,
  };
}

/** Sant om utgiften kan vara ett okänt abonnemang/räkning (inte vardagsköp). */
function isUnmatchedExpenseCandidate(tx: BankTransactionItem, fixedIds: Set<string>): boolean {
  if (fixedIds.has(tx.id)) return false;
  const absAmt = absRoundedAmount(tx);
  if (absAmt < 19 || absAmt > 50000) return false;
  const text = getTxText(tx);
  if (includesAny(text, VARIABLE_SPENDING_EXCLUSIONS)) return false;
  return !(EVERYDAY_PURCHASE_PATTERN.test(text) && !text.includes('autogiro') && !text.includes('månad'));
}

/** Okänd utgiftsgrupp → kandidat. Betalsätt från bankkod/text, kategori efter betalsätt. */
function unmatchedExpenseCandidate(normKey: string, groupTxs: BankTransactionItem[], key: string): OnboardingAiCandidateGroup {
  const latestTx = groupTxs[0];
  const rawSample = `${latestTx.counterparty_name || ''} ${latestTx.description || ''}`.trim();
  const sampleLower = rawSample.toLowerCase();
  const displayName = cleanDisplayMerchantName(latestTx.counterparty_name || latestTx.description || normKey);
  const rawDates = groupDates(groupTxs);
  const bankTxCode = getBankTxCodeDescription(latestTx);
  const isDirectDebit = bankTxCode === 'direct debit' || sampleLower.includes('autogiro');
  const isGiro = bankTxCode === 'payment' || sampleLower.includes('bankgiro') || sampleLower.includes('plusgiro');
  const paymentMethod = isDirectDebit ? 'Autogiro' : isGiro ? 'Bankgiro' : 'Kort';
  return {
    key,
    name: displayName,
    rawSample,
    category: paymentMethod === 'Kort' ? 'Abonnemang' : 'Räkningar',
    paymentMethod,
    latestAmount: absRoundedAmount(latestTx),
    amounts: groupTxs.map(absRoundedAmount).slice(0, 6),
    datesWithWeekday: rawDates.map(formatDateWithWeekday),
    rawDates,
    occurrences: groupTxs.length,
    ruleDay: inferTrueRecurringDayOfMonth(rawDates, 'expense', 'Abonnemang', displayName, getDayOfMonthFromIso(rawDates[0], 27)),
    isRuleDetected: false,
  };
}

/** Utgiftskandidater: allt reglerna hittat + upp till 30 okända mottagare (t.ex. nytt gym eller el). */
function buildExpenseCandidates(core: CoreBankDetectionResult): OnboardingAiCandidateGroup[] {
  const candidates: OnboardingAiCandidateGroup[] = core.detectedFixedExpenses.map((det, idx) => ({
    ...candidateFromDetected(det, `det_exp_${idx}`, 27),
    category: det.category || 'Räkningar',
    paymentMethod: det.paymentMethod || 'Autogiro',
  }));

  const groups = new Map<string, BankTransactionItem[]>();
  for (const tx of core.outflows) {
    if (!isUnmatchedExpenseCandidate(tx, core.fixedTransactionIds)) continue;
    const normKey = normalizeMerchantKey(tx.counterparty_name || tx.description || '');
    if (normKey && normKey.length >= 3) addToGroup(groups, normKey, tx);
  }

  let idx = 0;
  for (const [normKey, groupTxs] of groups.entries()) {
    if (idx >= MAX_UNMATCHED_EXPENSES) break;
    // Fler köp än ~1 per månad på samma ställe är vardagskonsumtion
    const months = countDistinctMonths(groupTxs.map(getTxDate));
    if (groupTxs.length > Math.max(3, months * 1.5)) continue;
    candidates.push(unmatchedExpenseCandidate(normKey, groupTxs, `cand_exp_${idx++}`));
  }
  return candidates;
}

/** Sant om insättningen kan vara en okänd inkomst (minst 1 500 kr, inte överföring/retur). */
function isUnmatchedIncomeCandidate(tx: BankTransactionItem, userAccounts: BankAccount[]): boolean {
  if (Math.round(getNormalizedBankTxAmount(tx)) < 1500) return false;
  if (isTransferBankCode(getBankTxCodeDescription(tx))) return false;
  if (isInternalTransferOrMicroSavings(tx, userAccounts)) return false;
  return !TRANSFER_OR_REFUND_PATTERN.test(getTxText(tx));
}

/** Okänd inkomstgrupp → kandidat (null om avsändaren ser ut att vara en privatperson). */
function unmatchedIncomeCandidate(normKey: string, groupTxs: BankTransactionItem[]): Omit<OnboardingAiCandidateGroup, 'key'> | null {
  const latestTx = groupTxs[0];
  const displayName = cleanDisplayMerchantName(latestTx.counterparty_name || latestTx.description || normKey);
  if (isLikelyPersonFullName(displayName)) return null;
  const rawDates = groupDates(groupTxs);
  return {
    name: displayName,
    rawSample: `${latestTx.counterparty_name || ''} ${latestTx.description || ''}`.trim(),
    category: 'Lön',
    latestAmount: Math.round(getNormalizedBankTxAmount(latestTx)),
    amounts: groupTxs.map((t) => Math.round(getNormalizedBankTxAmount(t))).slice(0, 6),
    datesWithWeekday: rawDates.map(formatDateWithWeekday),
    rawDates,
    occurrences: groupTxs.length,
    ruleDay: inferTrueRecurringDayOfMonth(rawDates, 'income', 'Lön', displayName, getDayOfMonthFromIso(rawDates[0], 25)),
    isRuleDetected: false,
  };
}

/** Inkomstkandidater: allt reglerna hittat + upp till 12 okända avsändare på minst 1 500 kr. */
function buildIncomeCandidates(core: CoreBankDetectionResult, userAccounts: BankAccount[]): OnboardingAiCandidateGroup[] {
  const covered = new Set(core.detectedIncomes.map((inc) => normalizeMerchantKey(inc.name)));
  const candidates: OnboardingAiCandidateGroup[] = core.detectedIncomes.map((inc, idx) => ({
    ...candidateFromDetected(inc, `det_inc_${idx}`, 25),
    category: inc.category || 'Lön',
  }));

  const groups = new Map<string, BankTransactionItem[]>();
  for (const tx of core.inflows) {
    if (!isUnmatchedIncomeCandidate(tx, userAccounts)) continue;
    const normKey = normalizeMerchantKey(tx.counterparty_name || tx.description || '');
    if (!normKey || covered.has(normKey) || isLikelyPersonFullName(normKey)) continue;
    addToGroup(groups, normKey, tx);
  }

  let idx = 0;
  for (const [normKey, groupTxs] of groups.entries()) {
    if (idx >= MAX_UNMATCHED_INCOMES) break;
    const candidate = unmatchedIncomeCandidate(normKey, groupTxs);
    if (candidate) candidates.push({ key: `cand_inc_${idx++}`, ...candidate });
  }
  return candidates;
}

/**
 * Sammanställer kandidater (både regeldetekterade och okända, t.ex. bara en dragning)
 * med exakta datum och veckodagar för AI-verifiering i introduktionen.
 */
export function extractOnboardingAiCandidates(
  transactions: BankTransactionItem[],
  currentPayday = 25,
  paydayBeforeWeekend = true,
  userAccounts: BankAccount[] = []
): {
  baseAnalysis: AnalyzedBankOnboardingData;
  expenseCandidates: OnboardingAiCandidateGroup[];
  incomeCandidates: OnboardingAiCandidateGroup[];
} {
  const { baseAnalysis, core } = analyzeOnboardingWithCore(
    transactions,
    currentPayday,
    paydayBeforeWeekend,
    userAccounts
  );
  if (!core) return { baseAnalysis, expenseCandidates: [], incomeCandidates: [] };
  return {
    baseAnalysis,
    expenseCandidates: buildExpenseCandidates(core),
    incomeCandidates: buildIncomeCandidates(core, userAccounts),
  };
}
