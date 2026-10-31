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
  totalDays: number;
  daysPassed: number;
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
 * Beräknar påskdagen (Easter Sunday) för ett givet år enligt Butcher-Meeus algoritm.
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Returnerar namnet på svensk röd dag eller bankfri afton (julafton, midsommarafton, nyårsafton),
 * eller null om datumet är en vanlig helgfri vardag.
 */
export function getSwedishHolidayName(date: Date): string | null {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  const d = date.getDate();

  // Fasta svenska helgdagar & bankfria aftnar
  if (m === 0 && d === 1) return 'nyårsdagen';
  if (m === 0 && d === 6) return 'trettondedag jul';
  if (m === 4 && d === 1) return 'första maj';
  if (m === 5 && d === 6) return 'nationaldagen';
  if (m === 11 && d === 24) return 'julafton';
  if (m === 11 && d === 25) return 'juldagen';
  if (m === 11 && d === 26) return 'annandag jul';
  if (m === 11 && d === 31) return 'nyårsafton';

  // Midsommarafton (fredagen mellan 19 och 25 juni - bankfri dag i Sverige)
  if (m === 5 && d >= 19 && d <= 25 && date.getDay() === 5) {
    return 'midsommarafton';
  }
  // Midsommardagen (lördagen mellan 20 och 26 juni)
  if (m === 5 && d >= 20 && d <= 26 && date.getDay() === 6) {
    return 'midsommardagen';
  }

  // Rörliga helgdagar kring påsk och Kristi himmelsfärd
  const easter = getEasterSunday(y);
  const diffDays = Math.round(
    (Date.UTC(y, m, d) - Date.UTC(easter.getFullYear(), easter.getMonth(), easter.getDate())) /
      (1000 * 60 * 60 * 24)
  );
  if (diffDays === -2) return 'långfredagen';
  if (diffDays === 0) return 'påskdagen';
  if (diffDays === 1) return 'annandag påsk';
  if (diffDays === 39) return 'Kristi himmelsfärdsdag';

  return null;
}

/**
 * Kontrollerar om ett datum är lördag, söndag eller svensk bankfri helgdag/afton.
 */
export function isSwedishNonBankingDay(date: Date): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return true;
  return getSwedishHolidayName(date) !== null;
}

/**
 * Returnerar det faktiska utbetalningsdatumet för en given månad med vald helghantering
 * (inklusive svenska röda dagar samt julafton, midsommarafton och nyårsafton).
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

  if (weekendHandling === 'before') {
    let guard = 0;
    while (isSwedishNonBankingDay(date) && guard < 10) {
      date.setDate(date.getDate() - 1);
      guard++;
    }
  } else if (weekendHandling === 'after') {
    let guard = 0;
    while (isSwedishNonBankingDay(date) && guard < 10) {
      date.setDate(date.getDate() + 1);
      guard++;
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
    const holidayName = getSwedishHolidayName(nominalNextDate);
    const nominalDayName = holidayName || WEEKDAY_NAMES[nominalNextDate.getDay()];
    const actualDayName = WEEKDAY_NAMES[nextPayday.getDay()];
    adjustmentNote = `Den ${nominalNextDate.getDate()}:e är ${
      holidayName ? holidayName : `en ${nominalDayName}`
    } – nästa lön kommer ${actualDayName} ${nextPayday.getDate()} ${MONTH_NAMES_SHORT[nextPayday.getMonth()]}`;
  } else if (nominalStartDate.getTime() !== periodStart.getTime()) {
    isAdjusted = true;
    const holidayName = getSwedishHolidayName(nominalStartDate);
    const nominalDayName = holidayName || WEEKDAY_NAMES[nominalStartDate.getDay()];
    const actualDayName = WEEKDAY_NAMES[periodStart.getDay()];
    adjustmentNote = `Den ${nominalStartDate.getDate()}:e var ${
      holidayName ? holidayName : `en ${nominalDayName}`
    } – perioden startade ${actualDayName} ${periodStart.getDate()} ${MONTH_NAMES_SHORT[periodStart.getMonth()]}`;
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
    totalDays: daysTotal,
    daysPassed: daysElapsed,
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

