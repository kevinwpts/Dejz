// Steg 1 i "Nytt sparmål": vad sparar du till? (namn på målet).
import React from 'react';

interface StepNameProps {
  animClass: string;
  goalNameInput: string;
  setGoalNameInput: (value: string) => void;
  /** Körs när ett namn är ifyllt och personen trycker Fortsätt. */
  onContinue: () => void;
}

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
    className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${animClass}`}
  >
    <div className="my-auto py-6 flex flex-col items-center justify-center">
      <input
        type="text"
        autoFocus
        required
        placeholder="t.ex. Buffert eller Resa"
        value={goalNameInput}
        onChange={(e) => setGoalNameInput(e.target.value)}
        className="w-full bg-transparent border-0 p-0 text-center font-display font-bold text-3xl sm:text-4xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/35 tracking-tight focus:outline-none"
      />
    </div>

    <div className="shrink-0 pt-3">
      <button
        type="submit"
        disabled={!goalNameInput.trim()}
        className={`w-full py-4 rounded-full font-display font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
          goalNameInput.trim()
            ? 'bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] hover:opacity-90 active:scale-[0.99] cursor-pointer'
            : 'bg-[var(--surface-color)] text-[var(--text-muted)] cursor-not-allowed'
        }`}
      >
        <span>Fortsätt</span>
      </button>
    </div>
  </form>
);
