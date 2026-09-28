import React from 'react';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = true,
  className = '',
}: SegmentedControlProps<T>) {
  const sizeStyles = {
    sm: 'p-1 rounded-full text-xs',
    md: 'p-1 rounded-full text-xs sm:text-sm',
    lg: 'p-1.5 rounded-full text-sm',
  }[size];

  const itemSizeStyles = {
    sm: 'py-1.5 px-3 rounded-full',
    md: 'py-2 px-4 rounded-full',
    lg: 'py-2.5 px-5 rounded-full',
  }[size];

  return (
    <div
      className={`bg-black/5 dark:bg-white/[0.03] border border-[#E6E2D8] dark:border-white/[0.025] flex items-center relative ${sizeStyles} ${
        fullWidth ? 'w-full' : 'inline-flex'
      } ${className}`}
    >
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative flex items-center justify-center gap-1.5 font-medium transition-all select-none cursor-pointer z-10 ${itemSizeStyles} ${
              fullWidth ? 'flex-1' : ''
            } ${
              isSelected
                ? 'bg-white dark:bg-white text-[#1C1917] dark:text-[#1C1917] border border-[#E6E2D8] dark:border-transparent shadow-xs font-semibold'
                : 'text-[#6E6961] dark:text-[#9CA6BC] hover:text-[#1C1917] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.05]'
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              {option.icon && <span className="shrink-0">{option.icon}</span>}
              <span>{option.label}</span>
              {option.badge !== undefined && (
                <span className="text-[10px] py-0.2 px-1.5 rounded-full bg-black/5 dark:bg-white/[0.06] text-[#6E6961] dark:text-[#9CA6BC]">
                  {option.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
