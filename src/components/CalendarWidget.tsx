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
    : currentLang === 'fi'
    ? ['Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu', 'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu']
    : currentLang === 'no' || currentLang === 'da'
    ? ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember']
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
        <span className="text-card-title font-bold text-[var(--text-primary)] capitalize tracking-tight">
          {monthNames[viewMonth]} {viewYear}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-8 h-8 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)] flex items-center justify-center hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors cursor-pointer active:scale-90"
          >
            <ChevronLeft size={15} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-primary)] flex items-center justify-center hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors cursor-pointer active:scale-90"
          >
            <ChevronRight size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1">
        {[t('monInitial'), t('tueInitial'), t('wedInitial'), t('thuInitial'), t('friInitial'), t('satInitial'), t('sunInitial')].map((d, i) => (
          <div key={i} className="text-center text-micro-label font-medium text-[var(--text-tertiary)] tracking-wider py-0.5">
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
          const isSelected = Boolean(normalizedSelectedDate && dayDate.toDateString() === new Date(normalizedSelectedDate).toDateString());
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
              className={`aspect-square w-full rounded-[var(--radius-card-nested,12px)] flex flex-col items-center justify-center gap-0.5 transition-all relative active:scale-[0.94] cursor-pointer text-center ${
                isSelected 
                  ? 'bg-[var(--text-primary)] text-[var(--surface-color)] font-bold border-none z-10 shadow-xs' 
                  : isToday
                  ? 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--accent-color)] font-bold border-none'
                  : 'bg-transparent text-[var(--text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
              }`}
            >
              <span className={`text-secondary tabular-nums leading-none text-center ${
                isSelected ? 'text-[var(--surface-color)] font-bold' : isToday ? 'text-[var(--accent-color)] font-bold' : 'text-[var(--text-primary)] font-medium'
              }`}>
                {dayDate.getDate()}
              </span>
              
              {/* Activity Indicators */}
              <div className="flex items-center justify-center gap-0.5 pointer-events-none h-1 w-full">
                {hasIncome && (
                  <span className="w-1 h-1 rounded-full bg-[var(--success-color)]" />
                )}
                {hasSpend && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[var(--surface-color)]/80' : 'bg-[var(--accent-color)]'}`} />
                )}
                {hasFixed && !hasIncome && !hasSpend && (
                  <span className="w-1 h-1 rounded-full bg-[var(--warning-color)]" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
