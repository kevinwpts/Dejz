import type { Transaction, TransactionSplit } from '../types';
import type { Database } from '../types/database';
import { isKnownIconId, isEmojiString } from '../components/CategoryIcon';
import { getTransactionReceipts, serializeTransactionReceipts } from '../utils/format';

/**
 * Översättning mellan ett köp i appen och en rad i tabellen `transactions`.
 * Ett ställe för det som tidigare fanns i tre kopior (hämta, lägga till, ändra) – och testat.
 */
export type TransactionRow = Database['public']['Tables']['transactions']['Row'];

/** Äldre rader sparade bank-id och återbetalning som taggar ("bank_tx:…") innan kolumnerna fanns. */
const SYSTEM_TAG_PREFIXES = ['bank_tx:', 'bank_acc:', 'refund_of:'] as const;

function findTagValue(tags: string[], prefix: string): string | undefined {
  const tag = tags.find((t) => typeof t === 'string' && t.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : undefined;
}

function parseSplits(value: unknown): TransactionSplit[] {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as TransactionSplit[]) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? (value as unknown as TransactionSplit[]) : [];
}

/** Taggar som sparas: användarens egna + stjärna och bank-/återbetalnings-id (för äldre databaser). */
export function buildTransactionTags(tx: Omit<Transaction, 'id'>): string[] {
  const tags = (tx.tags || []).filter(
    (t) => t !== 'starred' && !SYSTEM_TAG_PREFIXES.some((p) => t.startsWith(p))
  );
  if (tx.isStarred) tags.push('starred');
  if (tx.bankTransactionId) tags.push(`bank_tx:${tx.bankTransactionId}`);
  if (tx.bankAccountId) tags.push(`bank_acc:${tx.bankAccountId}`);
  if (tx.refundOfTransactionId) tags.push(`refund_of:${tx.refundOfTransactionId}`);
  return Array.from(new Set(tags));
}

/**
 * Raden som skickas till databasen.
 * mode 'insert': bankfält skickas bara när de finns.
 * mode 'update': ett bankfält som är satt men tomt nollställs (null) i databasen.
 */
export function transactionToRow(
  tx: Omit<Transaction, 'id'>,
  mode: 'insert' | 'update'
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    amount: tx.amount,
    category: tx.category,
    note: tx.note,
    merchant: tx.merchant,
    timestamp: tx.timestamp,
    type: tx.type,
    is_backdated: tx.isBackdated,
    logo: tx.logo,
    icon: tx.icon,
    payment_method: tx.paymentMethod,
    receipt_url: serializeTransactionReceipts(tx.receiptUrls, tx.receiptUrl),
    tags: buildTransactionTags(tx),
    splits: tx.splits,
  };
  const optional: Array<[string, unknown]> = [
    ['bank_transaction_id', tx.bankTransactionId],
    ['bank_account_id', tx.bankAccountId],
    ['original_bank_description', tx.originalBankDescription],
    ['original_bank_amount', tx.originalBankAmount],
    ['original_bank_currency', tx.originalBankCurrency],
    ['refund_of_transaction_id', tx.refundOfTransactionId],
  ];
  for (const [col, value] of optional) {
    if (mode === 'insert') {
      if (col === 'original_bank_amount' ? value !== undefined : Boolean(value)) row[col] = value;
    } else if (value !== undefined) {
      row[col] = col === 'original_bank_amount' ? value ?? null : value || null;
    }
  }
  return row;
}

/**
 * Raden från databasen som ett köp i appen.
 * `sent` är köpet vi just skickade: används som reserv om databasen saknar en kolumn.
 */
export function transactionFromRow(
  row: Partial<TransactionRow> & { id: string; is_starred?: boolean | null },
  sent?: Omit<Transaction, 'id'>
): Transaction {
  const storedUrls = Array.isArray(row.receipt_urls)
    ? row.receipt_urls.filter((u): u is string => typeof u === 'string')
    : undefined;
  const receiptUrls = getTransactionReceipts({
    receipt_url: row.receipt_url ?? undefined,
    receiptUrls: sent ? undefined : storedUrls,
  });
  const tags: string[] = Array.isArray(row.tags) ? row.tags : sent ? buildTransactionTags(sent) : [];
  const logo = row.logo ?? undefined;
  return {
    id: row.id,
    amount: Number(row.amount),
    category: row.category as string,
    note: row.note as string | undefined,
    merchant: row.merchant as string | undefined,
    timestamp: Number(row.timestamp),
    type: row.type as Transaction['type'],
    isBackdated: row.is_backdated as boolean | undefined,
    logo: row.logo as string | undefined,
    icon: row.icon || (logo && (isEmojiString(logo) || isKnownIconId(logo)) ? logo : undefined),
    paymentMethod: row.payment_method as string | undefined,
    receiptUrl: receiptUrls[0],
    receiptUrls,
    tags,
    splits: parseSplits(row.splits),
    isStarred: Boolean(row.is_starred || tags.includes('starred') || sent?.isStarred),
    bankTransactionId:
      row.bank_transaction_id || findTagValue(tags, 'bank_tx:') || sent?.bankTransactionId,
    bankAccountId: row.bank_account_id || findTagValue(tags, 'bank_acc:') || sent?.bankAccountId,
    originalBankDescription: row.original_bank_description || sent?.originalBankDescription || undefined,
    originalBankAmount:
      row.original_bank_amount !== undefined && row.original_bank_amount !== null
        ? Number(row.original_bank_amount)
        : sent?.originalBankAmount,
    originalBankCurrency: row.original_bank_currency || sent?.originalBankCurrency || undefined,
    refundOfTransactionId:
      row.refund_of_transaction_id || findTagValue(tags, 'refund_of:') || sent?.refundOfTransactionId,
  };
}
