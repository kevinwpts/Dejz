import { FixedExpense, Frequency } from '../types';
import { isFixedItemDueInPeriod, normalizeFrequencyValue } from './date';

/**
 * Formats a Date into local YYYY-MM-DD ISO string.
 */
export function getLocalIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates the default estimated last payment date based on a target date,
 * deduction day, and payment frequency.
 */
export function calculateLastPaymentDate(
  targetDate: string,
  deductionDay?: number,
  frequency?: Frequency | string,
  paymentTiming: 'advance' | 'arrears' = 'advance',
  startMonth?: number
): string {
  if (!targetDate) return targetDate;

  const parts = targetDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return targetDate;
  const [year, month, day] = parts;

  const endDate = new Date(year, month - 1, day);
  const dedDay = deductionDay && deductionDay > 0 ? deductionDay : 28;
  const freq = normalizeFrequencyValue(frequency);

  if (freq !== Frequency.MONTHLY && startMonth !== undefined) {
    const startM = Number.isFinite(Number(startMonth)) ? ((Number(startMonth) % 12) + 12) % 12 : 0;
    let months: number[] = [startM];
    if (freq === Frequency.SEMI_ANNUALLY) {
      months = [startM, (startM + 6) % 12];
    } else if (freq === Frequency.QUARTERLY) {
      months = [startM, (startM + 3) % 12, (startM + 6) % 12, (startM + 9) % 12];
    }

    const candidates: Date[] = [];
    for (const y of [year - 1, year, year + 1]) {
      for (const m of months) {
        const maxDays = new Date(y, m + 1, 0).getDate();
        candidates.push(new Date(y, m, Math.min(dedDay, maxDays)));
      }
    }
    candidates.sort((a, b) => a.getTime() - b.getTime());

    if (paymentTiming === 'advance') {
      const onOrBefore = candidates.filter((c) => c.getTime() <= endDate.getTime());
      if (onOrBefore.length > 0) {
        return getLocalIsoDate(onOrBefore[onOrBefore.length - 1]);
      }
    } else {
      const onOrAfter = candidates.filter((c) => c.getTime() >= endDate.getTime());
      if (onOrAfter.length > 0) {
        return getLocalIsoDate(onOrAfter[0]);
      }
    }
  }

  if (paymentTiming === 'advance') {
    let payDate = new Date(year, month - 1, Math.min(dedDay, new Date(year, month, 0).getDate()));
    if (payDate > endDate) {
      const prevMonthDate = new Date(year, month - 2, 1);
      const lastDayOfPrevMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
      payDate = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), Math.min(dedDay, lastDayOfPrevMonth));
    }
    return getLocalIsoDate(payDate);
  } else {
    let payDate = new Date(year, month - 1, Math.min(dedDay, new Date(year, month, 0).getDate()));
    if (payDate < endDate) {
      const nextMonthDate = new Date(year, month, 1);
      const lastDayOfNextMonth = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0).getDate();
      payDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), Math.min(dedDay, lastDayOfNextMonth));
    }
    return getLocalIsoDate(payDate);
  }
}

/**
 * Returns the effective last payment date for a cancelled fixed expense.
 * Uses explicit lastPaymentDate if present, or calculates it from cancellationDate and deductionDay
 * when payments still remain during a notice period.
 */
export function getLastPaymentDate(expense: FixedExpense): string | null {
  if (!expense?.isCancelled) return null;
  if (expense.hasNoMorePayments || expense.cancellationScenario === 'already_paid') {
    return null;
  }
  if (expense.lastPaymentDate) {
    return expense.lastPaymentDate;
  }
  if (expense.cancellationDate) {
    const rawStartM =
      expense.startMonth !== undefined
        ? expense.startMonth
        : (expense as any).periodOverrides?._start_month;
    const calculated = calculateLastPaymentDate(
      expense.cancellationDate,
      expense.deductionDay,
      expense.frequency || (expense as any).periodOverrides?._frequency,
      'advance',
      rawStartM
    );
    return calculated || expense.cancellationDate;
  }
  return null;
}

/**
 * Checks whether a cancelled fixed expense still has remaining planned payment(s) as of referenceDate.
 */
export function hasRemainingPayments(
  expense: FixedExpense,
  referenceDate: Date = new Date()
): boolean {
  if (!expense?.isCancelled) return true;
  if (expense.hasNoMorePayments || expense.cancellationScenario === 'already_paid') {
    return false;
  }
  const lastPay = getLastPaymentDate(expense);
  if (!lastPay) return false;
  const refIso = getLocalIsoDate(referenceDate);
  return refIso <= lastPay;
}

