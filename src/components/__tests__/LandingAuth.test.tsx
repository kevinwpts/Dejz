// @vitest-environment jsdom
// Startsidan → Logga in / Skapa konto / Glömt lösenord. Supabase är utbytt mot låtsasfunktioner –
// inga riktiga konton skapas och inget går ut på nätet.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

type AuthResult = { data: { user: { email?: string; identities?: unknown[] } | null; session: object | null }; error: Error | null };
const ok = (user: AuthResult['data']['user'], session: object | null = null): AuthResult => ({ data: { user, session }, error: null });
const fail = (message: string, code?: string): AuthResult => ({
  data: { user: null, session: null },
  error: Object.assign(new Error(message), code ? { code } : {}),
});

const auth = {
  signInWithPassword: vi.fn(async (_creds: { email: string; password: string }) => ok({ email: 'elin@exempel.se' }, {})),
  signUp: vi.fn(async (_args: { email: string; password: string }) => ok({ email: 'elin@exempel.se', identities: [{}] })),
  resetPasswordForEmail: vi.fn(async (_email: string, _opts: object) => ({ data: {}, error: null as Error | null })),
  resend: vi.fn(async (_args: { type: string; email: string }) => ({ data: {}, error: null as Error | null })),
};
vi.mock('../../supabaseClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../supabaseClient')>()),
  supabase: { auth },
}));
const signInWithProvider = vi.fn(async (_provider: 'google' | 'apple') => undefined);
vi.mock('../../utils/nativeAuth', () => ({ signInWithProvider }));
// Marknadsföringssidan testas inte här – bara dess två knappar
vi.mock('../WaitlistLanding', () => ({
  WaitlistLanding: ({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) => (
    <div>
      <button type="button" onClick={onLogin}>
        Till inloggning
      </button>
      <button type="button" onClick={onSignup}>
        Till registrering
      </button>
    </div>
  ),
}));

const { LandingPage } = await import('../LandingPage');

const title = () => screen.getByRole('heading', { level: 1 }).textContent;
const emailInput = () => screen.getByPlaceholderText('namn@exempel.se');
const passwordInput = () => screen.getByLabelText('Lösenord');
/** Skicka-knappen i formuläret (inte länken med samma text i sidfoten) */
const submit = () => {
  const btn = document.querySelector('form button[type="submit"]');
  if (!(btn instanceof HTMLButtonElement)) throw new Error('Skicka-knappen saknas');
  return btn;
};

function renderLanding(start: 'login' | 'register' = 'login') {
  const onAuthenticated = vi.fn();
  const user = userEvent.setup();
  render(<LandingPage onAuthenticated={onAuthenticated} />);
  return {
    onAuthenticated,
    user,
    open: () => user.click(screen.getByRole('button', { name: start === 'login' ? 'Till inloggning' : 'Till registrering' })),
  };
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, email: string, password?: string) {
  await user.type(emailInput(), email);
  if (password !== undefined) await user.type(passwordInput(), password);
  await user.click(submit());
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('inloggning', () => {
  test('startsidan → Logga in visar formuläret', async () => {
    const { open } = renderLanding();
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    await open();
    expect(title()).toBe('Logga in');
    expect(submit().textContent).toBe('Logga in');
  });

  test('rätt uppgifter loggar in med e-posten utan mellanslag', async () => {
    const { user, open, onAuthenticated } = renderLanding();
    await open();
    await fillAndSubmit(user, '  elin@exempel.se ', 'hemligt123');
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'elin@exempel.se', password: 'hemligt123' });
    expect(onAuthenticated).toHaveBeenCalledWith('elin@exempel.se', 'login');
  });

  test('tomma fält skickas inte', async () => {
    const { user, open } = renderLanding();
    await open();
    await user.click(submit());
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test('fel lösenord visar ett meddelande vid lösenordet som försvinner när man skriver', async () => {
    auth.signInWithPassword.mockResolvedValueOnce(fail('Invalid login credentials', 'invalid_credentials'));
    const { user, open, onAuthenticated } = renderLanding();
    await open();
    await fillAndSubmit(user, 'elin@exempel.se', 'fel-losen');
    expect(await screen.findByText('Fel e-post eller lösenord. Försök igen.')).toBeTruthy();
    expect(onAuthenticated).not.toHaveBeenCalled();

    await user.type(passwordInput(), 'x');
    expect(screen.queryByText('Fel e-post eller lösenord. Försök igen.')).toBeNull();
  });

  test('obekräftad e-post: "Skicka nytt mejl" skickar bekräftelsen igen', async () => {
    auth.signInWithPassword.mockResolvedValueOnce(fail('Email not confirmed', 'email_not_confirmed'));
    const { user, open } = renderLanding();
    await open();
    await fillAndSubmit(user, 'elin@exempel.se', 'hemligt123');
    expect(await screen.findByText(/Du har inte bekräftat din e-post än/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Skicka nytt mejl/ }));
    expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({ type: 'signup', email: 'elin@exempel.se' }));
    expect(await screen.findByText('Kolla din inkorg')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Skicka igen om 45s/ })).toBeTruthy();
  });

  test('utan internet (i produktion) visas ett begripligt fel och ingen kommer in', async () => {
    vi.stubEnv('DEV', false);
    auth.signInWithPassword.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { user, open, onAuthenticated } = renderLanding();
    await open();
    await fillAndSubmit(user, 'elin@exempel.se', 'hemligt123');
    expect(await screen.findByText('Ingen anslutning. Kontrollera internet och försök igen.')).toBeTruthy();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  test('visa/dölj lösenord', async () => {
    const { user, open } = renderLanding();
    await open();
    expect(passwordInput().getAttribute('type')).toBe('password');
    await user.click(screen.getByRole('button', { name: 'Visa lösenord' }));
    expect(passwordInput().getAttribute('type')).toBe('text');
    await user.click(screen.getByRole('button', { name: 'Dölj lösenord' }));
    expect(passwordInput().getAttribute('type')).toBe('password');
  });

  test('Google-knappen startar Google-inloggning, och ett fel visas tydligt', async () => {
    signInWithProvider.mockRejectedValueOnce(new Error('popup stängd'));
    const { user, open } = renderLanding();
    await open();
    await user.click(screen.getByRole('button', { name: /Fortsätt med Google/ }));
    expect(signInWithProvider).toHaveBeenCalledWith('google');
    expect(await screen.findByText('Kunde inte starta Google-inloggning.')).toBeTruthy();
  });

  test('Tillbaka går till startsidan', async () => {
    const { user, open } = renderLanding();
    await open();
    await user.click(screen.getByRole('button', { name: 'Tillbaka' }));
    expect(screen.getByRole('button', { name: 'Till inloggning' })).toBeTruthy();
  });
});

