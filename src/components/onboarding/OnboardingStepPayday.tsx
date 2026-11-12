import type { SetStateAction } from 'react';
import React from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import { WeekendHandlingMode } from '../../utils/periodEngine';

export interface OnboardingStepPaydayProps {
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  pageAnimClass: "animate-page-forward" | "animate-page-back";
  payday: number;
  setPayday: (value: SetStateAction<number>) => void;
  weekendHandling: "none" | "before" | "after";
  setWeekendHandling: (value: SetStateAction<WeekendHandlingMode>) => void;
  handleNextFromStep5Payday: () => void;
}

export const OnboardingStepPayday: React.FC<OnboardingStepPaydayProps> = ({
  step,
  pageAnimClass,
  payday,
  setPayday,
  weekendHandling,
  setWeekendHandling,
  handleNextFromStep5Payday,
}) => (
  <>
    {step === 5 && (
      <div
        key="step-5"
        className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
      >
        <div className="shrink-0 pt-6 pb-4">
          <h1 className="ui-step-title text-balance">
            När får du lön?
          </h1>
          <p className="ui-onb-subtitle">Dejz räknar från lön till lön – inte per kalendermånad.</p>
        </div>

        <div className="flex-1 min-h-0 pt-6 space-y-8">
          <div className="space-y-6">
            <div className="font-display font-bold text-5xl tracking-tight text-[var(--text-primary)] tabular-nums text-center">
              {payday === 31 ? 'Sista dagen' : `Den ${payday}:e`}
            </div>

            <input
              type="range"
              min={1}
              max={31}
              value={payday}
              onChange={(e) => setPayday(Number(e.target.value))}
              aria-label="Välj lönedag"
              style={{
                background: `linear-gradient(to right, var(--cta-bg) 0%, var(--cta-bg) ${
                  ((payday - 1) / 30) * 100
                }%, var(--segment-track) ${
                  ((payday - 1) / 30) * 100
                }%, var(--segment-track) 100%)`,
              }}
              className="ui-payday-slider"
            />
          </div>

          {/* Helghantering: en grupperad rad som i iOS Inställningar */}
          <div className="ui-onb-row-card">
            <span className="text-subhead text-[var(--text-primary)]">
              Betalas ut fredagen före vid helg
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={weekendHandling === 'before'}
              aria-label="Betalas ut fredagen före vid helg"
              onClick={() =>
                setWeekendHandling((prev) => (prev === 'before' ? 'none' : 'before'))
              }
              className={`ui-switch ${weekendHandling === 'before' ? 'ui-switch-on' : 'ui-switch-off'}`}
            >
              <span
                className={`ui-switch-thumb ${
                  weekendHandling === 'before' ? 'ui-switch-thumb-on' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="shrink-0 pt-3">
          <button
            type="button"
            onClick={handleNextFromStep5Payday}
            className="ui-btn-primary"
          >
            <span>Fortsätt</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>
      </div>
    )}
  </>
);
