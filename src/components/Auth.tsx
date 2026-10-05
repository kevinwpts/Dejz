import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { createFreshTestAccount } from '../utils/demoData';
import { Mail, Lock, ChevronLeft, CheckCircle2 } from 'lucide-react';
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

    if (isRegistering && password.length < 6) {
      const message = 'Lösenordet måste vara minst 6 tecken långt.';
      setError(message);
      onShowToast(message, 'error');
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              dark_mode: true,
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
        msg = `Google-inloggning är inte aktiverad i din Supabase-instrumentpanel ännu.`;
      }
      setError(msg);
      onShowToast(msg, 'error');
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-between p-6 sm:p-10 bg-[var(--bg-color)] selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)] relative overflow-hidden pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      {/* Top Left Back Button */}
      {onBack && (
        <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-30">
          <IconButton 
            icon={<ChevronLeft size={18} />}
            onClick={() => {
              if (isForgotPassword) {
                setIsForgotPassword(false);
                setError(null);
              } else if (isEmailSent) {
                setIsEmailSent(false);
                setIsRegistering(false);
              } else if (isResetSent) {
                setIsResetSent(false);
                setIsForgotPassword(false);
              } else {
                onBack();
              }
            }}
            variant="muted"
            size="sm"
            aria-label="Tillbaka"
          />
        </div>
      )}

      <div className="w-full max-w-[400px] mx-auto my-auto relative z-10 space-y-6">
        {isEmailSent ? (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-[var(--accent-color)]/10 text-[var(--accent-color)] rounded-[20px] flex items-center justify-center mx-auto shadow-xs">
              <Mail size={28} strokeWidth={2} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {t('checkEmailTitle' as any)}
              </h2>
              <p className="text-[var(--text-secondary)] text-sm font-medium leading-relaxed max-w-[320px] mx-auto">
                {t('checkEmailDesc' as any)}
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => {
                  setIsEmailSent(false);
                  setIsRegistering(false);
                }}
                variant="primary"
                fullWidth
                size="lg"
              >
                {t('backToLogin' as any)}
              </Button>
            </div>
          </div>
        ) : isResetSent ? (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-black/5 dark:bg-white/5 text-[var(--text-primary)] rounded-[20px] flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 size={30} strokeWidth={2} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                {t('checkInboxTitle' as any)}
              </h2>
              <p className="text-[var(--text-secondary)] text-sm font-medium leading-relaxed max-w-[320px] mx-auto">
                {t('checkInboxDesc' as any, { email })}
              </p>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => {
                  setIsResetSent(false);
                  setIsForgotPassword(false);
                }}
                variant="primary"
                fullWidth
                size="lg"
              >
                {t('backToLogin' as any)}
              </Button>
            </div>
          </div>
        ) : isForgotPassword ? (
          <div className="space-y-6">
            {/* Header with Logo */}
            <div className="relative flex flex-col items-center mb-2">
              <div className="flex flex-col items-center pt-1 mb-4 select-none">
                <DejzLogo className="text-3xl font-black" textColor="var(--logo-color)" />
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-1.5 text-center">
                {t('forgotPasswordTitle' as any)}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] text-center max-w-[320px] leading-relaxed">
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

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={loading}
                  variant="primary"
                  fullWidth
                  size="lg"
                >
                  {t('sendResetLink' as any)}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header with Logo */}
            <div className="relative flex flex-col items-center mb-2">
              <div className="flex flex-col items-center pt-1 mb-4 select-none">
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
            <div>
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

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-3">
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

              <div className="pt-1">
                <Button 
                  type="submit"
                  loading={loading}
                  variant="primary"
                  fullWidth
                  size="lg"
                >
                  {isRegistering ? t('createAccount') : t('login')}
                </Button>
              </div>
            </form>

            <Divider label={t('orContinueWith')} />

            <div className="space-y-3">
              <Button 
                type="button"
                onClick={() => handleSocialLogin('google')}
                variant="secondary"
                fullWidth
                size="lg"
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
            </div>
          </div>
        )}
      </div>

      {/* Footer Legal Links */}
      <div className="relative z-10 pt-4 flex items-center justify-center gap-4 text-xs font-semibold text-[var(--text-secondary)]">
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
  );
}
