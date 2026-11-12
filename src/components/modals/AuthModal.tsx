import { appOrigin } from '../../utils/platform';
import { signInWithProvider } from '../../utils/nativeAuth';
import { friendlyAuthError } from '../../utils/authErrors';
import React, { useState, useEffect } from 'react';
import {
  SpinnerGap,
  Eye,
  EyeSlash,
  EnvelopeSimple,
  WarningCircle,
  PaperPlaneTilt,
  CaretLeft,
  X,
} from '@phosphor-icons/react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { BottomSheet } from '../ui/BottomSheet';
import { BrandLogo } from '../BrandLogo';
import { SocialSignInButtons } from '../landing/SocialSignInButtons';

interface AuthModalProps {
  isOpen: boolean;
  initialView?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (email: string, mode?: 'login' | 'register') => void;
}

type AuthView = 'login' | 'register' | 'forgot_password';

// Samma rubriker och undertexter som inloggningssidan (landing/AuthFormView)
const AUTH_TITLES: Record<AuthView, string> = {
  login: 'Logga in',
  register: 'Skapa konto',
  forgot_password: 'Glömt lösenord',
};
const AUTH_SUBTITLES: Record<AuthView, string> = {
  login: 'Välkommen tillbaka.',
  register: 'Gratis – och klart på två minuter.',
  forgot_password: 'Skriv din e-post så skickar vi en länk där du väljer ett nytt lösenord.',
};

