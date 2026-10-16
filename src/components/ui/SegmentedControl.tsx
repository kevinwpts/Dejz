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
    sm: 'p-1 rounded-full text-label',
    md: 'p-1 rounded-full text-secondary',
    lg: 'p-1.5 rounded-full text-body-medium',
  }[size];

  const itemSizeStyles = {
    sm: 'py-1.5 px-3.5 rounded-full',
    md: 'py-2 px-4 rounded-full',
    lg: 'py-2.5 px-5 rounded-full',
  }[size];

  const containerVariantStyles =
    'bg-[var(--surface-nested,#ECEEF2)] border-none shadow-none';

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
            className={`relative flex items-center justify-center gap-1.5 font-medium transition-all select-none cursor-pointer z-10 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--focus-color,#0B0B0F)] ${itemSizeStyles} ${
              fullWidth ? 'flex-1' : ''
            } ${
              isSelected
                ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-none font-medium'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
            }`}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={`text-micro-label font-medium px-1.5 py-0.5 rounded-full ${
                  isSelected
                    ? 'bg-black/15 dark:bg-black/20 text-[var(--on-accent)]'
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
