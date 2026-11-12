// Bekräftelse- och återställningslänken från mejlet (dejz.se/bekrafta?token_hash=…&type=…) kontrolleras här vid uppstart.
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '../../supabaseClient';

/**
 * Bekräftelselänk från mejlet: dejz.se/bekrafta?token_hash=…&type=signup
 * Länken går via dejz.se (inte supabase.co) så att mejlet inte ser ut som nätfiske.
 */
export async function verifyEmailLinkIfPresent(): Promise<void> {
  try {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type');
    if (!tokenHash || !type) return;
    // En länk får bara användas en gång – kör aldrig kontrollen två gånger
    const w = window as Window & { __dejzEmailLinkCheck?: Promise<void> };
    if (w.__dejzEmailLinkCheck) return w.__dejzEmailLinkCheck;
    w.__dejzEmailLinkCheck = (async () => {
      window.history.replaceState(null, '', '/');
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });
      if (error) {
        // Visa förklaringen på inloggningssidan (läses av LandingPage)
        try {
          sessionStorage.setItem('dejz_auth_link_error', 'expired');
        } catch {
          // ignore
        }
        window.dispatchEvent(new Event('dejz-auth-link-error'));
        return;
      }
      try {
        localStorage.removeItem('dejz_logged_out');
        if (type === 'recovery') {
          sessionStorage.setItem('dejz_password_recovery', '1');
        }
      } catch {
        // ignore
      }
      if (type === 'recovery') {
        window.dispatchEvent(new Event('dejz-password-recovery'));
      }
    })();
    return w.__dejzEmailLinkCheck;
  } catch {
    // ignore – vanlig uppstart fortsätter
  }
}
