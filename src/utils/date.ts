import { WeekendAdjustment, PaydayType } from '../types';

export const getActualPayday = (year: number, month: number, paydayType: PaydayType, targetDay: number, adjustment: WeekendAdjustment) => {
  let day: number;
  
  if (paydayType === PaydayType.FIRST_DAY) {
    day = 1;
  } else if (paydayType === PaydayType.LAST_DAY) {
    day = new Date(year, month + 1, 0).getDate();
  } else if (paydayType === PaydayType.TWENTY_FIFTH) {
    day = 25;
  } else {
    day = targetDay;
  }

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const actualDay = Math.min(day, lastDayOfMonth);
  const date = new Date(year, month, actualDay);
  
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  if (adjustment === WeekendAdjustment.BEFORE) {
    if (dayOfWeek === 6) date.setDate(date.getDate() - 1);
    else if (dayOfWeek === 0) date.setDate(date.getDate() - 2);
  } else if (adjustment === WeekendAdjustment.AFTER) {
    if (dayOfWeek === 6) date.setDate(date.getDate() + 2);
    else if (dayOfWeek === 0) date.setDate(date.getDate() + 1);
  }
  return date;
};

export const getPeriodBoundaries = (date: Date, paydayType: PaydayType, paydaySetting: number, adjustment: WeekendAdjustment) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  const thisMonthPayday = getActualPayday(d.getFullYear(), d.getMonth(), paydayType, paydaySetting, adjustment);
  
  let periodStart: Date;
  let periodMonth: number;
  const periodYear = d.getFullYear();

  if (d >= thisMonthPayday) {
    periodStart = thisMonthPayday;
    periodMonth = d.getMonth();
  } else {
    periodStart = getActualPayday(d.getFullYear(), d.getMonth() - 1, paydayType, paydaySetting, adjustment);
    periodMonth = d.getMonth() - 1;
  }
  
  const nextSalaryDate = getActualPayday(periodYear, periodMonth + 1, paydayType, paydaySetting, adjustment);
  
  const periodEnd = new Date(nextSalaryDate);
  periodEnd.setDate(periodEnd.getDate() - 1);
  periodEnd.setHours(23, 59, 59, 999);
  
  return { start: periodStart, end: periodEnd };
};

export const getPeriodName = (start: Date, end: Date, paydayType: PaydayType, language: string) => {
  const getMonthName = (d: Date) => {
    const monthName = d.toLocaleString(language === 'en' ? 'en-US' : 'sv-SE', { month: 'long' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  if (paydayType === PaydayType.FIRST_DAY) {
    return getMonthName(start);
  } else if (paydayType === PaydayType.LAST_DAY) {
    return getMonthName(end);
  }
  
  const formatDate = (d: Date) => {
    return d.toLocaleDateString(language === 'en' ? 'en-US' : 'sv-SE', { day: 'numeric', month: 'short' });
  };
  
  return `${getMonthName(end)} (${formatDate(start)} - ${formatDate(end)})`;
};

export const getPeriodId = (start: Date) => {
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Formats a date with weekday, day, and month adhering to Swedish grammatical standards
 * (capitalized first letter of weekday, lowercase month name: "Onsdag 30 september").
 * In English: "Wednesday, September 30" (or with options).
 */
export const formatFullDate = (
  date: Date | string | number,
  language: string = 'sv-SE',
  options?: { includeYear?: boolean }
): string => {
  const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const locale =
    language === 'en' || language === 'en-US'
      ? 'en-US'
      : language === 'no' || language === 'nb-NO'
      ? 'nb-NO'
      : language === 'da' || language === 'da-DK'
      ? 'da-DK'
      : language === 'fi' || language === 'fi-FI'
      ? 'fi-FI'
      : 'sv-SE';

  const raw = d.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(options?.includeYear ? { year: 'numeric' } : {})
  });

  // Capitalize ONLY the initial letter of the string (the weekday).
  // In Swedish, weekday and month names are lowercase in running text, so only
  // the first letter of the heading should be capitalized ("Onsdag 30 september").
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export const isVariableItemDue = (
  deductionDay: number = 1,
  periodStart?: Date,
  periodEnd?: Date,
  referenceDate: Date = new Date()
): boolean => {
  if (!periodStart || !periodEnd) {
    const today = referenceDate.getDate();
    return today >= deductionDay;
  }

  const start = new Date(periodStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(periodEnd);
  end.setHours(23, 59, 59, 999);

  // Check candidate dates in periodStart month and periodEnd month
  const candidates = [
    new Date(start.getFullYear(), start.getMonth(), deductionDay),
    new Date(end.getFullYear(), end.getMonth(), deductionDay),
  ];

  let targetDueDate: Date | null = null;
  for (const cand of candidates) {
    if (cand >= start && cand <= end) {
      targetDueDate = cand;
      break;
    }
  }

  if (!targetDueDate) {
    targetDueDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), deductionDay);
  }

  targetDueDate.setHours(0, 0, 0, 0);
  const ref = new Date(referenceDate);
  ref.setHours(23, 59, 59, 999);

  return ref >= targetDueDate;
};

export const parseReceiptDate = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date && !isNaN(dateStr.getTime())) return dateStr;
  if (typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();
  const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10) - 1;
    const d = parseInt(ymdMatch[3], 10);
    const dateObj = new Date(y, m, d, 12, 0, 0);
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10) - 1;
    const y = parseInt(dmyMatch[3], 10);
    const dateObj = new Date(y, m, d, 12, 0, 0);
    if (!isNaN(dateObj.getTime())) return dateObj;
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
};
