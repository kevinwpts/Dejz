import React from 'react';

interface DayPreset {
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
    <div className={minimal ? 'space-y-2' : 'ui-sheet-box space-y-3'}>
      {showHeader && (
        <div className="flex items-center justify-between px-0.5">
          <span className="ui-field-label">
            {title || (mode === 'payday' ? 'Lönedag' : 'Förfallodag')}
          </span>
          <span className="text-footnote font-semibold text-[var(--text-primary)] tabular-nums">
            Den {selectedDay}:e
          </span>
        </div>
      )}

      {/* Dagar 1–31: neutral markering av vald dag (svart/vit), inga extra prickar */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
          const isSelected = Number(selectedDay) === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-pressed={isSelected}
              aria-label={`Den ${day}:e`}
              className={`${isSelected ? 'ui-day-btn-active' : 'ui-day-btn'} select-none active:scale-95`}
            >
              <span>{day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
