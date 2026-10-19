import { FixedExpense, Frequency } from '../types';
import { isFixedItemDueInPeriod } from './date';

/**
 * Calculates the default estimated last payment date based on end date (cancellationDate),
 * deduction day, and payment frequency.
 */
export function calculateLastPaymentDate(
  cancellationDate: string,
  deductionDay?: number,
  _frequency?: Frequency | string,
  paymentTiming: 'advance' | 'arrears' = 'advance'
): string {
  if (!cancellationDate) return cancellationDate;

  const parts = cancellationDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return cancellationDate;
  const [year, month, day] = parts;

  const endDate = new Date(year, month - 1, day);
  const dedDay = deductionDay && deductionDay > 0 ? deductionDay : 28;

  if (paymentTiming === 'advance') {
    // Subscription paid in advance: last payment happens on or before the end date.
    let payDate = new Date(year, month - 1, Math.min(dedDay, new Date(year, month, 0).getDate()));
    if (payDate > endDate) {
      // Step back 1 month
      const prevMonthDate = new Date(year, month - 2, 1);
      const lastDayOfPrevMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0).getDate();
      payDate = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), Math.min(dedDay, lastDayOfPrevMonth));
    }
    const yStr = payDate.getFullYear();
    const mStr = String(payDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(payDate.getDate()).padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  } else {
    // Payment in arrears
    let payDate = new Date(year, month - 1, Math.min(dedDay, new Date(year, month, 0).getDate()));
    if (payDate < endDate) {
      const nextMonthDate = new Date(year, month, 1);
      const lastDayOfNextMonth = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0).getDate();
      payDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), Math.min(dedDay, lastDayOfNextMonth));
    }
    const yStr = payDate.getFullYear();
    const mStr = String(payDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(payDate.getDate()).padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  }
}

/**
 * Returns the effective last payment date for a fixed expense.
 */
export function getLastPaymentDate(expense: FixedExpense): string | null {
  if (expense.lastPaymentDate) return expense.lastPaymentDate;
  if (!expense.cancellationDate) return null;
  return calculateLastPaymentDate(
    expense.cancellationDate,
    expense.deductionDay,
    expense.frequency
  );
}

/**
 * Checks if a fixed expense is currently cancelled and expired (past both last payment date and end date).
 */
export function isExpenseCancelledAndExpired(
  expense: FixedExpense,
  referenceDate: Date = new Date()
): boolean {
  if (!expense.isCancelled) return false;

  const lastPayStr = getLastPaymentDate(expense);
  const cancelStr = expense.cancellationDate;
  if (!lastPayStr && !cancelStr) return true;

  const refYear = referenceDate.getFullYear();
  const refMonth = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const refDay = String(referenceDate.getDate()).padStart(2, '0');
  const refIso = `${refYear}-${refMonth}-${refDay}`;

  const effectiveEndIso = lastPayStr || cancelStr!;
  return refIso > effectiveEndIso;
}

/**
 * Evaluates whether a cancelled expense is active and has remaining payment(s) in a given budget period.
 */
export function isExpenseActiveForPeriod(
  expense: FixedExpense,
  periodStart: Date,
  periodEnd: Date
): boolean {
  if (!expense.isCancelled) return true;

  const lastPayStr = getLastPaymentDate(expense);
  if (!lastPayStr) return false;

  const parts = lastPayStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const [y, m, d] = parts;
  const lastPayMs = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();

  // Check if expense is due in this period
  const isDueInPeriod = isFixedItemDueInPeriod(expense, periodStart, periodEnd);
  if (!isDueInPeriod) return false;

  const pStartMs = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate()).getTime();
  return pStartMs <= lastPayMs;
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
 * Formats ISO date string (YYYY-MM-DD) or Date into short localized string without trailing dot (e.g. '28 nov', '1 dec').
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

  // Respect end/cancellation logic if present
  const lastPayIso = getLastPaymentDate(expense) || expense.cancellationDate;
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
 * Formats cancellation status text for badges in lists and cards.
 */
export function getCancellationBadgeText(
  expense: FixedExpense,
  lang: string = 'sv'
): string | null {
  if (!expense.isCancelled) return null;
  const isEn = lang === 'en';

  if (isExpenseCancelledAndExpired(expense)) {
    return isEn ? 'Ended' : 'Uppsagd (Avslutat)';
  }

  const lastPay = getLastPaymentDate(expense);
  const cancelDate = expense.cancellationDate;

  if (lastPay && cancelDate && lastPay !== cancelDate) {
    const formattedLast = formatShortDate(lastPay, lang);
    return isEn ? `Cancelled · Last payment ${formattedLast}` : `Uppsagd · Sista betalning ${formattedLast}`;
  }

  if (cancelDate) {
    const formattedEnd = formatShortDate(cancelDate, lang);
    return isEn ? `Cancelled · Ends ${formattedEnd}` : `Uppsagd · Slutar ${formattedEnd}`;
  }

  return isEn ? 'Cancelled' : 'Uppsagd';
}

