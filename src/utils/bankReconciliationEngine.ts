import {
  BankAccount,
  BankTransactionItem,
} from '../services/bankService';
import {
  Config,
  FixedExpense,
  Frequency,
  Income,
  MonthlySaving,
  PaydayType,
  PaymentMethod,
  Transaction,
  WeekendAdjustment,
} from '../types';
import { getPeriodBoundaries } from './date';
import {
  categorizeBankTransactionForApp,
  cleanDisplayMerchantName,
  getNormalizedBankTxAmount,
  isInternalTransferOrMicroSavings,
} from './bankHistoryAnalyzer';

// ---------------------------------------------------------------------------
// 1. TYPES & INTERFACES FOR RECONCILIATION, MATCHING & ONGOING IMPORT
// ---------------------------------------------------------------------------

export type MatchConfidence = 'exact' | 'high' | 'uncertain';

export type ReviewReasonCode =
  | 'uncertain_manual_match'
  | 'uncertain_duplicate_same_day'
  | 'uncertain_transfer'
  | 'credit_card_invoice'
  | 'foreign_currency'
  | 'uncertain_fixed_or_variable'
  | 'uncertain_refund'
  | 'large_unrecognized_inflow';

export interface ManualTransactionMatchCandidate {
  bankTx: BankTransactionItem;
  manualTx: Transaction;
  confidence: MatchConfidence;
  score: number;
  dayDiff: number;
  amountDiff: number;
  reason: string;
}

export interface PlannedOccasionMatch {
  bankTx: BankTransactionItem;
  planType: 'fixed_expense' | 'income' | 'saving';
  planId: string;
  planName: string;
  periodKey: string;
  plannedAmount: number;
  actualAmount: number;
  difference: number; // actualAmount - plannedAmount
  confidence: MatchConfidence;
}

export interface RefundMatchCandidate {
  bankTx: BankTransactionItem;
  originalTransaction?: Transaction;
  originalBankTx?: BankTransactionItem;
  refundAmount: number;
  category: string;
  merchant: string;
  isPartial: boolean;
  isLaterPeriod: boolean;
  confidence: MatchConfidence;
}

export interface TransferPairCandidate {
  outgoingBankTx: BankTransactionItem;
  incomingBankTx?: BankTransactionItem;
  confidence: 'confirmed_pair' | 'explicit_own_account' | 'uncertain_transfer';
  reason: string;
}

export interface ReservationResolution {
  reservedBankTx: BankTransactionItem;
  bookedBankTx?: BankTransactionItem;
  status: 'active_reserved' | 'replaced_by_booked' | 'disappeared';
  amountChanged?: boolean;
  dateChanged?: boolean;
}

export interface ReconciliationReviewItem {
  bankTx: BankTransactionItem;
  normalizedAmount: number; // negative for outflow, positive for inflow
  displayMerchant: string;
  suggestedCategory: string;
  effectiveDate: string;
  reasonCode: ReviewReasonCode;
  reasonLabel: string;
  reasonDescription: string;
  candidateManualMatches?: ManualTransactionMatchCandidate[];
  candidateFixedExpenses?: FixedExpense[];
  candidateRefundTargets?: Transaction[];
  // Unified UI properties
  id: string;
  amount: number;
  dateIso: string;
  merchant: string;
  categorySuggestion: string;
  reason: string;
  suggestedAction: 'import_purchase' | 'match_manual' | 'confirm_fixed' | 'refund' | 'transfer' | 'exclude';
  candidateManualTx?: Transaction;
  candidateFixedExpense?: FixedExpense;
}

export interface NewPurchaseImportCandidate {
  bankTx: BankTransactionItem;
  merchant: string;
  rawDescription: string;
  amount: number; // positive expense amount for Dejz Transaction
  currency: string;
  effectiveDate: string;
  timestamp: number;
  category: string;
  logo?: string;
}

export interface ReconciliationNewTransactionItem extends NewPurchaseImportCandidate {
  id: string;
  dateIso: string;
  accountName: string;
  Preselected: boolean;
}

export interface ReconciliationMatchedItem {
  id: string;
  bankTx: BankTransactionItem;
  matchKind: 'manual_tx' | 'fixed_expense' | 'income' | 'monthly_saving' | 'own_transfer' | 'refund';
  title: string;
  subtitle: string;
  explanation: string;
  plannedAmount: number;
  actualAmount: number;
  budgetDelta: number;
  confidence: 'high' | 'medium';
  Preselected: boolean;
  periodKey?: string;
  manualTx?: Transaction;
  fixedExpense?: FixedExpense;
  income?: Income;
  monthlySaving?: MonthlySaving;
  originalPurchaseTx?: Transaction;
}

export interface ActiveReservedDisplayItem extends ReservationResolution {
  bankTx: BankTransactionItem;
  amount: number;
  currency: string;
  dateIso: string;
  merchant: string;
}

export interface ReservationReplacementItem {
  reservedTx: BankTransactionItem;
  bookedTx: BankTransactionItem;
  amountChanged: boolean;
  dateChanged: boolean;
  note: string;
}

export interface BudgetImpactSummary {
  periodKey: string;
  periodStartIso: string;
  periodEndIso: string;
  currentLeftToSpend: number;
  projectedLeftToSpend: number;
  netDeltaLeftToSpend: number;
  newPurchasesTotal: number;
  fixedAdjustmentsTotal: number; // positive means fixed expenses were higher than planned
  incomeAdjustmentsTotal: number; // positive means actual income was higher than planned
  savingAdjustmentsTotal: number;
  refundsTotal: number;
  waitingInReviewTotal: number;
  reservedOutsideBudgetTotal: number;
  // Aliases for UI & tests
  currentRemainingToSpend: number;
  projectedRemainingToSpend: number;
  netImpactOnRemaining: number;
  reservedAmountOutsideBudget: number;
}

export interface FirstReconciliationPreview {
  importStartDate: string;
  periodKey: string;
  periodStartIso: string;
  periodEndIso: string;
  manualMatches: ManualTransactionMatchCandidate[];
  plannedOccasionMatches: PlannedOccasionMatch[];
  confirmedTransfers: TransferPairCandidate[];
  refundMatches: RefundMatchCandidate[];
  newPurchases: NewPurchaseImportCandidate[];
  reviewItems: ReconciliationReviewItem[];
  reservedItems: ActiveReservedDisplayItem[];
  allReservationResolutions: ReservationResolution[];
  reservationReplacements: ReservationReplacementItem[];
  matchedItems: ReconciliationMatchedItem[];
  newTransactions: ReconciliationNewTransactionItem[];
  budgetImpact: BudgetImpactSummary;
  skippedBeforeStartDateCount: number;
  alreadyProcessedCount: number;
}

export type ReconciliationPreviewResult = FirstReconciliationPreview;

// ---------------------------------------------------------------------------
// 2. DATE, PERIOD & CURRENCY HELPERS
// ---------------------------------------------------------------------------

/**
 * Returns the best available date for sorting/period matching without fabricating
 * missing fields on the original BankTransactionItem.
 */
export function getEffectiveBankTxDate(tx: BankTransactionItem): string | null {
  return tx.booking_date || tx.transaction_date || tx.value_date || null;
}

export function getPeriodInfoForDate(
  dateIsoOrMs: string | number | Date,
  config: Pick<Config, 'payday' | 'paydayType' | 'paydayBeforeWeekend'>
): { periodKey: string; startIso: string; endIso: string; startDate: Date; endDate: Date } {
  const refDate =
    typeof dateIsoOrMs === 'string'
      ? new Date(`${dateIsoOrMs.slice(0, 10)}T12:00:00`)
      : new Date(dateIsoOrMs);

  const payday = config.payday || 25;
  const paydayType =
    config.paydayType ||
    (payday === 25
      ? PaydayType.TWENTY_FIFTH
      : payday === 1
      ? PaydayType.FIRST_DAY
      : PaydayType.CUSTOM);
  const adjustment =
    config.paydayBeforeWeekend !== false ? WeekendAdjustment.BEFORE : WeekendAdjustment.NONE;

  const { start, end } = getPeriodBoundaries(refDate, paydayType, payday, adjustment);

  const toLocalIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Match Dejz's getPeriodId(start) convention in src/utils/date.ts
  const periodKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

  return {
    periodKey,
    startIso: toLocalIso(start),
    endIso: toLocalIso(end),
    startDate: start,
    endDate: end,
  };
}

export function isPlannedItemActiveInPeriod(
  item: {
    frequency?: Frequency;
    startMonth?: number;
    isCancelled?: boolean;
    cancellationDate?: string;
    lastPaymentDate?: string;
    hasNoMorePayments?: boolean;
  },
  periodEndDate: Date,
  periodStartIso: string
): boolean {
  if (item.isCancelled) {
    if (item.hasNoMorePayments) return false;
    const cutoff = item.lastPaymentDate || item.cancellationDate;
    if (cutoff && cutoff < periodStartIso) return false;
  }

  const freq = item.frequency || Frequency.MONTHLY;
  if (freq === Frequency.MONTHLY) return true;

  const targetMonth = periodEndDate.getMonth(); // 0-11
  const startMonth = item.startMonth !== undefined && item.startMonth !== null ? item.startMonth : 0;
  const diff = (targetMonth - startMonth + 12) % 12;

  if (freq === Frequency.QUARTERLY) return diff % 3 === 0;
  if (freq === Frequency.SEMI_ANNUALLY) return diff % 6 === 0;
  if (freq === Frequency.ANNUALLY) return diff === 0;

  return true;
}

export function getPlannedAmountForPeriod(
  item: { amount: number; isVariable?: boolean; periodOverrides?: Record<string, number> },
  periodKey: string
): number {
  if (item.periodOverrides && item.periodOverrides[periodKey] !== undefined) {
    const val = Number(item.periodOverrides[periodKey]);
    if (Number.isFinite(val)) return val;
  }
  return Number(item.amount) || 0;
}

// ---------------------------------------------------------------------------
// 3. MERCHANT & TEXT SIMILARITY FOR MATCHING
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'ab',
  'aktiebolag',
  'se',
  'sverige',
  'sweden',
  'kortköp',
  'kortkop',
  'betalning',
  'autogiro',
  'bg',
  'pg',
  'swish',
  'stockholm',
  'göteborg',
  'goteborg',
  'malmö',
  'malmo',
  'halmstad',
  'uppsala',
  'butik',
  'online',
  'www',
  'com',
  'nu',
]);

