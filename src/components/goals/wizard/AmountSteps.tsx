// Beloppsstegen i "Nytt sparmål": målbelopp (steg 3), sparat hittills (steg 5) och per månad (steg 6).
import React from 'react';
import { formatInputThousands } from '../goalHelpers';
import { WizardNumpad } from './WizardNumpad';

const CTA_CLASS =
  'w-full py-4 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer';

/** Stora siffror med "kr" efter, gråa när beloppet är 0. */
const AmountDisplay: React.FC<{ value: string }> = ({ value }) => (
  <div className="flex items-baseline justify-center gap-2.5 font-display font-bold text-5xl sm:text-6xl tracking-tight tabular-nums">
    <span
      className={
        Number(value) > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]/40'
      }
    >
      {Number(value) > 0 ? formatInputThousands(value) : '0'}
    </span>
    <span className="text-[var(--text-primary)]">kr</span>
  </div>
);

interface AmountStepBaseProps {
  animClass: string;
  value: string;
  onChange: (next: string) => void;
}

/** Steg 3: hur mycket behöver du spara? */
export const StepTargetAmount: React.FC<AmountStepBaseProps & { onContinue: () => void }> = ({
  animClass,
  value,
  onChange,
  onContinue,
}) => (
  <div className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${animClass}`}>
    <div className="my-auto py-4 flex items-center justify-center">
      <AmountDisplay value={value} />
    </div>

    <div className="shrink-0">
      <WizardNumpad value={value} onChange={onChange} />

      <button
        type="button"
        disabled={!(Number(value) > 0)}
        onClick={onContinue}
        className={`w-full py-4 rounded-full font-display font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
          Number(value) > 0
            ? 'bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] hover:opacity-90 active:scale-[0.99] cursor-pointer'
            : 'bg-[var(--surface-color)] text-[var(--text-muted)] cursor-not-allowed'
        }`}
      >
        <span>Fortsätt</span>
      </button>
    </div>
  </div>
);

interface GuardedStepProps extends AmountStepBaseProps {
  /** Namn och målbelopp ifyllda? */
  canSave: boolean;
}

/** Steg 5: hur mycket har du sparat hittills? */
export const StepCurrentAmount: React.FC<GuardedStepProps & { onContinue: () => void }> = ({
  animClass,
  value,
  onChange,
  canSave,
  onContinue,
}) => (
  <div className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${animClass}`}>
    <div className="my-auto py-4 flex items-center justify-center">
      <AmountDisplay value={value} />
    </div>

    <div className="shrink-0">
      <WizardNumpad value={value} onChange={onChange} />

      <button type="button" disabled={!canSave} onClick={onContinue} className={CTA_CLASS}>
        <span>Fortsätt</span>
      </button>
    </div>
  </div>
);

interface StepMonthlyAmountProps extends GuardedStepProps {
  goalTargetInput: string;
  goalCurrentInput: string;
  onSave: () => void;
}

/** Steg 6: månadssparande – dras av från "kvar att spendera". */
export const StepMonthlyAmount: React.FC<StepMonthlyAmountProps> = ({
  animClass,
  value,
  onChange,
  canSave,
  goalTargetInput,
  goalCurrentInput,
  onSave,
}) => (
  <div className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${animClass}`}>
    <p className="pt-1 text-sm text-[var(--text-secondary)] leading-[1.45] text-center max-w-xs mx-auto">
      Dras av från det du har kvar att spendera varje lönedag och läggs till i målet automatiskt.
      Du kan hoppa över och sätta in pengar själv när du vill.
    </p>
    <div className="my-auto py-4 flex flex-col items-center justify-center gap-2">
      <AmountDisplay value={value} />
      {Number(value) > 0 && Number(goalTargetInput) > 0 && (
        <span className="text-sm text-[var(--text-secondary)]">
          {(() => {
            const left = Math.max(0, Number(goalTargetInput) - (Number(goalCurrentInput) || 0));
            const months = Math.ceil(left / Number(value));
            return left === 0
              ? 'Du har redan nått målet 🎉'
              : months === 1
              ? 'Du når målet om 1 månad'
              : `Du når målet om ${months} månader`;
          })()}
        </span>
      )}
    </div>

    <div className="shrink-0">
      <WizardNumpad value={value} onChange={onChange} />

      <button type="button" disabled={!canSave} onClick={onSave} className={CTA_CLASS}>
        <span>Skapa sparmål</span>
      </button>
    </div>
  </div>
);
