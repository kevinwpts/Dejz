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
  iconBg = 'bg-black/5 dark:bg-white/10',
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
      className={`bg-white dark:bg-[#1E1B22] border-none p-3.5 sm:p-4 rounded-[18px] flex items-center justify-between transition-all select-none ${
        isClickable
          ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/[0.04] active:scale-[0.99]'
          : ''
      } ${disabled ? 'opacity-40 pointer-events-none' : ''} ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 pr-2">
        {icon && (
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex flex-col justify-center">
          <div
            className={`text-sm font-medium truncate ${
              destructive ? 'text-rose-600 dark:text-rose-400' : 'text-[#1C1917] dark:text-white'
            }`}
          >
            {title}
          </div>
          {subtitle && (
            <div className="text-xs font-normal text-[#6E6961] dark:text-[#A8A8A8] truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {value && (
          <div className="text-sm font-medium font-amount tabular-nums text-[#1C1917] dark:text-white">
            {value}
          </div>
        )}
        {rightElement}
        {showChevron && (
          <ChevronRight
            size={16}
            className="text-[#8C867C] dark:text-[#71717A] ml-1 shrink-0"
          />
        )}
      </div>
    </div>
  );
};
