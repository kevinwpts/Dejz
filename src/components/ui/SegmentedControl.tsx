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
  variant?: 'muted' | 'surface';
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  variant: _variant = 'surface',
  fullWidth = true,
  className = '',
}: SegmentedControlProps<T>) {
  const sizeStyles = {
    sm: 'p-1 rounded-[10px] text-label',
    md: 'p-1 rounded-[10px] text-secondary',
    lg: 'p-1 rounded-[10px] text-body-medium',
  }[size];

  const itemSizeStyles = {
    sm: 'min-h-[32px] py-1 px-2.5 rounded-[8px]',
    md: 'min-h-[36px] py-1.5 px-3 rounded-[8px]',
    lg: 'min-h-[40px] py-2 px-3.5 rounded-[8px]',
  }[size];

  const containerVariantStyles =
    'bg-[var(--card-nested-bg)] border-none shadow-none';

  return (
    <div
      className={`${containerVariantStyles} flex items-center relative ${sizeStyles} ${
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
            className={`relative flex items-center justify-center gap-1.5 font-medium transition-colors select-none cursor-pointer z-10 focus-visible:outline-2 focus-visible:outline-offset-[2px] focus-visible:outline-[var(--focus-color)] ${itemSizeStyles} ${
              fullWidth ? 'flex-1' : ''
            } ${
              isSelected
                ? 'bg-[var(--surface-color)] dark:bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-subtle font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
            }`}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={`text-label font-medium px-1.5 py-0.5 rounded-[6px] ${
                  isSelected
                    ? 'bg-[var(--card-nested-bg)] text-[var(--text-primary)]'
                    : 'bg-black/5 dark:bg-white/5 text-[var(--text-secondary)]'
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
