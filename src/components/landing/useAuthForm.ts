// All logik för inloggning/registrering: tillstånd, e-post/lösenord, Google/Apple, glömt lösenord och "skicka igen".
import type React from 'react';
import { useState, useEffect } from 'react';
import { signInWithProvider } from '../../utils/nativeAuth';
import { friendlyAuthError } from '../../utils/authErrors';
import { supabase } from '../../supabaseClient';
import { rememberConsentFromSignup } from '../../utils/marketingConsent';
import { firstTouchSignupData } from '../../utils/attribution';
import { appOrigin } from '../../utils/platform';
import {
  AUTH_LINK_ERROR_MSG,
  consumeAuthLinkError,
  readInitialAuthError,
  readUrlAuthError,
} from './authLinkError';

export type AuthViewMode = 'login' | 'register' | 'forgot_password';
export type SlideDir = 'forward' | 'back';
export type AuthMode = 'login' | 'register';

interface UseAuthFormOptions {
  /** I App Store-appen: börja på registrering i stället för marknadsföringssidan. */
  nativeApp: boolean;
  onAuthenticated: (email: string, mode?: AuthMode) => void;
}

export function useAuthForm({ nativeApp, onAuthenticated }: UseAuthFormOptions) {
  // Felmeddelande vi kommer tillbaka med (från Google-inloggning eller en gammal mejllänk) läses en gång
  const [initialAuthError] = useState<string | null>(readInitialAuthError);
  const [activePage, setActivePage] = useState<'landing' | 'auth'>(
    initialAuthError || nativeApp ? 'auth' : 'landing'
  );
  const [slideDir, setSlideDir] = useState<SlideDir>('forward');
  const [view, setView] = useState<AuthViewMode>(
    initialAuthError ? 'login' : nativeApp ? 'register' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Nyhetsbrev: alltid ej ikryssat från början (opt-in)
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialAuthError);
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

  // Felet har redan visats (se initialAuthError) – städa bort det ur adressfältet och sessionStorage
  useEffect(() => {
    try {
      if (readUrlAuthError()) window.history.replaceState(null, '', window.location.pathname);
    } catch {
      // ignore
    }
    consumeAuthLinkError();
  }, []);

  // Bekräftelselänken från mejlet hade gått ut eller redan använts (kontrolleras i App)
  useEffect(() => {
    const show = () => {
      if (consumeAuthLinkError()) {
        setView('login');
        setActivePage('auth');
        setErrorMsg(AUTH_LINK_ERROR_MSG);
      }
    };
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

  const openAuthPage = (mode: AuthMode) => {
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

  const switchView = (newView: AuthViewMode, dir: SlideDir = 'forward') => {
    setSlideDir(dir);
    setView(newView);
    clearErrors();
    setResetEmailSent(false);
  };

  const handleGoogleSignIn = async (provider: 'google' | 'apple' = 'google') => {
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
      // Webben: vanlig omdirigering. iPhone-appen: iPhonens inloggningsfönster.
      await signInWithProvider(provider);
    } catch (err: unknown) {
      if (view === 'register') {
        try {
          localStorage.removeItem('dejz_onboarding_in_progress');
          localStorage.removeItem('dejz_onboarding_step');
        } catch {
          // ignore
        }
      }
      const friendly = friendlyAuthError(err);
      setErrorMsg(
        friendly.kind !== 'unknown'
          ? friendly.message
          : provider === 'apple'
          ? 'Kunde inte starta Apple-inloggning.'
          : 'Kunde inte starta Google-inloggning.'
      );
      setGoogleLoading(false);
    }
  };

  const handleSendResetEmail = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim();
    if (!cleanEmail) return;
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: appOrigin(),
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
          options: { emailRedirectTo: appOrigin() },
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

  /** "Skicka nytt mejl" när inloggningen stoppades för att kontot inte är bekräftat. */
  const handleResendConfirmation = async () => {
    setResendingConfirm(true);
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: appOrigin() },
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    setLoading(true);

    const cleanEmail = email.trim();
    const targetMode: AuthMode = view === 'register' ? 'register' : 'login';

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
          options: { emailRedirectTo: appOrigin(), data: firstTouchSignupData() },
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
    } catch (err: unknown) {
      // Supabase-fel har message och ibland code/error_code
      const authErr = err as { message?: string; code?: string; error_code?: string } | null;
      const msg = String(authErr?.message || '');
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
        setErrorMsg(friendlyAuthError(err).message);
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

      const friendly = friendlyAuthError(err);
      if (friendly.kind === 'email_not_confirmed') {
        setErrorMsg(friendly.message);
        setNeedsConfirmation(true);
      } else if (friendly.kind === 'invalid_credentials') {
        setHasPasswordError(true);
        setShakeTrigger((prev) => prev + 1);
      } else {
        setErrorMsg(friendly.message);
        setShakeTrigger((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    activePage,
    slideDir,
    view,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    marketingOptIn,
    setMarketingOptIn,
    loading,
    googleLoading,
    errorMsg,
    hasPasswordError,
    shakeTrigger,
    resetEmailSent,
    setResetEmailSent,
    resendCooldown,
    resending,
    sentKind,
    needsConfirmation,
    resendingConfirm,
    clearErrors,
    openAuthPage,
    backToLanding,
    switchView,
    handleGoogleSignIn,
    handleResendReset,
    handleResendConfirmation,
    handleSubmit,
  };
}

/** Allt som useAuthForm ger tillbaka – skickas vidare till vyerna. */
export type AuthForm = ReturnType<typeof useAuthForm>;
