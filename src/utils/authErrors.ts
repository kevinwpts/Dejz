/**
 * Gör om fel från inloggningen (Supabase) till begripliga svenska texter.
 * Används av både startsidan och inloggningsrutan, så att samma fel alltid visas likadant.
 */
type AuthErrorKind =
  | 'network'
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'already_registered'
  | 'weak_password'
  | 'invalid_email'
  | 'rate_limited'
  | 'unknown';

export interface FriendlyAuthError {
  kind: AuthErrorKind;
  /** Text att visa för användaren (svenska) */
  message: string;
}

type AuthErrorLike = { message?: unknown; code?: unknown; error_code?: unknown; status?: unknown } | null | undefined;

export function friendlyAuthError(err: unknown): FriendlyAuthError {
  const e = (typeof err === 'object' ? err : { message: err }) as AuthErrorLike;
  const msg = String(e?.message ?? '');
  const code = String(e?.code ?? e?.error_code ?? '');
  const status = Number(e?.status) || 0;

  if (/Failed to fetch|NetworkError|Load failed|network/i.test(msg)) {
    return { kind: 'network', message: 'Ingen anslutning. Kontrollera internet och försök igen.' };
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) {
    return {
      kind: 'email_not_confirmed',
      message: 'Du har inte bekräftat din e-post än. Hittar du inte mejlet? Vi skickar ett nytt.',
    };
  }
  if (code === 'invalid_credentials' || /invalid login credentials|invalid_credentials/i.test(msg)) {
    return { kind: 'invalid_credentials', message: 'Fel e-post eller lösenord.' };
  }
  if (code === 'user_already_exists' || /already registered|already exists/i.test(msg)) {
    return { kind: 'already_registered', message: 'E-postadressen är redan registrerad. Testa att logga in istället.' };
  }
  if (code === 'weak_password' || /password should be|password is too weak/i.test(msg)) {
    const min = msg.match(/at least (\d+)/i)?.[1];
    return {
      kind: 'weak_password',
      message: min ? `Lösenordet måste vara minst ${min} tecken.` : 'Välj ett starkare lösenord.',
    };
  }
  if (code === 'email_address_invalid' || /invalid format|valid email|email address .* is invalid/i.test(msg)) {
    return { kind: 'invalid_email', message: 'Kontrollera e-postadressen.' };
  }
  if (status === 429 || /rate limit|too many requests|security purposes/i.test(msg) || code.includes('rate_limit')) {
    return { kind: 'rate_limited', message: 'För många försök. Vänta en stund och försök igen.' };
  }
  return { kind: 'unknown', message: 'Något gick fel. Försök igen.' };
}