/**
 * Checks if a fixed expense is ended ("Avslutad"):
 * Only when the specified service end date (cancellationDate) has passed AND no payments remain.
 * If no service end date is specified, status remains "Uppsagd" (returns false).
 */
export function isExpenseCancelledAndExpired(
  expense: FixedExpense,
  referenceDate: Date = new Date()
): boolean {
  if (!expense?.isCancelled) return false;
  if (expense.cancellationDate) {
    const refIso = getLocalIsoDate(referenceDate);
    if (refIso <= expense.cancellationDate) return false;
  }
  return !hasRemainingPayments(expense, referenceDate);
}

/**
 * Returns the unified status label ("Aktiv", "Uppsagd", or "Avslutad") for an expense.
 */
export function getSubscriptionStatusLabel(
  expense: FixedExpense,
  lang: string = 'sv',
  referenceDate: Date = new Date()
): string {
  const isEn = lang === 'en';
  if (!expense?.isCancelled) {
    return isEn ? 'Active' : 'Aktiv';
  }
  if (isExpenseCancelledAndExpired(expense, referenceDate)) {
    return isEn ? 'Ended' : 'Avslutad';
  }
  return isEn ? 'Cancelled' : 'Uppsagd';
}

/**
 * Returns the scheduled payment date (YYYY-MM-DD) of a fixed expense within [periodStart, periodEnd], if due.
 */
export function getScheduledPaymentDateInPeriod(
  expense: FixedExpense,
  periodStart: Date,
  periodEnd: Date
): string | null {
  if (!isFixedItemDueInPeriod(expense, periodStart, periodEnd)) {
    return null;
  }

  const day = Number(expense.deductionDay) || 1;
  const freq = normalizeFrequencyValue(expense.frequency || (expense as any).periodOverrides?._frequency);
  const rawStartM =
    expense.startMonth !== undefined
      ? Number(expense.startMonth)
      : (expense as any).periodOverrides?._start_month !== undefined
      ? Number((expense as any).periodOverrides._start_month)
      : 0;
  const startM = Number.isFinite(rawStartM) ? ((rawStartM % 12) + 12) % 12 : 0;

  let months: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  if (freq === Frequency.ANNUALLY) {
    months = [startM];
  } else if (freq === Frequency.SEMI_ANNUALLY) {
    months = [startM, (startM + 6) % 12];
  } else if (freq === Frequency.QUARTERLY) {
    months = [startM, (startM + 3) % 12, (startM + 6) % 12, (startM + 9) % 12];
  }

  const pStartMs = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate()).getTime();
  const pEndMs = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate(), 23, 59, 59, 999).getTime();

  const yearsToCheck = Array.from(
    new Set([
      periodStart.getFullYear() - 1,
      periodStart.getFullYear(),
      periodEnd.getFullYear(),
      periodEnd.getFullYear() + 1,
    ])
  );

  for (const year of yearsToCheck) {
    for (const month of months) {
      const maxDays = new Date(year, month + 1, 0).getDate();
      const actualDay = Math.min(day, maxDays);
      const d = new Date(year, month, actualDay);
      const ms = d.getTime();
      if (ms >= pStartMs && ms <= pEndMs) {
        return getLocalIsoDate(d);
      }
    }
  }

  return null;
}

/**
 * Checks if any scheduled payment according to the expense's frequency occurs between startDate and endIso (inclusive).
 */
function hasAnyScheduledPaymentBetween(
  expense: FixedExpense,
  startDate: Date,
  endIso: string
): boolean {
  const parts = endIso.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const endDate = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
  if (endDate.getTime() < startDate.getTime()) return false;

  return isFixedItemDueInPeriod(expense, startDate, endDate);
}

/**
 * Evaluates whether a fixed expense is active for a given budget period [periodStart, periodEnd].
 * - Active expenses return true.
 * - Cancelled expenses with "Inga fler betalningar" preserve already-occurred payments in current/past periods
 *   (on or before cancelledAt) and plan zero future payments after cancelledAt.
 * - Cancelled expenses with "Betalningar återstår" count planned payments according to frequency up to and
 *   including lastPaymentDate, and none after.
 * - Service validity date (cancellationDate) never creates extra payments.
 */
