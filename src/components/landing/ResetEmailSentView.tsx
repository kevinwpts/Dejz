// "Kolla din inkorg" – visas när vi skickat bekräftelse- eller återställningsmejl.
import React from 'react';
import { EnvelopeSimple, SpinnerGap } from '@phosphor-icons/react';

interface ResetEmailSentViewProps {
  email: string;
  sentKind: 'signup' | 'reset';
  resendCooldown: number;
  resending: boolean;
  onChangeEmail: () => void;
  onResend: () => void;
}

export const ResetEmailSentView: React.FC<ResetEmailSentViewProps> = ({
  email,
  sentKind,
  resendCooldown,
  resending,
  onChangeEmail,
  onResend,
}) => (
  <main className="my-auto py-8 space-y-6 animate-scale-in">
    <EnvelopeSimple size={48} weight="light" className="ui-empty-icon" />

    <div className="space-y-2 text-center px-2">
      <h1 className="ui-step-title">Kolla din inkorg</h1>
      <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
        Vi har skickat en länk till din e-postadress:
      </p>
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] max-w-full">
        <span className="truncate max-w-[260px]">{email.trim()}</span>
      </div>
      <p className="text-meta text-[var(--text-muted)] pt-2 leading-relaxed max-w-xs mx-auto">
        {sentKind === 'signup'
          ? 'Klicka på länken i mejlet för att bekräfta ditt konto – sen är du igång. Hittar du det inte? Kika i skräpposten.'
          : 'Klicka på länken i mejlet för att välja ett nytt lösenord. Hittar du det inte? Kika i skräpposten.'}
      </p>
    </div>

    <div className="flex items-center justify-between px-1 pt-2">
      <button
        type="button"
        onClick={onChangeEmail}
        className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
      >
        Fel e-post? Ändra
      </button>

      <button
        type="button"
        disabled={resendCooldown > 0 || resending}
        onClick={onResend}
        className="text-xs font-semibold text-[var(--text-primary)] hover:opacity-75 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
      >
        {resending && <SpinnerGap size={12} className="animate-spin" />}
        {resendCooldown > 0 ? `Skicka igen om ${resendCooldown}s` : 'Skicka igen'}
      </button>
    </div>
  </main>
);