describe('byta mellan lägen', () => {
  test('Logga in ↔ Skapa konto ↔ Glömt lösenord', async () => {
    const { user, open } = renderLanding();
    await open();
    await user.click(screen.getByRole('button', { name: 'Skapa konto' }));
    expect(title()).toBe('Skapa konto');
    // Nyhetsbrevet är aldrig förkryssat
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Logga in' }));
    expect(title()).toBe('Logga in');
    expect(screen.queryByRole('checkbox')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Glömt lösenord?' }));
    expect(title()).toBe('Glömt lösenord');
    expect(screen.queryByLabelText('Lösenord')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Tillbaka till inloggning' }));
    expect(title()).toBe('Logga in');
  });

  test('ett felmeddelande följer inte med till nästa läge', async () => {
    auth.signInWithPassword.mockResolvedValueOnce(fail('Something odd'));
    const { user, open } = renderLanding();
    await open();
    await fillAndSubmit(user, 'elin@exempel.se', 'hemligt123');
    expect(await screen.findByText('Något gick fel. Försök igen.')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Skapa konto' }));
    expect(screen.queryByText('Något gick fel. Försök igen.')).toBeNull();
  });
});

describe('skapa konto', () => {
  test('nytt konto som ska bekräftas via mejl → "Kolla din inkorg"', async () => {
    const { user, open, onAuthenticated } = renderLanding('register');
    await open();
    expect(title()).toBe('Skapa konto');
    await user.click(screen.getByRole('checkbox'));
    await fillAndSubmit(user, 'ny@exempel.se', 'hemligt123');

    expect(auth.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: 'ny@exempel.se', password: 'hemligt123' }));
    expect(await screen.findByText('Kolla din inkorg')).toBeTruthy();
    expect(screen.getByText(/bekräfta ditt konto/)).toBeTruthy();
    expect(onAuthenticated).not.toHaveBeenCalled();
    // Introduktionen startar när kontot är bekräftat
    expect(window.localStorage.getItem('dejz_onboarding_in_progress')).toBe('true');
  });

  test('får man en inloggning direkt går man vidare som ny användare', async () => {
    auth.signUp.mockResolvedValueOnce(ok({ email: 'ny@exempel.se', identities: [{}] }, {}));
    const { user, open, onAuthenticated } = renderLanding('register');
    await open();
    await fillAndSubmit(user, 'ny@exempel.se', 'hemligt123');
    expect(onAuthenticated).toHaveBeenCalledWith('ny@exempel.se', 'register');
  });

  test('e-post som redan har ett konto skickas till inloggningen med förklaring', async () => {
    auth.signUp.mockResolvedValueOnce(ok({ email: 'elin@exempel.se', identities: [] }));
    const { user, open } = renderLanding('register');
    await open();
    await fillAndSubmit(user, 'elin@exempel.se', 'hemligt123');
    expect(await screen.findByText('Du har redan ett konto med den här e-posten. Logga in nedan.')).toBeTruthy();
    expect(title()).toBe('Logga in');
    // Lösenordet töms, e-posten finns kvar
    expect((passwordInput() as HTMLInputElement).value).toBe('');
    expect((emailInput() as HTMLInputElement).value).toBe('elin@exempel.se');
    expect(window.localStorage.getItem('dejz_onboarding_in_progress')).toBeNull();
  });

  test('för svagt lösenord ger ett svenskt meddelande', async () => {
    auth.signUp.mockResolvedValueOnce(fail('Password should be at least 8 characters', 'weak_password'));
    const { user, open } = renderLanding('register');
    await open();
    await fillAndSubmit(user, 'ny@exempel.se', 'kort12');
    expect(await screen.findByText('Lösenordet måste vara minst 8 tecken.')).toBeTruthy();
  });
});

describe('glömt lösenord', () => {
  test('skickar återställningslänken och visar inkorgen, sen tillbaka till inloggning', async () => {
    const { user, open } = renderLanding();
    await open();
    await user.click(screen.getByRole('button', { name: 'Glömt lösenord?' }));
    await fillAndSubmit(user, 'elin@exempel.se');

    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('elin@exempel.se', expect.any(Object));
    expect(await screen.findByText('Kolla din inkorg')).toBeTruthy();
    expect(screen.getByText(/välja ett nytt lösenord/)).toBeTruthy();

    // Två knappar heter "Tillbaka till inloggning"/"Tillbaka" – välj den i sidfoten
    await user.click(screen.getByRole('button', { name: 'Tillbaka till inloggning' }));
    expect(title()).toBe('Logga in');
  });
});
