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
      <div className="inline-flex items-center gap-0.5 sm:gap-1 bg-[var(--surface-color)] border border-[var(--border-color)]/80 rounded-full shadow-2xs px-1 sm:px-1.5 py-0.5 max-w-[210px] sm:max-w-none transition-all select-none">
        <button 
          type="button"
          onClick={handlePrevPeriod}
          disabled={!canGoPrev}
          className={`p-1 sm:p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${
            canGoPrev 
              ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]' 
              : 'text-[var(--text-secondary)] opacity-30 cursor-not-allowed'
          }`}
          aria-label="Föregående period"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
            
        <button 
          type="button"
          onClick={handleCenterClick}
          className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 rounded-full hover:bg-[var(--surface-muted)]/70 transition-all cursor-pointer group min-w-0"
          title={periodName || month}
        >
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent-color)] transition-colors truncate">
              {month}
            </span>
            {dates && (
              <span className="hidden md:inline text-[11px] font-medium text-[var(--text-secondary)] opacity-60 shrink-0">
                ({dates})
              </span>
            )}
          </div>
          <ChevronDown size={13} strokeWidth={2.5} className="text-[var(--text-secondary)] opacity-60 group-hover:opacity-100 group-hover:text-[var(--accent-color)] transition-all shrink-0" />
        </button>

        <button 
          type="button"
          onClick={handleNextPeriod}
          disabled={!canGoNext}
          className={`p-1 sm:p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${
            canGoNext 
              ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]' 
              : 'text-[var(--text-secondary)] opacity-30 cursor-not-allowed'
          }`}
          aria-label="Nästa period"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  const containerClasses = variant === 'modal' 
    ? 'mb-2 transition-all'
    : 'sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 mb-4 transition-all';

  return (
    <div className={containerClasses}>
      <div className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-full shadow-xs px-2 sm:px-3 py-1 flex items-center justify-between transition-all">
        <button 
          type="button"
          onClick={handlePrevPeriod}
          disabled={!canGoPrev}
          className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer ${
            canGoPrev 
              ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]' 
              : 'text-[var(--text-secondary)] opacity-30 cursor-not-allowed'
          }`}
          aria-label="Föregående period"
        >
          <ChevronLeft size={18} strokeWidth={2.2} />
        </button>
            
        <button 
          type="button"
          onClick={handleCenterClick}
          className="flex flex-col items-center group/label px-3 py-1 rounded-full hover:bg-[var(--surface-muted)]/60 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight transition-colors duration-300 text-[var(--text-primary)] group-hover/label:text-[var(--accent-color)]">
              {month}
            </span>
            <CalendarIcon size={13} className="text-[var(--text-secondary)] opacity-70 group-hover/label:text-[var(--accent-color)] transition-colors" />
            <ChevronDown size={14} className="text-[var(--text-secondary)] opacity-50 group-hover/label:opacity-100 transition-opacity" />
          </div>
          {dates && (
            <span className="text-[11px] font-medium transition-opacity duration-300 text-[var(--text-secondary)] opacity-60">
              {dates}
            </span>
          )}
        </button>

        <button 
          type="button"
          onClick={handleNextPeriod}
          disabled={!canGoNext}
          className={`p-2 rounded-full transition-all active:scale-95 cursor-pointer ${
            canGoNext 
              ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]' 
              : 'text-[var(--text-secondary)] opacity-30 cursor-not-allowed'
          }`}
          aria-label="Nästa period"
        >
          <ChevronRight size={18} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
