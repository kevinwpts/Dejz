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
  const baseStyles = 'inline-flex items-center justify-center font-semibold tracking-wide select-none';

  const sizeStyles = {
    sm: 'text-[10.5px] py-0.5 px-2 rounded-full gap-1',
    md: 'text-xs py-1 px-3 rounded-full gap-1.5',
  }[size];

  const variantStyles = {
    default: 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-color)]',
    accent: 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/20',
    success: 'bg-neutral-800 dark:text-white/10 text-neutral-900 dark:text-white dark:text-neutral-200 dark:text-white border border-neutral-800 dark:text-white/20',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    muted: 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
  }[variant];

  return (
    <span className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`} {...props}>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
