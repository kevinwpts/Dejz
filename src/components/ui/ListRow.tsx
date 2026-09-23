import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface ListRowProps {
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
  isLast?: boolean;
}

export const ListRow: React.FC<ListRowProps> = ({
  icon,
  iconBg = 'bg-[var(--surface-muted)]',
  iconColor = 'text-[var(--text-primary)]',
  title,
  subtitle,
  value,
  rightElement,
  showChevron = false,
  onClick,
  destructive = false,
  disabled = false,
  className = '',
}) => {
  const isClickable = Boolean(onClick && !disabled);

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`flex items-center justify-between py-3.5 px-4 rounded-[16px] transition-colors select-none ${
        isClickable
          ? 'cursor-pointer hover:bg-[var(--surface-muted)]/70 active:scale-[0.99]'
          : ''
      } ${disabled ? 'opacity-40 pointer-events-none' : ''} ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 pr-2">
        {icon && (
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[12px] flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex flex-col justify-center">
          <div
            className={`text-xs sm:text-sm font-semibold truncate ${
              destructive ? 'text-danger' : 'text-[var(--text-primary)]'
            }`}
          >
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px] sm:text-xs text-[var(--text-secondary)] font-medium truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {value && (
          <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-amount tabular-nums">
            {value}
          </span>
        )}
        {rightElement}
        {showChevron && (
          <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-50" />
        )}
      </div>
    </div>
  );
};
