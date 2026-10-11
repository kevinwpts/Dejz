import React from 'react';
import { Icon } from './Icon';
import { feedback } from '../../utils/feedback';

export interface SelectionRowProps<T = string> {
  id?: T;
  label: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  isSelected?: boolean;
  onClick: () => void;
  disabled?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
}

export function SelectionRow<T = string>({
  label,
  subtitle,
  icon,
  badge,
  isSelected,
  onClick,
  disabled = false,
  rightElement,
  className = '',
}: SelectionRowProps<T>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          if (typeof feedback?.selection === 'function') feedback.selection();
          else if (typeof feedback?.tap === 'function') feedback.tap();
          onClick();
        }
      }}
      className={`w-full flex items-center justify-between py-2.5 px-4 rounded-[var(--radius-card-nested,12px)] transition-colors cursor-pointer text-left active:scale-[0.99] min-h-[50px] bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/30 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div
            className="w-8 h-8 rounded-[var(--radius-icon-button,10px)] flex items-center justify-center shrink-0 bg-[var(--surface-muted)] text-[var(--text-primary)]"
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-secondary truncate ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'font-medium'}`}>
              {label}
            </span>
            {badge && (
              <span className="text-micro-label font-medium px-1.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-micro-label truncate mt-0.5 font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {rightElement}
        {isSelected && (
          <div className="text-[var(--accent-color)] shrink-0 pl-1">
            <Icon name="check" size={18} />
          </div>
        )}
      </div>
    </button>
  );
}
