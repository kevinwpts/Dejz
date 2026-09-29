import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hero' | 'nested' | 'flat' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      interactive = false,
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'overflow-hidden transition-all duration-150 border-none shadow-none';

    const variantStyles = {
      default: 'bg-white dark:bg-[#242424] rounded-[18px]',
      hero: 'bg-white dark:bg-[#242424] rounded-[18px]',
      nested: 'bg-[#EFECE6] dark:bg-[#2D2D2D] rounded-[14px]',
      flat: 'bg-white dark:bg-[#242424] rounded-[18px]',
      elevated: 'bg-white dark:bg-[#242424] rounded-[18px]',
    }[variant];

    const paddingStyles = {
      none: 'p-0',
      sm: 'p-3.5 sm:p-4',
      md: 'p-4 sm:p-5',
      lg: 'p-6 sm:p-7',
    }[padding];

    const interactiveStyles = interactive
      ? 'cursor-pointer hover:bg-[#EDE9DF] dark:hover:bg-[#333333] active:scale-[0.99] select-none'
      : '';

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`${baseStyles} ${variantStyles} ${paddingStyles} ${interactiveStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
