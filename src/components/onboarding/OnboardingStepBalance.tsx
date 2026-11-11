import type { SetStateAction } from 'react';
import React from 'react';
import { setMarketingConsent } from '../../utils/marketingConsent';
import { Check } from '@phosphor-icons/react';
import { setManualBalance } from '../../utils/appCache';

export interface OnboardingStepBalanceProps {
  step: 2 | 1 | 3 | 4 | 5 | 6 | 7;
  balanceInput: string;
  onComplete: () => void;
  pageAnimClass: "animate-page-forward" | "animate-page-back";
  setBalanceInput: (value: SetStateAction<string>) => void;
  showConsentQuestion: boolean;
  consentChecked: boolean;
  setConsentChecked: (value: SetStateAction<boolean>) => void;
}

export const OnboardingStepBalance: React.FC<OnboardingStepBalanceProps> = ({
  step,
  balanceInput,
  onComplete,
  pageAnimClass,
  setBalanceInput,
  showConsentQuestion,
  consentChecked,
  setConsentChecked,
}) => (
  <>
    {step === 7 && (
      <form
        key="step-7"
        onSubmit={(e) => {
          e.preventDefault();
          const amt = Math.round(Number(balanceInput.replace(/\s/g, '').replace(',', '.')));
          if (balanceInput.trim() !== '' && Number.isFinite(amt)) {
            setManualBalance({ amount: amt, at: new Date().toISOString() });
          }
          onComplete();
        }}
        className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
      >
        <div className="shrink-0 pt-6 pb-4">
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
            Hur mycket har du på kontot just nu?
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            Kolla i din bankapp. Dejz drar av räkningarna som är kvar före lön – då ser du exakt vad
            du kan spendera.
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Bankkoppling kommer snart. Tills dess skriver du in saldot själv – det ger dig full koll.
          </p>
        </div>

        <div className="my-auto py-4">
          <label className="flex items-baseline gap-2 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] px-4 py-4 cursor-text">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="0"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value.replace(/[^\d\s,.-]/g, ''))}
              className="flex-1 min-w-0 bg-transparent border-0 p-0 font-display font-semibold text-[34px] leading-none tabular-nums text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
            />
            <span className="text-base font-medium text-[var(--text-secondary)]">kr</span>
          </label>
        </div>

        <div className="shrink-0 pt-3 space-y-1">
          {/* Nyhetsbrev: bara för den som inte redan svarat (t.ex. Google-inloggning). Aldrig förkryssat. */}
          {showConsentQuestion && (
            <label className="flex items-start gap-3 px-1 pb-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => {
                  setConsentChecked(e.target.checked);
                  void setMarketingConsent(e.target.checked, 'introduktion');
                }}
                className="mt-0.5 w-5 h-5 shrink-0 rounded-md accent-[var(--accent-color)] cursor-pointer"
              />
              <span className="text-[13px] leading-[1.45] text-[var(--text-secondary)]">
                Ja, skicka mig tips och nyheter från Dejz. Du kan avsluta när du vill.
              </span>
            </label>
          )}
          <button
            type="submit"
            disabled={balanceInput.trim() === ''}
            className="ui-btn-primary py-3.5 text-sm disabled:opacity-35"
          >
            <span>Öppna Dejz</span>
            <Check size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="w-full py-2.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Hoppa över just nu
          </button>
        </div>
      </form>
    )}
  </>
);
