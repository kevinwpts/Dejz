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
  iconBg = 'bg-black/5 dark:bg-white/5',
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
      className={`bg-white dark:bg-[#1C1C1C] border border-black/[0.06] dark:border-white/[0.08] p-3.5 sm:p-4 rounded-[8px] flex items-center justify-between transition-all select-none ${
        isClickable
          ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/[0.04] active:scale-[0.99]'
          : ''
      } ${disabled ? 'opacity-40 pointer-events-none' : ''} ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        {icon && (
          <div
            className={`w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex flex-col justify-center">
          <div
            className={`text-sm font-medium truncate ${
              destructive ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-primary)]'
            }`}
          >
            {title}
          </div>
          {subtitle && (
            <div className="text-xs font-normal text-[var(--text-secondary)] truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {value && (
          <div className="text-sm font-medium font-amount tabular-nums text-[var(--text-primary)]">
            {value}
          </div>
        )}
        {rightElement}
        {showChevron && (
          <ChevronRight
            size={16}
            className="text-[var(--text-tertiary)] ml-1 shrink-0"
          />
        )}
      </div>
    </div>
  );
};
