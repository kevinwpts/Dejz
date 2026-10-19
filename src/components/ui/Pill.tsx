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
    sm: 'min-h-[32px] px-3 text-label gap-1.5',
    md: 'min-h-[36px] px-3.5 text-secondary font-medium gap-1.5',
  }[size];

  const activeStyles = active
    ? 'bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold border-none shadow-none'
    : 'bg-[var(--surface-color)] dark:bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] font-medium border-none shadow-none';

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-[8px] transition-colors duration-150 active:scale-95 select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${sizeStyles} ${activeStyles} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={`ml-1 text-label font-medium px-1.5 py-0.2 rounded-[6px] ${
            active
              ? 'bg-black/15 text-current'
              : 'bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
