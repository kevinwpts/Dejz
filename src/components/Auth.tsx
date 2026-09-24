import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { createFreshTestAccount } from '../utils/demoData';
import { Mail, Lock, ChevronLeft, Sparkles, KeyRound, CheckCircle2 } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { DejzLogo } from './DejzLogo';
import { Button, Input, IconButton, SegmentedControl, Divider } from './ui';

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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Ange din e-postadress');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) throw error;

      setIsResetSent(true);
      onShowToast('Återställningslänk har skickats!', 'success');
    } catch (err: any) {
      console.error('Password reset error:', err);
      let message = err.message || 'Kunde inte skicka återställningslänk.';
      if (message.includes('rate limit')) {
        message = 'För många förfrågningar. Vänta en stund och försök igen.';
      }
      setError(message);
      onShowToast(message, 'error');
    } finally {
      setLoading(false);
    }
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

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
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
          queryParams: provider === 'google' ? {
            prompt: 'select_account',
            access_type: 'offline',
          } : undefined,
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
        const pName = provider === 'facebook' ? 'Facebook' : 'Google';
        msg = `${pName}-inloggning är inte aktiverad i din Supabase-instrumentpanel ännu.`;
      }
      setError(msg);
      onShowToast(msg, 'error');
    }
  };

  return (
    <div className="light min-h-dvh flex items-center justify-center p-4 sm:p-6 bg-[#FAFAF8] text-[#0B0A12] selection:bg-[#0B0A12] selection:text-white relative overflow-hidden pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      {/* Subtle Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] bg-gradient-to-tr from-black/[0.03] via-black/[0.015] to-transparent blur-[120px] rounded-full pointer-events-none" />
      </div>

      <div
        className="w-full max-w-[420px] bg-white p-6 sm:p-8 rounded-[28px] border border-[#E5E3DE] shadow-xs relative z-10 text-[#0B0A12]"
      >
        {isEmailSent ? (
          <div
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

            <Button
              onClick={() => {
                setIsEmailSent(false);
                setIsRegistering(false);
              }}
              variant="primary"
              fullWidth
            >
              {t('backToLogin' as any)}
            </Button>
          </div>
        ) : isResetSent ? (
          <div
            className="text-center py-4 space-y-6"
          >
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-[20px] flex items-center justify-center mx-auto border border-emerald-500/20 shadow-xs">
              <CheckCircle2 size={30} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {t('checkInboxTitle' as any)}
              </h2>
              <p className="text-[var(--text-secondary)] text-sm font-medium leading-relaxed max-w-[320px] mx-auto">
                {t('checkInboxDesc' as any, { email })}
              </p>
            </div>

            <Button
              onClick={() => {
                setIsResetSent(false);
                setIsForgotPassword(false);
              }}
              variant="primary"
              fullWidth
            >
              {t('backToLogin' as any)}
            </Button>
          </div>
        ) : isForgotPassword ? (
          <div>
            {/* Header with Back Button and Logo */}
            <div className="relative flex flex-col items-center mb-6">
              <div className="absolute top-0 left-0">
                <IconButton 
                  icon={<ChevronLeft size={18} />}
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError(null);
                  }}
                  variant="muted"
                  size="sm"
                  aria-label={t('backToLogin' as any)}
                />
              </div>
              
              <div className="flex flex-col items-center pt-1 mb-3 select-none">
                <DejzLogo className="text-3xl font-black" textColor="var(--logo-color)" />
              </div>

              <div className="w-12 h-12 bg-[var(--accent-color)]/10 text-[var(--accent-color)] rounded-[16px] flex items-center justify-center mb-3">
                <KeyRound size={22} />
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1 text-center">
                {t('forgotPasswordTitle' as any)}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] text-center max-w-[300px]">
                {t('forgotPasswordDesc' as any)}
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email')}
                icon={<Mail size={16} />}
                error={error}
              />

              <div className="space-y-2 pt-1">
                <Button
                  type="submit"
                  loading={loading}
                  variant="primary"
                  fullWidth
                  size="lg"
                  icon={<KeyRound size={16} />}
                >
                  {t('sendResetLink' as any)}
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError(null);
                  }}
                  variant="ghost"
                  fullWidth
                  size="md"
                >
                  {t('cancelAndLogin' as any)}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            {/* Header with Back Button and Logo */}
            <div className="relative flex flex-col items-center mb-6">
              {onBack && (
                <div className="absolute top-0 left-0">
                  <IconButton 
                    icon={<ChevronLeft size={18} />}
                    onClick={onBack}
                    variant="muted"
                    size="sm"
                    aria-label="Tillbaka"
                  />
                </div>
              )}
              
              <div className="flex flex-col items-center pt-1 mb-3 select-none">
                <DejzLogo className="text-3xl font-black" textColor="var(--logo-color)" />
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
                {isRegistering ? t('createAccount') : t('welcome')}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                {isRegistering ? t('createAccountSubtitle' as any) : t('loginSubtitle' as any)}
              </p>
            </div>

            {/* Segmented Pill Switcher */}
            <div className="mb-5">
              <SegmentedControl
                value={isRegistering ? 'register' : 'login'}
                onChange={(val) => {
                  setIsRegistering(val === 'register');
                  setError(null);
                }}
                options={[
                  { value: 'login', label: t('login') },
                  { value: 'register', label: t('createAccount') },
                ]}
              />
            </div>

            <form onSubmit={handleAuth} className="space-y-3.5">
              <div className="space-y-2.5">
                <Input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('email')}
                  icon={<Mail size={16} />}
                />

                <div className="space-y-1.5">
                  <Input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('passwordPlaceholder' as any)}
                    icon={<Lock size={16} />}
                    error={error}
                  />

                  {!isRegistering && (
                    <div className="flex justify-end pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError(null);
                        }}
                        className="text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      >
                        {t('forgotPassword' as any)}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-1.5 space-y-2.5">
                <Button 
                  type="submit"
                  loading={loading}
                  variant="primary"
                  fullWidth
                >
                  {isRegistering ? t('createAccount') : t('login')}
                </Button>

                <Button
                  type="button"
                  onClick={handleQuickTestLogin}
                  disabled={loading}
                  variant="subtle"
                  fullWidth
                  icon={<Sparkles size={13} />}
                >
                  {t('quickTestBtn' as any)}
                </Button>
              </div>
            </form>

            <Divider label={t('orContinueWith')} />

            <div className="space-y-2.5">
              <Button 
                type="button"
                onClick={() => handleSocialLogin('google')}
                variant="secondary"
                fullWidth
                icon={
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
                }
              >
                {t('continueWithGoogle' as any)}
              </Button>

              <Button 
                type="button"
                onClick={() => handleSocialLogin('facebook')}
                variant="secondary"
                fullWidth
                icon={
                  <svg className="w-4 h-4 shrink-0 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                }
              >
                {t('continueWithFacebook' as any)}
              </Button>
            </div>

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
          </div>
        )}
      </div>
    </div>
  );
}
