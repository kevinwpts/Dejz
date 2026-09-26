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

  // Tracks the day currently aligned with the center of the timeline
  const [activeCenterTime, setActiveCenterTime] = useState<number | null>(null);
  const activeCenterTimeRef = useRef<number | null>(null);

  // Flags to prevent programmatic scroll from fighting user touch/drag gestures
  const isProgrammaticScroll = useRef(false);
  const isInternalSelection = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag-to-scroll state for desktop mouse users
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const dragDistance = useRef(0);

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

  // Function to center any given day card element directly in the viewport center
  const centerElement = useCallback((el: HTMLElement | null, behavior: ScrollBehavior = 'smooth') => {
    if (!el || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;

    const containerWidth = container.clientWidth;
    const elOffsetLeft = el.offsetLeft;
    const elWidth = el.offsetWidth;

    // Center target: align the middle of the element with the middle of the container
    const targetScrollLeft = elOffsetLeft + elWidth / 2 - containerWidth / 2;

    if (Math.abs(container.scrollLeft - targetScrollLeft) > 1.5) {
      isProgrammaticScroll.current = true;
      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior,
      });

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
        checkScrollability();
      }, behavior === 'auto' ? 50 : 380);
    }
  }, [checkScrollability]);

  // Real-time detection: find the day card closest to the horizontal center of the viewport
  const handleScroll = useCallback(() => {
    checkScrollability();

    if (isProgrammaticScroll.current) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    let closestDay: { time: number; dateStr: string; element: HTMLElement } | null = null;
    let minDistance = Infinity;

    dayRefs.current.forEach((btn, time) => {
      if (!btn) return;
      const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
      const distance = Math.abs(btnCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestDay = {
          time,
          dateStr: btn.getAttribute('data-date') || '',
          element: btn,
        };
      }
    });

    if (closestDay && closestDay.time !== activeCenterTimeRef.current) {
      activeCenterTimeRef.current = closestDay.time;
      setActiveCenterTime(closestDay.time);

      // Light haptic tick as we pass through days
      feedback.slider();

      // Flag that this selection was initiated by the user scrolling the timeline
      isInternalSelection.current = true;

      if (selectDebounceRef.current) clearTimeout(selectDebounceRef.current);
      selectDebounceRef.current = setTimeout(() => {
        if (closestDay) {
          onSelectDate(new Date(closestDay.dateStr));
        }
      }, 50);
    }
  }, [checkScrollability, onSelectDate]);

  // Synchronize on mount and whenever selectedTime changes externally (e.g. "Today" button)
  useEffect(() => {
    if (!selectedTime) return;

    // If change was initiated by the user scrolling the timeline, do not trigger programmatic scrollTo!
    if (isInternalSelection.current) {
      isInternalSelection.current = false;
      return;
    }

    activeCenterTimeRef.current = selectedTime;
    setActiveCenterTime(selectedTime);

    const timer = setTimeout(() => {
      const el = dayRefs.current.get(selectedTime) ||
        scrollContainerRef.current?.querySelector<HTMLButtonElement>(`[data-time="${selectedTime}"]`);
      if (el) {
        centerElement(el, isInitialMount.current ? 'auto' : 'smooth');
      }
      isInitialMount.current = false;
      checkScrollability();
    }, 30);

    return () => clearTimeout(timer);
  }, [selectedTime, calendarDays, centerElement, checkScrollability]);

  // Event listeners for scroll, wheel and window resize
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollability();

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
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (selectDebounceRef.current) clearTimeout(selectDebounceRef.current);
    };
  }, [calendarDays, checkScrollability, handleScroll]);

  // Step prev/next day via arrow buttons
  const handleStep = (direction: 'prev' | 'next') => {
    const currentTime = activeCenterTime || selectedTime;
    const currentIndex = calendarDays.findIndex((d: any) => {
      if (!d.date) return false;
      const dDate = new Date(d.date);
      const dTime = new Date(dDate.getFullYear(), dDate.getMonth(), dDate.getDate()).getTime();
      return dTime === currentTime;
    });

    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex >= 0 && targetIndex < calendarDays.length) {
      const targetDay = calendarDays[targetIndex];
      const targetDate = new Date(targetDay.date);
      const targetTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
      const el = dayRefs.current.get(targetTime);

      isInternalSelection.current = false;
      activeCenterTimeRef.current = targetTime;
      setActiveCenterTime(targetTime);
      onSelectDate(targetDate);

      if (el) {
        centerElement(el, 'smooth');
      }
    }
  };

  // Mouse drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    isDragging.current = true;
    dragDistance.current = 0;
    startX.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeftStart.current = scrollContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollContainerRef.current) return;
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.3;
    dragDistance.current = Math.abs(walk);
    if (dragDistance.current > 4) {
      e.preventDefault();
      scrollContainerRef.current.scrollLeft = scrollLeftStart.current - walk;
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  if (!calendarDays || calendarDays.length === 0) {
    return null;
  }

  // Handle direct click on a day card
  const handleSelect = (dayDate: any, dayTime: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (dragDistance.current > 6) {
      dragDistance.current = 0;
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const targetEl = e.currentTarget;
    isInternalSelection.current = false;
    activeCenterTimeRef.current = dayTime;
    setActiveCenterTime(dayTime);
    onSelectDate(new Date(dayDate));
    centerElement(targetEl, 'smooth');
  };

  const effectiveActiveTime = activeCenterTime || selectedTime;

  return (
    <div className="relative group/timeline w-full my-1 sm:my-1.5 font-sans overflow-visible" id="period_timeline_wrapper">
      {/* Top Center Focus Indicator */}
      <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
        <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_var(--accent-color)]" />
      </div>

      {/* Left Scroll Arrow Button */}
      {canScrollLeft && (
        <div className="hidden md:flex absolute left-1 top-0 bottom-0 z-20 items-center pointer-events-none">
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

      {/* Horizontal Scrollable Day Strip with Centering Spacers */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative flex items-center gap-1.5 overflow-x-auto py-2 px-0 no-scrollbar cursor-grab active:cursor-grabbing snap-x snap-mandatory"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          touchAction: 'pan-x pan-y',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Left Centering Spacer: exactly half container width minus half item width, allowing Day 1 to reach center */}
        <div
          className="shrink-0 w-[calc(50%-24px)] sm:w-[calc(50%-26px)] pointer-events-none"
          aria-hidden="true"
        />

        {calendarDays.map((day: any, index: number) => {
          if (!day.date) return null;
          const dayDate = new Date(day.date);
          const dayTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
          const isSelected = effectiveActiveTime === dayTime;
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
              className={`snap-center flex flex-col items-center justify-center gap-0.5 w-[48px] sm:w-[52px] h-[52px] sm:h-[56px] p-1.5 rounded-xl transition-all duration-200 cursor-pointer select-none shrink-0 relative ${
                isSelected
                  ? 'bg-[#181818] text-white dark:bg-white dark:text-[#181818] shadow-[0_4px_14px_rgba(0,0,0,0.18)] dark:shadow-[0_4px_14px_rgba(255,255,255,0.12)] scale-105 font-bold z-10 opacity-100 ring-2 ring-accent/50'
                  : isRealToday
                  ? 'bg-[var(--surface-color)] text-[var(--text-primary)] border border-dashed border-[var(--text-primary)]/50 hover:border-[var(--text-primary)] scale-95 opacity-85'
                  : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)]/70 scale-95 opacity-70'
              }`}
            >
              {/* Day of Week */}
              <span
                className={`text-[8.5px] sm:text-[9px] tracking-wider uppercase leading-none ${
                  isSelected
                    ? 'opacity-90 font-bold'
                    : isRealToday
                    ? 'text-[var(--text-primary)] font-bold'
                    : 'opacity-65 font-medium'
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
                  className="w-1 h-1 rounded-full absolute bottom-1 bg-accent"
                />
              )}
            </motion.button>
          );
        })}

        {/* Lön / Payday Box at the end of the timeline */}
        <div
          className="snap-center flex flex-col items-center justify-center gap-0.5 w-[48px] sm:w-[52px] h-[52px] sm:h-[56px] p-1.5 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 select-none shrink-0 cursor-default pointer-events-none scale-95 opacity-75"
        >
          <span className="text-[12px] leading-none">💸</span>
          <span className="text-[8px] sm:text-[8.5px] font-bold tracking-wider uppercase">
            {isEn ? 'Payday' : 'Lön'}
          </span>
        </div>

        {/* Right Centering Spacer: exactly half container width minus half item width, allowing the last item to reach center */}
        <div
          className="shrink-0 w-[calc(50%-24px)] sm:w-[calc(50%-26px)] pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Right Scroll Arrow Button */}
      {canScrollRight && (
        <div className="hidden md:flex absolute right-1 top-0 bottom-0 z-20 items-center pointer-events-none">
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
