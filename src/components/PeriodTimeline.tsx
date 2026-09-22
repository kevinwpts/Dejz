import React, { useEffect, useRef, useMemo } from 'react';

interface Period {
  date: Date;
  start: Date;
  end: Date;
  name: string;
  isCurrent: boolean;
  isFuture: boolean;
}

interface PeriodTimelineProps {
  periods?: Period[];
  selectedDate?: Date;
  onSelect?: (date: Date) => void;
  calendarDays?: any[];
  normalizedSelectedDate?: Date;
  setSelectedDate?: (date: Date) => void;
  t?: (key: any) => string;
  periodStart?: Date;
  periodEnd?: Date;
  currentLang?: any;
  setCurrentPeriodDate?: (date: Date) => void;
  showFixedInCalendar?: boolean;
}

export function PeriodTimeline(props: PeriodTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const daysInPeriod = useMemo(() => {
    if (!props.periodStart || !props.periodEnd) return [];
    const days = [];
    const d = new Date(props.periodStart);
    while (d <= props.periodEnd) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [props.periodStart, props.periodEnd]);

  if (props.periods && props.periods.length > 0) {
    const { selectedDate, onSelect } = props;
    
    // Auto-scroll to selected day on mount or when selectedDate changes
    useEffect(() => {
      if (scrollContainerRef.current && selectedDate) {
        const container = scrollContainerRef.current;
        const selector = `[data-date="${selectedDate.toISOString().split('T')[0]}"]`;
        const selectedElement = container.querySelector(selector) as HTMLElement;
        if (selectedElement) {
          const scrollLeft = selectedElement.offsetLeft - container.offsetWidth / 2 + selectedElement.offsetWidth / 2;
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
      }
    }, [selectedDate]);

    return (
      <div className="w-full flex flex-col items-center">
        <div className="w-full">
          <div 
            ref={scrollContainerRef}
            className="w-full overflow-x-auto no-scrollbar -mx-4 px-4 py-1.5"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            <div className="flex items-center gap-2 w-max px-0.5">
              {(daysInPeriod || []).map((day) => {
                const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
                const isToday = day.toDateString() === new Date().toDateString();
                const dayData = props.calendarDays?.find(d => d?.date?.getTime && d.date.toDateString() === day.toDateString());
                
                const hasSpend = dayData?.spend > 0;
                const hasIncome = dayData?.income > 0;

                return (
                    <button
                      key={day.getTime()}
                      data-date={day.toISOString().split('T')[0]}
                      onClick={() => onSelect && onSelect(day)}
                      style={{ scrollSnapAlign: 'center' }}
                      className={`relative flex flex-col items-center justify-center gap-1.5 min-w-[52px] sm:min-w-[56px] h-[64px] sm:h-[68px] py-2 px-1 rounded-2xl border transition-all duration-200 active:scale-95 cursor-pointer text-center ${
                        isSelected
                          ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] border-[var(--accent-color)] shadow-sm shadow-accent/20 z-10 scale-[1.02]'
                          : isToday
                          ? 'bg-[var(--surface-color)] text-[var(--accent-color)] border border-[var(--accent-color)]/50 font-medium shadow-2xs'
                          : 'bg-[var(--surface-color)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-color)]/60 hover:border-[var(--border-color)] shadow-2xs'
                      }`}
                    >
                      {/* Top Weekday Label */}
                      <span className={`text-[10px] sm:text-[11px] font-medium uppercase tracking-wider leading-none text-center ${
                        isSelected 
                          ? 'text-white/90' 
                          : isToday 
                          ? 'text-[var(--accent-color)]' 
                          : 'text-[var(--text-tertiary)]'
                      }`}>
                        {isToday 
                          ? (props.currentLang === 'en' ? 'Today' : 'Idag') 
                          : day.toLocaleString(props.currentLang === 'en' ? 'en-US' : 'sv-SE', { weekday: 'short' }).replace('.', '')}
                      </span>

                      {/* Day Number */}
                      <span className={`text-[16px] sm:text-[17px] font-medium tabular-nums leading-none tracking-normal text-center my-0.5 ${
                        isSelected ? 'text-white' : 'text-[var(--text-primary)]'
                      }`}>
                        {day.getDate()}
                      </span>
                      
                      {/* Activity Indicators */}
                      <div className="flex items-center justify-center gap-1 h-1.5 min-h-[6px] w-full pointer-events-none">
                        {hasIncome && (
                          <span className={`w-1 h-1 rounded-full shrink-0 ${isSelected ? 'bg-emerald-300' : 'bg-emerald-500'}`} />
                        )}
                        {hasSpend && (
                          <span className={`w-1 h-1 rounded-full shrink-0 ${
                            isSelected 
                              ? 'bg-white/80' 
                              : 'bg-[var(--accent-color)]/60'
                          }`} />
                        )}
                        {!hasIncome && !hasSpend && (
                          <span className="w-1 h-1 rounded-full bg-transparent" />
                        )}
                      </div>
                    </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}

