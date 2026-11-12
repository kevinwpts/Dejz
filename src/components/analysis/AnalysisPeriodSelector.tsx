// Periodväljaren i Analys-fliken: pilar + periodknapp, och bladet där man väljer period
import React from 'react';
import { CaretRight, CaretLeft, CaretDown, Check } from '@phosphor-icons/react';
import type { PeriodInfo } from '../../utils/periodEngine';
import { BottomSheet } from '../ui/BottomSheet';

interface AnalysisPeriodNavProps {
  period: PeriodInfo;
  periodOffset: number;
  setPeriodOffset: React.Dispatch<React.SetStateAction<number>>;
  onOpenMenu: () => void;
}

/** Svagt svävande periodväljare utan tung kort-box */
export const AnalysisPeriodNav: React.FC<AnalysisPeriodNavProps> = ({
  period,
  periodOffset,
  setPeriodOffset,
  onOpenMenu,
}) => (
  <div className="flex items-center justify-between gap-2 px-1">
    <button
      aria-label="Föregående period"
      type="button"
      onClick={() => setPeriodOffset((prev) => Math.max(-5, prev - 1))}
      disabled={periodOffset <= -5}
      className="w-10 h-10 rounded-full bg-[var(--btn-secondary-fill)] flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0 active:scale-95"
      title="Föregående period"
    >
      <CaretLeft size={16} />
    </button>

    <button
      type="button"
      onClick={onOpenMenu}
      className="h-10 px-4 rounded-full bg-[var(--btn-secondary-fill)] active:scale-[0.97] transition-all cursor-pointer inline-flex items-center justify-center gap-2"
    >
      <span className="font-display font-semibold text-callout text-[var(--text-primary)] tabular-nums">
        {period.startLabel} – {period.endLabel}
      </span>
      <CaretDown
        size={12}
        className="text-[var(--text-muted)] shrink-0"
      />
    </button>

    <button
      aria-label="Nästa period"
      type="button"
      onClick={() => setPeriodOffset((prev) => Math.min(0, prev + 1))}
      disabled={periodOffset >= 0}
      className="w-10 h-10 rounded-full bg-[var(--btn-secondary-fill)] flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0 active:scale-95"
      title="Nästa period"
    >
      <CaretRight size={16} />
    </button>
  </div>
);

interface AnalysisPeriodSheetProps {
  isOpen: boolean;
  onClose: () => void;
  availablePeriods: { offset: number; info: PeriodInfo }[];
  periodOffset: number;
  onSelectOffset: (offset: number) => void;
}

/** Riktigt BottomSheet för Periodväljaren */
export const AnalysisPeriodSheet: React.FC<AnalysisPeriodSheetProps> = ({
  isOpen,
  onClose,
  availablePeriods,
  periodOffset,
  onSelectOffset,
}) => (
  <BottomSheet isOpen={isOpen} onClose={onClose} title="Välj period">
    <div className="ui-sheet-group">
      {availablePeriods.map((p) => {
        const isSelected = p.offset === periodOffset;
        return (
          <button
            key={p.offset}
            type="button"
            onClick={() => onSelectOffset(p.offset)}
            className="ui-row-btn"
          >
            <span
              className={`tabular-nums text-[var(--text-primary)] ${
                isSelected ? 'font-semibold' : 'font-normal'
              }`}
            >
              {p.info.startLabel} – {p.info.endLabel}
              {p.offset === 0 && (
                <span className="font-normal text-[var(--text-secondary)]"> · Nu</span>
              )}
            </span>
            {isSelected && (
              <Check size={18} className="text-[var(--on-accent-container)] shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  </BottomSheet>
);
