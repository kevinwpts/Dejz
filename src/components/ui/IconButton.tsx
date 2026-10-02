import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'muted' | 'default' | 'ghost' | 'danger' | 'accent';
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
      shape = 'circle',
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center transition-all duration-150 active:scale-90 select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none shrink-0';

    const shapeStyles = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

    const sizeStyles = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-7 h-7 text-xs',
      md: 'w-8 h-8 text-sm',
      lg: 'w-9 h-9 sm:w-10 sm:h-10 text-base',
    }[size];

    const variantStyles = {
      muted:
        'bg-black/5 dark:bg-[#252525] text-[#1C1917] dark:text-white hover:bg-black/10 dark:hover:bg-[#2D2D2D] border-none shadow-none',
      default:
        'bg-black/5 dark:bg-[#252525] text-[#1C1917] dark:text-white hover:bg-black/10 dark:hover:bg-[#2D2D2D] border-none shadow-none',
      ghost:
        'bg-transparent text-[#6E6961] dark:text-[#B8B8B8] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-[#252525]',
      accent:
        'bg-[var(--accent-color)] text-[var(--on-accent)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-pressed)] shadow-none border-none',
      danger:
        'bg-rose-500/10 dark:bg-[#381F26] text-rose-600 dark:text-[#FF808B] hover:bg-rose-500/20 dark:hover:bg-[#4A2631] border-none',
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
