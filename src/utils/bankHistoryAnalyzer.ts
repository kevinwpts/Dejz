import { BankAccount, BankTransactionItem } from '../services/bankService';
import { SWEDISH_EXPENSE_PRESETS, SwedishExpensePreset } from '../data/swedishExpensePresets';
import { Config, FixedExpense, Frequency, Income, PaydayType, Transaction, WeekendAdjustment } from '../types';
import { getLogoUrl } from './logo';
import { getPeriodBoundaries } from './date';
import { getActualBankPaymentDateAndMeta } from './swedishDate';
import {
  resolveMerchantAlias,
  normalizeCategoryToValid,
  getStoredPaymentMethods,
} from './appCache';

export type DetectedFixedExpenseWithEvidence = Omit<FixedExpense, 'id'> & {
  detectedOccurrences: number;
  lastDate?: string;
  evidenceDates?: string[];
  evidenceAmounts?: number[];
  evidenceSummary?: string;
};

export type DetectedIncomeWithEvidence = Omit<Income, 'id'> & {
  detectedOccurrences?: number;
  lastDate?: string;
  evidenceDates?: string[];
  evidenceAmounts?: number[];
  evidenceSummary?: string;
};

export interface AnalyzedBankOnboardingData {
  detectedFixedExpenses: DetectedFixedExpenseWithEvidence[];
  detectedIncomes: DetectedIncomeWithEvidence[];
  suggestedPayday: number | null;
  calculatedSpentSincePayday: number;
  analyzedTransactionCount: number;
}

export interface ExistingBudgetFixedExpenseMatch {
  id: string;
  detected: DetectedFixedExpenseWithEvidence;
  status: 'new' | 'amount_changed' | 'already_exists';
  existingExpense?: FixedExpense;
}

export interface ExistingBudgetIncomeMatch {
  id: string;
  detected: DetectedIncomeWithEvidence;
  status: 'new' | 'amount_changed' | 'already_exists';
  existingIncome?: Income;
}

export interface PeriodBankPurchaseCandidate {
  bankTxId: string;
  externalKey: string;
  merchant: string;
  rawDescription: string;
  amount: number; // positive expense amount for app Transaction
  dateIso: string;
  timestamp: number;
  category: string;
  logo?: string;
  isReserved: boolean;
  alreadyInApp: boolean;
}

export interface ExistingBudgetBankSyncPlan {
  periodStartIso: string;
  periodPurchases: PeriodBankPurchaseCandidate[];
  skippedFixedInPeriodCount: number;
  skippedInternalTransfersCount: number;
  fixedExpenseMatches: ExistingBudgetFixedExpenseMatch[];
  incomeMatches: ExistingBudgetIncomeMatch[];
  analyzedTransactionCount: number;
}

// ---------------------------------------------------------------------------
// 1. ACCOUNT DISPLAY & SELECTION HELPERS
// ---------------------------------------------------------------------------

export function isLikelySavingsAccount(acc: Pick<BankAccount, 'name' | 'product' | 'custom_name'>): boolean {
  const combined = `${acc.custom_name || ''} ${acc.product || ''} ${acc.name || ''}`.toLowerCase();
  return (
    combined.includes('sparkonto') ||
    combined.includes('enkla sparkontot') ||
    combined.includes('framtidskonto') ||
    combined.includes('placeringskonto') ||
    combined.includes('kapitalkonto') ||
    combined.includes('fasträntekonto') ||
    combined.includes('buffer')
  );
}

