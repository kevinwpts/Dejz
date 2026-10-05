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
  _variant = 'default',
}: FilterSelectButtonProps & { _variant?: 'default' | 'cardDarker' }) => {
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
      className={`h-11 px-3.5 rounded-[14px] transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer select-none text-left active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none font-sans border-none shadow-none bg-[var(--surface-color)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {icon && <span className="text-[var(--text-secondary)] shrink-0">{icon}</span>}
        <div className="min-w-0 flex-1">
          {label && (
            <span className="block text-[10px] uppercase font-semibold font-display tracking-wider text-[var(--text-secondary)] leading-tight truncate">
              {label}
            </span>
          )}
          <span className="block text-xs sm:text-[13px] font-semibold text-[var(--text-primary)] truncate leading-tight">
            {value}
          </span>
        </div>
      </div>
      <ChevronDown
        size={14}
        strokeWidth={2.5}
        className="text-[var(--text-secondary)] shrink-0 ml-1"
      />
    </button>
  );
};
