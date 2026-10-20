import React from 'react';
import { Icon } from './Icon';
import { feedback } from '../../utils/feedback';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tonal' | 'pill' | 'accent' | 'danger' | 'destructive' | 'ghost' | 'outline' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg';
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
      onClick,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all duration-[var(--duration-normal,150ms)] ease-out select-none cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]/30';

    const sizeStyles = {
      xs: 'h-7 px-2.5 rounded-[var(--radius-button-sm,10px)] text-label font-semibold gap-1 active:scale-95',
      sm: 'h-[var(--height-button-sm,32px)] px-3.5 rounded-[var(--radius-button-sm,10px)] text-label font-semibold gap-1.5 active:scale-95',
      md: 'h-[var(--height-button,46px)] px-5 rounded-[var(--radius-button,12px)] text-body-medium font-semibold gap-2 active:scale-[0.98]',
      lg: 'h-[var(--height-button-lg,48px)] px-6 rounded-[var(--radius-button-lg,12px)] text-body-medium font-semibold gap-2.5 active:scale-[0.98]',
    }[size];

    const variantStyles = {
      primary:
        'bg-[var(--btn-primary-bg,var(--accent-color))] text-[var(--btn-primary-text,var(--on-accent))] font-semibold hover:bg-[var(--btn-primary-hover,var(--accent-hover))] active:bg-[var(--btn-primary-pressed,var(--accent-pressed))] shadow-none border-none',
      tonal:
        'bg-[var(--accent-container)] text-[var(--on-accent-container)] font-semibold hover:opacity-85 active:opacity-75 shadow-none border-none',
      secondary:
        'bg-[var(--btn-secondary-bg,var(--surface-color))] text-[var(--text-primary)] border border-[var(--border-divider)] shadow-subtle hover:bg-[var(--bg-hover)] active:opacity-90',
      pill:
        'bg-[var(--btn-secondary-bg,var(--surface-color))] text-[var(--text-primary)] border border-[var(--border-divider)] shadow-subtle hover:bg-[var(--bg-hover)] rounded-[var(--radius-pill,9999px)]',
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
      subtle:
        'bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10',
    }[variant];

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        onClick={(e) => {
          if (typeof feedback?.tap === 'function') feedback.tap();
          onClick?.(e);
        }}
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
