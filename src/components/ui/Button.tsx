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
      'inline-flex items-center justify-center font-medium transition-all duration-[var(--duration-normal,150ms)] select-none cursor-pointer disabled:pointer-events-none disabled:active:scale-100 disabled:bg-[var(--surface-nested,#ECEEF2)] disabled:text-[var(--text-disabled,#A8AEB9)] disabled:border-none disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--focus-color,#0B0B0F)]';

    const sizeStyles = {
      sm: 'h-[var(--height-button-sm,34px)] px-4 rounded-full text-label gap-1.5 active:scale-95',
      md: 'h-[var(--height-button,46px)] px-5.5 rounded-full text-body-medium gap-2 active:scale-[0.98]',
      lg: 'h-[var(--height-button-lg,48px)] px-7 rounded-full text-body-medium font-semibold gap-2.5 active:scale-[0.98]',
    }[size];

    const surfaceButtonStyle =
      'bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--border-control)] shadow-none hover:bg-[var(--bg-hover)] active:bg-black/[0.06] dark:active:bg-white/10';

    const variantStyles = {
      primary:
        'bg-[var(--btn-primary-bg,var(--accent-color))] text-[var(--btn-primary-text,var(--on-accent))] font-semibold hover:bg-[var(--btn-primary-hover,var(--accent-hover))] active:bg-[var(--btn-primary-pressed,var(--accent-pressed))] shadow-none border-none',
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
        'bg-transparent text-[var(--text-primary)] border border-[var(--border-control)] hover:bg-black/5 dark:hover:bg-white/5',
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
