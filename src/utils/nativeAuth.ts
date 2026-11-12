/**
 * Inloggning med Google/Apple i iPhone-appen.
 *
 * Google tillåter inte inloggning inuti en app-webbvy. I appen öppnas därför inloggningen i
 * iPhonens eget inloggningsfönster (Capacitor Browser). När den är klar skickas man tillbaka
 * till appen via länken se.dejz.app://auth-callback, och sessionen sparas här.
 * På webben används vanlig omdirigering som förut.
 */
import type { Provider } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { appOrigin, isNativeApp } from './platform';

const NATIVE_AUTH_CALLBACK = 'se.dejz.app://auth-callback';

/** Plockar ut inloggningsuppgifterna ur återkomstlänken (kod eller tokens). */
export function parseAuthCallback(url: string): { code?: string; accessToken?: string; refreshToken?: string; error?: string } {
  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#');
  const query = queryStart >= 0 ? url.slice(queryStart + 1, hashStart > queryStart ? hashStart : undefined) : '';
  const hash = hashStart >= 0 ? url.slice(hashStart + 1) : '';
  const params = new URLSearchParams(query);
  new URLSearchParams(hash).forEach((value, key) => params.set(key, value));
  return {
    code: params.get('code') ?? undefined,
    accessToken: params.get('access_token') ?? undefined,
    refreshToken: params.get('refresh_token') ?? undefined,
    error: params.get('error_description') ?? params.get('error') ?? undefined,
  };
}

/** Startar inloggning med Google eller Apple – rätt sätt för webben och för appen. */
export async function signInWithProvider(provider: Extract<Provider, 'google' | 'apple'>): Promise<void> {
  if (!isNativeApp()) {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: appOrigin() } });
    if (error) throw error;
    return;
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: NATIVE_AUTH_CALLBACK, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Kunde inte starta inloggningen.');
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url: data.url, presentationStyle: 'popover' });
}

let listening = false;

/** Lyssnar på återkomstlänken i appen. Anropas en gång när appen startar. */
export async function initNativeAuthListener(): Promise<void> {
  if (listening || !isNativeApp()) return;
  listening = true;
  const [{ App }, { Browser }] = await Promise.all([import('@capacitor/app'), import('@capacitor/browser')]);
  await App.addListener('appUrlOpen', ({ url }) => {
    if (!url.startsWith(NATIVE_AUTH_CALLBACK)) return;
    void (async () => {
      const { code, accessToken, refreshToken } = parseAuthCallback(url);
      try {
        if (code) await supabase.auth.exchangeCodeForSession(code);
        else if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      } finally {
        await Browser.close().catch(() => undefined);
      }
    })();
  });
}
