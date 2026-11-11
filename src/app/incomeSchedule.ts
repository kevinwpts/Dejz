// Utbetalningsdagar för inkomster och när en inkomst först syntes.
// Flyttad från App.tsx.
import { getActualPayday } from '../utils/periodEngine';
import { IncomeItem } from '../components/HomeTab';
import { getSwedishDateStr } from '../utils/swedishDate';
import { syncAllUserPreferencesToSupabase } from '../utils/appCache';

export function getPayDatesForIncome(
  inc: IncomeItem,
  fallbackPayday = 25,
  beforeWeekend = true
): string[] {
  const dates: string[] = [];
  const day = inc.payday || fallbackPayday || 25;
  const todayStockholm = getSwedishDateStr();
  const currentYear = parseInt(todayStockholm.slice(0, 4), 10);
  const currentMonth = parseInt(todayStockholm.slice(5, 7), 10) - 1;

  for (let offset = 0; offset <= 5; offset++) {
    const d = getActualPayday(
      currentYear,
      currentMonth - offset,
      day,
      beforeWeekend ? 'before' : 'none'
    );
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${dayStr}`;

    if (dateStr <= todayStockholm) {
      dates.push(dateStr);
    }
  }

  // Visa inte påhittad historik: börja från den löneperiod då inkomsten lades in i appen
  // (senaste utbetalningen före eller samma dag, plus alla efter).
  const firstSeen = getIncomeFirstSeen(inc.id, todayStockholm);
  const startOfPeriod = dates.filter((d) => d <= firstSeen).sort().pop();
  return dates.filter((d) => d >= firstSeen || d === startOfPeriod);
}

/** Datum (YYYY-MM-DD) då en inkomst först syntes på den här enheten. Sparas i localStorage. */
export function getIncomeFirstSeen(incomeId: string, today: string): string {
  const KEY = 'dejz_income_first_seen';
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (map[incomeId]) return map[incomeId];
    map[incomeId] = today;
    localStorage.setItem(KEY, JSON.stringify(map));
    syncAllUserPreferencesToSupabase(); // samma historik på alla enheter
  } catch {
    // Ingen lagring (t.ex. privat läge) – visa bara innevarande period
  }
  return today;
}