export function formatBankAccountNumber(rawNumber: string | null | undefined): string {
  if (!rawNumber) return '';
  const digits = rawNumber.replace(/\s+/g, '');
  // Format 11-digit Swedish SEB/bank account numbers (e.g. 51960050753 -> 5196 00 507 53)
  if (/^\d{11}$/.test(digits)) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 11)}`;
  }
  return rawNumber;
}

function isLikelyPersonFullName(rawName: string): boolean {
  const trimmed = rawName.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('konto') ||
    lower.includes('spar') ||
    lower.includes('lön') ||
    lower.includes('privat') ||
    lower.includes('kort') ||
    lower.includes('buffert') ||
    lower.includes('gemensamt') ||
    lower.includes('hushåll')
  ) {
    return false;
  }
  // Many Swedish banks (like SEB) put the account holder's full name in `acc.name` in ALL CAPS (e.g. "KEVIN PETERSEN")
  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && words.length <= 4 && trimmed === trimmed.toUpperCase() && /^[A-ZÅÄÖ\s-]+$/.test(trimmed)) {
    return true;
  }
  return false;
}

function isRawAccountNumberOrIban(str: string): boolean {
  const cleaned = str.replace(/[\s-]/g, '');
  if (/^\d{6,}$/.test(cleaned)) return true;
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{8,}$/i.test(cleaned)) return true;
  return false;
}

export function getBankAccountTitle(
  acc: Pick<BankAccount, 'name' | 'product' | 'bban' | 'iban' | 'custom_name'> & {
    provider_account_uid?: string | null;
    aspsp_name?: string | null;
  },
  aspspName?: string | null
): string {
  const custom = (acc.custom_name || '').trim();
  if (custom && !isRawAccountNumberOrIban(custom)) return custom;

  const product = (acc.product || '').trim();
  const rawName = (acc.name || '').trim();

  if (product && !isLikelyPersonFullName(product) && !isRawAccountNumberOrIban(product)) {
    return product;
  }

  if (rawName && !isLikelyPersonFullName(rawName) && !isRawAccountNumberOrIban(rawName)) {
    return rawName;
  }

  const bankPrefix = (aspspName || acc.aspsp_name || '').trim() || 'SEB';
  const shortBank = bankPrefix.toUpperCase().includes('SEB') ? 'SEB' : bankPrefix;
  return `${shortBank} · Privatkonto`;
}

export function getBankAccountShortLabel(
  acc: Pick<BankAccount, 'name' | 'product' | 'bban' | 'iban' | 'provider_account_uid' | 'custom_name'> & {
    aspsp_name?: string | null;
  },
  aspspName?: string | null
): string {
  const custom = (acc.custom_name || '').trim();
  if (custom && !isRawAccountNumberOrIban(custom)) {
    return custom;
  }

  return getBankAccountTitle(acc, aspspName);
}

export function formatCleanBalanceLabel(rawLabel: string | null | undefined): string {
  if (!rawLabel) return 'Tillgängligt saldo';
  // Remove technical ISO codes like (ITAV), (CLAV), (ITBD), (CLBD), (SEK)
  const cleaned = rawLabel
    .replace(/\s*\((ITAV|CLAV|ITBD|CLBD|XPCD|OPAV|OPBD|PRCD|VALU|INFO|SEK|EUR|DKK|NOK)\)/gi, '')
    .trim();
  return cleaned || 'Tillgängligt saldo';
}

// ---------------------------------------------------------------------------
// 2. TRANSACTION SIGN NORMALIZATION & INTERNAL TRANSFER FILTERING
// ---------------------------------------------------------------------------

/**
 * Kontrollerar om en transaktion är en bekräftad inkomst (lön, inkommande Swish, insättning, bidrag etc.).
 * Utesluter strikt alla utgående betalningar som kortköp, autogiro, bankgiro, räkningar och utgående Swish.
 */
export function isExplicitInflowTransaction(
  desc: string | null | undefined,
  counterparty: string | null | undefined,
  indicator?: string | null,
  bookingStatus?: string | null
): boolean {
  // 1. Om banken explicit flaggat som DBIT (utgift) kan det ALDRIG vara en inkomst
  if (indicator === 'DBIT') return false;

  const combined = `${desc || ''} ${counterparty || ''}`.toLowerCase().trim();

  // Kända reservationstermer eller preliminär bokningsstatus (PDNG/HOLD)
  const statusUpper = bookingStatus ? String(bookingStatus).toUpperCase().trim() : null;
  const isReserved =
    statusUpper === 'PDNG' ||
    statusUpper === 'HOLD' ||
    combined.includes('reserverat') ||
    combined.includes('reservation') ||
    combined.includes('preliminär') ||
    combined.includes('preliminar');

  const isExplicitRefund =
    combined.includes('återköp') ||
    combined.includes('aterkop') ||
    combined.includes('retur') ||
    combined.includes('refund') ||
    combined.includes('kreditering');

  // Reservationer hos svenska banker (t.ex. SEB) är uteslutande preliminära kortköp/utgifter.
  // De får ALDRIG tolkas som inkomst såvida det inte explicit rör sig om en retur/återköp/kreditering.
  if (isReserved && !isExplicitRefund) {
    return false;
  }

  if (!combined && !indicator) return false;

  // 2. Kända utgiftsmönster har alltid företräde (kan ALDRIG bli inkomst):
  if (
    combined.includes('kortköp') ||
    combined.includes('kortkop') ||
    combined.includes('autogiro') ||
    combined.includes('bankgiro') ||
    combined.includes('plusgiro') ||
    combined.includes('fakturabetalning') ||
    combined.includes('faktura') ||
    combined.includes('betalning bg') ||
    combined.includes('betalning pg') ||
    combined.includes('inbetalning bg') ||
    combined.includes('inbetalning pg') ||
    combined.includes('swish betalning') ||
    combined.includes('swish till') ||
    combined.includes('swish skickad') ||
    combined.includes('swish handel') ||
    combined.includes('överföring till') ||
    combined.includes('overforing till') ||
    combined.includes('uttag') ||
    combined.includes('bankomat') ||
    combined.includes('avgift') ||
    combined.includes('årsavgift') ||
    combined.includes('månadsavgift') ||
    combined.includes('räntekostnad') ||
    combined.includes('csn återbetalning') ||
    combined.includes('csn aterbetalning') ||
    combined.includes('premie')
  ) {
    return false;
  }

  // Om transaktionen är "Swish 123..." (dvs till ett 123-företagsnummer vid köp):
  if (/swish\s*123\d{7}/i.test(combined)) {
    return false;
  }

  // 3. Om banken explicit angivit CRDT (kredit/inflöde):
  // Men OBS: Om det är en reservation litar vi aldrig på CRDT, eftersom banker som SEB
  // sätter CRDT på spärrbelopp vid kortköp.
  if (indicator === 'CRDT' && !isReserved) {
    return true;
  }

  // 4. Verifierade inkomstmönster:
  // Lön & arbetsersättning
  if (
    combined.includes('lön') ||
    combined.includes('salary') ||
    combined.includes('löneutbetalning') ||
    combined.includes('loneutbetalning') ||
    /\blon\b/i.test(combined)
  ) {
    return true;
  }

  // Mottagen Swish (inkommande betalning till användaren)
  if (
    combined.includes('swish mottagen') ||
    combined.includes('swish mottagit') ||
    combined.includes('swish inbetalning') ||
    combined.includes('swish inb') ||
    combined.includes('swish från') ||
    combined.includes('swish fran')
  ) {
    return true;
  }

  // Insättning & överföring från annat konto
  if (
    combined.includes('insättning') ||
    combined.includes('insattning') ||
    combined.includes('insatt ') ||
    combined.includes('överföring från') ||
    combined.includes('overforing fran')
  ) {
    return true;
  }

  // Återbetalning, returer & försäkrings-/företagsutbetalningar
  if (
    combined.includes('återbetalning') ||
    combined.includes('aterbetalning') ||
    combined.includes('återköp') ||
    combined.includes('aterkop') ||
    combined.includes('retur') ||
    combined.includes('refund') ||
    combined.includes('kreditering') ||
    combined.includes('skadeersättning') ||
    combined.includes('skadeersattning') ||
    combined.includes('försäkringsersättning') ||
    combined.includes('forsakringsersattning') ||
    combined.includes('utbetalning') ||
    combined.includes('återbäring') ||
    combined.includes('aterbaring')
  ) {
    return true;
  }

  // Samhällsbidrag & pensioner
  if (
    combined.includes('försäkringskassan') ||
    combined.includes('forsakringskassan') ||
    combined.includes('barnbidrag') ||
    combined.includes('pension') ||
    combined.includes('pensionsmyndigheten') ||
    combined.includes('skatteverket') ||
    combined.includes('skatteåterbäring') ||
    combined.includes('skatteaterbaring') ||
    combined.includes('a-kassa') ||
    combined.includes('akassa') ||
    combined.includes('studiemedel')
  ) {
    return true;
  }

  // Ränteintäkt eller aktieutdelning
  if (
    combined.includes('aktieutdelning') ||
    combined.includes('ränteintäkt') ||
    combined.includes('ranteintakt') ||
    combined.includes('utdelning')
  ) {
    return true;
  }

  return false;
}

const APPROX_FX_RATES_TO_SEK: Record<string, number> = {
  SEK: 1,
  EUR: 11.45,
  USD: 10.65,
  NOK: 0.98,
  DKK: 1.53,
  GBP: 13.5,
  CHF: 12.1,
  PLN: 2.65,
  THB: 0.31,
  JPY: 0.071,
  CAD: 7.75,
  AUD: 6.95,
};

/**
 * Resolves the SEK amount for a bank transaction.
 * If the transaction currency is not SEK, inspects raw_json for instructed_amount / exchange_rate
 * or applies fallback FX rates to SEK so foreign purchases (e.g. 50 EUR) are not treated as 50 SEK.
 */
export function resolveBankTxSekAmount(tx: BankTransactionItem): {
  signedSekAmount: number;
  absSekAmount: number;
  isForeignCurrency: boolean;
  originalCurrency: string;
  originalAmount: number;
} {
  const signedRaw = getNormalizedBankTxAmount(tx);
  const absRaw = Math.abs(signedRaw);
  const sign = signedRaw < 0 ? -1 : 1;
  const currency = String(tx.currency || 'SEK').toUpperCase().trim();

  if (!currency || currency === 'SEK') {
    const rawJson = tx.raw_json || {};
    const instrCurrency = String(
      rawJson?.instructed_amount?.currency ||
        rawJson?.currency_exchange?.source_currency ||
        'SEK'
    )
      .toUpperCase()
      .trim();
    const instrAmt = Number(rawJson?.instructed_amount?.amount);
    if (instrCurrency && instrCurrency !== 'SEK' && Number.isFinite(instrAmt) && instrAmt > 0) {
      return {
        signedSekAmount: signedRaw,
        absSekAmount: Math.round(absRaw * 100) / 100,
        isForeignCurrency: true,
        originalCurrency: instrCurrency,
        originalAmount: Math.abs(instrAmt),
      };
    }
    return {
      signedSekAmount: signedRaw,
      absSekAmount: Math.round(absRaw * 100) / 100,
      isForeignCurrency: false,
      originalCurrency: 'SEK',
      originalAmount: absRaw,
    };
  }

  const rawJson = tx.raw_json || {};
  // Check if raw_json contains a SEK instructed/billing amount or explicit exchange_rate
  const instrCurr = String(rawJson?.instructed_amount?.currency || '').toUpperCase().trim();
  const instrVal = Number(rawJson?.instructed_amount?.amount);
  if (instrCurr === 'SEK' && Number.isFinite(instrVal) && instrVal !== 0) {
    const absSek = Math.round(Math.abs(instrVal) * 100) / 100;
    return {
      signedSekAmount: sign * absSek,
      absSekAmount: absSek,
      isForeignCurrency: true,
      originalCurrency: currency,
      originalAmount: absRaw,
    };
  }

  const fxRate = Number(
    rawJson?.exchange_rate ||
      rawJson?.currency_exchange?.exchange_rate ||
      APPROX_FX_RATES_TO_SEK[currency] ||
      1
  );
  const validRate = Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 1;
  const absSek = Math.round(absRaw * validRate * 100) / 100;

  return {
    signedSekAmount: sign * absSek,
    absSekAmount: absSek,
    isForeignCurrency: true,
    originalCurrency: currency,
    originalAmount: absRaw,
  };
}

export function isLikelyCreditCardInvoiceBankTx(tx: BankTransactionItem): boolean {
  const signedAmt = getNormalizedBankTxAmount(tx);
  const absAmt = Math.abs(signedAmt);
  if (signedAmt >= 0 || absAmt < 800) return false;
  const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
  const keywords = [
    'entercard',
    'remember card',
    'bank norwegian',
    'morrow bank',
    'amex',
    'american express',
    'seb kort',
    'eurocard',
    'mastercard faktura',
    'kreditkortsfaktura',
    'resurs bank',
    'ikano bank',
    'marginalen bank',
    'collector bank',
    'walley',
    'qliro',
  ];
  if (keywords.some((kw) => text.includes(kw))) return true;
  if (text.includes('klarna') && absAmt >= 1500 && !tx.raw_json?.card_transaction) {
    return true;
  }
  return false;
}

export function isLikelyMerchantRefundBankTx(tx: BankTransactionItem): boolean {
  const signedAmt = getNormalizedBankTxAmount(tx);
  if (signedAmt <= 0) return false;
  const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
  if (
    text.includes('lön') ||
    text.includes('salary') ||
    text.includes('csn') ||
    text.includes('försäkringskassan') ||
    text.includes('forsakringskassan') ||
    text.includes('pension') ||
    text.includes('barnbidrag') ||
    text.includes('skatteverket') ||
    text.includes('swish')
  ) {
    return false;
  }
  if (
    text.includes('retur') ||
    text.includes('återköp') ||
    text.includes('aterkop') ||
    text.includes('refund') ||
    text.includes('kreditering') ||
    text.includes('återbetalning') ||
    text.includes('aterbetalning')
  ) {
    return true;
  }
  // Positive card transaction at a retail merchant is a card refund
  if (tx.raw_json?.card_transaction && tx.credit_debit_indicator === 'CRDT') {
    return true;
  }
  return false;
}

/**
 * Normalizes the signed amount of a bank transaction.
 * Ensures that all card purchases, store purchases, bills, autogiro, and outgoing
 * payments are strictly negative outflows (-Math.abs), while verified inflows
 * (salary, incoming Swish, deposits, refunds, benefits) remain positive credits.
 */
export function getNormalizedBankTxAmount(tx: BankTransactionItem): number {
  const raw = Number(tx.amount);
  if (!Number.isFinite(raw) || raw === 0) return 0;

  const desc = tx.description || '';
  const counterparty = tx.counterparty_name || '';
  const indicator = tx.credit_debit_indicator
    ? String(tx.credit_debit_indicator).toUpperCase().trim()
    : null;
  const status = tx.booking_status
    ? String(tx.booking_status).toUpperCase().trim()
    : null;

  // 1. Om banken explicit angivit DBIT:
  if (indicator === 'DBIT') {
    return -Math.abs(raw);
  }

  const combined = `${desc} ${counterparty}`.toLowerCase();
  const isReserved =
    status === 'PDNG' ||
    status === 'HOLD' ||
    tx.reconciliation_status === 'reserved_pending' ||
    combined.includes('reserverat') ||
    combined.includes('reservation') ||
    combined.includes('preliminär') ||
    combined.includes('preliminar');

  const isExplicitRefund =
    combined.includes('återköp') ||
    combined.includes('aterkop') ||
    combined.includes('retur') ||
    combined.includes('refund') ||
    combined.includes('kreditering');

  // Reservationer hos svenska banker är uteslutande kortköp/utgifter som hålls spärrade på kontot.
  // De ska ALLTID vara negativa utgifter (-Math.abs(raw)), såvida det inte uttryckligen är en återbetalning/retur.
  if (isReserved && !isExplicitRefund) {
    return -Math.abs(raw);
  }

  // 2. Om beloppet redan är negativt i bankdatan och det inte är en bekräftad inkomst:
  if (raw < 0 && !isExplicitInflowTransaction(desc, counterparty, indicator, status)) {
    return raw;
  }

  // 3. Kontrollera om transaktionen är en bekräftad inkomst:
  if (isExplicitInflowTransaction(desc, counterparty, indicator, status)) {
    return Math.abs(raw);
  }

  // 4. På ett bankkonto är alla vanliga transaktioner (kortköp, restaurang, butiker, utgående betalningar) utgifter:
  return -Math.abs(raw);
}

/**
 * Detects micro-savings and internal transfers between the user's own accounts
 * (e.g. SEB "Enkla vardagen", "Enkla sparkontot", "Överföring egna konton")
 * so they are never treated as consumption or fixed expenses.
 */
export function isInternalTransferOrMicroSavings(
  tx: BankTransactionItem,
  userAccounts: BankAccount[] = []
): boolean {
  const rawJson = tx.raw_json || {};
  const remittanceText = Array.isArray(rawJson?.remittance_information)
    ? rawJson.remittance_information
        .map((r: any) => (typeof r === 'string' ? r : r?.unstructured || ''))
        .join(' ')
    : typeof rawJson?.remittance_information === 'string'
    ? rawJson.remittance_information
    : '';

  const combined = `${tx.description || ''} ${tx.counterparty_name || ''} ${remittanceText}`
    .toLowerCase()
    .trim();

  const bankCodeDesc = String(rawJson?.bank_transaction_code?.description || '')
    .trim()
    .toLowerCase();

  // Mikrolån/mikrospar ("Enkla vardagen" / "ENKLA VARDAG" / "Enkla sparkontot") är alltid intern överföring/sparande
  if (
    combined.includes('enkla vardag') ||
    combined.includes('enkla sparko')
  ) {
    return true;
  }

  // Reserverade kortköp (PDNG/HOLD) som inte är explicit mikrospar/överföring är ALDRIG interna överföringar
  if (
    (tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD') &&
    !combined.includes('överföring') &&
    !combined.includes('overforing')
  ) {
    return false;
  }

  if (
    rawJson?.card_transaction ||
    bankCodeDesc === 'card purchase' ||
    bankCodeDesc === 'direct debit' ||
    bankCodeDesc === 'payment' ||
    bankCodeDesc === 'instant payment' ||
    combined.includes('kortköp') ||
    combined.includes('kortkop') ||
    combined.includes('autogiro') ||
    combined.includes('bankgiro') ||
    combined.includes('plusgiro') ||
    combined.includes('fakturabetalning') ||
    isLikelySwishTransactionText(tx.description, rawJson) ||
    isLikelySwishTransactionText(tx.counterparty_name, rawJson) ||
    isLikelySwishTransactionText(remittanceText, rawJson)
  ) {
    return false;
  }

  // SEB och andra svenska banker märker kontoöverföringar med bank_transaction_code.description === "Transfer"
  if (
    bankCodeDesc === 'transfer' ||
    bankCodeDesc === 'internal transfer' ||
    bankCodeDesc === 'internaltransfer' ||
    bankCodeDesc === 'account transfer'
  ) {
    return true;
  }

  if (
    combined.includes('enkla sparkontot') ||
    combined.includes('egna konton') ||
    combined.includes('egen överföring') ||
    combined.includes('egen overforing') ||
    combined.includes('mellan egna') ||
    combined.includes('intern överföring') ||
    combined.includes('intern overforing') ||
    combined.includes('kontoöverföring') ||
    combined.includes('kontooverforing') ||
    combined.includes('överf via internet') ||
    combined.includes('overf via internet') ||
    combined.includes('överföring via internet') ||
    combined.includes('overforing via internet') ||
    combined.includes('överföring mobil') ||
    combined.includes('overforing mobil') ||
    combined.includes('sparkonto') ||
    combined.includes('framtidskonto') ||
    combined.includes('placeringskonto') ||
    combined.includes('kapitalkonto') ||
    combined.includes('fasträntekonto') ||
    combined.includes('buffertkonto')
  ) {
    return true;
  }

  const descTrimmed = (tx.description || '').toLowerCase().trim();
  if (
    descTrimmed === 'överföring' ||
    descTrimmed === 'overforing' ||
    descTrimmed === 'insättning' ||
    descTrimmed === 'insattning' ||
    /^(överföring|overforing|överf\.?|overf\.?)\b/i.test(descTrimmed)
  ) {
    return true;
  }

  // Om beskrivningen är ett bankkontonummer + referens (t.ex. SEB "51960050753 225532192851")
  const rawAcctCandidate = (tx.description || tx.counterparty_name || '')
    .replace(/^(från|fran|till|överföring|overforing|insättning|insattning)\s+/i, '')
    .trim();
  const rawAcctDigits = rawAcctCandidate.replace(/\D+/g, '');
  if (
    rawAcctCandidate.length >= 15 &&
    /^[\d\s.,-]+$/.test(rawAcctCandidate) &&
    rawAcctDigits.length >= 16 &&
    rawAcctDigits.length <= 32
  ) {
    return true;
  }

  const combinedDigits = combined.replace(/\D+/g, '');
  const creditorBban = (rawJson?.creditor_account?.other?.identification || '').replace(/\D+/g, '');
  const debtorBban = (rawJson?.debtor_account?.other?.identification || '').replace(/\D+/g, '');
  const creditorIban = (rawJson?.creditor_account?.iban || '').replace(/\s+/g, '').toUpperCase();
  const debtorIban = (rawJson?.debtor_account?.iban || '').replace(/\s+/g, '').toUpperCase();

  // På utgående betalningar (DBIT / < 0) är debtor_account användarens eget konto.
  // På inkommande betalningar (CRDT / > 0) är creditor_account användarens eget konto.
  // Vi får ENDAST jämföra motpartens konto (creditor vid utflöde, debtor vid inflöde) mot userAccounts,
  // och ALDRIG matcha mot samma bankkonto som transaktionen själv ligger på (tx.bank_account_id)!
  const txAmt = getNormalizedBankTxAmount(tx);
  const counterpartyBban = txAmt < 0 ? creditorBban : txAmt > 0 ? debtorBban : '';
  const counterpartyIban = txAmt < 0 ? creditorIban : txAmt > 0 ? debtorIban : '';

  const normalizePersonLetters = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-zåäö\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const txDescLetters = normalizePersonLetters(tx.description || '');
  const txCpLetters = normalizePersonLetters(tx.counterparty_name || '');

  for (const acc of userAccounts) {
    const isSameSourceAccount = Boolean(acc.id && tx.bank_account_id && acc.id === tx.bank_account_id);
    const bbanDigits = (acc.bban || '').replace(/\D+/g, '');
    if (bbanDigits.length >= 6) {
      const variants = [bbanDigits];
      if (bbanDigits.length >= 10) {
        if (bbanDigits.slice(4).length >= 6) variants.push(bbanDigits.slice(4));
        if (bbanDigits.slice(-7).length === 7) variants.push(bbanDigits.slice(-7));
      }
      if (
        variants.some(
          (v) =>
            (combinedDigits.length >= 6 && combinedDigits.includes(v)) ||
            (!isSameSourceAccount &&
              counterpartyBban &&
              (counterpartyBban.includes(v) || v.includes(counterpartyBban)))
        )
      ) {
        return true;
      }
    }

    const aIban = (acc.iban || '').replace(/\s+/g, '').toUpperCase();
    if (
      aIban.length >= 10 &&
      ((!isSameSourceAccount && counterpartyIban === aIban) ||
        combined.toUpperCase().replace(/\s+/g, '').includes(aIban))
    ) {
      return true;
    }

    // Kontrollera om transaktionens beskrivning/motpart är kontoinnehavarens eget namn
    // (inklusive SEB:s 12-teckens trunkering vid egen överföring, t.ex. "KEVIN PETERS" för "KEVIN PETERSEN")
    const holderLetters = normalizePersonLetters(acc.name || '');
    if (holderLetters.length >= 7 && holderLetters.includes(' ')) {
      for (const party of [txDescLetters, txCpLetters]) {
        if (!party || party.length < 7 || !party.includes(' ')) continue;
        if (
          party === holderLetters ||
          (party.length >= 8 && holderLetters.startsWith(party)) ||
          (holderLetters.length >= 8 && party.startsWith(holderLetters))
        ) {
          return true;
        }
      }
    }

    for (const label of [acc.custom_name, acc.product]) {
      const cleanLabel = (label || '').trim().toLowerCase();
      if (
        cleanLabel.length >= 6 &&
        cleanLabel !== 'konto' &&
        cleanLabel !== 'bank' &&
        cleanLabel !== 'privat' &&
        cleanLabel !== 'privatkonto' &&
        cleanLabel !== 'lönekonto' &&
        cleanLabel !== 'lonekonto' &&
        !isLikelyPersonFullName(cleanLabel) &&
        combined.includes(cleanLabel)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Identifierar både enskilda och parvisa interna överföringar (utflöde på Konto A + inflöde på Konto B
 * med samma belopp inom <= 3 dagar) direkt i råa banktransaktioner.
 */
export function findRawBankInternalTransferIds(
  transactions: BankTransactionItem[],
  userAccounts: BankAccount[] = []
): Set<string> {
  const internalIds = new Set<string>();
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return internalIds;
  }

  for (const tx of transactions) {
    if (!tx || !tx.id) continue;
    if (
      tx.reconciliation_status === 'internal_transfer' ||
      isInternalTransferOrMicroSavings(tx, userAccounts)
    ) {
      internalIds.add(tx.id);
    }
  }

  const activeTxs = transactions.filter((tx) => {
    if (!tx || !tx.id) return false;
    if (tx.booking_status === 'CNCL' || tx.booking_status === 'RJCT') return false;
    // Reserverade kortköp (PDNG/HOLD) som inte redan explicit flaggats som kontoöverföring ska aldrig parmatchas bort som överföringar
    if (
      (tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD') &&
      !internalIds.has(tx.id)
    ) {
      return false;
    }
    if (
      tx.reconciliation_status === 'reserved_replaced' ||
      tx.replaced_by_bank_tx_id ||
      tx.reconciliation_status === 'excluded'
    ) {
      return false;
    }
    if (
      isLikelySwishTransactionText(tx.description, tx.raw_json) ||
      isLikelySwishTransactionText(tx.counterparty_name, tx.raw_json)
    ) {
      return false;
    }
    const btcDesc = String(tx.raw_json?.bank_transaction_code?.description || '')
      .trim()
      .toLowerCase();
    if (
      btcDesc === 'card purchase' ||
      btcDesc === 'direct debit' ||
      btcDesc === 'payment' ||
      btcDesc === 'instant payment'
    ) {
      return false;
    }
    return true;
  });

  const outflows = activeTxs.filter((t) => getNormalizedBankTxAmount(t) < 0);
  const inflows = activeTxs.filter((t) => {
    const amt = getNormalizedBankTxAmount(t);
    if (amt <= 0) return false;
    const text = `${t.description || ''} ${t.counterparty_name || ''}`.toLowerCase();
    if (
      text.includes('lön') ||
      text.includes('lon ') ||
      text.includes('salary') ||
      text.includes('löneutbetalning') ||
      text.includes('csn') ||
      text.includes('försäkringskassan') ||
      text.includes('barnbidrag') ||
      text.includes('pension') ||
      text.includes('a-kassa') ||
      text.includes('a kassa') ||
      text.includes('akassa') ||
      text.includes('skatteverket') ||
      text.includes('återköp') ||
      text.includes('retur') ||
      text.includes('refund') ||
      text.includes('kreditering') ||
      text.includes('återbetalning')
    ) {
      return false;
    }
    return true;
  });

  const consumedInflowIds = new Set<string>();

  for (const outTx of outflows) {
    const outAmt = Math.abs(getNormalizedBankTxAmount(outTx));
    if (outAmt <= 0) continue;
    const outDate = outTx.booking_date || outTx.transaction_date || outTx.value_date || '';
    const outMs = Date.parse(`${outDate}T12:00:00`);

    let bestIn: BankTransactionItem | null = null;
    let bestScore = -1;

    for (const inTx of inflows) {
      if (consumedInflowIds.has(inTx.id)) continue;
      if (inTx.id === outTx.id) continue;

      const inAmt = Math.abs(getNormalizedBankTxAmount(inTx));
      if (Math.abs(inAmt - outAmt) > 0.01) continue;

      const inDate = inTx.booking_date || inTx.transaction_date || inTx.value_date || '';
      const inMs = Date.parse(`${inDate}T12:00:00`);
      const dayDiff =
        Number.isFinite(outMs) && Number.isFinite(inMs)
          ? Math.abs(outMs - inMs) / (1000 * 60 * 60 * 24)
          : outDate === inDate
          ? 0
          : 999;

      if (dayDiff > 3) continue;

      const diffAcc =
        Boolean(outTx.bank_account_id && inTx.bank_account_id) &&
        outTx.bank_account_id !== inTx.bank_account_id;
      const oneFlagged = internalIds.has(outTx.id) || internalIds.has(inTx.id);

      if (diffAcc || oneFlagged) {
        const score = (diffAcc ? 100 : 0) + (oneFlagged ? 50 : 0) - dayDiff * 10;
        if (score > bestScore) {
          bestScore = score;
          bestIn = inTx;
        }
      }
    }

    if (bestIn) {
      consumedInflowIds.add(bestIn.id);
      internalIds.add(outTx.id);
      internalIds.add(bestIn.id);
    }
  }

  return internalIds;
}

// ---------------------------------------------------------------------------
// 3. FIXED EXPENSE & EVERYDAY MERCHANT RULES
// ---------------------------------------------------------------------------

interface KeywordRule {
  keywords: string[];
  presetId?: string;
  fallbackName: string;
  category: string;
  paymentMethod: string;
  splitByExactAmount?: boolean;
  requireMultipleMonthsForCard?: boolean;
}

const EXTENDED_FIXED_EXPENSE_RULES: KeywordRule[] = [
  // Streaming & Media
  { keywords: ['spotify'], presetId: 'spotify-individual', fallbackName: 'Spotify', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['netflix'], presetId: 'netflix-standard', fallbackName: 'Netflix', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['youtube', 'google *youtube', 'google*youtube'], presetId: 'youtube-premium', fallbackName: 'YouTube Premium', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['disney+', 'disney plus', 'disneyplus'], presetId: 'disney-plus', fallbackName: 'Disney+', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['hbo', 'max.com', 'hbomax', 'warnermedia'], presetId: 'max-hbo', fallbackName: 'Max (HBO)', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['viaplay'], presetId: 'viaplay-film-serier', fallbackName: 'Viaplay', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['tv4 play', 'tv4play', 'tv4 ab'], presetId: 'tv4-play-plus', fallbackName: 'TV4 Play Plus', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['prime video', 'amazon prime'], presetId: 'prime-video', fallbackName: 'Amazon Prime', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['skyshowtime'], presetId: 'skyshowtime', fallbackName: 'SkyShowtime', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['discovery+', 'discovery plus'], presetId: 'discovery-plus', fallbackName: 'Discovery+', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['storytel'], presetId: 'storytel-ljudbok', fallbackName: 'Storytel', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['bookbeat'], presetId: 'bookbeat', fallbackName: 'BookBeat', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['nextory'], presetId: 'nextory', fallbackName: 'Nextory', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['podme'], presetId: 'podme', fallbackName: 'PodMe Premium', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['audible'], presetId: 'audible', fallbackName: 'Audible', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['tidal'], presetId: 'tidal', fallbackName: 'Tidal', category: 'Streaming', paymentMethod: 'Kort' },

  // Boende, Hyra, Fastigheter, El & Larm
  {
    keywords: [
      'sveafastigheter',
      'fastigheter',
      'fastighets',
      'hyra',
      'hyresavi',
      'bostadsrätt',
      'bostadsratt',
      'brf ',
      'hsb ',
      'riksbyggen',
      'sbc ',
      'heimstaden',
      'rikky',
      'wallenstam',
      'willhem',
      'akelius',
      'stena fastighet',
      'balder',
      'familjebostäder',
      'familjebostader',
      'poseidon',
      'stockholmshem',
      'svenska bostäder',
      'svenska bostader',
      'mimer',
      'gavlegårdarna',
      'uppsalahem',
      'botkyrkabyggen',
      'huge bostäder',
      'hfba',
      'halmstads fastighets',
    ],
    presetId: 'hyra-bostad',
    fallbackName: 'Hyra / Boende',
    category: 'Boende',
    paymentMethod: 'Bankgiro',
  },
  { keywords: ['bolån', 'bolan', 'bostadslån', 'hypotek', 'sbab', 'landshypotek', 'stabelo', 'amortering'], presetId: 'bostadslan-ranta', fallbackName: 'Bolån & Ränta', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['tibber'], presetId: 'tibber-el', fallbackName: 'Tibber El', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['vattenfall'], presetId: 'vattenfall-el', fallbackName: 'Vattenfall', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['fortum'], presetId: 'fortum-el', fallbackName: 'Fortum', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['öresundskraft', 'oresundskraft', 'öresundkraft', 'oresundkraft'], fallbackName: 'Öresundskraft', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['ellevio', 'e.on', 'eon energi', 'göteborg energi', 'goteborg energi', 'skånska energi', 'kraftringen', 'jämtkraft', 'mälarenergi', 'tekniska verken', 'greenely', 'bixia', 'godel', 'hemab'], presetId: 'elavtal', fallbackName: 'Elräkning & Nät', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['verisure'], presetId: 'larm-verisure', fallbackName: 'Verisure Larm', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['sector alarm'], presetId: 'larm-sector-alarm', fallbackName: 'Sector Alarm', category: 'Boende', paymentMethod: 'Autogiro' },

  // Försäkringar
  { keywords: ['hedvig'], presetId: 'hedvig-hemforsakring', fallbackName: 'Hedvig Försäkring', category: 'Försäkringar', paymentMethod: 'Kort' },
  { keywords: ['länsförsäkringar', 'lansforsakringar', 'lf försäkring'], presetId: 'lansforsakringar-hem', fallbackName: 'Länsförsäkringar', category: 'Försäkringar', paymentMethod: 'Autogiro' },
  { keywords: ['trygg-hansa', 'trygghansa'], presetId: 'trygghansa-hem', fallbackName: 'Trygg-Hansa', category: 'Försäkringar', paymentMethod: 'Autogiro' },
  { keywords: ['if skadeförsäkring', 'if skadeforsakring', 'if försäkring'], presetId: 'if-hemforsakring', fallbackName: 'If Försäkring', category: 'Försäkringar', paymentMethod: 'Autogiro' },
  { keywords: ['folksam'], presetId: 'folksam-hem', fallbackName: 'Folksam', category: 'Försäkringar', paymentMethod: 'Autogiro' },
  { keywords: ['agria'], presetId: 'djurforsakring-agria', fallbackName: 'Agria Djurförsäkring', category: 'Försäkringar', paymentMethod: 'Autogiro' },
  { keywords: ['lassie'], presetId: 'lassie-djurforsakring', fallbackName: 'Lassie Djurförsäkring', category: 'Försäkringar', paymentMethod: 'Kort' },
  { keywords: ['ica försäkring', 'ica forsakring', 'moderna försäkringar', 'gjensidige', 'dina försäkringar', 'watercircles', 'svedea', 'bliwa'], presetId: 'hemforsakring', fallbackName: 'Försäkring', category: 'Försäkringar', paymentMethod: 'Autogiro' },

  // Mobil & Bredband
  { keywords: ['tele2'], presetId: 'tele2-mobil', fallbackName: 'Tele2', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['telia'], presetId: 'telia-mobil', fallbackName: 'Telia', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['telenor'], presetId: 'telenor-mobil', fallbackName: 'Telenor', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['hi3g', 'tre sverige', '3 sverige'], presetId: 'tre-mobil', fallbackName: 'Tre (3)', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['vimla'], presetId: 'vimla-mobil', fallbackName: 'Vimla', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['hallon'], presetId: 'hallon-mobil', fallbackName: 'Hallon', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['bahnhof'], presetId: 'bahnhoff-bredband', fallbackName: 'Bahnhof', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['halebop'], presetId: 'halebop-mobil', fallbackName: 'Halebop', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['fello'], presetId: 'fello-mobil', fallbackName: 'Fello', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['comviq'], presetId: 'comviq-mobil', fallbackName: 'Comviq', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['ownit'], presetId: 'ownit-bredband', fallbackName: 'Ownit', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['bredband2'], presetId: 'bredband2', fallbackName: 'Bredband2', category: 'Abonnemang', paymentMethod: 'Autogiro' },

  // Träning & Hälsa
  { keywords: ['sats'], presetId: 'sats-gym', fallbackName: 'SATS', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['nordic wellness'], presetId: 'nordic-wellness', fallbackName: 'Nordic Wellness', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['fitness24seven', 'fitness 24 seven', 'fitness 24se', 'fitness24se'], presetId: 'fitness24seven', fallbackName: 'Fitness24Seven', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['friskis'], presetId: 'friskis-svettis', fallbackName: 'Friskis & Svettis', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['actic'], presetId: 'actic-gym', fallbackName: 'Actic', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['stc training', 'stc gym'], presetId: 'stc-training', fallbackName: 'STC', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['strava'], presetId: 'strava-premium', fallbackName: 'Strava', category: 'Hälsa', paymentMethod: 'Kort' },
  { keywords: ['whoop'], presetId: 'whoop-membership', fallbackName: 'WHOOP', category: 'Hälsa', paymentMethod: 'Kort' },

  // Transport & Fordon
  { keywords: ['storstockholms lokaltrafik', 'ab sl'], presetId: 'sl-manadskort', fallbackName: 'SL Månadskort', category: 'Transport', paymentMethod: 'Kort' },
  { keywords: ['västtrafik', 'vasttrafik'], presetId: 'vasttrafik-period', fallbackName: 'Västtrafik', category: 'Transport', paymentMethod: 'Kort' },
  { keywords: ['skånetrafiken', 'skanetrafiken'], presetId: 'skanetrafiken-period', fallbackName: 'Skånetrafiken', category: 'Transport', paymentMethod: 'Kort' },
  { keywords: ['hallandstrafiken'], fallbackName: 'Hallandstrafiken', category: 'Transport', paymentMethod: 'Kort' },
  { keywords: ['transportstyrelsen', 'trängselskatt', 'trangselskatt', 'epass24'], presetId: 'trangselskatt-infrastruktur', fallbackName: 'Trängselskatt / Fordon', category: 'Transport', paymentMethod: 'Autogiro' },
  { keywords: ['volvofinans', 'ziklo bank', 'vw finans', 'volkswagen finans', 'santander consumer', 'dnb finans', 'toyota financial'], presetId: 'bil-leasing', fallbackName: 'Billeasing / Billån', category: 'Transport', paymentMethod: 'Autogiro' },

  // Fack, A-kassa, Bankavgift & CSN
  { keywords: ['csn', 'centrala studiestödsnämnden'], presetId: 'csn-aterbetalning', fallbackName: 'CSN Lån', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['union.akassa', 'unionens a-kassa', 'unionen a-kassa', 'unionen akassa'], fallbackName: 'Unionens A-kassa', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['unionen'], fallbackName: 'Unionen', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['sveriges ingenjörer', 'akademikernas a-kassa', 'akademikernas erkända'], presetId: 'akassa-sveriges-ingenjorer', fallbackName: 'A-kassa / Fackförbund', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['kommunal'], presetId: 'akassa-kommunal', fallbackName: 'Kommunal', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['vision'], presetId: 'akassa-vision', fallbackName: 'Vision', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['alfa-kassan', 'alfakassan'], presetId: 'akassa-alfakassan', fallbackName: 'Alfa-kassan', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['enkla vardag', 'vardagspaket'], fallbackName: 'SEB Enkla vardagen', category: 'Räkningar', paymentMethod: 'Autogiro' },

  // Tech, Moln, AI & Tidningar
  { keywords: ['apple.com/bill', 'apple com/bi', 'apple.com/bi', 'itunes.com/bill'], fallbackName: 'Apple / iCloud', category: 'Abonnemang', paymentMethod: 'Kort', splitByExactAmount: true, requireMultipleMonthsForCard: true },
  { keywords: ['openai', 'chatgpt'], presetId: 'chatgpt-plus', fallbackName: 'ChatGPT Plus', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['google one', 'google*storage'], presetId: 'google-one-100gb', fallbackName: 'Google One', category: 'Abonnemang', paymentMethod: 'Kort', requireMultipleMonthsForCard: true },
  { keywords: ['microsoft*365', 'microsoft*office', 'msbill.info'], presetId: 'microsoft-365', fallbackName: 'Microsoft 365', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['anthropic', 'claude.ai'], presetId: 'claude-pro', fallbackName: 'Claude Pro', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['cursor.com', 'cursor, ai'], fallbackName: 'Cursor', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['midjourney'], fallbackName: 'Midjourney', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['adobe'], presetId: 'adobe-photography', fallbackName: 'Adobe', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['1password'], presetId: '1password', fallbackName: '1Password', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['nordvpn'], presetId: 'nordvpn', fallbackName: 'NordVPN', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['mullvad'], fallbackName: 'Mullvad VPN', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['dropbox'], fallbackName: 'Dropbox', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['canva'], fallbackName: 'Canva', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['patreon'], fallbackName: 'Patreon', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['substack'], fallbackName: 'Substack', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['duolingo'], fallbackName: 'Duolingo', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['playstation', 'sony interactive'], presetId: 'playstation-plus', fallbackName: 'PlayStation', category: 'Nöjen', paymentMethod: 'Kort', requireMultipleMonthsForCard: true },
  { keywords: ['xbox', 'microsoft*xbox'], presetId: 'xbox-game-pass', fallbackName: 'Xbox Game Pass', category: 'Nöjen', paymentMethod: 'Kort', requireMultipleMonthsForCard: true },
  { keywords: ['nintendo'], presetId: 'nintendo-switch-online', fallbackName: 'Nintendo', category: 'Nöjen', paymentMethod: 'Kort', requireMultipleMonthsForCard: true },
  { keywords: ['discord'], presetId: 'discord-nitro', fallbackName: 'Discord Nitro', category: 'Nöjen', paymentMethod: 'Kort' },
  { keywords: ['aftonbladet'], presetId: 'aftonbladet-plus', fallbackName: 'Aftonbladet Plus', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['expressen'], presetId: 'expressen-premium', fallbackName: 'Expressen Premium', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['dagens nyheter', 'dn.se'], presetId: 'dagens-nyheter', fallbackName: 'Dagens Nyheter', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['svenska dagbladet', 'svd.se'], presetId: 'svenska-dagbladet', fallbackName: 'Svenska Dagbladet', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['dagens industri', 'di.se'], presetId: 'dagens-industri', fallbackName: 'Dagens Industri', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['readly'], presetId: 'readly-tidningar', fallbackName: 'Readly', category: 'Abonnemang', paymentMethod: 'Kort' },

  // Ytterligare svenska lån, fack, a-kassor, bredband & gym
  { keywords: ['anyfin'], fallbackName: 'Anyfin', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['resurs bank'], fallbackName: 'Resurs Bank', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['ikano bank'], fallbackName: 'Ikano Bank', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['marginalen'], fallbackName: 'Marginalen Bank', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['avida'], fallbackName: 'Avida Finans', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['brocc'], fallbackName: 'Brocc', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['hyresgästföreningen', 'hyresgastforeningen'], fallbackName: 'Hyresgästföreningen', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['småa', 'smaa', 'småföretagarnas a-kassa'], fallbackName: 'SMÅA A-kassa', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['handels a-kassa', 'handelsanställdas'], fallbackName: 'Handels', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['lärarnas a-kassa', 'sveriges lärare', 'lararnas a-kassa'], fallbackName: 'Sveriges Lärare / A-kassa', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['if metall'], fallbackName: 'IF Metall', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['vårdförbundet', 'vardforbundet'], fallbackName: 'Vårdförbundet', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['ledarna'], fallbackName: 'Ledarna', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['sappa'], fallbackName: 'Sappa', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['open infra'], fallbackName: 'Open Infra', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['globalconnect'], fallbackName: 'GlobalConnect', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['malkars'], fallbackName: 'Malkars Träningscenter', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['member 24', 'member24'], fallbackName: 'Member 24', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['puls & träning', 'puls och traning'], fallbackName: 'Puls & Träning', category: 'Hälsa', paymentMethod: 'Autogiro' },
];

// Merchants that are everyday variable purchases and should NEVER be auto-classified as fixed monthly expenses
const VARIABLE_SPENDING_EXCLUSIONS = [
  'ica ',
  'maxi ica',
  'ica kvantum',
  'ica nära',
  'ica supermarket',
  'ica maxi',
  'coop ',
  'stora coop',
  'willys',
  'hemköp',
  'hemkop',
  'lidl',
  'city gross',
  'systembolaget',
  'apotea',
  'apoteket',
  'kronans apotek',
  'hjärtat',
  'mcdonalds',
  'max burgers',
  'burger king',
  'espresso house',
  'waynes coffee',
  'pressbyrån',
  'pressbyran',
  '7-eleven',
  'foodora',
  'wolt',
  'uber eats',
  'uber *trip',
  'bolt.eu',
  'voi ',
  'tier ',
  'lime ',
  'ryde ',
  'circle k',
  'okq8',
  'preem',
  'st1 ',
  'ingo ',
  'din-x',
  'din x',
  'tanka ',
  'qstar',
  'clas ohlson',
  'kjell & co',
  'biltema',
  'jula ',
  'rusta ',
  'ikea ',
  'h&m ',
  'zara ',
  'åhlens',
  'ahlens',
  'normal ',
  'elgiganten',
  'netonnet',
  'webhallen',
  'felparkeringsavgift',
  'kontrollavgift',
  'parkeringsbot',
  'svea inkasso',
];

interface EverydayMerchantRule {
  keywords: string[];
  cleanName: string;
  preferredCategories: string[];
}

const EVERYDAY_MERCHANT_RULES: EverydayMerchantRule[] = [
  { keywords: ['maxi ica', 'ica maxi'], cleanName: 'ICA Maxi', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['ica kvantum'], cleanName: 'ICA Kvantum', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['ica supermarket'], cleanName: 'ICA Supermarket', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['ica nära', 'ica nara'], cleanName: 'ICA Nära', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['ica '], cleanName: 'ICA', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['stora coop', 'coop '], cleanName: 'Coop', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['willys'], cleanName: 'Willys', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['hemköp', 'hemkop'], cleanName: 'Hemköp', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['lidl'], cleanName: 'Lidl', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['city gross'], cleanName: 'City Gross', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['systembolaget', 'systembolag', 'systembolage', 'sys.bolaget', 'sysbolaget'], cleanName: 'Systembolaget', preferredCategories: ['Mat & dryck', 'Nöjen', 'Uteliv'] },
  { keywords: ['öresundskraft', 'oresundskraft'], cleanName: 'Öresundskraft AB', preferredCategories: ['Boende', 'Räkningar'] },
  { keywords: ['mcdonalds', 'mcdonald'], cleanName: "McDonald's", preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['max burgers', 'max hamburger'], cleanName: 'MAX Burgers', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['burger king'], cleanName: 'Burger King', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['espresso house'], cleanName: 'Espresso House', preferredCategories: ['Uteliv', 'Café', 'Mat & dryck'] },
  { keywords: ['pressbyrån', 'pressbyran', 'pressbyra'], cleanName: 'Pressbyrån', preferredCategories: ['Mat & dryck', 'Uteliv'] },
  { keywords: ['7-eleven'], cleanName: '7-Eleven', preferredCategories: ['Mat & dryck', 'Uteliv'] },
  { keywords: ['foodora'], cleanName: 'Foodora', preferredCategories: ['Uteliv', 'Mat & dryck'] },
  { keywords: ['wolt'], cleanName: 'Wolt', preferredCategories: ['Uteliv', 'Mat & dryck'] },
  { keywords: ['circle k'], cleanName: 'Circle K', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['okq8'], cleanName: 'OKQ8', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['preem'], cleanName: 'Preem', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['st1 '], cleanName: 'St1', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['ingo '], cleanName: 'INGO', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['easypark'], cleanName: 'EasyPark', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['aimo park', 'apcoa', 'parkster'], cleanName: 'Parkering', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['apotea'], cleanName: 'Apotea', preferredCategories: ['Hälsa', 'Shopping'] },
  { keywords: ['apoteket', 'kronans apotek', 'apotek hjärtat', 'hjärtat'], cleanName: 'Apotek', preferredCategories: ['Hälsa', 'Shopping'] },
  { keywords: ['clas ohlson'], cleanName: 'Clas Ohlson', preferredCategories: ['Shopping', 'Hemmet'] },
  { keywords: ['kjell & co', 'kjell o co'], cleanName: 'Kjell & Company', preferredCategories: ['Shopping', 'Elektronik'] },
  { keywords: ['biltema'], cleanName: 'Biltema', preferredCategories: ['Shopping', 'Transport'] },
  { keywords: ['jula'], cleanName: 'Jula', preferredCategories: ['Shopping', 'Hemmet'] },
  { keywords: ['rusta'], cleanName: 'Rusta', preferredCategories: ['Shopping', 'Hemmet'] },
  { keywords: ['ikea'], cleanName: 'IKEA', preferredCategories: ['Shopping', 'Boende'] },
  { keywords: ['normal '], cleanName: 'NORMAL', preferredCategories: ['Shopping', 'Hälsa'] },
  { keywords: ['h&m', 'hennes & mauritz'], cleanName: 'H&M', preferredCategories: ['Shopping', 'Kläder'] },
  { keywords: ['zara'], cleanName: 'Zara', preferredCategories: ['Shopping', 'Kläder'] },
  { keywords: ['elgiganten'], cleanName: 'Elgiganten', preferredCategories: ['Shopping', 'Elektronik'] },
  { keywords: ['klarna'], cleanName: 'Klarna', preferredCategories: ['Shopping', 'Övrigt'] },
];

function normalizeMerchantKey(rawText: string | null | undefined): string {
  return String(rawText || '')
    .toLowerCase()
    .replace(/\b(ab|aktiebolag|sverige|sweden|se|stockholm|göteborg|malmö|halmstad|hovas|hovås|autogiro|betalning|kortköp|kortkop|bg|pg)\b/g, ' ')
    .replace(/[0-9*#/_.,:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extraherar ett giltigt svenskt Swish-mobilnummer (070, 072, 073, 076, 079 eller +467...)
 * eller 10-siffrigt Swish-företagsnummer (123xxxxxxx).
 * Matchar ALDRIG bankkontonummer (t.ex. SEB 11-siffriga kontonummer som råkar innehålla "075..."
 * eller kontonummer + referensnummer som bildar "0753225532").
 */
export function extractSwishPhoneNumber(
  rawText: string | null | undefined,
  requireStandaloneIfNoSwishKeyword = true
): string | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const hasSwishKeyword = /\bswish\b/i.test(trimmed) || trimmed.toLowerCase().includes('swish');

  if (hasSwishKeyword) {
    // När "swish" finns i texten, leta efter ett fristående svenskt mobilnummer (070/072/073/076/079) eller 123-nummer
    const tokens = trimmed.replace(/[()]/g, ' ').split(/\s+/);
    // Prova först sammanhängande siffergrupper i texten
    const regex = /(?:^|[^\d])(\+?46\s*7[02369](?:[\s-]?\d){7}|07[02369](?:[\s-]?\d){7}|123(?:[\s-]?\d){7})(?:$|[^\d])/i;
    const match = trimmed.match(regex);
    if (match && match[1]) {
      const digits = match[1].replace(/\D/g, '');
      if (digits.startsWith('467') && digits.length === 11) {
        return '07' + digits.slice(3);
      }
      if ((digits.startsWith('07') || digits.startsWith('123')) && digits.length === 10) {
        return digits;
      }
    }
    for (const tok of tokens) {
      const d = tok.replace(/\D/g, '');
      if (/^467[02369]\d{7}$/.test(d)) return '07' + d.slice(3);
      if (/^(07[02369]\d{7}|123\d{7})$/.test(d)) return d;
    }
    return null;
  }

  if (requireStandaloneIfNoSwishKeyword) {
    // Utan ordet "swish" får texten ENBART tolkas som ett Swish-nummer om hela strängen
    // (efter ev. enkel betalningsprefix) är ett fristående giltigt svenskt mobilnummer (070, 072, 073, 076, 079)
    // eller ett 10-siffrigt Swish-företagsnummer (123xxxxxxx),
    // ALDRIG om det är ett 11-siffrigt bankkontonummer eller kontonummer + referens!
    const candidate = trimmed
      .replace(/^(betalning|insättning|insattning|från|fran|till)\s+/i, '')
      .trim();
    const standaloneRegex =
      /^(?:(?:\+?46[\s-]*7[02369]|07[02369])(?:[\s-]?\d){7}|123(?:[\s-]?\d){7})$/;
    if (standaloneRegex.test(candidate)) {
      const digits = candidate.replace(/\D/g, '');
      if (digits.startsWith('467') && digits.length === 11) {
        return '07' + digits.slice(3);
      }
      if ((digits.startsWith('07') || digits.startsWith('123')) && digits.length === 10) {
        return digits;
      }
    }
  }

  return null;
}

/**
 * Avgör säkert om en transaktionstext är en Swish-transaktion.
 * Förhindrar att banköverföringar mellan egna konton (t.ex. SEB konto ...0753 + ref) felaktigt klassas som Swish.
 */
export function isLikelySwishTransactionText(
  text: string | null | undefined,
  rawJson?: any
): boolean {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  if (!lower) return false;

  if (lower.includes('swish')) {
    return true;
  }

  const bankCodeDesc = String(rawJson?.bank_transaction_code?.description || '')
    .trim()
    .toLowerCase();
  if (
    bankCodeDesc === 'transfer' ||
    bankCodeDesc === 'internal transfer' ||
    bankCodeDesc === 'internaltransfer' ||
    bankCodeDesc === 'account transfer'
  ) {
    return false;
  }

  return Boolean(extractSwishPhoneNumber(text, true));
}

export function formatSwishPhone(rawNumber: string): string {
  const digits = rawNumber.replace(/\D/g, '');
  let swedishDigits = digits;
  if (digits.startsWith('467')) {
    swedishDigits = '07' + digits.slice(3);
  }
  if (/^07[02369]\d{7}$/.test(swedishDigits)) {
    return `${swedishDigits.slice(0, 3)}-${swedishDigits.slice(3, 6)} ${swedishDigits.slice(6, 8)} ${swedishDigits.slice(8, 10)}`;
  }
  if (/^123\d{7}$/.test(digits)) {
    return `123-${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  return rawNumber;
}

