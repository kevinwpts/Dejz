import { useEffect } from 'react';
import type { FixedExpenseItem } from '../models';
import type { PeriodInfo } from '../../utils/periodEngine';
import type { PeriodMatches } from '../../utils/budgetEngine';
import { getSavingsGoals, saveSavingsGoals } from '../../utils/appCache';

/**
 * Fyller på sparmål när ett månadssparande (fast utgift kopplad till ett mål) har dragits.
 * Med bank: när dragningen kopplats. Utan bank: när dragningsdagen passerat. Flyttad från App.tsx.
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
  // Automatisk påfyllning av Sparmål när en kopplad fast utgift (t.ex. Avanza månadssparande) matchas i perioden:
  // Varje unik banktransaktion bokförs högst en gång på målet via `tx-goal-${matchedTx.id}`.
  useEffect(() => {
    const linkedExps = fixedExpenses.filter((e) => e.linkedGoalId);
    if (linkedExps.length === 0) return;

    const goals = getSavingsGoals();
    if (!goals || goals.length === 0) return;

    let mutated = false;
    const nextGoals = goals.map((goal) => {
      let updatedGoal = goal;
      for (const exp of linkedExps) {
        if (exp.linkedGoalId !== goal.id) continue;
        const matchedTx = periodRecurringMatches.matchedFixedTxByExpId.get(exp.id);
        if (!matchedTx) continue;

        const activityId = `tx-goal-${matchedTx.id}`;
        const alreadyCredited = (updatedGoal.activities || []).some(
          (a) => a.id === activityId
        );
        if (alreadyCredited) continue;

        const shareRatio =
          exp.isShared && exp.fullAmount && exp.fullAmount > 0 && exp.amount > 0
            ? exp.amount / exp.fullAmount
            : 1;
        const creditAmt = Math.round(Math.abs(Number(matchedTx.amount) || 0) * shareRatio);
        if (creditAmt <= 0) continue;

        mutated = true;
        updatedGoal = {
          ...updatedGoal,
          currentAmount: (Number(updatedGoal.currentAmount) || 0) + creditAmt,
          activities: [
            {
              id: activityId,
              text: `${exp.name} (+${creditAmt.toLocaleString('sv-SE')} kr)`,
              date: matchedTx.date,
              amount: creditAmt,
            },
            ...(updatedGoal.activities || []),
          ],
        };
      }
      return updatedGoal;
    });

    if (mutated) {
      saveSavingsGoals(nextGoals);
    }
  }, [fixedExpenses, periodRecurringMatches]);

  // Utan bank: ett månadssparande (fast utgift kopplad till ett sparmål) läggs till i målet
  // en gång per löneperiod när dragningsdagen har passerat – samma period som det dras av från "kvar".
  useEffect(() => {
    if (hasActiveBankConnection) return; // med bank sköts det av matchningen ovan
    const linkedExps = fixedExpenses.filter(
      (e) => e.linkedGoalId && !e.isCancelled && Number(e.amount) > 0
    );
    if (linkedExps.length === 0 || !period?.startDate) return;
    const goals = getSavingsGoals();
    if (!goals || goals.length === 0) return;

    const start = new Date(period.startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const periodKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(
      start.getDate()
    ).padStart(2, '0')}`;

    // Har dragningsdagen (t.ex. den 25:e) inträffat mellan periodens start och idag?
    const dueDatePassed = (dueDay: number): string | null => {
      for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        if (d.getDate() === Math.min(Math.max(1, dueDay), lastDay)) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
            d.getDate()
          ).padStart(2, '0')}`;
        }
      }
      return null;
    };

    let mutated = false;
    const nextGoals = goals.map((goal) => {
      let updatedGoal = goal;
      for (const exp of linkedExps) {
        if (exp.linkedGoalId !== goal.id) continue;
        const dueIso = dueDatePassed(Number(exp.dueDay) || 25);
        if (!dueIso) continue;
        const activityId = `fixed-goal-${exp.id}-${periodKey}`;
        if ((updatedGoal.activities || []).some((a) => a.id === activityId)) continue;
        const creditAmt = Math.round(Number(exp.amount) || 0);
        if (creditAmt <= 0) continue;
        mutated = true;
        updatedGoal = {
          ...updatedGoal,
          currentAmount: (Number(updatedGoal.currentAmount) || 0) + creditAmt,
          activities: [
            {
              id: activityId,
              text: `Månadssparande (+${creditAmt.toLocaleString('sv-SE')} kr)`,
              date: dueIso,
              amount: creditAmt,
            },
            ...(updatedGoal.activities || []),
          ],
        };
      }
      return updatedGoal;
    });

    if (mutated) {
      saveSavingsGoals(nextGoals); // skickar själv 'dejz:goals-updated' så vyerna uppdateras
    }
  }, [fixedExpenses, period, hasActiveBankConnection]);
}
