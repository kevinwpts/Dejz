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

    if (Math.abs(container.scrollLeft - targetScrollLeft) > 1) {
      container.scrollTo({
        left: targetScrollLeft,
        behavior,
      });
    }
  };

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

  // Track scroll position for showing/hiding arrow buttons
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollability();

    const handleScroll = () => {
      checkScrollability();
    };

    // Horizontal wheel scroll handler for desktop mouse users
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
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

  const handleScrollBy = (amount: number) => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({
      left: amount,
      behavior: 'smooth',
    });
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
    onSelectDate(new Date(dayDate));
    centerElement(targetEl, 'smooth');
  };

  return (
    <div className="relative group/timeline w-full my-1 font-sans">
      {/* Left Scroll Arrow Button */}
      {canScrollLeft && (
        <div className="hidden md:flex absolute left-0 top-0 bottom-0 z-20 items-center pl-0.5 pr-5 bg-gradient-to-r from-[var(--bg-color)] via-[var(--bg-color)]/90 to-transparent pointer-events-none">
          <button
            type="button"
            onClick={() => handleScrollBy(-220)}
            className="pointer-events-auto w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--surface-color)]/95 hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-sm flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90"
            aria-label="Skrolla bakåt i tidslinjen"
            title="Föregående dagar"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
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
        className="relative flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-3 no-scrollbar touch-pan-x overscroll-contain cursor-grab active:cursor-grabbing"
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
              data-selected={isSelected}
              type="button"
              onClick={(e) => handleSelect(day.date, dayTime, e)}
              whileTap={{ scale: 0.94 }}
              className={`flex flex-col items-center justify-center gap-1 min-w-[50px] sm:min-w-[54px] h-[58px] sm:h-[62px] py-1.5 px-1 rounded-[14px] transition-all duration-200 cursor-pointer select-none shrink-0 relative ${
                isSelected
                  ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs font-bold'
                  : isRealToday
                  ? 'bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--text-primary)]/40'
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
                isSelected ? 'text-[var(--text-on-accent)] font-semibold' : 'text-[var(--text-primary)]'
              }`}>
                {dayNumber}
              </span>
            </motion.button>
          );
        })}

        {/* Lön / Payday Box in green at the end of timeline */}
        <div 
          className="flex flex-col items-center justify-center gap-1 min-w-[50px] sm:min-w-[54px] h-[58px] sm:h-[62px] py-1.5 px-1 rounded-[14px] bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 select-none shrink-0 cursor-default pointer-events-none"
        >
          <span className="text-[12px] leading-none">💸</span>
          <span className="text-[10px] sm:text-[10.5px] font-bold tracking-tight uppercase">
            {isEn ? 'Payday' : 'Lön'}
          </span>
        </div>
      </div>

      {/* Right Scroll Arrow Button */}
      {canScrollRight && (
        <div className="hidden md:flex absolute right-0 top-0 bottom-0 z-20 items-center pr-0.5 pl-5 bg-gradient-to-l from-[var(--bg-color)] via-[var(--bg-color)]/90 to-transparent pointer-events-none">
          <button
            type="button"
            onClick={() => handleScrollBy(220)}
            className="pointer-events-auto w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--surface-color)]/95 hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-sm flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-90"
            aria-label="Skrolla framåt i tidslinjen"
            title="Kommande dagar"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}