export function formatSwishTitle(
  description: string | null | undefined,
  counterpartyName: string | null | undefined
): string {
  // 1. Om banken redan har ett separat motpartsnamn som inte bara är "Swish" eller ett telefonnummer
  if (counterpartyName && counterpartyName.trim().length > 0) {
    const cp = counterpartyName.trim();
    const cpPhone = extractSwishPhoneNumber(cp, false);
    if (!/^swish$/i.test(cp) && !cpPhone && !/^[\d\s()-]+$/.test(cp)) {
      return cleanDisplayMerchantName(cp);
    }
  }

  const raw = String(description || '').trim();
  if (!raw) return 'Swish';

  // 2. Extrahera och formatera eventuellt giltigt Swish-telefonnummer (t.ex. 46722162125 -> 072-216 21 25)
  const phoneDigits =
    extractSwishPhoneNumber(`swish ${raw}`, true) ||
    extractSwishPhoneNumber(`swish ${counterpartyName || ''}`, true);
  const formattedPhone = phoneDigits ? formatSwishPhone(phoneDigits) : '';

  // 3. Extrahera personens/företagets namn från typiska svenska Swish-beskrivningar:
  let cleaned = raw
    .replace(/^swish\s*(mottagen|inbetalning|inb\.?|skickad|betalning|från|fran|till)?\s*/i, '')
    .trim();

  // Rensa bort telefonnummer
  cleaned = cleaned
    .replace(/(?:\+?46\s*7[02369]|07[02369]|123)(?:[\s-]?\d){7}/g, '')
    .trim();
  cleaned = cleaned.replace(/^\d+[\s/-]+/, '').trim();

  // Rensa bort allt utom faktiska bokstäver för att kontrollera om ett riktigt namn finns
  const remainingLetters = cleaned.replace(/[^a-zA-ZåäöÅÄÖ]/g, '').trim();

  if (remainingLetters.length >= 2 && !/^swish$/i.test(remainingLetters)) {
    return cleanDisplayMerchantName(cleaned);
  }

  if (formattedPhone) {
    return `Swish (${formattedPhone})`;
  }

  return 'Swish';
}

