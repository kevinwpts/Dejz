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
            className="text-[12px] sm:text-[13px] font-medium text-[#9CA6BC] flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}

        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA6BC] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full bg-white/[0.035] hover:bg-white/[0.05] focus:bg-white/[0.05] border ${
              error ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/[0.03] focus:border-[#05b862]/40'
            } rounded-[16px] ${icon ? 'pl-10' : 'pl-4'} ${
              iconRight ? 'pr-10' : 'pr-4'
            } py-3 font-medium text-xs sm:text-sm text-white outline-none transition-all placeholder-[#9CA6BC]/40 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          />

          {iconRight && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
              {iconRight}
            </div>
          )}
        </div>

        {error && (
          <span className="text-[11px] font-medium text-rose-400 pl-1 flex items-center gap-1">
            {error}
          </span>
        )}

        {helperText && !error && (
          <span className="text-[11px] font-normal text-[#9CA6BC] opacity-80 pl-1">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
