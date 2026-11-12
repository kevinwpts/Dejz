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
          <h1 className="ui-step-title text-balance">
            Kvar efter fasta räkningar
          </h1>
          <p className="ui-onb-subtitle">Det här har du kvar av varje lön, före vardagsköp.</p>
        </div>

        <div className="flex-1 min-h-0 pt-6 space-y-6">
          <div className="font-display font-bold text-5xl tracking-tight text-[var(--text-primary)] tabular-nums">
            {formatKr(kvarAttSpendera)}
          </div>

          <div className="ui-list-card ui-onb-summary-card text-subhead">
            <div className="ui-onb-summary-row">
              <span className="text-[var(--text-secondary)]">Inkomster</span>
              <span className="font-normal text-positive tabular-nums">
                +{formatKr(totalInc)}
              </span>
            </div>
            <div className="ui-onb-summary-row">
              <span className="text-[var(--text-secondary)]">Fasta utgifter</span>
              <span className="font-normal text-[var(--text-primary)] tabular-nums">
                −{formatKr(totalFix)}
              </span>
            </div>
            <div className="ui-onb-summary-row">
              <span className="text-[var(--text-secondary)]">Lönedag</span>
              <span className="font-normal text-[var(--text-primary)] tabular-nums">
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
              className="ui-btn-primary"
            >
              <span>Fortsätt</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="ui-btn-primary"
            >
              <span>Öppna Dejz</span>
              <Check size={16} />
            </button>
          )}
        </div>
      </div>
    )}
  </>
);
