import React from 'react';

export interface DayPreset {
  day: number;
  label: string;
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
  minimal = false,
}) => {
  return (
    <div
      className={
        minimal
          ? ''
          : 'rounded-3xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-4 sm:p-5'
      }
    >
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
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
                  ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-semibold shadow-sm scale-[1.04]'
                  : 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-color)] font-medium'
              }`}
            >
              <span>{day}</span>
              {isCommonHighlight && (
                <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]/60 absolute bottom-1.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
