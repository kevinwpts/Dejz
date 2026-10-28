import React from 'react';

export interface DayPreset {
  day: number;
  label: string;
  badge?: string;
  sublabel?: string;
}

interface DayOfMonthPickerProps {
  selectedDay: number;
  onSelectDay: (day: number) => void;
  mode?: 'payday' | 'dueday';
  title?: string;
  subtitle?: string;
  presets?: DayPreset[];
  showHeader?: boolean;
  minimal?: boolean;
}

export const DayOfMonthPicker: React.FC<DayOfMonthPickerProps> = ({
  selectedDay,
  onSelectDay,
  mode = 'payday',
  title,
  showHeader = false,
  minimal = false,
}) => {
  return (
    <div
      className={
        minimal
          ? 'space-y-2'
          : 'rounded-3xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-4 sm:p-5 space-y-3'
      }
    >
      {showHeader && (
        <div className="flex items-center justify-between px-0.5 pb-1 border-b border-[var(--border-subtle)]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {title || (mode === 'payday' ? 'Lönedag' : 'Förfallodag')}
          </span>
          <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">
            Den {selectedDay}:e
          </span>
        </div>
      )}

      {/* Dagar 1-31 */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
          const isSelected = Number(selectedDay) === day;
          const isCommonHighlight =
            !isSelected &&
            (mode === 'payday' ? day === 25 : day === 28 || day === 25);

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`h-10 sm:h-11 rounded-2xl font-display text-[13px] sm:text-sm tabular-nums transition-all cursor-pointer flex flex-col items-center justify-center relative select-none active:scale-95 ${
                isSelected
                  ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-bold shadow-sm scale-[1.05] ring-2 ring-[var(--text-primary)]/15'
                  : 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-color)] font-medium hover:scale-105'
              }`}
            >
              <span>{day}</span>
              {isCommonHighlight && (
                <span className="w-1 h-1 rounded-full bg-emerald-500 absolute bottom-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
