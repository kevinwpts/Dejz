// Hittar par av överföringar: pengar ut från ett konto och samma belopp in på ett annat.
import { BankAccount, BankTransactionItem } from '../../../services/bank/types';
import { isLikelySwishTransactionText } from '../merchantRules';
import {
  getBankTxCodeDescription,
  getTxDate,
  getTxText,
  includesAny,
  isPendingBookingStatus,
} from '../txFields';
import { getNormalizedBankTxAmount } from './amount';
import { isInternalTransferOrMicroSavings } from './internalTransfer';

/** Max antal dagar mellan uttag och insättning för att räknas som samma överföring. */
const MAX_PAIR_DAY_GAP = 3;

/** Inkomster som aldrig ska paras ihop som överföring. */
const INCOME_OR_REFUND_WORDS = [
  'lön',
  'lon ',
  'salary',
  'löneutbetalning',
  'csn',
  'försäkringskassan',
  'barnbidrag',
  'pension',
  'a-kassa',
  'a kassa',
  'akassa',
  'skatteverket',
  'återköp',
  'retur',
  'refund',
  'kreditering',
  'återbetalning',
];

/** Id:n på transaktioner som redan är markerade eller ser ut som egna överföringar. */
function collectFlaggedTransferIds(
  transactions: BankTransactionItem[],
  userAccounts: BankAccount[]
): Set<string> {
  const ids = new Set<string>();
  for (const tx of transactions) {
    if (!tx || !tx.id) continue;
    if (
      tx.reconciliation_status === 'internal_transfer' ||
      isInternalTransferOrMicroSavings(tx, userAccounts)
    ) {
      ids.add(tx.id);
    }
  }
  return ids;
}

/** Sant om transaktionen får vara med i parningen (inte avbruten, ersatt, Swish eller kortköp). */
function isPairable(tx: BankTransactionItem, flaggedIds: Set<string>): boolean {
  if (!tx || !tx.id) return false;
  if (tx.booking_status === 'CNCL' || tx.booking_status === 'RJCT') return false;
  // Reserverade kortköp som inte redan flaggats som överföring paras aldrig bort
  if (isPendingBookingStatus(tx.booking_status) && !flaggedIds.has(tx.id)) return false;
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
  return !['card purchase', 'direct debit', 'payment', 'instant payment'].includes(
    getBankTxCodeDescription(tx)
  );
}

/** Antal dagar mellan två ISO-datum (0 om båda saknas men är lika, annars 999). */
function daysBetween(dateA: string, dateB: string): number {
  const aMs = Date.parse(`${dateA}T12:00:00`);
  const bMs = Date.parse(`${dateB}T12:00:00`);
  if (Number.isFinite(aMs) && Number.isFinite(bMs)) {
    return Math.abs(aMs - bMs) / (1000 * 60 * 60 * 24);
  }
  return dateA === dateB ? 0 : 999;
}

/** Den insättning som bäst matchar uttaget (samma belopp, nära i tid, annat konto), eller null. */
function findBestPairedInflow(
  outTx: BankTransactionItem,
  inflows: BankTransactionItem[],
  consumedIds: Set<string>,
  flaggedIds: Set<string>
): BankTransactionItem | null {
  const outAmt = Math.abs(getNormalizedBankTxAmount(outTx));
  const outDate = getTxDate(outTx);
  let bestIn: BankTransactionItem | null = null;
  let bestScore = -1;

  for (const inTx of inflows) {
    if (consumedIds.has(inTx.id) || inTx.id === outTx.id) continue;
    if (Math.abs(Math.abs(getNormalizedBankTxAmount(inTx)) - outAmt) > 0.01) continue;

    const dayDiff = daysBetween(outDate, getTxDate(inTx));
    if (dayDiff > MAX_PAIR_DAY_GAP) continue;

    const diffAcc =
      Boolean(outTx.bank_account_id && inTx.bank_account_id) &&
      outTx.bank_account_id !== inTx.bank_account_id;
    const oneFlagged = flaggedIds.has(outTx.id) || flaggedIds.has(inTx.id);
    if (!diffAcc && !oneFlagged) continue;

    const score = (diffAcc ? 100 : 0) + (oneFlagged ? 50 : 0) - dayDiff * 10;
    if (score > bestScore) {
      bestScore = score;
      bestIn = inTx;
    }
  }
  return bestIn;
}

/**
 * Hittar både enskilda och parvisa egna överföringar (uttag på konto A + insättning på konto B
 * med samma belopp inom 3 dagar) direkt i bankens råa transaktioner. Ger en mängd med id:n.
 */
export function findRawBankInternalTransferIds(
  transactions: BankTransactionItem[],
  userAccounts: BankAccount[] = []
): Set<string> {
  if (!Array.isArray(transactions) || transactions.length === 0) return new Set<string>();

  const internalIds = collectFlaggedTransferIds(transactions, userAccounts);
  const activeTxs = transactions.filter((tx) => isPairable(tx, internalIds));
  const outflows = activeTxs.filter((t) => getNormalizedBankTxAmount(t) < 0);
  const inflows = activeTxs.filter(
    (t) => getNormalizedBankTxAmount(t) > 0 && !includesAny(getTxText(t), INCOME_OR_REFUND_WORDS)
  );

  const consumedInflowIds = new Set<string>();
  for (const outTx of outflows) {
    if (Math.abs(getNormalizedBankTxAmount(outTx)) <= 0) continue;
    const bestIn = findBestPairedInflow(outTx, inflows, consumedInflowIds, internalIds);
    if (bestIn) {
      consumedInflowIds.add(bestIn.id);
      internalIds.add(outTx.id);
      internalIds.add(bestIn.id);
    }
  }
  return internalIds;
}
