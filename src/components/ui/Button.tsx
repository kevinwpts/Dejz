import React from 'react';
import { Icon } from './Icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'pill' | 'accent' | 'danger' | 'ghost' | 'outline' | 'subtle';
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
      'inline-flex items-center justify-center transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const sizeStyles = {
      sm: 'h-8 px-3.5 rounded-[6px] text-[13px] gap-1.5 active:scale-95',
      md: 'h-[48px] px-5 rounded-[8px] text-[15px] gap-2 active:scale-[0.98]',
      lg: 'h-[52px] px-6 rounded-[8px] text-[16px] gap-2.5 active:scale-[0.98]',
    }[size];

    const variantStyles = {
      primary:
        'bg-[#242321] text-white dark:bg-stone-100 dark:text-[#242321] font-semibold hover:opacity-90 active:opacity-80 shadow-none border-none',
      secondary:
        'bg-black/5 dark:bg-white/10 text-[#1C1917] dark:text-stone-200 font-medium hover:bg-black/10 dark:hover:bg-white/15 active:bg-black/15 dark:active:bg-white/20 border-none',
      pill:
        'bg-black/5 dark:bg-white/10 text-[#1C1917] dark:text-stone-200 font-medium hover:bg-black/10 dark:hover:bg-white/15 border-none rounded-full',
      accent:
        'bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)] border-none',
      danger:
        'bg-black/5 dark:bg-white/10 text-rose-600 dark:text-rose-400 font-medium hover:bg-black/10 dark:hover:bg-white/15 border-none',
      ghost:
        'bg-transparent text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 font-medium',
      outline:
        'bg-transparent text-[#1C1917] dark:text-stone-200 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-medium',
      subtle:
        'bg-black/5 dark:bg-white/5 text-[#1C1917] dark:text-stone-200 hover:bg-black/10 dark:hover:bg-white/10 font-medium',
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
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