export function isExpenseActiveForPeriod(
  expense: FixedExpense,
  periodStart: Date,
  periodEnd: Date
): boolean {
  if (!expense.isCancelled) return true;

  const pStartIso = getLocalIsoDate(periodStart);
  const pEndIso = getLocalIsoDate(periodEnd);
  const scheduledPayIso = getScheduledPaymentDateInPeriod(expense, periodStart, periodEnd);

  // Case 1: "Nej, inga fler betalningar"
  if (expense.hasNoMorePayments || expense.cancellationScenario === 'already_paid') {
    const cancelledAtDate = expense.cancelledAt ? new Date(expense.cancelledAt) : new Date();
    const cancelledAtIso = getLocalIsoDate(cancelledAtDate);

    // Past periods prior to cancellation remain untouched
    if (pEndIso < cancelledAtIso) {
      return true;
    }
    // Future periods after cancellation have no planned payments
    if (pStartIso > cancelledAtIso) {
      return false;
    }
    // Current period: keep payment if it was already due/registered on or before the cancellation date
    if (scheduledPayIso !== null) {
      return scheduledPayIso <= cancelledAtIso;
    }
    return false;
  }

  // Case 2: "Ja, betalningar återstår"
  const lastPayIso = getLastPaymentDate(expense);
  if (!lastPayIso) return false;

  // No payments planned after lastPaymentDate
  if (pStartIso > lastPayIso) {
    return false;
  }

  if (scheduledPayIso !== null) {
    return scheduledPayIso <= lastPayIso || (lastPayIso >= pStartIso && lastPayIso <= pEndIso);
  }

  return hasAnyScheduledPaymentBetween(expense, periodStart, lastPayIso);
}

/**
 * Evaluates whether a fixed expense payment is scheduled on a specific calendar date (e.g. for TodayView).
 */
export function isFixedPaymentScheduledOnDate(
  expense: FixedExpense,
  date: Date
): boolean {
  if (!expense.isCancelled) return true;

  const dateIso = getLocalIsoDate(date);

  if (expense.hasNoMorePayments || expense.cancellationScenario === 'already_paid') {
    const cancelledAtDate = expense.cancelledAt ? new Date(expense.cancelledAt) : new Date();
    const cancelledAtIso = getLocalIsoDate(cancelledAtDate);
    return dateIso <= cancelledAtIso;
  }

  const lastPayIso = getLastPaymentDate(expense);
  if (!lastPayIso) return false;
  return dateIso <= lastPayIso;
}

/**
 * Checks if an expense is marked as cancelled.
 */
export function isExpenseMarkedCancelled(expense: FixedExpense): boolean {
  return !!expense.isCancelled;
}

/**
 * Filter active fixed expenses for a given reference date or period boundaries.
 */
export function getActiveFixedExpenses(
  expenses: FixedExpense[],
  referenceDate: Date = new Date(),
  periodStart?: Date,
  periodEnd?: Date
): FixedExpense[] {
  if (!expenses) return [];

  if (periodStart && periodEnd) {
    return expenses.filter(e => isExpenseActiveForPeriod(e, periodStart, periodEnd));
  }

  return expenses.filter(e => !isExpenseCancelledAndExpired(e, referenceDate));
}

/**
 * Get all cancelled fixed expenses.
 */
export function getCancelledFixedExpenses(
  expenses: FixedExpense[]
): FixedExpense[] {
  return (expenses || []).filter(e => !!e.isCancelled);
}

/**
 * Formats ISO date string (YYYY-MM-DD) or Date into short localized string without trailing dot (e.g. '15 nov', '1 dec').
 */
