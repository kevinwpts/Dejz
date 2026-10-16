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
      'group inline-flex items-center justify-center font-medium transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/35';

    const sizeStyles = {
      sm: 'h-[var(--height-button-sm,36px)] px-4 rounded-full text-label gap-1.5 active:scale-[0.96]',
      md: 'h-[var(--height-button,48px)] px-5.5 rounded-full text-body-medium gap-2 active:scale-[0.97]',
      lg: 'h-[var(--height-button-lg,54px)] px-7 rounded-full text-body-medium font-semibold gap-2.5 active:scale-[0.97]',
    }[size];

    const surfaceButtonStyle =
      'bg-[var(--surface-muted)]/85 dark:bg-[var(--surface-muted)] backdrop-blur-md text-[var(--text-primary)] border-none shadow-subtle hover:bg-[var(--surface-muted)] dark:hover:bg-white/10 active:bg-black/[0.08] dark:active:bg-white/15';

    const variantStyles = {
      primary:
        'bg-[var(--btn-primary-bg,var(--accent-color))] text-[var(--btn-primary-text,var(--on-accent))] font-semibold hover:bg-[var(--btn-primary-hover,var(--accent-hover))] hover:-translate-y-[1px] active:translate-y-0 active:bg-[var(--btn-primary-pressed,var(--accent-pressed))] shadow-dreams-btn border-none',
      secondary: surfaceButtonStyle,
      pill: `${surfaceButtonStyle} !rounded-full`,
      accent:
        'bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold hover:bg-[var(--accent-hover)] hover:-translate-y-[1px] active:translate-y-0 active:bg-[var(--accent-pressed)] shadow-dreams-btn border-none',
      danger:
        'bg-[var(--danger-container)] text-[var(--danger-color)] hover:opacity-90 active:opacity-80 border-none',
      destructive:
        'bg-[var(--danger-container)] text-[var(--danger-color)] hover:opacity-90 active:opacity-80 border-none',
      ghost:
        'bg-transparent text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 border-none',
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
        <span>{children}</span>
        {!loading && iconRight && (
          <span className="shrink-0 flex items-center">{iconRight}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
