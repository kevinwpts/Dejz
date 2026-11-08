import { supabase } from '../supabaseClient';
import { isDemoMode } from './demoUtils';

const LAST_TOUCH_KEY = 'dejz_activity_last_touch';
const HEARTBEAT_MS = 5 * 60 * 1000; // var femte minut medan appen är öppen
const NEW_VISIT_GAP_MS = 30 * 60 * 1000; // en paus på 30 min räknas som ett nytt besök

let started = false;

function platform(): string {
  try {
    const ua = navigator.userAgent;
    const os = /iPhone|iPad|iPod/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Annat';
    const standalone =
      (window.navigator as any).standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
    return `${os}${standalone ? ' (hemskärmsapp)' : ' (webbläsare)'}`;
  } catch {
    return 'Okänd';
  }
}

async function touch() {
  try {
    const client: any = supabase;
    if (!client?.rpc) return;
    let last = 0;
    try {
      last = Number(localStorage.getItem(LAST_TOUCH_KEY)) || 0;
    } catch {
      // ignore
    }
    const isNewVisit = Date.now() - last > NEW_VISIT_GAP_MS;
    await client.rpc('touch_activity', { p_new_visit: isNewVisit, p_platform: platform() });
    try {
      localStorage.setItem(LAST_TOUCH_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  } catch {
    // aktivitet är inte kritiskt – ignorera fel
  }
}

/**
 * Säger till Supabase att användaren är aktiv: när appen öppnas, när den kommer tillbaka
 * till förgrunden och var femte minut medan den är öppen. Körs inte i demoläget.
 */
export function startActivityTracking() {
  if (started || typeof window === 'undefined' || isDemoMode()) return;
  started = true;
  void touch();
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void touch();
  }, HEARTBEAT_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    let last = 0;
    try {
      last = Number(localStorage.getItem(LAST_TOUCH_KEY)) || 0;
    } catch {
      // ignore
    }
    // Uppdatera direkt om det gått en stund sedan senaste signalen
    if (Date.now() - last > 60 * 1000) void touch();
  });
}
