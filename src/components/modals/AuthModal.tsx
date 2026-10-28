import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Envelope,
  SpinnerGap,
  Eye,
  EyeSlash,
  CaretLeft,
  CheckCircle,
  WarningCircle,
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialView]);

  const handleReset = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleGoogleSignIn = async () => {
    handleReset();
    setGoogleLoading(true);
    try {
      if (!isSupabaseConfigured) {
        setSuccessMsg('Inloggad med Google.');
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
      setErrorMsg('Ange en giltig e-postadress.');
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        if (view === 'forgot_password') {
          setSuccessMsg(`Återställningslänk skickad till ${cleanEmail}.`);
          setTimeout(() => {
            setView('login');
            handleReset();
          }, 2500);
          return;
        }

        setSuccessMsg('Inloggad.');
        onSuccess(cleanEmail);
        setTimeout(() => onClose(), 700);
        return;
      }

      if (view === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo:
            typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
        });
        if (error) throw error;
        setSuccessMsg(`Återställningslänk skickad till ${cleanEmail}.`);
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

        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) throw error;

        setSuccessMsg('Konto skapat!');
        onSuccess(data.user?.email || cleanEmail, 'register');
        setTimeout(() => onClose(), 600);
      } else {
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
      setErrorMsg(err.message || 'Kontrollera dina uppgifter och försök igen.');
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
        {view === 'forgot_password' ? (
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
              Återställ lösenord
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

      {/* Feedback messages */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs animate-fade-in flex items-start gap-2">
          <WarningCircle size={15} className="shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs animate-fade-in flex items-start gap-2">
          <CheckCircle size={15} className="shrink-0 mt-0.5" />
          <span>{successMsg}</span>
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
        <div className="ui-sheet-group">
          <label className="ui-input-row">
            <span className="text-[var(--text-muted)] shrink-0 flex items-center gap-2">
              <Envelope size={15} />
              <span>E-post</span>
            </span>
            <input
              type="email"
              required
              placeholder="namn@exempel.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ui-inline-input"
            />
          </label>

          {view !== 'forgot_password' && (
            <label className="ui-input-row">
              <span className="text-[var(--text-muted)] shrink-0 flex items-center gap-2">
                <Lock size={15} />
                <span>Lösenord</span>
              </span>
              <div className="flex items-center justify-end gap-2 flex-1 min-w-0">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder={view === 'register' ? 'Minst 6 tecken' : 'Ditt lösenord'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ui-inline-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer shrink-0"
                >
                  {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>
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
          className="ui-btn-primary"
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
    </BottomSheet>
  );
};
