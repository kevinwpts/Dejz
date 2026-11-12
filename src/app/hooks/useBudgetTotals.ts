import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FixedExpenseItem, IncomeItem, TransactionItem } from '../models';
import type { BankAccount } from '../../services/bank/types';
import type { PeriodInfo } from '../../utils/periodEngine';
import { getManualBalance, ManualBalance } from '../../utils/cache/manualBalance';
import { isTransactionManuallyExcluded } from '../../utils/cache/categories';
import { isInternalTransferTransaction } from '../../utils/transferDetection';
import {
  computeDagsbudget,
  computeKvar,
  computeKvarFromBalance,
  computeTotalFixed,
  computeTotalIncome,
  computeVariableSpent,
  PeriodMatches,
} from '../../utils/budgetEngine';

/**
 * Hemkortets siffror: inkomst, fasta, rörligt, kvar att spendera och dagsbudget.
 * Själva räknereglerna finns i utils/budgetEngine.ts – här kopplas de ihop med appens data.
 * Flyttad från App.tsx.
 */
export function useBudgetTotals({
  incomes,
  fixedExpenses,
  transactions,
  periodTransactions,
  periodRecurringMatches,
  period,
  targetPayday,
  hasActiveBankConnection,
  excludeInternalTransfers,
  internalTransferIds,
  bankAccounts,
  userEmail,
  userName,
  isInitialLoading,
  userId,
}: {
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  periodTransactions: TransactionItem[];
  periodRecurringMatches: PeriodMatches;
  period: PeriodInfo;
  targetPayday: number;
  hasActiveBankConnection: boolean;
  excludeInternalTransfers: boolean;
  internalTransferIds: Set<string>;
  bankAccounts: BankAccount[];
  userEmail: string | null;
  userName: string | null;
  isInitialLoading: boolean;
  userId: string | null;
}) {
  // Total inkomst under aktuell period (faktiskt bokfört belopp för lön/inkomst som redan kommit in, annars mallbelopp + eventuella extra engångsinkomster i perioden)
  // Allt räknas i räknemotorn (utils/budgetEngine.ts) – samma regler överallt i appen
  const isIgnoredTx = useCallback(
    (t: TransactionItem) =>
      isTransactionManuallyExcluded(t.id) ||
      (excludeInternalTransfers &&
        (internalTransferIds.has(t.id) ||
          isInternalTransferTransaction(t, bankAccounts, userEmail, userName))),
    [excludeInternalTransfers, internalTransferIds, bankAccounts, userEmail, userName]
  );

  const totalIncome = useMemo(
    () =>
      computeTotalIncome({
        incomes,
        periodTransactions,
        matches: periodRecurringMatches,
        isIgnored: isIgnoredTx,
      }),
    [incomes, periodTransactions, periodRecurringMatches, isIgnoredTx]
  );

  // Totala fasta kostnader under aktuell period (faktiskt bokfört belopp för räkningar som redan dragits, annars mallbelopp)
  const totalFixedExpenses = useMemo(
    () => computeTotalFixed(fixedExpenses, periodRecurringMatches, period),
    [fixedExpenses, periodRecurringMatches, period]
  );


  // Totala rörliga köp under aktuell period:
  // - Exkluderar ENDAST den specifika transaktion som matchats 1-till-1 mot varje fast utgift (så att 2:a köpet hos samma handlare eller engångsköp hos Apple/Klarna alltid räknas i Rörligt).
  // - Räknar av butiksreturer ('Återbetalning') samt mottagna Swish-utläggsersättningar som inte redan länkats till ett specifikt köp.
  const totalVariableSpent = useMemo(
    () =>
      computeVariableSpent({
        allTransactions: transactions,
        periodTransactions,
        matches: periodRecurringMatches,
        isIgnored: isIgnoredTx,
      }),
    [transactions, periodTransactions, periodRecurringMatches, isIgnoredTx]
  );

  // "Saldo just nu" (utan bank): användaren skriver in vad som finns på kontot
  const [manualBalance, setManualBalance] = useState<ManualBalance | null>(() =>
    getManualBalance()
  );
  // Läs om när inloggningen/laddningen ändras – profilen kan ha laddat ett saldo från en annan enhet
  const [prevLoadState, setPrevLoadState] = useState({ isInitialLoading, userId });
  if (prevLoadState.isInitialLoading !== isInitialLoading || prevLoadState.userId !== userId) {
    setPrevLoadState({ isInitialLoading, userId });
    setManualBalance(getManualBalance());
  }
  useEffect(() => {
    const reload = () => setManualBalance(getManualBalance());
    window.addEventListener('dejz-manual-balance', reload);
    return () => window.removeEventListener('dejz-manual-balance', reload);
  }, []);

  // Saldot gäller bara i den löneperiod det skrevs in
  const activeManualBalance = useMemo(() => {
    if (!manualBalance || hasActiveBankConnection) return null;
    const at = new Date(manualBalance.at);
    if (isNaN(at.getTime()) || at.getTime() < period.startDate.getTime()) return null;
    return manualBalance;
  }, [manualBalance, period, hasActiveBankConnection]);

  // Kvar = saldo − räkningar som dras efter att saldot skrevs in − köp sedan dess + inkomster som kommer före lön
  const kvarFromBalance = useMemo(() => {
    if (!activeManualBalance) return null;
    return computeKvarFromBalance({
      balance: activeManualBalance,
      fixedExpenses,
      incomes,
      period,
      targetPayday,
      periodTransactions,
      matches: periodRecurringMatches,
      isIgnored: (t) => isTransactionManuallyExcluded(t.id),
    });
  }, [
    activeManualBalance,
    fixedExpenses,
    incomes,
    period,
    targetPayday,
    periodTransactions,
    periodRecurringMatches,
  ]);

  // Kvar att spendera under aktuell period (kan vara negativt om man gått över budget)
  const kvarAttSpendera = useMemo(
    () =>
      computeKvar({
        kvarFromBalance,
        totalIncome,
        totalFixed: totalFixedExpenses,
        totalVariableSpent,
      }),
    [kvarFromBalance, totalIncome, totalFixedExpenses, totalVariableSpent]
  );

  // Dagsbudget
  const dagsbudget = useMemo(
    () => computeDagsbudget(kvarAttSpendera, period.daysRemaining),
    [kvarAttSpendera, period.daysRemaining]
  );

  return {
    totalIncome,
    totalFixedExpenses,
    totalVariableSpent,
    manualBalance,
    activeManualBalance,
    kvarAttSpendera,
    dagsbudget,
  };
}