export function tokenizeMerchantText(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/([a-zåäö])\s*&\s*([a-zåäö])/gi, '$1$2')
    .replace(/[._/*#,-]+/g, ' ')
    .replace(/[^a-zåäö0-9\s]/gi, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

export function computeMerchantSimilarity(
  bankText: string,
  manualText: string
): { score: number; matchedTokens: string[] } {
  const bankTokens = tokenizeMerchantText(bankText);
  const manualTokens = tokenizeMerchantText(manualText);

  if (bankTokens.length === 0 || manualTokens.length === 0) {
    return { score: 0, matchedTokens: [] };
  }

  const matched: string[] = [];
  for (const mTok of manualTokens) {
    for (const bTok of bankTokens) {
      if (
        bTok === mTok ||
        (mTok.length >= 3 && bTok.includes(mTok)) ||
        (bTok.length >= 3 && mTok.includes(bTok))
      ) {
        matched.push(mTok);
        break;
      }
    }
  }

  if (matched.length === 0) return { score: 0, matchedTokens: [] };
  const ratio = matched.length / Math.min(bankTokens.length, manualTokens.length);
  return { score: Math.min(1, ratio), matchedTokens: matched };
}

export function merchantSimilarity(a: string, b: string): number {
  return computeMerchantSimilarity(a, b).score;
}

// ---------------------------------------------------------------------------
// 4. CREDIT CARD INVOICE, TRANSFER & REFUND DETECTORS
// ---------------------------------------------------------------------------

const CREDIT_CARD_INVOICE_KEYWORDS = [
  'bank norwegian',
  'norwegian kort',
  'entercard',
  're:member',
  'remember card',
  'swedbank betal',
  'seb kort',
  'eurocard',
  'american express',
  'amex',
  'resurs bank',
  'morrow bank',
  'komplett bank',
  'marginalen bank',
  'collector bank',
  'walley',
  'klarna bank',
  'klarna faktura',
  'klarna månadsfaktura',
  'ikano bank',
  'okq8 bank',
  'carpay',
  'volvofinans kort',
];

export function isLikelyCreditCardInvoice(tx: BankTransactionItem): boolean {
  const signed = getNormalizedBankTxAmount(tx);
  if (signed >= 0) return false;
  const absAmt = Math.abs(signed);
  const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();

  // Small Klarna purchase (< 1500 kr) without "faktura/autogiro/bankgiro" might be a single purchase,
  // whereas larger Klarna/credit card payments or explicit bankgiro/autogiro payments to card issuers are credit card bills.
  if (text.includes('klarna')) {
    return (
      absAmt >= 1200 ||
      text.includes('faktura') ||
      text.includes('månadsfaktura') ||
      text.includes('autogiro') ||
      text.includes('bg ') ||
      text.includes('bankgiro')
    );
  }

  return CREDIT_CARD_INVOICE_KEYWORDS.some((kw) => text.includes(kw));
}

const REFUND_KEYWORDS = [
  'återköp',
  'aterkop',
  'retur',
  'refund',
  'kreditering',
  'återbetalning',
  'aterbetalning',
  'tillgodo',
];

const RETAIL_MERCHANT_KEYWORDS = [
  'apotea',
  'apoteket',
  'kronans',
  'hjärtat',
  'ica',
  'coop',
  'willys',
  'hemköp',
  'hemkop',
  'lidl',
  'systembolaget',
  'ikea',
  'h&m',
  'zara',
  'åhlens',
  'ahlens',
  'elgiganten',
  'netonnet',
  'webhallen',
  'clas ohlson',
  'kjell',
  'biltema',
  'jula',
  'rusta',
  'normal',
  'boozt',
  'zalando',
  'nelly',
  'asos',
  'amazon',
  'cdon',
  'apple.com',
  'google',
  'klarna',
  'foodora',
  'wolt',
  'uber',
  'sj ab',
  'sas ',
  'norwegian',
];

export function isLikelyMerchantRefund(tx: BankTransactionItem): boolean {
  const signed = getNormalizedBankTxAmount(tx);
  if (signed <= 0) return false; // Must be a positive inflow (CRDT)
  if (tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD') return false;

  const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
  if (
    text.includes('lön') ||
    text.includes('salary') ||
    text.includes('barnbidrag') ||
    text.includes('csn') ||
    text.includes('pension')
  ) {
    return false;
  }

  if (REFUND_KEYWORDS.some((kw) => text.includes(kw))) return true;
  if (RETAIL_MERCHANT_KEYWORDS.some((kw) => text.includes(kw))) return true;

  return false;
}

/**
 * Detects own-account transfers across the user's connected accounts or explicit transfer descriptions.
 * Follows Requirement 8:
 * "Matcha båda sidor när data finns. Samma kontoinnehavarnamn eller lika belopp räcker inte ensamt för automatisk klassificering; osäkra fall läggs i ”Att granska”."
 */
export function detectTransfers(
  bankTransactions: BankTransactionItem[],
  userAccounts: BankAccount[]
): {
  confirmedTransferTxIds: Set<string>;
  uncertainTransferTxIds: Set<string>;
  pairs: TransferPairCandidate[];
} {
  const confirmedTransferTxIds = new Set<string>();
  const uncertainTransferTxIds = new Set<string>();
  const pairs: TransferPairCandidate[] = [];

  const booked = bankTransactions.filter(
    (t) => t.booking_status === 'BOOK' || !t.booking_status
  );

  // 1. Two-sided matching across different user accounts on the same or adjacent day (±2 days)
  const outflows = booked.filter((t) => getNormalizedBankTxAmount(t) < 0);
  const inflows = booked.filter((t) => getNormalizedBankTxAmount(t) > 0);
  const usedInflowIds = new Set<string>();

  for (const outTx of outflows) {
    const outAmt = Math.abs(getNormalizedBankTxAmount(outTx));
    const outDate = getEffectiveBankTxDate(outTx);
    if (!outDate || outAmt <= 0) continue;
    const outMs = Date.parse(`${outDate}T12:00:00`);

    const outText = `${outTx.description || ''} ${outTx.counterparty_name || ''}`.toLowerCase();

    // Look for an equal inflow on a DIFFERENT bank_account_id within ±2 days
    const matchingInflow = inflows.find((inTx) => {
      if (usedInflowIds.has(inTx.id)) return false;
      if (inTx.bank_account_id === outTx.bank_account_id) return false;
      if ((inTx.currency || 'SEK') !== (outTx.currency || 'SEK')) return false;
      const inAmt = Math.abs(getNormalizedBankTxAmount(inTx));
      if (Math.abs(inAmt - outAmt) > 0.01) return false;

      const inDate = getEffectiveBankTxDate(inTx);
      if (!inDate) return false;
      const dayDiff = Math.abs(Date.parse(`${inDate}T12:00:00`) - outMs) / (1000 * 60 * 60 * 24);
      return dayDiff <= 2;
    });

    if (matchingInflow) {
      const inText = `${matchingInflow.description || ''} ${matchingInflow.counterparty_name || ''}`.toLowerCase();
      const hasTransferEvidence =
        isInternalTransferOrMicroSavings(outTx, userAccounts) ||
        isInternalTransferOrMicroSavings(matchingInflow, userAccounts) ||
        outText.includes('överföring') ||
        outText.includes('overforing') ||
        inText.includes('överföring') ||
        inText.includes('overforing') ||
        /^\d{7,14}$/.test(outText.replace(/\D+/g, '')) ||
        /^\d{7,14}$/.test(inText.replace(/\D+/g, ''));

      if (hasTransferEvidence) {
        usedInflowIds.add(matchingInflow.id);
        confirmedTransferTxIds.add(outTx.id);
        confirmedTransferTxIds.add(matchingInflow.id);
        pairs.push({
          outgoingBankTx: outTx,
          incomingBankTx: matchingInflow,
          confidence: 'confirmed_pair',
          reason: 'Matchad mot motsvarande insättning på eget konto',
        });
      } else {
        // Equal amount alone without transfer evidence -> uncertain!
        usedInflowIds.add(matchingInflow.id);
        uncertainTransferTxIds.add(outTx.id);
        uncertainTransferTxIds.add(matchingInflow.id);
        pairs.push({
          outgoingBankTx: outTx,
          incomingBankTx: matchingInflow,
          confidence: 'uncertain_transfer',
          reason: 'Samma belopp mellan två konton men saknar tydlig överföringsreferens',
        });
      }
      continue;
    }

    // 2. Single-sided transfer check (e.g. savings account not selected or external own bank)
    if (isInternalTransferOrMicroSavings(outTx, userAccounts)) {
      confirmedTransferTxIds.add(outTx.id);
      pairs.push({
        outgoingBankTx: outTx,
        confidence: 'explicit_own_account',
        reason: 'Tydlig överföring till eget konto / sparkonto',
      });
    } else if (
      outText.includes('överföring') ||
      outText.includes('overforing') ||
      outText.includes('swish betalning')
    ) {
      // Check if counterparty is the user's own name from their bank accounts
      const holderNames = userAccounts
        .map((a) => (a.name || '').toLowerCase().trim())
        .filter((n) => n.length >= 4 && !n.includes('konto'));
      const matchesOwnHolderName = holderNames.some((n) => outText.includes(n));
      if (matchesOwnHolderName) {
        // Requirement 8: "Samma kontoinnehavarnamn eller lika belopp räcker inte ensamt för automatisk klassificering; osäkra fall läggs i 'Att granska'."
        uncertainTransferTxIds.add(outTx.id);
        pairs.push({
          outgoingBankTx: outTx,
          confidence: 'uncertain_transfer',
          reason: 'Innehåller ditt namn eller överföringstext – bekräfta om det är en egen överföring',
        });
      }
    }
  }

  // Also check single-sided inflows that are explicit internal transfers
  for (const inTx of inflows) {
    if (confirmedTransferTxIds.has(inTx.id) || uncertainTransferTxIds.has(inTx.id)) continue;
    const inText = `${inTx.description || ''} ${inTx.counterparty_name || ''}`.toLowerCase();
    if (isInternalTransferOrMicroSavings(inTx, userAccounts)) {
      confirmedTransferTxIds.add(inTx.id);
    } else if (inText.includes('överföring') || inText.includes('overforing')) {
      uncertainTransferTxIds.add(inTx.id);
    }
  }

  return { confirmedTransferTxIds, uncertainTransferTxIds, pairs };
}

// ---------------------------------------------------------------------------
// 5. RESERVATION RESOLUTION (Requirement 8)
// ---------------------------------------------------------------------------

/**
 * Matches reserved transactions (PDNG/HOLD) against booked transactions (BOOK).
 * Handles changed amount (e.g. pre-authorization or tip/delivery adjustment),
 * changed date (transaction date vs settlement booking date), and disappeared reservations.
 */
export function resolveReservedTransactions(
  bankTransactions: BankTransactionItem[],
  nowMs = Date.now()
): {
  resolutions: ReservationResolution[];
  replacedReservedTxIds: Set<string>;
  activeReservedTxs: BankTransactionItem[];
} {
  const reserved = bankTransactions.filter(
    (t) => t.booking_status === 'PDNG' || t.booking_status === 'HOLD'
  );
  const booked = bankTransactions.filter((t) => t.booking_status === 'BOOK');

  const resolutions: ReservationResolution[] = [];
  const replacedReservedTxIds = new Set<string>();
  const activeReservedTxs: BankTransactionItem[] = [];
  const usedBookedIds = new Set<string>();

  for (const resTx of reserved) {
    if (resTx.reconciliation_status === 'reserved_replaced' && resTx.replaced_by_bank_tx_id) {
      replacedReservedTxIds.add(resTx.id);
      const bookedMatch = booked.find((b) => b.id === resTx.replaced_by_bank_tx_id);
      resolutions.push({
        reservedBankTx: resTx,
        bookedBankTx: bookedMatch,
        status: 'replaced_by_booked',
      });
      continue;
    }

    if (resTx.reservation_disappeared_at || resTx.reconciliation_status === 'excluded') {
      replacedReservedTxIds.add(resTx.id);
      resolutions.push({
        reservedBankTx: resTx,
        status: 'disappeared',
      });
      continue;
    }

    const resAmt = Math.abs(getNormalizedBankTxAmount(resTx));
    const resDate = getEffectiveBankTxDate(resTx);
    const resMs = resDate ? Date.parse(`${resDate}T12:00:00`) : nowMs;
    const resText = `${resTx.counterparty_name || ''} ${resTx.description || ''}`;

    // Find a booked transaction on the same account on or after the reservation date (within -1 to +10 days)
    let bestBooked: BankTransactionItem | undefined;
    let bestScore = 0;

    for (const bTx of booked) {
      if (usedBookedIds.has(bTx.id)) continue;
      if (bTx.bank_account_id !== resTx.bank_account_id) continue;

      const bDate = getEffectiveBankTxDate(bTx);
      const bMs = bDate ? Date.parse(`${bDate}T12:00:00`) : nowMs;
      const dayDiff = (bMs - resMs) / (1000 * 60 * 60 * 24);
      if (dayDiff < -1.5 || dayDiff > 10) continue;

      const bAmt = Math.abs(getNormalizedBankTxAmount(bTx));
      const amtDiff = Math.abs(bAmt - resAmt);
      const relAmtDiff = resAmt > 0 ? amtDiff / resAmt : 1;

      const bText = `${bTx.counterparty_name || ''} ${bTx.description || ''}`;
      const sim = computeMerchantSimilarity(resText, bText);

      // Exact entry_reference or transaction_id match
      if (
        (resTx.transaction_id && bTx.transaction_id === resTx.transaction_id) ||
        (resTx.entry_reference && bTx.entry_reference === resTx.entry_reference)
      ) {
        bestBooked = bTx;
        bestScore = 100;
        break;
      }

      // Same merchant and exact or close amount (up to 20% tolerance for hotel/fuel/grocery pre-auth)
      if (sim.score >= 0.5 && (amtDiff < 0.05 || relAmtDiff <= 0.2)) {
        const score = sim.score * 50 + (amtDiff < 0.05 ? 40 : 20) - Math.abs(dayDiff);
        if (score > bestScore) {
          bestScore = score;
          bestBooked = bTx;
        }
      }
    }

    if (bestBooked && bestScore >= 40) {
      usedBookedIds.add(bestBooked.id);
      replacedReservedTxIds.add(resTx.id);
      const bAmt = Math.abs(getNormalizedBankTxAmount(bestBooked));
      const bDate = getEffectiveBankTxDate(bestBooked);
      resolutions.push({
        reservedBankTx: resTx,
        bookedBankTx: bestBooked,
        status: 'replaced_by_booked',
        amountChanged: Math.abs(bAmt - resAmt) >= 0.05,
        dateChanged: bDate !== resDate,
      });
      continue;
    }

    // If a reservation is older than 14 days and still not booked, mark it as expired/disappeared
    const ageDays = (nowMs - resMs) / (1000 * 60 * 60 * 24);
    if (ageDays > 14) {
      replacedReservedTxIds.add(resTx.id);
      resolutions.push({
        reservedBankTx: resTx,
        status: 'disappeared',
      });
      continue;
    }

    activeReservedTxs.push(resTx);
    resolutions.push({
      reservedBankTx: resTx,
      status: 'active_reserved',
    });
  }

  return { resolutions, replacedReservedTxIds, activeReservedTxs };
}

export function matchReservedToBookedTransactions(
  bankTransactions: BankTransactionItem[],
  nowMs = Date.now()
): ReservationReplacementItem[] {
  const { resolutions } = resolveReservedTransactions(bankTransactions, nowMs);
  return resolutions
    .filter((r) => r.status === 'replaced_by_booked' && r.bookedBankTx)
    .map((r) => ({
      reservedTx: r.reservedBankTx,
      bookedTx: r.bookedBankTx!,
      amountChanged: Boolean(r.amountChanged),
      dateChanged: Boolean(r.dateChanged),
      note: r.amountChanged
        ? `Ersatt av bokfört köp (${Math.abs(getNormalizedBankTxAmount(r.bookedBankTx!))} kr)`
        : 'Ersatt av bokfört köp',
    }));
}

// ---------------------------------------------------------------------------
// 6. MATCHING AGAINST MANUAL TRANSACTIONS (Requirement 6)
// ---------------------------------------------------------------------------

/**
 * Matches booked bank transactions 1-to-1 against manual Dejz transactions
 * (including split transactions where manualTx.amount equals the sum of splits).
 *
 * Rules:
 * - Clear matches ('exact' / 'high') are pre-selected in First Reconciliation.
 * - Uncertain matches ('uncertain') require user review.
 * - Never merges two identical legitimate purchases on the same day into one manual transaction.
 */
export function matchBankToManualTransactions(
  bankTransactions: BankTransactionItem[],
  manualTransactions: Transaction[],
  availableCategories: string[] = []
): {
  clearMatches: ManualTransactionMatchCandidate[];
  uncertainMatches: ManualTransactionMatchCandidate[];
  matchedBankTxIds: Set<string>;
  matchedManualTxIds: Set<string>;
  duplicateSameDayReviewBankTxIds: Set<string>;
} {
  const clearMatches: ManualTransactionMatchCandidate[] = [];
  const uncertainMatches: ManualTransactionMatchCandidate[] = [];
  const matchedBankTxIds = new Set<string>();
  const matchedManualTxIds = new Set<string>();
  const duplicateSameDayReviewBankTxIds = new Set<string>();

  // Only match against manual transactions that are NOT already linked to a bank transaction
  const eligibleManuals = manualTransactions.filter((m) => {
    if (m.bankTransactionId) return false;
    if (Array.isArray(m.tags) && m.tags.some((t) => t.startsWith('bank_tx:'))) return false;
    return true;
  });

  // Group identical bank transactions on the same day (same merchant + same amount + same date)
  // so we never silently merge two separate purchases if the user only entered one manually, or vice versa
  const sameDaySignatureCount = new Map<string, number>();
  for (const bTx of bankTransactions) {
    if (bTx.booking_status !== 'BOOK') continue;
    const date = getEffectiveBankTxDate(bTx) || '';
    const amt = Math.abs(getNormalizedBankTxAmount(bTx)).toFixed(2);
    const normMerch = tokenizeMerchantText(
      `${bTx.counterparty_name || ''} ${bTx.description || ''}`
    ).join('_');
    const sig = `${bTx.bank_account_id}|${date}|${amt}|${normMerch}`;
    sameDaySignatureCount.set(sig, (sameDaySignatureCount.get(sig) || 0) + 1);
  }

  for (const bTx of bankTransactions) {
    if (bTx.booking_status !== 'BOOK') continue;
    if ((bTx.currency || 'SEK') !== 'SEK') continue;

    const signedAmt = getNormalizedBankTxAmount(bTx);
    if (signedAmt === 0) continue;
    const isOutflow = signedAmt < 0;
    const absBankAmt = Math.abs(signedAmt);

    const bDate = getEffectiveBankTxDate(bTx);
    if (!bDate) continue;
    const bMs = Date.parse(`${bDate}T12:00:00`);

    const categorized = categorizeBankTransactionForApp(bTx, availableCategories);
    const bankSearchText = `${bTx.counterparty_name || ''} ${bTx.description || ''} ${categorized.merchant}`;

    let bestCandidate: ManualTransactionMatchCandidate | null = null;

    for (const mTx of eligibleManuals) {
      if (matchedManualTxIds.has(mTx.id)) continue;

      const mIsOutflow = mTx.type === 'expense' && Number(mTx.amount) > 0;
      const mIsInflow = mTx.type === 'income' && Number(mTx.amount) > 0;
      if (isOutflow && !mIsOutflow) continue;
      if (!isOutflow && !mIsInflow) continue;

      // Support split transactions: total amount is either mTx.amount or sum of splits
      const splitTotal =
        Array.isArray(mTx.splits) && mTx.splits.length > 0
          ? mTx.splits.reduce((s, sp) => s + (Number(sp.amount) || 0), 0)
          : 0;
      const effectiveManualAmt = splitTotal > 0 ? splitTotal : Math.abs(Number(mTx.amount) || 0);

      const amountDiff = Math.abs(effectiveManualAmt - absBankAmt);
      if (amountDiff > 5) continue; // Only consider same amount (or up to 5 kr rounding)

      const mDateObj = new Date(Number(mTx.timestamp));
      const mDateIso = `${mDateObj.getFullYear()}-${String(mDateObj.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(mDateObj.getDate()).padStart(2, '0')}`;
      const mMs = Date.parse(`${mDateIso}T12:00:00`);
      const dayDiff = Math.abs(bMs - mMs) / (1000 * 60 * 60 * 24);

      if (dayDiff > 5) continue; // Bank booking can lag card purchase by up to 4-5 days over weekends

      const manualSearchText = `${mTx.merchant || ''} ${mTx.note || ''} ${mTx.category || ''}`;
      const sim = computeMerchantSimilarity(bankSearchText, manualSearchText);

      let confidence: MatchConfidence | null = null;
      let score = 0;
      let reason = '';

      if (amountDiff < 0.05 && sim.score >= 0.5 && dayDiff <= 4) {
        confidence = dayDiff <= 1 ? 'exact' : 'high';
        score = 90 - dayDiff * 5 + sim.score * 10;
        reason =
          dayDiff === 0
            ? `Samma belopp (${absBankAmt} kr), samma dag och matchande butik (${mTx.merchant || mTx.note})`
            : `Samma belopp (${absBankAmt} kr), ${Math.round(dayDiff)} dagars bokföringsfördröjning och matchande butik (${mTx.merchant || mTx.note})`;
      } else if (amountDiff < 0.05 && dayDiff <= 2) {
        // Exact amount and close date, even if manual entry had generic merchant/note (e.g. only category "Apotek" or empty merchant)
        confidence = 'uncertain';
        score = 55 - dayDiff * 10;
        reason = `Samma belopp (${absBankAmt} kr) och datum nära manuell post (${
          mTx.merchant || mTx.note || mTx.category
        }), men butiksnamnet skiljer sig`;
      } else if (amountDiff <= 5 && sim.score >= 0.5 && dayDiff <= 3) {
        confidence = 'uncertain';
        score = 50 - amountDiff * 2;
        reason = `Matchande butik (${mTx.merchant || mTx.note}) men avrundat belopp (${effectiveManualAmt} kr manuellt mot ${absBankAmt} kr i banken)`;
      }

      if (confidence && (!bestCandidate || score > bestCandidate.score)) {
        bestCandidate = {
          bankTx: bTx,
          manualTx: mTx,
          confidence,
          score,
          dayDiff,
          amountDiff,
          reason,
        };
      }
    }

    if (bestCandidate) {
      matchedBankTxIds.add(bTx.id);
      matchedManualTxIds.add(bestCandidate.manualTx.id);

      if (bestCandidate.confidence === 'exact' || bestCandidate.confidence === 'high') {
        clearMatches.push(bestCandidate);
      } else {
        uncertainMatches.push(bestCandidate);
      }
    } else {
      // Check if there are multiple identical bank purchases on the same day with no manual match
      const normMerch = tokenizeMerchantText(
        `${bTx.counterparty_name || ''} ${bTx.description || ''}`
      ).join('_');
      const sig = `${bTx.bank_account_id}|${bDate}|${absBankAmt.toFixed(2)}|${normMerch}`;
      const extKey = bTx.external_key || bTx.external_tx_key || '';
      if ((sameDaySignatureCount.get(sig) || 0) > 1 && extKey.includes('#')) {
        duplicateSameDayReviewBankTxIds.add(bTx.id);
      }
    }
  }

  return {
    clearMatches,
    uncertainMatches,
    matchedBankTxIds,
    matchedManualTxIds,
    duplicateSameDayReviewBankTxIds,
  };
}

// ---------------------------------------------------------------------------
// 7. MATCHING AGAINST PLANNED FIXED EXPENSES, INCOMES & SAVINGS (Requirement 7)
// ---------------------------------------------------------------------------

/**
 * Matches bank transactions per payment occasion (periodKey, e.g. '2026-10')
 * against the user's active FixedExpenses, Incomes, and MonthlySavings.
 *
 * - Never matches against cancelled FixedExpenses (`isCancelled` after cutoff).
 * - Matches per occasion (`(planId, periodKey)`), so if Spotify is paid once in October,
 *   that occasion is fulfilled; a second charge in the same period goes to review instead of silently disappearing.
 * - Computes `difference = actualAmount - plannedAmount` so periodOverrides[periodKey] can adjust the period's outcome without double-counting.
 */
export function matchBankToPlannedOccasions(params: {
  bankTransactions: BankTransactionItem[];
  fixedExpenses: FixedExpense[];
  incomes: Income[];
  monthlySavingsItems: MonthlySaving[];
  monthlySavingsAggregate: number;
  config: Pick<Config, 'payday' | 'paydayType' | 'paydayBeforeWeekend'>;
  excludeBankTxIds?: Set<string>;
}): {
  matches: PlannedOccasionMatch[];
  matchedBankTxIds: Set<string>;
  uncertainPlanBankTxIds: Map<string, FixedExpense[]>;
} {
  const {
    bankTransactions,
    fixedExpenses,
    incomes,
    monthlySavingsItems = [],
    monthlySavingsAggregate = 0,
    config,
    excludeBankTxIds = new Set<string>(),
  } = params;

  const matches: PlannedOccasionMatch[] = [];
  const matchedBankTxIds = new Set<string>();
  const uncertainPlanBankTxIds = new Map<string, FixedExpense[]>();

  // Track which (planType:planId:periodKey) occasions have already been fulfilled
  // Include occasions already confirmed by previously reconciled bankTransactions
  const fulfilledOccasions = new Set<string>();
  for (const tx of bankTransactions) {
    if (
      (tx.reconciliation_status === 'confirmed_fixed_expense' ||
        tx.reconciliation_status === 'confirmed_fixed') &&
      tx.linked_fixed_expense_id &&
      tx.linked_period_key
    ) {
      fulfilledOccasions.add(`fixed:${tx.linked_fixed_expense_id}:${tx.linked_period_key}`);
    }
    if (tx.reconciliation_status === 'confirmed_income' && tx.linked_income_id && tx.linked_period_key) {
      fulfilledOccasions.add(`income:${tx.linked_income_id}:${tx.linked_period_key}`);
    }
    if (tx.reconciliation_status === 'confirmed_saving' && tx.linked_saving_id && tx.linked_period_key) {
      fulfilledOccasions.add(`saving:${tx.linked_saving_id}:${tx.linked_period_key}`);
    }
  }

  // Synthesize a virtual saving item if the user only set `config.monthlySavings > 0` without `monthlySavingsItems`
  const effectiveSavingsItems: MonthlySaving[] =
    monthlySavingsItems.length > 0
      ? monthlySavingsItems
      : monthlySavingsAggregate > 0
      ? [
          {
            id: 'default-monthly-saving',
            name: 'Månadssparande',
            amount: monthlySavingsAggregate,
            frequency: Frequency.MONTHLY,
          },
        ]
      : [];

  for (const bTx of bankTransactions) {
    if (bTx.booking_status !== 'BOOK') continue;
    if (excludeBankTxIds.has(bTx.id)) continue;
    if ((bTx.currency || 'SEK') !== 'SEK') continue;

    const effDate = getEffectiveBankTxDate(bTx);
    if (!effDate) continue;

    const periodInfo = getPeriodInfoForDate(effDate, config);
    const { periodKey, endDate, startIso } = periodInfo;

    const signedAmt = getNormalizedBankTxAmount(bTx);
    if (signedAmt === 0) continue;
    const absAmt = Math.round(Math.abs(signedAmt) * 100) / 100;
    const bankText = `${bTx.counterparty_name || ''} ${bTx.description || ''}`;
    const bankTextLower = bankText.toLowerCase();

    if (signedAmt < 0) {
      // 1. Check Planned Fixed Expenses active in this period
      const activeFixed = fixedExpenses.filter((fe) =>
        isPlannedItemActiveInPeriod(fe, endDate, startIso)
      );

      let bestFixed: FixedExpense | null = null;
      let bestFixedScore = 0;
      let bestConfidence: MatchConfidence = 'high';

      for (const fe of activeFixed) {
        const occasionKey = `fixed:${fe.id}:${periodKey}`;
        if (fulfilledOccasions.has(occasionKey)) continue;

        const plannedAmt = Number(fe.amount) || 0;
        const amtDiff = Math.abs(absAmt - plannedAmt);
        const relDiff = plannedAmt > 0 ? amtDiff / plannedAmt : 1;

        const sim = computeMerchantSimilarity(bankText, fe.name);
        const housingSynonyms =
          (fe.name.toLowerCase().includes('hyra') ||
            fe.name.toLowerCase().includes('boende') ||
            fe.category.toLowerCase() === 'boende') &&
          (bankTextLower.includes('fastighet') ||
            bankTextLower.includes('hyra') ||
            bankTextLower.includes('bostad') ||
            bankTextLower.includes('brf') ||
            bankTextLower.includes('hsb') ||
            bankTextLower.includes('riksbyggen') ||
            bankTextLower.includes('heimstaden'));

        const elSynonyms =
          (fe.name.toLowerCase().includes('el') || fe.name.toLowerCase().includes('energi')) &&
          (bankTextLower.includes('vattenfall') ||
            bankTextLower.includes('tibber') ||
            bankTextLower.includes('ellevio') ||
            bankTextLower.includes('fortum') ||
            bankTextLower.includes('e.on') ||
            bankTextLower.includes('energi') ||
            bankTextLower.includes('kraft'));

        const nameMatched = sim.score >= 0.5 || housingSynonyms || elSynonyms;

        if (nameMatched) {
          // Name matches! Check if amount is exact, within variable tolerance, or changed
          if (amtDiff < 1) {
            const score = 100 + sim.score * 20;
            if (score > bestFixedScore) {
              bestFixedScore = score;
              bestFixed = fe;
              bestConfidence = 'exact';
            }
          } else if (fe.isVariable || relDiff <= 0.35 || amtDiff <= 250) {
            const score = 80 + sim.score * 15 - relDiff * 20;
            if (score > bestFixedScore) {
              bestFixedScore = score;
              bestFixed = fe;
              bestConfidence = 'high';
            }
          } else if (relDiff <= 0.75) {
            const score = 55 + sim.score * 10;
            if (score > bestFixedScore) {
              bestFixedScore = score;
              bestFixed = fe;
              bestConfidence = 'uncertain';
            }
          }
        }
      }

      if (bestFixed) {
        const occasionKey = `fixed:${bestFixed.id}:${periodKey}`;
        fulfilledOccasions.add(occasionKey);
        matchedBankTxIds.add(bTx.id);
        const plannedAmount = Number(bestFixed.amount) || 0;
        matches.push({
          bankTx: bTx,
          planType: 'fixed_expense',
          planId: bestFixed.id,
          planName: bestFixed.name,
          periodKey,
          plannedAmount,
          actualAmount: absAmt,
          difference: Math.round((absAmt - plannedAmount) * 100) / 100,
          confidence: bestConfidence,
        });
        continue;
      }

      // 2. Check Planned Monthly Savings (so a savings transfer that fulfills budgeted savings doesn't reduce Left to Spend twice!)
      const looksLikeSavingTransfer =
        bankTextLower.includes('spar') ||
        bankTextLower.includes('avanza') ||
        bankTextLower.includes('nordnet') ||
        bankTextLower.includes('lysa') ||
        bankTextLower.includes('opti') ||
        bankTextLower.includes('isk') ||
        bankTextLower.includes('fond') ||
        bankTextLower.includes('överföring') ||
        bankTextLower.includes('overforing');

      if (looksLikeSavingTransfer && effectiveSavingsItems.length > 0) {
        for (const sav of effectiveSavingsItems) {
          const occasionKey = `saving:${sav.id}:${periodKey}`;
          if (fulfilledOccasions.has(occasionKey)) continue;

          const plannedSavAmt = Number(sav.amount) || 0;
          const amtDiff = Math.abs(absAmt - plannedSavAmt);
          const sim = computeMerchantSimilarity(bankText, sav.name);

          if (sim.score >= 0.5 || amtDiff <= Math.max(50, plannedSavAmt * 0.15)) {
            fulfilledOccasions.add(occasionKey);
            matchedBankTxIds.add(bTx.id);
            matches.push({
              bankTx: bTx,
              planType: 'saving',
              planId: sav.id,
              planName: sav.name,
              periodKey,
              plannedAmount: plannedSavAmt,
              actualAmount: absAmt,
              difference: Math.round((absAmt - plannedSavAmt) * 100) / 100,
              confidence: amtDiff < 1 ? 'exact' : 'high',
            });
            break;
          }
        }
      }
    } else if (signedAmt > 0) {
      // 3. Check Planned Incomes (Salary, CSN, Barnbidrag, Pension, etc.)
      // Exclude merchant refunds and own transfers
      if (isLikelyMerchantRefund(bTx)) continue;

      let bestIncome: Income | null = null;
      let bestIncScore = 0;

      for (const inc of incomes) {
        const occasionKey = `income:${inc.id}:${periodKey}`;
        if (fulfilledOccasions.has(occasionKey)) continue;

        const plannedIncAmt = Number(inc.amount) || 0;
        const amtDiff = Math.abs(absAmt - plannedIncAmt);
        const relDiff = plannedIncAmt > 0 ? amtDiff / plannedIncAmt : 1;
        const sim = computeMerchantSimilarity(bankText, `${inc.name} ${inc.category || ''}`);

        const isSalaryPlan =
          inc.name.toLowerCase().includes('lön') ||
          (inc.category || '').toLowerCase().includes('lön') ||
          plannedIncAmt >= 10000;
        const isSalaryTx =
          bankTextLower.includes('lön') ||
          bankTextLower.includes('salary') ||
          bankTextLower.includes('utbetalning') ||
          absAmt >= 10000;

        if ((sim.score >= 0.5 || (isSalaryPlan && isSalaryTx)) && relDiff <= 0.45) {
          const score = (sim.score >= 0.5 ? 60 : 45) + (1 - relDiff) * 40;
          if (score > bestIncScore) {
            bestIncScore = score;
            bestIncome = inc;
          }
        }
      }

      if (bestIncome) {
        const occasionKey = `income:${bestIncome.id}:${periodKey}`;
        fulfilledOccasions.add(occasionKey);
        matchedBankTxIds.add(bTx.id);
        const plannedAmount = Number(bestIncome.amount) || 0;
        matches.push({
          bankTx: bTx,
          planType: 'income',
          planId: bestIncome.id,
          planName: bestIncome.name,
          periodKey,
          plannedAmount,
          actualAmount: absAmt,
          difference: Math.round((absAmt - plannedAmount) * 100) / 100,
          confidence: Math.abs(absAmt - plannedAmount) < 1 ? 'exact' : 'high',
        });
      }
    }
  }

  return { matches, matchedBankTxIds, uncertainPlanBankTxIds };
}

// ---------------------------------------------------------------------------
// 8. REFUND MATCHING (Requirement 8)
// ---------------------------------------------------------------------------

export function matchBankRefunds(params: {
  bankTransactions: BankTransactionItem[];
  appTransactions: Transaction[];
  config: Pick<Config, 'payday' | 'paydayType' | 'paydayBeforeWeekend' | 'categories'>;
  excludeBankTxIds?: Set<string>;
}): {
  refundMatches: RefundMatchCandidate[];
  matchedRefundBankTxIds: Set<string>;
} {
  const {
    bankTransactions,
    appTransactions,
    config,
    excludeBankTxIds = new Set<string>(),
  } = params;

  const refundMatches: RefundMatchCandidate[] = [];
  const matchedRefundBankTxIds = new Set<string>();
  const availableCategories = (config.categories || [])
    .map((c: any) => (typeof c === 'string' ? c : c?.name || ''))
    .filter(Boolean);

  const expenses = appTransactions.filter((t) => t.type === 'expense' && Number(t.amount) > 0);
  const bookedOutflows = bankTransactions.filter(
    (t) => t.booking_status === 'BOOK' && getNormalizedBankTxAmount(t) < 0
  );

  for (const bTx of bankTransactions) {
    if (bTx.booking_status !== 'BOOK') continue;
    if (excludeBankTxIds.has(bTx.id)) continue;
    if ((bTx.currency || 'SEK') !== 'SEK') continue;

    if (!isLikelyMerchantRefund(bTx)) continue;

    const refundAmt = Math.round(Math.abs(getNormalizedBankTxAmount(bTx)) * 100) / 100;
    if (refundAmt <= 0) continue;

    const refundDate = getEffectiveBankTxDate(bTx);
    const refundMs = refundDate ? Date.parse(`${refundDate}T12:00:00`) : Date.now();
    const refundPeriod = getPeriodInfoForDate(refundDate || Date.now(), config).periodKey;
    const categorized = categorizeBankTransactionForApp(bTx, availableCategories);
    const bankText = `${bTx.counterparty_name || ''} ${bTx.description || ''} ${categorized.merchant}`;

    // 1. Try to find original purchase in appTransactions (same merchant, purchase amount >= refundAmt, purchase date <= refund date)
    let matchedOrigTx: Transaction | undefined;
    for (const exp of expenses) {
      if (exp.timestamp > refundMs + 86400000 * 2) continue;
      if (Number(exp.amount) + 0.01 < refundAmt) continue;
      const sim = computeMerchantSimilarity(bankText, `${exp.merchant || ''} ${exp.note || ''}`);
      if (sim.score >= 0.5) {
        matchedOrigTx = exp;
        break;
      }
    }

    if (matchedOrigTx) {
      const origPeriod = getPeriodInfoForDate(matchedOrigTx.timestamp, config).periodKey;
      matchedRefundBankTxIds.add(bTx.id);
      refundMatches.push({
        bankTx: bTx,
        originalTransaction: matchedOrigTx,
        refundAmount: refundAmt,
        category: matchedOrigTx.category || categorized.category,
        merchant: matchedOrigTx.merchant || categorized.merchant,
        isPartial: Math.abs(Number(matchedOrigTx.amount) - refundAmt) >= 0.05,
        isLaterPeriod: origPeriod !== refundPeriod,
        confidence:
          Math.abs(Number(matchedOrigTx.amount) - refundAmt) < 0.05 ? 'exact' : 'high',
      });
      continue;
    }

    // 2. Try to find original purchase in booked bank transactions
    let matchedOrigBankTx: BankTransactionItem | undefined;
    for (const outTx of bookedOutflows) {
      const outDate = getEffectiveBankTxDate(outTx);
      const outMs = outDate ? Date.parse(`${outDate}T12:00:00`) : 0;
      if (outMs > refundMs + 86400000 * 2) continue;
      const outAmt = Math.abs(getNormalizedBankTxAmount(outTx));
      if (outAmt + 0.01 < refundAmt) continue;
      const sim = computeMerchantSimilarity(
        bankText,
        `${outTx.counterparty_name || ''} ${outTx.description || ''}`
      );
      if (sim.score >= 0.5) {
        matchedOrigBankTx = outTx;
        break;
      }
    }

    matchedRefundBankTxIds.add(bTx.id);
    const origBankPeriod = matchedOrigBankTx
      ? getPeriodInfoForDate(getEffectiveBankTxDate(matchedOrigBankTx) || Date.now(), config)
          .periodKey
      : refundPeriod;
    const origBankAmt = matchedOrigBankTx
      ? Math.abs(getNormalizedBankTxAmount(matchedOrigBankTx))
      : refundAmt;

    refundMatches.push({
      bankTx: bTx,
      originalBankTx: matchedOrigBankTx,
      refundAmount: refundAmt,
      category: categorized.category,
      merchant: categorized.merchant,
      isPartial: matchedOrigBankTx ? Math.abs(origBankAmt - refundAmt) >= 0.05 : false,
      isLaterPeriod: origBankPeriod !== refundPeriod,
      confidence: matchedOrigBankTx ? 'high' : 'uncertain',
    });
  }

  return { refundMatches, matchedRefundBankTxIds };
}

// ---------------------------------------------------------------------------
// 9. COMPLETE FIRST RECONCILIATION PREVIEW ENGINE (Requirement 5, 6, 7, 8, 9)
// ---------------------------------------------------------------------------

export function buildReconciliationPreview(params: {
  bankTransactions: BankTransactionItem[];
  userAccounts?: BankAccount[];
  accounts?: BankAccount[];
  appTransactions?: Transaction[];
  existingAppTransactions?: Transaction[];
  fixedExpenses?: FixedExpense[];
  existingFixedExpenses?: FixedExpense[];
  incomes?: Income[];
  existingIncomes?: Income[];
  existingMonthlySavings?: MonthlySaving[];
  config: Config;
  importStartDate?: string | null;
  referenceDate?: Date;
  currentRemainingToSpend?: number;
}): FirstReconciliationPreview {
  const userAccounts = params.userAccounts || params.accounts || [];
  const appTransactions = params.appTransactions || params.existingAppTransactions || [];
  const fixedExpenses = params.fixedExpenses || params.existingFixedExpenses || [];
  const incomes = params.incomes || params.existingIncomes || [];
  const config: Config =
    params.existingMonthlySavings && !params.config.monthlySavingsItems
      ? { ...params.config, monthlySavingsItems: params.existingMonthlySavings }
      : params.config;
  const { bankTransactions, importStartDate } = params;

  // Use referenceDate if provided, or derive from importStartDate (with +3 days so it falls inside that pay period) or latest transaction date
  let referenceDate = params.referenceDate;
  if (!referenceDate) {
    if (importStartDate) {
      const startMs = Date.parse(`${importStartDate}T12:00:00`);
      referenceDate = Number.isFinite(startMs) ? new Date(startMs + 3 * 86400000) : new Date();
    } else {
      referenceDate = new Date();
    }
  }

  const periodInfo = getPeriodInfoForDate(referenceDate, config);
  const effectiveStartDate = importStartDate || periodInfo.startIso;
  const availableCategories = (config.categories || [])
    .map((c: any) => (typeof c === 'string' ? c : c?.name || ''))
    .filter(Boolean);

  // Filter to selected budget accounts (if userAccounts provided)
  const budgetAccountIds = new Set(
    userAccounts
      .filter((a) => a.is_selected && a.include_in_budget !== false)
      .map((a) => a.id)
  );

  const accountFilteredTxs =
    budgetAccountIds.size > 0
      ? bankTransactions.filter((t) => budgetAccountIds.has(t.bank_account_id))
      : bankTransactions;

  // Step 1: Resolve Reserved vs Booked across all transactions on these accounts
  const { resolutions: allReservationResolutions } = resolveReservedTransactions(accountFilteredTxs);
  const reservationReplacements: ReservationReplacementItem[] = allReservationResolutions
    .filter((r) => r.status === 'replaced_by_booked' && r.bookedBankTx)
    .map((r) => ({
      reservedTx: r.reservedBankTx,
      bookedTx: r.bookedBankTx!,
      amountChanged: Boolean(r.amountChanged),
      dateChanged: Boolean(r.dateChanged),
      note: r.amountChanged
        ? `Ersatt av bokfört köp (${Math.abs(getNormalizedBankTxAmount(r.bookedBankTx!))} kr)`
        : 'Ersatt av bokfört köp',
    }));

  const reservedItems: ActiveReservedDisplayItem[] = allReservationResolutions
    .filter((r) => r.status === 'active_reserved')
    .map((r) => {
      const tx = r.reservedBankTx;
      const amt = getNormalizedBankTxAmount(tx);
      const categorized = categorizeBankTransactionForApp(tx, availableCategories);
      return {
        ...r,
        bankTx: tx,
        amount: amt,
        currency: tx.currency || 'SEK',
        dateIso: getEffectiveBankTxDate(tx) || tx.created_at.split('T')[0],
        merchant: categorized.merchant,
      };
    });

  let skippedBeforeStartDateCount = 0;
  let alreadyProcessedCount = 0;

  const eligibleBookedTxs: BankTransactionItem[] = [];

  for (const tx of accountFilteredTxs) {
    if (tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD') {
      continue; // Handled in reservedItems
    }
    if (tx.booking_status && tx.booking_status !== 'BOOK') {
      continue;
    }

    const externalKeyVal = tx.external_key || tx.external_tx_key || '';
    const isAlreadyLinkedInApp = appTransactions.some(
      (appTx) =>
        appTx.bankTransactionId === tx.id ||
        (Array.isArray(appTx.tags) &&
          (appTx.tags.includes(`bank_tx:${tx.id}`) ||
            (externalKeyVal && appTx.tags.includes(`bank_key:${externalKeyVal}`))))
    );

    if (
      isAlreadyLinkedInApp ||
      (tx.reconciliation_status &&
        tx.reconciliation_status !== 'unprocessed' &&
        tx.reconciliation_status !== 'needs_review')
    ) {
      alreadyProcessedCount++;
      continue;
    }

    const effDate = getEffectiveBankTxDate(tx);
    if (!effDate || effDate < effectiveStartDate) {
      skippedBeforeStartDateCount++;
      continue;
    }

    eligibleBookedTxs.push(tx);
  }

  const handledIds = new Set<string>();
  const reviewItems: ReconciliationReviewItem[] = [];

  const pushReviewItem = (
    item: Omit<
      ReconciliationReviewItem,
      'id' | 'amount' | 'dateIso' | 'merchant' | 'categorySuggestion' | 'reason' | 'suggestedAction'
    > & {
      suggestedAction?: ReconciliationReviewItem['suggestedAction'];
      candidateManualTx?: Transaction;
      candidateFixedExpense?: FixedExpense;
    }
  ) => {
    reviewItems.push({
      ...item,
      id: `review_${item.bankTx.id}`,
      amount: item.normalizedAmount,
      dateIso: item.effectiveDate,
      merchant: item.displayMerchant,
      categorySuggestion: item.suggestedCategory,
      reason: item.reasonCode,
      suggestedAction:
        item.suggestedAction ||
        (item.normalizedAmount < 0 ? 'import_purchase' : 'exclude'),
    });
  };

  // Step 2: Check for Non-SEK currency (Requirement 2 & 9: Never sum different currencies as SEK)
  for (const tx of eligibleBookedTxs) {
    const currency = (tx.currency || 'SEK').toUpperCase();
    if (currency !== 'SEK') {
      handledIds.add(tx.id);
      const categorized = categorizeBankTransactionForApp(tx, availableCategories);
      pushReviewItem({
        bankTx: tx,
        normalizedAmount: getNormalizedBankTxAmount(tx),
        displayMerchant: categorized.merchant,
        suggestedCategory: categorized.category,
        effectiveDate: getEffectiveBankTxDate(tx) || effectiveStartDate,
        reasonCode: 'foreign_currency',
        reasonLabel: `Utländsk valuta (${currency})`,
        reasonDescription: `Transaktionen är i ${currency} (${tx.amount} ${currency}). Summeras inte automatiskt som SEK utan granskning.`,
        suggestedAction: 'exclude',
      });
    }
  }

  // Step 3: Match against Planned Fixed Expenses, Incomes & Monthly Savings per occasion FIRST
  // (so budgeted savings transfers like Avanza ISK confirm the saving plan before generic transfer detection)
  const PlannedMatching = matchBankToPlannedOccasions({
    bankTransactions: eligibleBookedTxs,
    fixedExpenses,
    incomes,
    monthlySavingsItems: config.monthlySavingsItems || [],
    monthlySavingsAggregate: config.monthlySavings || 0,
    config,
    excludeBankTxIds: handledIds,
  });

  const plannedOccasionMatches: PlannedOccasionMatch[] = [];
  for (const pm of PlannedMatching.matches) {
    handledIds.add(pm.bankTx.id);
    if (pm.confidence === 'uncertain') {
      const categorized = categorizeBankTransactionForApp(pm.bankTx, availableCategories);
      const fe = fixedExpenses.find((f) => f.id === pm.planId);
      pushReviewItem({
        bankTx: pm.bankTx,
        normalizedAmount: getNormalizedBankTxAmount(pm.bankTx),
        displayMerchant: pm.planName,
        suggestedCategory: fe?.category || categorized.category,
        effectiveDate: getEffectiveBankTxDate(pm.bankTx) || effectiveStartDate,
        reasonCode: 'uncertain_fixed_or_variable',
        reasonLabel: 'Avvikande belopp för fast utgift',
        reasonDescription: `Matchar "${pm.planName}" (planerat ${pm.plannedAmount} kr, faktiskt ${pm.actualAmount} kr). Bekräfta om den ersätter periodens fasta utgift.`,
        candidateFixedExpenses: fe ? [fe] : undefined,
        candidateFixedExpense: fe,
        suggestedAction: 'confirm_fixed',
      });
    } else {
      plannedOccasionMatches.push(pm);
    }
  }

  // Step 4: Detect Own-Account Transfers on remaining transactions
  const remainingForTransfers = eligibleBookedTxs.filter((t) => !handledIds.has(t.id));
  const transferDetection = detectTransfers(remainingForTransfers, userAccounts);

  const confirmedTransfers: TransferPairCandidate[] = [];
  for (const pair of transferDetection.pairs) {
    if (pair.confidence === 'confirmed_pair' || pair.confidence === 'explicit_own_account') {
      confirmedTransfers.push(pair);
    }
  }
  for (const id of transferDetection.confirmedTransferTxIds) {
    handledIds.add(id);
  }
  for (const id of transferDetection.uncertainTransferTxIds) {
    const tx = remainingForTransfers.find((t) => t.id === id);
    if (tx && !handledIds.has(tx.id)) {
      handledIds.add(tx.id);
      const categorized = categorizeBankTransactionForApp(tx, availableCategories);
      pushReviewItem({
        bankTx: tx,
        normalizedAmount: getNormalizedBankTxAmount(tx),
        displayMerchant: categorized.merchant,
        suggestedCategory: categorized.category,
        effectiveDate: getEffectiveBankTxDate(tx) || effectiveStartDate,
        reasonCode: 'uncertain_transfer',
        reasonLabel: 'Möjlig egen överföring',
        reasonDescription:
          'Ser ut att kunna vara en överföring mellan konton. Bekräfta om den ska exkluderas från budgeten eller räknas som köp.',
        suggestedAction: 'transfer',
      });
    }
  }

  // Step 5: Match against Manual Transactions (1-to-1)
  const remainingForManual = eligibleBookedTxs.filter((t) => !handledIds.has(t.id));
  const manualMatchResult = matchBankToManualTransactions(
    remainingForManual,
    appTransactions,
    availableCategories
  );

  for (const m of manualMatchResult.clearMatches) {
    handledIds.add(m.bankTx.id);
  }
  for (const m of manualMatchResult.uncertainMatches) {
    handledIds.add(m.bankTx.id);
    const categorized = categorizeBankTransactionForApp(m.bankTx, availableCategories);
    pushReviewItem({
      bankTx: m.bankTx,
      normalizedAmount: getNormalizedBankTxAmount(m.bankTx),
      displayMerchant: categorized.merchant,
      suggestedCategory: m.manualTx.category || categorized.category,
      effectiveDate: getEffectiveBankTxDate(m.bankTx) || effectiveStartDate,
      reasonCode: 'uncertain_manual_match',
      reasonLabel: 'Osäker matchning mot manuell post',
      reasonDescription: m.reason,
      candidateManualMatches: [m],
      candidateManualTx: m.manualTx,
      suggestedAction: 'match_manual',
    });
  }

  // Step 6: Match Merchant Refunds
  const refundResult = matchBankRefunds({
    bankTransactions: eligibleBookedTxs,
    appTransactions,
    config,
    excludeBankTxIds: handledIds,
  });

  const refundMatches: RefundMatchCandidate[] = [];
  for (const rm of refundResult.refundMatches) {
    handledIds.add(rm.bankTx.id);
    if (rm.confidence === 'uncertain') {
      pushReviewItem({
        bankTx: rm.bankTx,
        normalizedAmount: getNormalizedBankTxAmount(rm.bankTx),
        displayMerchant: rm.merchant,
        suggestedCategory: rm.category,
        effectiveDate: getEffectiveBankTxDate(rm.bankTx) || effectiveStartDate,
        reasonCode: 'uncertain_refund',
        reasonLabel: 'Möjlig återbetalning / retur',
        reasonDescription: `Insättning från ${rm.merchant} (+${rm.refundAmount} kr). Välj vilken utgift eller kategori återbetalningen ska minska.`,
        suggestedAction: 'refund',
      });
    } else {
      refundMatches.push(rm);
    }
  }

  // Step 7: Classify remaining transactions into Credit Card Invoices, Duplicate Same-Day Review, Unrecognized Inflows, or Ordinary Everyday Purchases
  const newPurchases: NewPurchaseImportCandidate[] = [];

  for (const tx of eligibleBookedTxs) {
    if (handledIds.has(tx.id)) continue;

    const signedAmt = getNormalizedBankTxAmount(tx);
    if (signedAmt === 0) continue;
    const absAmt = Math.round(Math.abs(signedAmt) * 100) / 100;
    const effDate = getEffectiveBankTxDate(tx) || effectiveStartDate;
    const categorized = categorizeBankTransactionForApp(tx, availableCategories);

    if (isLikelyCreditCardInvoice(tx)) {
      handledIds.add(tx.id);
      pushReviewItem({
        bankTx: tx,
        normalizedAmount: signedAmt,
        displayMerchant: categorized.merchant,
        suggestedCategory: 'Räkningar',
        effectiveDate: effDate,
        reasonCode: 'credit_card_invoice',
        reasonLabel: 'Kortfaktura / Kreditkortsbetalning',
        reasonDescription:
          'Betalning till kortutgivare/fakturatjänst. Om kortets enskilda köp redan finns i appen ska fakturan exkluderas så att köpen inte räknas dubbelt.',
        suggestedAction: 'exclude',
      });
      continue;
    }

    if (manualMatchResult.duplicateSameDayReviewBankTxIds.has(tx.id)) {
      handledIds.add(tx.id);
      pushReviewItem({
        bankTx: tx,
        normalizedAmount: signedAmt,
        displayMerchant: categorized.merchant,
        suggestedCategory: categorized.category,
        effectiveDate: effDate,
        reasonCode: 'uncertain_duplicate_same_day',
        reasonLabel: 'Likadant köp samma dag',
        reasonDescription: `Ytterligare ett köp på ${absAmt} kr hos ${categorized.merchant} samma dag (${effDate}). Bekräfta att det är ett separat köp.`,
        suggestedAction: 'import_purchase',
      });
      continue;
    }

    if (signedAmt > 0) {
      handledIds.add(tx.id);
      pushReviewItem({
        bankTx: tx,
        normalizedAmount: signedAmt,
        displayMerchant: categorized.merchant,
        suggestedCategory: 'Övrigt',
        effectiveDate: effDate,
        reasonCode: 'large_unrecognized_inflow',
        reasonLabel: 'Insättning att klassificera',
        reasonDescription: `Insättning på +${absAmt} kr (${tx.description}). Välj om det är en återbetalning, egen överföring eller extra inkomst.`,
        suggestedAction: 'exclude',
      });
      continue;
    }

    const parsedMs = Date.parse(`${effDate}T12:00:00`);
    newPurchases.push({
      bankTx: tx,
      merchant: categorized.merchant,
      rawDescription: tx.description,
      amount: absAmt,
      currency: tx.currency || 'SEK',
      effectiveDate: effDate,
      timestamp: Number.isFinite(parsedMs) ? parsedMs : Date.now(),
      category: categorized.category,
      logo: categorized.logo,
    });
  }

  // Build unified `matchedItems` and `newTransactions` for UI & tests
  const matchedItems: ReconciliationMatchedItem[] = [];

  for (const m of manualMatchResult.clearMatches) {
    const absAmt = Math.abs(getNormalizedBankTxAmount(m.bankTx));
    matchedItems.push({
      id: `match_manual_${m.bankTx.id}`,
      bankTx: m.bankTx,
      matchKind: 'manual_tx',
      title: m.manualTx.merchant || m.manualTx.category || m.bankTx.description,
      subtitle: 'Matchad mot manuell post',
      explanation: m.reason,
      plannedAmount: Number(m.manualTx.amount) || absAmt,
      actualAmount: absAmt,
      budgetDelta: 0,
      confidence: 'high',
      Preselected: true,
      manualTx: m.manualTx,
    });
  }

  for (const pm of plannedOccasionMatches) {
    if (pm.planType === 'fixed_expense') {
      const fe = fixedExpenses.find((f) => f.id === pm.planId);
      const budgetDelta = Math.round((pm.plannedAmount - pm.actualAmount) * 100) / 100;
      matchedItems.push({
        id: `match_fixed_${pm.bankTx.id}`,
        bankTx: pm.bankTx,
        matchKind: 'fixed_expense',
        title: pm.planName,
        subtitle: `Fast utgift (${pm.periodKey})`,
        explanation:
          budgetDelta === 0
            ? `Bekräftar avsatt fast utgift (${pm.plannedAmount} kr) för period ${pm.periodKey}`
            : `Faktiskt belopp ${pm.actualAmount} kr (planerat ${pm.plannedAmount} kr) för period ${pm.periodKey}`,
        plannedAmount: pm.plannedAmount,
        actualAmount: pm.actualAmount,
        budgetDelta,
        confidence: 'high',
        Preselected: true,
        periodKey: pm.periodKey,
        fixedExpense: fe,
      });
    } else if (pm.planType === 'income') {
      const inc = incomes.find((i) => i.id === pm.planId);
      const budgetDelta = Math.round((pm.actualAmount - pm.plannedAmount) * 100) / 100;
      matchedItems.push({
        id: `match_inc_${pm.bankTx.id}`,
        bankTx: pm.bankTx,
        matchKind: 'income',
        title: pm.planName,
        subtitle: `Planerad inkomst (${pm.periodKey})`,
        explanation:
          budgetDelta === 0
            ? `Bekräftar planerad inkomst (${pm.plannedAmount} kr) för period ${pm.periodKey}`
            : `Faktisk lön/inkomst ${pm.actualAmount} kr (planerat ${pm.plannedAmount} kr) för period ${pm.periodKey}`,
        plannedAmount: pm.plannedAmount,
        actualAmount: pm.actualAmount,
        budgetDelta,
        confidence: 'high',
        Preselected: true,
        periodKey: pm.periodKey,
        income: inc,
      });
    } else if (pm.planType === 'saving') {
      const sav = (config.monthlySavingsItems || []).find((s) => s.id === pm.planId);
      const budgetDelta = Math.round((pm.plannedAmount - pm.actualAmount) * 100) / 100;
      matchedItems.push({
        id: `match_sav_${pm.bankTx.id}`,
        bankTx: pm.bankTx,
        matchKind: 'monthly_saving',
        title: pm.planName,
        subtitle: `Månadssparande (${pm.periodKey})`,
        explanation: `Uppfyller redan avsatt sparande (${pm.plannedAmount} kr) utan dubbelräkning`,
        plannedAmount: pm.plannedAmount,
        actualAmount: pm.actualAmount,
        budgetDelta,
        confidence: 'high',
        Preselected: true,
        periodKey: pm.periodKey,
        monthlySaving: sav,
      });
    }
  }

  for (const tr of confirmedTransfers) {
    const outAmt = Math.abs(getNormalizedBankTxAmount(tr.outgoingBankTx));
    matchedItems.push({
      id: `match_tr_${tr.outgoingBankTx.id}`,
      bankTx: tr.outgoingBankTx,
      matchKind: 'own_transfer',
      title: tr.outgoingBankTx.description || 'Överföring',
      subtitle: 'Egen överföring',
      explanation: tr.reason,
      plannedAmount: outAmt,
      actualAmount: outAmt,
      budgetDelta: 0,
      confidence: 'high',
      Preselected: true,
    });
  }

  for (const rm of refundMatches) {
    matchedItems.push({
      id: `match_ref_${rm.bankTx.id}`,
      bankTx: rm.bankTx,
      matchKind: 'refund',
      title: `${rm.merchant} (Återbetalning)`,
      subtitle: `Återbetalning i ${rm.category}`,
      explanation: rm.originalTransaction
        ? `Kopplas till köp hos ${rm.originalTransaction.merchant || rm.merchant}`
        : `Minskar utgifterna i ${rm.category}`,
      plannedAmount: 0,
      actualAmount: rm.refundAmount,
      budgetDelta: rm.refundAmount,
      confidence: 'high',
      Preselected: true,
      originalPurchaseTx: rm.originalTransaction,
    });
  }

  const newTransactions: ReconciliationNewTransactionItem[] = newPurchases.map((np) => {
    const accObj = userAccounts.find((a) => a.id === np.bankTx.bank_account_id);
    return {
      ...np,
      id: `new_${np.bankTx.id}`,
      dateIso: np.effectiveDate,
      accountName: accObj?.custom_name || accObj?.name || 'Bankkonto',
      Preselected: true,
    };
  });

  // Step 8: Calculate Budget Impact for the Current Period
  const { periodKey, startIso: periodStartIso, endIso: periodEndIso, endDate } = periodInfo;

  let currentLeftToSpend: number;
  if (params.currentRemainingToSpend !== undefined) {
    currentLeftToSpend = Math.round(params.currentRemainingToSpend);
  } else {
    const currentPlannedIncome = incomes.reduce(
      (sum, inc) => sum + getPlannedAmountForPeriod(inc, periodKey),
      0
    );
    const currentPlannedFixed = fixedExpenses
      .filter((fe) => isPlannedItemActiveInPeriod(fe, endDate, periodStartIso))
      .reduce((sum, fe) => sum + getPlannedAmountForPeriod(fe, periodKey), 0);
    const savingsItems = config.monthlySavingsItems || [];
    const currentPlannedSavings =
      savingsItems.length > 0
        ? savingsItems
            .filter((s) => isPlannedItemActiveInPeriod(s, endDate, periodStartIso))
            .reduce((sum, s) => sum + getPlannedAmountForPeriod(s, periodKey), 0)
        : Number(config.monthlySavings) || 0;
    const periodAppTxs = appTransactions.filter((t) => {
      const d = new Date(Number(t.timestamp));
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      return iso >= periodStartIso && iso <= periodEndIso;
    });
    const currentVariableSpent = periodAppTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const currentExtraIncomes = periodAppTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    currentLeftToSpend = Math.round(
      currentPlannedIncome +
        currentExtraIncomes -
        currentPlannedFixed -
        currentPlannedSavings -
        currentVariableSpent
    );
  }

  const inCurrentPeriod = (dateIso: string) =>
    dateIso >= periodStartIso && dateIso <= periodEndIso;

  const newPurchasesTotal = Math.round(
    newPurchases
      .filter((p) => inCurrentPeriod(p.effectiveDate))
      .reduce((s, p) => s + p.amount, 0)
  );

  const fixedAdjustmentsTotal = Math.round(
    plannedOccasionMatches
      .filter((m) => m.planType === 'fixed_expense' && m.periodKey === periodKey)
      .reduce((s, m) => s + m.difference, 0)
  );

  const incomeAdjustmentsTotal = Math.round(
    plannedOccasionMatches
      .filter((m) => m.planType === 'income' && m.periodKey === periodKey)
      .reduce((s, m) => s + m.difference, 0)
  );

  const savingAdjustmentsTotal = Math.round(
    plannedOccasionMatches
      .filter((m) => m.planType === 'saving' && m.periodKey === periodKey)
      .reduce((s, m) => s + m.difference, 0)
  );

  const refundsTotal = Math.round(
    refundMatches
      .filter((r) => {
        const d = getEffectiveBankTxDate(r.bankTx);
        return d ? inCurrentPeriod(d) : false;
      })
      .reduce((s, r) => s + r.refundAmount, 0)
  );

  const waitingInReviewTotal = Math.round(
    reviewItems
      .filter((r) => inCurrentPeriod(r.effectiveDate))
      .reduce((s, r) => s + Math.abs(r.normalizedAmount), 0)
  );

  const reservedOutsideBudgetTotal = Math.round(
    reservedItems.reduce((s, r) => s + Math.abs(r.amount), 0)
  );

  const netDeltaLeftToSpend =
    incomeAdjustmentsTotal -
    fixedAdjustmentsTotal -
    savingAdjustmentsTotal -
    newPurchasesTotal +
    refundsTotal;

  const projectedLeftToSpend = currentLeftToSpend + netDeltaLeftToSpend;

  return {
    importStartDate: effectiveStartDate,
    periodKey,
    periodStartIso,
    periodEndIso,
    manualMatches: manualMatchResult.clearMatches,
    plannedOccasionMatches,
    confirmedTransfers,
    refundMatches,
    newPurchases,
    reviewItems,
    reservedItems,
    allReservationResolutions,
    reservationReplacements,
    matchedItems,
    newTransactions,
    budgetImpact: {
      periodKey,
      periodStartIso,
      periodEndIso,
      currentLeftToSpend,
      projectedLeftToSpend,
      netDeltaLeftToSpend,
      newPurchasesTotal,
      fixedAdjustmentsTotal,
      incomeAdjustmentsTotal,
      savingAdjustmentsTotal,
      refundsTotal,
      waitingInReviewTotal,
      reservedOutsideBudgetTotal,
      currentRemainingToSpend: currentLeftToSpend,
      projectedRemainingToSpend: projectedLeftToSpend,
      netImpactOnRemaining: netDeltaLeftToSpend,
      reservedAmountOutsideBudget: reservedOutsideBudgetTotal,
    },
    skippedBeforeStartDateCount,
    alreadyProcessedCount,
  };
}

// ---------------------------------------------------------------------------
// 10. APPLY & UNDO HELPERS FOR RECONCILIATION ACTIONS
// ---------------------------------------------------------------------------

/**
 * Creates a Dejz Transaction object from an approved bank purchase candidate,
 * preserving original bank details separately from user-editable fields.
 */
export function createAppTransactionFromBankPurchase(
  candidate: NewPurchaseImportCandidate | ReconciliationNewTransactionItem,
  categoryOverride?: string
): Omit<Transaction, 'id'> {
  const extKey = candidate.bankTx.external_key || candidate.bankTx.external_tx_key || candidate.bankTx.id;
  return {
    amount: candidate.amount,
    category: categoryOverride || candidate.category || 'Okategoriserat',
    merchant: candidate.merchant,
    note: '',
    timestamp: candidate.timestamp,
    type: 'expense',
    logo: candidate.logo,
    paymentMethod: PaymentMethod.KORTBETALNING,
    tags: [
      'bank_imported',
      `bank_tx:${candidate.bankTx.id}`,
      `bank_key:${extKey}`,
      `bank_acc:${candidate.bankTx.bank_account_id}`,
    ],
    bankTransactionId: candidate.bankTx.id,
    bankAccountId: candidate.bankTx.bank_account_id,
    originalBankDescription: candidate.rawDescription || candidate.bankTx.description,
    originalBankAmount: Number(candidate.bankTx.amount),
    originalBankCurrency: candidate.currency,
  };
}

/**
 * Merges a bank transaction with an existing manual Dejz Transaction,
 * strictly preserving the user's category, display merchant (if set), note, receipts, and splits!
 */
export function linkManualTransactionWithBankTx(
  manualTx: Transaction,
  bankTx: BankTransactionItem
): Transaction {
  const existingTags = Array.isArray(manualTx.tags) ? manualTx.tags : [];
  const extKey = bankTx.external_key || bankTx.external_tx_key || bankTx.id;
  const mergedTags = Array.from(
    new Set([
      ...existingTags,
      `bank_tx:${bankTx.id}`,
      `bank_key:${extKey}`,
      `bank_acc:${bankTx.bank_account_id}`,
    ])
  );

  return {
    ...manualTx,
    category: manualTx.category,
    merchant: manualTx.merchant || cleanDisplayMerchantName(bankTx.counterparty_name || bankTx.description),
    note: manualTx.note,
    receiptUrl: manualTx.receiptUrl,
    receiptUrls: manualTx.receiptUrls,
    splits: manualTx.splits,
    tags: mergedTags,
    bankTransactionId: bankTx.id,
    bankAccountId: bankTx.bank_account_id,
    originalBankDescription: bankTx.description,
    originalBankAmount: Number(bankTx.amount),
    originalBankCurrency: bankTx.currency || 'SEK',
  };
}

/**
 * Unlinks a manual Dejz Transaction from a bank transaction ("Lossa matchning").
 */
export function unlinkManualTransactionFromBankTx(manualTx: Transaction): Transaction {
  const cleanedTags = (manualTx.tags || []).filter(
    (t) =>
      !t.startsWith('bank_tx:') &&
      !t.startsWith('bank_key:') &&
      !t.startsWith('bank_acc:') &&
      t !== 'bank_imported'
  );
  return {
    ...manualTx,
    tags: cleanedTags,
    bankTransactionId: null as any,
    bankAccountId: null as any,
    originalBankDescription: null as any,
    originalBankAmount: null as any,
    originalBankCurrency: null as any,
  };
}

/**
 * Creates a refund offset transaction in Dejz that reduces spend in the original category
 * rather than inflating ordinary income.
 */
export function createRefundAppTransaction(
  refundOrBankTx: RefundMatchCandidate | BankTransactionItem,
  categoryArg?: string,
  originalTransactionArg?: Transaction
): Omit<Transaction, 'id'> {
  const isCandidate = 'bankTx' in refundOrBankTx && 'refundAmount' in refundOrBankTx;
  const bankTx = isCandidate ? refundOrBankTx.bankTx : refundOrBankTx;
  const refundAmount = isCandidate
    ? refundOrBankTx.refundAmount
    : Math.abs(getNormalizedBankTxAmount(bankTx));
  const category = isCandidate
    ? refundOrBankTx.category
    : categoryArg || originalTransactionArg?.category || 'Övrigt';
  const origTx = isCandidate ? refundOrBankTx.originalTransaction : originalTransactionArg;
  const merchantName = isCandidate
    ? refundOrBankTx.merchant
    : origTx?.merchant || cleanDisplayMerchantName(bankTx.counterparty_name || bankTx.description);

  const effDate = getEffectiveBankTxDate(bankTx);
  const parsedMs = effDate ? Date.parse(`${effDate}T12:00:00`) : Date.now();
  const origDesc = origTx
    ? `Återbetalning för köp hos ${origTx.merchant || merchantName}`
    : 'Återbetalning / retur';
  const extKey = bankTx.external_key || bankTx.external_tx_key || bankTx.id;

  return {
    amount: -Math.abs(refundAmount),
    category: category || 'Övrigt',
    merchant: `${merchantName} (Återköp)`,
    note: origDesc,
    timestamp: Number.isFinite(parsedMs) ? parsedMs : Date.now(),
    type: 'expense',
    paymentMethod: PaymentMethod.KORTBETALNING,
    tags: [
      'bank_imported',
      'bank_refund',
      `bank_tx:${bankTx.id}`,
      `bank_key:${extKey}`,
      `bank_acc:${bankTx.bank_account_id}`,
      ...(origTx ? [`refund_of:${origTx.id}`] : []),
    ],
    bankTransactionId: bankTx.id,
    bankAccountId: bankTx.bank_account_id,
    originalBankDescription: bankTx.description,
    originalBankAmount: Number(bankTx.amount),
    originalBankCurrency: bankTx.currency || 'SEK',
    refundOfTransactionId: origTx?.id,
  };
}

/**
 * Applies a period override to a FixedExpense, Income, or MonthlySaving for a specific periodKey
 * without changing the base agreement amount for future periods.
 */
export function applyPlannedOccasionOverride<
  T extends { id: string; amount: number; periodOverrides?: Record<string, number> }
>(item: T, periodKey: string, actualAmount: number): T {
  return {
    ...item,
    periodOverrides: {
      ...(item.periodOverrides || {}),
      [periodKey]: Math.round(actualAmount * 100) / 100,
    },
  };
}
