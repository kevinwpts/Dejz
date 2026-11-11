/** Saldo du har skrivit in själv. */
import { syncAllUserPreferencesToSupabase } from './preferencesSync';

// ==========================================
// SALDO JUST NU (utan bankkoppling)
// Användaren skriver in vad som finns på kontot. Dejz räknar: saldo − räkningar kvar före lön − köp sedan dess.
// ==========================================
export const MANUAL_BALANCE_KEY = 'dejz_manual_balance_v1';

export const INCOME_FIRST_SEEN_KEY = 'dejz_income_first_seen';

export interface ManualBalance {
  amount: number;
  /** ISO-tid när saldot skrevs in */
  at: string;
}

export function safeJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getManualBalance(): ManualBalance | null {
  if (typeof window === 'undefined') return null;
  const v = safeJson<ManualBalance | null>(MANUAL_BALANCE_KEY, null);
  return v && typeof v.amount === 'number' && typeof v.at === 'string' ? v : null;
}

export function setManualBalance(value: ManualBalance | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value) localStorage.setItem(MANUAL_BALANCE_KEY, JSON.stringify(value));
    else localStorage.removeItem(MANUAL_BALANCE_KEY);
    window.dispatchEvent(new Event('dejz-manual-balance'));
  } catch {
    // ignore
  }
  syncAllUserPreferencesToSupabase();
}
