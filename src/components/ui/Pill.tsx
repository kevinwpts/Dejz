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
    sm: 'h-7 px-3 text-xs gap-1.5',
    md: 'h-8 px-3.5 text-xs gap-1.5',
  }[size];

  const activeStyles = active
    ? 'bg-[#1C1917] dark:bg-white text-white dark:text-[#141414] font-medium border border-transparent shadow-none'
    : 'bg-black/5 dark:bg-white/5 text-[#6E6961] dark:text-[#B8B8B8] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 font-medium border border-transparent dark:border-white/5';

  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full transition-all duration-150 active:scale-95 select-none cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${sizeStyles} ${activeStyles} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {count !== undefined && (
        <span
          className={`ml-1 text-[11px] font-medium px-1.5 py-0.2 rounded-full ${
            active
              ? 'bg-white/20 text-white dark:bg-black/20 dark:text-[#141414]'
              : 'bg-black/5 dark:bg-white/5 text-[#6E6961] dark:text-[#B8B8B8]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
