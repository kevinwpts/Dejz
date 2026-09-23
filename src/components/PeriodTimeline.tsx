import React, { useEffect, useRef, useMemo } from 'react';
import { motion } from 'motion/react';

interface PeriodTimelineProps {
  calendarDays: any[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  language?: string;
  stats?: any;
  isCurrentPeriod?: boolean;
}

export function PeriodTimeline({
  calendarDays = [],
  selectedDate,
  onSelectDate,
  language = 'sv',
}: PeriodTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedDayRef = useRef<HTMLButtonElement>(null);
  const isInitialMount = useRef(true);

  const isEn = language === 'en';
  const locale = isEn ? 'en-US' : 'sv-SE';

  // Normalize selected date for comparison
  const selectedTime = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }, [selectedDate]);

  const todayTime = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }, []);

  // Center selected day inside the scroll container
  const centerSelectedElement = (element: HTMLElement | null, behavior: ScrollBehavior = 'smooth') => {
    if (!element || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const elementCenter = elementRect.left + elementRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const delta = elementCenter - containerCenter;

    if (Math.abs(delta) > 1) {
      container.scrollBy({
        left: delta,
        behavior,
      });
    }
  };

  // Auto-scroll on mount and when selectedTime changes
  useEffect(() => {
    if (selectedDayRef.current) {
      centerSelectedElement(
        selectedDayRef.current,
        isInitialMount.current ? ('instant' as ScrollBehavior) : 'smooth'
      );
    }
    isInitialMount.current = false;
  }, [selectedTime]);

  if (!calendarDays || calendarDays.length === 0) {
    return null;
  }

  const handleSelect = (dayDate: any, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const targetEl = e.currentTarget;
    onSelectDate(new Date(dayDate));
    centerSelectedElement(targetEl, 'smooth');
  };

  return (
    <div className="w-full mb-1 font-sans">
      {/* Horizontal Scrollable Day Strip */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-1 no-scrollbar scroll-smooth touch-pan-x overscroll-contain"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {calendarDays.map((day: any, index: number) => {
          if (!day.date) return null;
          const dayDate = new Date(day.date);
          const dayTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
          const isSelected = selectedTime === dayTime;
          const isRealToday = dayTime === todayTime;
          const dayNumber = dayDate.getDate();
          
          // Day name in short form (e.g. Mån, Tis or Mon, Tue)
          const dayWeekday = dayDate.toLocaleDateString(locale, { weekday: 'short' });
          const dayWeekdayShort = dayWeekday.slice(0, 3);

          const hasSpend = (day.daySpent || 0) > 0;
          const hasTx = (day.hasTransactions || (day.transactions?.length || 0) > 0);

          return (
            <motion.button
              key={`${day.date}-${index}`}
              ref={isSelected ? selectedDayRef : null}
              type="button"
              onClick={(e) => handleSelect(day.date, e)}
              whileTap={{ scale: 0.94 }}
              className={`flex flex-col items-center justify-between min-w-[48px] sm:min-w-[52px] h-[62px] sm:h-[66px] py-1.5 px-1 rounded-[16px] transition-all duration-200 cursor-pointer select-none shrink-0 relative ${
                isSelected
                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-sm dark:bg-white dark:text-black font-semibold'
                  : isRealToday
                  ? 'bg-[var(--surface-color)] text-[var(--text-primary)] border-2 border-[var(--text-primary)]/40 hover:border-[var(--text-primary)]/70'
                  : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)]'
              }`}
            >
              {/* Day of Week */}
              <span className={`text-[10px] sm:text-[10.5px] tracking-tight uppercase ${
                isSelected 
                  ? 'opacity-90 font-bold' 
                  : isRealToday 
                  ? 'text-[var(--text-primary)] font-bold' 
                  : 'opacity-65 font-medium'
              }`}>
                {isRealToday && !isSelected ? (isEn ? 'Today' : 'Idag') : dayWeekdayShort}
              </span>

              {/* Day Number */}
              <span className={`text-[16px] sm:text-[18px] leading-none font-amount font-bold ${
                isSelected ? 'text-[var(--text-on-accent)] dark:text-black' : 'text-[var(--text-primary)]'
              }`}>
                {dayNumber}
              </span>

              {/* Status / Transaction Dot */}
              <div className="h-1.5 flex items-center justify-center">
                {isSelected ? (
                  <div className="w-1 h-1 rounded-full bg-[var(--text-on-accent)] dark:bg-black opacity-80" />
                ) : hasTx || hasSpend ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                ) : isRealToday ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500/80 dark:bg-blue-400" />
                ) : (
                  <div className="w-1 h-1 rounded-full bg-transparent" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
