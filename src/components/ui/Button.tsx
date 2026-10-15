import React from 'react';
import { Icon } from './Icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'pill' | 'accent' | 'danger' | 'destructive' | 'ghost' | 'outline' | 'subtle' | 'surface';
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
      sm: 'h-[var(--height-button-sm,34px)] px-4 rounded-full text-label gap-1.5 active:scale-95',
      md: 'h-[var(--height-button,46px)] px-5.5 rounded-full text-body-medium gap-2 active:scale-[0.98]',
      lg: 'h-[var(--height-button-lg,48px)] px-7 rounded-full text-body-medium font-semibold gap-2.5 active:scale-[0.98]',
    }[size];

    const surfaceButtonStyle =
      'bg-[var(--surface-color)] dark:bg-[var(--surface-muted)] backdrop-blur-md text-[var(--text-primary)] border border-[var(--border-divider)]/60 shadow-subtle hover:bg-[var(--surface-muted)]/70 dark:hover:bg-white/10 active:bg-black/[0.06] dark:active:bg-white/15';

    const variantStyles = {
      primary:
        'bg-[var(--text-primary)] text-[var(--surface-color)] dark:bg-[var(--text-primary)] dark:text-[var(--bg-color)] font-semibold hover:opacity-90 active:opacity-80 shadow-none border-none',
      secondary: surfaceButtonStyle,
      pill: `${surfaceButtonStyle} rounded-[var(--radius-pill,9999px)]`,
      accent:
        'bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)] border-none',
      danger:
        'bg-[var(--danger-container)] text-[var(--danger-color)] hover:opacity-90 active:opacity-80 border-none',
      destructive:
        'bg-[var(--danger-container)] text-[var(--danger-color)] hover:opacity-90 active:opacity-80 border-none',
      ghost:
        'bg-transparent text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5',
      outline:
        'bg-transparent text-[var(--text-primary)] border border-[var(--border-divider)] hover:bg-black/5 dark:hover:bg-white/5',
      subtle: surfaceButtonStyle,
      surface: surfaceButtonStyle,
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
