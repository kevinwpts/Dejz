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
            className="text-xs font-medium text-[#6E6961] dark:text-[#B8B8B8]"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C867C] dark:text-[#B8B8B8] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <select
            ref={ref}
            id={selectId}
            className={`w-full h-[48px] bg-black/5 dark:bg-[#222222] border-none rounded-[14px] ${icon ? 'pl-10' : 'px-4'} pr-10 font-normal text-[14px] text-[#1C1917] dark:text-white outline-none transition-all cursor-pointer appearance-none ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#1C1C1C] text-[#1C1917] dark:text-white">
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C867C] dark:text-[#B8B8B8] pointer-events-none flex items-center justify-center">
            <ChevronDown size={16} />
          </div>
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-0.5">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="text-xs font-normal text-[#8C867C] dark:text-[#71717A] mt-0.5">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
