import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  // Drag-to-scroll state for desktop
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const dragDistance = useRef(0);

  // Programmatic scroll flag to prevent feedback loops
  const isProgrammaticScroll = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 6);
  }, []);

  // Function to center any given element within the container
  const centerElement = (el: HTMLElement | null, behavior: ScrollBehavior = 'smooth') => {
    if (!el || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    
    // Deterministic offset relative to container
    let elementOffsetLeft = el.offsetLeft;
    if (el.offsetParent !== container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      elementOffsetLeft = elRect.left - containerRect.left + container.scrollLeft;
    }

    const targetScrollLeft = elementOffsetLeft - (container.clientWidth - el.offsetWidth) / 2;

    if (Math.abs(container.scrollLeft - targetScrollLeft) > 1.5) {
      isProgrammaticScroll.current = true;
      container.scrollTo({
        left: targetScrollLeft,
        behavior,
      });

      // Clear programmatic scroll lock after smooth scroll completes
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 400); // 400ms is standard smooth scroll transition duration
    }
  };

  // Detect which day card is closest to the middle of the viewport and auto-select it
  const handleScrollDetect = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Maintain programmatic scroll lock timeout to clear once scrolling settles
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 150);

    if (isProgrammaticScroll.current) return;

    const containerCenter = container.scrollLeft + container.clientWidth / 2;
    let closestDay = null;
    let minDistance = Infinity;

    const dayButtons = container.querySelectorAll<HTMLButtonElement>('[data-time]');
    dayButtons.forEach((btn) => {
      const elementCenter = btn.offsetLeft + btn.offsetWidth / 2;
      const distance = Math.abs(elementCenter - containerCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestDay = btn;
      }
    });

    if (closestDay) {
      const dayTime = parseInt(closestDay.getAttribute('data-time') || '0', 10);
      const dayDateStr = closestDay.getAttribute('data-date');
      if (dayTime && dayTime !== selectedTime && dayDateStr) {
        onSelectDate(new Date(dayDateStr));
      }
    }
  }, [selectedTime, onSelectDate]);

  // Auto-scroll on mount and when selectedTime changes
  useEffect(() => {
    if (!selectedTime) return;
    const timer = setTimeout(() => {
      const el = dayRefs.current.get(selectedTime) || 
        scrollContainerRef.current?.querySelector<HTMLButtonElement>(`[data-time="${selectedTime}"]`);
      if (el) {
        centerElement(
          el,
          isInitialMount.current ? 'auto' : 'smooth'
        );
      }
      isInitialMount.current = false;
      checkScrollability();
    }, 40);

    return () => clearTimeout(timer);
  }, [selectedTime, calendarDays, checkScrollability]);

  // Track scroll position, wheel event and setup resize listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollability();

    const handleScroll = () => {
      checkScrollability();
      handleScrollDetect();
    };

    // Horizontal wheel scroll handler for desktop mouse users with shift key or horizontal tilt
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Native horizontal wheel/trackpad motion, allow natural container scroll
        return;
      }
      if (e.shiftKey) {
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
    };
  }, [calendarDays, checkScrollability, handleScrollDetect]);

  const handleScrollBy = (amount: number) => {
    if (!scrollContainerRef.current) return;
    isProgrammaticScroll.current = true;
    scrollContainerRef.current.scrollBy({
      left: amount,
      behavior: 'smooth',
    });

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
      handleScrollDetect();
    }, 400);
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
    const walk = (x - startX.current) * 1.2;
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

  const handleSelect = (dayDate: any, dayTime: number, e: React.MouseEvent<HTMLButtonElement>) => {
    // If user dragged with mouse on desktop, don't trigger selection
    if (dragDistance.current > 6) {
      dragDistance.current = 0;
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const targetEl = e.currentTarget;
    isProgrammaticScroll.current = true;
    onSelectDate(new Date(dayDate));
    centerElement(targetEl, 'smooth');
  };

  return (
    <div className="relative group/timeline w-full my-3 font-sans overflow-visible">
      {/* Left Scroll Arrow Button */}
      {canScrollLeft && (
        <div className="hidden md:flex absolute left-1 top-0 bottom-0 z-20 items-center pointer-events-none">
          <button
            type="button"
            onClick={() => handleScrollBy(-220)}
            className="pointer-events-auto w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 shadow-sm"
            aria-label="Skrolla bakåt i tidslinjen"
            title="Föregående dagar"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Horizontal Scrollable Day Strip */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative flex items-center gap-2.5 overflow-x-auto py-7 px-3 sm:px-4 no-scrollbar cursor-grab active:cursor-grabbing snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', touchAction: 'pan-x pan-y' }}
      >
        {/* Left Centering Spacer */}
        <div className="shrink-0 w-0 sm:w-0" />

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
              className={`snap-center flex flex-col items-center justify-center gap-1 w-[66px] sm:w-[74px] h-[72px] sm:h-[80px] p-2 rounded-xl transition-all duration-300 cursor-pointer select-none shrink-0 relative ${
                isSelected
                  ? 'bg-[#181818] text-white dark:bg-white dark:text-[#181818] shadow-[0_6px_14px_rgba(0,0,0,0.12)] dark:shadow-[0_6px_14px_rgba(255,255,255,0.1)] scale-108 font-bold z-10 opacity-100 border border-white/20 dark:border-black/20'
                  : isRealToday
                  ? 'bg-[var(--surface-color)] text-[var(--text-primary)] border border-dashed border-[var(--text-primary)]/50 hover:border-[var(--text-primary)] scale-95 opacity-80'
                  : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)] scale-95 opacity-80'
              }`}
            >
              {/* Day of Week */}
              <span className={`text-[9px] sm:text-[10px] tracking-wider uppercase leading-none ${
                isSelected 
                  ? 'opacity-90 font-semibold' 
                  : isRealToday 
                  ? 'text-[var(--text-primary)] font-semibold' 
                  : 'opacity-65 font-medium'
              }`}>
                {isRealToday ? (isEn ? 'Today' : 'Idag') : dayWeekdayShort}
              </span>

              {/* Day Number */}
              <span className={`text-[15px] sm:text-[17px] leading-none font-bold tabular-nums`}>
                {dayNumber}
              </span>

              {/* Miniature Today Dot Indicator */}
              {isRealToday && (
                <span className={`w-1 h-1 rounded-full absolute bottom-1.5 ${
                  isSelected ? 'bg-[var(--text-primary)]' : 'bg-[var(--accent-color)]'
                }`} />
              )}
            </motion.button>
          );
        })}

        {/* Lön / Payday Box in green at the end of timeline */}
        <div 
          className="snap-center flex flex-col items-center justify-center gap-1 w-[66px] sm:w-[74px] h-[72px] sm:h-[80px] p-2 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 select-none shrink-0 cursor-default pointer-events-none scale-92 opacity-65"
        >
          <span className="text-[14px] leading-none">💸</span>
          <span className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase">
            {isEn ? 'Payday' : 'Lön'}
          </span>
        </div>

        {/* Right Centering Spacer removed so end of month stays right-aligned */}
        <div className="shrink-0 w-3 sm:w-4" />
      </div>

      {/* Right Scroll Arrow Button */}
      {canScrollRight && (
        <div className="hidden md:flex absolute right-1 top-0 bottom-0 z-20 items-center pointer-events-none">
          <button
            type="button"
            onClick={() => handleScrollBy(220)}
            className="pointer-events-auto w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90 shadow-sm"
            aria-label="Skrolla framåt i tidslinjen"
            title="Kommande dagar"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
