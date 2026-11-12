// Små gemensamma hjälpare för att läsa fält ur en banktransaktion. Används i hela bankanalysen.
import { BankTransactionItem } from '../../services/bank/types';

/** Transaktionens datum (bokföring → transaktion → valuta), eller '' om inget datum finns. */
export function getTxDate(
  tx: Pick<BankTransactionItem, 'booking_date' | 'transaction_date' | 'value_date'>
): string {
  return tx.booking_date || tx.transaction_date || tx.value_date || '';
}

/** Beskrivning + motpart i gemener, t.ex. "kortköp ica nära ica nära". */
export function getTxText(tx: Pick<BankTransactionItem, 'description' | 'counterparty_name'>): string {
  return `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
}

/** Bankens transaktionskod i gemener (t.ex. "direct debit", "transfer"), eller ''. */
export function getBankTxCodeDescription(tx: BankTransactionItem): string {
  const rawJson = tx.raw_json && typeof tx.raw_json === 'object' ? tx.raw_json : null;
  return String(rawJson?.bank_transaction_code?.description || '').trim().toLowerCase();
}

/** Sant om texten innehåller något av orden. */
export function includesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}

/** Sant för reserverade (ännu inte bokförda) transaktioner. */
export function isPendingBookingStatus(status: string | null | undefined): boolean {
  return status === 'PDNG' || status === 'HOLD';
}

/** Sant om beloppen skiljer sig mer än 5 % mellan minsta och största (rörligt belopp). */
export function hasVariableAmounts(amounts: number[]): boolean {
  if (amounts.length < 2) return false;
  const minAmt = Math.min(...amounts);
  const maxAmt = Math.max(...amounts);
  return (maxAmt - minAmt) / (minAmt || 1) > 0.05;
}

/** Bankkoder som betyder överföring – sådana blir aldrig lön. */
const TRANSFER_BANK_CODES = [
  'transfer',
  'internal transfer',
  'account transfer',
  'instant payment',
] as const;

/** Sant om bankkoden är en ren överföring (se TRANSFER_BANK_CODES). */
export function isTransferBankCode(bankCode: string): boolean {
  return (TRANSFER_BANK_CODES as readonly string[]).includes(bankCode);
}
