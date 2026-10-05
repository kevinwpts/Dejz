import React, { useState } from 'react';
import { TranslationKey, Language } from '../i18n';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarWidgetProps {
  calendarDays: any[];
  normalizedSelectedDate: Date;
  setSelectedDate: (date: Date) => void;
  t: (key: TranslationKey) => string;
  currentLang: Language;
  showFixedInCalendar?: boolean;
}

export function CalendarWidget({ calendarDays, normalizedSelectedDate, setSelectedDate, t, currentLang, showFixedInCalendar = true }: CalendarWidgetProps) {
  const today = new Date();

  // View state for month/year navigation when picking past/future dates
  const initialDate = normalizedSelectedDate ? new Date(normalizedSelectedDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const monthNames = currentLang === 'en' 
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];

  // Generate days for the viewed month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  // Adjust for Monday start: Mon=0, Sun=6
  const startingEmptyDays = (firstDayOfWeek + 6) % 7;

  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(viewYear, viewMonth, i + 1);
    // Find matching calendarDay if available from stats for indicators
    const dateStr = d.toISOString().split('T')[0];
    const match = (calendarDays || []).find((cd: any) => {
      if (!cd?.date) return false;
      const cdStr = typeof cd.date === 'string' ? cd.date : new Date(cd.date).toISOString();
      return cdStr.startsWith(dateStr);
    });
    return {
      date: d,
      hasIncome: match?.income > 0,
      hasSpend: match?.spend > 0,
      hasFixed: showFixedInCalendar && match?.hasFixedItems
    };
  });

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Month / Year Navigator */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[14px] font-bold text-[var(--text-primary)] capitalize tracking-tight">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-7 h-7 rounded-[14px] bg-black/5 dark:bg-white/5 text-[var(--text-primary)] flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ChevronLeft size={15} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 rounded-[14px] bg-black/5 dark:bg-white/5 text-[var(--text-primary)] flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1">
        {[t('monInitial'), t('tueInitial'), t('wedInitial'), t('thuInitial'), t('friInitial'), t('satInitial'), t('sunInitial')].map((d, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-[var(--text-tertiary)] tracking-wider py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startingEmptyDays }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square opacity-0 pointer-events-none" />
        ))}
        {monthDays.map((day, i) => {
          const dayDate = day.date;
          const isSelected = normalizedSelectedDate && dayDate.toDateString() === new Date(normalizedSelectedDate).toDateString();
          const isToday = dayDate.toDateString() === today.toDateString();
          const hasIncome = day.hasIncome;
          const hasSpend = day.hasSpend;
          const hasFixed = day.hasFixed;

          return (
            <button
              key={`${dayDate.toISOString()}-${i}`}
              type="button"
              onClick={() => {
                const target = new Date(dayDate);
                const now = new Date();
                target.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                setSelectedDate(target);
              }}
              className={`aspect-square w-full rounded-[14px] flex flex-col items-center justify-center gap-0.5 transition-all relative active:scale-[0.94] cursor-pointer text-center ${
                isSelected 
                  ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-xs z-10' 
                  : isToday
                  ? 'bg-black/[0.06] dark:bg-white/[0.08] text-[var(--text-primary)] border border-black/5 dark:border-white/10'
                  : 'bg-transparent text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <span className={`text-[13px] sm:text-[14px] font-semibold tabular-nums leading-none text-center ${
                isSelected ? 'text-[var(--on-accent)] font-semibold' : isToday ? 'text-[var(--accent-color)] font-bold' : 'text-[var(--text-primary)] font-medium'
              }`}>
                {dayDate.getDate()}
              </span>
              
              {/* Activity Indicators */}
              <div className="flex items-center justify-center gap-0.5 pointer-events-none h-1 w-full">
                {hasIncome && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
                {hasSpend && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/90' : 'bg-[var(--accent-color)]'}`} />
                )}
                {hasFixed && !hasIncome && !hasSpend && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/90' : 'bg-amber-500'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
