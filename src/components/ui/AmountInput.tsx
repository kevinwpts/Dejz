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
        <span className="text-[12px] sm:text-[13px] font-medium text-[#9CA6BC] mb-1.5 self-start">
          {label}
        </span>
      )}

      {isHero ? (
        <div className="w-full flex flex-col items-center justify-center py-3 sm:py-5 relative">
          <div className="flex items-baseline justify-center gap-1.5 w-full">
            {isExpense && (
              <span className="text-3xl sm:text-4xl font-semibold text-white font-amount select-none">
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
                const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                onChange(val);
              }}
              placeholder={placeholder}
              className="w-full max-w-[280px] text-center bg-transparent text-4xl sm:text-5xl font-semibold font-amount tabular-nums tracking-tight text-white outline-none placeholder-[#9CA6BC]/30"
            />
            <span className="text-sm sm:text-base font-normal text-[#9CA6BC] select-none">
              {currency}
            </span>
          </div>
          {error && <span className="text-xs font-medium text-rose-400 mt-1.5">{error}</span>}
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
            className={`w-full bg-white/[0.035] focus:bg-white/[0.05] border ${
              error ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/[0.03] focus:border-[#8B9CFF]/40'
            } rounded-[16px] pl-4 pr-12 py-3 font-amount font-semibold text-base sm:text-lg text-white outline-none transition-all placeholder-[#9CA6BC]/40`}
          />
          <span className="absolute right-4 text-xs font-normal text-[#9CA6BC] pointer-events-none">
            {currency}
          </span>
        </div>
      )}
    </div>
  );
};
