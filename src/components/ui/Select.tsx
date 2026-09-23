import React from 'react';
import { ChevronDown } from 'lucide-react';

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
            className="text-[12px] font-semibold text-[var(--text-secondary)]"
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
            className={`w-full bg-[var(--surface-muted)] focus:bg-[var(--surface-color)] border ${
              error ? 'border-danger/60 focus:border-danger' : 'border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20'
            } rounded-[16px] ${icon ? 'pl-10' : 'pl-4'} pr-10 py-3 font-semibold text-xs sm:text-sm text-[var(--text-primary)] outline-none transition-all cursor-pointer appearance-none ${className}`}
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

          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]">
            <ChevronDown size={16} />
          </div>
        </div>

        {error && (
          <span className="text-[11px] font-semibold text-danger pl-1">
            {error}
          </span>
        )}

        {helperText && !error && (
          <span className="text-[11px] font-medium text-[var(--text-secondary)] opacity-75 pl-1">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
