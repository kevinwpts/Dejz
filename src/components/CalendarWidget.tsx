import React from 'react';
import { TranslationKey, Language } from '../i18n';

interface CalendarWidgetProps {
  calendarDays: any[];
  normalizedSelectedDate: Date;
  setSelectedDate: (date: Date) => void;
  t: (key: TranslationKey) => string;
  currentLang: Language;
  showFixedInCalendar?: boolean;
}

export function CalendarWidget({ calendarDays, normalizedSelectedDate, setSelectedDate, t, showFixedInCalendar = true }: CalendarWidgetProps) {
  const today = new Date();

  return (
    <div className="w-full">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {[t('monInitial'), t('tueInitial'), t('wedInitial'), t('thuInitial'), t('friInitial'), t('satInitial'), t('sunInitial')].map((d, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {(calendarDays || []).length > 0 && calendarDays[0]?.date && Array.from({ length: (new Date(calendarDays[0].date).getDay() + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square opacity-0 pointer-events-none" />
        ))}
        {(calendarDays || []).map((day: any, i: number) => {
          if (!day?.date) return null;
          const dayDate = new Date(day.date);
          const isSelected = normalizedSelectedDate && dayDate.toDateString() === new Date(normalizedSelectedDate).toDateString();
          const isToday = dayDate.toDateString() === today.toDateString();
          const hasIncome = day.income > 0;
          const hasSpend = day.spend > 0;
          const hasFixed = showFixedInCalendar && day.hasFixedItems;

          return (
            <button
              key={`${day.date}-${i}`}
              onClick={() => {
                const target = new Date(dayDate);
                const now = new Date();
                target.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                setSelectedDate(target);
              }}
              className={`aspect-square w-full rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all relative active:scale-95 cursor-pointer text-center ${
                isSelected 
                  ? 'bg-[var(--accent-color)] text-white shadow-xs z-10' 
                  : isToday
                  ? 'bg-black/5 dark:bg-white/10 text-[var(--text-primary)] border border-black/10 dark:border-white/10'
                  : 'bg-transparent text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <span className={`text-[13px] sm:text-[14px] font-medium tabular-nums leading-none text-center ${
                isSelected ? 'text-white font-medium' : isToday ? 'text-[var(--accent-color)] font-medium' : 'text-[var(--text-primary)] font-normal'
              }`}>
                {dayDate.getDate()}
              </span>
              
              {/* Activity Indicators */}
              <div className="flex items-center justify-center gap-0.5 pointer-events-none h-1 w-full">
                {hasIncome && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
                {hasSpend && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : 'bg-[var(--accent-color)]'}`} />
                )}
                {hasFixed && !hasIncome && !hasSpend && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/80' : 'bg-amber-500'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

