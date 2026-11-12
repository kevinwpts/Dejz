// Vilka bankköp som automatiskt ska läggas in som transaktioner i appen.
import { BankAccount, BankTransactionItem } from '../../../services/bankService';
import { Config, FixedExpense, Income, Transaction } from '../../../types';
import { getActualBankPaymentDateAndMeta } from '../../swedishDate';
import {
  isLikelyCreditCardInvoiceBankTx,
  isLikelyMerchantRefundBankTx,
  resolveBankTxSekAmount,
} from '../normalization';
import { categorizeBankTransactionForApp } from '../merchantRules';
import { CoreBankDetectionResult, runCoreBankDetection } from '../history';
import { getTxDate, isPendingBookingStatus } from '../txFields';
import { createExistingFixedMatcher } from './matching';

/** Indata som objekt (det nya sättet att anropa). */
export interface AutoImportParams {
  bankTransactions: BankTransactionItem[];
  userAccounts?: BankAccount[];
  existingFixedExpenses: FixedExpense[];
  /** Används inte i dag – finns kvar för äldre anrop. */
  existingIncomes?: Income[];
  existingAppTransactions: Transaction[];
  config?: Config | null;
  dismissedBankTxIds?: Set<string> | string[];
}

/** Indata efter att båda anropssätten gjorts om till samma form. */
interface NormalizedAutoImportArgs {
  bankTransactions: BankTransactionItem[];
  userAccounts: BankAccount[];
  existingFixedExpenses: FixedExpense[];
  existingAppTransactions: Transaction[];
  config: Config | null | undefined;
  dismissedBankTxIds: Set<string>;
}

/** Avstämningsstatusar som betyder att transaktionen redan är hanterad. */
const HANDLED_RECONCILIATION_STATUSES = [
  'excluded',
  'internal_transfer',
  'confirmed_fixed_expense',
  'confirmed_income',
  'confirmed_saving',
  'reserved_replaced',
];

const DAY_MS = 1000 * 60 * 60 * 24;

/** Allt importen behöver under genomgången av transaktionerna. */
interface ImportContext {
  relevantTxs: BankTransactionItem[];
  core: CoreBankDetectionResult;
  isExistingFixed: (tx: BankTransactionItem) => boolean;
  availableCategories: string[];
  existingAppTransactions: Transaction[];
  dismissed: Set<string>;
  seenKeys: Set<string>;
}

/** Gör om både objekt- och positionsanrop till samma form. */
function normalizeAutoImportArgs(
  paramsOrTxs: AutoImportParams | BankTransactionItem[],
  posUserAccounts?: BankAccount[],
  posExistingFixedExpenses?: FixedExpense[],
  posExistingAppTransactions?: Transaction[],
  posConfig?: Config | null,
  posDismissedBankTxIds?: Set<string> | string[]
): NormalizedAutoImportArgs {
  const isArrayArg = Array.isArray(paramsOrTxs);
  const rawDismissed = isArrayArg ? posDismissedBankTxIds : paramsOrTxs?.dismissedBankTxIds;
  return {
    bankTransactions: isArrayArg ? paramsOrTxs : paramsOrTxs?.bankTransactions || [],
    userAccounts: isArrayArg ? posUserAccounts || [] : paramsOrTxs?.userAccounts || [],
    existingFixedExpenses: isArrayArg
      ? posExistingFixedExpenses || []
      : paramsOrTxs?.existingFixedExpenses || [],
    existingAppTransactions: isArrayArg
      ? posExistingAppTransactions || []
      : paramsOrTxs?.existingAppTransactions || [],
    config: isArrayArg ? posConfig : paramsOrTxs?.config,
    dismissedBankTxIds:
      rawDismissed instanceof Set
        ? rawDismissed
        : Array.isArray(rawDismissed)
        ? new Set(rawDismissed)
        : new Set<string>(),
  };
}

