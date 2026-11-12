// Hemflikens "Sedan sist"-blad: vilka köp som visas, när bladet öppnas och att markera dem som sedda
import { useState, useEffect, useCallback } from 'react';
import { hasInitializedReviewedTransactions, markTransactionsReviewed } from '../../utils/cache/itemMeta';
import type { TransactionItem } from '../../app/models';
import {
  planSinceLastVisit,
  SEEN_STORAGE_KEY,
  threeDaysBefore,
  type SinceLastVisitInputs,
} from './sinceLastVisit';

export function useSinceLastVisit({
  transactions,
  isInitialLoading,
  todayStr,
  fixedExpenses,
  incomes,
  hasBankConnection,
}: SinceLastVisitInputs) {
  // Initialize reviewed IDs on first run so only transactions from the last 3 days appear as new
  useEffect(() => {
    if (!transactions || transactions.length === 0) return;
    if (!hasInitializedReviewedTransactions()) {
      const cutoffStr = threeDaysBefore(todayStr);
      const olderIds = transactions.filter((t) => (t.date || '') < cutoffStr).map((t) => t.id);
      markTransactionsReviewed(olderIds);
    }
  }, [transactions, todayStr]);

  // "Sedan sist"-överblick för nya köp sedan förra besöket i appen
  const [sinceLastVisitTxs, setSinceLastVisitTxs] = useState<TransactionItem[]>([]);
  const [isSinceLastOpen, setIsSinceLastOpen] = useState(false);

  // Räkna ut "Sedan sist" direkt under render när köpen (eller lönedata) ändras.
  // Mönstret "justera state när props ändras": vi sparar vilka värden vi senast räknade på.
  const sinceLastInputs = { transactions, isInitialLoading, todayStr, fixedExpenses, incomes, hasBankConnection };
  const [prevSinceLastInputs, setPrevSinceLastInputs] = useState<typeof sinceLastInputs | null>(null);
  if (
    !prevSinceLastInputs ||
    prevSinceLastInputs.transactions !== transactions ||
    prevSinceLastInputs.isInitialLoading !== isInitialLoading ||
    prevSinceLastInputs.todayStr !== todayStr ||
    prevSinceLastInputs.fixedExpenses !== fixedExpenses ||
    prevSinceLastInputs.incomes !== incomes ||
    prevSinceLastInputs.hasBankConnection !== hasBankConnection
  ) {
    setPrevSinceLastInputs(sinceLastInputs);
    const plan = planSinceLastVisit(sinceLastInputs);
    if (plan && plan.txs.length > 0) {
      setSinceLastVisitTxs(plan.txs);
      setIsSinceLastOpen(true);
    }
  }

  // Första besöket: spara vilka köp som redan är "sedda" (sidoeffekt mot localStorage → i en effekt)
  useEffect(() => {
    const plan = planSinceLastVisit({ transactions, isInitialLoading, todayStr, fixedExpenses, incomes, hasBankConnection });
    if (!plan?.initialSeenIds) return;
    try {
      localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(plan.initialSeenIds));
    } catch {
      // ignore storage errors
    }
  }, [transactions, isInitialLoading, todayStr, fixedExpenses, incomes, hasBankConnection]);

  const dismissSinceLastVisit = useCallback(() => {
    setIsSinceLastOpen(false);
    try {
      const rawSeen = localStorage.getItem(SEEN_STORAGE_KEY);
      const seenSet = new Set<string>(rawSeen ? JSON.parse(rawSeen) : []);
      for (const tx of transactions || []) {
        if (tx.id) seenSet.add(tx.id);
      }
      for (const tx of sinceLastVisitTxs) {
        if (tx.id) seenSet.add(tx.id);
      }
      localStorage.setItem(
        SEEN_STORAGE_KEY,
        JSON.stringify(Array.from(seenSet).slice(-2500))
      );
      if (sinceLastVisitTxs.length > 0) {
        markTransactionsReviewed(sinceLastVisitTxs.map((t) => t.id));
      }
    } catch {
      // ignore
    }
  }, [transactions, sinceLastVisitTxs]);

  return { sinceLastVisitTxs, isSinceLastOpen, dismissSinceLastVisit };
}
