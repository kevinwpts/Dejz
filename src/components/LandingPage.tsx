import React, { useState } from 'react';
import {
  ArrowRight,
  CaretLeft,
  Eye,
  EyeSlash,
  SpinnerGap,
  CheckCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import { supabase } from '../supabaseClient';

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
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const openAuthPage = (mode: 'login' | 'register') => {
    setView(mode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setSlideDir('forward');
    setActivePage('auth');
  };

  const backToLanding = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSlideDir('back');
    setActivePage('landing');
  };

  const switchView = (newView: AuthViewMode, dir: 'forward' | 'back' = 'forward') => {
    setSlideDir(dir);
    setView(newView);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Kunde inte starta Google-inloggning.');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    const cleanEmail = email.trim();
    const targetMode: 'login' | 'register' = view === 'register' ? 'register' : 'login';

    try {
      if (view === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        if (data.user) {
          onAuthenticated(data.user.email || cleanEmail, 'login');
        }
      } else if (view === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        if (data.user) {
          if (data.session) {
            onAuthenticated(data.user.email || cleanEmail, 'register');
          } else {
            setSuccessMsg(
              'Konto skapat! Kolla din e-post för att bekräfta kontot, eller logga in direkt om e-postbekräftelse är avstängd.'
            );
          }
        }
      } else if (view === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMsg(
          'Om e-postadressen finns registrerad har vi skickat en återställningslänk till din inkorg.'
        );
      }
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isNetworkError =
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('placeholder');

      if (isNetworkError && cleanEmail) {
        onAuthenticated(cleanEmail, targetMode);
        return;
      }

      if (msg.includes('Invalid login credentials')) {
        setErrorMsg('Fel e-postadress eller lösenord.');
      } else if (msg.includes('User already registered')) {
        setErrorMsg('E-postadressen är redan registrerad. Testa att logga in istället.');
      } else {
        setErrorMsg(msg || 'Ett oväntat fel uppstod.');
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
              if (view === 'forgot_password') {
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

        {/* Main Auth Form with directional transition */}
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

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-rose-600 dark:text-rose-400 text-xs font-medium">
              <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <CheckCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Unified Hairline-Divided Card (Zero box-in-box) */}
            <div className="rounded-3xl bg-[var(--surface-color)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
              <label className="px-4 py-3.5 block cursor-text">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  E-postadress
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="namn@exempel.se"
                  className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none"
                />
              </label>

              {view !== 'forgot_password' && (
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                      Lösenord
                    </span>
                    {view === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchView('forgot_password', 'forward')}
                        className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
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
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minst 6 tecken"
                      className="w-full bg-transparent border-0 p-0 text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer shrink-0"
                      aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                    >
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <SpinnerGap size={16} className="animate-spin" />}
              {view === 'login' && 'Logga in'}
              {view === 'register' && 'Skapa konto'}
              {view === 'forgot_password' && 'Skicka återställningslänk'}
            </button>
          </form>
        </main>

        {/* Footer switch between login / register */}
        <footer className="text-center pt-2">
          {view === 'login' && (
            <p className="text-xs text-[var(--text-muted)]">
              Inget konto än?{' '}
              <button
                type="button"
                onClick={() => switchView('register', 'forward')}
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
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col justify-between max-w-md mx-auto px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] font-sans select-none overflow-x-hidden">
      {/* Top Bar */}
      <header className="flex items-center justify-between h-12">
        <img
          src="/dejz_mork.png"
          alt="Dejz"
          className="dejz-logo h-6 w-auto object-contain dark:invert"
        />
      </header>

      {/* Main Focal Content */}
      <main
        key="landing-main"
        className={`my-auto py-8 space-y-6 ${
          slideDir === 'back' ? 'animate-page-back' : 'animate-fade-in'
        }`}
      >
        {/* Minimal Copy */}
        <div className="space-y-2.5 text-center px-2">
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)] leading-tight">
            Koll på pengarna.
            <br />
            Från lön till lön.
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Se vad du har kvar att spendera varje dag.
          </p>
        </div>
      </main>

      {/* Bottom Actions */}
      <footer className="space-y-2.5">
        <button
          type="button"
          onClick={() => openAuthPage('register')}
          className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
        >
          <span>Kom igång</span>
          <ArrowRight size={16} weight="bold" />
        </button>

        <button
          type="button"
          onClick={() => openAuthPage('login')}
          className="w-full py-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-display font-bold text-sm hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all cursor-pointer"
        >
          Logga in
        </button>

        {existingEmail && onContinueExisting && (
          <button
            type="button"
            onClick={onContinueExisting}
            className="w-full pt-2 text-center text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer truncate"
          >
            Fortsätt som {existingEmail} →
          </button>
        )}
      </footer>
    </div>
  );
};
