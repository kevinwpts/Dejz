import { supabase } from '../supabaseClient';
import { isDemoMode } from './demoUtils';

/**
 * Var kom användaren ifrån? (t.ex. dejz.se/?utm_source=tiktok)
 *
 * 1. När någon öppnar dejz.se sparas utm-länken i telefonen (första besöket vinner).
 * 2. När personen har ett konto sparas den på kontot i Supabase (user_metadata), en gång.
 *
 * Se det i Supabase: SQL Editor →
 *   select raw_user_meta_data->>'utm_source' as kanal, count(*) from auth.users group by 1;
 */

const KEY = 'dejz_first_touch_v1';

interface FirstTouch {
  utm_source: string;
  utm_medium?: string;
  utm_campaign?: string;
  landed_at: string;
}

function clean(value: string | null): string | undefined {
  const v = (value || '').trim().toLowerCase().slice(0, 60);
  return v ? v.replace(/[^a-z0-9_.-]/g, '') || undefined : undefined;
}

/** Läs utm-länken från adressen och spara den om inget finns sedan tidigare. Anropas vid start. */
export function captureFirstTouch(): void {
  try {
    if (localStorage.getItem(KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const source = clean(params.get('utm_source') || params.get('ref'));
    if (!source) return;
    const touch: FirstTouch = {
      utm_source: source,
      utm_medium: clean(params.get('utm_medium')),
      utm_campaign: clean(params.get('utm_campaign')),
      landed_at: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(touch));
  } catch {
    // ingen lagring (privat läge) – då vet vi inte källan
  }
}

function getFirstTouch(): FirstTouch | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FirstTouch) : null;
  } catch {
    return null;
  }
}

/** Fält att skicka med när ett konto skapas med e-post */
export function firstTouchSignupData(): Record<string, string> {
  const t = getFirstTouch();
  if (!t) return {};
  const data: Record<string, string> = { utm_source: t.utm_source, landed_at: t.landed_at };
  if (t.utm_medium) data.utm_medium = t.utm_medium;
  if (t.utm_campaign) data.utm_campaign = t.utm_campaign;
  return data;
}

/**
 * Efter inloggning: spara källan på kontot om den saknas (t.ex. Google-inloggning,
 * där inga extra fält kan skickas med). Skriver aldrig över en källa som redan finns.
 */
export async function syncFirstTouchToAccount(): Promise<void> {
  if (isDemoMode()) return;
  const data = firstTouchSignupData();
  if (!data.utm_source) return;
  try {
    const client = supabase;
    const { data: userData } = await client.auth.getUser();
    const user = userData?.user;
    if (!user || user.user_metadata?.utm_source) return;
    await client.auth.updateUser({ data });
  } catch {
    // inte kritiskt
  }
}
