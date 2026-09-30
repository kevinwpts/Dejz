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
    ? 'bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] font-bold shadow-none'
    : 'bg-[#EAE6DE] dark:bg-[#2D2D2D] text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white hover:bg-[#DFD9CF] dark:hover:bg-[#333333] font-semibold';

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
          className={`ml-1 text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
            active
              ? 'bg-white/20 text-white dark:bg-black/10 dark:text-[#1C1917]'
              : 'bg-black/5 dark:bg-white/10 text-[#6E6961] dark:text-[#A8A8A8]'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
