import { useEffect } from 'react';
import type { FixedExpenseItem } from '../models';
import type { PeriodInfo } from '../../utils/periodEngine';
import type { PeriodMatches } from '../../utils/budgetEngine';
import { getSavingsGoals, saveSavingsGoals } from '../../utils/cache/itemMeta';
import { creditGoalsFromBankMatches, creditGoalsWithoutBank } from '../../utils/goalCredit';

/**
 * Fyller på sparmål när ett månadssparande (fast utgift kopplad till ett mål) har dragits.
 * Med bank: när dragningen kopplats. Utan bank: när dragningsdagen passerat.
 * Reglerna finns i utils/goalCredit.ts (med tester).
 */
export function useSavingsGoalCredit({
  fixedExpenses,
  periodRecurringMatches,
  period,
  hasActiveBankConnection,
}: {
  fixedExpenses: FixedExpenseItem[];
  periodRecurringMatches: PeriodMatches;
  period: PeriodInfo;
  hasActiveBankConnection: boolean;
}) {
  // Med bank: när dragningen kopplats (varje banktransaktion bokas högst en gång)
  useEffect(() => {
    if (!fixedExpenses.some((e) => e.linkedGoalId)) return;
    const goals = getSavingsGoals();
    if (!goals || goals.length === 0) return;
    const result = creditGoalsFromBankMatches(goals, fixedExpenses, periodRecurringMatches.matchedFixedTxByExpId);
    if (result.mutated) saveSavingsGoals(result.goals);
  }, [fixedExpenses, periodRecurringMatches]);

  // Utan bank: en gång per löneperiod när dragningsdagen passerat
  useEffect(() => {
    if (hasActiveBankConnection || !period?.startDate) return;
    if (!fixedExpenses.some((e) => e.linkedGoalId)) return;
    const goals = getSavingsGoals();
    if (!goals || goals.length === 0) return;
    const result = creditGoalsWithoutBank(goals, fixedExpenses, period.startDate, new Date());
    if (result.mutated) saveSavingsGoals(result.goals); // skickar själv 'dejz:goals-updated'
  }, [fixedExpenses, period, hasActiveBankConnection]);
}
