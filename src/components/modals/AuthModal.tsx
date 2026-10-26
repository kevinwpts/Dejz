import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Envelope,
  SpinnerGap,
  Eye,
  EyeSlash,
  ArrowLeft,
  CheckCircle,
} from '@phosphor-icons/react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  const handleReset = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleGoogleSignIn = async () => {
    handleReset();
    setGoogleLoading(true);
    try {
      if (!isSupabaseConfigured) {
        setSuccessMsg('Google-inloggning godkänd (preview-läge).');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleReset();

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Vänligen ange en giltig e-postadress.');
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        if (view === 'forgot_password') {
          setSuccessMsg(`En återställningslänk har skickats till ${cleanEmail}.`);
          setTimeout(() => {
            setView('login');
            handleReset();
          }, 2500);
          return;
        }

        setSuccessMsg('Inloggad (preview-läge).');
        onSuccess(cleanEmail);
        setTimeout(() => onClose(), 700);
        return;
      }

      if (view === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
        });
        if (error) throw error;
        setSuccessMsg(`En återställningslänk har skickats till ${cleanEmail}. Kontrollera din inkorg.`);
        setTimeout(() => {
          setView('login');
          handleReset();
        }, 3000);
        return;
      }

      if (view === 'register') {
        if (password.length < 6) {
          setErrorMsg('Lösenordet måste bestå av minst 6 tecken.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Lösenorden matchar inte.');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) throw error;

        setSuccessMsg('Ditt konto har skapats!');
        onSuccess(data.user?.email || cleanEmail, 'register');
        setTimeout(() => onClose(), 600);
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;

        setSuccessMsg('Välkommen tillbaka!');
        if (data.user?.email) {
          onSuccess(data.user.email, 'login');
        }
        setTimeout(() => onClose(), 400);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ett fel inträffade. Kontrollera dina uppgifter.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mt-auto bg-[var(--surface-color)] rounded-t-3xl rounded-b-none p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] border-t border-x border-[var(--border-subtle)] shadow-modal max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-[var(--border-control)] mx-auto mb-3" />
        {/* Top Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {view === 'forgot_password' && (
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  handleReset();
                }}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors mr-1 cursor-pointer"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                {view === 'login'
                  ? 'Logga in på Dejz'
                  : view === 'register'
                  ? 'Skapa konto'
                  : 'Återställ lösenord'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {view === 'login'
                  ? 'Få tillgång till din budget och autosynk'
                  : view === 'register'
                  ? 'Börja ta kontroll över dina pengar'
                  : 'Ange din e-post för att få en återställningslänk'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* View Switcher (Login / Register) */}
        {view !== 'forgot_password' && (
          <div className="flex rounded-xl bg-[var(--surface-raised)] p-1 border border-[var(--border-subtle)] mb-5">
            <button
              type="button"
              onClick={() => {
                setView('login');
                handleReset();
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                view === 'login'
                  ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Logga in
            </button>
            <button
              type="button"
              onClick={() => {
                setView('register');
                handleReset();
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                view === 'register'
                  ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Skapa konto
            </button>
          </div>
        )}

        {/* Feedback messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs animate-fade-in flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs animate-fade-in flex items-start gap-2">
            <CheckCircle size={15} className="shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google Sign In Button (only for Login and Register) */}
        {view !== 'forgot_password' && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs mb-4"
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

            {/* Hairline Divider */}
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
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              E-postadress
            </label>
            <div className="relative">
              <Envelope
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              />
              <input
                type="email"
                required
                placeholder="namn@exempel.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]"
              />
            </div>
          </div>

          {view !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">
                  Lösenord
                </label>
                {view === 'login' && (
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
                )}
              </div>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={view === 'register' ? 'Minst 6 tecken' : 'Ditt lösenord'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {view === 'register' && (
            <div className="animate-fade-in">
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Upprepa lösenord
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Upprepa ditt lösenord"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-2 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {loading ? (
              <SpinnerGap size={16} className="animate-spin" />
            ) : view === 'login' ? (
              'Logga in'
            ) : view === 'register' ? (
              'Skapa konto'
            ) : (
              'Skicka återställningslänk'
            )}
          </button>
        </form>

        {/* Bottom Switch Link */}
        <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
          {view === 'login' ? (
            <p>
              Har du inget konto än?{' '}
              <button
                type="button"
                onClick={() => {
                  setView('register');
                  handleReset();
                }}
                className="font-bold text-[var(--text-primary)] hover:underline cursor-pointer"
              >
                Skapa ett här
              </button>
            </p>
          ) : view === 'register' ? (
            <p>
              Har du redan ett konto?{' '}
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  handleReset();
                }}
                className="font-bold text-[var(--text-primary)] hover:underline cursor-pointer"
              >
                Logga in här
              </button>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                setView('login');
                handleReset();
              }}
              className="font-bold text-[var(--text-primary)] hover:underline cursor-pointer"
            >
              ← Tillbaka till inloggning
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
