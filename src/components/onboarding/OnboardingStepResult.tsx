import React from 'react';
import { ArrowRight, Check } from '@phosphor-icons/react';
import { OnboardingStep } from './onboardingConfig';

export interface OnboardingStepResultProps {
  step: 2 | 1 | 3 | 4 | 5 | 6 | 7;
  pageAnimClass: "animate-page-forward" | "animate-page-back";
  formatKr: (val: number) => string;
  kvarAttSpendera: number;
  totalInc: number;
  totalFix: number;
  payday: number;
  stepOrder: OnboardingStep[];
  goNext: (from: OnboardingStep) => void;
  onComplete: () => void;
}

export const OnboardingStepResult: React.FC<OnboardingStepResultProps> = ({
  step,
  pageAnimClass,
  formatKr,
  kvarAttSpendera,
  totalInc,
  totalFix,
  payday,
  stepOrder,
  goNext,
  onComplete,
}) => (
  <>
    {step === 6 && (
      <div
        key="step-6"
        className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
      >
        <div className="shrink-0 pt-6 pb-4">
          <h1 className="ui-step-title">
            Kvar efter fasta räkningar
          </h1>
        </div>

        <div className="my-auto py-4 space-y-6">
          <div className="font-display font-bold text-5xl sm:text-6xl tracking-tight text-[var(--text-primary)] tabular-nums">
            {formatKr(kvarAttSpendera)}
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]/60 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">
                Inkomster
              </span>
              <span className="font-semibold text-positive tabular-nums">
                +{formatKr(totalInc)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">
                Fasta utgifter
              </span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                −{formatKr(totalFix)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Lönedag</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                {payday === 31 ? 'Sista dagen' : `Den ${payday}:e`}
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 pt-3">
          {stepOrder.includes(7) ? (
            <button
              type="button"
              onClick={() => goNext(6)}
              className="ui-btn-primary py-3.5 text-sm"
            >
              <span>Fortsätt</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="ui-btn-primary py-3.5 text-sm"
            >
              <span>Öppna Dejz</span>
              <Check size={16} weight="bold" />
            </button>
          )}
        </div>
      </div>
    )}
  </>
);
