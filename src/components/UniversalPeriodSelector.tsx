import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon, X } from 'lucide-react';

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

  const selectedPeriodItem = periods && currentIndex !== -1 ? periods[currentIndex] : null;
  const actuallyIsCurrent = isCurrentPeriod !== undefined 
    ? isCurrentPeriod 
    : (selectedPeriodItem ? (selectedPeriodItem.isCurrent || false) : true);

  const canGoPrev = currentIndex > 0;
  const canGoNext = allowFuture
    ? (currentIndex !== -1 && currentIndex < periods.length - 1)
    : (!actuallyIsCurrent && currentIndex !== -1 && currentIndex < periods.length - 1);

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
      <div className="inline-flex items-center gap-0.5 sm:gap-1 rounded-full px-1 sm:px-1.5 h-8 sm:h-9 transition-all select-none border-none backdrop-blur-[16px] bg-white dark:bg-[#1C1C1C] text-[#1C1917] dark:text-white shadow-none">
        <button 
          type="button"
          onClick={handlePrevPeriod}
          disabled={!canGoPrev}
          className={`p-1 sm:p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${
            canGoPrev 
              ? 'text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white hover:bg-[var(--surface-muted)] dark:hover:bg-white/10' 
              : 'text-[#8C867C]/40 dark:text-[#71717A]/40 cursor-not-allowed'
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
          <span className="text-xs sm:text-[13px] font-bold tracking-tight truncate text-[#1C1917] dark:text-white">
            {month}
          </span>
          {!actuallyIsCurrent && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(new Date());
              }}
              className="p-0.5 hover:bg-black/10 dark:hover:bg-white/20 rounded-full transition-colors ml-0.5 cursor-pointer text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white"
              title="Återgå till aktuell period"
              aria-label="Återgå till aktuell period"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          )}
        </div>

        <button 
          type="button"
          onClick={handleNextPeriod}
          disabled={!canGoNext}
          className={`p-1 sm:p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${
            canGoNext 
              ? 'text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white hover:bg-[var(--surface-muted)] dark:hover:bg-white/10' 
              : 'text-[#8C867C]/40 dark:text-[#71717A]/40 cursor-not-allowed'
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
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1C1C1C] hover:bg-[var(--bg-hover)] dark:hover:bg-white/[0.08] border-none transition-all cursor-pointer group select-none active:scale-95 shadow-none"
      >
        <CalendarIcon size={13} className="text-[#6E6961] dark:text-[#A8A8A8] group-hover:text-[#1C1917] dark:group-hover:text-white transition-colors" />
        <span className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-[#1C1917] dark:text-white">
          {month}
        </span>
        <ChevronDown size={12} className="text-[#6E6961] dark:text-[#A8A8A8] group-hover:text-[#1C1917] dark:group-hover:text-white transition-colors shrink-0" />
      </button>
    );
  }

  const containerClasses = variant === 'modal' 
    ? 'mb-2 transition-all'
    : 'sticky top-[calc(3.75rem+env(safe-area-inset-top,0px))] z-30 mb-5 transition-all';

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between px-1 py-1 transition-all">
        <button 
          type="button"
          onClick={handlePrevPeriod}
          disabled={!canGoPrev}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
            canGoPrev 
              ? 'text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white hover:bg-[var(--surface-muted)] dark:hover:bg-[#222222]' 
              : 'text-[#8C867C]/40 dark:text-[#71717A]/40 cursor-not-allowed'
          }`}
          aria-label="Föregående period"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
            
        {onOpenPicker ? (
          <button 
            type="button"
            onClick={handleCenterClick}
            className="flex flex-col items-center group/label px-4 py-1.5 rounded-[14px] hover:bg-[var(--surface-muted)] dark:hover:bg-[#222222] transition-all cursor-pointer active:scale-95"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl font-bold uppercase tracking-wider text-[#1C1917] dark:text-white group-hover/label:text-[#1C1917] dark:group-hover/label:text-white transition-colors">
                {month}
              </span>
              <CalendarIcon size={14} className="text-[#6E6961] dark:text-[#A8A8A8] group-hover/label:text-[#1C1917] dark:group-hover/label:text-white transition-colors" />
              <ChevronDown size={13} className="text-[#6E6961] dark:text-[#A8A8A8] group-hover/label:text-[#1C1917] dark:group-hover/label:text-white transition-opacity" />
            </div>
            {dates && (
              <span className="text-xs font-medium text-[#6E6961] dark:text-[#A8A8A8] mt-0.5">
                {dates}
              </span>
            )}
          </button>
        ) : (
          <div className="flex flex-col items-center px-4 py-1 select-none">
            <span className="text-base sm:text-lg font-bold tracking-tight text-[#1C1917] dark:text-white">
              {month}
            </span>
            {dates && (
              <span className="text-xs font-medium text-[#6E6961] dark:text-[#A8A8A8] mt-0.5">
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
              ? 'text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white hover:bg-[var(--surface-muted)] dark:hover:bg-[#222222]' 
              : 'text-[#8C867C]/40 dark:text-[#71717A]/40 cursor-not-allowed'
          }`}
          aria-label="Nästa period"
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
