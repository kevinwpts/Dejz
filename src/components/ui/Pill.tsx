import React from 'react';

export interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  count?: number | string;
}

export const Pill: React.FC<PillProps> = ({
  children,
  active = false,
  size = 'md',
  icon,
  count,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  const sizeStyles = {
    sm: 'h-7 px-3 text-label gap-1.5',
    md: 'h-8 px-3.5 text-label gap-1.5',
  }[size];

  const activeStyles = active
    ? 'bg-[var(--text-primary)] text-[var(--surface-color)] dark:text-[var(--bg-color)] font-medium border border-transparent shadow-none'
    : 'bg-[var(--surface-color)]/95 dark:bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/[0.03] dark:hover:bg-white/10 font-medium border border-[var(--border-divider)] shadow-subtle';

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-[var(--radius-pill,9999px)] transition-all duration-150 active:scale-95 select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${sizeStyles} ${activeStyles} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={`ml-1 text-micro-label font-medium px-1.5 py-0.2 rounded-full ${
            active
              ? 'bg-white/20 text-current'
              : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
