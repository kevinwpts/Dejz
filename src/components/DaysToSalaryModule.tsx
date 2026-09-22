import React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

interface DaysToSalaryModuleProps {
  days: number;
  onClick: () => void;
}

export function DaysToSalaryModule({ days, onClick }: DaysToSalaryModuleProps) {
  return (
    <button 
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center p-5 sm:p-6 bg-[var(--surface-color)] rounded-[22px] hover:scale-[1.005] active:scale-[0.99] transition-all shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center shrink-0 text-[var(--accent-color)]">
          <CalendarIcon size={14} strokeWidth={1.75} />
        </div>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          Nästa lön
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight tabular-nums font-amount">
          {days}
        </span>
        <span className="text-[10px] font-semibold text-[var(--text-secondary)] opacity-40">
          dagar
        </span>
      </div>
    </button>
  );
}
