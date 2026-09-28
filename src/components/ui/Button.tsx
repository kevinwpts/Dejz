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
        'bg-white text-black hover:bg-white/90 font-semibold shadow-none',
      accent:
        'bg-[#1C1917] dark:bg-white/[0.18] text-white hover:bg-[#1C1917] dark:bg-white/[0.26] border border-[#1C1917] dark:border-white/30 shadow-none',
      secondary:
        'bg-white/[0.04] text-white hover:bg-white/[0.08] border border-white/[0.03]',
      outline:
        'bg-transparent text-white hover:bg-white/[0.04] border border-white/[0.04]',
      ghost:
        'bg-transparent text-[#9CA6BC] hover:text-white hover:bg-white/[0.04]',
      subtle:
        'bg-[#1C1917] dark:bg-white/[0.16] text-white hover:bg-[#1C1917] dark:bg-white/[0.24] border border-[#1C1917] dark:border-white/30',
      danger:
        'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border-none',
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
