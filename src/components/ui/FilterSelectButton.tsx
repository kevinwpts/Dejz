import React from 'react';
import { Icon } from './Icon';
import { feedback } from '../../utils/feedback';

export interface FilterSelectButtonProps {
  icon?: React.ReactNode;
  label?: string;
  value: string;
  badge?: React.ReactNode;
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
  badge,
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
      className={`h-11 px-3.5 rounded-[var(--radius-button-sm,8px)] transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer select-none text-left active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none font-sans border-none shadow-none bg-[var(--surface-color)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {icon && <span className="text-[var(--text-secondary)] shrink-0">{icon}</span>}
        <div className="min-w-0 flex-1">
          {label && (
            <span className="block text-micro-label leading-tight truncate">
              {label}
            </span>
          )}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="block text-secondary font-semibold text-[var(--text-primary)] truncate leading-tight">
              {value}
            </span>
            {badge && (
              <span className="shrink-0">
                {badge}
              </span>
            )}
          </div>
        </div>
      </div>
      <Icon
        name="caret-down"
        size={14}
        className="text-[var(--text-secondary)] shrink-0 ml-1"
      />
    </button>
  );
};
