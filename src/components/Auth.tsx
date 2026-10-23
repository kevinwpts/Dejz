import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { createFreshTestAccount } from '../utils/demoData';
import { Mail, Lock, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { DejzLogo } from './DejzLogo';
import { Button, Input, IconButton, SegmentedControl, Divider } from './ui';

import { Language } from '../i18n';
import { getRegionDefaults } from '../utils/nordic';
import { LanguagePicker } from './LanguagePicker';

interface AuthProps {
  onShowToast: (message: string, type: 'success' | 'error') => void;
  onLegalClick: (type: 'privacy' | 'terms' | 'cookies' | 'contact') => void;
  t: (key: TranslationKey) => string;
  initialIsRegistering?: boolean;
  onBack?: () => void;
  currentLanguage?: Language;
  onLanguageChange?: (lang: Language) => void;
  sandboxMode?: boolean;
  onSandboxComplete?: (action: 'login' | 'register' | 'reset' | 'social', email: string) => void;
}

export function Auth({ 
  onShowToast, 
  onLegalClick, 
  t, 
  initialIsRegistering = false, 
  onBack,
  currentLanguage = 'sv',
  onLanguageChange,
  sandboxMode = false,
  onSandboxComplete,
}: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(initialIsRegistering);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetSent, setIsResetSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getLocalizedAuthMsg = (key: string, defaultMsg: string) => {
    const isEn = currentLanguage === 'en';
    const isDa = currentLanguage === 'da';
    const isNo = currentLanguage === 'no';
    const isFi = currentLanguage === 'fi';

    switch (key) {
      case 'enterEmail':
        if (isEn) return 'Please enter your email address';
        if (isDa) return 'Indtast venligst din e-mailadresse';
        if (isNo) return 'Vennligst oppgi din e-postadresse';
        if (isFi) return 'Syötä sähköpostiosoitteesi';
        return 'Ange din e-postadress';
      case 'resetSent':
        if (isEn) return 'Password reset link sent!';
        if (isDa) return 'Link til nulstilling er sendt!';
        if (isNo) return 'Tilbakestillingslenke er sendt!';
        if (isFi) return 'Palautuslinkki on lähetetty!';
        return 'Återställningslänk har skickats!';
      case 'tooManyRequests':
        if (isEn) return 'Too many requests. Please wait a moment and try again.';
        if (isDa) return 'For mange anmodninger. Vent et øjeblik og prøv igen.';
        if (isNo) return 'For mange forespørsler. Vent litt og prøv igjen.';
        if (isFi) return 'Liikaa pyyntöjä. Odota hetki ja yritä uudelleen.';
        return 'För många förfrågningar. Vänta en stund och försök igen.';
      case 'passwordMin6':
        if (isEn) return 'Password must be at least 6 characters long.';
        if (isDa) return 'Adgangskoden skal være mindst 6 tegn lang.';
        if (isNo) return 'Passordet må være minst 6 tegn langt.';
        if (isFi) return 'Salasanan on oltava vähintään 6 merkkiä pitkä.';
        return 'Lösenordet måste vara minst 6 tecken långt.';
      case 'accountExists':
        if (isEn) return 'An account with this email already exists. Choose "Log in" instead.';
        if (isDa) return 'En konto med denne e-mail findes allerede. Vælg "Log ind" i stedet.';
        if (isNo) return 'En konto med denne e-posten finnes allerede. Velg "Logg inn" i stedet.';
        if (isFi) return 'Tili tällä sähköpostiosoitteella on jo olemassa. Valitse "Kirjaudu sisään".';
        return 'Ett konto med denna e-postadress finns redan. Välj "Logga in" istället.';
      default:
        return defaultMsg;
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(getLocalizedAuthMsg('enterEmail', 'Ange din e-postadress'));
      return;
    }

    setLoading(true);
    setError(null);

    if (sandboxMode) {
      setTimeout(() => {
        setIsResetSent(true);
        setLoading(false);
        onShowToast(getLocalizedAuthMsg('resetSent', 'Återställningslänk har skickats! (Testläge)'), 'success');
        onSandboxComplete?.('reset', email.trim());
      }, 300);
      return;
    }

    try {
      localStorage.setItem('app_language', currentLanguage);
      localStorage.setItem('app_language_manual', 'true');
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/${currentLanguage}/`,
      });

      if (error) throw error;

      setIsResetSent(true);
      onShowToast(getLocalizedAuthMsg('resetSent', 'Återställningslänk har skickats!'), 'success');
    } catch (err: any) {
      console.error('Password reset error:', err);
      let message = err.message || 'Kunde inte skicka återställningslänk.';
      if (message.includes('rate limit')) {
        message = getLocalizedAuthMsg('tooManyRequests', 'För många förfrågningar. Vänta en stund och försök igen.');
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
    const isMockEmail =
      lowerEmail === 'demo@dejz.se' ||
      lowerEmail === 'test@dejz.se' ||
      lowerEmail.endsWith('@example.com');

    if (isRegistering && password.length < 6) {
      const message = getLocalizedAuthMsg('passwordMin6', 'Lösenordet måste vara minst 6 tecken långt.');
      setError(message);
      onShowToast(message, 'error');
      setLoading(false);
      return;
    }

    if (sandboxMode) {
      setTimeout(() => {
        setLoading(false);
        if (isRegistering) {
          onShowToast('Testläge: Registrering genomförd utan att skapa riktigt konto.', 'success');
          onSandboxComplete?.('register', email.trim());
        } else {
          onShowToast('Testläge: Inloggning genomförd i isolerad förhandsgranskning.', 'success');
          onSandboxComplete?.('login', email.trim());
        }
      }, 350);
      return;
    }

    if (isMockEmail) {
      setTimeout(() => {
        createFreshTestAccount();
        onShowToast(isRegistering ? "Nytt testkonto skapat!" : "Inloggad med testkonto!", "success");
        window.location.reload();
      }, 500);
      return;
    }

    try {
      localStorage.setItem('app_language', currentLanguage);
      localStorage.setItem('app_language_manual', 'true');
      const regDefaults = getRegionDefaults(currentLanguage);

      if (isRegistering) {
        try {
          localStorage.removeItem('dejz_has_saved_initial_budget');
          localStorage.removeItem('dejz_has_saved_budget');
        } catch (_e) {
          // ignore
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/${currentLanguage}/`,
            data: {
              language: currentLanguage,
              country: regDefaults.countryCode,
              currency: regDefaults.defaultCurrencyCode,
              locale: regDefaults.locale,
              timezone: regDefaults.timezone,
              dark_mode: false,
              theme_mode: 'light',
              theme_color: 'neutral',
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
        message = getLocalizedAuthMsg('accountExists', 'Ett konto med denna e-postadress finns redan. Välj "Logga in" istället.');
      } else if (message?.includes('Password should be at least')) {
        message = getLocalizedAuthMsg('passwordMin6', 'Lösenordet måste vara minst 6 tecken långt.');
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
    if (sandboxMode) {
      onShowToast('Testläge: Google-inloggning simulerad.', 'success');
      onSandboxComplete?.('social', email || 'demo@dejz.se');
      return;
    }
    try {
      let inIframe = false;
      try {
        inIframe = window.self !== window.top;
      } catch (_e) {
        inIframe = true;
      }
      
      localStorage.setItem('app_language', currentLanguage);
      localStorage.setItem('app_language_manual', 'true');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/${currentLanguage}/`,
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
    <div className="min-h-dvh flex flex-col items-center justify-between p-6 sm:p-10 bg-[var(--bg-color)] selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)] relative overflow-x-clip pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      {/* Seamless Fixed Full-Viewport Brand Gradient & Bottom Base Layer */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none dark:hidden z-0"
        style={{
          background: 'var(--bg-gradient)',
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-[400px] -bottom-[200px] bg-[var(--bg-color)] pointer-events-none z-0"
      />
      <div
        aria-hidden="true"
        className="fixed bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--bg-color)] via-[var(--bg-color)]/80 to-transparent pointer-events-none z-0"
      />
      {/* Top Left Back Button */}
      {onBack && (
        <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-6 sm:left-8 z-30">
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
            variant="surface"
            size="md"
            className="w-10 h-10 rounded-full shadow-subtle"
            aria-label="Tillbaka"
          />
        </div>
      )}

      {/* Top Right Language Picker */}
      {onLanguageChange && (
        <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-6 sm:right-8 z-30">
          <LanguagePicker
            currentLanguage={currentLanguage}
            onLanguageChange={onLanguageChange}
            variant="compact"
          />
        </div>
      )}

      <div className="w-full max-w-[400px] mx-auto my-auto relative z-10 space-y-6">
        {isEmailSent ? (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-[var(--accent-color)]/10 text-[var(--accent-color)] rounded-[var(--radius-card-nested,12px)] flex items-center justify-center mx-auto shadow-xs">
              <Mail size={28} strokeWidth={2} />
            </div>

            <div className="space-y-2">
              <h2 className="text-page-title text-[var(--text-primary)]">
                {t('checkEmailTitle' as any)}
              </h2>
              <p className="text-secondary leading-relaxed max-w-[320px] mx-auto">
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
                className="rounded-full"
              >
                {t('backToLogin' as any)}
              </Button>
            </div>
          </div>
        ) : isResetSent ? (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-[var(--surface-color)] border border-[var(--border-divider)] text-[var(--text-primary)] rounded-[var(--radius-card-nested,12px)] flex items-center justify-center mx-auto shadow-subtle">
              <CheckCircle2 size={30} strokeWidth={2} />
            </div>

            <div className="space-y-2">
              <h2 className="text-page-title text-[var(--text-primary)]">
                {t('checkInboxTitle' as any)}
              </h2>
              <p className="text-secondary leading-relaxed max-w-[320px] mx-auto">
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
                className="rounded-full"
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

              <h1 className="text-page-title mb-1.5 text-center">
                {t('forgotPasswordTitle' as any)}
              </h1>
              <p className="text-secondary text-center max-w-[320px] leading-relaxed">
                {t('forgotPasswordDesc' as any)}
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
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
                  className="rounded-full"
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

              <h1 className="text-page-title mb-1">
                {isRegistering ? t('createAccount') : t('welcome')}
              </h1>
              <p className="text-secondary">
                {isRegistering ? t('createAccountSubtitle' as any) : t('loginSubtitle' as any)}
              </p>
            </div>

            {/* Segmented Pill Switcher */}
            <div>
              <SegmentedControl
                variant="surface"
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={t('email')}
                  icon={<Mail size={16} />}
                />

                <div className="space-y-1.5">
                  <Input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
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
                        className="text-label font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
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
                  className="rounded-full"
                >
                  {isRegistering ? t('createAccount') : t('login')}
                </Button>
              </div>
            </form>

            <Divider label={t('orContinueWith')} />

            <div className="space-y-3">
              <Button 
                type="button"
                variant="surface"
                size="lg"
                fullWidth
                className="rounded-full"
                onClick={() => handleSocialLogin('google')}
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
                <span>{t('continueWithGoogle' as any)}</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Legal Links */}
      <div className="relative z-10 pt-4 flex items-center justify-center gap-4 text-label font-semibold text-[var(--text-secondary)]">
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
