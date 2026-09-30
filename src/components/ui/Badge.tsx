import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'success' | 'danger' | 'warning' | 'muted';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium tracking-wide select-none rounded-full';

  const sizeStyles = {
    sm: 'text-[10px] py-0.5 px-2 gap-1',
    md: 'text-xs py-1 px-2.5 gap-1.5',
  }[size];

  const variantStyles = {
    default: 'bg-[var(--surface-muted)] dark:bg-[#2D2D2D] text-[#6E6961] dark:text-[#A8A8A8]',
    accent: 'bg-[#05B862]/10 text-[#05B862]',
    success: 'bg-[#05B862]/10 text-[#05B862]',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    muted: 'bg-[var(--surface-muted)] dark:bg-[#2D2D2D] text-[#6E6961] dark:text-[#A8A8A8]',
  }[variant];

  return (
    <span className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`} {...props}>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
