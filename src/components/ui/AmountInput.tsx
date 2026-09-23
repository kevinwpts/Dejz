import React from 'react';

export interface AmountInputProps {
  value: string | number;
  onChange: (value: string) => void;
  currency?: string;
  label?: string;
  placeholder?: string;
  variant?: 'hero' | 'default' | 'compact';
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string | null;
  className?: string;
  isExpense?: boolean;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  currency = 'kr',
  label,
  placeholder = '0',
  variant = 'hero',
  autoFocus = false,
  disabled = false,
  error,
  className = '',
  isExpense = false,
}) => {
  const isHero = variant === 'hero';

  return (
    <div className={`w-full flex flex-col items-center ${className}`}>
      {label && (
        <span className="text-[12px] font-semibold text-[var(--text-secondary)] mb-1 self-start">
          {label}
        </span>
      )}

      {isHero ? (
        <div className="w-full flex flex-col items-center justify-center py-4 sm:py-6 relative">
          <div className="flex items-baseline justify-center gap-1.5 w-full">
            {isExpense && (
              <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-danger font-amount select-none">
                −
              </span>
            )}
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              autoFocus={autoFocus}
              disabled={disabled}
              value={value}
              onChange={(e) => {
                // Only allow numbers and decimal separators
                const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                onChange(val);
              }}
              placeholder={placeholder}
              className={`w-full max-w-[280px] text-center bg-transparent text-4xl sm:text-5xl md:text-6xl font-extrabold font-amount tabular-nums tracking-tight ${
                isExpense ? 'text-danger' : 'text-[var(--text-primary)]'
              } outline-none placeholder-[var(--text-secondary)]/30`}
            />
            <span className="text-xl sm:text-2xl font-bold text-[var(--text-secondary)] opacity-70 select-none">
              {currency}
            </span>
          </div>
          {error && <span className="text-xs font-semibold text-danger mt-1.5">{error}</span>}
        </div>
      ) : (
        <div className="relative w-full flex items-center">
          <input
            type="text"
            inputMode="decimal"
            autoFocus={autoFocus}
            disabled={disabled}
            value={value}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
              onChange(val);
            }}
            placeholder={placeholder}
            className={`w-full bg-[var(--surface-muted)] focus:bg-[var(--surface-color)] border ${
              error ? 'border-danger/60 focus:border-danger' : 'border-[var(--border-color)] focus:border-[var(--accent-color)] focus:ring-2 focus:ring-[var(--accent-color)]/20'
            } rounded-[16px] pl-4 pr-12 py-3 font-amount font-bold text-base sm:text-lg text-[var(--text-primary)] outline-none transition-all placeholder-[var(--text-secondary)]/40`}
          />
          <span className="absolute right-4 text-xs font-bold text-[var(--text-secondary)] opacity-70 pointer-events-none">
            {currency}
          </span>
        </div>
      )}
    </div>
  );
};
