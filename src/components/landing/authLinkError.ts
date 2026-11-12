// Fel vi kommer tillbaka till inloggningen med: utgången mejllänk (markerad av App) eller fel i adressen från Google.

const AUTH_LINK_ERROR_KEY = 'dejz_auth_link_error';
export const AUTH_LINK_ERROR_MSG =
  'Länken har gått ut eller redan använts. Logga in – är kontot inte bekräftat kan du få en ny länk.';

/**
 * Om någon utan konto försöker logga in med Google skickar Supabase tillbaka ett fel i adressen
 * (när "Allow new users to sign up" är avstängt). Ger då en vänlig förklaring, annars null.
 */
export function readUrlAuthError(): string | null {
  try {
    const raw = `${window.location.search}&${window.location.hash.replace(/^#/, '')}`;
    const params = new URLSearchParams(raw);
    const desc = (params.get('error_description') || '').toLowerCase();
    if (!params.get('error') && !desc) return null;
    return desc.includes('expired') || desc.includes('invalid')
      ? AUTH_LINK_ERROR_MSG
      : desc.includes('signup') || desc.includes('sign up') || desc.includes('not allowed')
      ? 'Det gick inte att skapa kontot med Google. Försök igen eller använd e-post.'
      : 'Inloggningen avbröts. Försök igen.';
  } catch {
    return null;
  }
}

/** Har App markerat att bekräftelselänken hade gått ut? (bara läsning) */
function hasAuthLinkError(): boolean {
  try {
    return Boolean(sessionStorage.getItem(AUTH_LINK_ERROR_KEY));
  } catch {
    return false;
  }
}

/** Läser och tar bort markeringen så att felet bara visas en gång. */
export function consumeAuthLinkError(): boolean {
  const had = hasAuthLinkError();
  if (had) {
    try {
      sessionStorage.removeItem(AUTH_LINK_ERROR_KEY);
    } catch {
      // ignore
    }
  }
  return had;
}

/** Felet som ska visas direkt när sidan öppnas. Länkfelet vinner över Google-felet (som förut). */
export function readInitialAuthError(): string | null {
  return hasAuthLinkError() ? AUTH_LINK_ERROR_MSG : readUrlAuthError();
}
