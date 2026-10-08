import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      iconRight,
      className = '',
      wrapperClassName = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className={`w-full flex flex-col gap-1.5 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-[var(--text-secondary)] flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}

        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full h-[48px] bg-black/5 dark:bg-white/5 border-none rounded-[8px] ${icon ? 'pl-10' : 'px-4'} ${
              iconRight ? 'pr-10' : 'px-4'
            } font-normal text-sm text-[#1C1917] dark:text-white caret-[var(--accent-color)] outline-none transition-all placeholder:font-normal placeholder-[#777168] dark:placeholder-[#B8B8B8] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          />

          {iconRight && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] flex items-center justify-center">
              {iconRight}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-0.5">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="text-xs font-normal text-[var(--text-tertiary)] mt-0.5">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
