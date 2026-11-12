import type { SetStateAction } from 'react';
import React from 'react';
import { ArrowRight } from '@phosphor-icons/react';
import { WeekendHandlingMode } from '../../utils/periodEngine';
import { DayOfMonthPicker } from '../ui/DayOfMonthPicker';

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

        {/* Samma dagväljare och samma helgreglage som i Inställningar → Lönedag */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 pb-2">
          <div className="ui-card-p">
            <DayOfMonthPicker
              selectedDay={payday}
              onSelectDay={setPayday}
              mode="payday"
              minimal
            />
          </div>

          <div className="ui-onb-row-card">
            <div className="min-w-0 flex-1">
              <span className="text-subhead font-medium text-[var(--text-primary)] block">
                Lön före helg
              </span>
              <span className="text-footnote text-[var(--text-secondary)] block mt-0.5">
                Infaller lönedagen på en helg räknar vi med fredagen före.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={weekendHandling === 'before'}
              aria-label="Lön före helg"
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