export function formatShortDate(isoDate?: string | Date, lang: string = 'sv'): string {
  if (!isoDate) return '';
  let dateObj: Date;
  if (isoDate instanceof Date) {
    if (isNaN(isoDate.getTime())) return '';
    dateObj = isoDate;
  } else {
    const parts = isoDate.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return isoDate;
    dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const locale =
    lang === 'en'
      ? 'en-US'
      : lang === 'no'
      ? 'nb-NO'
      : lang === 'da'
      ? 'da-DK'
      : lang === 'fi'
      ? 'fi-FI'
      : 'sv-SE';
  return dateObj
    .toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    .replace(/\.$/, '');
}

/**
 * Calculates the next actual payment date (including month) for a fixed expense
 * using existing frequency, startMonth, deductionDay, and cancellation/end logic.
 */
export function getNextFixedExpensePaymentDate(
  expense: FixedExpense,
  referenceDate: Date = new Date()
): Date | null {
  if (!expense) return null;
  if (!expense.deductionDay || expense.deductionDay <= 0) return null;
  if (expense.isCancelled && !hasRemainingPayments(expense, referenceDate)) {
    return null;
  }

  const freq = expense.frequency || Frequency.MONTHLY;
  const isQuarterly =
    freq === Frequency.QUARTERLY ||
    (freq as string) === 'Kvartalsvis' ||
    (freq as string) === 'QUARTERLY';
  const isSemiAnnual =
    freq === Frequency.SEMI_ANNUALLY ||
    (freq as string) === 'Halvårsvis' ||
    (freq as string) === 'SEMI_ANNUALLY';
  const isAnnual =
    freq === Frequency.ANNUALLY ||
    (freq as string) === 'Årsvis' ||
    (freq as string) === 'ANNUALLY';
  const isNonMonthly = isQuarterly || isSemiAnnual || isAnnual;

  const rawStartMonth =
    expense.startMonth !== undefined && expense.startMonth !== null
      ? expense.startMonth
      : (expense.periodOverrides as any)?._start_month;

  if (
    isNonMonthly &&
    (rawStartMonth === undefined || rawStartMonth === null || isNaN(Number(rawStartMonth)))
  ) {
    return null;
  }

  const day = expense.deductionDay;
  const startM = rawStartMonth !== undefined && rawStartMonth !== null ? Number(rawStartMonth) : 0;

  let months: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  if (isQuarterly) {
    months = [startM, (startM + 3) % 12, (startM + 6) % 12, (startM + 9) % 12];
  } else if (isSemiAnnual) {
    months = [startM, (startM + 6) % 12];
  } else if (isAnnual) {
    months = [startM];
  }

  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  const yearsToCheck = [today.getFullYear(), today.getFullYear() + 1];
  const candidates: Date[] = [];

  for (const year of yearsToCheck) {
    for (const month of months) {
      const maxDaysInMonth = new Date(year, month + 1, 0).getDate();
      const actualDay = Math.min(day, maxDaysInMonth);
      candidates.push(new Date(year, month, actualDay));
    }
  }

  candidates.sort((a, b) => a.getTime() - b.getTime());

  let nextDate = candidates.find((d) => d.getTime() >= today.getTime()) || candidates[0] || null;

  const lastPayIso = getLastPaymentDate(expense);
  if (lastPayIso && nextDate) {
    const parts = lastPayIso.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const endLimit = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
      if (nextDate.getTime() > endLimit.getTime()) {
        nextDate = new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
  }

  return nextDate;
}

/**
 * Formats unified secondary status text for cancelled fixed expenses in lists:
 * "Uppsagd · Sista betalning 15 nov" or "Uppsagd · Inga fler betalningar" (or "Avslutad · ...").
 */
export function getCancelledListSecondaryText(
  expense: FixedExpense,
  lang: string = 'sv',
  referenceDate: Date = new Date()
): string {
  if (!expense?.isCancelled) return '';
  const isEn = lang === 'en';
  const statusLabel = getSubscriptionStatusLabel(expense, lang, referenceDate);
  const lastPay = getLastPaymentDate(expense);

  if (hasRemainingPayments(expense, referenceDate) && lastPay) {
    const formattedLast = formatShortDate(lastPay, lang);
    return isEn
      ? `${statusLabel} · Last payment ${formattedLast}`
      : `${statusLabel} · Sista betalning ${formattedLast}`;
  }

  if (expense.cancellationDate && getLocalIsoDate(referenceDate) <= expense.cancellationDate) {
    const formattedEnd = formatShortDate(expense.cancellationDate, lang);
    return isEn
      ? `${statusLabel} · Valid until ${formattedEnd}`
      : `${statusLabel} · Gäller till ${formattedEnd}`;
  }

  return isEn
    ? `${statusLabel} · No more payments`
    : `${statusLabel} · Inga fler betalningar`;
}

/**
 * Legacy alias for getCancelledListSecondaryText.
 */
export function getCancellationBadgeText(
  expense: FixedExpense,
  lang: string = 'sv'
): string | null {
  if (!expense?.isCancelled) return null;
  return getCancelledListSecondaryText(expense, lang);
}
