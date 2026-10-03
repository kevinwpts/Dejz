import React from 'react';
import { Loader2 } from 'lucide-react';

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
      'inline-flex items-center justify-center font-semibold transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const sizeStyles = {
      sm: 'h-8 px-3.5 rounded-full text-[13px] gap-1.5 active:scale-95',
      md: 'h-[48px] px-5 rounded-[14px] text-[15px] gap-2 active:scale-[0.98]',
      lg: 'h-[52px] px-6 rounded-[14px] text-[16px] gap-2.5 active:scale-[0.98]',
    }[size];

    const variantStyles = {
      primary:
        'bg-[var(--accent-color)] text-[var(--on-accent)] hover:opacity-90 active:opacity-80 shadow-none border-none',
      secondary:
        'bg-[#EAE6DE] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-white hover:bg-[#DFD9CF] dark:hover:bg-[#222222] active:bg-[#D5CF84] dark:active:bg-[#222222] border-none',
      pill:
        'bg-[#EAE6DE] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-white hover:bg-[#DFD9CF] dark:hover:bg-[#222222] border-none rounded-full',
      accent:
        'bg-[var(--accent-color)] text-[var(--on-accent)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)] border-none',
      danger:
        'bg-rose-500/10 dark:bg-[#381F26] text-rose-600 dark:text-[#FF808B] hover:bg-rose-500/20 dark:hover:bg-[#4A2631] border-none',
      ghost:
        'bg-transparent text-[var(--accent-color)] hover:bg-black/5 dark:hover:bg-[#1C1C1C]',
      outline:
        'bg-transparent text-[#1C1917] dark:text-white border border-[#E2DDD4] dark:border-[#383838] hover:bg-black/5 dark:hover:bg-[#1C1C1C]',
      subtle:
        'bg-[#EAE6DE] dark:bg-[#1C1C1C] text-[#1C1917] dark:text-white hover:bg-[#DFD9CF] dark:hover:bg-[#222222]',
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
          <Loader2 className="animate-spin shrink-0" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
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
