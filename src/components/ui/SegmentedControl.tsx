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
      className={`bg-[var(--surface-muted)] dark:bg-[#2D2D2D] flex items-center relative ${sizeStyles} ${
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
                ? 'bg-[#635BFF] text-white shadow-none'
                : 'text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-white/20 text-white dark:bg-black/10 dark:text-[#1C1917]'
                    : 'bg-black/5 dark:bg-white/10 text-[#6E6961] dark:text-[#A8A8A8]'
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