/** Registrering är öppen – Dejz är en gratis betaversion. */
const SIGNUPS_OPEN = true;

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialView = 'login',
  onClose,
  onSuccess,
}) => {
  const allowedInitialView: AuthView =
    !SIGNUPS_OPEN && initialView === 'register' ? 'login' : initialView;
  const [view, setView] = useState<AuthView>(allowedInitialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasPasswordError, setHasPasswordError] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Återställ vyn när rutan öppnas (eller startvyn byts medan den är öppen).
  // Görs under render ("adjust state when a prop changes") i stället för i en effekt.
  const resetKey: AuthView | null = isOpen ? allowedInitialView : null;
  const [prevResetKey, setPrevResetKey] = useState<AuthView | null>(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    if (resetKey !== null) {
      setView(resetKey);
      setErrorMsg(null);
      setHasPasswordError(false);
      setResetEmailSent(false);
    }
  }

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleReset = () => {
    setErrorMsg(null);
    setHasPasswordError(false);
    setResetEmailSent(false);
  };

  const handleGoogleSignIn = async (provider: 'google' | 'apple' = 'google') => {
    handleReset();
    setGoogleLoading(true);
    try {
      if (!isSupabaseConfigured) {
        onSuccess(email.trim() || 'anvandare@gmail.com');
        setTimeout(() => onClose(), 800);
        return;
      }

      // Webben: vanlig omdirigering. iPhone-appen: iPhonens inloggningsfönster.
      await signInWithProvider(provider);
    } catch (err: unknown) {
      const friendly = friendlyAuthError(err);
      setErrorMsg(friendly.kind === 'unknown' ? 'Kunde inte logga in med Google. Försök igen.' : friendly.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendResetEmail = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail) return;
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${appOrigin()}/reset-password`,
      });
      if (error) throw error;
    }
  };

  const handleResendReset = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      await handleSendResetEmail(email);
      setResendCooldown(45);
    } catch {
      setResendCooldown(30);
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleReset();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Ange en giltig e-postadress.');
      setShakeTrigger((prev) => prev + 1);
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        if (view === 'forgot_password') {
          setResetEmailSent(true);
          setResendCooldown(45);
          return;
        }

        onSuccess(cleanEmail);
        setTimeout(() => onClose(), 600);
        return;
      }

      if (view === 'forgot_password') {
        await handleSendResetEmail(cleanEmail);
        setResetEmailSent(true);
        setResendCooldown(45);
        return;
      }

      if (view === 'register') {
        if (password.length < 6) {
          setErrorMsg('Lösenordet måste bestå av minst 6 tecken.');
          setShakeTrigger((prev) => prev + 1);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) throw error;

        onSuccess(data.user?.email || cleanEmail, 'register');
        setTimeout(() => onClose(), 600);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;

        if (data.user?.email) {
          onSuccess(data.user.email, 'login');
        }
        setTimeout(() => onClose(), 400);
      }
    } catch (err: unknown) {
      const friendly = friendlyAuthError(err);
      if (friendly.kind === 'invalid_credentials') {
        setHasPasswordError(true);
      } else {
        setErrorMsg(friendly.message);
      }
      setShakeTrigger((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const isSubView = view === 'forgot_password' || resetEmailSent;
  const goBackToLogin = () => {
    setView('login');
    handleReset();
  };
  const switchTo = (next: AuthView) => {
    setView(next);
    handleReset();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      surfaceClass="bg-[var(--bg-color)]"
      contentClassName="px-5 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto"
    >
      {/* Samma utseende som inloggningssidan: logga i mitten, stor rubrik, vita fältkort */}
      <header className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center h-10">
        {isSubView ? (
          <button
            type="button"
            onClick={goBackToLogin}
            className="ui-header-btn"
            aria-label="Tillbaka"
            title="Tillbaka"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <BrandLogo className="h-6 justify-self-center text-[var(--accent-color)]" />
        <button
          type="button"
          onClick={onClose}
          className="ui-header-btn"
          aria-label="Stäng"
          title="Stäng"
        >
          <X size={15} weight="bold" />
        </button>
      </header>

      {resetEmailSent ? (
        <div className="pt-8 pb-2 text-center space-y-5 animate-scale-in">
          <span className="ui-auth-icon-tile mx-auto" aria-hidden="true">
            <EnvelopeSimple size={28} weight="regular" />
          </span>

          <div className="space-y-2 px-2">
            <h2 className="ui-step-title">Kolla din inkorg</h2>
            <p className="text-callout text-[var(--text-secondary)]">
              Vi har skickat en återställningslänk till:
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-color)] shadow-[var(--card-shadow)] text-callout font-semibold text-[var(--text-primary)] max-w-full">
              <span className="truncate max-w-[240px]">{email.trim()}</span>
            </div>
            <p className="text-footnote text-[var(--text-secondary)] pt-1 leading-relaxed max-w-xs mx-auto">
              Klicka på länken i mejlet för att välja ett nytt lösenord. Hittar du det inte? Kika i skräpposten.
            </p>
          </div>

          <div className="flex items-center justify-between px-1 pt-2">
            <button
              type="button"
              onClick={() => setResetEmailSent(false)}
              className="text-footnote font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Fel e-post? Ändra
            </button>

            <button
              type="button"
              disabled={resendCooldown > 0 || resending}
              onClick={handleResendReset}
              className="text-footnote font-semibold text-[var(--accent-color)] hover:opacity-75 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {resending && <SpinnerGap size={12} className="animate-spin" />}
              {resendCooldown > 0 ? `Skicka igen om ${resendCooldown}s` : 'Skicka igen'}
            </button>
          </div>
        </div>
      ) : (
        <div key={`auth-modal-${view}`} className="pt-6 space-y-6 animate-fade-in">
          <div>
            <h2 className="ui-step-title">{AUTH_TITLES[view]}</h2>
            <p className="ui-onb-subtitle">{AUTH_SUBTITLES[view]}</p>
          </div>

          {view !== 'forgot_password' && (
            <SocialSignInButtons
              disabled={googleLoading || loading}
              googleLoading={googleLoading}
              onSignIn={(provider) => handleGoogleSignIn(provider)}
            />
          )}

          {errorMsg && !hasPasswordError && (
            <div className="ui-auth-alert animate-scale-in">
              <WarningCircle size={18} weight="fill" className="shrink-0 mt-px" />
              <span className="min-w-0 flex-1">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              key={shakeTrigger}
              className={`ui-auth-field-card ${hasPasswordError ? 'ui-auth-field-card-error animate-shake' : ''}`}
            >
              <label className="px-4 py-3.5 block cursor-text">
                <span className="ui-field-label block mb-1">E-postadress</span>
                <input
                  type="email"
                  required
                  placeholder="namn@exempel.se"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (hasPasswordError || errorMsg) handleReset();
                  }}
                  className="ui-field-input"
                />
              </label>

              {view !== 'forgot_password' && (
                <div className="ui-auth-field-divider px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="ui-field-label">Lösenord</span>
                    {view === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchTo('forgot_password')}
                        className="text-footnote font-medium text-[var(--accent-color)] hover:opacity-80 cursor-pointer"
                      >
                        Glömt lösenord?
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      aria-label="Lösenord"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder={view === 'register' ? 'Minst 6 tecken' : 'Ditt lösenord'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (hasPasswordError || errorMsg) handleReset();
                      }}
                      className="ui-field-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                      className="ui-clear-btn"
                    >
                      {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {hasPasswordError && (
                <div className="ui-auth-field-divider px-4 py-3 flex items-center gap-2 text-footnote text-negative font-medium animate-scale-in">
                  <WarningCircle size={16} weight="fill" className="shrink-0" />
                  <span>Fel e-post eller lösenord. Försök igen.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="ui-btn-primary gap-2"
            >
              {loading ? (
                <SpinnerGap size={16} className="animate-spin" />
              ) : view === 'login' ? (
                'Logga in'
              ) : view === 'register' ? (
                'Skapa konto'
              ) : (
                <>
                  <span>Skicka länk</span>
                  <PaperPlaneTilt size={16} weight="bold" />
                </>
              )}
            </button>
          </form>

          {/* Byt mellan logga in / skapa konto – samma länk som på inloggningssidan */}
          <p className="text-center text-callout text-[var(--text-secondary)]">
            {view === 'login' && SIGNUPS_OPEN && (
              <>
                Inget konto än?{' '}
                <button type="button" onClick={() => switchTo('register')} className="ui-auth-footer-link">
                  Skapa konto
                </button>
              </>
            )}
            {view === 'register' && (
              <>
                Har du redan ett konto?{' '}
                <button type="button" onClick={() => switchTo('login')} className="ui-auth-footer-link">
                  Logga in
                </button>
              </>
            )}
            {view === 'forgot_password' && (
              <button type="button" onClick={goBackToLogin} className="ui-auth-footer-link">
                Tillbaka till inloggning
              </button>
            )}
          </p>
        </div>
      )}
    </BottomSheet>
  );
};
