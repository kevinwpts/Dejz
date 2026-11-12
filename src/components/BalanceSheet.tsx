import React, { useState } from 'react';
import { BottomSheet } from './ui/BottomSheet';
import { ManualBalance } from '../utils/cache/manualBalance';
import { SheetHeader } from './ui/SheetHeader';

/**
 * "Vad har du på kontot just nu?" – utan bankkoppling är detta det säkraste sättet att få
 * rätt "kvar till lön": Dejz drar av räkningarna som är kvar före lön och köp man lägger in efteråt.
 */
interface BalanceSheetProps {
  isOpen: boolean;
  onClose: () => void;
  current: ManualBalance | null;
  onSave: (amount: number) => void;
  onClear?: () => void;
}

export const BalanceSheet: React.FC<BalanceSheetProps> = ({
  isOpen,
  onClose,
  current,
  onSave,
  onClear,
}) => {
  const [value, setValue] = useState('');
  // Töm fältet varje gång bladet öppnas (justeras direkt under render när isOpen ändras)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) setValue('');
  }

  const amount = Math.round(Number(value.replace(/\s/g, '').replace(',', '.')));
  const valid = value.trim() !== '' && Number.isFinite(amount);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(amount);
        }}
        className="space-y-5"
      >
        <SheetHeader title="Saldo just nu" onClose={onClose} flush />

        <div className="space-y-1.5">
          <p className="font-display font-semibold text-xl tracking-[-0.01em] text-[var(--text-primary)]">
            Hur mycket har du på kontot?
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Kolla i din bankapp och skriv in saldot. Dejz drar av räkningarna som är kvar före lön
            – då ser du exakt vad du kan spendera.
          </p>
        </div>

        <label className="flex items-baseline gap-2 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] px-4 py-4 cursor-text">
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            placeholder={current ? String(current.amount) : '0'}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^\d\s,.-]/g, ''))}
            className="flex-1 min-w-0 bg-transparent border-0 p-0 font-display font-semibold text-[34px] leading-none tabular-nums text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
          />
          <span className="text-base font-medium text-[var(--text-secondary)]">kr</span>
        </label>

        <button
          type="submit"
          disabled={!valid}
          className="ui-btn-primary"
        >
          Spara saldo
        </button>

        {current && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="w-full min-h-11 px-4 text-footnote font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Sluta använda saldo – räkna bara på inkomst och köp
          </button>
        )}
      </form>
    </BottomSheet>
  );
};
