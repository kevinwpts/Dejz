import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';

interface UniversalPeriodSelectorProps {
  periods: any[];
  currentDate: Date;
  onChange: (date: Date) => void;
  periodName?: string;
  isCurrentPeriod?: boolean;
  onOpenPicker?: () => void;
  variant?: 'standalone' | 'header' | 'modal' | 'dropdown';
  allowFuture?: boolean;
}

export function UniversalPeriodSelector({
  periods,
  currentDate,
  onChange,
  periodName = '',
  isCurrentPeriod,
  onOpenPicker,
  variant = 'standalone',
  allowFuture = true,
}: UniversalPeriodSelectorProps) {
  const currentIndex = periods && currentDate
    ? periods.findIndex(
        p => p.start && p.end && p.start.getTime() <= currentDate.getTime() && p.end.getTime() >= currentDate.getTime()
      )
    : -1;

  const canGoPrev = currentIndex > 0;
  const canGoNext = allowFuture
    ? (currentIndex !== -1 && currentIndex < periods.length - 1)
    : (!isCurrentPeriod && currentIndex !== -1 && currentIndex < periods.length - 1);

  const handlePrevPeriod = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!periods || periods.length === 0) return;
    let idx = currentIndex;
    if (idx === -1) {
      idx = periods.findIndex(p => p.date && p.date.getTime() >= currentDate.getTime());
    }
    if (idx > 0) {
      onChange(periods[idx - 1].date);
    }
  };

  const handleNextPeriod = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canGoNext || !periods || periods.length === 0) return;
    let idx = currentIndex;
    if (idx === -1) {
      idx = periods.findIndex(p => p.date && p.date.getTime() >= currentDate.getTime());
    }
    if (idx !== -1 && idx < periods.length - 1) {
      onChange(periods[idx + 1].date);
    }
  };

  const [month, dates] = periodName.includes('(') 
    ? periodName.split('(').map(s => s.replace(')', '').trim())
    : [periodName, ''];

  const handleCenterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenPicker) {
      onOpenPicker();
    } else if (!isCurrentPeriod) {
      onChange(new Date());
    }
  };

  if (variant === 'header') {
    return (
      <div className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full px-1 sm:px-1.5 h-8 sm:h-9 transition-all select-none border backdrop-blur-[16px] bg-[#FFFFFF] dark:bg-white/[0.06] border-[#E6E2D8] dark:border-white/10 text-[#1C1917] dark:text-white shadow-none">
        <button 
          type="button"
          onClick={handlePrevPeriod}
          disabled={!canGoPrev}
          className={`p-1 sm:p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${
            canGoPrev 
              ? 'text-[#6E6961] dark:text-[#9CA6BC] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06]' 
              : 'text-[#6E6961]/70 dark:text-[#9CA6BC]/70 cursor-not-allowed'
          }`}
          aria-label="Föregående period"
          title="Föregående period"
        >
          <ChevronLeft size={15} strokeWidth={2} />
        </button>
            
        <div 
          className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full min-w-0 select-none"
          title={periodName || month}
        >
          <CalendarIcon 
            size={13} 
            strokeWidth={1.8} 
            className="text-[#1C1917] dark:text-white shrink-0" 
          />
          <span className="text-xs sm:text-[13px] font-semibold tracking-tight truncate text-[#1C1917] dark:text-white">
            {month}
          </span>
        </div>

        <button 
          type="button"
          onClick={handleNextPeriod}
          disabled={!canGoNext}
          className={`p-1 sm:p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${
            canGoNext 
              ? 'text-[#6E6961] dark:text-[#9CA6BC] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06]' 
              : 'text-[#6E6961]/70 dark:text-[#9CA6BC]/70 cursor-not-allowed'
          }`}
          aria-label="Nästa period"
          title="Nästa period"
        >
          <ChevronRight size={15} strokeWidth={2} />
        </button>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <button 
        type="button"
        onClick={handleCenterClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-white/[0.035] hover:bg-[#EDE9DF] dark:hover:bg-white/[0.06] border border-[#E6E2D8] dark:border-white/[0.03] transition-all cursor-pointer group select-none"
      >
        <CalendarIcon size={13} className="text-[#6E6961] dark:text-[#9CA6BC] group-hover:text-[#1C1917] dark:group-hover:text-white transition-colors" />
        <span className="text-xs sm:text-[13px] font-bold font-display uppercase tracking-wider text-[#1C1917] dark:text-white">
          {month}
        </span>
        <ChevronDown size={12} className="text-[#6E6961] dark:text-[#9CA6BC] group-hover:text-[#1C1917] dark:group-hover:text-white transition-colors shrink-0" />
      </button>
    );
  }

  const containerClasses = variant === 'modal' 
    ? 'mb-2 transition-all'
    : 'sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 mb-5 transition-all';

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between px-1 py-1 transition-all">
        <button 
          type="button"
          onClick={handlePrevPeriod}
          disabled={!canGoPrev}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
            canGoPrev 
              ? 'text-[#6E6961] dark:text-[#9CA6BC] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.05]' 
              : 'text-[#6E6961]/40 dark:text-[#9CA6BC]/40 cursor-not-allowed'
          }`}
          aria-label="Föregående period"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
            
        {onOpenPicker ? (
          <button 
            type="button"
            onClick={handleCenterClick}
            className="flex flex-col items-center group/label px-4 py-1 rounded-2xl hover:bg-black/5 dark:hover:bg-white/[0.04] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-bold font-display uppercase tracking-wider text-[#1C1917] dark:text-white group-hover/label:text-[#1C1917] dark:group-hover/label:text-white transition-colors">
                {month}
              </span>
              <CalendarIcon size={14} className="text-[#6E6961] dark:text-[#9CA6BC] group-hover/label:text-[#1C1917] dark:group-hover/label:text-white transition-colors" />
              <ChevronDown size={13} className="text-[#6E6961] dark:text-[#9CA6BC] group-hover/label:text-[#1C1917] dark:group-hover/label:text-white transition-opacity" />
            </div>
            {dates && (
              <span className="text-xs font-normal text-[#6E6961] dark:text-[#9CA6BC] mt-0.5">
                {dates}
              </span>
            )}
          </button>
        ) : (
          <div className="flex flex-col items-center px-4 py-1 select-none">
            <span className="text-base sm:text-lg font-semibold tracking-tight text-[#1C1917] dark:text-white">
              {month}
            </span>
            {dates && (
              <span className="text-xs font-normal text-[#6E6961] dark:text-[#9CA6BC] mt-0.5">
                {dates}
              </span>
            )}
          </div>
        )}

        <button 
          type="button"
          onClick={handleNextPeriod}
          disabled={!canGoNext}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
            canGoNext 
              ? 'text-[#6E6961] dark:text-[#9CA6BC] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.05]' 
              : 'text-[#6E6961]/40 dark:text-[#9CA6BC]/40 cursor-not-allowed'
          }`}
          aria-label="Nästa period"
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
