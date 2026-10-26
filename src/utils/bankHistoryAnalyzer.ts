import { BankAccount, BankTransactionItem } from '../services/bankService';
import { SWEDISH_EXPENSE_PRESETS, SwedishExpensePreset } from '../data/swedishExpensePresets';
import { Config, FixedExpense, Frequency, Income, PaydayType, Transaction, WeekendAdjustment } from '../types';
import { getLogoUrl } from './logo';
import { getPeriodBoundaries } from './date';
import { getActualBankPaymentDateAndMeta } from './swedishDate';

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
  if (custom) return custom;

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
  const rawNum = (acc.bban || acc.iban || acc.provider_account_uid || '').replace(/\D+/g, '');
  const last4 = rawNum.length >= 4 ? rawNum.slice(-4) : '';
  return last4 ? `${shortBank}-konto · ${last4}` : `${shortBank}-konto`;
}

export function getBankAccountShortLabel(
  acc: Pick<BankAccount, 'name' | 'product' | 'bban' | 'iban' | 'provider_account_uid' | 'custom_name'> & {
    aspsp_name?: string | null;
  },
  aspspName?: string | null
): string {
  const custom = (acc.custom_name || '').trim();
  const rawNum = (acc.bban || acc.iban || acc.provider_account_uid || '').replace(/\D+/g, '');
  const last4 = rawNum.length >= 4 ? rawNum.slice(-4) : '';

  if (custom) {
    return last4 && !custom.endsWith(last4) ? `${custom} · ${last4}` : custom;
  }

  const title = getBankAccountTitle(acc, aspspName);
  if (last4 && !title.endsWith(last4)) {
    return `${title} · ${last4}`;
  }
  return title;
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

  // Återbetalning & returer
  if (
    combined.includes('återbetalning') ||
    combined.includes('aterbetalning') ||
    combined.includes('återköp') ||
    combined.includes('aterkop') ||
    combined.includes('retur') ||
    combined.includes('refund') ||
    combined.includes('kreditering')
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
  const combined = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase().trim();

  if (
    combined.includes('enkla vardagen') ||
    combined.includes('enkla sparkontot') ||
    combined.includes('egna konton') ||
    combined.includes('egen överföring') ||
    combined.includes('egen overforing') ||
    combined.includes('mellan egna') ||
    combined.includes('sparkonto')
  ) {
    return true;
  }

  // Check if the description is just an account number belonging to one of the user's own accounts
  for (const acc of userAccounts) {
    const bbanDigits = (acc.bban || '').replace(/\D+/g, '');
    if (bbanDigits.length >= 7 && combined.replace(/\D+/g, '').includes(bbanDigits)) {
      return true;
    }
  }

  return false;
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
  { keywords: ['fitness24seven', 'fitness 24 seven'], presetId: 'fitness24seven', fallbackName: 'Fitness24Seven', category: 'Hälsa', paymentMethod: 'Autogiro' },
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

  // Fack, A-kassa & CSN
  { keywords: ['csn', 'centrala studiestödsnämnden'], presetId: 'csn-aterbetalning', fallbackName: 'CSN Lån', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['unionen'], presetId: 'akassa-unionen', fallbackName: 'Unionen A-kassa/Fack', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['sveriges ingenjörer', 'akademikernas a-kassa', 'akademikernas erkända'], presetId: 'akassa-sveriges-ingenjorer', fallbackName: 'A-kassa / Fackförbund', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['kommunal'], presetId: 'akassa-kommunal', fallbackName: 'Kommunal', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['vision'], presetId: 'akassa-vision', fallbackName: 'Vision', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['alfa-kassan', 'alfakassan'], presetId: 'akassa-alfakassan', fallbackName: 'Alfa-kassan', category: 'Räkningar', paymentMethod: 'Autogiro' },

  // Tech, Moln, AI & Tidningar
  { keywords: ['apple.com/bill', 'itunes.com/bill'], presetId: 'icloud-storage', fallbackName: 'Apple / iCloud', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['openai', 'chatgpt'], presetId: 'chatgpt-plus', fallbackName: 'ChatGPT Plus', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['google one', 'google*storage'], presetId: 'google-one-100gb', fallbackName: 'Google One', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['microsoft*365', 'microsoft*office', 'msbill.info'], presetId: 'microsoft-365', fallbackName: 'Microsoft 365', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['anthropic', 'claude.ai'], presetId: 'claude-pro', fallbackName: 'Claude Pro', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['adobe'], presetId: 'adobe-photography', fallbackName: 'Adobe', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['1password'], presetId: '1password', fallbackName: '1Password', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['nordvpn'], presetId: 'nordvpn', fallbackName: 'NordVPN', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['playstation', 'sony interactive'], presetId: 'playstation-plus', fallbackName: 'PlayStation', category: 'Nöjen', paymentMethod: 'Kort' },
  { keywords: ['xbox', 'microsoft*xbox'], presetId: 'xbox-game-pass', fallbackName: 'Xbox Game Pass', category: 'Nöjen', paymentMethod: 'Kort' },
  { keywords: ['nintendo'], presetId: 'nintendo-switch-online', fallbackName: 'Nintendo', category: 'Nöjen', paymentMethod: 'Kort' },
  { keywords: ['discord'], presetId: 'discord-nitro', fallbackName: 'Discord Nitro', category: 'Nöjen', paymentMethod: 'Kort' },
  { keywords: ['aftonbladet'], presetId: 'aftonbladet-plus', fallbackName: 'Aftonbladet Plus', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['expressen'], presetId: 'expressen-premium', fallbackName: 'Expressen Premium', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['dagens nyheter', 'dn.se'], presetId: 'dagens-nyheter', fallbackName: 'Dagens Nyheter', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['svenska dagbladet', 'svd.se'], presetId: 'svenska-dagbladet', fallbackName: 'Svenska Dagbladet', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['dagens industri', 'di.se'], presetId: 'dagens-industri', fallbackName: 'Dagens Industri', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['readly'], presetId: 'readly-tidningar', fallbackName: 'Readly', category: 'Abonnemang', paymentMethod: 'Kort' },
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

export function formatSwishPhone(rawNumber: string): string {
  const digits = rawNumber.replace(/\D/g, '');
  let swedishDigits = digits;
  if (digits.startsWith('467')) {
    swedishDigits = '07' + digits.slice(3);
  }
  if (/^07\d{8}$/.test(swedishDigits)) {
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
    const cpDigits = cp.replace(/[\s()-]/g, '');
    if (!/^swish$/i.test(cp) && !/^(467\d{8,10}|07\d{8,9}|123\d{7})$/.test(cpDigits)) {
      return cleanDisplayMerchantName(cp);
    }
  }

  const raw = String(description || '').trim();
  if (!raw) return 'Swish';

  // 2. Extrahera och formatera eventuellt telefonnummer (t.ex. 46722162125 -> 072-216 21 25)
  const rawDigits = raw.replace(/[\s()-]/g, '');
  const phoneMatch = rawDigits.match(/(467\d{8}|07\d{8}|123\d{7})/);
  let formattedPhone = '';
  if (phoneMatch) {
    formattedPhone = formatSwishPhone(phoneMatch[1]);
  }

  // 3. Extrahera personens/företagets namn från typiska svenska Swish-beskrivningar:
  let cleaned = raw
    .replace(/^swish\s*(mottagen|inbetalning|inb\.?|skickad|betalning|från|fran|till)?\s*/i, '')
    .trim();

  // Rensa bort telefonnummer
  cleaned = cleaned.replace(/(467\d{8}|07\d{8}|123\d{7})/g, '').trim();
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

export function cleanDisplayMerchantName(rawText: string | null | undefined): string {
  let cleaned = String(rawText || '').trim();
  if (!cleaned) return 'Banktransaktion';

  // 1. Rensa bort tekniska prefix från banker och kortterminaler
  cleaned = cleaned
    .replace(/^\d{5,}\s+/, '') // Rensa bort inledande referensnummer
    .replace(/^(AUTOGIRO|BG|PG|KORTKÖP|KORTKOP|BETALNING|RESERVATION|KÖP|INBETALNING|UTBETALNING|ÖVERFÖRING|OVERFORING)\s+/i, '')
    .replace(/^[*#._-]+\s*/, '')
    .trim();

  // 2. Rensa bort terminalsuffix som butiksnummer, ortkoder och landskod i slutet
  cleaned = cleaned
    .replace(/\s+\d{3,}\b.*$/, '') // T.ex. " 1421", " 0124"
    .replace(/\s+(SE|SWE|SWEDEN)$/i, '')
    .replace(/\s+(STOCKHOLM|GÖTEBORG|GOTEBORG|MALMÖ|MALMO|UPPSALA|LUND|HELSINGBORG)\s*(SE)?$/i, '')
    .trim();

  if (!cleaned) return 'Banktransaktion';

  const lower = cleaned.toLowerCase().trim();

  // 3. Kontrollera mot ordbok för avhuggna och kända butiksnamn (t.ex. systembolag -> Systembolaget)
  if (KNOWN_MERCHANT_NAMES_MAP[lower]) {
    return KNOWN_MERCHANT_NAMES_MAP[lower];
  }

  for (const [key, cleanName] of Object.entries(KNOWN_MERCHANT_NAMES_MAP)) {
    if (lower === key || lower.startsWith(key + ' ') || lower.startsWith(key + '-')) {
      return cleanName;
    }
    // Avhuggna namn med minst 6 tecken (t.ex. "systembolag" i "systembolag 0124")
    if (key.length >= 6 && (lower.includes(key) || key.startsWith(lower))) {
      return cleanName;
    }
  }

  // 4. Universell svensk Title Case & bolagsändelser (t.ex. Öresundskraft AB)
  const words = cleaned.split(/\s+/);
  const formattedWords = words.map((w, idx) => {
    // Behåll eventuella skiljetecken runt ordet
    const punctuationMatch = w.match(/^([^a-zA-ZåäöÅÄÖ0-9]*)(.*?)([^a-zA-ZåäöÅÄÖ0-9]*)$/);
    const prefix = punctuationMatch ? punctuationMatch[1] : '';
    const core = punctuationMatch ? punctuationMatch[2] : w;
    const suffix = punctuationMatch ? punctuationMatch[3] : '';

    const coreLower = core.toLowerCase();

    // Kontrollera kända akronymer (ICA, IKEA, etc.)
    if (ACRONYM_BRANDS[coreLower]) {
      return `${prefix}${ACRONYM_BRANDS[coreLower]}${suffix}`;
    }

    // Bolagsformer (AB, HB, KB, etc.)
    if (
      CORPORATE_SUFFIXES.has(coreLower.toUpperCase()) ||
      coreLower === 'ab' ||
      coreLower === 'a.b.' ||
      coreLower === 'a/b'
    ) {
      return `${prefix}AB${suffix}`;
    }

    // Små sammanbindande ord i mitten av ett namn (och, i, på, etc.)
    if (idx > 0 && LOWERCASE_JOINERS.has(coreLower)) {
      return `${prefix}${coreLower}${suffix}`;
    }

    // Normal svensk Title Case
    if (core.length > 0) {
      const titleCased = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
      return `${prefix}${titleCased}${suffix}`;
    }

    return w;
  });

  return formattedWords.join(' ');
}

export function categorizeBankTransactionForApp(
  tx: BankTransactionItem,
  availableCategories: Array<string | { name?: string }> = [],
  _incomeCategories?: Array<string | { name?: string }>
): { merchant: string; category: string; logo?: string } {
  const combined = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
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

  const isSwishTx =
    combined.includes('swish') ||
    /(467\d{8}|07\d{8}|123\d{7})/.test(combined.replace(/[\s-]/g, ''));

  if (isSwishTx) {
    const swishTitle = formatSwishTitle(tx.description, tx.counterparty_name);
    return {
      merchant: swishTitle,
      category: 'Swish',
      logo: getLogoUrl(swishTitle, 'Swish'),
    };
  }

  for (const rule of EVERYDAY_MERCHANT_RULES) {
    if (rule.keywords.some((kw) => combined.includes(kw))) {
      const category = resolveCategory(rule.preferredCategories);
      return {
        merchant: rule.cleanName,
        category,
        logo: getLogoUrl(rule.cleanName, category),
      };
    }
  }

  for (const rule of EXTENDED_FIXED_EXPENSE_RULES) {
    if (rule.keywords.some((kw) => combined.includes(kw.toLowerCase()))) {
      const preset = rule.presetId
        ? SWEDISH_EXPENSE_PRESETS.find((p) => p.id === rule.presetId)
        : undefined;
      const isGenericHousingPreset = rule.presetId === 'hyra-bostad';
      const cleanedRaw = cleanDisplayMerchantName(
        tx.counterparty_name || tx.description || ''
      );
      const displayName =
        isGenericHousingPreset && cleanedRaw.length >= 3
          ? `Hyra (${cleanedRaw})`
          : preset?.name || rule.fallbackName;
      const category = resolveCategory([preset?.category || rule.category]);
      return {
        merchant: displayName,
        category,
        logo: getLogoUrl(displayName, category),
      };
    }
  }

  const cleanedName = cleanDisplayMerchantName(tx.counterparty_name || tx.description || 'Kortköp');
  const category = resolveCategory(['Övrigt']);
  return {
    merchant: cleanedName,
    category,
    logo: getLogoUrl(cleanedName, category),
  };
}

/**
 * Avgör om en banktransaktion inte kändes igen av den lokala butikslistan
 * eller innehåller kryptiska kortterminalprefix (t.ex. ZETTLE*GBG KAF, NYX*SVENSKA, KLARNA*84920)
 * och därför bör tvättas och kategoriseras tyst av AI i bakgrunden.
 */
export function needsAiMerchantCleaning(
  rawText: string | null | undefined,
  currentTitle?: string | null,
  currentCategory?: string | null
): boolean {
  const combined = `${rawText || ''} ${currentTitle || ''}`.trim();
  if (!combined || combined.length < 2) return false;
  const lower = combined.toLowerCase();

  // Swish hanteras redan deterministiskt med telefonnummer/mottagare
  if (
    lower.includes('swish') ||
    /(467\d{8}|07\d{8}|123\d{7})/.test(lower.replace(/[\s-]/g, '')) ||
    currentCategory === 'Swish'
  ) {
    return false;
  }

  // Om råtexten eller titeln har kryptiska betalväxelprefix eller asterisker (t.ex. ZETTLE*, NYX*, SUMUP*, KLARNA*84920)
  const hasCrypticTerminalPattern =
    /\b(zettle|izettle|iz|sumup|nyx|stripe|sq|sp|wl|bambora|nets|adyen|qck|billo)\s*[*#_-]/i.test(combined) ||
    /[a-zA-Z0-9]\*[a-zA-Z0-9]/.test(currentTitle || '') ||
    /\b(gbg|sthlm|kaf|kafe|kond|rest)\b/i.test(currentTitle || '');

  if (hasCrypticTerminalPattern) {
    return true;
  }

  // Kontrollera om transaktionen redan matchar vår lokala butikslista eller fasta regler
  const matchedEveryday = EVERYDAY_MERCHANT_RULES.some((rule) =>
    rule.keywords.some((kw) => lower.includes(kw))
  );
  if (matchedEveryday) return false;

  const matchedFixed = EXTENDED_FIXED_EXPENSE_RULES.some((rule) =>
    rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))
  );
  if (matchedFixed) return false;

  const titleLower = (currentTitle || '').toLowerCase().trim();
  if (titleLower && KNOWN_MERCHANT_NAMES_MAP[titleLower]) {
    return false;
  }

  // Om den inte kändes igen av butikslistan (eller hamnade i Övrigt), låt AI tvätta och kategorisera den
  return true;
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

  // Sort newest first
  const sorted = [...bookedOrDefault].sort((a, b) => {
    const dA = a.booking_date || a.transaction_date || a.value_date || '';
    const dB = b.booking_date || b.transaction_date || b.value_date || '';
    return dB.localeCompare(dA);
  });

  const internalTransferIds = new Set<string>();
  for (const tx of sorted) {
    if (isInternalTransferOrMicroSavings(tx, userAccounts)) {
      internalTransferIds.add(tx.id);
    }
  }

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
  };

  const candidateFixedMap = new Map<string, RawFixedGroup>();

  // Layer 1: Collect matches against known Swedish fixed expense & subscription rules
  for (const tx of outflows) {
    const absAmount = Math.round(Math.abs(getNormalizedBankTxAmount(tx)));
    if (absAmount <= 0 || absAmount > 60000) continue;

    const combinedText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();

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
      const cleanedRawName = cleanDisplayMerchantName(
        tx.counterparty_name || tx.description || ''
      );
      const displayName =
        isGenericHousingPreset && cleanedRawName.length >= 3
          ? `Hyra (${cleanedRawName})`
          : preset?.name || matchedRule.fallbackName;

      const key = isGenericHousingPreset
        ? `housing_${normalizeMerchantKey(cleanedRawName)}`
        : matchedRule.presetId || matchedRule.fallbackName.toLowerCase();

      const txDate = tx.booking_date || tx.transaction_date || tx.value_date || undefined;
      const deductionDay = getDayOfMonthFromIso(txDate, preset?.deductionDay || 27);
      const category = preset?.category || matchedRule.category;
      const paymentMethod = preset?.paymentMethod || matchedRule.paymentMethod;

      const hasExplicitAutogiroOrInvoice =
        combinedText.includes('autogiro') ||
        combinedText.includes('bankgiro') ||
        combinedText.includes('plusgiro') ||
        combinedText.includes('hyra') ||
        combinedText.includes('hyresavi') ||
        combinedText.includes('bolån') ||
        combinedText.includes('csn') ||
        paymentMethod === 'Autogiro' ||
        paymentMethod === 'Bankgiro' ||
        category === 'Boende' ||
        category === 'Försäkringar';

      const existing = candidateFixedMap.get(key);
      if (!existing) {
        candidateFixedMap.set(key, {
          name: displayName,
          amount: absAmount,
          category,
          frequency: Frequency.MONTHLY,
          deductionDay,
          paymentMethod,
          logo: getLogoUrl(displayName, category),
          detectedOccurrences: 1,
          lastDate: txDate,
          matchedTxIds: new Set([tx.id]),
          dates: txDate ? [txDate] : [],
          amounts: [absAmount],
          hasExplicitAutogiroOrInvoice,
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

  // Requirement 4: "En enstaka transaktion är inte bevis för ett abonnemang."
  // Filter candidateFixedMap: require >= 2 occurrences across distinct dates/months OR explicit autogiro/bankgiro/housing/insurance agreement
  const detectedFixedMap = new Map<string, DetectedFixedExpenseWithEvidence & { matchedTxIds: Set<string> }>();
  const fixedTransactionIds = new Set<string>();

  for (const [key, cand] of candidateFixedMap.entries()) {
    const distinctDates = Array.from(new Set(cand.dates));
    const isConfirmedRecurring =
      cand.detectedOccurrences >= 2 ||
      distinctDates.length >= 2 ||
      cand.hasExplicitAutogiroOrInvoice;

    if (!isConfirmedRecurring) {
      // Single card transaction (e.g. single Apple 12 kr or single game purchase) is NOT proof of a subscription!
      continue;
    }

    for (const txId of cand.matchedTxIds) {
      fixedTransactionIds.add(txId);
    }

    const frequency = inferFrequencyFromDates(cand.dates);
    const minAmt = Math.min(...cand.amounts);
    const maxAmt = Math.max(...cand.amounts);
    const candNameLower = String(cand.name || '').toLowerCase();
    const isUtilityVariable =
      candNameLower.includes('el') ||
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
      deductionDay: cand.deductionDay,
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

    const hasExplicitAutogiroKeyword =
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
      const minAmt = Math.min(...amounts);
      const maxAmt = Math.max(...amounts);
      const isVariable = amounts.length >= 2 && (maxAmt - minAmt) / (minAmt || 1) > 0.05;
      const occurrencesCount = distinctMonths.size || groupTxs.length;

      detectedFixedMap.set(`recurring_${normKey}`, {
        name: displayName,
        amount: latestAmount,
        category,
        frequency,
        deductionDay,
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

    const isExplicitSalary =
      rawText.includes('lön') ||
      rawText.includes('lon ') ||
      rawText.includes('salary') ||
      rawText.includes('löneutbetalning');
    const isCsn = rawText.includes('csn') || rawText.includes('studiestöd');
    const isFk =
      rawText.includes('försäkringskassan') || rawText.includes('forsakringskassan');
    const isBarnbidrag = rawText.includes('barnbidrag');
    const isPension = rawText.includes('pension');
    const isAkassa =
      rawText.includes('a-kassa') ||
      rawText.includes('akassa') ||
      rawText.includes('arbetslöshetsersättning') ||
      rawText.includes('arbetsloshetsersattning') ||
      rawText.includes('alfakassan') ||
      rawText.includes('unionen');

    if (
      !isExplicitSalary &&
      !isCsn &&
      !isFk &&
      !isBarnbidrag &&
      !isPension &&
      !isAkassa &&
      amt < 12000
    ) {
      continue;
    }

    let groupKey = 'salary';
    let incomeName = 'Lön';
    let incomeCategory = 'Lön';
    let isPrimarySalary = isExplicitSalary;

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
    } else if (isPension) {
      groupKey = 'pension';
      incomeName = 'Pension';
      incomeCategory = 'Pension';
      isPrimarySalary = false;
    } else if (isAkassa) {
      groupKey = 'akassa';
      const cleanAcc = tx.counterparty_name ? cleanDisplayMerchantName(tx.counterparty_name) : 'A-kassa';
      incomeName = cleanAcc.toLowerCase().includes('kassa') || cleanAcc.toLowerCase().includes('unionen') ? cleanAcc : 'A-kassa';
      incomeCategory = 'Ersättning';
      isPrimarySalary = false;
    } else if (tx.counterparty_name) {
      const cleanEmp = cleanDisplayMerchantName(tx.counterparty_name);
      groupKey = `salary_${normalizeMerchantKey(cleanEmp)}`;
      incomeName = `Lön (${cleanEmp})`;
      isPrimarySalary = true;
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
    // If an inflow has no explicit salary/benefit keyword (only matched because amt >= 12000),
    // require either >= 2 occurrences OR explicit 'utbetalning'/'lön' so a one-off large transfer isn't assumed to be salary
    const firstText = `${grp.txs[0].description || ''} ${grp.txs[0].counterparty_name || ''}`.toLowerCase();
    const hasExplicitIncomeKeyword =
      firstText.includes('lön') ||
      firstText.includes('lon ') ||
      firstText.includes('salary') ||
      firstText.includes('utbetalning') ||
      firstText.includes('csn') ||
      firstText.includes('försäkringskassan') ||
      firstText.includes('forsakringskassan') ||
      firstText.includes('barnbidrag') ||
      firstText.includes('pension') ||
      firstText.includes('a-kassa') ||
      firstText.includes('akassa') ||
      firstText.includes('arbetslös');

    if (!hasExplicitIncomeKeyword && grp.txs.length < 2) {
      continue;
    }

    const latestAmount = grp.amounts[0];
    const latestDate = grp.dates[0];
    const dayOfMonth = getDayOfMonthFromIso(latestDate, 25);

    let normalizedDay = dayOfMonth;
    if (grp.isPrimarySalary && dayOfMonth >= 22 && dayOfMonth <= 26) {
      normalizedDay = 25;
    }

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
  paydayBeforeWeekend = true
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

  const core = runCoreBankDetection(transactions, currentPayday, paydayBeforeWeekend);

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
    const absAmt = Math.round(Math.abs(getNormalizedBankTxAmount(tx)));
    const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    for (const fixed of activeExistingFixed) {
      const fixedName = String(fixed.name || '').toLowerCase().trim();
      if (fixedName.length >= 3 && text.includes(fixedName)) return true;
      if (fixed.amount >= 1500 && Math.abs(fixed.amount - absAmt) / fixed.amount <= 0.05) {
        return true;
      }
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
    const absAmt = Math.round(Math.abs(getNormalizedBankTxAmount(tx)));
    const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    for (const fixed of activeExistingFixed) {
      const fixedName = String(fixed.name || '').toLowerCase().trim();
      if (fixedName.length >= 3 && text.includes(fixedName)) return true;
      const cleanedFixed = fixedName.replace(/^hyra\s*\(|\)$/g, '').trim();
      if (cleanedFixed.length >= 3 && text.includes(cleanedFixed)) return true;
      if (fixed.amount >= 1500 && Math.abs(fixed.amount - absAmt) / fixed.amount <= 0.05) {
        return true;
      }
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

    const signedAmt = getNormalizedBankTxAmount(tx);
    // Only auto-import outgoing variable purchases (incomes and fixed expenses are handled in Inkomster & Fasta utgifter)
    if (signedAmt >= 0) {
      continue;
    }

    if (core.fixedTransactionIds.has(tx.id) || matchesExistingUserFixed(tx)) {
      continue;
    }

    const absAmount = Math.round(Math.abs(signedAmt) * 100) / 100;
    if (absAmount <= 0) continue;

    const { paymentDate } = getActualBankPaymentDateAndMeta(tx);
    const txDate = paymentDate;
    const parsedDateMs = txDate ? Date.parse(`${txDate}T12:00:00`) : NaN;
    const timestamp = Number.isFinite(parsedDateMs) ? parsedDateMs : Date.now();

    const categorized = categorizeBankTransactionForApp(tx, availableCategories);
    const isReserved = tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD';

    // If this is a PDNG/HOLD reservation and we already imported a BOOK transaction with same amount & merchant within 4 days, skip it
    if (isReserved) {
      const hasMatchingBookedInBatch = toImport.some((imp) => {
        const sameAmt = Math.abs(Number(imp.amount) - absAmount) < 0.5;
        const dayDiff = Math.abs(Number(imp.timestamp) - timestamp) / (1000 * 60 * 60 * 24);
        const sameMerch =
          String(imp.merchant || '').toLowerCase().trim() ===
          String(categorized.merchant || '').toLowerCase().trim();
        return sameAmt && dayDiff <= 4 && sameMerch;
      });
      if (hasMatchingBookedInBatch) {
        continue;
      }
    }

    const alreadyInApp = existingAppTransactions.some((appTx) => {
      if (appTx.bankTransactionId === tx.id) return true;
      if (Array.isArray(appTx.tags)) {
        if (
          appTx.tags.includes(`bank_tx:${tx.id}`) ||
          (tx.external_key && appTx.tags.includes(`bank_key:${tx.external_key}`))
        ) {
          return true;
        }
      }
      // Also guard against manual/reservation duplicate on same day with same amount and merchant
      const sameAmount = Math.abs(Number(appTx.amount) - absAmount) < 0.5;
      const dayDiff = Math.abs(Number(appTx.timestamp) - timestamp) / (1000 * 60 * 60 * 24);
      const sameMerchant =
        String(appTx.merchant || '').toLowerCase().trim() ===
        String(categorized.merchant || '').toLowerCase().trim();
      return sameAmount && dayDiff <= (isReserved ? 4 : 1.5) && sameMerchant;
    });

    if (alreadyInApp) {
      continue;
    }

    seenKeysInBatch.add(tx.id);
    if (tx.external_key) seenKeysInBatch.add(tx.external_key);

    const tags = [`bank_tx:${tx.id}`];
    if (tx.external_key) tags.push(`bank_key:${tx.external_key}`);
    if (tx.bank_account_id) tags.push(`bank_acc:${tx.bank_account_id}`);

    toImport.push({
      amount: absAmount,
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
      originalBankAmount: signedAmt,
      originalBankCurrency: tx.currency || 'SEK',
    });
  }

  return toImport;
}

