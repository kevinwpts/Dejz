import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'subtle' | 'accent';
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
      'inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const sizeStyles = {
      sm: 'text-xs py-2 px-4 rounded-[10px] gap-1.5 h-[38px]',
      md: 'text-xs sm:text-sm py-2.5 px-5 rounded-[12px] gap-2 h-[46px]',
      lg: 'text-sm sm:text-base py-3 px-6 rounded-[14px] gap-2.5 h-[50px]',
    }[size];

    const variantStyles = {
      primary:
        'bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] hover:bg-neutral-800 dark:hover:bg-neutral-200 font-semibold shadow-xs',
      accent:
        'bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] hover:bg-neutral-800 dark:hover:bg-neutral-200 font-semibold shadow-xs',
      secondary:
        'bg-black/5 dark:bg-white/10 text-[#1C1917] dark:text-white hover:bg-black/10 dark:hover:bg-white/20 border border-[#E6E2D8] dark:border-white/10 font-semibold',
      outline:
        'bg-transparent text-[#1C1917] dark:text-white hover:bg-black/5 dark:hover:bg-white/[0.06] border border-[#E6E2D8] dark:border-white/20 font-medium',
      ghost:
        'bg-transparent text-[#6E6961] dark:text-[#9CA6BC] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06] font-medium',
      subtle:
        'bg-black/5 dark:bg-white/10 text-[#1C1917] dark:text-white hover:bg-black/10 dark:hover:bg-white/20 font-medium',
      danger:
        'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 font-medium',
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
        {children && <span>{children}</span>}
        {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
