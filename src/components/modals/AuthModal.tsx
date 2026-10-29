import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Envelope,
  SpinnerGap,
  Eye,
  EyeSlash,
  CaretLeft,
  EnvelopeSimple,
  ArrowSquareOut,
  WarningCircle,
  PaperPlaneTilt,
} from '@phosphor-icons/react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';
import { BottomSheet } from '../ui/BottomSheet';

interface AuthModalProps {
  isOpen: boolean;
  initialView?: 'login' | 'register';
  onClose: () => void;
  onSuccess: (email: string, mode?: 'login' | 'register') => void;
}

type AuthView = 'login' | 'register' | 'forgot_password';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialView = 'login',
  onClose,
  onSuccess,
}) => {
  const [view, setView] = useState<AuthView>(initialView);
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

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setErrorMsg(null);
      setHasPasswordError(false);
      setResetEmailSent(false);
    }
  }, [isOpen, initialView]);

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

  const handleGoogleSignIn = async () => {
    handleReset();
    setGoogleLoading(true);
    try {
      if (!isSupabaseConfigured) {
        onSuccess(email.trim() || 'anvandare@gmail.com');
        setTimeout(() => onClose(), 800);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Kunde inte logga in med Google. Försök igen.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendResetEmail = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail) return;
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
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
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setHasPasswordError(true);
        setShakeTrigger((prev) => prev + 1);
      } else {
        setErrorMsg(msg || 'Kontrollera dina uppgifter och försök igen.');
        setShakeTrigger((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="px-5 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto"
    >
      {/* Top Header */}
      <div className="ui-sheet-header">
        {view === 'forgot_password' || resetEmailSent ? (
          <>
            <button
              type="button"
              onClick={() => {
                setView('login');
                handleReset();
              }}
              title="Tillbaka"
              aria-label="Tillbaka"
              className="ui-icon-btn"
            >
              <CaretLeft size={15} weight="bold" />
            </button>
            <span className="ui-sheet-title">
              {resetEmailSent ? 'Kolla inkorgen' : 'Återställ lösenord'}
            </span>
          </>
        ) : (
          <span className="ui-sheet-title">
            {view === 'login' ? 'Logga in' : 'Skapa konto'}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ui-icon-btn"
        >
          <X size={16} />
        </button>
      </div>

      {resetEmailSent ? (
        /* Modern "Check your inbox" screen in modal */
        <div className="py-5 text-center space-y-6 animate-scale-in">
          <div className="w-16 h-16 rounded-3xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto shadow-subtle relative">
            <EnvelopeSimple size={30} weight="duotone" className="text-[var(--text-primary)]" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[var(--surface-color)]" />
            </span>
          </div>

          <div className="space-y-2 px-2">
            <h2 className="font-display font-semibold text-xl sm:text-2xl tracking-[-0.012em] text-[var(--text-primary)]">
              Kolla din inkorg
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Vi har skickat en återställningslänk till:
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] max-w-full">
              <span className="truncate max-w-[240px]">{email.trim()}</span>
            </div>
            <p className="text-[11.5px] text-[var(--text-muted)] pt-1 leading-relaxed max-w-xs mx-auto">
              Klicka på länken i mejlet för att välja ett nytt lösenord. Hittar du det inte? Kika i skräpposten.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href="mailto:"
              className="ui-btn-primary gap-2"
            >
              <span>Öppna e-postapp</span>
              <ArrowSquareOut size={15} weight="bold" />
            </a>

            <div className="flex items-center justify-between px-1 pt-1">
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
          </div>
        </div>
      ) : (
        <>
          {/* View Switcher (Login / Register) */}
          {view !== 'forgot_password' && (
            <div className="ui-segmented grid-cols-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  handleReset();
                }}
                className={view === 'login' ? 'ui-segmented-tab-active' : 'ui-segmented-tab'}
              >
                Logga in
              </button>
              <button
                type="button"
                onClick={() => {
                  setView('register');
                  handleReset();
                }}
                className={view === 'register' ? 'ui-segmented-tab-active' : 'ui-segmented-tab'}
              >
                Skapa konto
              </button>
            </div>
          )}

          {/* General Non-Password Error Notice */}
          {errorMsg && !hasPasswordError && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs animate-scale-in flex items-start gap-2">
              <WarningCircle size={15} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          {view !== 'forgot_password' && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="ui-btn-secondary mb-4 gap-2.5"
              >
                {googleLoading ? (
                  <SpinnerGap size={16} className="animate-spin text-[var(--text-primary)]" />
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
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Fortsätt med Google</span>
              </button>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-subtle)]" />
                </div>
                <span className="relative px-3 bg-[var(--surface-color)] text-[11px] text-[var(--text-muted)] font-medium">
                  eller med e-post
                </span>
              </div>
            </>
          )}

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              key={shakeTrigger}
              className={`ui-sheet-group transition-all ${
                hasPasswordError
                  ? 'border-rose-500/50 ring-1 ring-rose-500/20 animate-shake'
                  : ''
              }`}
            >
              <label className="px-4 py-3.5 block cursor-text">
                <span className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                  E-postadress
                </span>
                <input
                  type="email"
                  required
                  placeholder="namn@exempel.se"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (hasPasswordError || errorMsg) handleReset();
                  }}
                  className="w-full bg-transparent border-0 p-0 text-base font-normal text-[var(--text-primary)] placeholder-[var(--text-muted)]/55 focus:outline-none"
                />
              </label>

              {view !== 'forgot_password' && (
                <label className="px-4 py-3.5 block cursor-text">
                  <span className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                    Lösenord
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder={view === 'register' ? 'Minst 6 tecken' : 'Ditt lösenord'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (hasPasswordError || errorMsg) handleReset();
                      }}
                      className="w-full bg-transparent border-0 p-0 text-base font-normal text-[var(--text-primary)] placeholder-[var(--text-muted)]/55 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer shrink-0"
                    >
                      {showPassword ? <EyeSlash size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </label>
              )}

              {/* Inline Password Error micro-banner */}
              {hasPasswordError && (
                <div className="px-3.5 py-2 bg-rose-500/5 flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-400 font-medium animate-scale-in">
                  <div className="flex items-center gap-1.5">
                    <WarningCircle size={13} weight="bold" className="shrink-0" />
                    <span>Fel lösenord. Kontrollera och försök igen.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setView('forgot_password');
                      handleReset();
                    }}
                    className="font-semibold underline hover:opacity-80 cursor-pointer shrink-0 ml-2"
                  >
                    Glömt?
                  </button>
                </div>
              )}
            </div>

            {view === 'login' && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot_password');
                    handleReset();
                  }}
                  className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Glömt lösenord?
                </button>
              </div>
            )}

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
                  <span>Skicka återställningslänk</span>
                  <PaperPlaneTilt size={15} weight="bold" />
                </>
              )}
            </button>
          </form>
        </>
      )}
    </BottomSheet>
  );
};
