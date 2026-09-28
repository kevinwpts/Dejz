import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { feedback } from '../utils/feedback';

interface PeriodTimelineProps {
  calendarDays: any[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  language?: string;
  stats?: any;
  isCurrentPeriod?: boolean;
  categoryFilter?: string | null;
}

export function PeriodTimeline({
  calendarDays = [],
  selectedDate,
  onSelectDate,
  language = 'sv',
  categoryFilter = null,
}: PeriodTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const isInitialMount = useRef(true);

  // Mouse drag refs for desktop horizontal scroll support
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

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

      if (typeof feedback.selection === 'function') feedback.selection();
      else if (typeof feedback.tap === 'function') feedback.tap();

      onSelectDate(targetDate);

      if (el) {
        scrollToElement(el, 'smooth');
      }
    }
  };

  // Mouse drag handlers for desktop mouse interaction
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    isMouseDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftRef.current = container.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    container.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isMouseDownRef.current = false;
  };

  // Handle direct click on a day card
  const handleSelect = (dayDate: any, _dayTime: number, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    // If user was dragging on desktop, don't trigger date selection
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }

    const targetEl = e.currentTarget;
    if (typeof feedback.selection === 'function') feedback.selection();
    else if (typeof feedback.tap === 'function') feedback.tap();

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
            className="pointer-events-auto w-6 h-6 rounded-full bg-white/[0.035] hover:bg-white/[0.07] text-[#C7CDDC] border border-white/[0.035] flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 shadow-none"
            aria-label="Föregående dag"
            title="Föregående dag"
          >
            <ChevronLeft size={14} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Horizontal Scrollable Day Strip - with generous vertical padding so shadows are never clipped */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className="relative flex items-center gap-2 overflow-x-auto py-3 sm:py-3.5 px-1.5 no-scrollbar select-none -my-2 active:cursor-grabbing"
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

          // Check if day has transactions matching category filter
          const hasCategoryMatch = categoryFilter && Array.isArray(day.transactions)
            ? day.transactions.some((t: any) => t.category?.trim().toLowerCase() === categoryFilter.trim().toLowerCase())
            : false;

          return (
            <button
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
              className={`flex flex-col items-center justify-center gap-1 w-[48px] sm:w-[52px] h-[54px] sm:h-[58px] p-1.5 rounded-xl transition-all duration-200 cursor-pointer select-none shrink-0 relative ${
                isSelected
                  ? 'bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] border border-transparent shadow-xs scale-105 font-bold z-10 opacity-100'
                  : hasCategoryMatch
                  ? 'bg-black/5 text-[#1C1917] border border-[#1C1917]/20 dark:bg-white/[0.08] dark:text-white dark:border-white/20 hover:bg-black/10 dark:hover:bg-white/[0.1] scale-100 opacity-100'
                  : isRealToday
                  ? 'bg-white text-[#1C1917] border border-[#E6E2D8] dark:bg-white/[0.04] dark:text-[#C7CDDC] dark:border-white/[0.08] hover:bg-black/5 dark:hover:bg-white/[0.07] scale-95 opacity-90'
                  : categoryFilter
                  ? 'bg-white/40 text-[#6E6961]/50 hover:text-[#1C1917] dark:bg-white/[0.015] dark:text-[#9CA6BC]/40 dark:hover:text-[#C7CDDC] hover:bg-white dark:hover:bg-white/[0.04] border border-[#E6E2D8]/40 dark:border-white/[0.02] scale-95 opacity-60'
                  : 'bg-white/60 text-[#6E6961] hover:text-[#1C1917] dark:bg-white/[0.02] dark:text-[#9CA6BC]/70 dark:hover:text-[#C7CDDC] hover:bg-white dark:hover:bg-white/[0.045] border border-[#E6E2D8] dark:border-white/[0.025] scale-95 opacity-85'
              }`}
            >
              {/* Day of Week */}
              <span
                className={`text-[8.5px] sm:text-[9px] tracking-wider uppercase leading-none ${
                  isSelected
                    ? 'text-white dark:text-[#1C1917] font-bold'
                    : hasCategoryMatch
                    ? 'text-[#1C1917] dark:text-white font-bold'
                    : isRealToday
                    ? 'text-[#1C1917] dark:text-[#C7CDDC] font-semibold'
                    : 'text-[#6E6961] dark:text-[#9CA6BC]/70 font-medium'
                }`}
              >
                {isRealToday ? (isEn ? 'Today' : 'Idag') : dayWeekdayShort}
              </span>

              {/* Day Number */}
              <span className="text-[13px] sm:text-[14px] leading-none font-bold tabular-nums font-amount">
                {dayNumber}
              </span>

              {/* Match Indicator Dot when filtering by category */}
              {hasCategoryMatch && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-[#1C1917] dark:bg-white absolute bottom-1 shadow-none" />
              )}
            </button>
          );
        })}

        {/* Lön / Payday Box at the end of the timeline */}
        <div
          className="flex flex-col items-center justify-center gap-1 w-[48px] sm:w-[52px] h-[54px] sm:h-[58px] p-1.5 rounded-xl bg-black/5 dark:bg-white/[0.04] text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-white/[0.08] select-none shrink-0 cursor-default pointer-events-none scale-95 opacity-80 ml-0.5"
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
            className="pointer-events-auto w-6 h-6 rounded-full bg-white/[0.035] hover:bg-white/[0.07] text-[#C7CDDC] border border-white/[0.035] flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 shadow-none"
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
