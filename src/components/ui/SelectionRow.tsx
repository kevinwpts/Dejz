import React from 'react';
import { Check } from 'lucide-react';
import { feedback } from '../../utils/feedback';

export interface SelectionRowProps<T = string> {
  id: T;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  isSelected?: boolean;
  onClick: () => void;
  className?: string;
}

export function SelectionRow<T = string>({
  label,
  subtitle,
  icon,
  badge,
  isSelected,
  onClick,
  className = '',
}: SelectionRowProps<T>) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof feedback?.selection === 'function') feedback.selection();
        else if (typeof feedback?.tap === 'function') feedback.tap();
        onClick();
      }}
      className={`w-full flex items-center justify-between py-2.5 px-3.5 sm:py-3 sm:px-4 rounded-[14px] transition-all cursor-pointer text-left active:scale-[0.99] ${
        isSelected
          ? 'bg-black/5 dark:bg-white/[0.08] text-[var(--text-primary)] font-semibold'
          : 'bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
      } ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div
            className={`w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 transition-colors ${
              isSelected
                ? 'bg-[var(--accent-color)] text-[var(--on-accent)]'
                : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]'
            }`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs sm:text-[13.5px] tracking-tight truncate ${isSelected ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
              {label}
            </span>
            {badge && (
              <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-primary)] shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5 font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {isSelected && (
        <div className="w-5 h-5 rounded-full bg-[var(--accent-color)] text-[var(--on-accent)] flex items-center justify-center shrink-0 ml-2 shadow-2xs">
          <Check size={12} strokeWidth={2.5} />
        </div>
      )}
    </button>
  );
}
