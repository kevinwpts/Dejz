import React from 'react';
import { Icon } from './Icon';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  options?: SelectOption[];
  icon?: React.ReactNode;
  wrapperClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      icon,
      children,
      className = '',
      wrapperClassName = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className={`w-full flex flex-col gap-1.5 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="text-label font-semibold text-[var(--text-secondary)]"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <select
            ref={ref}
            id={selectId}
            className={`w-full h-[var(--height-input,46px)] bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-[var(--radius-input,12px)] ${icon ? 'pl-10' : 'px-4'} pr-10 text-body outline-none transition-all cursor-pointer appearance-none ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[var(--surface-color)] text-[var(--text-primary)]">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none flex items-center justify-center">
            <Icon name="caret-down" size={16} />
          </div>
        </div>

        {error && (
          <p className="text-label text-[var(--danger-color)] mt-0.5">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="text-micro-label text-[var(--text-tertiary)] mt-0.5">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
