import React from 'react';
import { Icon } from './Icon';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'muted' | 'default' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'primary' | 'surface';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'rounded' | 'button';
  icon: React.ReactNode;
  'aria-label': string;
  loading?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'surface',
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
      'inline-flex items-center justify-center transition-all duration-[var(--duration-fast,100ms)] active:scale-90 select-none cursor-pointer disabled:pointer-events-none disabled:bg-[var(--surface-nested,#ECEEF2)] disabled:text-[var(--text-disabled,#A8AEB9)] disabled:border-none disabled:shadow-none shrink-0 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--focus-color,#0B0B0F)]';

    const shapeStyles =
      shape === 'circle'
        ? 'rounded-full'
        : shape === 'button' || size === 'xl'
        ? 'rounded-[var(--radius-button,12px)]'
        : 'rounded-[var(--radius-icon-button,8px)]';

    const sizeStyles = {
      xs: 'w-[var(--size-icon-button-xs,24px)] h-[var(--size-icon-button-xs,24px)] text-xs',
      sm: 'w-[var(--size-icon-button-sm,28px)] h-[var(--size-icon-button-sm,28px)] text-xs',
      md: 'w-[var(--size-icon-button-md,32px)] h-[var(--size-icon-button-md,32px)] text-sm',
      lg: 'w-[var(--size-icon-button-lg,40px)] h-[var(--size-icon-button-lg,40px)] text-base',
      xl: 'w-[var(--height-button-lg,48px)] h-[var(--height-button-lg,48px)] text-base',
    }[size];

    const surfaceStyle =
      'bg-[var(--surface-color)]/95 dark:bg-[var(--surface-muted)] backdrop-blur-md text-[var(--text-primary)] hover:bg-[var(--surface-color)] dark:hover:bg-white/10 border border-[var(--border-divider)] shadow-subtle';

    const variantStyles = {
      muted: surfaceStyle,
      default: surfaceStyle,
      secondary: surfaceStyle,
      surface: surfaceStyle,
      ghost:
        'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border-none',
      accent:
        'bg-[var(--accent-color)] text-[var(--on-accent)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)] shadow-none border-none',
      primary:
        'bg-[var(--text-primary)] text-[var(--surface-color)] dark:bg-[var(--text-primary)] dark:text-[var(--bg-color)] hover:opacity-90 active:opacity-80 border-none shadow-none',
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
