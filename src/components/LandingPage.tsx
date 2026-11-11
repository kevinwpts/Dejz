import React, { useState, useEffect } from 'react';
import {
  CaretLeft,
  Eye,
  EyeSlash,
  SpinnerGap,
  EnvelopeSimple,
  WarningCircle,
  PaperPlaneTilt,
} from '@phosphor-icons/react';
import { supabase } from '../supabaseClient';
import { WaitlistLanding } from './WaitlistLanding';
import { rememberConsentFromSignup } from '../utils/marketingConsent';
import { firstTouchSignupData } from '../utils/attribution';

interface LandingPageProps {
  existingEmail?: string | null;
  onAuthenticated: (email: string, mode?: 'login' | 'register') => void;
  onContinueExisting?: () => void;
}

type AuthViewMode = 'login' | 'register' | 'forgot_password';

export const LandingPage: React.FC<LandingPageProps> = ({
  existingEmail,
  onAuthenticated,
  onContinueExisting,
}) => {
  const [activePage, setActivePage] = useState<'landing' | 'auth'>('landing');
  const [slideDir, setSlideDir] = useState<'forward' | 'back'>('forward');
  const [view, setView] = useState<AuthViewMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Nyhetsbrev: alltid ej ikryssat från början (opt-in)
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasPasswordError, setHasPasswordError] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  // Vilket mejl som skickats: bekräftelse av nytt konto eller återställning av lösenord
  const [sentKind, setSentKind] = useState<'signup' | 'reset'>('reset');
  // Inloggning misslyckades för att e-posten inte är bekräftad – visa "Skicka nytt mejl"
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendingConfirm, setResendingConfirm] = useState(false);

  // Om någon utan konto försöker logga in med Google skickar Supabase tillbaka ett fel
  // (när "Allow new users to sign up" är avstängt). Visa då en vänlig förklaring.
  useEffect(() => {
    try {
      const raw = `${window.location.search}&${window.location.hash.replace(/^#/, '')}`;
      const params = new URLSearchParams(raw);
      const desc = (params.get('error_description') || '').toLowerCase();
      if (params.get('error') || desc) {
        setView('login');
        setActivePage('auth');
        setErrorMsg(
          desc.includes('expired') || desc.includes('invalid')
            ? 'Länken har gått ut eller redan använts. Logga in – är kontot inte bekräftat kan du få en ny länk.'
            : desc.includes('signup') || desc.includes('sign up') || desc.includes('not allowed')
            ? 'Det gick inte att skapa kontot med Google. Försök igen eller använd e-post.'
            : 'Inloggningen avbröts. Försök igen.'
        );
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch {
      // ignore
    }
  }, []);

  // Bekräftelselänken från mejlet hade gått ut eller redan använts (kontrolleras i App)
  useEffect(() => {
    const show = () => {
      try {
        if (sessionStorage.getItem('dejz_auth_link_error')) {
          sessionStorage.removeItem('dejz_auth_link_error');
          setView('login');
          setActivePage('auth');
          setErrorMsg(
            'Länken har gått ut eller redan använts. Logga in – är kontot inte bekräftat kan du få en ny länk.'
          );
        }
      } catch {
        // ignore
      }
    };
    show();
    window.addEventListener('dejz-auth-link-error', show);
    return () => window.removeEventListener('dejz-auth-link-error', show);
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const clearErrors = () => {
    setErrorMsg(null);
    setHasPasswordError(false);
    setNeedsConfirmation(false);
  };

  const openAuthPage = (mode: 'login' | 'register') => {
    setView(mode);
    clearErrors();
    setResetEmailSent(false);
    setSlideDir('forward');
    setActivePage('auth');
  };

  const backToLanding = () => {
    clearErrors();
    setResetEmailSent(false);
    setSlideDir('back');
    setActivePage('landing');
  };

  const switchView = (newView: AuthViewMode, dir: 'forward' | 'back' = 'forward') => {
    setSlideDir(dir);
    setView(newView);
    clearErrors();
    setResetEmailSent(false);
  };

  const handleGoogleSignIn = async () => {
    clearErrors();
    setGoogleLoading(true);

    try {
      try {
        localStorage.removeItem('dejz_logged_out');
        if (view === 'register') {
          localStorage.setItem('dejz_onboarding_in_progress', 'true');
          localStorage.setItem('dejz_onboarding_step', '1');
          localStorage.removeItem('dejz_onboarding_v2_done');
          localStorage.removeItem('dejz_onboarding_completed');
        }
      } catch {
        // ignore
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      if (view === 'register') {
        try {
          localStorage.removeItem('dejz_onboarding_in_progress');
          localStorage.removeItem('dejz_onboarding_step');
        } catch {
          // ignore
        }
      }
      setErrorMsg(err.message || 'Kunde inte starta Google-inloggning.');
      setGoogleLoading(false);
    }
  };

  const handleSendResetEmail = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail) return;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  };

  const handleResendReset = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      if (sentKind === 'signup') {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
          options: { emailRedirectTo: window.location.origin, data: firstTouchSignupData() },
        });
        if (error) throw error;
      } else {
        await handleSendResetEmail(email);
      }
      setResendCooldown(45);
    } catch {
      // Still set cooldown to prevent spamming
      setResendCooldown(30);
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);

    const cleanEmail = email.trim();
    const targetMode: 'login' | 'register' = view === 'register' ? 'register' : 'login';

    try {
      if (view === 'login') {
        try {
          localStorage.removeItem('dejz_logged_out');
        } catch {
          // ignore
        }
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        if (data.user) {
          onAuthenticated(data.user.email || cleanEmail, 'login');
        }
      } else if (view === 'register') {
        // Sätt onboarding-flaggor INNAN supabase.auth.signUp anropas så att onAuthStateChange
        // aldrig hinner rendera appens startsida emellan under ett halvt sekunds hydrering!
        try {
          localStorage.removeItem('dejz_logged_out');
          localStorage.setItem('dejz_onboarding_in_progress', 'true');
          localStorage.setItem('dejz_onboarding_step', '1');
          localStorage.removeItem('dejz_onboarding_v2_done');
          localStorage.removeItem('dejz_onboarding_completed');
        } catch {
          // ignore
        }
        // Svaret på nyhetsbrevsfrågan sparas så fort kontot finns och användaren är inloggad
        rememberConsentFromSignup(marketingOptIn);
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // Finns kontot redan svarar Supabase "ok" utan att skicka något mejl (identities är tom).
        // Skicka då personen till inloggningen istället för att låta hen vänta på ett mejl som aldrig kommer.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          try {
            localStorage.removeItem('dejz_onboarding_in_progress');
            localStorage.removeItem('dejz_onboarding_step');
          } catch {
            // ignore
          }
          setSlideDir('back');
          setView('login');
          setPassword('');
          setErrorMsg('Du har redan ett konto med den här e-posten. Logga in nedan.');
          return;
        }
        if (data.user) {
          if (data.session) {
            onAuthenticated(data.user.email || cleanEmail, 'register');
          } else {
            // Kontot måste bekräftas via mejl först
            setSentKind('signup');
            setResetEmailSent(true);
            setResendCooldown(45);
          }
        }
      } else if (view === 'forgot_password') {
        await handleSendResetEmail(cleanEmail);
        setSentKind('reset');
        setResetEmailSent(true);
        setResendCooldown(45);
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isNetworkError =
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('placeholder');

      // Offline-genväg endast vid lokal utveckling – i produktion får ingen komma in utan riktig inloggning
      if (isNetworkError && cleanEmail && import.meta.env.DEV) {
        onAuthenticated(cleanEmail, targetMode);
        return;
      }
      if (isNetworkError) {
        setErrorMsg('Ingen anslutning. Kontrollera internet och försök igen.');
        setShakeTrigger((prev) => prev + 1);
        return;
      }

      if (view === 'register') {
        try {
          localStorage.removeItem('dejz_onboarding_in_progress');
          localStorage.removeItem('dejz_onboarding_step');
        } catch {
          // ignore
        }
      }

      const errCode = String(err?.code || err?.error_code || '');
      if (errCode === 'email_not_confirmed' || /email not confirmed/i.test(msg)) {
        setErrorMsg('Du har inte bekräftat din e-post än. Hittar du inte mejlet? Vi skickar ett nytt.');
        setNeedsConfirmation(true);
      } else if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setHasPasswordError(true);
        setShakeTrigger((prev) => prev + 1);
      } else if (msg.includes('User already registered')) {
        setErrorMsg('E-postadressen är redan registrerad. Testa att logga in istället.');
        setShakeTrigger((prev) => prev + 1);
      } else {
        setErrorMsg(msg || 'Ett oväntat fel uppstod.');
        setShakeTrigger((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const pageAnimClass =
    slideDir === 'forward' ? 'animate-page-forward' : 'animate-page-back';

  if (activePage === 'auth') {
    const title =
      view === 'login'
        ? 'Logga in'
        : view === 'register'
        ? 'Skapa konto'
        : 'Glömt lösenord';

    return (
      <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col justify-between max-w-md mx-auto px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] font-sans select-none overflow-x-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between h-12">
          <button
            type="button"
            onClick={() => {
              if (resetEmailSent) {
                setResetEmailSent(false);
                switchView('login', 'back');
              } else if (view === 'forgot_password') {
                switchView('login', 'back');
              } else {
                backToLanding();
              }
            }}
            className="p-2 -ml-2 text-[var(--text-primary)] hover:opacity-70 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            aria-label="Tillbaka"
            title="Tillbaka"
          >
            <CaretLeft size={18} weight="bold" />
          </button>

          <img
            src="/dejz_mork.png"
            alt="Dejz"
            className="dejz-logo h-5 w-auto object-contain dark:invert"
          />
        </header>

        {/* Main Content Area */}
        {resetEmailSent ? (
          /* Modern "Check your inbox" screen - dedicated, clean, delightfully minimal */
          <main key="auth-reset-sent" className="my-auto py-8 space-y-6 animate-scale-in">
            <EnvelopeSimple size={48} weight="light" className="ui-empty-icon" />

            <div className="space-y-2 text-center px-2">
              <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                Kolla din inkorg
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Vi har skickat en länk till din e-postadress:
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] max-w-full">
                <span className="truncate max-w-[260px]">{email.trim()}</span>
              </div>
              <p className="text-[12px] text-[var(--text-muted)] pt-2 leading-relaxed max-w-xs mx-auto">
                {sentKind === 'signup'
                  ? 'Klicka på länken i mejlet för att bekräfta ditt konto – sen är du igång. Hittar du det inte? Kika i skräpposten.'
                  : 'Klicka på länken i mejlet för att välja ett nytt lösenord. Hittar du det inte? Kika i skräpposten.'}
              </p>
            </div>

            <div className="flex items-center justify-between px-1 pt-2">
              <button
                type="button"
                onClick={() => setResetEmailSent(false)}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Fel e-post? Ändra
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0 || resending}
                onClick={handleResendReset}
                className="text-xs font-semibold text-[var(--text-primary)] hover:opacity-75 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {resending && <SpinnerGap size={12} className="animate-spin" />}
                {resendCooldown > 0 ? `Skicka igen om ${resendCooldown}s` : 'Skicka igen'}
              </button>
            </div>
          </main>
        ) : (
          /* Main Auth Form */
          <main key={`auth-${view}`} className={`my-auto py-8 space-y-6 ${pageAnimClass}`}>
            <div className="space-y-1.5">
              <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                {title}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {view === 'login' && 'Logga in för att komma åt din ekonomi.'}
                {view === 'register' && 'Kom igång på under en minut.'}
                {view === 'forgot_password' && 'Ange din e-post så skickar vi en återställningslänk.'}
              </p>
            </div>

            {view !== 'forgot_password' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-sm flex items-center justify-center gap-3 hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
                >
                  {googleLoading ? (
                    <SpinnerGap size={18} className="animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  <span>Fortsätt med Google</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px bg-[var(--border-subtle)] flex-1" />
                  <span className="text-xs font-medium text-[var(--text-muted)]">eller med e-post</span>
                  <div className="h-px bg-[var(--border-subtle)] flex-1" />
                </div>
              </div>
            )}

            {/* General Non-Password Error Notice (if any) */}
            {errorMsg && !hasPasswordError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-600 dark:text-rose-400 text-xs font-medium animate-scale-in">
                <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span>{errorMsg}</span>
                  {needsConfirmation && (
                    <button
                      type="button"
                      disabled={resendingConfirm}
                      onClick={async () => {
                        setResendingConfirm(true);
                        try {
                          await supabase.auth.resend({
                            type: 'signup',
                            email: email.trim(),
                            options: { emailRedirectTo: window.location.origin },
                          });
                        } catch {
                          // visa skärmen ändå – "Skicka igen" finns där
                        } finally {
                          setResendingConfirm(false);
                        }
                        clearErrors();
                        setSentKind('signup');
                        setResetEmailSent(true);
                        setResendCooldown(45);
                      }}
                      className="mt-2.5 w-full py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
                    >
                      {resendingConfirm && <SpinnerGap size={14} className="animate-spin" />}
                      Skicka nytt mejl
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Hairline Divided Card with Modern Shake & Inline Validation Feedback */}
              <div
                key={shakeTrigger}
                className={`rounded-3xl bg-[var(--surface-color)] border transition-all overflow-hidden ${
                  hasPasswordError
                    ? 'border-rose-500/50 ring-1 ring-rose-500/20 animate-shake'
                    : 'border-[var(--border-subtle)]'
                }`}
              >
                <label className="px-4.5 py-4 block cursor-text">
                  <span className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                    E-postadress
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (hasPasswordError || errorMsg) clearErrors();
                    }}
                    placeholder="namn@exempel.se"
                    className="w-full bg-transparent border-0 p-0 text-base font-normal text-[var(--text-primary)] placeholder-[var(--text-muted)]/55 focus:outline-none"
                  />
                </label>

                {view !== 'forgot_password' && (
                  <div className="border-t border-[var(--border-subtle)] px-4.5 py-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        Lösenord
                      </span>
                      {view === 'login' && (
                        <button
                          type="button"
                          onClick={() => switchView('forgot_password', 'forward')}
                          className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          Glömt lösenord?
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (hasPasswordError || errorMsg) clearErrors();
                        }}
                        placeholder="Minst 6 tecken"
                        className="w-full bg-transparent border-0 p-0 text-base font-normal text-[var(--text-primary)] placeholder-[var(--text-muted)]/55 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer shrink-0"
                        aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                      >
                        {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Modern Inline Error Micro-banner (Replaces big clumsy red rectangle) */}
                {hasPasswordError && (
                  <div className="px-4 py-2.5 bg-rose-500/5 border-t border-rose-500/15 flex items-center justify-between text-[12px] text-rose-600 dark:text-rose-400 font-medium animate-scale-in">
                    <div className="flex items-center gap-1.5">
                      <WarningCircle size={14} weight="bold" className="shrink-0" />
                      <span>Fel lösenord. Kontrollera och försök igen.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => switchView('forgot_password', 'forward')}
                      className="font-semibold underline hover:opacity-80 cursor-pointer shrink-0 ml-2 text-[11px]"
                    >
                      Glömt?
                    </button>
                  </div>
                )}
              </div>

              {/* Frivilligt samtycke till nyhetsbrev – får aldrig vara förkryssat eller ett krav */}
              {view === 'register' && (
                <label className="flex items-start gap-3 px-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="mt-0.5 w-5 h-5 shrink-0 rounded-md accent-[var(--accent-color)] cursor-pointer"
                  />
                  <span className="text-[13px] leading-[1.45] text-[var(--text-secondary)]">
                    Ja, skicka mig tips och nyheter från Dejz. Du kan avsluta när du vill.
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading && <SpinnerGap size={16} className="animate-spin" />}
                {view === 'login' && 'Logga in'}
                {view === 'register' && 'Skapa konto'}
                {view === 'forgot_password' && (
                  <>
                    <span>Skicka återställningslänk</span>
                    <PaperPlaneTilt size={15} weight="bold" />
                  </>
                )}
              </button>
            </form>
          </main>
        )}

        {/* Footer switch between login / register */}
        <footer className="text-center pt-2">
          {resetEmailSent ? (
            <button
              type="button"
              onClick={() => {
                setResetEmailSent(false);
                switchView('login', 'back');
              }}
              className="text-xs font-bold text-[var(--text-primary)] hover:underline cursor-pointer"
            >
              Tillbaka till inloggning
            </button>
          ) : (
            <>
              {view === 'login' && (
                <p className="text-xs text-[var(--text-muted)]">
                  Inget konto än?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('register')}
                    className="font-bold text-[var(--text-primary)] hover:underline cursor-pointer"
                  >
                    Skapa konto
                  </button>
                </p>
              )}
              {view === 'register' && (
                <p className="text-xs text-[var(--text-muted)]">
                  Har du redan ett konto?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('login', 'back')}
                    className="font-bold text-[var(--text-primary)] hover:underline cursor-pointer"
                  >
                    Logga in
                  </button>
                </p>
              )}
              {view === 'forgot_password' && (
                <button
                  type="button"
                  onClick={() => switchView('login', 'back')}
                  className="text-xs font-bold text-[var(--text-primary)] hover:underline cursor-pointer"
                >
                  Tillbaka till inloggning
                </button>
              )}
            </>
          )}
        </footer>
      </div>
    );
  }

  return (
    <WaitlistLanding
      onLogin={() => openAuthPage('login')}
      onSignup={() => openAuthPage('register')}
      existingEmail={existingEmail}
      onContinueExisting={onContinueExisting}
    />
  );
};
