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

  // Function to center any given element within the container
  const centerElement = (el: HTMLElement | null, behavior: ScrollBehavior = 'smooth') => {
    if (!el || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const elementCenter = elRect.left + elRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const delta = elementCenter - containerCenter;

    if (Math.abs(delta) > 1) {
      container.scrollTo({
        left: container.scrollLeft + delta,
        behavior,
      });
    }
  };

  // Auto-scroll on mount and when selectedTime changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedDayRef.current) {
        centerElement(
          selectedDayRef.current,
          isInitialMount.current ? 'auto' : 'smooth'
        );
      }
      isInitialMount.current = false;
    }, 40);

    return () => clearTimeout(timer);
  }, [selectedTime]);

  if (!calendarDays || calendarDays.length === 0) {
    return null;
  }

  const handleSelect = (dayDate: any, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const targetEl = e.currentTarget;
    onSelectDate(new Date(dayDate));
    centerElement(targetEl, 'smooth');
  };

  return (
    <div className="w-full my-1 font-sans">
      {/* Horizontal Scrollable Day Strip */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-3 no-scrollbar touch-pan-x overscroll-contain"
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
              className={`flex flex-col items-center justify-between min-w-[42px] sm:min-w-[46px] h-[52px] sm:h-[56px] py-1.5 px-1 rounded-[14px] transition-all duration-200 cursor-pointer select-none shrink-0 relative ${
                isSelected
                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-2xs dark:bg-white dark:text-black font-semibold'
                  : isRealToday
                  ? 'bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--text-primary)]/50 hover:border-[var(--text-primary)]/80'
                  : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)]'
              }`}
            >
              {/* Day of Week */}
              <span className={`text-[9px] sm:text-[9.5px] tracking-tight uppercase ${
                isSelected 
                  ? 'opacity-90 font-semibold' 
                  : isRealToday 
                  ? 'text-[var(--text-primary)] font-semibold' 
                  : 'opacity-65 font-medium'
              }`}>
                {isRealToday && !isSelected ? (isEn ? 'Today' : 'Idag') : dayWeekdayShort}
              </span>

              {/* Day Number */}
              <span className={`text-[13px] sm:text-[14px] leading-none font-medium tabular-nums ${
                isSelected ? 'text-[var(--text-on-accent)] dark:text-black font-semibold' : 'text-[var(--text-primary)]'
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
