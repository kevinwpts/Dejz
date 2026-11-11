import { useEffect } from 'react';
import type { FixedExpenseItem, TransactionItem } from '../../components/HomeTab';
import type { PeriodInfo } from '../../utils/periodEngine';
import type { PeriodMatches } from '../../utils/budgetEngine';
import { isDemoMode } from '../../utils/demoUtils';
import { formatIsoDateStockholm } from '../../utils/swedishDate';
import { estimateVariableBill } from '../../utils/variableBills';

/** Flyttad från App.tsx. Se utils/variableBills.ts för hur uppskattningen räknas. */
export function useVariableBillEstimates({
  fixedExpenses,
  transactions,
  period,
  periodRecurringMatches,
  hasActiveBankConnection,
  onUpdateFixed,
}: {
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  period: PeriodInfo;
  periodRecurringMatches: PeriodMatches & { matchedFixedIds: Set<string> };
  hasActiveBankConnection: boolean;
  onUpdateFixed: (exp: FixedExpenseItem) => unknown;
}) {
  // Räkningar som varierar (el m.m.): uppskatta nästa dragning som snittet av de 3 senaste.
  // Körs högst en gång per räkning och löneperiod, bara innan räkningen dragits, och bara med bank.
  // Ändrar man beloppet själv efteråt får det stå kvar resten av perioden.
  useEffect(() => {
    if (isDemoMode() || !hasActiveBankConnection || !period?.startDate) return;
    const periodStartIso = formatIsoDateStockholm(period.startDate);
    for (const exp of fixedExpenses) {
      if (periodRecurringMatches.matchedFixedIds.has(exp.id)) continue;
      const est = estimateVariableBill(exp, transactions, periodStartIso);
      if (!est || Math.abs(est.estimate - (Number(exp.amount) || 0)) < 10) continue;
      const doneKey = `dejz_varbill_estimate:${exp.id}:${periodStartIso}`;
      try {
        if (localStorage.getItem(doneKey)) continue;
        localStorage.setItem(doneKey, String(est.estimate));
      } catch {
        continue;
      }
      void onUpdateFixed({ ...exp, amount: est.estimate });
    }
  }, [hasActiveBankConnection, period?.startDate, fixedExpenses, transactions, periodRecurringMatches]);
}
