// Själva formuläret för Logga in / Skapa konto / Glömt lösenord (rubrik, Google/Apple, fel, e-post och lösenord).
import React from 'react';
import { Eye, EyeSlash, SpinnerGap, WarningCircle, PaperPlaneTilt } from '@phosphor-icons/react';
import type { AuthForm } from './useAuthForm';
import { SocialSignInButtons } from './SocialSignInButtons';

interface AuthFormViewProps {
  form: AuthForm;
  animClass: string;
}

const TITLES = {
  login: 'Logga in',
  register: 'Skapa konto',
  forgot_password: 'Glömt lösenord',
} as const;

export const AuthFormView: React.FC<AuthFormViewProps> = ({ form, animClass }) => {
  const {
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
    needsConfirmation,
    resendingConfirm,
    clearErrors,
    switchView,
    handleGoogleSignIn,
    handleResendConfirmation,
    handleSubmit,
  } = form;

  return (
    <main className={`flex-1 pt-8 pb-6 space-y-6 ${animClass}`}>
      <div>
        <h1 className="ui-step-title">{TITLES[view]}</h1>
        <p className="ui-onb-subtitle">
          {view === 'login' && 'Välkommen tillbaka.'}
          {view === 'register' && 'Gratis – och klart på två minuter.'}
          {view === 'forgot_password' && 'Skriv din e-post så skickar vi en länk där du väljer ett nytt lösenord.'}
        </p>
      </div>

      {view !== 'forgot_password' && (
        <SocialSignInButtons
          disabled={googleLoading || loading}
          googleLoading={googleLoading}
          onSignIn={handleGoogleSignIn}
        />
      )}

      {/* General Non-Password Error Notice (if any) */}
      {errorMsg && !hasPasswordError && (
        <div className="ui-auth-alert animate-scale-in">
          <WarningCircle size={18} weight="fill" className="shrink-0 mt-px" />
          <div className="min-w-0 flex-1">
            <span>{errorMsg}</span>
            {needsConfirmation && (
              <button
                type="button"
                disabled={resendingConfirm}
                onClick={handleResendConfirmation}
                className="ui-auth-alert-btn"
              >
                {resendingConfirm && <SpinnerGap size={14} className="animate-spin" />}
                Skicka nytt mejl
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Hairline Divided Card with Modern Shake & Inline Validation Feedback */}
        <div
          key={shakeTrigger}
          className={`ui-auth-field-card ${hasPasswordError ? 'ui-auth-field-card-error animate-shake' : ''}`}
        >
          <label className="px-4 py-3.5 block cursor-text">
            <span className="ui-field-label block mb-1">
              E-postadress
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (hasPasswordError || errorMsg) clearErrors();
              }}
              placeholder="namn@exempel.se"
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
                    onClick={() => switchView('forgot_password', 'forward')}
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
                  minLength={6}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (hasPasswordError || errorMsg) clearErrors();
                  }}
                  placeholder={view === 'register' ? 'Minst 6 tecken' : 'Ditt lösenord'}
                  className="ui-field-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="ui-clear-btn"
                  aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Modern Inline Error Micro-banner (Replaces big clumsy red rectangle) */}
          {hasPasswordError && (
            <div className="ui-auth-field-divider px-4 py-3 flex items-center gap-2 text-footnote text-negative font-medium animate-scale-in">
              <WarningCircle size={16} weight="fill" className="shrink-0" />
              <span>Fel e-post eller lösenord. Försök igen.</span>
            </div>
          )}
        </div>

        {/* Frivilligt samtycke till nyhetsbrev – får aldrig vara förkryssat eller ett krav */}
        {view === 'register' && (
          <label className="flex items-start gap-3 px-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 w-5 h-5 shrink-0 rounded-md accent-[var(--accent-color)] cursor-pointer"
            />
            <span className="text-footnote leading-[1.45] text-[var(--text-secondary)]">
              Ja, skicka mig tips och nyheter från Dejz. Du kan avsluta när du vill.
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="ui-btn-primary"
        >
          {loading && <SpinnerGap size={16} className="animate-spin" />}
          {view === 'login' && 'Logga in'}
          {view === 'register' && 'Skapa konto'}
          {view === 'forgot_password' && (
            <>
              <span>Skicka länk</span>
              <PaperPlaneTilt size={16} />
            </>
          )}
        </button>
      </form>
    </main>
  );
};
