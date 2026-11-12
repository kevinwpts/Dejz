// "Sedan sist" på hemfliken: räknar ut vilka nya köp som kommit sedan förra besöket
import { deduplicateTransactions } from '../../utils/transactionDedup';
import { checkIsRecurringTransaction } from '../../utils/recurring/checkRecurring';
import type { FixedExpenseItem, IncomeItem, TransactionItem } from '../../app/models';

export const SEEN_STORAGE_KEY = 'dejz_seen_tx_ids_v2';

export interface SinceLastVisitInputs {
  transactions: TransactionItem[];
  isInitialLoading: boolean;
  todayStr: string;
  fixedExpenses: FixedExpenseItem[];
  incomes: IncomeItem[];
  hasBankConnection?: boolean;
}

export interface SinceLastVisitPlan {
  /** Köp som ska visas i "Sedan sist" (tom lista = visa inget nytt) */
  txs: TransactionItem[];
  /** Bara första besöket: id:n som ska sparas som redan sedda */
  initialSeenIds: string[] | null;
}

/** Datumet tre dagar före `todayStr` (YYYY-MM-DD) – äldre köp räknas inte som nya */
export function threeDaysBefore(todayStr: string): string {
  const parts = todayStr.split('-');
  const d = new Date(
    Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10) - 3, 12, 0, 0)
  );
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;
}

/**
 * "Sedan sist": vilka nya köp har kommit sedan förra besöket? Läser bara från localStorage –
 * att spara "sedda" köp görs separat i en effekt. Returnerar null när inget ska räknas ut.
 */
export function planSinceLastVisit({
  transactions,
  isInitialLoading,
  todayStr,
  fixedExpenses,
  incomes,
  hasBankConnection,
}: SinceLastVisitInputs): SinceLastVisitPlan | null {
  if (!hasBankConnection) return null;
  if (isInitialLoading || !transactions || transactions.length === 0) return null;
  try {
    const deduped = deduplicateTransactions(transactions);
    const recentCutoff = threeDaysBefore(todayStr);

    const rawSeen = localStorage.getItem(SEEN_STORAGE_KEY);
    if (!rawSeen) {
      // Första gången: visa senaste inköpsdagens rörliga köp (om det finns köp senaste 3 dagarna)
      const recentExpenses = deduped.filter(
        (tx) =>
          !tx.isExcluded &&
          tx.type === 'expense' &&
          (tx.date || '') >= recentCutoff &&
          (tx.date || '') <= todayStr &&
          !checkIsRecurringTransaction(tx, fixedExpenses, incomes).isRecurring
      );

      if (recentExpenses.length > 0) {
        const latestDate = recentExpenses.reduce(
          (maxD, tx) => ((tx.date || '') > maxD ? tx.date : maxD),
          ''
        );
        const batch = recentExpenses
          .filter((tx) => tx.date === latestDate)
          .slice(0, 6);
        const batchIdSet = new Set(batch.map((b) => b.id));
        const initialSeen = deduped
          .filter((tx) => !batchIdSet.has(tx.id))
          .map((tx) => tx.id);
        return { txs: batch, initialSeenIds: initialSeen };
      }
      return { txs: [], initialSeenIds: deduped.map((tx) => tx.id) };
    }

    const seenSet = new Set<string>(JSON.parse(rawSeen) || []);
    const newlyArrived = deduped
      .filter(
        (tx) =>
          !seenSet.has(tx.id) &&
          !tx.isExcluded &&
          tx.type === 'expense' &&
          (tx.date || '') >= recentCutoff &&
          (tx.date || '') <= todayStr &&
          !checkIsRecurringTransaction(tx, fixedExpenses, incomes).isRecurring
      )
      .slice(0, 8);
    return { txs: newlyArrived, initialSeenIds: null };
  } catch {
    // ignore storage errors
    return null;
  }
}
