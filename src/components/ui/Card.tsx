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
        'bg-[var(--surface-color)] backdrop-blur-xl border border-[var(--border-color)]/60 rounded-[24px] shadow-sm',
      hero:
        'bg-[var(--surface-color)] backdrop-blur-xl border border-[var(--border-color)]/70 rounded-[28px] shadow-md',
      nested:
        'bg-[var(--surface-muted)]/80 backdrop-blur-md border border-[var(--border-color)]/40 rounded-[20px]',
      flat:
        'bg-[var(--surface-color)] backdrop-blur-md border border-[var(--border-color)]/50 rounded-[22px]',
      elevated:
        'bg-[var(--surface-elevated)] backdrop-blur-xl border border-[var(--border-color)]/70 rounded-[28px] shadow-[0_8px_30px_rgba(0,0,0,0.15)]',
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
