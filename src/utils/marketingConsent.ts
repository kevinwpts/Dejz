import { supabase } from '../supabaseClient';

export type ConsentSource = 'registrering' | 'introduktion' | 'profil';

const PENDING_KEY = 'dejz_marketing_consent_pending';

/**
 * Har användaren svarat på frågan om nyhetsbrev?
 * true/false = svarat, null = aldrig tillfrågad (eller inte inloggad).
 */
export async function getMarketingConsent(): Promise<boolean | null> {
  try {
    const client = supabase;
    if (!client?.auth?.getUser) return null;
    const { data } = await client.auth.getUser();
    const user = data?.user;
    if (!user) return null;
    const { data: row } = await client
      .from('marketing_consent')
      .select('consented')
      .eq('user_id', user.id)
      .maybeSingle();
    return row ? Boolean(row.consented) : null;
  } catch {
    return null;
  }
}

/** Sparar svaret (med datum) för den inloggade användaren. */
export async function setMarketingConsent(consented: boolean, source: ConsentSource): Promise<boolean> {
  try {
    const client = supabase;
    if (!client?.auth?.getUser) return false;
    const { data } = await client.auth.getUser();
    const user = data?.user;
    if (!user) return false;
    const now = new Date().toISOString();
    const { error } = await client.from('marketing_consent').upsert({
      user_id: user.id,
      email: user.email ?? null,
      consented,
      consented_at: consented ? now : null,
      source,
      updated_at: now,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Vid registrering finns ingen inloggning förrän kontot är skapat. Svaret läggs därför
 * åt sidan här och sparas så fort användaren är inloggad (se flushPendingMarketingConsent).
 */
export function rememberConsentFromSignup(consented: boolean) {
  try {
    localStorage.setItem(PENDING_KEY, consented ? '1' : '0');
  } catch {
    // ignore
  }
}

/** Har användaren svarat vid registreringen (men svaret är inte sparat än)? */
export function hasPendingSignupConsent(): boolean {
  try {
    return localStorage.getItem(PENDING_KEY) !== null;
  } catch {
    return false;
  }
}

/** Sparar ett svar från registreringen när användaren väl är inloggad. */
export async function flushPendingMarketingConsent(): Promise<void> {
  try {
    const pending = localStorage.getItem(PENDING_KEY);
    if (pending === null) return;
    const ok = await setMarketingConsent(pending === '1', 'registrering');
    if (ok) localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}
