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
    <main className={`my-auto py-8 space-y-6 ${animClass}`}>
      <div className="space-y-1.5">
        <h1 className="ui-step-title">{TITLES[view]}</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {view === 'login' && 'Logga in för att komma åt din ekonomi.'}
          {view === 'register' && 'Kom igång på under en minut.'}
          {view === 'forgot_password' && 'Ange din e-post så skickar vi en återställningslänk.'}
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
        <div className="p-3.5 rounded-2xl bg-negative-solid/10 border border-negative-solid/20 flex items-start gap-2.5 text-negative text-xs font-medium animate-scale-in">
          <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span>{errorMsg}</span>
            {needsConfirmation && (
              <button
                type="button"
                disabled={resendingConfirm}
                onClick={handleResendConfirmation}
                className="mt-2.5 w-full py-2.5 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] text-footnote font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
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
          className={`rounded-3xl bg-[var(--surface-color)] border transition-all overflow-hidden ${
            hasPasswordError
              ? 'border-negative-solid/50 ring-1 ring-negative-solid/20 animate-shake'
              : 'border-[var(--border-subtle)]'
          }`}
        >
          <label className="px-4.5 py-4 block cursor-text">
            <span className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
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
            <div className="border-t border-[var(--border-subtle)] px-4.5 py-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Lösenord</span>
                {view === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchView('forgot_password', 'forward')}
                    className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
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
                  placeholder="Minst 6 tecken"
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
            <div className="px-4 py-2.5 bg-negative-solid/5 border-t border-negative-solid/15 flex items-center justify-between text-meta text-negative font-medium animate-scale-in">
              <div className="flex items-center gap-1.5">
                <WarningCircle size={14} weight="bold" className="shrink-0" />
                <span>Fel lösenord. Kontrollera och försök igen.</span>
              </div>
              <button
                type="button"
                onClick={() => switchView('forgot_password', 'forward')}
                className="font-semibold underline hover:opacity-80 cursor-pointer shrink-0 ml-2 text-caption"
              >
                Glömt?
              </button>
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
          className="w-full py-3.5 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] font-display font-bold text-sm hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading && <SpinnerGap size={16} className="animate-spin" />}
          {view === 'login' && 'Logga in'}
          {view === 'register' && 'Skapa konto'}
          {view === 'forgot_password' && (
            <>
              <span>Skicka återställningslänk</span>
              <PaperPlaneTilt size={15} weight="bold" />
            </>
          )}
        </button>
      </form>
    </main>
  );
};