const KNOWN_MERCHANT_NAMES_MAP: Record<string, string> = {
  systembolaget: 'Systembolaget',
  systembolage: 'Systembolaget',
  systembolag: 'Systembolaget',
  'sys.bolaget': 'Systembolaget',
  sysbolaget: 'Systembolaget',
  öresundskraft: 'Öresundskraft AB',
  oresundskraft: 'Öresundskraft AB',
  'öresundskraft ab': 'Öresundskraft AB',
  'oresundskraft ab': 'Öresundskraft AB',
  pressbyrån: 'Pressbyrån',
  pressbyran: 'Pressbyrån',
  pressbyra: 'Pressbyrån',
  hemköp: 'Hemköp',
  hemkop: 'Hemköp',
  hemko: 'Hemköp',
  willys: 'Willys',
  apotea: 'Apotea',
  apoteket: 'Apoteket',
  'apotek hjärtat': 'Apotek Hjärtat',
  'apotek hjartat': 'Apotek Hjärtat',
  'apoteket hjärtat': 'Apotek Hjärtat',
  'apotek hjart': 'Apotek Hjärtat',
  'apoteket hjar': 'Apotek Hjärtat',
  'kronans apotek': 'Kronans Apotek',
  'kronans apote': 'Kronans Apotek',
  elgiganten: 'Elgiganten',
  netonnet: 'NetOnNet',
  webhallen: 'Webhallen',
  biltema: 'Biltema',
  rusta: 'Rusta',
  jula: 'Jula',
  ikea: 'IKEA',
  'clas ohlson': 'Clas Ohlson',
  'clas ohlso': 'Clas Ohlson',
  'kjell & company': 'Kjell & Company',
  'kjell & co': 'Kjell & Company',
  'kjell o co': 'Kjell & Company',
  stabelo: 'Stabelo',
  sbab: 'SBAB',
  klarna: 'Klarna',
  'klarna bank ab': 'Klarna',
  'klarna bank': 'Klarna',
  'klarna ab': 'Klarna',
  spotify: 'Spotify',
  'spotify ab': 'Spotify',
  netflix: 'Netflix',
  'netflix com': 'Netflix',
  'netflix.com': 'Netflix',
  'apple.com/bill': 'Apple',
  'itunes.com/bill': 'Apple',
  sl: 'SL',
  'ab sl': 'SL',
  västtrafik: 'Västtrafik',
  vasttrafik: 'Västtrafik',
  skånetrafiken: 'Skånetrafiken',
  skanetrafiken: 'Skånetrafiken',
  hallandstrafiken: 'Hallandstrafiken',
  sj: 'SJ',
  'sj ab': 'SJ',
  mcdonalds: "McDonald's",
  'max burgers': 'MAX Burgers',
  'max hamburger': 'MAX Burgers',
  'burger king': 'Burger King',
  'espresso house': 'Espresso House',
  'waynes coffee': 'Wayne’s Coffee',
  foodora: 'Foodora',
  wolt: 'Wolt',
  'circle k': 'Circle K',
  okq8: 'OKQ8',
  preem: 'Preem',
  st1: 'St1',
  ingo: 'INGO',
  easypark: 'EasyPark',
  parkster: 'Parkster',
  'aimo park': 'Aimo Park',
  sats: 'SATS',
  'nordic wellness': 'Nordic Wellness',
  fitness24seven: 'Fitness24Seven',
  'friskis & svettis': 'Friskis & Svettis',
  'friskis och svettis': 'Friskis & Svettis',
  stc: 'STC',
  actic: 'Actic',
  tele2: 'Tele2',
  telia: 'Telia',
  telenor: 'Telenor',
  'tre sverige': 'Tre (3)',
  vimla: 'Vimla',
  hallon: 'Hallon',
  bahnhof: 'Bahnhof',
  halebop: 'Halebop',
  fello: 'Fello',
  comviq: 'Comviq',
  ownit: 'Ownit',
  bredband2: 'Bredband2',
  tibber: 'Tibber',
  vattenfall: 'Vattenfall',
  fortum: 'Fortum',
  ellevio: 'Ellevio',
  'e.on': 'E.ON',
  eon: 'E.ON',
  hedvig: 'Hedvig',
  folksam: 'Folksam',
  länsförsäkringar: 'Länsförsäkringar',
  lansforsakringar: 'Länsförsäkringar',
  'trygg-hansa': 'Trygg-Hansa',
  trygghansa: 'Trygg-Hansa',
  'if skadeförsäkring': 'If Skadeförsäkring',
  'if skadeforsakring': 'If Skadeförsäkring',
  agria: 'Agria Djurförsäkring',
  lassie: 'Lassie',
  'ica banken': 'ICA Banken',
  'ica försäkring': 'ICA Försäkring',
  csn: 'CSN',
  försäkringskassan: 'Försäkringskassan',
  forsakringskassan: 'Försäkringskassan',
  pensionsmyndigheten: 'Pensionsmyndigheten',
  pensionsmynd: 'Pensionsmyndigheten',
  skatteverket: 'Skatteverket',
  transportstyrelsen: 'Transportstyrelsen',
  kronofogden: 'Kronofogden',
  unionen: 'Unionen',
  kommunal: 'Kommunal',
  vision: 'Vision',
  'akademikernas a-kassa': 'Akademikernas a-kassa',
  'alfa-kassan': 'Alfa-kassan',
  alfakassan: 'Alfa-kassan',
};

const CORPORATE_SUFFIXES = new Set([
  'AB',
  'HB',
  'KB',
  'AS',
  'OY',
  'GMBH',
  'LLC',
  'LTD',
  'INC',
  'PLC',
  'PUBL',
]);

const ACRONYM_BRANDS: Record<string, string> = {
  ica: 'ICA',
  coop: 'Coop',
  ikea: 'IKEA',
  csn: 'CSN',
  sl: 'SL',
  sj: 'SJ',
  sats: 'SATS',
  stc: 'STC',
  okq8: 'OKQ8',
  'h&m': 'H&M',
  hm: 'H&M',
  bmw: 'BMW',
  dnb: 'DNB',
  se: 'SE',
};

const LOWERCASE_JOINERS = new Set(['och', 'i', 'på', 'av', 'af', 'von', 'de', 'la', 'the', 'of', 'and']);

const SWEDISH_ASCII_PLACE_AND_WORD_MAP: Record<string, string> = {
  rydeback: 'Rydebäck',
  malmo: 'Malmö',
  goteborg: 'Göteborg',
  vasteras: 'Västerås',
  orebro: 'Örebro',
  linkoping: 'Linköping',
  norrkoping: 'Norrköping',
  jonkoping: 'Jönköping',
  angelholm: 'Ängelholm',
  vala: 'Väla',
  hoor: 'Höör',
  bjarred: 'Bjärred',
  solvesborg: 'Sölvesborg',
  koping: 'Köping',
  nykoping: 'Nyköping',
  enkoping: 'Enköping',
  lidkoping: 'Lidköping',
  falkoping: 'Falköping',
  soderkoping: 'Söderköping',
  umea: 'Umeå',
  lulea: 'Luleå',
  pitea: 'Piteå',
  skelleftea: 'Skellefteå',
  boras: 'Borås',
  gavle: 'Gävle',
  skovde: 'Skövde',
  vaxjo: 'Växjö',
  kalmar: 'Kalmar',
   Kristianstad: 'Kristianstad',
  hassleholm: 'Hässleholm',
  landskrona: 'Landskrona',
  trelleborg: 'Trelleborg',
  hoganas: 'Höganäs',
  bastad: 'Båstad',
  laholm: 'Laholm',
  varberg: 'Varberg',
  kungsbacka: 'Kungsbacka',
  molndal: 'Mölndal',
  partille: 'Partille',
  kungalv: 'Kungälv',
  uddevalla: 'Uddevalla',
  trollhattan: 'Trollhättan',
  vanersborg: 'Vänersborg',
  amal: 'Åmål',
  karlstad: 'Karlstad',
  kristinehamn: 'Kristinehamn',
  eskilstuna: 'Eskilstuna',
  strangnas: 'Strängnäs',
  katrineholm: 'Katrineholm',
  nynashamn: 'Nynäshamn',
  sodertalje: 'Södertälje',
  taby: 'Täby',
  lidingo: 'Lidingö',
  solna: 'Solna',
  sundbyberg: 'Sundbyberg',
  jarfalla: 'Järfälla',
  upplands: 'Upplands',
  vasby: 'Väsby',
  akersberga: 'Åkersberga',
  norrtalje: 'Norrtälje',
  varmdo: 'Värmdö',
  haninge: 'Haninge',
  tyreso: 'Tyresö',
  huddinge: 'Huddinge',
  botkyrka: 'Botkyrka',
  salem: 'Salem',
  ekero: 'Ekerö',
  danderyd: 'Danderyd',
  vallentuna: 'Vallentuna',
  osteraker: 'Österskär',
  ostermalm: 'Östermalm',
  sodermalm: 'Södermalm',
  vasastan: 'Vasastan',
  kungsholmen: 'Kungsholmen',
  bromma: 'Bromma',
  hagersten: 'Hägersten',
  vallingby: 'Vällingby',
  farsta: 'Farsta',
  skarpnack: 'Skarpnäck',
  enskededalen: 'Enskededalen',
  sollentuna: 'Sollentuna',
  frolunda: 'Frölunda',
  hisingen: 'Hisingen',
  limhamn: 'Limhamn',
  hyllie: 'Hyllie',
  jagersro: 'Jägersro',
  mobilia: 'Mobilia',
  emporia: 'Emporia',
  triangeln: 'Triangeln',
  center: 'Center',
};

