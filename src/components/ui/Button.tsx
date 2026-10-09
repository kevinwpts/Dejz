import React from 'react';
import { Icon } from './Icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'pill' | 'accent' | 'danger' | 'destructive' | 'ghost' | 'outline' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      fullWidth = false,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-[var(--duration-normal,150ms)] select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/30';

    const sizeStyles = {
      sm: 'h-[var(--height-button-sm,32px)] px-3.5 rounded-[var(--radius-button-sm,10px)] text-xs sm:text-[13px] gap-1.5 active:scale-95',
      md: 'h-[var(--height-button,48px)] px-5 rounded-[var(--radius-button,14px)] text-sm sm:text-[15px] gap-2 active:scale-[0.98]',
      lg: 'h-[var(--height-button-lg,52px)] px-6 rounded-[var(--radius-button-lg,14px)] text-base gap-2.5 active:scale-[0.98]',
    }[size];

    const variantStyles = {
      primary:
        'bg-[#242321] text-white dark:bg-stone-100 dark:text-[#242321] font-semibold hover:opacity-90 active:opacity-80 shadow-none border-none',
      secondary:
        'bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10 active:bg-black/15 dark:active:bg-white/15 border-none',
      pill:
        'bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10 border-none rounded-[var(--radius-pill,9999px)]',
      accent:
        'bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)] border-none',
      danger:
        'bg-[var(--danger-container)] text-[var(--danger-color)] hover:opacity-90 active:opacity-80 border-none',
      destructive:
        'bg-[var(--danger-container)] text-[var(--danger-color)] hover:opacity-90 active:opacity-80 border-none',
      ghost:
        'bg-transparent text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5',
      outline:
        'bg-transparent text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-black/5 dark:hover:bg-white/5',
      subtle:
        'bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10',
    }[variant];

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${widthStyle} ${className}`}
        {...props}
      >
        {loading ? (
          <Icon name="spinner" className="animate-spin shrink-0" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
        ) : (
          icon && <span className="shrink-0 flex items-center">{icon}</span>
        )}
        {children}
        {!loading && iconRight && <span className="shrink-0 flex items-center">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
