import React from 'react';
import { Check, SpinnerGap } from '@phosphor-icons/react';

/**
 * Bekräfta-kort i introduktionen med bank: det banken hittade som EN siffra och EN knapp
 * ("Stämmer" / "Ser rätt ut"). Den som vill ändra trycker "Visa och ändra". Flyttad från OnboardingFlow.tsx.
 */
export const BankSummaryStep: React.FC<{
  stepKey: string;
  animClass: string;
  loading: boolean;
  title: string;
  subtitle: string;
  loadingText: string;
  amountText: string;
  detailText: string;
  amountClassName: string;
  confirmLabel: string;
  onConfirm: () => void;
  onShowList: () => void;
}> = ({
  stepKey,
  animClass,
  loading,
  title,
  subtitle,
  loadingText,
  amountText,
  detailText,
  amountClassName,
  confirmLabel,
  onConfirm,
  onShowList,
}) => (
  <div
    key={stepKey}
    className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${animClass}`}
  >
    <div className="shrink-0 pt-6 pb-4">
      <h1 className="ui-step-title">
        {title}
      </h1>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{subtitle}</p>
    </div>

    <div className="flex-1 min-h-0 flex flex-col justify-center pb-8">
      <div className="rounded-3xl bg-[var(--surface-color)] shadow-[var(--card-shadow)] px-6 py-8 text-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-3 text-sm text-[var(--text-secondary)]">
            <SpinnerGap size={26} className="animate-spin text-[var(--text-primary)]" />
            <span>{loadingText}</span>
          </div>
        ) : (
          <>
            <p
              className={`font-display font-semibold text-[34px] leading-tight tracking-[-0.02em] tabular-nums ${amountClassName}`}
            >
              {amountText}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{detailText}</p>
          </>
        )}
      </div>
    </div>

    <div className="shrink-0 pt-3 space-y-1">
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className="ui-btn-primary-flow disabled:opacity-40 disabled:cursor-default"
      >
        <span>{confirmLabel}</span>
        <Check size={16} weight="bold" />
      </button>
      <button
        type="button"
        onClick={onShowList}
        disabled={loading}
        className="w-full py-3 rounded-2xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-40"
      >
        Visa och ändra
      </button>
    </div>
  </div>
);
