import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';

interface UniversalPeriodSelectorProps {
  periods: any[];
  currentDate: Date;
  onChange: (date: Date) => void;
  periodName?: string;
  isCurrentPeriod?: boolean;
  onOpenPicker?: () => void;
  variant?: 'standalone' | 'header' | 'modal';
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
      <div className="inline-flex items-center gap-0.5 sm:gap-1 bg-white/[0.035] border border-white/[0.035] backdrop-blur-[16px] rounded-full px-1 sm:px-1.5 py-0.5 max-w-[210px] sm:max-w-none transition-all select-none">
        <button 
          type="button"
          onClick={handlePrevPeriod}
          disabled={!canGoPrev}
          className={`p-1 sm:p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${
            canGoPrev 
              ? 'text-[#9CA6BC] hover:text-white hover:bg-white/[0.06]' 
              : 'text-[#9CA6BC] opacity-25 cursor-not-allowed'
          }`}
          aria-label="Föregående period"
        >
          <ChevronLeft size={15} strokeWidth={2} />
        </button>
            
        {onOpenPicker ? (
          <button 
            type="button"
            onClick={handleCenterClick}
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 rounded-full hover:bg-white/[0.05] transition-all cursor-pointer group min-w-0"
            title={periodName || month}
          >
            <div className="flex items-baseline gap-1 min-w-0">
              <span className="text-xs font-semibold tracking-tight truncate text-white">
                {month}
              </span>
              {dates && (
                <span className="text-[10.5px] font-normal text-[#9CA6BC] truncate hidden sm:inline">
                  ({dates})
                </span>
              )}
            </div>
            <ChevronDown size={12} className="text-[#9CA6BC] group-hover:text-white transition-colors shrink-0" />
          </button>
        ) : (
          <div className="flex items-baseline gap-1 px-1.5 sm:px-2.5 py-1 min-w-0">
            <span className="text-xs font-semibold tracking-tight truncate text-white">
              {month}
            </span>
            {dates && (
              <span className="text-[10.5px] font-normal text-[#9CA6BC] truncate hidden sm:inline">
                ({dates})
              </span>
            )}
          </div>
        )}

        <button 
          type="button"
          onClick={handleNextPeriod}
          disabled={!canGoNext}
          className={`p-1 sm:p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${
            canGoNext 
              ? 'text-[#9CA6BC] hover:text-white hover:bg-white/[0.06]' 
              : 'text-[#9CA6BC] opacity-25 cursor-not-allowed'
          }`}
          aria-label="Nästa period"
        >
          <ChevronRight size={15} strokeWidth={2} />
        </button>
      </div>
    );
  }

  const containerClasses = variant === 'modal' 
    ? 'mb-2 transition-all'
    : 'sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 mb-4 transition-all';

  return (
    <div className={containerClasses}>
      <div className="bg-white/[0.035] border border-white/[0.035] backdrop-blur-[18px] rounded-full px-2 sm:px-3 py-1 flex items-center justify-between transition-all">
        <button 
          type="button"
          onClick={handlePrevPeriod}
          disabled={!canGoPrev}
          className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer ${
            canGoPrev 
              ? 'text-[#9CA6BC] hover:text-white hover:bg-white/[0.06]' 
              : 'text-[#9CA6BC] opacity-25 cursor-not-allowed'
          }`}
          aria-label="Föregående period"
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
            
        {onOpenPicker ? (
          <button 
            type="button"
            onClick={handleCenterClick}
            className="flex flex-col items-center group/label px-3 py-1 rounded-full hover:bg-white/[0.05] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-white group-hover/label:text-[#8B9CFF] transition-colors">
                {month}
              </span>
              <CalendarIcon size={13} className="text-[#9CA6BC] group-hover/label:text-[#8B9CFF] transition-colors" />
              <ChevronDown size={13} className="text-[#9CA6BC] group-hover/label:text-white transition-opacity" />
            </div>
            {dates && (
              <span className="text-[11px] font-normal text-[#9CA6BC] mt-0.5">
                {dates}
              </span>
            )}
          </button>
        ) : (
          <div className="flex flex-col items-center px-3 py-0.5 select-none">
            <span className="text-sm font-semibold tracking-tight text-white">
              {month}
            </span>
            {dates && (
              <span className="text-[11px] font-normal text-[#9CA6BC] mt-0.5">
                {dates}
              </span>
            )}
          </div>
        )}

        <button 
          type="button"
          onClick={handleNextPeriod}
          disabled={!canGoNext}
          className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer ${
            canGoNext 
              ? 'text-[#9CA6BC] hover:text-white hover:bg-white/[0.06]' 
              : 'text-[#9CA6BC] opacity-25 cursor-not-allowed'
          }`}
          aria-label="Nästa period"
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
