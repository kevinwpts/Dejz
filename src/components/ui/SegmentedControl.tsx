import React from 'react';
import { motion } from 'motion/react';

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
    sm: 'p-1 rounded-[14px] text-xs',
    md: 'p-1 rounded-[16px] text-xs sm:text-sm',
    lg: 'p-1.5 rounded-[18px] text-sm',
  }[size];

  const itemSizeStyles = {
    sm: 'py-1.5 px-3 rounded-[10px]',
    md: 'py-2 px-4 rounded-[12px]',
    lg: 'py-2.5 px-5 rounded-[14px]',
  }[size];

  return (
    <div
      className={`bg-[var(--surface-muted)] border border-[var(--border-color)] flex items-center relative ${sizeStyles} ${
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
            className={`relative flex items-center justify-center gap-1.5 font-bold transition-colors select-none cursor-pointer z-10 ${itemSizeStyles} ${
              fullWidth ? 'flex-1' : ''
            } ${
              isSelected
                ? 'text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="segmented-indicator"
                className="absolute inset-0 bg-[var(--surface-color)] rounded-[inherit] shadow-2xs border border-[var(--border-color)]"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
              {option.icon && <span className="shrink-0">{option.icon}</span>}
              <span>{option.label}</span>
              {option.badge !== undefined && (
                <span className="text-[10px] py-0.2 px-1.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]">
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
