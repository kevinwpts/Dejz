// Steg 1 i "Nytt sparmål": vad sparar du till? (namn på målet).
import React from 'react';

interface StepNameProps {
  animClass: string;
  goalNameInput: string;
  setGoalNameInput: (value: string) => void;
  /** Körs när ett namn är ifyllt och personen trycker Fortsätt. */
  onContinue: () => void;
}

/** Vanliga mål – ett tryck fyller i namnet (snabbare än att skriva). */
const SUGGESTIONS = ['Buffert', 'Resa', 'Bil', 'Bostad', 'Ny mobil', 'Present'];

export const StepName: React.FC<StepNameProps> = ({
  animClass,
  goalNameInput,
  setGoalNameInput,
  onContinue,
}) => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      if (!goalNameInput.trim()) return;
      onContinue();
    }}
    className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden pt-4 ${animClass}`}
  >
    <div className="space-y-4">
      <input
        aria-label="Sparmålets namn"
        type="text"
        autoFocus
        required
        placeholder="Namn på målet"
        value={goalNameInput}
        onChange={(e) => setGoalNameInput(e.target.value)}
        className="w-full h-14 px-4 rounded-card-nested bg-[var(--surface-color)] shadow-[var(--card-shadow)] border-0 font-display font-semibold text-xl tracking-[-0.02em] text-[var(--text-primary)] placeholder-[var(--text-muted)]/70 focus:outline-none focus:shadow-[0_0_0_2px_var(--accent-soft)] transition-shadow"
      />
      <div className="flex flex-wrap gap-2" aria-label="Förslag">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setGoalNameInput(s)}
            className={goalNameInput.trim() === s ? 'ui-chip-active' : 'ui-chip'}
          >
            {s}
          </button>
        ))}
      </div>
    </div>

    <div className="shrink-0 pt-3">
      <button type="submit" disabled={!goalNameInput.trim()} className="ui-btn-primary">
        Fortsätt
      </button>
    </div>
  </form>
);
