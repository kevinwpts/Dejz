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
  variant = 'default',
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
      className={`h-11 px-3.5 rounded-2xl transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer select-none text-left active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none font-sans border-none shadow-none ${
        variant === 'cardDarker'
          ? 'bg-white dark:bg-[#1C1C1C] text-[#211F1C] dark:text-white hover:bg-[#F9F8F6] dark:hover:bg-[#222222]'
          : 'bg-white dark:bg-[#1C1C1C] text-[#211F1C] dark:text-white hover:bg-[#F9F8F6] dark:hover:bg-[#222222]'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {icon && <span className="text-[#6E6961] dark:text-[#A8A8A8] shrink-0">{icon}</span>}
        <div className="min-w-0 flex-1">
          {label && (
            <span className="block text-[10px] uppercase font-medium tracking-wider text-[#8C867C] dark:text-[#A8A8A8] leading-tight truncate">
              {label}
            </span>
          )}
          <span className="block text-xs sm:text-[13px] font-semibold text-[#211F1C] dark:text-white truncate leading-tight">
            {value}
          </span>
        </div>
      </div>
      <ChevronDown
        size={14}
        strokeWidth={2.2}
        className="text-[#6E6961] dark:text-[#A8A8A8] shrink-0 ml-1"
      />
    </button>
  );
};
