// Periodväljaren i Analys-fliken: pilar + periodknapp, och bladet där man väljer period
import React from 'react';
import { CalendarBlank, CaretRight, CaretLeft, CaretDown, Check } from '@phosphor-icons/react';
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
      type="button"
      onClick={() => setPeriodOffset((prev) => Math.max(-5, prev - 1))}
      disabled={periodOffset <= -5}
      className="w-9 h-9 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 transition-all cursor-pointer shrink-0 active:scale-95"
      title="Föregående period"
    >
      <CaretLeft size={14} weight="bold" />
    </button>

    <button
      type="button"
      onClick={onOpenMenu}
      className="py-1.5 px-4 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-2 shadow-2xs"
    >
      <CalendarBlank
        size={14}
        weight="duotone"
        className="text-[var(--text-secondary)] shrink-0"
      />
      <span className="font-display font-semibold text-xs sm:text-footnote text-[var(--text-primary)] tabular-nums">
        {period.startLabel} – {period.endLabel}
      </span>
      <CaretDown
        size={11}
        weight="bold"
        className="text-[var(--text-muted)] shrink-0"
      />
    </button>

    <button
      type="button"
      onClick={() => setPeriodOffset((prev) => Math.min(0, prev + 1))}
      disabled={periodOffset >= 0}
      className="w-9 h-9 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 transition-all cursor-pointer shrink-0 active:scale-95"
      title="Nästa period"
    >
      <CaretRight size={14} weight="bold" />
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
            <div className="flex items-center gap-2.5">
              <CalendarBlank
                size={15}
                weight={isSelected ? 'fill' : 'regular'}
                className={
                  isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                }
              />
              <span
                className={`tabular-nums ${
                  isSelected
                    ? 'font-bold text-[var(--text-primary)]'
                    : 'font-medium text-[var(--text-primary)]'
                }`}
              >
                {p.info.startLabel} – {p.info.endLabel}
              </span>
            </div>
            {isSelected && (
              <Check size={14} weight="bold" className="text-[var(--text-primary)]" />
            )}
          </button>
        );
      })}
    </div>
  </BottomSheet>
);
