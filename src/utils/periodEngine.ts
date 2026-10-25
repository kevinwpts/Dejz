/**
 * Period Engine för Dejz
 *
 * Regler:
 * 1. En period startar dagen man får lön (00:00:00).
 * 2. En period slutar dagen innan nästa lön (23:59:59).
 * 3. Helghantering kan väljas i inställningar:
 *    - 'before': Närmaste vardag före (fredag) om lönedagen infaller på lördag/söndag
 *    - 'after':  Närmaste vardag efter (måndag) om lönedagen infaller på lördag/söndag
 *    - 'none':   Ingen helgjustering (exakt lönedag)
 */

export type WeekendHandlingMode = 'before' | 'after' | 'none';

export interface PeriodInfo {
  startDate: Date;
  endDate: Date;
  nextPaydayDate: Date;
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  startLabel: string;
  endLabel: string;
  nextPayLabel: string;
  isAdjustedForWeekend: boolean;
  weekendAdjustmentNote?: string;
  targetPayday: number;
  weekendHandling: WeekendHandlingMode;
}

const MONTH_NAMES_SHORT = [
  'jan',
  'feb',
  'mar',
  'apr',
  'maj',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
];

const WEEKDAY_NAMES = [
  'söndag',
  'måndag',
  'tisdag',
  'onsdag',
  'torsdag',
  'fredag',
  'lördag',
];

/**
 * Returnerar det faktiska utbetalningsdatumet för en given månad med vald helghantering.
 */
export function getActualPayday(
  year: number,
  month: number,
  targetDay: number = 25,
  weekendHandling: WeekendHandlingMode = 'before'
): Date {
  // Kontrollera sista dagen i månaden så att vi inte överskrider (t.ex. 31 feb -> 28/29 feb)
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(Math.max(1, targetDay), lastDayOfMonth);

  const date = new Date(year, month, clampedDay, 0, 0, 0, 0);
  const dayOfWeek = date.getDay(); // 0 = Sön, 6 = Lör

  if (weekendHandling === 'before') {
    if (dayOfWeek === 6) {
      // Lördag -> betalas ut fredagen före
      date.setDate(date.getDate() - 1);
    } else if (dayOfWeek === 0) {
      // Söndag -> betalas ut fredagen före
      date.setDate(date.getDate() - 2);
    }
  } else if (weekendHandling === 'after') {
    if (dayOfWeek === 6) {
      // Lördag -> betalas ut måndagen efter
      date.setDate(date.getDate() + 2);
    } else if (dayOfWeek === 0) {
      // Söndag -> betalas ut måndagen efter
      date.setDate(date.getDate() + 1);
    }
  }

  return date;
}

/**
 * Beräknar aktuell löneperiod (från dagen man får lön till dagen innan nästa lön)
 * baserat på dagens datum, inställd lönedag och vald helghantering.
 */
