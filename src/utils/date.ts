import { WeekendAdjustment, PaydayType, Frequency } from '../types';
import { getLocaleFromLanguage } from './nordic';

export const getPaydayTypeFromDay = (day: number): PaydayType => {
  if (day === 1) return PaydayType.FIRST_DAY;
  if (day === 25) return PaydayType.TWENTY_FIFTH;
  if (day === 31) return PaydayType.LAST_DAY;
  return PaydayType.CUSTOM;
};

export const getActualPayday = (
  year: number,
  month: number,
  paydayType: PaydayType,
  targetDay: number,
  adjustment: WeekendAdjustment
) => {
  let day: number;
  
  // Prioritize explicit targetDay setting when specified
  if (typeof targetDay === 'number' && targetDay >= 1 && targetDay <= 31) {
    day = targetDay;
  } else if (paydayType === PaydayType.FIRST_DAY) {
    day = 1;
  } else if (paydayType === PaydayType.LAST_DAY) {
    day = new Date(year, month + 1, 0).getDate();
  } else if (paydayType === PaydayType.TWENTY_FIFTH) {
    day = 25;
  } else {
    day = 25;
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
  const locale = getLocaleFromLanguage(language);
  const getMonthName = (d: Date) => {
    const monthName = d.toLocaleString(locale, { month: 'long' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  };

  const lastDayOfEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  const isCalendarMonth = start.getDate() === 1 && (end.getDate() === lastDayOfEndMonth && start.getMonth() === end.getMonth());

  if (isCalendarMonth || paydayType === PaydayType.FIRST_DAY) {
    return getMonthName(start);
  } else if (paydayType === PaydayType.LAST_DAY) {
    return getMonthName(end);
  }
  
  const formatDate = (d: Date) => {
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
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

/**
 * Formats a date in compact localized form, e.g. "18 okt. 2026" in Swedish.
 */
export const formatShortDate = (
  date: Date | string | number,
  language: string = 'sv'
): string => {
  const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const locale = getLocaleFromLanguage(language);
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

export const normalizeFrequencyValue = (freq?: Frequency | string): Frequency => {
  if (!freq) return Frequency.MONTHLY;
  const s = String(freq).trim().toLowerCase();
  if (
    freq === Frequency.QUARTERLY ||
    s === 'kvartalsvis' ||
    s === 'quarterly' ||
    s === 'kvartal'
  ) {
    return Frequency.QUARTERLY;
  }
  if (
    freq === Frequency.SEMI_ANNUALLY ||
    s === 'halvårsvis' ||
    s === 'semi_annually' ||
    s === 'semi-annually' ||
    s === 'halvår'
  ) {
    return Frequency.SEMI_ANNUALLY;
  }
  if (
    freq === Frequency.ANNUALLY ||
    s === 'årsvis' ||
    s === 'annually' ||
    s === 'yearly' ||
    s === 'helår'
  ) {
    return Frequency.ANNUALLY;
  }
  return Frequency.MONTHLY;
};

export const isFixedItemDueInPeriod = (
  fe: {
    frequency?: Frequency | string;
    startMonth?: number;
    deductionDay?: number;
    periodOverrides?: Record<string, any>;
  },
  periodStart: Date,
  periodEnd: Date
): boolean => {
  const freq = normalizeFrequencyValue(fe.frequency || fe.periodOverrides?._frequency);
  if (freq === Frequency.MONTHLY) {
    return true;
  }

  const rawStartM =
    fe.startMonth !== undefined
      ? Number(fe.startMonth)
      : fe.periodOverrides?._start_month !== undefined
      ? Number(fe.periodOverrides._start_month)
      : 0;
  const startM = Number.isFinite(rawStartM) ? ((rawStartM % 12) + 12) % 12 : 0;
  const day = Number(fe.deductionDay) || 1;

  const yearsToCheck = Array.from(new Set([
    periodStart.getFullYear() - 1,
    periodStart.getFullYear(),
    periodEnd.getFullYear(),
    periodEnd.getFullYear() + 1
  ]));

  let months: number[] = [startM];
  if (freq === Frequency.SEMI_ANNUALLY) {
    months = [startM, (startM + 6) % 12];
  } else if (freq === Frequency.QUARTERLY) {
    months = [startM, (startM + 3) % 12, (startM + 6) % 12, (startM + 9) % 12];
  }

  const pStartMs = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate()).getTime();
  const pEndMs = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate(), 23, 59, 59, 999).getTime();

  for (const year of yearsToCheck) {
    for (const month of months) {
      const maxDaysInMonth = new Date(year, month + 1, 0).getDate();
      const actualDay = Math.min(day, maxDaysInMonth);
      const d = new Date(year, month, actualDay).getTime();
      if (d >= pStartMs && d <= pEndMs) {
        return true;
      }
    }
  }

  return false;
};

export const isFixedItemScheduledOnDay = (
  fe: {
    frequency?: Frequency | string;
    startMonth?: number;
    deductionDay?: number;
    periodOverrides?: Record<string, any>;
  },
  date: Date
): boolean => {
  const year = date.getFullYear();
  const currentMonth = date.getMonth();
  const maxDaysInMonth = new Date(year, currentMonth + 1, 0).getDate();
  const day = Number(fe.deductionDay) || 1;
  const actualDay = Math.min(day, maxDaysInMonth);

  if (date.getDate() !== actualDay) {
    return false;
  }

  const freq = normalizeFrequencyValue(fe.frequency || fe.periodOverrides?._frequency);
  if (freq === Frequency.MONTHLY) {
    return true;
  }

  const rawStartM =
    fe.startMonth !== undefined
      ? Number(fe.startMonth)
      : fe.periodOverrides?._start_month !== undefined
      ? Number(fe.periodOverrides._start_month)
      : 0;
  const startM = Number.isFinite(rawStartM) ? ((rawStartM % 12) + 12) % 12 : 0;
  const monthDiff = ((currentMonth - startM) % 12 + 12) % 12;

  if (freq === Frequency.QUARTERLY) return monthDiff % 3 === 0;
  if (freq === Frequency.SEMI_ANNUALLY) return monthDiff % 6 === 0;
  if (freq === Frequency.ANNUALLY) return monthDiff === 0;

  return true;
};

