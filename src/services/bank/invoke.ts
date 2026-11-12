// Anropar banktjänstens serverfunktion (enable-banking) med inloggning och tidsgräns.
import { supabase } from '../../supabaseClient';

async function ensureActiveSession(): Promise<string | null> {
  if (typeof window !== 'undefined' && localStorage.getItem('dejz_logged_out') === 'true') {
    return null;
  }

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      return data.session.access_token;
    }

    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed?.session?.access_token) {
      return refreshed.session.access_token;
    }
  } catch (err) {
    console.warn('[bankService] Could not ensure session:', err);
  }
  return null;
}

export async function invokeEnableBanking<T>(payload: Record<string, unknown>, timeoutMs = 45000): Promise<T> {
  // Ensure active session before invoking Enable Banking Edge Function
  await ensureActiveSession();

  const invokePromise = supabase.functions.invoke('enable-banking', {
    body: payload,
  });

  const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
    setTimeout(() => reject(new Error('Begäran mot banktjänsten tog för lång tid. Försök igen.')), timeoutMs)
  );

  const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

  if (error) {
    let message = error.message || 'Kunde inte kommunicera med banktjänsten.';
    try {
      const errContext = 'context' in error ? (error as { context?: { json: () => Promise<{ error?: string } | null> } }).context : undefined;
      if (errContext) {
        const errBody = await errContext.json();
        if (errBody?.error) {
          message = errBody.error;
        }
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}
