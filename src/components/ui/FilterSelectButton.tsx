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
  variant?: 'default' | 'cardDarker';
}

export const FilterSelectButton: React.FC<FilterSelectButtonProps> = ({
  icon,
  label,
  value,
  onClick,
  className = '',
  disabled = false,
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
      className={`h-11 px-3.5 rounded-2xl transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer select-none text-left active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none font-sans bg-white dark:bg-white border border-[#E2DDD4] dark:border-white/20 text-[#1C1917] shadow-xs hover:bg-[#F9F8F6] dark:hover:bg-[#F0F0F0] ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {icon && <span className="text-[#1C1917] shrink-0">{icon}</span>}
        <div className="min-w-0 flex-1">
          {label && (
            <span className="block text-[10px] uppercase font-medium tracking-wider text-[#6E6961] leading-tight truncate">
              {label}
            </span>
          )}
          <span className="block text-xs sm:text-[13px] font-semibold text-[#1C1917] truncate leading-tight">
            {value}
          </span>
        </div>
      </div>
      <ChevronDown
        size={14}
        strokeWidth={2.2}
        className="text-[#1C1917] shrink-0 ml-1"
      />
    </button>
  );
};