/** Bara valda konton som ingår i budgeten (alla om inget konto är valt), bokförda före reserverade, nyast först. */
function selectRelevantTransactions(
  bankTransactions: BankTransactionItem[],
  userAccounts: BankAccount[]
): BankTransactionItem[] {
  const allowedAccountIds = new Set(
    userAccounts.filter((a) => a.is_selected && a.include_in_budget !== false).map((a) => a.id)
  );
  const relevant =
    allowedAccountIds.size > 0
      ? bankTransactions.filter((t) => allowedAccountIds.has(t.bank_account_id))
      : bankTransactions;
  return [...relevant].sort((a, b) => {
    const aBook = a.booking_status === 'BOOK' ? 0 : 1;
    const bBook = b.booking_status === 'BOOK' ? 0 : 1;
    if (aBook !== bBook) return aBook - bBook;
    return getTxDate(b).localeCompare(getTxDate(a));
  });
}

/** Sant om transaktionen redan är avbruten, hanterad, bortvald, sedd, egen överföring eller kortfaktura. */
function isSkippedBeforeAmount(tx: BankTransactionItem, ctx: ImportContext): boolean {
  if (tx.booking_status === 'CNCL' || tx.booking_status === 'RJCT') return true;
  if (tx.reconciliation_status && HANDLED_RECONCILIATION_STATUSES.includes(tx.reconciliation_status)) return true;
  if (ctx.dismissed.has(tx.id) || (tx.external_key && ctx.dismissed.has(tx.external_key))) return true;
  if (ctx.seenKeys.has(tx.id) || (tx.external_key && ctx.seenKeys.has(tx.external_key))) return true;
  if (ctx.core.internalTransferIds.has(tx.id)) return true;
  // Stora kreditkortsfakturor hoppas över så att kortköpen inte räknas dubbelt
  return isLikelyCreditCardInvoiceBankTx(tx);
}

/**
 * Sant om en reservation (PDNG/HOLD) redan finns bokförd i samma omgång,
 * med exakt samma transaction_id eller entry_reference.
 */
function isReservationAlreadyBooked(tx: BankTransactionItem, relevantTxs: BankTransactionItem[]): boolean {
  if (!isPendingBookingStatus(tx.booking_status) || !(tx.transaction_id || tx.entry_reference)) return false;
  return relevantTxs.some(
    (other) =>
      other.id !== tx.id &&
      other.booking_status === 'BOOK' &&
      Boolean(
        (tx.transaction_id && other.transaction_id === tx.transaction_id) ||
          (tx.entry_reference && other.entry_reference === tx.entry_reference)
      )
  );
}

/**
 * Sant om köpet redan finns i appen: samma bank-id eller bank-tagg, eller en manuellt
 * inlagd transaktion med samma belopp, butik och dag (±1,5 dagar). Andra bankköp räknas aldrig som dubblett.
 */
function isAlreadyInApp(
  tx: BankTransactionItem,
  absAmount: number,
  timestamp: number,
  merchant: string,
  appTxs: Transaction[]
): boolean {
  return appTxs.some((appTx) => {
    if (appTx.bankTransactionId === tx.id) return true;
    const tags = Array.isArray(appTx.tags) ? appTx.tags : null;
    if (tags && (tags.includes(`bank_tx:${tx.id}`) || (tx.external_key && tags.includes(`bank_key:${tx.external_key}`)))) {
      return true;
    }
    const hasBankTag = Boolean(tags && tags.some((t) => t.startsWith('bank_tx:')));
    if (appTx.bankTransactionId || hasBankTag) return false;
    const sameAmount = Math.abs(Math.abs(Number(appTx.amount)) - absAmount) < 0.5;
    const dayDiff = Math.abs(Number(appTx.timestamp) - timestamp) / DAY_MS;
    const sameMerchant =
      String(appTx.merchant || '').toLowerCase().trim() === String(merchant || '').toLowerCase().trim();
    return sameAmount && dayDiff <= 1.5 && sameMerchant;
  });
}

/** Taggar som kopplar app-transaktionen till bankraden (och markerar returer). */
function buildImportTags(tx: BankTransactionItem, isMerchantRefund: boolean): string[] {
  const tags = [`bank_tx:${tx.id}`];
  if (tx.external_key) tags.push(`bank_key:${tx.external_key}`);
  if (tx.bank_account_id) tags.push(`bank_acc:${tx.bank_account_id}`);
  if (isMerchantRefund) tags.push('bank_refund');
  return tags;
}

