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
      className={`w-full flex items-center justify-between py-3 px-4 rounded-card-nested transition-colors cursor-pointer text-left min-h-[56px] ${
        isSelected
          ? 'bg-[var(--surface-color)] shadow-none'
          : 'bg-transparent hover:bg-[var(--bg-hover)]'
      } disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {icon && (
          <div
            className="w-8 h-8 flex items-center justify-center shrink-0 bg-transparent text-[var(--text-primary)] [&_svg]:w-[22px] [&_svg]:h-[22px]"
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-body truncate ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'font-normal text-[var(--text-primary)]'}`}>
              {label}
            </span>
            {badge && (
              <span className="text-label font-medium px-1.5 py-0.5 rounded-badge bg-[var(--surface-muted)] text-[var(--text-secondary)] shrink-0">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-secondary truncate mt-0.5 font-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-2">
        {rightElement}
        {isSelected && (
          <div className="text-[var(--accent-color)] shrink-0 pl-1">
            <Icon name="check" size={20} />
          </div>
        )}
      </div>
    </button>
  );
}
