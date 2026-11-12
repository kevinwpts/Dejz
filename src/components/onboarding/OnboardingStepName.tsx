import type { SetStateAction } from 'react';
import React from 'react';
import { ArrowRight } from '@phosphor-icons/react';

export interface OnboardingStepNameProps {
  step: 2 | 1 | 3 | 4 | 5 | 6 | 7;
  handleNextFromStep1: (e: React.FormEvent<Element>) => void;
  pageAnimClass: "animate-page-forward" | "animate-page-back";
  name: string;
  setName: (value: SetStateAction<string>) => void;
}

export const OnboardingStepName: React.FC<OnboardingStepNameProps> = ({
  step,
  handleNextFromStep1,
  pageAnimClass,
  name,
  setName,
}) => (
  <>
    {step === 1 && (
      <form
        key="step-1"
        onSubmit={handleNextFromStep1}
        className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
      >
        <div className="shrink-0 pt-6 pb-4">
          <h1 className="ui-step-title text-balance">
            Vad heter du?
          </h1>
          <p className="ui-onb-subtitle">Så vet vi vad vi ska kalla dig.</p>
        </div>

        <div className="flex-1 min-h-0 pt-2">
          <div className="ui-onb-input-card">
            <input
              aria-label="Förnamn"
              type="text"
              autoFocus
              required
              placeholder="Ditt förnamn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent border-0 p-0 font-display font-semibold text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none"
            />
          </div>
        </div>

        <div className="shrink-0 pt-3">
          <button
            type="submit"
            disabled={!name.trim()}
            className="ui-btn-primary"
          >
            <span>Fortsätt</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    )}
  </>
);
