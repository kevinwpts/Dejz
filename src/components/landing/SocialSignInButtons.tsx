// Knapparna "Fortsätt med Apple/Google" och avdelaren "eller med e-post" på inloggningssidan.
import React from 'react';
import { SpinnerGap } from '@phosphor-icons/react';

/** "Fortsätt med Apple" krävs av App Store när man erbjuder Google-inloggning (regel 4.8).
 *  Slås på med VITE_ENABLE_APPLE_SIGNIN="true" när Apple är aktiverat i Supabase (se APP_STORE.md). */
const APPLE_SIGNIN_ENABLED = import.meta.env.VITE_ENABLE_APPLE_SIGNIN === 'true';

interface SocialSignInButtonsProps {
  disabled: boolean;
  googleLoading: boolean;
  onSignIn: (provider: 'google' | 'apple') => void;
}

export const SocialSignInButtons: React.FC<SocialSignInButtonsProps> = ({
  disabled,
  googleLoading,
  onSignIn,
}) => (
  <div className="space-y-4">
    {APPLE_SIGNIN_ENABLED && (
      <button
        type="button"
        onClick={() => onSignIn('apple')}
        disabled={disabled}
        className="w-full py-3.5 px-4 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold text-sm flex items-center justify-center gap-2.5 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
      >
        <svg className="w-[15px] h-[18px] shrink-0" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
          <path d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-165-40c-77 0-104 41-166 41s-106-57-156-128C44 790 0 671 0 558 0 377 118 281 234 281c62 0 113 41 152 41 37 0 95-43 165-43 27 0 123 2 187 96zM557 159c29-35 50-83 50-131 0-7-1-13-2-19-47 2-104 32-138 72-27 30-52 79-52 127 0 7 1 15 2 17 3 0 8 1 13 1 43 0 96-28 127-67z" />
        </svg>
        <span>Fortsätt med Apple</span>
      </button>
    )}
    <button
      type="button"
      onClick={() => onSignIn('google')}
      disabled={disabled}
      className="w-full py-3.5 px-4 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold text-sm flex items-center justify-center gap-3 hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
    >
      {googleLoading ? (
        <SpinnerGap size={18} className="animate-spin" />
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
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      <span>Fortsätt med Google</span>
    </button>

    <div className="flex items-center gap-3">
      <div className="h-px bg-[var(--border-subtle)] flex-1" />
      <span className="text-xs font-medium text-[var(--text-muted)]">eller med e-post</span>
      <div className="h-px bg-[var(--border-subtle)] flex-1" />
    </div>
  </div>
);
