import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { feedback } from '../utils/feedback';

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
  const dayRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const isInitialMount = useRef(true);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  // Smoothly scroll the selected day into comfortable view without artificial blank space
  const scrollToElement = useCallback((el: HTMLElement | null, behavior: ScrollBehavior = 'smooth') => {
    if (!el || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;

    const containerWidth = container.clientWidth;
    const elOffsetLeft = el.offsetLeft;
    const elWidth = el.offsetWidth;

    // Center if in middle, clamp to 0 at start (no left blank space)
    const targetScrollLeft = elOffsetLeft + elWidth / 2 - containerWidth / 2;
    const maxScroll = Math.max(0, container.scrollWidth - containerWidth);
    const clampedScroll = Math.max(0, Math.min(maxScroll, targetScrollLeft));

    if (Math.abs(container.scrollLeft - clampedScroll) > 1) {
      container.scrollTo({
        left: clampedScroll,
        behavior,
      });

      setTimeout(() => {
        checkScrollability();
      }, behavior === 'auto' ? 50 : 350);
    }
  }, [checkScrollability]);

  // Synchronize on mount and whenever selectedTime changes (e.g. app load, reset to today)
  useEffect(() => {
    if (!selectedTime) return;

    const timer = setTimeout(() => {
      const el = dayRefs.current.get(selectedTime) ||
        scrollContainerRef.current?.querySelector<HTMLButtonElement>(`[data-time="${selectedTime}"]`);
      if (el) {
        scrollToElement(el, isInitialMount.current ? 'auto' : 'smooth');
      }
      isInitialMount.current = false;
      checkScrollability();
    }, 40);

    return () => clearTimeout(timer);
  }, [selectedTime, calendarDays, scrollToElement, checkScrollability]);

  // Event listeners for scroll, wheel and window resize
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollability();

    const handleScroll = () => {
      checkScrollability();
    };

    // Wheel event handler: maps vertical scroll wheel to horizontal timeline movement
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.shiftKey || Math.abs(e.deltaY) > 5) {
        e.preventDefault();
        container.scrollLeft += e.deltaY;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', checkScrollability);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [calendarDays, checkScrollability]);

  // Step prev/next day via arrow buttons
  const handleStep = (direction: 'prev' | 'next') => {
    const currentIndex = calendarDays.findIndex((d: any) => {
      if (!d.date) return false;
      const dDate = new Date(d.date);
      const dTime = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate()).getTime();
      return dTime === selectedTime;
    });

    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex >= 0 && targetIndex < calendarDays.length) {
      const targetDay = calendarDays[targetIndex];
      const targetDate = new Date(targetDay.date);
      const targetTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
      const el = dayRefs.current.get(targetTime);

      feedback.selection();
      onSelectDate(targetDate);

      if (el) {
        scrollToElement(el, 'smooth');
      }
    }
  };

  // Handle direct click on a day card
  const handleSelect = (dayDate: any, _dayTime: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    const targetEl = e.currentTarget;
    feedback.selection();

    const d = new Date(dayDate);
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    onSelectDate(target);
    scrollToElement(targetEl, 'smooth');
  };

  return (
    <div className="relative group/timeline w-full my-1 sm:my-1.5 font-sans overflow-visible" id="period_timeline_wrapper">
      {/* Left Scroll Arrow Button */}
      {canScrollLeft && (
        <div className="hidden md:flex absolute -left-2.5 top-0 bottom-0 z-20 items-center pointer-events-none">
          <button
            type="button"
            onClick={() => handleStep('prev')}
            className="pointer-events-auto w-6 h-6 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 shadow-sm"
            aria-label="Föregående dag"
            title="Föregående dag"
          >
            <ChevronLeft size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Horizontal Scrollable Day Strip - Clean natural alignment */}
      <div
        ref={scrollContainerRef}
        className="relative flex items-center gap-2 overflow-x-auto py-1 px-1 no-scrollbar select-none"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          touchAction: 'pan-x pan-y',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {calendarDays.map((day: any, index: number) => {
          if (!day.date) return null;
          const dayDate = new Date(day.date);
          const dayTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
          const isSelected = selectedTime === dayTime;
          const isRealToday = dayTime === todayTime;
          const dayNumber = dayDate.getDate();

          // Weekday label (e.g. Mån, Tis or Mon, Tue)
          const dayWeekday = dayDate.toLocaleDateString(locale, { weekday: 'short' });
          const dayWeekdayShort = dayWeekday.slice(0, 3);

          return (
            <motion.button
              key={`${day.date}-${index}`}
              ref={(node) => {
                if (node) {
                  dayRefs.current.set(dayTime, node);
                } else {
                  dayRefs.current.delete(dayTime);
                }
              }}
              data-time={dayTime}
              data-date={day.date}
              data-selected={isSelected}
              type="button"
              onClick={(e) => handleSelect(day.date, dayTime, e)}
              className={`flex flex-col items-center justify-center gap-1 w-[48px] sm:w-[52px] h-[54px] sm:h-[58px] p-1.5 rounded-2xl transition-all duration-200 cursor-pointer select-none shrink-0 relative backdrop-blur-md ${
                isSelected
                  ? 'bg-white text-slate-950 shadow-[0_6px_20px_rgba(255,255,255,0.15)] scale-105 font-bold z-10 opacity-100 ring-2 ring-white/30'
                  : isRealToday
                  ? 'bg-white/[0.06] text-white border border-white/25 hover:bg-white/[0.1] scale-95 opacity-95'
                  : 'bg-white/[0.025] text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06] scale-95 opacity-75'
              }`}
            >
              {/* Day of Week */}
              <span
                className={`text-[8.5px] sm:text-[9px] tracking-wider uppercase leading-none ${
                  isSelected
                    ? 'font-bold opacity-90'
                    : isRealToday
                    ? 'text-white font-bold'
                    : 'opacity-70 font-medium'
                }`}
              >
                {isRealToday ? (isEn ? 'Today' : 'Idag') : dayWeekdayShort}
              </span>

              {/* Day Number */}
              <span className="text-[13px] sm:text-[14px] leading-none font-bold tabular-nums font-amount">
                {dayNumber}
              </span>

              {/* Today Dot Indicator */}
              {isRealToday && (
                <span
                  className="w-1 h-1 rounded-full absolute bottom-1.5 bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]"
                />
              )}
            </motion.button>
          );
        })}

        {/* Lön / Payday Box at the end of the timeline */}
        <div
          className="flex flex-col items-center justify-center gap-1 w-[48px] sm:w-[52px] h-[54px] sm:h-[58px] p-1.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 backdrop-blur-md select-none shrink-0 cursor-default pointer-events-none scale-95 opacity-80 ml-0.5"
        >
          <span className="text-[12px] leading-none">💰</span>
          <span className="text-[8px] sm:text-[8.5px] font-bold tracking-wider uppercase">
            {isEn ? 'Payday' : 'Lön'}
          </span>
        </div>
      </div>

      {/* Right Scroll Arrow Button */}
      {canScrollRight && (
        <div className="hidden md:flex absolute -right-2.5 top-0 bottom-0 z-20 items-center pointer-events-none">
          <button
            type="button"
            onClick={() => handleStep('next')}
            className="pointer-events-auto w-6 h-6 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 shadow-sm"
            aria-label="Nästa dag"
            title="Nästa dag"
          >
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
