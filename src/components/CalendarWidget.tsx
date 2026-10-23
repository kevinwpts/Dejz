import React, { useState } from 'react';
import { TranslationKey, Language } from '../i18n';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarWidgetProps {
  calendarDays?: any[];
  normalizedSelectedDate?: Date | null;
  setSelectedDate: (date: Date) => void;
  t?: (key: TranslationKey) => string;
  currentLang: Language;
  showFixedInCalendar?: boolean;
  // Optional controlled period/month props (used when navigating periods in Historik)
  customYear?: number;
  customMonth?: number;
  txByDay?: Record<number, { hasIncome?: boolean; hasExpense?: boolean; hasFixed?: boolean }>;
  headerTitle?: string;
  headerSubtitle?: string;
  onPrev?: () => void;
  onNext?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  footerContent?: React.ReactNode;
}

export function CalendarWidget({
  calendarDays = [],
  normalizedSelectedDate,
  setSelectedDate,
  t,
  currentLang,
  showFixedInCalendar = true,
  customYear,
  customMonth,
  txByDay,
  headerTitle,
  headerSubtitle,
  onPrev,
  onNext,
  canGoPrev = true,
  canGoNext = true,
  footerContent,
}: CalendarWidgetProps) {
  const today = new Date();

  // View state for month/year navigation when picking past/future dates
  const initialDate = normalizedSelectedDate ? new Date(normalizedSelectedDate) : new Date();
  const [internalYear, setInternalYear] = useState(initialDate.getFullYear());
  const [internalMonth, setInternalMonth] = useState(initialDate.getMonth());

  const activeYear = customYear !== undefined ? customYear : internalYear;
  const activeMonth = customMonth !== undefined ? customMonth : internalMonth;

  const monthNames = currentLang === 'en' 
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : currentLang === 'fi'
    ? ['Tammikuu', 'Helmikuu', 'Maaliskuu', 'Huhtikuu', 'Toukokuu', 'Kesäkuu', 'Heinäkuu', 'Elokuu', 'Syyskuu', 'Lokakuu', 'Marraskuu', 'Joulukuu']
    : currentLang === 'no' || currentLang === 'da'
    ? ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember']
    : ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];

  const weekdayInitials = t
    ? [t('monInitial'), t('tueInitial'), t('wedInitial'), t('thuInitial'), t('friInitial'), t('satInitial'), t('sunInitial')]
    : currentLang === 'en'
      ? ['M', 'T', 'W', 'T', 'F', 'S', 'S']
      : currentLang === 'fi'
        ? ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su']
        : ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

  // Generate days for the viewed month
  const daysInMonth = new Date(activeYear, activeMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(activeYear, activeMonth, 1).getDay();
  // Adjust for Monday start: Mon=0, Sun=6
  const startingEmptyDays = (firstDayOfWeek + 6) % 7;

  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const d = new Date(activeYear, activeMonth, dayNum);
    if (txByDay) {
      const dayTx = txByDay[dayNum];
      return {
        date: d,
        hasIncome: Boolean(dayTx?.hasIncome),
        hasSpend: Boolean(dayTx?.hasExpense),
        hasFixed: Boolean(dayTx?.hasFixed),
      };
    }

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
      hasFixed: showFixedInCalendar && match?.hasFixedItems,
    };
  });

  const handlePrev = () => {
    if (onPrev) {
      onPrev();
      return;
    }
    if (internalMonth === 0) {
      setInternalMonth(11);
      setInternalYear(internalYear - 1);
    } else {
      setInternalMonth(internalMonth - 1);
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
      return;
    }
    if (internalMonth === 11) {
      setInternalMonth(0);
      setInternalYear(internalYear + 1);
    } else {
      setInternalMonth(internalMonth + 1);
    }
  };

  return (
    <div className="w-full space-y-3.5 select-none">
      {/* Unified Month / Period Navigator */}
      <div className="flex items-center justify-between pb-3 border-b border-subtle">
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev}
          className={`w-8 h-8 rounded-[var(--radius-button-sm,10px)] flex items-center justify-center transition-all cursor-pointer ${
            canGoPrev
              ? 'text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] active:scale-90'
              : 'text-[var(--text-tertiary)]/30 cursor-not-allowed'
          }`}
          aria-label={currentLang === 'en' ? 'Previous' : 'Föregående'}
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>

        <div className="flex flex-col items-center text-center px-2 min-w-0">
          <span className="text-card-title font-semibold text-[var(--text-primary)] tracking-tight truncate capitalize">
            {headerTitle || `${monthNames[activeMonth]} ${activeYear}`}
          </span>
          {headerSubtitle && (
            <span className="text-micro-label text-[var(--text-secondary)] font-normal truncate mt-0.5 tabular-nums">
              {headerSubtitle}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          className={`w-8 h-8 rounded-[var(--radius-button-sm,10px)] flex items-center justify-center transition-all cursor-pointer ${
            canGoNext
              ? 'text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] active:scale-90'
              : 'text-[var(--text-tertiary)]/30 cursor-not-allowed'
          }`}
          aria-label={currentLang === 'en' ? 'Next' : 'Nästa'}
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1">
        {weekdayInitials.map((d, i) => (
          <div key={i} className="text-center text-micro-label font-semibold text-[var(--text-tertiary)] py-0.5">
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
                  ? 'bg-[var(--accent-color)] text-[var(--on-accent)] font-bold border-none z-10 shadow-xs' 
                  : isToday
                  ? 'bg-[var(--surface-muted)] text-[var(--accent-color)] font-bold border-none'
                  : 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-hover)] font-medium'
              }`}
            >
              <span className={`text-secondary tabular-nums leading-none text-center ${
                isSelected ? 'text-[var(--on-accent)] font-bold' : isToday ? 'text-[var(--accent-color)] font-bold' : 'text-[var(--text-primary)] font-medium'
              }`}>
                {dayDate.getDate()}
              </span>
              
              {/* Activity Indicators */}
              <div className="flex items-center justify-center gap-0.5 pointer-events-none h-1 w-full">
                {hasIncome && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[var(--on-accent)]' : 'bg-[var(--success-color)]'}`} />
                )}
                {hasSpend && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[var(--on-accent)]/85' : 'bg-[var(--accent-color)]'}`} />
                )}
                {hasFixed && !hasIncome && !hasSpend && (
                  <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[var(--on-accent)]/75' : 'bg-[var(--warning-color)]'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {footerContent && (
        <div className="pt-2 border-t border-subtle">
          {footerContent}
        </div>
      )}
    </div>
  );
}
