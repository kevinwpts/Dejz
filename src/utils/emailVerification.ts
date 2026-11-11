import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export type VerificationStatus = 'unknown' | 'verified' | 'unverified';

/**
 * Är e-posten verifierad? Google-konton och konton som bekräftades via länk
 * (när "Confirm email" var påslaget) räknas som verifierade. Övriga kollas i
 * tabellen email_verification.
 */
export function useEmailVerification() {
  const [status, setStatus] = useState<VerificationStatus>('unknown');

  const refresh = useCallback(async () => {
    try {
      const client = supabase;
      if (!client?.auth?.getUser) return;
      const { data } = await client.auth.getUser();
      const user = data?.user;
      if (!user) return;
      const provider = user.app_metadata?.provider;
      const confirmedAt = user.email_confirmed_at ? new Date(user.email_confirmed_at).getTime() : 0;
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      // Bekräftad via länk (en stund efter att kontot skapades) = verifierad
      if (provider && provider !== 'email') return setStatus('verified');
      if (confirmedAt && createdAt && confirmedAt - createdAt > 15_000) return setStatus('verified');
      const { data: row } = await client
        .from('email_verification')
        .select('verified_at')
        .eq('user_id', user.id)
        .maybeSingle();
      setStatus(row?.verified_at ? 'verified' : 'unverified');
    } catch {
      // okänd status – visa inget
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVerified = () => void refresh();
    window.addEventListener('dejz-email-verified', onVerified);
    return () => window.removeEventListener('dejz-email-verified', onVerified);
  }, [refresh]);

  return { status, refresh };
}

/** Skickar verifieringsmejl till den inloggade användaren */
export async function sendVerificationEmail(): Promise<'sent' | 'wait' | 'verified' | 'error'> {
  try {
    const client = supabase;
    const { data, error } = await client.functions.invoke('email-verification', { body: { action: 'send' } });
    if (error) return 'error';
    const s = data?.status;
    return s === 'sent' || s === 'wait' || s === 'verified' ? s : 'error';
  } catch {
    return 'error';
  }
}

/** Länken i mejlet: dejz.se/verifiera?token=… */
export async function confirmVerificationFromUrl(): Promise<'verified' | 'invalid' | null> {
  try {
    if (window.location.pathname.replace(/\/$/, '') !== '/verifiera') return null;
    const token = new URLSearchParams(window.location.search).get('token');
    window.history.replaceState(null, '', '/');
    if (!token) return 'invalid';
    const client = supabase;
    const { data } = await client.functions.invoke('email-verification', { body: { action: 'confirm', token } });
    const ok = data?.status === 'verified';
    if (ok) window.dispatchEvent(new Event('dejz-email-verified'));
    return ok ? 'verified' : 'invalid';
  } catch {
    return 'invalid';
  }
}
