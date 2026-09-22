import React from 'react';
import { Delete } from 'lucide-react';

interface NumberPadProps {
  onNumber: (num: string) => void;
  onBackspace: () => void;
}

export function NumberPad({ onNumber, onBackspace }: NumberPadProps) {
  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'backspace'];

  return (
    <div className="grid grid-cols-3 gap-2 p-4">
      {buttons.map((btn) => (
        <button
          type="button"
          key={btn}
          onClick={() => {
            if (btn === 'backspace') onBackspace();
            else onNumber(btn);
          }}
          className="h-12 flex items-center justify-center text-xl font-semibold bg-[var(--surface-color)] rounded-2xl hover:bg-[var(--border-color)] transition-all active:scale-95"
        >
          {btn === 'backspace' ? <Delete size={20} /> : btn}
        </button>
      ))}
    </div>
  );
}