export function cleanDisplayMerchantName(rawText: string | null | undefined): string {
  let cleaned = String(rawText || '').trim();
  if (!cleaned) return 'Banktransaktion';

  const origLower = cleaned.toLowerCase();
  const isExplicitTransferText =
    origLower.includes('egen överföring') ||
    origLower.includes('egen overforing') ||
    origLower.includes('intern överföring') ||
    origLower.includes('intern overforing') ||
    /^(överföring|overforing|överf\.?|overf\.?)\b/i.test(origLower);

  // 1. Rensa bort tekniska prefix och inledande BG/PG/referensnummer från banker och kortterminaler
  cleaned = cleaned
    .replace(/^(AUTOGIRO|BG|PG|BANKGIRO|PLUSGIRO|KORTKÖP|KORTKOP|BETALNING|RESERVATION|KÖP|INBETALNING|UTBETALNING|ÖVERFÖRING|OVERFORING)\s*[:#-]?\s*(\d[\d\s-]{2,}\s+)?/i, '')
    .replace(/^\d[\d\s-]{4,}\s+/, '') // Rensa bort inledande referensnummer om det följs av text
    .replace(/^[*#._-]+\s*/, '')
    .trim();

  // 2. Rensa bort terminalsuffix som landskod och slutsiffror allra sist på raden
  cleaned = cleaned
    .replace(/\s+(SE|SWE|SWEDEN)$/i, '')
    .replace(/\s+\d{3,}\s*$/, '') // T.ex. " 1421", " 0124" endast allra sist på raden
    .trim();

  if (!cleaned || /^[\d\s*-]+$/.test(cleaned)) {
    return isExplicitTransferText ? 'Överföring' : 'Banktransaktion';
  }

  const lower = cleaned.toLowerCase().trim();

  // 3. Kontrollera mot ordbok ENBART om hela raden exakt motsvarar ett avhugget/kort butiksnamn
  if (KNOWN_MERCHANT_NAMES_MAP[lower]) {
    return KNOWN_MERCHANT_NAMES_MAP[lower];
  }

  // 4. Ta bort avhuggna enbokstavsrester mitt i banksträngar när nästa ord börjar på samma bokstav
  // (t.ex. "HEMKOP HELSINGBORG R RYDEBACK" -> där "R" är slutet på det 20-teckenstrunkerade fältet före ortfältet "RYDEBACK")
  const rawWords = cleaned.split(/\s+/);
  const dedupedWords: string[] = [];
  for (let i = 0; i < rawWords.length; i++) {
    const curr = rawWords[i];
    const next = rawWords[i + 1];
    if (
      i > 0 &&
      curr.length === 1 &&
      /^[a-zA-ZåäöÅÄÖ]$/.test(curr) &&
      next &&
      next.length >= 2 &&
      next.charAt(0).toLowerCase() === curr.toLowerCase()
    ) {
      continue;
    }
    dedupedWords.push(curr);
  }

  // 5. Universell svensk Title Case, ortsnamnsåterställning & bolagsändelser
  const formattedWords = dedupedWords.map((w, idx) => {
    const punctuationMatch = w.match(/^([^a-zA-ZåäöÅÄÖ0-9]*)(.*?)([^a-zA-ZåäöÅÄÖ0-9]*)$/);
    const prefix = punctuationMatch ? punctuationMatch[1] : '';
    const core = punctuationMatch ? punctuationMatch[2] : w;
    const suffix = punctuationMatch ? punctuationMatch[3] : '';

    const coreLower = core.toLowerCase();

    if (ACRONYM_BRANDS[coreLower]) {
      return `${prefix}${ACRONYM_BRANDS[coreLower]}${suffix}`;
    }
    if (SWEDISH_ASCII_PLACE_AND_WORD_MAP[coreLower]) {
      return `${prefix}${SWEDISH_ASCII_PLACE_AND_WORD_MAP[coreLower]}${suffix}`;
    }
    if (KNOWN_MERCHANT_NAMES_MAP[coreLower] && !KNOWN_MERCHANT_NAMES_MAP[coreLower].includes(' ')) {
      return `${prefix}${KNOWN_MERCHANT_NAMES_MAP[coreLower]}${suffix}`;
    }

    if (
      CORPORATE_SUFFIXES.has(coreLower.toUpperCase()) ||
      coreLower === 'ab' ||
      coreLower === 'a.b.' ||
      coreLower === 'a/b'
    ) {
      return `${prefix}AB${suffix}`;
    }

    if (idx > 0 && LOWERCASE_JOINERS.has(coreLower)) {
      return `${prefix}${coreLower}${suffix}`;
    }

    if (core.length > 0) {
      const titleCased = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
      return `${prefix}${titleCased}${suffix}`;
    }

    return w;
  });

  return formattedWords.join(' ');
}

function extractRawJsonFallbackText(rawJson: any): string {
  if (!rawJson || typeof rawJson !== 'object') return '';
  const parts: string[] = [];
  if (typeof rawJson.creditor?.name === 'string') parts.push(rawJson.creditor.name);
  if (typeof rawJson.debtor?.name === 'string') parts.push(rawJson.debtor.name);
  if (typeof rawJson.merchant_name === 'string') parts.push(rawJson.merchant_name);
  if (typeof rawJson.additional_information === 'string') parts.push(rawJson.additional_information);
  if (Array.isArray(rawJson.remittance_information)) {
    for (const item of rawJson.remittance_information) {
      if (typeof item === 'string') parts.push(item);
      else if (item && typeof item.unstructured === 'string') parts.push(item.unstructured);
    }
  } else if (typeof rawJson.remittance_information === 'string') {
    parts.push(rawJson.remittance_information);
  }
  return parts.map((p) => p.trim()).filter(Boolean).join(' ');
}

export function categorizeBankTransactionForApp(
  tx: BankTransactionItem,
  availableCategories: Array<string | { name?: string }> = [],
  _incomeCategories?: Array<string | { name?: string }>
): { merchant: string; category: string; logo?: string } {
  const rawFallback = extractRawJsonFallbackText(tx.raw_json);
  const effectiveDesc =
    tx.description && tx.description.toLowerCase().trim() !== 'banktransaktion'
      ? tx.description
      : rawFallback || tx.description || '';
  const combined = `${effectiveDesc} ${tx.counterparty_name || ''} ${rawFallback}`.toLowerCase();
  const categoryNames = (availableCategories || [])
    .map((c) => (typeof c === 'string' ? c : c?.name || ''))
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);

  const resolveCategory = (preferredList: string[]): string => {
    if (categoryNames.length > 0) {
      for (const pref of preferredList) {
        const prefLower = (pref || '').toLowerCase();
        const exact = categoryNames.find((c) => c.toLowerCase() === prefLower);
        if (exact) return exact;
        const partial = categoryNames.find(
          (c) => c.toLowerCase().includes(prefLower) || prefLower.includes(c.toLowerCase())
        );
        if (partial) return partial;
      }
      const fallbackOther = categoryNames.find(
        (c) => c.toLowerCase().includes('övrigt') || c.toLowerCase().includes('other')
      );
      return fallbackOther || categoryNames[0];
    }
    return preferredList[0] || 'Övrigt';
  };

  if (
    tx.reconciliation_status === 'internal_transfer' ||
    isInternalTransferOrMicroSavings(tx)
  ) {
    return {
      merchant: 'Överföring mellan egna konton',
      category: resolveCategory(['Överföring', 'Övrigt']),
      logo: getLogoUrl('Överföring', 'Överföring'),
    };
  }

  const isSwishTx =
    isLikelySwishTransactionText(effectiveDesc, tx.raw_json) ||
    isLikelySwishTransactionText(tx.counterparty_name, tx.raw_json);

  if (isSwishTx) {
    const swishTitle = formatSwishTitle(effectiveDesc, tx.counterparty_name);
    return {
      merchant: swishTitle,
      category: 'Swish',
      logo: getLogoUrl(swishTitle, 'Swish'),
    };
  }

  // Behåll bankens faktiska butiksnamn (t.ex. "Hemköp Rydebäck") istället för att skriva över det
  const cleanedBankName = cleanDisplayMerchantName(
    tx.counterparty_name || effectiveDesc || 'Kortköp'
  );
  const hasReadableBankName =
    cleanedBankName &&
    cleanedBankName !== 'Banktransaktion' &&
    cleanedBankName !== 'Kortköp';

  // Kontrollera användarens sparade merchant-alias / regler först (Merchant Memory)
  const userAlias =
    resolveMerchantAlias(cleanedBankName) ||
    resolveMerchantAlias(tx.counterparty_name || '') ||
    resolveMerchantAlias(effectiveDesc);
  if (userAlias) {
    const resolvedCat = resolveCategory([userAlias.category]);
    return {
      merchant: userAlias.name,
      category: resolvedCat,
      logo: getLogoUrl(userAlias.name, resolvedCat),
    };
  }

  for (const rule of EVERYDAY_MERCHANT_RULES) {
    if (rule.keywords.some((kw) => combined.includes(kw))) {
      const category = resolveCategory(rule.preferredCategories);
      const displayMerchant = hasReadableBankName ? cleanedBankName : rule.cleanName;
      return {
        merchant: displayMerchant,
        category,
        logo: getLogoUrl(rule.cleanName, category) || getLogoUrl(displayMerchant, category),
      };
    }
  }

  for (const rule of EXTENDED_FIXED_EXPENSE_RULES) {
    if (rule.keywords.some((kw) => combined.includes(kw.toLowerCase()))) {
      const preset = rule.presetId
        ? SWEDISH_EXPENSE_PRESETS.find((p) => p.id === rule.presetId)
        : undefined;
      const fallbackDisplay = preset?.name || rule.fallbackName;
      const displayName = hasReadableBankName ? cleanedBankName : fallbackDisplay;
      const category = resolveCategory([preset?.category || rule.category]);
      return {
        merchant: displayName,
        category,
        logo: getLogoUrl(fallbackDisplay, category) || getLogoUrl(displayName, category),
      };
    }
  }

  const category = resolveCategory(['Övrigt']);
  return {
    merchant: cleanedBankName,
    category,
    logo: getLogoUrl(cleanedBankName, category),
  };
}

const AI_SKIP_GENERIC_PLACEHOLDERS = new Set([
  'banktransaktion',
  'kortköp',
  'kortkop',
  'betalning',
  'autogiro',
  'bankgiro',
  'plusgiro',
  'bg',
  'pg',
  'insättning',
  'insattning',
  'utgift',
  'inkomst',
  'köp',
  'kop',
  'reserverat',
  'reservation',
  'överföring',
  'overforing',
  'okänd',
  'okand',
  'övrigt',
  'ovrigt',
]);

/**
 * Avgör om en banktransaktion innehåller kryptiska kortterminalprefix
 * (t.ex. ZETTLE*GBG KAF, NYX*SVENSKA, SUMUP*..., KLARNA*84920).
 * Vanliga läsbara bankrader (t.ex. "Hemköp Rydebäck") ska ALDRIG skrivas om av AI!
 */
export function needsAiMerchantCleaning(
  rawText: string | null | undefined,
  currentTitle?: string | null,
  currentCategory?: string | null
): boolean {
  const rawTrimmed = (rawText || '').trim();
  const titleTrimmed = (currentTitle || '').trim();
  const combined = `${rawTrimmed} ${titleTrimmed}`.trim();
  if (!combined || combined.length < 2) return false;
  const lower = combined.toLowerCase();

  const rawLower = rawTrimmed.toLowerCase();
  const titleLower = titleTrimmed.toLowerCase();
  if (
    (!rawLower || AI_SKIP_GENERIC_PLACEHOLDERS.has(rawLower) || /^[\d\s*-]+$/.test(rawLower)) &&
    (!titleLower || AI_SKIP_GENERIC_PLACEHOLDERS.has(titleLower) || /^[\d\s*-]+$/.test(titleLower))
  ) {
    return false;
  }

  if (
    isLikelySwishTransactionText(lower) ||
    currentCategory === 'Swish'
  ) {
    return false;
  }

  // Trigger ENBART på kryptiska betalväxelprefix med asterisk/brädgård (t.ex. ZETTLE*, NYX*, SUMUP*, STRIPE*, KLARNA*84920)
  const hasCrypticTerminalPattern =
    /\b(zettle|izettle|iz|sumup|nyx|stripe|sq|sp|wl|bambora|nets|adyen|qck|billo|klarna)\s*[*#]/i.test(
      combined
    ) || /[a-zA-Z0-9]\*[a-zA-Z0-9]/.test(combined);

  return hasCrypticTerminalPattern;
}

function getDayOfMonthFromIso(dateStr: string | null | undefined, fallbackDay = 27): number {
  if (!dateStr) return fallbackDay;
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const day = parseInt(parts[2], 10);
    if (day >= 1 && day <= 31) return day;
  }
  return fallbackDay;
}

/**
 * Räknar ut den faktiska återkommande dragnings-/utbetalningsdagen i månaden (1–31)
 * utifrån samtliga observerade datum i transaktionshistoriken.
 * Tar hänsyn till om en enskild dragning flyttats p.g.a. helg (t.ex. fredag före helg-25:e
 * eller måndag efter helg-förfallodag), men tvingar ALDRIG en inkomst (såsom A-kassa den 22:a)
 * till den 25:e om transaktionerna faktiskt sker på en annan dag.
 */
export function inferTrueRecurringDayOfMonth(
  datesIso: string[],
  kind: 'expense' | 'income',
  category: string,
  name: string,
  fallbackDay = 25
): number {
  const validDates = Array.from(new Set(datesIso.filter(Boolean))).sort((a, b) =>
    b.localeCompare(a)
  );
  if (validDates.length === 0) return fallbackDay;

  interface ParsedObs {
    iso: string;
    year: number;
    month: number;
    day: number;
    dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    daysInMonth: number;
  }

  const parsed: ParsedObs[] = [];
  for (const d of validDates) {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const dt = new Date(year, month - 1, day, 12, 0, 0);
    const daysInMonth = new Date(year, month, 0).getDate();
    parsed.push({
      iso: d,
      year,
      month,
      day,
      dayOfWeek: dt.getDay(),
      daysInMonth,
    });
  }

  if (parsed.length === 0) return fallbackDay;

  const rawDaysSet = new Set(parsed.map((p) => p.day));
  const lowerName = (name || '').toLowerCase();
  const lowerCat = (category || '').toLowerCase();
  const isAkassaOrBenefit =
    lowerName.includes('kassa') ||
    lowerName.includes('unionen') ||
    lowerName.includes('ersättning') ||
    lowerCat === 'ersättning' ||
    lowerName.includes('försäkringskassan');

  const adjustedDays = parsed.map((obs) => {
    const d = obs.day;

    if (kind === 'income') {
      // Om en utbetalning skedde på en fredag (dayOfWeek === 5):
      // Kontrollera om lördag (d+1) eller söndag (d+2) är den faktiska dagen under andra månader
      if (obs.dayOfWeek === 5) {
        if (rawDaysSet.has(d + 1)) {
          return d + 1;
        }
        if (rawDaysSet.has(d + 2)) {
          return d + 2;
        }
        // Endast om det är vanlig Lön eller CSN (EJ A-kassa!) och fredagen inföll den 23:e eller 24:e
        // (vilket innebär att den 25:e var lördag eller söndag) och ingen vardagsutbetalning skett på 23/24:
        if (
          !isAkassaOrBenefit &&
          (lowerCat === 'lön' || lowerCat === 'csn') &&
          (d === 23 || d === 24) &&
          !parsed.some((other) => other.day === d && other.dayOfWeek !== 5)
        ) {
          return 25;
        }
        if (
          lowerName.includes('barnbidrag') &&
          (d === 18 || d === 19) &&
          !parsed.some((other) => other.day === d && other.dayOfWeek !== 5)
        ) {
          return 20;
        }
      }
      return d;
    } else {
      // För utgifter (autogiro/bankgiro/kort):
      // Om en dragning skedde på en måndag (dayOfWeek === 1), kolla om söndagen (d-1) eller lördagen (d-2)
      // finns som dragningsdag en annan månad
      if (obs.dayOfWeek === 1) {
        if (d > 1 && rawDaysSet.has(d - 1)) return d - 1;
        if (d > 2 && rawDaysSet.has(d - 2)) return d - 2;
      }
      // Om en dragning skedde på en fredag (dayOfWeek === 5), kolla om lördagen (d+1) eller söndagen (d+2)
      // finns som dragningsdag en annan månad
      if (obs.dayOfWeek === 5) {
        if (rawDaysSet.has(d + 1)) return d + 1;
        if (rawDaysSet.has(d + 2)) return d + 2;
      }
      // Om februari-dragning skedde på sista dagen i februari (28/29) men andra månader drogs 30 eller 31:
      if (obs.month === 2 && d >= 27) {
        if (rawDaysSet.has(30)) return 30;
        if (rawDaysSet.has(31)) return 31;
      }
      return d;
    }
  });

  // Räkna ut vanligaste dagen (mode) bland alla observerade (och helgjusterade) månader
  const counts = new Map<number, number>();
  for (const d of adjustedDays) {
    counts.set(d, (counts.get(d) || 0) + 1);
  }

  let bestDay = adjustedDays[0];
  let bestCount = 0;
  for (const [dayVal, count] of counts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestDay = dayVal;
    }
  }

  // Om alla dagar bara förekommit 1 gång men ligger tätt (t.ex. [23, 22]), välj den lägsta/typiska i klustret eller senaste
  return bestDay;
}

function getYearMonthKey(dateStr: string | null | undefined): string {
  if (!dateStr) return 'unknown';
  return dateStr.slice(0, 7); // YYYY-MM
}

function inferFrequencyFromDates(datesIso: string[]): Frequency {
  const validDates = Array.from(new Set(datesIso.filter(Boolean))).sort((a, b) =>
    b.localeCompare(a)
  );
  if (validDates.length < 2) return Frequency.MONTHLY;

  const gapsDays: number[] = [];
  for (let i = 0; i < validDates.length - 1; i++) {
    const d1 = Date.parse(`${validDates[i]}T12:00:00`);
    const d2 = Date.parse(`${validDates[i + 1]}T12:00:00`);
    if (Number.isFinite(d1) && Number.isFinite(d2)) {
      gapsDays.push(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
    }
  }
  if (gapsDays.length === 0) return Frequency.MONTHLY;

  const avgGap = gapsDays.reduce((a, b) => a + b, 0) / gapsDays.length;
  if (avgGap >= 300) return Frequency.ANNUALLY;
  if (avgGap >= 150 && avgGap < 300) return Frequency.SEMI_ANNUALLY;
  if (avgGap >= 70 && avgGap < 150) return Frequency.QUARTERLY;
  return Frequency.MONTHLY;
}

function buildEvidenceSummary(
  occurrences: number,
  dates: string[],
  amounts: number[],
  frequency: Frequency,
  isVariable?: boolean
): string {
  const latestDate = dates[0] || '';
  const uniqueAmounts = Array.from(new Set(amounts.map((a) => Math.round(a))));
  const amountLabel =
    uniqueAmounts.length > 1
      ? `${Math.min(...uniqueAmounts)}–${Math.max(...uniqueAmounts)} kr (rörligt)`
      : `${uniqueAmounts[0] || 0} kr`;
  const freqLabel = frequency || Frequency.MONTHLY;
  return `${occurrences} ${occurrences === 1 ? 'betalning' : 'betalningar'}${
    latestDate ? ` (senast ${latestDate})` : ''
  } · ${amountLabel} · ${freqLabel}${isVariable && uniqueAmounts.length <= 1 ? ' (rörlig)' : ''}`;
}

// ---------------------------------------------------------------------------
// 4. CORE HISTORICAL ANALYZER (USED IN BOTH ONBOARDING & SETTINGS SYNC)
// ---------------------------------------------------------------------------

function getBankTxCodeDescription(tx: BankTransactionItem): string {
  const rawJson = tx.raw_json && typeof tx.raw_json === 'object' ? tx.raw_json : null;
  return String(rawJson?.bank_transaction_code?.description || '').trim().toLowerCase();
}

function runCoreBankDetection(
  transactions: BankTransactionItem[],
  currentPayday = 25,
  paydayBeforeWeekend = true,
  userAccounts: BankAccount[] = []
) {
  // Only analyze booked transactions (or transactions without status); reserved holds are not proof of recurring agreements
  const bookedOrDefault = transactions.filter(
    (t) => t.booking_status !== 'PDNG' && t.booking_status !== 'HOLD'
  );

  // Deduplicate identical transactions on the same date (e.g. if the same bank account was synced across multiple connections)
  const seenTxSigs = new Set<string>();
  const deduplicated: BankTransactionItem[] = [];
  for (const t of bookedOrDefault) {
    const date = t.booking_date || t.transaction_date || t.value_date || '';
    const amtCents = Math.round(getNormalizedBankTxAmount(t) * 100);
    const descKey = String(t.description || t.counterparty_name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    const sig = `${date}|${amtCents}|${descKey}`;
    if (seenTxSigs.has(sig)) continue;
    seenTxSigs.add(sig);
    deduplicated.push(t);
  }

  // Sort newest first
  const sorted = [...deduplicated].sort((a, b) => {
    const dA = a.booking_date || a.transaction_date || a.value_date || '';
    const dB = b.booking_date || b.transaction_date || b.value_date || '';
    return dB.localeCompare(dA);
  });

  const internalTransferIds = findRawBankInternalTransferIds(sorted, userAccounts);

  const outflows = sorted.filter(
    (t) =>
      !internalTransferIds.has(t.id) &&
      (t.currency || 'SEK') === 'SEK' &&
      getNormalizedBankTxAmount(t) < 0
  );
  const inflows = sorted.filter(
    (t) =>
      !internalTransferIds.has(t.id) &&
      (t.currency || 'SEK') === 'SEK' &&
      getNormalizedBankTxAmount(t) > 0
  );

  type RawFixedGroup = Omit<FixedExpense, 'id'> & {
    detectedOccurrences: number;
    lastDate?: string;
    matchedTxIds: Set<string>;
    dates: string[];
    amounts: number[];
    hasExplicitAutogiroOrInvoice: boolean;
    requireMultipleMonthsForCard?: boolean;
  };

  const candidateFixedMap = new Map<string, RawFixedGroup>();

  // Layer 1: Collect matches against known Swedish fixed expense & subscription rules
  for (const tx of outflows) {
    const absAmount = Math.round(Math.abs(getNormalizedBankTxAmount(tx)));
    if (absAmount <= 0 || absAmount > 60000) continue;

    const combinedText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    const bankTxCode = getBankTxCodeDescription(tx);

    // Skip if it's an everyday grocery/restaurant merchant
    if (VARIABLE_SPENDING_EXCLUSIONS.some((ex) => combinedText.includes(ex))) {
      continue;
    }

    let matchedRule: KeywordRule | null = null;
    for (const rule of EXTENDED_FIXED_EXPENSE_RULES) {
      if (rule.keywords.some((kw) => combinedText.includes(kw.toLowerCase()))) {
        matchedRule = rule;
        break;
      }
    }

    if (matchedRule) {
      const preset: SwedishExpensePreset | undefined = matchedRule.presetId
        ? SWEDISH_EXPENSE_PRESETS.find((p) => p.id === matchedRule!.presetId)
        : undefined;

      const isGenericHousingPreset = matchedRule.presetId === 'hyra-bostad';
      const isAppleBillingRule =
        matchedRule.fallbackName === 'Apple / iCloud' ||
        matchedRule.keywords.includes('apple.com/bill');
      const cleanedRawName = cleanDisplayMerchantName(
        tx.counterparty_name || tx.description || ''
      );
      const baseDisplayName =
        isGenericHousingPreset && cleanedRawName.length >= 3
          ? `Hyra (${cleanedRawName})`
          : isAppleBillingRule
          ? absAmount === 12 || absAmount === 39 || absAmount === 129
            ? 'Apple / iCloud+'
            : 'Apple-abonnemang'
          : preset?.name || matchedRule.fallbackName;

      const displayName = baseDisplayName;

      const baseKey = isGenericHousingPreset
        ? `housing_${normalizeMerchantKey(cleanedRawName)}`
        : matchedRule.presetId || matchedRule.fallbackName.toLowerCase();

      const key = matchedRule.splitByExactAmount ? `${baseKey}_${absAmount}` : baseKey;

      const txDate = tx.booking_date || tx.transaction_date || tx.value_date || undefined;
      const deductionDay = getDayOfMonthFromIso(txDate, preset?.deductionDay || 27);
      const category = preset?.category || matchedRule.category;
      const isDirectDebit = bankTxCode === 'direct debit' || combinedText.includes('autogiro');
      const isGiroPayment =
        bankTxCode === 'payment' ||
        combinedText.includes('bankgiro') ||
        combinedText.includes('plusgiro');

      const paymentMethod = isDirectDebit
        ? 'Autogiro'
        : isGiroPayment
        ? 'Bankgiro'
        : preset?.paymentMethod || matchedRule.paymentMethod;

      const STANDARD_APPLE_GOOGLE_SUB_TIERS = new Set([
        9, 10, 12, 15, 19, 20, 25, 29, 30, 35, 39, 45, 49, 55, 59, 65, 69, 75, 79, 85, 89, 95, 99,
        105, 109, 115, 119, 125, 129, 135, 139, 145, 149, 155, 159, 165, 169, 175, 179, 185, 189,
        195, 199, 209, 219, 229, 239, 249, 259, 269, 279, 289, 299, 319, 329, 349, 359, 379, 399,
        449, 499,
      ]);
      const isStandardSubTier =
        matchedRule.requireMultipleMonthsForCard && STANDARD_APPLE_GOOGLE_SUB_TIERS.has(absAmount);

      const hasExplicitAutogiroOrInvoice =
        (!matchedRule.requireMultipleMonthsForCard || isStandardSubTier) &&
        (isDirectDebit ||
          isGiroPayment ||
          combinedText.includes('hyra') ||
          combinedText.includes('hyresavi') ||
          combinedText.includes('bolån') ||
          combinedText.includes('csn') ||
          paymentMethod === 'Autogiro' ||
          paymentMethod === 'Bankgiro' ||
          category === 'Boende' ||
          category === 'Försäkringar' ||
          category === 'Streaming' ||
          category === 'Abonnemang' ||
          category === 'Hälsa' ||
          category === 'Räkningar');

      const existing = candidateFixedMap.get(key);
      if (!existing) {
        candidateFixedMap.set(key, {
          name: displayName,
          amount: absAmount,
          category,
          frequency: Frequency.MONTHLY,
          deductionDay,
          paymentMethod,
          logo: getLogoUrl(baseDisplayName, category),
          detectedOccurrences: 1,
          lastDate: txDate,
          matchedTxIds: new Set([tx.id]),
          dates: txDate ? [txDate] : [],
          amounts: [absAmount],
          hasExplicitAutogiroOrInvoice,
          requireMultipleMonthsForCard:
            matchedRule.requireMultipleMonthsForCard && !isStandardSubTier,
        });
      } else {
        existing.detectedOccurrences += 1;
        existing.matchedTxIds.add(tx.id);
        if (txDate) existing.dates.push(txDate);
        existing.amounts.push(absAmount);
        if (hasExplicitAutogiroOrInvoice) {
          existing.hasExplicitAutogiroOrInvoice = true;
        }
      }
    }
  }

  // Filter candidateFixedMap: require >= 2 occurrences across distinct months/dates OR known subscription/autogiro/bankgiro/housing/insurance agreement
  const detectedFixedMap = new Map<string, DetectedFixedExpenseWithEvidence & { matchedTxIds: Set<string> }>();
  const fixedTransactionIds = new Set<string>();

  for (const [key, cand] of candidateFixedMap.entries()) {
    const distinctDates = Array.from(new Set(cand.dates));
    const distinctMonths = new Set(cand.dates.map((d) => getYearMonthKey(d)));
    distinctMonths.delete('unknown');

    const isConfirmedRecurring = cand.requireMultipleMonthsForCard
      ? distinctMonths.size >= 2
      : distinctMonths.size >= 2 ||
        distinctDates.length >= 2 ||
        cand.hasExplicitAutogiroOrInvoice;

    if (!isConfirmedRecurring) {
      continue;
    }

    for (const txId of cand.matchedTxIds) {
      fixedTransactionIds.add(txId);
    }

    const frequency = inferFrequencyFromDates(cand.dates);
    const trueDeductionDay = inferTrueRecurringDayOfMonth(
      cand.dates,
      'expense',
      cand.category,
      cand.name,
      cand.deductionDay || 27
    );
    const minAmt = Math.min(...cand.amounts);
    const maxAmt = Math.max(...cand.amounts);
    const candNameLower = String(cand.name || '').toLowerCase();
    const isUtilityVariable =
      candNameLower.includes('el') ||
      candNameLower.includes('öresund') ||
      candNameLower.includes('oresund') ||
      candNameLower.includes('tibber') ||
      candNameLower.includes('vattenfall') ||
      candNameLower.includes('fortum') ||
      candNameLower.includes('trängselskatt');
    const isVariable =
      isUtilityVariable || (cand.amounts.length >= 2 && (maxAmt - minAmt) / (minAmt || 1) > 0.05);

    const evidenceSummary = buildEvidenceSummary(
      cand.detectedOccurrences,
      cand.dates,
      cand.amounts,
      frequency,
      isVariable
    );

    detectedFixedMap.set(key, {
      name: cand.name,
      amount: cand.amount,
      category: cand.category,
      frequency,
      deductionDay: trueDeductionDay,
      paymentMethod: cand.paymentMethod,
      isVariable,
      logo: cand.logo,
      detectedOccurrences: cand.detectedOccurrences,
      lastDate: cand.lastDate,
      evidenceDates: cand.dates.slice(0, 6),
      evidenceAmounts: cand.amounts.slice(0, 6),
      evidenceSummary,
      matchedTxIds: cand.matchedTxIds,
    });
  }

  // Layer 2: Detect recurring charges across multiple months/quarters not covered by Layer 1
  const merchantGroups = new Map<string, BankTransactionItem[]>();
  for (const tx of outflows) {
    if (fixedTransactionIds.has(tx.id)) continue;

    const absAmount = Math.round(Math.abs(getNormalizedBankTxAmount(tx)));
    if (absAmount < 25 || absAmount > 50000) continue;

    const combinedText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    if (VARIABLE_SPENDING_EXCLUSIONS.some((ex) => combinedText.includes(ex))) {
      continue;
    }
    if (
      (combinedText.includes('swish') ||
        combinedText.includes('överföring') ||
        combinedText.includes('overforing')) &&
      !combinedText.includes('autogiro')
    ) {
      continue;
    }

    const normKey = normalizeMerchantKey(tx.counterparty_name || tx.description || '');
    if (!normKey || normKey.length < 3) continue;

    const list = merchantGroups.get(normKey) || [];
    list.push(tx);
    merchantGroups.set(normKey, list);
  }

  for (const [normKey, groupTxs] of merchantGroups.entries()) {
    const distinctMonths = new Set(
      groupTxs.map((t) => getYearMonthKey(t.booking_date || t.transaction_date || t.value_date))
    );
    distinctMonths.delete('unknown');

    const latestTx = groupTxs[0];
    const latestAmount = Math.round(Math.abs(getNormalizedBankTxAmount(latestTx)));
    const combinedText = `${latestTx.description || ''} ${latestTx.counterparty_name || ''}`.toLowerCase();
    const bankTxCode = getBankTxCodeDescription(latestTx);

    const hasExplicitAutogiroKeyword =
      bankTxCode === 'direct debit' ||
      combinedText.includes('autogiro') ||
      combinedText.includes('bankgiro') ||
      combinedText.includes('plusgiro') ||
      combinedText.includes('hyresavi') ||
      combinedText.includes('förskola') ||
      combinedText.includes('forskola');

    const consistentCount = groupTxs.filter((t) => {
      const amt = Math.abs(getNormalizedBankTxAmount(t));
      const ratio = amt / (latestAmount || 1);
      return ratio >= 0.65 && ratio <= 1.35;
    }).length;

    // Require >= 2 distinct months (and at most ~1 charge per month) OR explicit autogiro/bankgiro
    const isRecurring =
      (distinctMonths.size >= 2 &&
        consistentCount >= 2 &&
        groupTxs.length <= distinctMonths.size * 1.5) ||
      (hasExplicitAutogiroKeyword && latestAmount >= 49);

    if (isRecurring) {
      const displayName = cleanDisplayMerchantName(
        latestTx.counterparty_name || latestTx.description || normKey
      );
      const txDate =
        latestTx.booking_date || latestTx.transaction_date || latestTx.value_date || undefined;
      const deductionDay = getDayOfMonthFromIso(txDate, 27);

      let category = 'Räkningar';
      if (latestAmount >= 3500 && deductionDay >= 24) {
        category = 'Boende';
      } else if (latestAmount <= 350) {
        category = 'Abonnemang';
      }

      const matchedIds = new Set<string>();
      const dates: string[] = [];
      const amounts: number[] = [];
      for (const t of groupTxs) {
        fixedTransactionIds.add(t.id);
        matchedIds.add(t.id);
        const d = t.booking_date || t.transaction_date || t.value_date;
        if (d) dates.push(d);
        amounts.push(Math.round(Math.abs(getNormalizedBankTxAmount(t))));
      }

      const frequency = inferFrequencyFromDates(dates);
      const trueDeductionDay = inferTrueRecurringDayOfMonth(
        dates,
        'expense',
        category,
        displayName,
        deductionDay
      );
      const minAmt = Math.min(...amounts);
      const maxAmt = Math.max(...amounts);
      const isVariable = amounts.length >= 2 && (maxAmt - minAmt) / (minAmt || 1) > 0.05;
      const occurrencesCount = distinctMonths.size || groupTxs.length;

      detectedFixedMap.set(`recurring_${normKey}`, {
        name: displayName,
        amount: latestAmount,
        category,
        frequency,
        deductionDay: trueDeductionDay,
        paymentMethod: hasExplicitAutogiroKeyword ? 'Autogiro' : 'Kort',
        isVariable,
        logo: getLogoUrl(displayName, category),
        detectedOccurrences: occurrencesCount,
        lastDate: txDate,
        evidenceDates: dates.slice(0, 6),
        evidenceAmounts: amounts.slice(0, 6),
        evidenceSummary: buildEvidenceSummary(
          occurrencesCount,
          dates,
          amounts,
          frequency,
          isVariable
        ),
        matchedTxIds: matchedIds,
      });
    }
  }

  // Layer 3: Detect Monthly Salary / Recurring Incomes & Payday
  // Requirement 4: "Överföringar och återbetalningar får inte automatiskt bli lön."
  const detectedIncomes: DetectedIncomeWithEvidence[] = [];
  let suggestedPayday: number | null = null;

  const REFUND_OR_TRANSFER_EXCLUSIONS = [
    'överföring',
    'overforing',
    'egna konton',
    'sparkonto',
    'enkla vardagen',
    'enkla sparkontot',
    'swish',
    'återköp',
    'aterkop',
    'retur',
    'refund',
    'kreditering',
    'återbetalning',
    'aterbetalning',
    'tillgodo',
    'apotea',
    'apoteket',
    'ica ',
    'coop ',
    'willys',
    'hemköp',
    'lidl',
    'ikea',
    'h&m',
    'zara',
    'elgiganten',
    'klarna',
    'apple.com',
    'zalando',
    'boozt',
  ];

  const validIncomeInflows = inflows.filter((tx) => {
    const amt = getNormalizedBankTxAmount(tx);
    if (amt < 1000) return false;
    const bankCode = getBankTxCodeDescription(tx);
    if (
      bankCode === 'transfer' ||
      bankCode === 'internal transfer' ||
      bankCode === 'account transfer' ||
      bankCode === 'instant payment'
    ) {
      return false;
    }
    if (isInternalTransferOrMicroSavings(tx, userAccounts)) {
      return false;
    }
    const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    if (REFUND_OR_TRANSFER_EXCLUSIONS.some((kw) => text.includes(kw))) {
      return false;
    }
    if (VARIABLE_SPENDING_EXCLUSIONS.some((kw) => text.includes(kw))) {
      return false;
    }
    return true;
  });

  // Group inflows by normalized source to get occurrence evidence
  const incomeGroups = new Map<
    string,
    {
      name: string;
      category: string;
      isPrimarySalary: boolean;
      txs: BankTransactionItem[];
      dates: string[];
      amounts: number[];
    }
  >();

  for (const tx of validIncomeInflows) {
    const amt = Math.round(getNormalizedBankTxAmount(tx));
    const rawText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    const bankTxCode = getBankTxCodeDescription(tx);

    const isBankCodeIncome =
      bankTxCode.includes('salary') ||
      bankTxCode.includes('pension') ||
      bankTxCode.includes('social benefit');
    const isExplicitSalary =
      rawText.includes('lön') ||
      rawText.includes('lon ') ||
      rawText.includes('salary') ||
      rawText.includes('löneutbetalning') ||
      rawText.includes('loneutbetalning') ||
      rawText.includes('arvode');
    const isCsn =
      rawText.includes('csn') ||
      rawText.includes('studiestöd') ||
      rawText.includes('studiestod') ||
      rawText.includes('centrala studiestödsnämnden');
    const isFk =
      rawText.includes('försäkringskassan') ||
      rawText.includes('forsakringskassan') ||
      rawText.includes('fkassa') ||
      rawText.includes('föräldrapenning') ||
      rawText.includes('foraldrapenning') ||
      rawText.includes('sjukpenning') ||
      rawText.includes('bostadsbidrag') ||
      rawText.includes('aktivitetsstöd') ||
      rawText.includes('aktivitetsersättning') ||
      rawText.includes('sjukersättning') ||
      rawText.includes('underhållsstöd');
    const isBarnbidrag = rawText.includes('barnbidrag');
    const isPension =
      rawText.includes('pension') ||
      rawText.includes('pensionsmyndigheten') ||
      rawText.includes('alecta') ||
      rawText.includes('amf ') ||
      rawText.includes('min pension') ||
      rawText.includes('kåpan') ||
      rawText.includes('spv ');
    const isAkassa =
      rawText.includes('a-kassa') ||
      rawText.includes('a kassa') ||
      rawText.includes('akassa') ||
      rawText.includes('arbetslöshetsersättning') ||
      rawText.includes('arbetsloshetsersattning') ||
      rawText.includes('alfakassan') ||
      rawText.includes('alfa-kassan') ||
      rawText.includes('unionen') ||
      rawText.includes('akademikernas') ||
      rawText.includes('småa') ||
      rawText.includes('smaa');
    const isUtbetalning = rawText.includes('utbetalning');

    if (
      !isExplicitSalary &&
      !isCsn &&
      !isFk &&
      !isBarnbidrag &&
      !isPension &&
      !isAkassa &&
      !isBankCodeIncome &&
      !isUtbetalning &&
      amt < 5000
    ) {
      continue;
    }

    let groupKey = 'salary';
    let incomeName = 'Lön';
    let incomeCategory = 'Lön';
    let isPrimarySalary = isExplicitSalary || isBankCodeIncome;

    if (isBarnbidrag) {
      groupKey = 'barnbidrag';
      incomeName = 'Barnbidrag';
      incomeCategory = 'Bidrag';
      isPrimarySalary = false;
    } else if (isCsn) {
      groupKey = 'csn';
      incomeName = 'CSN';
      incomeCategory = 'CSN';
      isPrimarySalary = false;
    } else if (isFk) {
      groupKey = 'fk';
      incomeName = 'Försäkringskassan';
      incomeCategory = 'Bidrag';
      isPrimarySalary = false;
    } else if (isAkassa) {
      groupKey = 'akassa';
      const cleanAcc = tx.counterparty_name ? cleanDisplayMerchantName(tx.counterparty_name) : 'A-kassa';
      incomeName =
        cleanAcc.toLowerCase().includes('kassa') || cleanAcc.toLowerCase().includes('unionen')
          ? cleanAcc
          : 'A-kassa';
      incomeCategory = 'Ersättning';
      isPrimarySalary = true;
    } else if (isPension) {
      groupKey = 'pension';
      incomeName = 'Pension';
      incomeCategory = 'Pension';
      isPrimarySalary = true;
    } else if (tx.counterparty_name) {
      const cleanEmp = cleanDisplayMerchantName(tx.counterparty_name);
      groupKey = `salary_${normalizeMerchantKey(cleanEmp)}`;
      incomeName = isExplicitSalary ? `Lön (${cleanEmp})` : cleanEmp || 'Lön';
      isPrimarySalary = isExplicitSalary || amt >= 10000;
    } else {
      const cleanDesc = cleanDisplayMerchantName(tx.description || '');
      if (
        cleanDesc &&
        cleanDesc.toLowerCase() !== 'lön' &&
        cleanDesc.toLowerCase() !== 'insättning' &&
        cleanDesc.toLowerCase() !== 'utbetalning'
      ) {
        groupKey = `income_${normalizeMerchantKey(cleanDesc)}`;
        incomeName = isExplicitSalary ? `Lön (${cleanDesc})` : cleanDesc;
      }
      isPrimarySalary = isExplicitSalary || amt >= 10000;
    }

    const txDate = tx.booking_date || tx.transaction_date || tx.value_date || '';
    const existing = incomeGroups.get(groupKey);
    if (!existing) {
      incomeGroups.set(groupKey, {
        name: incomeName,
        category: incomeCategory,
        isPrimarySalary,
        txs: [tx],
        dates: txDate ? [txDate] : [],
        amounts: [amt],
      });
    } else {
      existing.txs.push(tx);
      if (txDate) existing.dates.push(txDate);
      existing.amounts.push(amt);
    }
  }

  for (const grp of incomeGroups.values()) {
    const firstText = `${grp.txs[0].description || ''} ${grp.txs[0].counterparty_name || ''}`.toLowerCase();
    const firstBankCode = getBankTxCodeDescription(grp.txs[0]);
    const hasExplicitIncomeKeyword =
      firstText.includes('lön') ||
      firstText.includes('lon ') ||
      firstText.includes('salary') ||
      firstText.includes('löneutbetalning') ||
      firstText.includes('loneutbetalning') ||
      firstText.includes('utbetalning') ||
      firstText.includes('arvode') ||
      firstText.includes('csn') ||
      firstText.includes('studiestöd') ||
      firstText.includes('studiestod') ||
      firstText.includes('försäkringskassan') ||
      firstText.includes('forsakringskassan') ||
      firstText.includes('fkassa') ||
      firstText.includes('föräldrapenning') ||
      firstText.includes('foraldrapenning') ||
      firstText.includes('sjukpenning') ||
      firstText.includes('bostadsbidrag') ||
      firstText.includes('aktivitetsstöd') ||
      firstText.includes('barnbidrag') ||
      firstText.includes('pension') ||
      firstText.includes('a-kassa') ||
      firstText.includes('a kassa') ||
      firstText.includes('akassa') ||
      firstText.includes('alfakassan') ||
      firstText.includes('alfa-kassan') ||
      firstText.includes('unionen') ||
      firstText.includes('akademikernas') ||
      firstText.includes('småa') ||
      firstText.includes('smaa') ||
      firstText.includes('arbetslös') ||
      firstBankCode.includes('salary') ||
      firstBankCode.includes('pension') ||
      firstBankCode.includes('social benefit');

    const distinctMonths = new Set(
      grp.dates.map((d) => (d ? d.slice(0, 7) : '')).filter(Boolean)
    ).size;

    if (!hasExplicitIncomeKeyword) {
      if (distinctMonths < 2) continue;
      if (isLikelyPersonFullName(grp.name)) continue;
    }

    const latestAmount = grp.amounts[0];
    const latestDate = grp.dates[0];
    const fallbackDay = getDayOfMonthFromIso(latestDate, 25);

    const normalizedDay = inferTrueRecurringDayOfMonth(
      grp.dates,
      'income',
      grp.category,
      grp.name,
      fallbackDay
    );

    if (grp.isPrimarySalary && suggestedPayday === null) {
      suggestedPayday = normalizedDay;
    }

    const minAmt = Math.min(...grp.amounts);
    const maxAmt = Math.max(...grp.amounts);
    const isVariable =
      grp.amounts.length >= 2 && (maxAmt - minAmt) / (minAmt || 1) > 0.05;

    detectedIncomes.push({
      name: grp.name,
      amount: latestAmount,
      category: grp.category,
      deductionDay: normalizedDay,
      isVariable,
      icon: 'Wallet',
      logo: getLogoUrl(grp.name, grp.category),
      detectedOccurrences: grp.txs.length,
      lastDate: latestDate,
      evidenceDates: grp.dates.slice(0, 6),
      evidenceAmounts: grp.amounts.slice(0, 6),
      evidenceSummary: buildEvidenceSummary(
        grp.txs.length,
        grp.dates,
        grp.amounts,
        Frequency.MONTHLY,
        isVariable
      ),
    });
  }

  // Sort detected incomes so primary salary / largest income comes first
  detectedIncomes.sort((a, b) => b.amount - a.amount);

  if (suggestedPayday === null && detectedIncomes.length > 0) {
    suggestedPayday = detectedIncomes[0].deductionDay || 25;
  }

  // Layer 4: Period Boundaries & Variable Spending
  const effectivePayday = suggestedPayday || currentPayday || 25;
  const paydayType =
    effectivePayday === 25
      ? PaydayType.TWENTY_FIFTH
      : effectivePayday === 1
      ? PaydayType.FIRST_DAY
      : PaydayType.CUSTOM;
  const adjustment = paydayBeforeWeekend
    ? WeekendAdjustment.BEFORE
    : WeekendAdjustment.NONE;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { start } = getPeriodBoundaries(today, paydayType, effectivePayday, adjustment);
  const periodStartIso = start.toISOString().split('T')[0];

  const detectedFixedExpenses = Array.from(detectedFixedMap.values())
    .map(({ matchedTxIds: _ignore, ...rest }) => rest)
    .sort((a, b) => b.amount - a.amount);

  return {
    outflows,
    inflows,
    internalTransferIds,
    fixedTransactionIds,
    detectedFixedExpenses,
    detectedIncomes,
    suggestedPayday,
    periodStartIso,
  };
}

export function analyzeBankTransactionsForOnboarding(
  transactions: BankTransactionItem[],
  currentPayday = 25,
  paydayBeforeWeekend = true,
  userAccounts: BankAccount[] = []
): AnalyzedBankOnboardingData {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      detectedFixedExpenses: [],
      detectedIncomes: [],
      suggestedPayday: null,
      calculatedSpentSincePayday: 0,
      analyzedTransactionCount: 0,
    };
  }

  const core = runCoreBankDetection(
    transactions,
    currentPayday,
    paydayBeforeWeekend,
    userAccounts
  );

  let calculatedSpentSincePayday = 0;
  for (const tx of core.outflows) {
    if (core.fixedTransactionIds.has(tx.id)) continue;
    const txDate = tx.booking_date || tx.transaction_date || tx.value_date || '';
    if (txDate >= core.periodStartIso) {
      calculatedSpentSincePayday += Math.abs(getNormalizedBankTxAmount(tx));
    }
  }

  return {
    detectedFixedExpenses: core.detectedFixedExpenses,
    detectedIncomes: core.detectedIncomes,
    suggestedPayday: core.suggestedPayday,
    calculatedSpentSincePayday: Math.round(calculatedSpentSincePayday),
    analyzedTransactionCount: transactions.length,
  };
}

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

function formatDateWithWeekday(isoDate: string): string {
  const m = (isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return isoDate;
  const dt = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${m[1]}-${m[2]}-${m[3]} (${days[dt.getDay()] || ''})`;
}

/**
 * Sammanställer kandidater (både regeldetekterade och 1-dragningars/okända kandidater)
 * med exakta datum och veckodagar för AI-verifiering i onboardingen.
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
  const baseAnalysis = analyzeBankTransactionsForOnboarding(
    transactions,
    currentPayday,
    paydayBeforeWeekend,
    userAccounts
  );

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      baseAnalysis,
      expenseCandidates: [],
      incomeCandidates: [],
    };
  }

  const core = runCoreBankDetection(
    transactions,
    currentPayday,
    paydayBeforeWeekend,
    userAccounts
  );

  const expenseCandidates: OnboardingAiCandidateGroup[] = [];

  // 1. Alla regeldetekterade fasta utgifter
  core.detectedFixedExpenses.forEach((det, idx) => {
    const rawDates = det.evidenceDates || (det.lastDate ? [det.lastDate] : []);
    expenseCandidates.push({
      key: `det_exp_${idx}`,
      name: det.name,
      rawSample: det.name,
      category: det.category || 'Räkningar',
      paymentMethod: det.paymentMethod || 'Autogiro',
      latestAmount: Math.round(det.amount),
      amounts: (det.evidenceAmounts || [det.amount]).map((a) => Math.round(a)),
      datesWithWeekday: rawDates.map(formatDateWithWeekday),
      rawDates,
      occurrences: det.detectedOccurrences || rawDates.length || 1,
      ruleDay: det.deductionDay || 27,
      isRuleDetected: true,
    });
  });

  // 2. Okända / nystartade utgiftskandidater (t.ex. 1 dragning på nytt abonnemang, gym, el, försäkring, bredband, BRF)
  // Filtrera bort uppenbara vardagsköp (matbutiker, restauranger, kaféer, Swish till privatpersoner, frekventa småköp)
  const unmatchedByNorm = new Map<string, BankTransactionItem[]>();
  for (const tx of core.outflows) {
    if (core.fixedTransactionIds.has(tx.id)) continue;
    const absAmt = Math.round(Math.abs(getNormalizedBankTxAmount(tx)));
    if (absAmt < 19 || absAmt > 50000) continue;

    const combinedText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    if (VARIABLE_SPENDING_EXCLUSIONS.some((ex) => combinedText.includes(ex))) continue;
    if (
      /(kafé|kafe|cafe|coffee|bageri|konditori|restaurang|pizza|sushi|burger|krog|bar |pub |lunch|kiosk|automat|parkster|easypark|aimo| Uber |bolt|voi |tier |ryde |taxi|swish|7-eleven|pressbyr)/.test(
        combinedText
      ) &&
      !combinedText.includes('autogiro') &&
      !combinedText.includes('månad')
    ) {
      continue;
    }

    const normKey = normalizeMerchantKey(tx.counterparty_name || tx.description || '');
    if (!normKey || normKey.length < 3) continue;
    const arr = unmatchedByNorm.get(normKey) || [];
    arr.push(tx);
    unmatchedByNorm.set(normKey, arr);
  }

  let unmatchedExpIdx = 0;
  for (const [normKey, groupTxs] of unmatchedByNorm.entries()) {
    if (unmatchedExpIdx >= 30) break;
    // Om man handlat på samma ställe mer än 4 gånger på 90 dagar utan att det matchat månadsmönster är det vardagskonsumtion
    const distinctMonths = new Set(
      groupTxs.map((t) => getYearMonthKey(t.booking_date || t.transaction_date || t.value_date))
    );
    distinctMonths.delete('unknown');
    if (groupTxs.length > Math.max(3, distinctMonths.size * 1.5)) continue;

    const latestTx = groupTxs[0];
    const latestAmt = Math.round(Math.abs(getNormalizedBankTxAmount(latestTx)));
    const rawSample = `${latestTx.counterparty_name || ''} ${latestTx.description || ''}`.trim();
    const displayName = cleanDisplayMerchantName(
      latestTx.counterparty_name || latestTx.description || normKey
    );
    const rawDates = groupTxs
      .map((t) => t.booking_date || t.transaction_date || t.value_date || '')
      .filter(Boolean)
      .slice(0, 6);
    const amounts = groupTxs
      .map((t) => Math.round(Math.abs(getNormalizedBankTxAmount(t))))
      .slice(0, 6);
    const bankTxCode = getBankTxCodeDescription(latestTx);
    const isDirectDebit =
      bankTxCode === 'direct debit' || rawSample.toLowerCase().includes('autogiro');
    const isGiro =
      bankTxCode === 'payment' ||
      rawSample.toLowerCase().includes('bankgiro') ||
      rawSample.toLowerCase().includes('plusgiro');
    const paymentMethod = isDirectDebit ? 'Autogiro' : isGiro ? 'Bankgiro' : 'Kort';
    const ruleDay = inferTrueRecurringDayOfMonth(
      rawDates,
      'expense',
      'Abonnemang',
      displayName,
      getDayOfMonthFromIso(rawDates[0], 27)
    );

    expenseCandidates.push({
      key: `cand_exp_${unmatchedExpIdx++}`,
      name: displayName,
      rawSample,
      category: paymentMethod === 'Kort' ? 'Abonnemang' : 'Räkningar',
      paymentMethod,
      latestAmount: latestAmt,
      amounts,
      datesWithWeekday: rawDates.map(formatDateWithWeekday),
      rawDates,
      occurrences: groupTxs.length,
      ruleDay,
      isRuleDetected: false,
    });
  }

  // 3. Alla regeldetekterade inkomster + eventuella oupptäckta inkomstkandidater >= 1500 kr
  const incomeCandidates: OnboardingAiCandidateGroup[] = [];
  const coveredInflowNames = new Set<string>();

  core.detectedIncomes.forEach((inc, idx) => {
    const rawDates = inc.evidenceDates || (inc.lastDate ? [inc.lastDate] : []);
    coveredInflowNames.add(normalizeMerchantKey(inc.name));
    incomeCandidates.push({
      key: `det_inc_${idx}`,
      name: inc.name,
      rawSample: inc.name,
      category: inc.category || 'Lön',
      latestAmount: Math.round(inc.amount),
      amounts: (inc.evidenceAmounts || [inc.amount]).map((a) => Math.round(a)),
      datesWithWeekday: rawDates.map(formatDateWithWeekday),
      rawDates,
      occurrences: inc.detectedOccurrences || rawDates.length || 1,
      ruleDay: inc.deductionDay || 25,
      isRuleDetected: true,
    });
  });

  const unmatchedInflowsByNorm = new Map<string, BankTransactionItem[]>();
  for (const tx of core.inflows) {
    const amt = Math.round(getNormalizedBankTxAmount(tx));
    if (amt < 1500) continue;
    const bankCode = getBankTxCodeDescription(tx);
    if (
      bankCode === 'transfer' ||
      bankCode === 'internal transfer' ||
      bankCode === 'account transfer' ||
      bankCode === 'instant payment'
    ) {
      continue;
    }
    if (isInternalTransferOrMicroSavings(tx, userAccounts)) continue;
    const rawText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    if (
      /(överföring|overforing|egna konton|sparkonto|swish|återköp|aterkop|retur|refund|kreditering|återbetalning|aterbetalning)/.test(
        rawText
      )
    ) {
      continue;
    }
    const normKey = normalizeMerchantKey(tx.counterparty_name || tx.description || '');
    if (!normKey || coveredInflowNames.has(normKey)) continue;
    if (isLikelyPersonFullName(normKey)) continue;
    const arr = unmatchedInflowsByNorm.get(normKey) || [];
    arr.push(tx);
    unmatchedInflowsByNorm.set(normKey, arr);
  }

  let unmatchedIncIdx = 0;
  for (const [normKey, groupTxs] of unmatchedInflowsByNorm.entries()) {
    if (unmatchedIncIdx >= 12) break;
    const latestTx = groupTxs[0];
    const latestAmt = Math.round(getNormalizedBankTxAmount(latestTx));
    const rawSample = `${latestTx.counterparty_name || ''} ${latestTx.description || ''}`.trim();
    const displayName = cleanDisplayMerchantName(
      latestTx.counterparty_name || latestTx.description || normKey
    );
    if (isLikelyPersonFullName(displayName)) continue;
    const rawDates = groupTxs
      .map((t) => t.booking_date || t.transaction_date || t.value_date || '')
      .filter(Boolean)
      .slice(0, 6);
    const amounts = groupTxs.map((t) => Math.round(getNormalizedBankTxAmount(t))).slice(0, 6);
    const ruleDay = inferTrueRecurringDayOfMonth(
      rawDates,
      'income',
      'Lön',
      displayName,
      getDayOfMonthFromIso(rawDates[0], 25)
    );

    incomeCandidates.push({
      key: `cand_inc_${unmatchedIncIdx++}`,
      name: displayName,
      rawSample,
      category: 'Lön',
      latestAmount: latestAmt,
      amounts,
      datesWithWeekday: rawDates.map(formatDateWithWeekday),
      rawDates,
      occurrences: groupTxs.length,
      ruleDay,
      isRuleDetected: false,
    });
  }

  return {
    baseAnalysis,
    expenseCandidates,
    incomeCandidates,
  };
}

// ---------------------------------------------------------------------------
// 5. SMART MERGE ANALYZER FOR EXISTING USERS (SETTINGS -> BANKKOPPLING)
// ---------------------------------------------------------------------------

function isSameFixedExpenseName(nameA: string | null | undefined, nameB: string | null | undefined): boolean {
  const a = String(nameA || '').toLowerCase().trim();
  const b = String(nameB || '').toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (
    (a.includes('hyra') || a.includes('boende') || a.includes('fastighet')) &&
    (b.includes('hyra') || b.includes('boende') || b.includes('fastighet'))
  ) {
    return true;
  }
  return false;
}

export function analyzeBankForExistingBudget(params: {
  bankTransactions: BankTransactionItem[];
  userAccounts?: BankAccount[];
  existingFixedExpenses: FixedExpense[];
  existingIncomes: Income[];
  existingAppTransactions: Transaction[];
  config: Config;
}): ExistingBudgetBankSyncPlan {
  const {
    bankTransactions,
    userAccounts = [],
    existingFixedExpenses = [],
    existingIncomes = [],
    existingAppTransactions = [],
    config,
  } = params;

  const currentPayday = config.payday || 25;
  const paydayBeforeWeekend =
    config.paydayBeforeWeekend !== undefined ? config.paydayBeforeWeekend : true;
  const availableCategories = (config.categories || []).map((c) => c.name);

  if (!Array.isArray(bankTransactions) || bankTransactions.length === 0) {
    return {
      periodStartIso: new Date().toISOString().split('T')[0],
      periodPurchases: [],
      skippedFixedInPeriodCount: 0,
      skippedInternalTransfersCount: 0,
      fixedExpenseMatches: [],
      incomeMatches: [],
      analyzedTransactionCount: 0,
    };
  }

  const core = runCoreBankDetection(
    bankTransactions,
    currentPayday,
    paydayBeforeWeekend,
    userAccounts
  );

  const activeExistingFixed = existingFixedExpenses.filter((e) => !e.isCancelled);
  const cancelledExistingFixed = existingFixedExpenses.filter((e) => Boolean(e.isCancelled));

  const matchesExistingUserFixed = (tx: BankTransactionItem): boolean => {
    const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    for (const fixed of activeExistingFixed) {
      const fixedName = String(fixed.name || '').toLowerCase().trim();
      if (fixedName.length >= 3 && text.includes(fixedName)) return true;
      const cleanedFixed = fixedName.replace(/^hyra\s*\(|\)$/g, '').trim();
      if (cleanedFixed.length >= 3 && text.includes(cleanedFixed)) return true;
    }
    return false;
  };

  // 1. Compare Detected Fixed Expenses against Existing Fixed Expenses
  // Requirement 5: "Historiska förslag får inte återaktivera uppsagda abonnemang eller ersätta användarens befintliga avtal."
  const fixedExpenseMatches: ExistingBudgetFixedExpenseMatch[] = [];

  core.detectedFixedExpenses.forEach((det, idx) => {
    // Never suggest or reactivate a subscription that the user has marked as cancelled!
    const matchesCancelled = cancelledExistingFixed.some((canc) =>
      isSameFixedExpenseName(canc.name, det.name)
    );
    if (matchesCancelled) {
      return;
    }

    const matchedExisting = activeExistingFixed.find(
      (ex) =>
        isSameFixedExpenseName(ex.name, det.name) ||
        (ex.category === det.category &&
          det.amount >= 2000 &&
          Math.abs(ex.amount - det.amount) <= 300)
    );

    if (!matchedExisting) {
      fixedExpenseMatches.push({
        id: `fixed_match_${idx}_${det.name}`,
        detected: det,
        status: 'new',
      });
      return;
    }

    const diff = Math.abs(Number(matchedExisting.amount) - Number(det.amount));
    if (diff >= 5) {
      fixedExpenseMatches.push({
        id: `fixed_match_${idx}_${det.name}`,
        detected: det,
        status: 'amount_changed',
        existingExpense: matchedExisting,
      });
      return;
    }

    fixedExpenseMatches.push({
      id: `fixed_match_${idx}_${det.name}`,
      detected: det,
      status: 'already_exists',
      existingExpense: matchedExisting,
    });
  });

  // 2. Compare Detected Incomes against Existing Incomes
  const incomeMatches: ExistingBudgetIncomeMatch[] = core.detectedIncomes.map((det, idx) => {
    const matchedInc = existingIncomes.find(
      (inc) =>
        String(inc.name || '').toLowerCase().includes('lön') ||
        String(inc.category || '').toLowerCase() === String(det.category || '').toLowerCase() ||
        String(inc.name || '').toLowerCase() === String(det.name || '').toLowerCase()
    );

    if (!matchedInc) {
      return {
        id: `inc_match_${idx}`,
        detected: det,
        status: 'new',
      };
    }

    const diff = Math.abs(Number(matchedInc.amount) - Number(det.amount));
    if (diff >= 50) {
      return {
        id: `inc_match_${idx}`,
        detected: det,
        status: 'amount_changed',
        existingIncome: matchedInc,
      };
    }

    return {
      id: `inc_match_${idx}`,
      detected: det,
      status: 'already_exists',
      existingIncome: matchedInc,
    };
  });

  // 3. Collect Variable Everyday Purchases in the Current Pay Period
  const periodPurchases: PeriodBankPurchaseCandidate[] = [];
  let skippedFixedInPeriodCount = 0;
  let skippedInternalTransfersCount = 0;

  for (const tx of bankTransactions) {
    //Requirement 8: Reserved purchases (PDNG / HOLD) do NOT affect ordinary budget in v1
    if (tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD') {
      continue;
    }

    const txDate = tx.booking_date || tx.transaction_date || tx.value_date || '';
    if (!txDate || txDate < core.periodStartIso) continue;

    if (core.internalTransferIds.has(tx.id)) {
      skippedInternalTransfersCount++;
      continue;
    }

    const signedAmt = getNormalizedBankTxAmount(tx);
    if (signedAmt >= 0) continue; // Only outgoing purchases

    if (core.fixedTransactionIds.has(tx.id) || matchesExistingUserFixed(tx)) {
      skippedFixedInPeriodCount++;
      continue;
    }

    const absAmount = Math.round(Math.abs(signedAmt) * 100) / 100;
    if (absAmount <= 0) continue;

    const categorized = categorizeBankTransactionForApp(tx, availableCategories);
    const parsedDateMs = Date.parse(`${txDate}T12:00:00`);
    const timestamp = Number.isFinite(parsedDateMs) ? parsedDateMs : Date.now();

    const alreadyInApp = existingAppTransactions.some((appTx) => {
      if (appTx.bankTransactionId === tx.id) return true;
      if (Array.isArray(appTx.tags)) {
        if (
          appTx.tags.includes(`bank_tx:${tx.id}`) ||
          appTx.tags.includes(`bank_key:${tx.external_key}`)
        ) {
          return true;
        }
      }
      const sameAmount = Math.abs(Number(appTx.amount) - absAmount) < 1;
      const dayDiff = Math.abs(Number(appTx.timestamp) - timestamp) / (1000 * 60 * 60 * 24);
      return sameAmount && dayDiff <= 2.5;
    });

    periodPurchases.push({
      bankTxId: tx.id,
      externalKey: tx.external_key,
      merchant: categorized.merchant,
      rawDescription: tx.description,
      amount: absAmount,
      dateIso: txDate,
      timestamp,
      category: categorized.category,
      logo: categorized.logo,
      isReserved: false,
      alreadyInApp,
    });
  }

  return {
    periodStartIso: core.periodStartIso,
    periodPurchases,
    skippedFixedInPeriodCount,
    skippedInternalTransfersCount,
    fixedExpenseMatches,
    incomeMatches,
    analyzedTransactionCount: bankTransactions.length,
  };
}

/**
 * Returns all booked variable bank transactions (across all periods in bank history)
 * that should be automatically imported into the app's main `transactions` table
 * so they appear in Hem, Historik, Analys, and Budget without duplicating fixed expenses or internal transfers.
 */
export function getAutoImportableBankTransactions(
  paramsOrTxs:
    | {
        bankTransactions: BankTransactionItem[];
        userAccounts?: BankAccount[];
        existingFixedExpenses: FixedExpense[];
        existingIncomes?: Income[];
        existingAppTransactions: Transaction[];
        config?: Config | null;
        dismissedBankTxIds?: Set<string> | string[];
      }
    | BankTransactionItem[],
  posUserAccounts?: BankAccount[],
  posExistingFixedExpenses?: FixedExpense[],
  posExistingAppTransactions?: Transaction[],
  posConfig?: Config | null,
  posDismissedBankTxIds?: Set<string> | string[]
): Array<Omit<Transaction, 'id'>> {
  const isArrayArg = Array.isArray(paramsOrTxs);
  const bankTransactions = isArrayArg ? paramsOrTxs : paramsOrTxs?.bankTransactions || [];
  const userAccounts = isArrayArg ? posUserAccounts || [] : paramsOrTxs?.userAccounts || [];
  const existingFixedExpenses = isArrayArg
    ? posExistingFixedExpenses || []
    : paramsOrTxs?.existingFixedExpenses || [];
  const existingAppTransactions = isArrayArg
    ? posExistingAppTransactions || []
    : paramsOrTxs?.existingAppTransactions || [];
  const config = isArrayArg ? posConfig : paramsOrTxs?.config;
  const rawDismissed = isArrayArg ? posDismissedBankTxIds : paramsOrTxs?.dismissedBankTxIds;
  const dismissedSet =
    rawDismissed instanceof Set
      ? rawDismissed
      : Array.isArray(rawDismissed)
      ? new Set(rawDismissed)
      : new Set<string>();

  if (!Array.isArray(bankTransactions) || bankTransactions.length === 0) {
    return [];
  }

  const currentPayday = config?.payday || 25;
  const paydayBeforeWeekend =
    config?.paydayBeforeWeekend !== undefined ? config.paydayBeforeWeekend : true;
  const availableCategories = (config?.categories || []).map((c: any) =>
    typeof c === 'string' ? c : c?.name || ''
  );

  // Filter to selected budget accounts if userAccounts is non-empty
  const allowedAccountIds = new Set(
    userAccounts
      .filter((a) => a.is_selected && a.include_in_budget !== false)
      .map((a) => a.id)
  );

  const rawRelevantBankTxs =
    allowedAccountIds.size > 0
      ? bankTransactions.filter((t) => allowedAccountIds.has(t.bank_account_id))
      : bankTransactions;

  // Sort BOOK transactions before PDNG/HOLD so booked transactions take precedence over reservations
  const relevantBankTxs = [...rawRelevantBankTxs].sort((a, b) => {
    const aBook = a.booking_status === 'BOOK' ? 0 : 1;
    const bBook = b.booking_status === 'BOOK' ? 0 : 1;
    if (aBook !== bBook) return aBook - bBook;
    const dA = a.booking_date || a.transaction_date || a.value_date || '';
    const dB = b.booking_date || b.transaction_date || b.value_date || '';
    return dB.localeCompare(dA);
  });

  const core = runCoreBankDetection(
    relevantBankTxs,
    currentPayday,
    paydayBeforeWeekend,
    userAccounts
  );

  const activeExistingFixed = existingFixedExpenses.filter((e) => !e.isCancelled);

  const matchesExistingUserFixed = (tx: BankTransactionItem): boolean => {
    const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    for (const fixed of activeExistingFixed) {
      const fixedName = String(fixed.name || '').toLowerCase().trim();
      if (fixedName.length >= 3 && text.includes(fixedName)) return true;
      const cleanedFixed = fixedName.replace(/^hyra\s*\(|\)$/g, '').trim();
      if (cleanedFixed.length >= 3 && text.includes(cleanedFixed)) return true;
    }
    return false;
  };

  const toImport: Array<Omit<Transaction, 'id'>> = [];
  const seenKeysInBatch = new Set<string>();

  for (const tx of relevantBankTxs) {
    if (
      tx.booking_status === 'CNCL' ||
      tx.booking_status === 'RJCT'
    ) {
      continue;
    }

    if (
      tx.reconciliation_status === 'excluded' ||
      tx.reconciliation_status === 'internal_transfer' ||
      tx.reconciliation_status === 'confirmed_fixed_expense' ||
      tx.reconciliation_status === 'confirmed_income' ||
      tx.reconciliation_status === 'confirmed_saving' ||
      tx.reconciliation_status === 'reserved_replaced'
    ) {
      continue;
    }

    if (
      dismissedSet.has(tx.id) ||
      (tx.external_key && dismissedSet.has(tx.external_key))
    ) {
      continue;
    }

    if (seenKeysInBatch.has(tx.id) || (tx.external_key && seenKeysInBatch.has(tx.external_key))) {
      continue;
    }

    if (core.internalTransferIds.has(tx.id)) {
      continue;
    }

    // Skip large monthly credit card / collector invoices so they don't double-count card purchases
    if (isLikelyCreditCardInvoiceBankTx(tx)) {
      continue;
    }

    const { signedSekAmount: signedAmt, absSekAmount: absAmount, originalCurrency, originalAmount } =
      resolveBankTxSekAmount(tx);
    const isMerchantRefund = signedAmt > 0 && isLikelyMerchantRefundBankTx(tx);

    // Only auto-import outgoing variable purchases or verified store refunds
    if (signedAmt >= 0 && !isMerchantRefund) {
      continue;
    }

    if (!isMerchantRefund && (core.fixedTransactionIds.has(tx.id) || matchesExistingUserFixed(tx))) {
      continue;
    }

    if (absAmount <= 0) continue;

    const { paymentDate } = getActualBankPaymentDateAndMeta(tx);
    const txDate = paymentDate;
    const parsedDateMs = txDate ? Date.parse(`${txDate}T12:00:00`) : NaN;
    const timestamp = Number.isFinite(parsedDateMs) ? parsedDateMs : Date.now();

    const categorized = categorizeBankTransactionForApp(tx, availableCategories);
    const isReserved = tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD';

    // Om detta är en aktiv reservation (PDNG/HOLD), hoppa ENDAST över den om en bokförd (BOOK)
    // transaktion i samma batch har exakt samma transaction_id eller entry_reference.
    if (isReserved && (tx.transaction_id || tx.entry_reference)) {
      const hasExactSameRefInBatch = relevantBankTxs.some(
        (other) =>
          other.id !== tx.id &&
          other.booking_status === 'BOOK' &&
          ((tx.transaction_id && other.transaction_id === tx.transaction_id) ||
            (tx.entry_reference && other.entry_reference === tx.entry_reference))
      );
      if (hasExactSameRefInBatch) {
        continue;
      }
    }

    const alreadyInApp = existingAppTransactions.some((appTx) => {
      if (appTx.bankTransactionId === tx.id) return true;
      const hasBankTag =
        Array.isArray(appTx.tags) && appTx.tags.some((t) => t.startsWith('bank_tx:'));
      if (Array.isArray(appTx.tags)) {
        if (
          appTx.tags.includes(`bank_tx:${tx.id}`) ||
          (tx.external_key && appTx.tags.includes(`bank_key:${tx.external_key}`))
        ) {
          return true;
        }
      }
      // Om appTx redan är en annan banktransaktion (har eget bankTransactionId / bank_tx-tagg),
      // är det ett separat köp från banken och får ALDRIG dubblettfiltreras bort på bara belopp/butik!
      if (appTx.bankTransactionId || hasBankTag) {
        return false;
      }
      // Matcha endast mot manuellt inlagda transaktioner (som saknar bankTransactionId) på samma dag, belopp och butik
      const sameAmount = Math.abs(Math.abs(Number(appTx.amount)) - absAmount) < 0.5;
      const dayDiff = Math.abs(Number(appTx.timestamp) - timestamp) / (1000 * 60 * 60 * 24);
      const sameMerchant =
        String(appTx.merchant || '').toLowerCase().trim() ===
        String(categorized.merchant || '').toLowerCase().trim();
      return sameAmount && dayDiff <= 1.5 && sameMerchant;
    });

    if (alreadyInApp) {
      continue;
    }

    seenKeysInBatch.add(tx.id);
    if (tx.external_key) seenKeysInBatch.add(tx.external_key);

    const tags = [`bank_tx:${tx.id}`];
    if (tx.external_key) tags.push(`bank_key:${tx.external_key}`);
    if (tx.bank_account_id) tags.push(`bank_acc:${tx.bank_account_id}`);
    if (isMerchantRefund) tags.push('bank_refund');

    toImport.push({
      amount: isMerchantRefund ? -absAmount : absAmount,
      type: 'expense',
      category: categorized.category,
      merchant: categorized.merchant,
      note: tx.description || categorized.merchant,
      timestamp,
      isBackdated: false,
      logo: categorized.logo,
      paymentMethod: 'Kortbetalning',
      tags,
      bankTransactionId: tx.id,
      bankAccountId: tx.bank_account_id,
      originalBankDescription: tx.description,
      originalBankAmount: originalCurrency !== 'SEK' ? originalAmount : signedAmt,
      originalBankCurrency: originalCurrency,
    });
  }

  return toImport;
}

function normalizePaymentMethodName(rawMethod: string | undefined): string | undefined {
  if (!rawMethod) return undefined;
  const stored = getStoredPaymentMethods().map((m) => m.name);
  if (stored.includes(rawMethod)) return rawMethod;
  const lower = rawMethod.toLowerCase();
  if (lower.includes('bankgiro') || lower.includes('plusgiro')) {
    const bgMatch = stored.find(
      (m) => m.toLowerCase().includes('bankgiro') || m.toLowerCase().includes('plusgiro')
    );
    return bgMatch || 'Bankgiro / Plusgiro';
  }
  if (lower.includes('autogiro')) {
    return stored.find((m) => m.toLowerCase().includes('autogiro')) || 'Autogiro';
  }
  if (lower.includes('kort')) {
    return stored.find((m) => m.toLowerCase().includes('kort')) || 'Kort';
  }
  if (lower.includes('e-faktura') || lower.includes('efaktura')) {
    return stored.find((m) => m.toLowerCase().includes('e-faktura')) || 'E-faktura';
  }
  if (lower.includes('faktura')) {
    return stored.find((m) => m.toLowerCase() === 'faktura') || 'Faktura';
  }
  if (lower.includes('swish')) {
    return stored.find((m) => m.toLowerCase().includes('swish')) || 'Swish';
  }
  return rawMethod;
}

function matchesKeywordSmart(text: string, kw: string): boolean {
  const cleanKw = kw.toLowerCase();
  const trimmedKw = cleanKw.trim();
  if (!trimmedKw) return false;
  if (cleanKw.endsWith(' ')) {
    const padded = ` ${text} `;
    return padded.includes(` ${trimmedKw} `) || text === trimmedKw || text.startsWith(cleanKw);
  }
  // For very short 2-3 char keywords like "sl", "el", "dn", "vy", "ul", require word boundary
  if (trimmedKw.length <= 3 && /^[a-zåäö0-9]+$/i.test(trimmedKw)) {
    const escaped = trimmedKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-zåäö0-9])${escaped}($|[^a-zåäö0-9])`, 'i').test(text);
  }
  return text.includes(trimmedKw);
}

