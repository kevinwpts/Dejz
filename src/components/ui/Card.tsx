import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hero' | 'nested' | 'flat' | 'elevated' | 'outlined' | 'muted' | 'accent';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  as?: 'div' | 'section' | 'article';
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
      onKeyDown,
      as: Component = 'div',
      ...props
    },
    ref
  ) => {
    const baseStyles = 'overflow-hidden transition-all duration-[var(--duration-normal,150ms)] ease-out';

    const variantStyles = {
      default: 'bg-[var(--surface-color)] border-none rounded-[var(--radius-card,20px)] shadow-subtle',
      accent: 'bg-[var(--accent-color)] text-[var(--on-accent)] border-none rounded-[var(--radius-card,20px)] shadow-subtle',
      hero: 'bg-[var(--surface-color)] border-none rounded-[var(--radius-card,20px)] shadow-subtle',
      nested: 'bg-[var(--card-nested-bg)] border-none rounded-[var(--radius-card-nested,12px)] shadow-none',
      flat: 'bg-[var(--surface-color)] border-none rounded-[var(--radius-card,20px)] shadow-none',
      elevated: 'bg-[var(--surface-color)] border-none rounded-[var(--radius-card,20px)] shadow-subtle',
      outlined: 'bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-[var(--radius-card,20px)] shadow-none',
      muted: 'bg-[var(--surface-muted)] border-none rounded-[var(--radius-card-nested,12px)] shadow-none',
    }[variant];

    const paddingStyles = {
      none: 'p-0',
      sm: 'card-p-sm',
      md: 'card-p',
      lg: 'card-p-lg',
    }[padding];

    const interactiveStyles = interactive
      ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.03] active:scale-[0.99] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/30'
      : '';

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (interactive && onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
      if (onKeyDown) onKeyDown(e);
    };

    return (
      <Component
        ref={ref}
        onClick={onClick}
        onKeyDown={interactive ? handleKeyDown : onKeyDown}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        className={`${baseStyles} ${variantStyles} ${paddingStyles} ${interactiveStyles} ${className}`}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = 'Card';
