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
      className={`w-full flex items-center justify-between py-2.5 px-3.5 sm:py-3 sm:px-4 rounded-xl transition-all cursor-pointer text-left active:scale-[0.99] ${
        isSelected
          ? 'bg-[#EFECE6] dark:bg-[#2D2D2D] text-[#1C1917] dark:text-white font-semibold'
          : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/[0.04] text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white font-medium'
      } ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isSelected
                ? 'bg-[#1C1917] text-white dark:bg-white dark:text-[#1C1917]'
                : 'bg-black/5 dark:bg-white/10 text-[#6E6961] dark:text-[#A8A8A8]'
            }`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs sm:text-[13.5px] tracking-tight truncate ${isSelected ? 'text-[#1C1917] dark:text-white font-bold' : ''}`}>
              {label}
            </span>
            {badge && (
              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[#1C1917] dark:text-white shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-[#8C867C] dark:text-[#71717A] truncate mt-0.5 font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {isSelected && (
        <div className="w-5 h-5 rounded-full bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] flex items-center justify-center shrink-0 ml-2">
          <Check size={12} strokeWidth={3} />
        </div>
      )}
    </button>
  );
}
