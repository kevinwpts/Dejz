import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'muted' | 'ghost' | 'danger' | 'accent';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'rounded';
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'muted',
      size = 'md',
      shape = 'rounded',
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center transition-all duration-150 active:scale-[0.95] select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0';

    const shapeStyles = shape === 'circle' ? 'rounded-full' : {
      xs: 'rounded-[8px]',
      sm: 'rounded-[10px]',
      md: 'rounded-[12px]',
      lg: 'rounded-[16px]',
    }[size];

    const sizeStyles = {
      xs: 'w-7 h-7',
      sm: 'w-8 h-8',
      md: 'w-9 h-9 sm:w-10 sm:h-10',
      lg: 'w-11 h-11 sm:w-12 sm:h-12',
    }[size];

    const variantStyles = {
      default:
        'bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--surface-muted)] shadow-2xs',
      muted:
        'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] border border-[var(--border-color)] shadow-2xs',
      ghost:
        'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]',
      accent:
        'bg-[var(--accent-color)] text-[var(--text-on-accent)] hover:opacity-95 shadow-xs',
      danger:
        'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20',
    }[variant];

    return (
      <button
        ref={ref}
        type={type}
        className={`${baseStyles} ${shapeStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
