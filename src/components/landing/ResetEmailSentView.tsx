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
  <main className="flex-1 pt-14 pb-6 flex flex-col items-center text-center animate-scale-in">
    <div className="ui-auth-icon-tile">
      <EnvelopeSimple size={30} weight="regular" />
    </div>

    <h1 className="ui-step-title mt-6">Kolla din inkorg</h1>
    <p className="mt-2 text-subhead leading-snug text-[var(--text-secondary)]">
      Vi har skickat en länk till
    </p>
    <p className="mt-0.5 text-subhead font-semibold text-[var(--text-primary)] max-w-full truncate">
      {email.trim()}
    </p>
    <p className="mt-4 text-subhead leading-relaxed text-[var(--text-secondary)] max-w-[320px]">
      {sentKind === 'signup'
        ? 'Klicka på länken i mejlet för att bekräfta ditt konto – sen är du igång. Hittar du det inte? Kika i skräpposten.'
        : 'Klicka på länken i mejlet för att välja ett nytt lösenord. Hittar du det inte? Kika i skräpposten.'}
    </p>

    <div className="w-full mt-8 space-y-2">
      <button
        type="button"
        disabled={resendCooldown > 0 || resending}
        onClick={onResend}
        className="ui-auth-btn-surface"
      >
        {resending && <SpinnerGap size={16} className="animate-spin" />}
        {resendCooldown > 0 ? `Skicka igen om ${resendCooldown}s` : 'Skicka igen'}
      </button>
      <button
        type="button"
        onClick={onChangeEmail}
        className="ui-onb-skip-btn"
      >
        Fel e-post? Ändra
      </button>
    </div>
  </main>
);
