import { FixedExpense } from '../types';

/**
 * Checks if a fixed expense is currently cancelled and expired (past its cancellation date).
 * - If expense.isCancelled is false -> not cancelled (active).
 * - If expense.isCancelled is true:
 *   - If no cancellationDate is set -> already expired/inactive.
 *   - If cancellationDate is set (e.g. '2026-10-31'):
 *     If referenceDate > cancellationDate -> cancellation date has passed (expired/inactive).
 *     If referenceDate <= cancellationDate -> still active until that date.
 */
export function isExpenseCancelledAndExpired(
  expense: FixedExpense,
  referenceDate: Date = new Date()
): boolean {
  if (!expense.isCancelled) return false;
  if (!expense.cancellationDate) return true;

  // Format reference date as YYYY-MM-DD
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  const refIso = `${year}-${month}-${day}`;

  return refIso > expense.cancellationDate;
}

/**
 * Checks if an expense is marked as cancelled (regardless of whether expiry date has passed).
 */
export function isExpenseMarkedCancelled(expense: FixedExpense): boolean {
  return !!expense.isCancelled;
}

/**
 * Filter active fixed expenses for a given reference date.
 * An expense is active if it's NOT cancelled, or if cancelled but its cancellation date hasn't passed yet.
 */
export function getActiveFixedExpenses(
  expenses: FixedExpense[],
  referenceDate: Date = new Date()
): FixedExpense[] {
  return (expenses || []).filter(e => !isExpenseCancelledAndExpired(e, referenceDate));
}

/**
 * Get all cancelled fixed expenses (either expired or marked as cancelled).
 */
export function getCancelledFixedExpenses(
  expenses: FixedExpense[]
): FixedExpense[] {
  return (expenses || []).filter(e => !!e.isCancelled);
}

/**
 * Formats cancellation status text for badges
 */
export function getCancellationBadgeText(
  expense: FixedExpense,
  lang: string = 'sv'
): string | null {
  if (!expense.isCancelled) return null;
  
  const isEn = lang === 'en';
  if (isExpenseCancelledAndExpired(expense)) {
    return isEn ? 'Expired' : 'Uppsagd';
  }

  if (expense.cancellationDate) {
    return isEn 
      ? `Cancelled (ends ${expense.cancellationDate})` 
      : `Uppsagd (slutar ${expense.cancellationDate})`;
  }

  return isEn ? 'Cancelled' : 'Uppsagd';
}
