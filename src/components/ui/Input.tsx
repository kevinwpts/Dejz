import React from 'react';
import { Icon } from './Icon';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  variant?: 'default' | 'amount' | 'search';
  onClear?: () => void;
  currency?: string;
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
      variant = 'default',
      onClear,
      currency,
      className = '',
      wrapperClassName = '',
      id,
      disabled,
      value,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    const isSearch = variant === 'search';
    const isAmount = variant === 'amount';

    const defaultLeftIcon = isSearch && !icon ? <Icon name="magnifying-glass" size={16} /> : icon;

    const baseInputStyles = isSearch
      ? 'w-full h-[42px] sm:h-[44px] bg-[var(--surface-color)] rounded-[var(--radius-input,12px)] border-none shadow-subtle transition-all caret-[var(--accent-color)] outline-none placeholder:text-[var(--text-inactive)] disabled:opacity-50 disabled:cursor-not-allowed'
      : 'w-full h-[var(--height-input,46px)] bg-[var(--input-bg,rgba(0,0,0,0.05))] rounded-[var(--radius-input,12px)] border transition-all caret-[var(--accent-color)] outline-none placeholder:text-[var(--text-inactive)] disabled:opacity-50 disabled:cursor-not-allowed';

    const borderAndFocusStyles = error
      ? 'border-[var(--danger-color)] focus:border-[var(--danger-color)] focus:ring-2 focus:ring-[var(--danger-color)]/20'
      : isSearch
      ? 'focus:ring-2 focus:ring-[var(--accent-color)]/20'
      : 'border-transparent focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20';

    const typographyStyles = isAmount
      ? 'text-section-title tabular-nums'
      : isSearch
      ? 'text-xs sm:text-sm text-[var(--text-primary)]'
      : 'text-body';

    return (
      <div className={`w-full flex flex-col gap-1.5 ${wrapperClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-label flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}

        <div className="relative flex items-center w-full">
          {defaultLeftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none flex items-center justify-center">
              {defaultLeftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            value={value}
            className={`${baseInputStyles} ${borderAndFocusStyles} ${typographyStyles} ${
              defaultLeftIcon ? 'pl-10' : 'px-4'
            } ${
              iconRight || isAmount || (isSearch && onClear && value) ? 'pr-12' : 'px-4'
            } ${className}`}
            {...props}
          />

          {isSearch && onClear && value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Rensa sökning"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer p-1"
            >
              <Icon name="x" size={14} />
            </button>
          )}

          {isAmount && currency && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-label font-semibold text-[var(--text-tertiary)] pointer-events-none select-none">
              {currency}
            </span>
          )}

          {!isSearch && !isAmount && iconRight && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] flex items-center justify-center">
              {iconRight}
            </div>
          )}
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

Input.displayName = 'Input';
