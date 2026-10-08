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
      className={`w-full flex items-center justify-between py-2.5 px-3.5 sm:py-3 sm:px-4 rounded-[14px] transition-colors cursor-pointer text-left active:scale-[0.99] min-h-[48px] bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div
            className="w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-primary)]"
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs sm:text-[13.5px] tracking-tight truncate ${isSelected ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)] font-medium'}`}>
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
        <div className="text-[var(--text-primary)] shrink-0 ml-2 pl-1">
          <Check size={18} strokeWidth={2.5} />
        </div>
      )}
    </button>
  );
}
