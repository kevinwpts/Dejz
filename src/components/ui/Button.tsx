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
      'inline-flex items-center justify-center font-bold transition-all duration-150 select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const sizeStyles = {
      sm: 'h-8 px-3.5 rounded-full text-xs gap-1.5 active:scale-95',
      md: 'h-[48px] px-5 rounded-[14px] text-sm gap-2 active:scale-[0.98]',
      lg: 'h-[52px] px-6 rounded-[14px] text-base gap-2.5 active:scale-[0.98]',
    }[size];

    const variantStyles = {
      primary:
        'bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] hover:opacity-90 shadow-none border-none',
      secondary:
        'bg-[#EFECE6] dark:bg-[#2D2D2D] text-[#1C1917] dark:text-white hover:bg-[#EDE9DF] dark:hover:bg-[#333333] border-none',
      pill:
        'bg-[#EFECE6] dark:bg-[#2D2D2D] text-[#1C1917] dark:text-white hover:bg-[#EDE9DF] dark:hover:bg-[#333333] border-none rounded-full',
      accent:
        'bg-[#05B862] text-white hover:opacity-90 border-none',
      danger:
        'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-none',
      ghost:
        'bg-transparent text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#EFECE6] dark:hover:bg-[#2D2D2D]',
      outline:
        'bg-transparent text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-[#383838] hover:bg-[#EFECE6] dark:hover:bg-[#2D2D2D]',
      subtle:
        'bg-[#EFECE6] dark:bg-[#2D2D2D] text-[#1C1917] dark:text-white hover:bg-[#EDE9DF] dark:hover:bg-[#333333]',
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
