import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hero' | 'nested' | 'flat' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      interactive = false,
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'overflow-hidden transition-all duration-200';

    const variantStyles = {
      default:
        'bg-[var(--surface-color)] dark:bg-white/[0.025] backdrop-blur-[18px] border border-[var(--border-color)]/60 dark:border-white/[0.025] rounded-[24px] shadow-none',
      hero:
        'bg-[var(--surface-color)] dark:bg-white/[0.025] backdrop-blur-[18px] border border-[var(--border-color)]/70 dark:border-white/[0.03] rounded-[28px] shadow-none',
      nested:
        'bg-[var(--surface-muted)]/80 dark:bg-white/[0.02] backdrop-blur-md border border-[var(--border-color)]/40 dark:border-white/[0.02] rounded-[20px]',
      flat:
        'bg-[var(--surface-color)] dark:bg-white/[0.025] backdrop-blur-md border border-[var(--border-color)]/50 dark:border-white/[0.025] rounded-[22px]',
      elevated:
        'bg-[var(--surface-elevated)] dark:bg-white/[0.035] backdrop-blur-[18px] border border-[var(--border-color)]/70 dark:border-white/[0.035] rounded-[28px] shadow-none',
    }[variant];

    const paddingStyles = {
      none: 'p-0',
      sm: 'p-3.5 sm:p-4',
      md: 'p-5 sm:p-6',
      lg: 'p-6 sm:p-8',
    }[padding];

    const interactiveStyles = interactive
      ? 'cursor-pointer hover:border-[var(--accent-color)]/30 active:scale-[0.99] select-none'
      : '';

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`${baseStyles} ${variantStyles} ${paddingStyles} ${interactiveStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
