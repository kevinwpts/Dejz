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
            className="text-[12px] font-semibold text-[var(--text-secondary)] flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}

        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full bg-[var(--surface-muted)] focus:bg-[var(--surface-color)] border ${
              error ? 'border-danger/60 focus:border-danger ring-1 ring-danger/20' : 'border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20'
            } rounded-[16px] ${icon ? 'pl-10' : 'pl-4'} ${
              iconRight ? 'pr-10' : 'pr-4'
            } py-3 font-medium text-xs sm:text-sm text-[var(--text-primary)] outline-none transition-all placeholder-[var(--text-secondary)]/50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          />

          {iconRight && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
              {iconRight}
            </div>
          )}
        </div>

        {error && (
          <span className="text-[11px] font-semibold text-danger pl-1 flex items-center gap-1">
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

Input.displayName = 'Input';
