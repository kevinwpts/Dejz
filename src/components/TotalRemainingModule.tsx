import React from 'react';
import { PiggyBank } from 'lucide-react';
import { motion } from 'motion/react';
import { formatAmount } from '../utils/format';

interface TotalRemainingModuleProps {
  remaining: number;
  total: number;
  currency: string;
  language: string;
  onClick: () => void;
}

export function TotalRemainingModule({ remaining, total, currency, language, onClick }: TotalRemainingModuleProps) {
  const spent = Math.max(0, total - remaining);
  const percentage = total > 0 ? Math.min(100, Math.max(0, (spent / total) * 100)) : 0;

  // Determine color based on usage
  const getGradient = () => {
    if (percentage > 85) return 'from-danger to-danger';
    return 'from-[var(--text-primary)] to-[var(--text-secondary)]';
  };

  return (
    <button 
      onClick={onClick}
      className="flex-1 flex flex-col p-5 sm:p-6 bg-[var(--surface-color)] rounded-[18px] hover:scale-[1.005] active:scale-[0.99] transition-all overflow-hidden relative shadow-xs"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-[var(--surface-muted)] flex items-center justify-center shrink-0 text-[var(--accent-color)]">
          <PiggyBank size={14} strokeWidth={1.75} />
        </div>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          Totalt kvar
        </span>
      </div>
      
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-[var(--text-primary)] font-amount tabular-nums tracking-tight">
          {formatAmount(remaining, language)}
        </span>
        <span className="text-xs font-medium text-[var(--text-secondary)] opacity-50">
          {currency}
        </span>
      </div>

      <div className="w-full h-1.5 bg-[var(--surface-muted)] rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full bg-gradient-to-r ${getGradient()} rounded-full`}
        />
      </div>
    </button>
  );
}
