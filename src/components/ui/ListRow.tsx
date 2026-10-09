import React from 'react';
import { Icon } from './Icon';

export interface ListRowProps {
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  badge?: React.ReactNode;
  rightElement?: React.ReactNode;
  control?: React.ReactNode;
  showChevron?: boolean;
  showCheck?: boolean;
  variant?: 'card' | 'grouped' | 'plain';
  onClick?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  multiline?: boolean;
  isLast?: boolean;
}

export const ListRow: React.FC<ListRowProps> = ({
  icon,
  iconBg = 'bg-[var(--surface-muted)]',
  iconColor = 'text-[var(--text-primary)]',
  title,
  subtitle,
  value,
  badge,
  rightElement,
  control,
  showChevron = false,
  showCheck = false,
  variant = 'card',
  onClick,
  destructive = false,
  disabled = false,
  className = '',
  titleClassName = '',
  subtitleClassName = '',
  multiline = false,
}) => {
  const isClickable = Boolean(onClick && !disabled);

  const containerStyles = {
    card: 'bg-[var(--surface-color)] border border-[var(--border-subtle)] p-3.5 sm:p-4 rounded-[var(--radius-card,14px)]',
    grouped: 'bg-transparent p-3.5 sm:p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]',
    plain: 'bg-transparent p-2 sm:p-3',
  }[variant];

  const clickableStyles = isClickable
    ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/30'
    : '';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isClickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`w-full flex items-center justify-between transition-all select-none ${containerStyles} ${clickableStyles} ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 pr-2 flex-1">
        {icon && (
          <div
            className={`w-10 h-10 rounded-[var(--radius-card-nested,10px)] flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex flex-col justify-center flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-card-title ${multiline ? '' : 'truncate'} ${
                destructive ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-primary)]'
              } ${titleClassName}`}
            >
              {title}
            </span>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>
          {subtitle && (
            <div
              className={`text-secondary mt-0.5 ${
                multiline ? 'leading-relaxed opacity-75' : 'truncate opacity-75'
              } ${subtitleClassName}`}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 ml-2">
        {value && (
          <div className="text-body-medium tabular-nums text-[var(--text-primary)]">
            {value}
          </div>
        )}
        {control}
        {rightElement}
        {showCheck && (
          <div className="text-[var(--accent-color)] shrink-0">
            <Icon name="check" size={18} />
          </div>
        )}
        {showChevron && (
          <Icon
            name="caret-right"
            size={16}
            className="text-[var(--text-tertiary)] shrink-0"
          />
        )}
      </div>
    </div>
  );
};
