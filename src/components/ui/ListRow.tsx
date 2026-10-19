import React from 'react';
import { Icon } from './Icon';

export interface ListRowProps {
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  iconClassName?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  badge?: React.ReactNode;
  rightElement?: React.ReactNode;
  control?: React.ReactNode;
  showChevron?: boolean;
  showCheck?: boolean;
  variant?: 'card' | 'grouped' | 'plain';
  density?: 'default' | 'compact';
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
  iconBg = 'bg-transparent',
  iconColor = 'text-[var(--text-secondary)]',
  iconClassName = '',
  title,
  subtitle,
  value,
  badge,
  rightElement,
  control,
  showChevron = false,
  showCheck = false,
  variant = 'card',
  density = 'default',
  onClick,
  destructive = false,
  disabled = false,
  className = '',
  titleClassName = '',
  subtitleClassName = '',
  multiline = false,
  isLast: _isLast = false,
}) => {
  const isClickable = Boolean(onClick && !disabled);
  const isCompact = density === 'compact';

  const containerStyles = {
    card: isCompact
      ? 'bg-[var(--surface-color)] border-none px-3.5 py-2.5 min-h-[44px] rounded-card shadow-none'
      : 'bg-[var(--surface-color)] border-none px-4 py-3 min-h-[52px] rounded-card shadow-none',
    grouped: isCompact
      ? 'bg-transparent px-3.5 py-2.5 min-h-[44px] hover:bg-[var(--bg-hover)]'
      : 'bg-transparent px-4 py-3 min-h-[52px] hover:bg-[var(--bg-hover)]',
    plain: isCompact
      ? 'bg-transparent px-3.5 py-2.5 min-h-[42px]'
      : 'bg-transparent px-4 py-3 min-h-[48px]',
  }[variant];

  const clickableStyles = isClickable
    ? 'cursor-pointer hover:bg-[var(--bg-hover)] active:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]'
    : '';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isClickable && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  const hasIconBg = iconBg && iconBg !== 'bg-transparent';
  const iconContainerSize = hasIconBg
    ? isCompact
      ? 'w-8 h-8 rounded-[8px]'
      : 'w-9 h-9 rounded-[10px]'
    : isCompact
      ? 'w-5 h-5'
      : 'w-6 h-6';

  const gapSize = isCompact ? 'gap-2.5' : 'gap-3';

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`w-full flex items-center justify-between transition-colors select-none ${containerStyles} ${clickableStyles} ${
        disabled ? 'opacity-50 pointer-events-none text-[var(--text-disabled)]' : ''
      } ${className}`}
    >
      <div className={`flex items-center ${gapSize} min-w-0 pr-2 flex-1`}>
        {icon && (
          <div
            className={`${iconContainerSize} flex items-center justify-center shrink-0 ${iconBg} ${iconColor} ${iconClassName}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex flex-col justify-center flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-card-title ${
                multiline ? '' : 'truncate'
              } ${
                destructive ? 'text-[var(--danger-color)]' : 'text-[var(--text-primary)]'
              } ${titleClassName}`}
            >
              {title}
            </span>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>
          {subtitle && (
            <div
              className={`text-secondary text-[var(--text-secondary)] mt-0.5 ${
                multiline ? 'leading-[20px]' : 'truncate'
              } ${subtitleClassName}`}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 ml-2">
        {value && (
          <div className="text-secondary tabular-nums text-[var(--text-secondary)]">
            {value}
          </div>
        )}
        {control}
        {rightElement}
        {showCheck && (
          <div className="text-[var(--accent-color)] shrink-0">
            <Icon name="check" size={20} />
          </div>
        )}
        {showChevron && (
          <Icon
            name="caret-right"
            size={18}
            className="text-[var(--text-tertiary)] shrink-0"
          />
        )}
      </div>
    </div>
  );
};

