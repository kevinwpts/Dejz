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
      className={`h-11 px-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer select-none shadow-none text-left active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${
        active
          ? 'bg-[#EEECFF] dark:bg-[#635BFF]/20 border-[#635BFF]/30 text-[#635BFF] dark:text-[#7C75FF] font-medium'
          : 'bg-white dark:bg-[#242424] border-[#E2DDD4] dark:border-[#383838] text-[#1C1917] dark:text-white hover:bg-[#DFD9CF] dark:hover:bg-[#2D2D2D]'
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
