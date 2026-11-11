import type { FixedExpenseItem, TransactionItem } from '../app/models';
import type { SavingsGoalItem } from './appCache';
import { getFixedShareRatio } from './budgetEngine';

/**
 * Påfyllning av sparmål när ett månadssparande (fast utgift kopplad till ett mål) har dragits.
 * Rena funktioner – inga sidoeffekter – så att reglerna går att testa (__tests__/goalCredit.test.ts).
 * Varje påfyllning har ett eget id i målets aktiviteter, så den kan aldrig bokas två gånger.
 */

export interface GoalCreditResult {
  goals: SavingsGoalItem[];
  mutated: boolean;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Med bank: fyll på när dragningen kopplats till månadssparandet (riktigt belopp, din andel). */
export function creditGoalsFromBankMatches(
  goals: SavingsGoalItem[],
  fixedExpenses: FixedExpenseItem[],
  matchedFixedTxByExpId: Map<string, TransactionItem>
): GoalCreditResult {
  const linkedExps = fixedExpenses.filter((e) => e.linkedGoalId);
  let mutated = false;
  const next = goals.map((goal) => {
    let updatedGoal = goal;
    for (const exp of linkedExps) {
      if (exp.linkedGoalId !== goal.id) continue;
      const matchedTx = matchedFixedTxByExpId.get(exp.id);
      if (!matchedTx) continue;
      const activityId = `tx-goal-${matchedTx.id}`;
      if ((updatedGoal.activities || []).some((a) => a.id === activityId)) continue;
      const creditAmt = Math.round(Math.abs(Number(matchedTx.amount) || 0) * getFixedShareRatio(exp));
      if (creditAmt <= 0) continue;
      mutated = true;
      updatedGoal = {
        ...updatedGoal,
        currentAmount: (Number(updatedGoal.currentAmount) || 0) + creditAmt,
        activities: [
          { id: activityId, text: `${exp.name} (+${creditAmt.toLocaleString('sv-SE')} kr)`, date: matchedTx.date, amount: creditAmt },
          ...(updatedGoal.activities || []),
        ],
      };
    }
    return updatedGoal;
  });
  return { goals: next, mutated };
}

/**
 * Utan bank: fyll på en gång per löneperiod när dragningsdagen (t.ex. den 25:e) har passerat –
 * samma period som beloppet dras av från "kvar".
 */
export function creditGoalsWithoutBank(
  goals: SavingsGoalItem[],
  fixedExpenses: FixedExpenseItem[],
  periodStartDate: Date,
  todayDate: Date
): GoalCreditResult {
  const linkedExps = fixedExpenses.filter((e) => e.linkedGoalId && !e.isCancelled && Number(e.amount) > 0);
  const start = new Date(periodStartDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date(todayDate);
  today.setHours(0, 0, 0, 0);
  const periodKey = ymd(start);

  // Har dragningsdagen inträffat mellan periodens start och idag? Ger datumet i så fall.
  const dueDatePassed = (dueDay: number): string | null => {
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      if (d.getDate() === Math.min(Math.max(1, dueDay), lastDay)) return ymd(d);
    }
    return null;
  };

  let mutated = false;
  const next = goals.map((goal) => {
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
          { id: activityId, text: `Månadssparande (+${creditAmt.toLocaleString('sv-SE')} kr)`, date: dueIso, amount: creditAmt },
          ...(updatedGoal.activities || []),
        ],
      };
    }
    return updatedGoal;
  });
  return { goals: next, mutated };
}