/** Tolkar en banktransaktion till en app-transaktion att importera, eller null om den ska hoppas över. */
function toImportedTransaction(tx: BankTransactionItem, ctx: ImportContext): Omit<Transaction, 'id'> | null {
  if (isSkippedBeforeAmount(tx, ctx)) return null;
  const { signedSekAmount: signedAmt, absSekAmount: absAmount, originalCurrency, originalAmount } =
    resolveBankTxSekAmount(tx);
  const isMerchantRefund = signedAmt > 0 && isLikelyMerchantRefundBankTx(tx);
  // Bara utgående rörliga köp eller verifierade butiksreturer
  if (signedAmt >= 0 && !isMerchantRefund) return null;
  if (!isMerchantRefund && (ctx.core.fixedTransactionIds.has(tx.id) || ctx.isExistingFixed(tx))) return null;
  if (absAmount <= 0) return null;

  const { paymentDate } = getActualBankPaymentDateAndMeta(tx);
  const parsedDateMs = paymentDate ? Date.parse(`${paymentDate}T12:00:00`) : NaN;
  const timestamp = Number.isFinite(parsedDateMs) ? parsedDateMs : Date.now();
  const categorized = categorizeBankTransactionForApp(tx, ctx.availableCategories);
  if (isReservationAlreadyBooked(tx, ctx.relevantTxs)) return null;
  if (isAlreadyInApp(tx, absAmount, timestamp, categorized.merchant, ctx.existingAppTransactions)) return null;

  return {
    amount: isMerchantRefund ? -absAmount : absAmount,
    type: 'expense',
    category: categorized.category,
    merchant: categorized.merchant,
    note: tx.description || categorized.merchant,
    timestamp,
    isBackdated: false,
    logo: categorized.logo,
    paymentMethod: 'Kortbetalning',
    tags: buildImportTags(tx, isMerchantRefund),
    bankTransactionId: tx.id,
    bankAccountId: tx.bank_account_id,
    originalBankDescription: tx.description,
    originalBankAmount: originalCurrency !== 'SEK' ? originalAmount : signedAmt,
    originalBankCurrency: originalCurrency,
  };
}

/**
 * Ger alla bokförda rörliga bankköp (i hela historiken) som automatiskt ska läggas in i appens
 * transaktioner – så att de syns i Hem, Historik, Analys och Budget – utan att dubbla fasta
 * utgifter eller egna överföringar. Tar emot antingen ett objekt eller (äldre) positionsargument.
 */
export function getAutoImportableBankTransactions(
  paramsOrTxs: AutoImportParams | BankTransactionItem[],
  posUserAccounts?: BankAccount[],
  posExistingFixedExpenses?: FixedExpense[],
  posExistingAppTransactions?: Transaction[],
  posConfig?: Config | null,
  posDismissedBankTxIds?: Set<string> | string[]
): Array<Omit<Transaction, 'id'>> {
  const args = normalizeAutoImportArgs(
    paramsOrTxs,
    posUserAccounts,
    posExistingFixedExpenses,
    posExistingAppTransactions,
    posConfig,
    posDismissedBankTxIds
  );
  if (!Array.isArray(args.bankTransactions) || args.bankTransactions.length === 0) return [];

  const { config, userAccounts } = args;
  const paydayBeforeWeekend =
    config?.paydayBeforeWeekend !== undefined ? config.paydayBeforeWeekend : true;
  const relevantTxs = selectRelevantTransactions(args.bankTransactions, userAccounts);
  const ctx: ImportContext = {
    relevantTxs,
    core: runCoreBankDetection(relevantTxs, config?.payday || 25, paydayBeforeWeekend, userAccounts),
    isExistingFixed: createExistingFixedMatcher(args.existingFixedExpenses),
    availableCategories: (config?.categories || []).map((c) =>
      typeof c === 'string' ? c : c?.name || ''
    ),
    existingAppTransactions: args.existingAppTransactions,
    dismissed: args.dismissedBankTxIds,
    seenKeys: new Set<string>(),
  };

  const toImport: Array<Omit<Transaction, 'id'>> = [];
  for (const tx of relevantTxs) {
    const imported = toImportedTransaction(tx, ctx);
    if (!imported) continue;
    ctx.seenKeys.add(tx.id);
    if (tx.external_key) ctx.seenKeys.add(tx.external_key);
    toImport.push(imported);
  }
  return toImport;
}
