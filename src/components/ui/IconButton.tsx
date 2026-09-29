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
        'bg-[#EFECE6] dark:bg-[#2D2D2D] text-[#1C1917] dark:text-white hover:bg-[#EDE9DF] dark:hover:bg-[#333333] border-none shadow-none',
      default:
        'bg-[#EFECE6] dark:bg-[#2D2D2D] text-[#1C1917] dark:text-white hover:bg-[#EDE9DF] dark:hover:bg-[#333333] border-none shadow-none',
      ghost:
        'bg-transparent text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#EFECE6] dark:hover:bg-[#2D2D2D]',
      accent:
        'bg-[#05B862] text-white hover:opacity-90 shadow-none border-none',
      danger:
        'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border-none',
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
