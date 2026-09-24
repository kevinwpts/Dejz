import React from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import { parseMathAmount, hasMathOperators, formatLiveMathPreview } from '../utils/mathUtils';

interface NumberPadProps {
  value: string;
  onChange: (newValue: string) => void;
  currency?: string;
  className?: string;
}

export function NumberPad({
  value,
  onChange,
  currency = 'kr',
  className = '',
}: NumberPadProps) {
  const livePreview = formatLiveMathPreview(value);
  const currentNum = parseMathAmount(value);
  const isExpression = hasMathOperators(value);

  const handleDigit = (digit: string) => {
    const raw = (value || '').trim();
    if (raw === '' || raw === '0') {
      onChange(digit);
    } else {
      onChange(raw + digit);
    }
  };

  const handleComma = () => {
    const raw = (value || '').trim();
    if (!raw || raw === '0') {
      onChange('0,');
      return;
    }
    // Check last token after any math operators
    const parts = raw.split(/[+×*÷\-\s]+/);
    const lastPart = parts[parts.length - 1];
    if (lastPart && !lastPart.includes(',') && !lastPart.includes('.')) {
      onChange(raw + ',');
    } else if (!lastPart) {
      onChange(raw + '0,');
    }
  };

  const handleBackspace = () => {
    const raw = (value || '').trim();
    if (!raw || raw === '0') {
      onChange('');
      return;
    }
    // If ends with operator and space (e.g. "100 + "), remove operator
    if (/[+×÷\-]\s*$/.test(raw)) {
      onChange(raw.replace(/[+×÷\-]\s*$/, '').trim());
      return;
    }
    const nextVal = raw.slice(0, -1).trim();
    onChange(nextVal);
  };

  const handleClear = () => {
    onChange('');
  };

  const handleOperator = (op: string) => {
    const raw = (value || '').trim();
    if (!raw) return;

    if (/[+×÷\-]\s*$/.test(raw)) {
      onChange(raw.replace(/[+×÷\-]\s*$/, `${op} `));
    } else {
      onChange(`${raw} ${op} `);
    }
  };

  const handleQuickDivide = (divisor: number) => {
    if (currentNum !== null && currentNum > 0) {
      const calculated = Math.round((currentNum / divisor) * 100) / 100;
      const formatted = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 })
        .format(calculated)
        .replace(/\s/g, ' ');
      onChange(formatted);
    } else if (value.trim() !== '') {
      const expr = `${value.trim()} ÷ ${divisor}`;
      const res = parseMathAmount(expr);
      if (res !== null) {
        onChange(res.toString());
      }
    }
  };

  const handleEvaluate = () => {
    const evaluated = parseMathAmount(value);
    if (evaluated !== null) {
      const formatted = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 })
        .format(evaluated)
        .replace(/\s/g, ' ');
      onChange(formatted);
    }
  };

  const isValueValid = Boolean(value && value.trim().length > 0 && value.trim() !== '0');

  return (
    <div className={`w-full flex flex-col gap-1.5 select-none ${className}`}>
      {/* Quick Splits / Math Actions & Live Result */}
      <div className="flex items-center justify-between gap-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickDivide(2)}
            disabled={!isValueValid}
            className="px-2.5 py-1 rounded-[10px] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[12px] font-bold text-[var(--text-primary)] border border-[var(--border-color)]/60 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0 shadow-2xs cursor-pointer"
            title="Dela på 2"
          >
            <span className="text-[var(--accent-color)]">÷</span>2
          </button>
          <button
            type="button"
            onClick={() => handleQuickDivide(3)}
            disabled={!isValueValid}
            className="px-2.5 py-1 rounded-[10px] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[12px] font-bold text-[var(--text-primary)] border border-[var(--border-color)]/60 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0 shadow-2xs cursor-pointer"
            title="Dela på 3"
          >
            <span className="text-[var(--accent-color)]">÷</span>3
          </button>
          <button
            type="button"
            onClick={() => handleQuickDivide(4)}
            disabled={!isValueValid}
            className="px-2.5 py-1 rounded-[10px] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[12px] font-bold text-[var(--text-primary)] border border-[var(--border-color)]/60 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0 shadow-2xs cursor-pointer"
            title="Dela på 4"
          >
            <span className="text-[var(--accent-color)]">÷</span>4
          </button>
        </div>

        {livePreview !== null ? (
          <button
            type="button"
            onClick={handleEvaluate}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[10px] bg-[var(--accent-color)] text-[var(--text-on-accent)] text-[12px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Verkställ beräkning"
          >
            <span>=</span>
            <span>{livePreview} {currency}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClear}
            disabled={!value || value === '0'}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[10px] bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-danger text-[11px] font-semibold border border-[var(--border-color)]/60 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Rensa belopp"
          >
            <RotateCcw size={12} strokeWidth={2} />
            <span>Rensa</span>
          </button>
        )}
      </div>

      {/* 4-Column Number & Operator Pad */}
      <div className="grid grid-cols-4 gap-1.5">
        {/* Row 1 */}
        <button
          type="button"
          onClick={() => handleDigit('7')}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-color)] text-[var(--text-primary)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleDigit('8')}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-color)] text-[var(--text-primary)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleDigit('9')}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-color)] text-[var(--text-primary)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          9
        </button>
        <button
          type="button"
          onClick={() => handleOperator('÷')}
          disabled={!isValueValid}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-muted)]/70 text-[var(--accent-color)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--accent-color)]/10 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-2xs cursor-pointer"
        >
          ÷
        </button>

        {/* Row 2 */}
        <button
          type="button"
          onClick={() => handleDigit('4')}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-color)] text-[var(--text-primary)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleDigit('5')}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-color)] text-[var(--text-primary)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleDigit('6')}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-color)] text-[var(--text-primary)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          6
        </button>
        <button
          type="button"
          onClick={() => handleOperator('×')}
          disabled={!isValueValid}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-muted)]/70 text-[var(--accent-color)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--accent-color)]/10 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-2xs cursor-pointer"
        >
          ×
        </button>

        {/* Row 3 */}
        <button
          type="button"
          onClick={() => handleDigit('1')}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-color)] text-[var(--text-primary)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleDigit('2')}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-color)] text-[var(--text-primary)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleDigit('3')}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-color)] text-[var(--text-primary)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          3
        </button>
        <button
          type="button"
          onClick={() => handleOperator('−')}
          disabled={!isValueValid}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-muted)]/70 text-[var(--accent-color)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--accent-color)]/10 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-2xs cursor-pointer"
        >
          −
        </button>

        {/* Row 4 */}
        <button
          type="button"
          onClick={handleComma}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-color)] text-[var(--text-primary)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          ,
        </button>
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-color)] text-[var(--text-primary)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all active:scale-95 shadow-2xs cursor-pointer"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className="h-11 sm:h-12 flex items-center justify-center text-[var(--text-secondary)] hover:text-danger bg-[var(--surface-color)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all active:scale-95 shadow-2xs cursor-pointer"
          title="Radera"
        >
          <Delete size={19} strokeWidth={2} />
        </button>
        {isExpression ? (
          <button
            type="button"
            onClick={handleEvaluate}
            className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-extrabold bg-[var(--accent-color)] text-[var(--text-on-accent)] rounded-[14px] border border-transparent shadow-xs hover:opacity-95 transition-all active:scale-95 cursor-pointer"
            title="Beräkna"
          >
            =
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleOperator('+')}
            disabled={!isValueValid}
            className="h-11 sm:h-12 flex items-center justify-center text-lg sm:text-xl font-bold bg-[var(--surface-muted)]/70 text-[var(--accent-color)] rounded-[14px] border border-[var(--border-color)]/50 hover:bg-[var(--accent-color)]/10 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-2xs cursor-pointer"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
