import { BrandLogo } from './BrandLogo';
import React from 'react';
import { CaretLeft } from '@phosphor-icons/react';
import { WaitlistLanding } from './WaitlistLanding';
import { isNativeApp } from '../utils/platform';
import { useAuthForm } from './landing/useAuthForm';
import { AuthFormView } from './landing/AuthFormView';
import { ResetEmailSentView } from './landing/ResetEmailSentView';

interface LandingPageProps {
  existingEmail?: string | null;
  onAuthenticated: (email: string, mode?: 'login' | 'register') => void;
  onContinueExisting?: () => void;
}

/** Startsidan (väntelistan) och inloggning/registrering. Logiken ligger i ./landing/useAuthForm. */
export const LandingPage: React.FC<LandingPageProps> = ({
  existingEmail,
  onAuthenticated,
  onContinueExisting,
}) => {
  // I App Store-appen finns ingen marknadsföringssida – appen öppnar direkt på registrering/inloggning
  const nativeApp = isNativeApp();
  const form = useAuthForm({ nativeApp, onAuthenticated });
  const { activePage, slideDir, view, resetEmailSent, setResetEmailSent, switchView } = form;

  const pageAnimClass =
    slideDir === 'forward' ? 'animate-page-forward' : 'animate-page-back';

  if (activePage === 'auth') {
    return (
      <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col justify-between max-w-md mx-auto px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] font-sans select-none overflow-x-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between h-12">
          {nativeApp && !resetEmailSent && view !== 'forgot_password' ? (
            <span className="w-[34px]" aria-hidden="true" />
          ) : (
          <button
            type="button"
            onClick={() => {
              if (resetEmailSent) {
                setResetEmailSent(false);
                switchView('login', 'back');
              } else if (view === 'forgot_password') {
                switchView('login', 'back');
              } else {
                form.backToLanding();
              }
            }}
            className="ui-header-btn"
            aria-label="Tillbaka"
            title="Tillbaka"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          )}

          <BrandLogo className="h-5 text-[var(--accent-color)]" />
        </header>

        {/* Main Content Area */}
        {resetEmailSent ? (
          <ResetEmailSentView
            key="auth-reset-sent"
            email={form.email}
            sentKind={form.sentKind}
            resendCooldown={form.resendCooldown}
            resending={form.resending}
            onChangeEmail={() => setResetEmailSent(false)}
            onResend={form.handleResendReset}
          />
        ) : (
          <AuthFormView key={`auth-${view}`} form={form} animClass={pageAnimClass} />
        )}

        {/* Footer switch between login / register */}
        <footer className="text-center pt-2">
          {resetEmailSent ? (
            <button
              type="button"
              onClick={() => {
                setResetEmailSent(false);
                switchView('login', 'back');
              }}
              className="ui-auth-footer-link"
            >
              Tillbaka till inloggning
            </button>
          ) : (
            <>
              {view === 'login' && (
                <p className="text-callout text-[var(--text-secondary)]">
                  Inget konto än?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('register')}
                    className="ui-auth-footer-link"
                  >
                    Skapa konto
                  </button>
                </p>
              )}
              {view === 'register' && (
                <p className="text-callout text-[var(--text-secondary)]">
                  Har du redan ett konto?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('login', 'back')}
                    className="ui-auth-footer-link"
                  >
                    Logga in
                  </button>
                </p>
              )}
              {view === 'forgot_password' && (
                <button
                  type="button"
                  onClick={() => switchView('login', 'back')}
                  className="ui-auth-footer-link"
                >
                  Tillbaka till inloggning
                </button>
              )}
            </>
          )}
        </footer>
      </div>
    );
  }

  return (
    <WaitlistLanding
      onLogin={() => form.openAuthPage('login')}
      onSignup={() => form.openAuthPage('register')}
      existingEmail={existingEmail}
      onContinueExisting={onContinueExisting}
    />
  );
};
