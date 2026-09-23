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
      'inline-flex items-center justify-center font-bold transition-all duration-150 active:scale-[0.98] select-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const sizeStyles = {
      sm: 'text-xs py-2 px-3.5 rounded-[12px] gap-1.5 h-[36px]',
      md: 'text-xs sm:text-sm py-3 px-4 rounded-[16px] gap-2 h-[46px]',
      lg: 'text-sm sm:text-base py-3.5 px-6 rounded-[18px] gap-2.5 h-[52px]',
    }[size];

    const variantStyles = {
      primary:
        'bg-[var(--accent-color)] text-[var(--text-on-accent)] hover:opacity-95 shadow-xs',
      accent:
        'bg-[var(--accent-color)] text-[var(--text-on-accent)] hover:opacity-95 shadow-xs',
      secondary:
        'bg-[var(--surface-muted)] text-[var(--text-primary)] hover:bg-[var(--surface-color)] border border-[var(--border-color)] shadow-2xs',
      outline:
        'bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)]',
      ghost:
        'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]',
      subtle:
        'bg-[var(--accent-color)]/8 text-[var(--accent-color)] hover:bg-[var(--accent-color)]/15 border border-[var(--accent-color)]/20',
      danger:
        'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20 shadow-2xs',
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