export function calculateCurrentPeriod(
  referenceDate: Date = new Date(),
  targetPayday: number = 25,
  weekendHandling: WeekendHandlingMode = 'before'
): PeriodInfo {
  const now = new Date(referenceDate);
  const year = now.getFullYear();
  const month = now.getMonth();

  const todayZero = new Date(year, month, now.getDate(), 0, 0, 0, 0);

  // Denna månads faktiska lönedag
  const thisMonthActualPayday = getActualPayday(year, month, targetPayday, weekendHandling);

  let periodStart: Date;
  let nextPayday: Date;
  let nominalActiveMonthYear: { year: number; month: number };

  if (todayZero.getTime() >= thisMonthActualPayday.getTime()) {
    // Vi har redan fått denna månads lön (eller det är idag).
    // Perioden startade på denna månads lönedag och slutar dagen innan nästa månads lön.
    periodStart = thisMonthActualPayday;
    nextPayday = getActualPayday(year, month + 1, targetPayday, weekendHandling);
    nominalActiveMonthYear = { year, month };
  } else {
    // Vi har ännu inte fått månadens lön.
    // Perioden startade på förra månadens lönedag och slutar dagen innan denna månads lön.
    periodStart = getActualPayday(year, month - 1, targetPayday, weekendHandling);
    nextPayday = thisMonthActualPayday;
    const prevDate = new Date(year, month - 1, 1);
    nominalActiveMonthYear = { year: prevDate.getFullYear(), month: prevDate.getMonth() };
  }

  // Perioden slutar dagen innan nästa lön (23:59:59.999)
  const periodEnd = new Date(
    nextPayday.getFullYear(),
    nextPayday.getMonth(),
    nextPayday.getDate() - 1,
    23,
    59,
    59,
    999
  );

  // Kontrollera om antingen nuvarande periodstart eller nästa lönedag är helgjusterad
  let isAdjusted = false;
  let adjustmentNote: string | undefined = undefined;

  const lastDayCurrentNominal = new Date(
    nominalActiveMonthYear.year,
    nominalActiveMonthYear.month + 1,
    0
  ).getDate();
  const nominalStartDate = new Date(
    nominalActiveMonthYear.year,
    nominalActiveMonthYear.month,
    Math.min(targetPayday, lastDayCurrentNominal),
    0,
    0,
    0,
    0
  );

  const nextNominalMonthDate = new Date(
    nominalActiveMonthYear.year,
    nominalActiveMonthYear.month + 1,
    1
  );
  const lastDayNextNominal = new Date(
    nextNominalMonthDate.getFullYear(),
    nextNominalMonthDate.getMonth() + 1,
    0
  ).getDate();
  const nominalNextDate = new Date(
    nextNominalMonthDate.getFullYear(),
    nextNominalMonthDate.getMonth(),
    Math.min(targetPayday, lastDayNextNominal),
    0,
    0,
    0,
    0
  );

  if (nominalNextDate.getTime() !== nextPayday.getTime()) {
    isAdjusted = true;
    const nominalDayName = WEEKDAY_NAMES[nominalNextDate.getDay()];
    const actualDayName = WEEKDAY_NAMES[nextPayday.getDay()];
    adjustmentNote = `Den ${nominalNextDate.getDate()}:e är en ${nominalDayName} – nästa lön kommer ${actualDayName} ${nextPayday.getDate()} ${MONTH_NAMES_SHORT[nextPayday.getMonth()]}`;
  } else if (nominalStartDate.getTime() !== periodStart.getTime()) {
    isAdjusted = true;
    const nominalDayName = WEEKDAY_NAMES[nominalStartDate.getDay()];
    const actualDayName = WEEKDAY_NAMES[periodStart.getDay()];
    adjustmentNote = `Den ${nominalStartDate.getDate()}:e var en ${nominalDayName} – perioden startade ${actualDayName} ${periodStart.getDate()} ${MONTH_NAMES_SHORT[periodStart.getMonth()]}`;
  }

  // Beräkna antal dagar med UTC-datum så sommar-/vintertid aldrig ger avrundningsfel
  const msPerDay = 1000 * 60 * 60 * 24;
  const startUTC = Date.UTC(
    periodStart.getFullYear(),
    periodStart.getMonth(),
    periodStart.getDate()
  );
  const nextPayUTC = Date.UTC(
    nextPayday.getFullYear(),
    nextPayday.getMonth(),
    nextPayday.getDate()
  );
  const todayUTC = Date.UTC(
    todayZero.getFullYear(),
    todayZero.getMonth(),
    todayZero.getDate()
  );

  // Totalt antal dagar från lönedag till dagen innan nästa lön (inklusive båda)
  const daysTotal = Math.max(1, Math.round((nextPayUTC - startUTC) / msPerDay));

  // Dagar kvar i perioden (inklusive idag fram till dagen innan nästa lön)
  const daysRemaining = Math.max(0, Math.round((nextPayUTC - todayUTC) / msPerDay));

  // Förbrukade dagar i perioden (dag 1 är själva lönedagen)
  const daysElapsed = Math.min(
    daysTotal,
    Math.max(1, Math.round((todayUTC - startUTC) / msPerDay) + 1)
  );

  const startLabel = `${periodStart.getDate()} ${MONTH_NAMES_SHORT[periodStart.getMonth()]}`;
  const endLabel = `${periodEnd.getDate()} ${MONTH_NAMES_SHORT[periodEnd.getMonth()]}`;
  const nextPayLabel = `${nextPayday.getDate()} ${MONTH_NAMES_SHORT[nextPayday.getMonth()]}`;

  return {
    startDate: periodStart,
    endDate: periodEnd,
    nextPaydayDate: nextPayday,
    daysTotal,
    daysElapsed,
    daysRemaining,
    startLabel,
    endLabel,
    nextPayLabel,
    isAdjustedForWeekend: isAdjusted,
    weekendAdjustmentNote: adjustmentNote,
    targetPayday,
    weekendHandling,
  };
}

/**
 * Hittar vilket datum en fast utgift (med given dueDay 1-31) infaller under den aktuella perioden.
 */
export function getDueDateInPeriod(dueDay: number, period: PeriodInfo): Date {
  const startYear = period.startDate.getFullYear();
  const startMonth = period.startDate.getMonth();

  const lastDayStartMonth = new Date(startYear, startMonth + 1, 0).getDate();
  const candidateInStartMonth = new Date(
    startYear,
    startMonth,
    Math.min(Math.max(1, dueDay), lastDayStartMonth),
    0,
    0,
    0,
    0
  );

  if (
    candidateInStartMonth.getTime() >= period.startDate.getTime() &&
    candidateInStartMonth.getTime() <= period.endDate.getTime()
  ) {
    return candidateInStartMonth;
  }

  const endYear = period.endDate.getFullYear();
  const endMonth = period.endDate.getMonth();
  const lastDayEndMonth = new Date(endYear, endMonth + 1, 0).getDate();
  return new Date(
    endYear,
    endMonth,
    Math.min(Math.max(1, dueDay), lastDayEndMonth),
    0,
    0,
    0,
    0
  );
}

/**
 * Kontrollerar om en fast utgift redan har dragits under den aktuella perioden.
 */
export function isDueDayPaidInPeriod(
  dueDay: number,
  period: PeriodInfo,
  referenceDate: Date = new Date()
): boolean {
  const dueDate = getDueDateInPeriod(dueDay, period);
  const todayZero = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0
  );
  return dueDate.getTime() <= todayZero.getTime();
}

/**
 * Kontrollerar om ett datum (YYYY-MM-DD) ligger inom den aktuella löneperioden.
 */
export function isDateInPeriod(dateStr: string, period: PeriodInfo): boolean {
  if (!dateStr) return false;
  const parts = dateStr.slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const txDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
  return (
    txDate.getTime() >= period.startDate.getTime() &&
    txDate.getTime() <= period.endDate.getTime()
  );
}

