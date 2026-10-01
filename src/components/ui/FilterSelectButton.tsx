import React from 'react';
import { ChevronDown } from 'lucide-react';
import { feedback } from '../../utils/feedback';

export interface FilterSelectButtonProps {
  icon?: React.ReactNode;
  label?: string;
  value: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  active?: boolean;
}

export const FilterSelectButton: React.FC<FilterSelectButtonProps> = ({
  icon,
  label,
  value,
  onClick,
  className = '',
  disabled = false,
  active = false,
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          if (typeof feedback?.tap === 'function') feedback.tap();
          onClick();
        }
      }}
      className={`h-11 px-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer select-none shadow-none text-left active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none font-sans ${
        active
          ? 'bg-[var(--accent-color)]/15 border-none text-[var(--accent-color)] font-semibold'
          : 'bg-white dark:bg-[#191523] border-none text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-[#241F32]'
      } ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {icon && <span className="text-[#6E6961] dark:text-[#A8A8A8] shrink-0">{icon}</span>}
        <div className="min-w-0 flex-1">
          {label && (
            <span className="block text-[10px] uppercase font-medium tracking-wider text-[#8C867C] dark:text-[#71717A] leading-tight truncate">
              {label}
            </span>
          )}
          <span className="block text-xs sm:text-[13px] font-medium text-[#1C1917] dark:text-white truncate leading-tight">
            {value}
          </span>
        </div>
      </div>
      <ChevronDown
        size={14}
        strokeWidth={2.2}
        className="text-[#8C867C] dark:text-[#A8A8A8] shrink-0 ml-1"
      />
    </button>
  );
};
