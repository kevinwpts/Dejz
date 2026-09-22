import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'motion/react';
import { createFreshTestAccount } from '../utils/demoData';
import { Mail, Lock, ChevronLeft, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { DejzLogo } from './DejzLogo';

interface AuthProps {
  onShowToast: (message: string, type: 'success' | 'error') => void;
  onLegalClick: (type: 'privacy' | 'terms' | 'cookies' | 'contact') => void;
  t: (key: TranslationKey) => string;
  initialIsRegistering?: boolean;
  onBack?: () => void;
}

export function Auth({ onShowToast, onLegalClick, t, initialIsRegistering = false, onBack }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(initialIsRegistering);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleQuickTestLogin = () => {
    setEmail('test@example.com');
    setPassword('123456');
    setLoading(true);
    setTimeout(() => {
      createFreshTestAccount();
      onShowToast("Nytt testkonto initierat! Startar onboarding...", "success");
      window.location.reload();
    }, 400);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const lowerEmail = email.toLowerCase().trim();
    const isMockEmail = lowerEmail.includes('demo') || 
                        lowerEmail.includes('test') || 
                        lowerEmail.includes('fake') || 
                        lowerEmail.includes('fejk') || 
                        lowerEmail.endsWith('@example.com');

    if (isMockEmail) {
      setTimeout(() => {
        createFreshTestAccount();
        onShowToast(isRegistering ? "Nytt testkonto skapat!" : "Inloggad med testkonto!", "success");
        window.location.reload();
      }, 500);
      return;
    }

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              dark_mode: false,
            },
          },
        });
        if (error) throw error;
        
        if (data.user && !data.session) {
          setIsEmailSent(true);
        } else {
          onShowToast(t('checkEmail'), 'success');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      let message = err.message;
      
      if (message === 'Invalid login credentials') {
        message = t('invalidCredentials' as any) || 'Felaktig e-post eller lösenord';
      } else if (message === 'Email not confirmed') {
        message = t('emailNotConfirmed' as any) || 'E-postadressen har inte bekräftats än. Kolla din inkorg.';
      } else if (message === 'User not found') {
        message = t('userNotFound' as any) || 'Ingen användare hittades med denna e-post.';
      } else if (message === 'User already registered') {
        message = 'Ett konto med denna e-postadress finns redan. Välj "Logga in" istället.';
      } else if (message?.includes('Password should be at least')) {
        message = 'Lösenordet måste vara minst 6 tecken långt.';
      } else if (!message) {
        message = t('authError' as any) || 'Ett fel uppstod vid inloggning.';
      }

      setError(message);
      onShowToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google') => {
    try {
      let inIframe = false;
      try {
        inIframe = window.self !== window.top;
      } catch (_e) {
        inIframe = true;
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: inIframe,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });
      if (error) throw error;
      
      if (inIframe && data?.url) {
        const popup = window.open(data.url, '_blank');
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          onShowToast("Inloggningsfönstret blockerades. Tillåt popup-fönster i din webbläsare eller öppna appen i en ny flik.", 'error');
          setError("Inloggningsfönstret blockerades av din webbläsare. Tillåt popup-fönster eller öppna appen i en ny flik.");
        } else {
          onShowToast("Öppnade inloggning i ett nytt fönster.", 'success');
        }
      }
    } catch (err: any) {
      let msg = err.message || t('error');
      if (msg.includes('provider is not enabled') || msg.includes('Unsupported provider')) {
        msg = "Google-inloggning är inte aktiverad i din Supabase-instrumentpanel ännu.";
      }
      setError(msg);
      onShowToast(msg, 'error');
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-6 bg-[var(--bg-color)] selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)] relative overflow-hidden pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      {/* Subtle Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40 dark:opacity-100">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-sky-400/10 blur-[120px] rounded-full pointer-events-none" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-[420px] bg-[var(--surface-color)] p-6 sm:p-8 rounded-[28px] border border-[var(--border-color)] shadow-xs relative z-10"
      >
        <AnimatePresence mode="wait">
          {isEmailSent ? (
            <motion.div
              key="email-sent"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="text-center py-4 space-y-6"
            >
              <div className="w-16 h-16 bg-[var(--accent-color)]/10 text-[var(--accent-color)] rounded-[20px] flex items-center justify-center mx-auto border border-[var(--accent-color)]/20 shadow-xs">
                <Mail size={28} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                  {t('checkEmailTitle' as any)}
                </h2>
                <p className="text-[var(--text-secondary)] text-sm font-medium leading-relaxed max-w-[320px] mx-auto">
                  {t('checkEmailDesc' as any)}
                </p>
              </div>

              <button
                onClick={() => {
                  setIsEmailSent(false);
                  setIsRegistering(false);
                }}
                className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 px-4 rounded-[16px] font-bold text-sm active:scale-[0.98] transition-all cursor-pointer shadow-xs"
              >
                {t('backToLogin' as any)}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="auth-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header with Back Button and Logo */}
              <div className="relative flex flex-col items-center mb-6">
                {onBack && (
                  <button 
                    onClick={onBack}
                    className="absolute top-0 left-0 w-9 h-9 flex items-center justify-center rounded-[12px] bg-[var(--surface-muted)] hover:bg-[var(--surface-color)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs"
                    aria-label="Tillbaka"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                
                <div className="flex flex-col items-center pt-1 mb-3 select-none">
                  <DejzLogo className="text-3xl font-black" textColor="var(--logo-color, #0B3DA5)" />
                </div>

                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
                  {isRegistering ? t('createAccount') : t('welcome')}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                  {isRegistering ? 'Skapa ditt konto på några sekunder' : 'Logga in för att fortsätta'}
                </p>
              </div>

              {/* Modern Segmented Pill Switcher */}
              <div className="p-1 bg-[var(--surface-muted)] rounded-[16px] border border-[var(--border-color)] flex items-center mb-5 relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(false);
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-[12px] text-xs font-bold transition-all relative z-10 cursor-pointer ${
                    !isRegistering
                      ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t('login')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setError(null);
                  }}
                  className={`flex-1 py-2 rounded-[12px] text-xs font-bold transition-all relative z-10 cursor-pointer ${
                    isRegistering
                      ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t('createAccount')}
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-3.5">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 p-3.5 rounded-[16px] border border-red-500/20 flex items-center gap-2.5 text-red-500 text-xs font-semibold"
                  >
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="space-y-2.5">
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
                      <Mail size={16} />
                    </div>
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Din e-postadress"
                      className="w-full bg-[var(--surface-muted)] focus:bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[16px] pl-10 pr-4 py-3 font-medium text-xs sm:text-sm text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 outline-none transition-all placeholder-[var(--text-secondary)]/50"
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none">
                      <Lock size={16} />
                    </div>
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ditt lösenord (minst 6 tecken)"
                      className="w-full bg-[var(--surface-muted)] focus:bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[16px] pl-10 pr-4 py-3 font-medium text-xs sm:text-sm text-[var(--text-primary)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20 outline-none transition-all placeholder-[var(--text-secondary)]/50"
                    />
                  </div>
                </div>

                <div className="pt-1.5 space-y-2.5">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3.5 px-4 rounded-[16px] font-bold text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-95 shadow-xs cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <span>{isRegistering ? t('createAccount') : t('login')}</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleQuickTestLogin}
                    disabled={loading}
                    className="w-full text-xs font-bold text-[var(--accent-color)] hover:text-[var(--accent-color)] bg-[var(--accent-color)]/8 hover:bg-[var(--accent-color)]/14 py-2.5 px-4 rounded-[16px] transition-all border border-[var(--accent-color)]/20 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={13} />
                    <span>Snabbtest: Logga in med testkonto</span>
                  </button>
                </div>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px bg-[var(--border-color)] flex-1"></div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-60">{t('orContinueWith')}</span>
                <div className="h-px bg-[var(--border-color)] flex-1"></div>
              </div>

              <button 
                onClick={() => handleSocialLogin('google')}
                className="w-full bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-xs sm:text-sm py-3 px-4 rounded-[16px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer shadow-xs"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.28 1.5-1.11 2.76-2.36 3.61v3h3.84c2.25-2.07 3.65-5.12 3.65-8.46Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.84-3c-1.07.72-2.45 1.16-4.09 1.16-3.15 0-5.81-2.13-6.76-5.01H1.27v3.1A11.986 11.986 0 0 0 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.24 14.24a7.15 7.15 0 0 1 0-4.48V6.66H1.27a11.99 11.99 0 0 0 0 10.68l3.97-3.1Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.33 2.67 1.27 6.66l3.97 3.1c.95-2.88 3.61-5.01 6.76-5.01Z"
                  />
                </svg>
                <span>{t('continueWithGoogle' as any)}</span>
              </button>

              <div className="mt-5 pt-3 border-t border-[var(--border-color)] flex items-center justify-center gap-4 text-[11px] font-semibold text-[var(--text-secondary)]">
                <button 
                  onClick={() => onLegalClick('privacy')}
                  className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {t('privacyPolicy' as any)}
                </button>
                <span>•</span>
                <button 
                  onClick={() => onLegalClick('terms')}
                  className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {t('termsOfService' as any)}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
