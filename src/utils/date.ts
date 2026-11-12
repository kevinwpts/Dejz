import { WeekendAdjustment, PaydayType } from '../types';

const getActualPayday = (
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

