import React from 'react';
import { Icon } from './Icon';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'muted' | 'default' | 'ghost' | 'danger' | 'accent' | 'primary';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'rounded';
  icon: React.ReactNode;
  'aria-label': string;
  loading?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'muted',
      size = 'md',
      shape = 'circle',
      loading = false,
      className = '',
      type = 'button',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center transition-all duration-[var(--duration-fast,100ms)] active:scale-90 select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/30';

    const shapeStyles = shape === 'circle' ? 'rounded-full' : 'rounded-[var(--radius-icon-button,8px)]';

    const sizeStyles = {
      xs: 'w-[var(--size-icon-button-xs,24px)] h-[var(--size-icon-button-xs,24px)] text-xs',
      sm: 'w-[var(--size-icon-button-sm,28px)] h-[var(--size-icon-button-sm,28px)] text-xs',
      md: 'w-[var(--size-icon-button-md,32px)] h-[var(--size-icon-button-md,32px)] text-sm',
      lg: 'w-[var(--size-icon-button-lg,40px)] h-[var(--size-icon-button-lg,40px)] text-base',
    }[size];

    const variantStyles = {
      muted:
        'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10 border-none shadow-none',
      default:
        'bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10 border-none shadow-none',
      ghost:
        'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border-none',
      accent:
        'bg-[var(--accent-color)] text-[var(--on-accent)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)] shadow-none border-none',
      primary:
        'bg-[#242321] text-white dark:bg-stone-100 dark:text-[#242321] hover:opacity-90 active:opacity-80 border-none shadow-none',
      danger:
        'bg-[var(--danger-container)] text-[var(--danger-color)] hover:opacity-90 border-none shadow-none',
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${baseStyles} ${shapeStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {loading ? (
          <Icon
            name="spinner"
            className="animate-spin shrink-0"
            size={size === 'xs' ? 12 : size === 'sm' ? 14 : size === 'lg' ? 18 : 16}
          />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
