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
    default: 'bg-black/5 dark:bg-[#252525] text-[#6E6961] dark:text-[#B8B8B8]',
    accent: 'bg-[var(--accent-soft)] dark:bg-[#2D2D2D] text-[var(--accent-color)] dark:text-[#FFFFFF]',
    success: 'bg-emerald-500/10 dark:bg-[#163025] text-emerald-600 dark:text-[#4ADE80]',
    danger: 'bg-rose-500/10 dark:bg-[#381F26] text-rose-600 dark:text-[#FF808B]',
    warning: 'bg-amber-500/10 dark:bg-[#342A16] text-amber-600 dark:text-[#FBBF24]',
    muted: 'bg-black/5 dark:bg-[#252525] text-[#6E6961] dark:text-[#B8B8B8]',
  }[variant];

  return (
    <span className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`} {...props}>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
