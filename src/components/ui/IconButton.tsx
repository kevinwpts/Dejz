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
        ? 'rounded-icon-button'
        : 'rounded-full';

    const sizeStyles = {
      xs: 'min-w-[44px] min-h-[44px] w-[44px] h-[44px] text-xs',
      sm: 'min-w-[44px] min-h-[44px] w-[44px] h-[44px] text-sm',
      md: 'min-w-[44px] min-h-[44px] w-[44px] h-[44px] text-sm',
      lg: 'min-w-[44px] min-h-[44px] w-[44px] h-[44px] text-base',
      xl: 'min-w-[48px] min-h-[48px] w-[48px] h-[48px] text-base',
    }[size];

    const surfaceStyle =
      'bg-[var(--surface-color)] dark:bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border-none shadow-none';

    const variantStyles = {
      muted: surfaceStyle,
      default: surfaceStyle,
      secondary: surfaceStyle,
      surface: surfaceStyle,
      ghost:
        'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border-none shadow-none',
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
