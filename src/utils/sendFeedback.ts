import { supabase } from '../supabaseClient';

export type FeedbackType = 'idea' | 'bug' | 'praise' | 'crash';

/** Öppnar feedbackrutan var som helst i appen */
export const OPEN_FEEDBACK_EVENT = 'dejz-open-feedback';
export function openFeedback(type: FeedbackType = 'idea') {
  try {
    window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_EVENT, { detail: { type } }));
  } catch {
    // ignore
  }
}

/** Sammanhang som hjälper att förstå feedbacken (inga belopp eller personuppgifter) */
function defaultContext(): Record<string, string> {
  try {
    return {
      sida: window.location.pathname + window.location.search.replace(/token_hash=[^&]+/, 'token_hash=…'),
      enhet: navigator.userAgent,
      skärm: `${window.innerWidth}×${window.innerHeight}`,
      läge: document.documentElement.classList.contains('dark') ? 'mörkt' : 'ljust',
      hemskärmsapp: String(
        (window.navigator as any).standalone === true ||
          window.matchMedia?.('(display-mode: standalone)').matches
      ),
      tid: new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' }),
    };
  } catch {
    return {};
  }
}

/**
 * Skickar feedback eller en kraschrapport. Sparas i Supabase (tabellen feedback)
 * och mejlas till hej@dejz.se. Returnerar true om det gick fram.
 */
export async function sendFeedback(
  type: FeedbackType,
  message: string,
  extraContext: Record<string, string> = {}
): Promise<boolean> {
  const clean = message.trim();
  if (!clean) return false;
  try {
    const client = supabase;
    if (!client?.functions?.invoke) throw new Error('not_configured');
    // Max 8 sekunder – användaren ska aldrig fastna med en snurrande knapp
    const result: any = await Promise.race([
      client.functions.invoke('send-feedback', {
        body: { type, message: clean, context: { ...defaultContext(), ...extraContext } },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);
    if (result?.error) throw result.error;
    return true;
  } catch {
    // Spara lokalt så inget försvinner om nätet strular
    try {
      const prev = JSON.parse(localStorage.getItem('dejz_unsent_feedback') || '[]');
      prev.unshift({ type, message: clean, at: new Date().toISOString() });
      localStorage.setItem('dejz_unsent_feedback', JSON.stringify(prev.slice(0, 20)));
    } catch {
      // ignore
    }
    return false;
  }
}
