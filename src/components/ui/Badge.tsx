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
  const baseStyles = 'inline-flex items-center justify-center font-medium select-none rounded-badge';

  const sizeStyles = {
    sm: 'text-label py-0.5 px-2 gap-1',
    md: 'text-label py-1 px-2.5 gap-1.5',
  }[size];

  const variantStyles = {
    default: 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
    accent: 'bg-[var(--accent-container)] text-[var(--on-accent-container)]',
    success: 'bg-[var(--success-container)] text-[var(--success-color)]',
    danger: 'bg-[var(--danger-container)] text-[var(--danger-color)]',
    warning: 'bg-[var(--warning-container)] text-[var(--warning-color)]',
    muted: 'bg-[var(--surface-muted)] text-[var(--text-secondary)]',
  }[variant];

  return (
    <span className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`} {...props}>
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