/**
 * Automatically infers category, payment method, and logo when a user manually types
 * a merchant or item name (e.g. "Riksbyggen", "Netflix", "A-kassa", "SATS", "ICA").
 */
export function inferCategoryAndMethodFromName(
  rawName: string,
  kind: 'fixed' | 'income' | 'transaction'
): {
  category?: string;
  paymentMethod?: string;
  logo?: string;
} | null {
  try {
    const trimmed = (rawName || '').trim();
    if (trimmed.length < 2) return null;

    const text = trimmed.toLowerCase();
    const categoryKind = kind === 'income' ? 'income' : 'expense';

    // 1. Check user's custom merchant aliases first
    const alias = resolveMerchantAlias(trimmed);
    if (alias?.category) {
      return {
        category: normalizeCategoryToValid(alias.category, categoryKind),
        logo: getLogoUrl(alias.name || trimmed),
      };
    }

    // 2. Income rules
    if (kind === 'income') {
      if (
        [
          'barnbidrag',
          'försäkringskassan',
          'forsakringskassan',
          'fkassa',
          'föräldrapenning',
          'foraldrapenning',
          'sjukpenning',
          'bostadsbidrag',
          'aktivitetsstöd',
          'aktivitetsersättning',
          'sjukersättning',
          'underhållsstöd',
          'csn',
          'studiestöd',
          'studiestod',
          'studiemedel',
          'bidrag',
          'a-kassa',
          'a kassa',
          'akassa',
          'alfakassan',
          'alfa-kassan',
          'unionen',
          'akademikernas',
          'småa',
          'smaa',
          'arbetslöshetsersättning',
          'ersättning',
        ].some((kw) => matchesKeywordSmart(text, kw))
      ) {
        return {
          category: normalizeCategoryToValid('Bidrag', 'income'),
          logo: getLogoUrl(trimmed),
        };
      }

      if (
        [
          'pension',
          'pensionsmyndigheten',
          'alecta',
          'amf',
          'kåpan',
          'min pension',
          'tjänstepension',
          'spv',
        ].some((kw) => matchesKeywordSmart(text, kw))
      ) {
        return {
          category: normalizeCategoryToValid('Pension', 'income'),
          logo: getLogoUrl(trimmed),
        };
      }

      if (matchesKeywordSmart(text, 'swish')) {
        return {
          category: normalizeCategoryToValid('Swish', 'income'),
          paymentMethod: 'Swish',
          logo: getLogoUrl(trimmed),
        };
      }

      if (
        ['lön', 'lon', 'salary', 'arvode', 'löneutbetalning', 'bonus', 'timlön'].some((kw) =>
          matchesKeywordSmart(text, kw)
        )
      ) {
        return {
          category: normalizeCategoryToValid('Lön', 'income'),
          logo: getLogoUrl(trimmed),
        };
      }

      return null;
    }

    // 3. Check EXTENDED_FIXED_EXPENSE_RULES (Riksbyggen, Netflix, Spotify, Tibber, Hedvig, Tele2, SATS, A-kassa, etc.)
    for (const rule of EXTENDED_FIXED_EXPENSE_RULES) {
      if (rule.keywords.some((kw) => matchesKeywordSmart(text, kw))) {
        return {
          category: normalizeCategoryToValid(rule.category, 'expense'),
          paymentMethod: normalizePaymentMethodName(rule.paymentMethod),
          logo: getLogoUrl(rule.fallbackName || trimmed),
        };
      }
    }

    // 4. Check SWEDISH_EXPENSE_PRESETS
    for (const preset of SWEDISH_EXPENSE_PRESETS) {
      const presetNameLower = preset.name.toLowerCase();
      if (
        presetNameLower === text ||
        (text.length >= 3 && matchesKeywordSmart(text, presetNameLower))
      ) {
        return {
          category: normalizeCategoryToValid(preset.category, 'expense'),
          paymentMethod: normalizePaymentMethodName(preset.paymentMethod),
          logo: getLogoUrl(preset.name),
        };
      }
    }

    // 5. Check EVERYDAY_MERCHANT_RULES (ICA, Coop, Willys, Systembolaget, Foodora, Circle K, Apotea, IKEA, etc.)
    for (const merch of EVERYDAY_MERCHANT_RULES) {
      if (
        merch.cleanName.toLowerCase() === text ||
        merch.keywords.some((kw) => matchesKeywordSmart(text, kw))
      ) {
        return {
          category: normalizeCategoryToValid(merch.preferredCategories[0] || 'Övrigt', 'expense'),
          paymentMethod: kind === 'transaction' ? 'Kort' : undefined,
          logo: getLogoUrl(merch.cleanName),
        };
      }
    }

  // 6. Broad Swedish category keyword fallback for manual names
  const manualKeywordGroups: Array<{
    keywords: string[];
    category: string;
    paymentMethod?: string;
  }> = [
    {
      keywords: [
        'riksbyggen',
        'hsb',
        'brf',
        'sbc',
        'bostadsrätt',
        'bostadsratt',
        'hyra',
        'avgift',
        'månadsavgift',
        'manadsavgift',
        'boende',
        'lägenhet',
        'lagenhet',
        'fastighet',
        'heimstaden',
        'wallenstam',
        'willhem',
        'akelius',
        'balder',
        'stena',
        'poseidon',
        'familjebostäder',
        'stockholmshem',
        'svenska bostäder',
        'mimer',
        'uppsalahem',
        'samfällighet',
        'samfallighet',
      ],
      category: 'Boende',
      paymentMethod: 'Bankgiro / Plusgiro',
    },
    {
      keywords: [
        'bolån',
        'bolan',
        'bostadslån',
        'amortering',
        'ränta',
        'ranta',
        'hypotek',
        'sbab',
        'landshypotek',
        'stabelo',
        'el',
        'elräkning',
        'elrakning',
        'elnät',
        'elnat',
        'tibber',
        'vattenfall',
        'fortum',
        'eon',
        'e.on',
        'ellevio',
        'öresundskraft',
        'oresundskraft',
        'fjärrvärme',
        'fjarrvarme',
        'vatten',
        'avlopp',
        'sophämtning',
        'renhållning',
        'verisure',
        'sector alarm',
        'hemlarm',
      ],
      category: 'Boende',
      paymentMethod: 'Autogiro',
    },
    {
      keywords: [
        'försäkring',
        'forsakring',
        'hemförsäkring',
        'hemforsakring',
        'bilförsäkring',
        'bilforsakring',
        'personförsäkring',
        'olycksfall',
        'barnförsäkring',
        'djurförsäkring',
        'livförsäkring',
        'villaförsäkring',
        'hedvig',
        'folksam',
        'trygg-hansa',
        'trygghansa',
        'länsförsäkringar',
        'lansforsakringar',
        'agria',
        'lassie',
        'gjensidige',
        'moderna',
        'svedea',
        'bliwa',
      ],
      category: 'Försäkring',
      paymentMethod: 'Autogiro',
    },
    {
      keywords: [
        'netflix',
        'spotify',
        'youtube',
        'disney',
        'hbo',
        'viaplay',
        'tv4',
        'prime',
        'skyshowtime',
        'discovery',
        'storytel',
        'bookbeat',
        'nextory',
        'podme',
        'audible',
        'tidal',
        'apple',
        'icloud',
        'google one',
        'chatgpt',
        'openai',
        'claude',
        'cursor',
        'midjourney',
        'microsoft',
        'adobe',
        '1password',
        'nordvpn',
        'mullvad',
        'dropbox',
        'canva',
        'patreon',
        'substack',
        'duolingo',
        'playstation',
        'xbox',
        'nintendo',
        'discord',
        'steam',
        'aftonbladet',
        'expressen',
        'dn',
        'svd',
        'readly',
        'prenumeration',
        'streaming',
      ],
      category: 'Abonnemang',
      paymentMethod: 'Kort',
    },
    {
      keywords: [
        'tele2',
        'telia',
        'telenor',
        'tre',
        'vimla',
        'hallon',
        'halebop',
        'fello',
        'comviq',
        'bahnhof',
        'ownit',
        'bredband',
        'bredband2',
        'fiber',
        'mobil',
        'mobilabonnemang',
        'telefon',
        'abonnemang',
        'sappa',
        'open infra',
        'globalconnect',
      ],
      category: 'Abonnemang',
      paymentMethod: 'Autogiro',
    },
    {
      keywords: [
        'gym',
        'träning',
        'traning',
        'sats',
        'nordic wellness',
        'fitness24seven',
        'friskis',
        'actic',
        'stc',
        'malkars',
        'member 24',
        'member24',
        'strava',
        'whoop',
        'padel',
        'apotek',
        'apotea',
        'tandläkare',
        'tandlakare',
        'tandvård',
        'frisör',
        'frisor',
        'massage',
      ],
      category: 'Hälsa',
      paymentMethod: 'Autogiro',
    },
    {
      keywords: [
        'sl',
        'västtrafik',
        'vasttrafik',
        'skånetrafiken',
        'skanetrafiken',
        'hallandstrafiken',
        'ul',
        'länstrafiken',
        'busskort',
        'månadskort',
        'pendelkort',
        'kollektivtrafik',
        'parkering',
        'boendeparkering',
        'garage',
        'easypark',
        'aimo',
        'apcoa',
        'parkster',
        'bensin',
        'diesel',
        'laddning',
        'trängselskatt',
        'trangselskatt',
        'fordonsskatt',
        'bilskatt',
        'billån',
        'billeasing',
        'leasing',
        'uber',
        'bolt',
        'taxi',
        'sj',
      ],
      category: 'Transport',
      paymentMethod: kind === 'fixed' ? 'Autogiro' : 'Kort',
    },
    {
      keywords: [
        'csn',
        'studielån',
        'studiemedel',
        'a-kassa',
        'akassa',
        'fack',
        'fackförbund',
        'fackavgift',
        'unionen',
        'akademikernas',
        'kommunal',
        'vision',
        'alfakassan',
        'småa',
        'handels',
        'lärarnas',
        'if metall',
        'vårdförbundet',
        'ledarna',
        'lån',
        'privatlån',
        'blancolån',
        'kredit',
        'anyfin',
        'resurs',
        'ikano',
        'marginalen',
        'avida',
        'brocc',
        'förskola',
        'forskola',
        'barnomsorg',
        'fritids',
        'bankavgift',
      ],
      category: 'Räkningar',
      paymentMethod: 'Autogiro',
    },
    {
      keywords: [
        'ica',
        'coop',
        'willys',
        'hemköp',
        'hemkop',
        'lidl',
        'city gross',
        'mathem',
        'systembolaget',
        'mat',
        'livsmedel',
        'handla',
      ],
      category: 'Mat & dryck',
      paymentMethod: 'Kort',
    },
    {
      keywords: [
        'restaurang',
        'lunch',
        'middag',
        'kaffe',
        'fika',
        'café',
        'cafe',
        'espresso house',
        'foodora',
        'wolt',
        'mcdonalds',
        'burger king',
        'uteliv',
        'bar',
        'pub',
        'bio',
        'filmstaden',
      ],
      category: 'Uteliv',
      paymentMethod: 'Kort',
    },
  ];

    for (const group of manualKeywordGroups) {
      if (group.keywords.some((kw) => matchesKeywordSmart(text, kw))) {
        return {
          category: normalizeCategoryToValid(group.category, 'expense'),
          paymentMethod: normalizePaymentMethodName(group.paymentMethod),
          logo: getLogoUrl(trimmed),
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}


