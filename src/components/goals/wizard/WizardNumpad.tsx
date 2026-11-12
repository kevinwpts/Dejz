// Sifferknappsats för beloppsstegen i "Nytt sparmål"-guiden (mål, hittills sparat, per månad).
import React from 'react';

interface WizardNumpadProps {
  /** Nuvarande siffror (utan mellanslag), t.ex. "25000". */
  value: string;
  onChange: (next: string) => void;
}

const KEY_CLASS =
  'h-14 rounded-2xl font-display font-semibold text-2xl text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--surface-color)]/60 active:bg-[var(--surface-color)] active:scale-95 transition-all cursor-pointer';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const WizardNumpad: React.FC<WizardNumpadProps> = ({ value, onChange }) => {
  const appendDigit = (digit: string) => {
    const next = (value + digit).replace(/^0+/, '');
    if (next.length <= 9) {
      onChange(next);
    }
  };

  const removeLastDigit = () => {
    onChange(value.slice(0, -1));
  };

  return (
    <div className="grid grid-cols-3 gap-y-1 gap-x-4 pb-3 select-none">
      {DIGITS.map((d) => (
        <button key={d} type="button" onClick={() => appendDigit(d)} className={KEY_CLASS}>
          {d}
        </button>
      ))}

      <button type="button" onClick={() => appendDigit('00')} className={KEY_CLASS}>
        ,
      </button>

      <button type="button" onClick={() => appendDigit('0')} className={KEY_CLASS}>
        0
      </button>

      <button
        type="button"
        onClick={removeLastDigit}
        aria-label="Sudda"
        className="h-14 rounded-2xl text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--surface-color)]/60 active:bg-[var(--surface-color)] active:scale-95 transition-all cursor-pointer"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
          <line x1="18" y1="9" x2="12" y2="15" />
          <line x1="12" y1="9" x2="18" y2="15" />
        </svg>
      </button>
    </div>
  );
};
