import React from 'react';
import { motion } from 'motion/react';
import { parseMathAmount, hasMathOperators, formatLiveMathPreview } from '../utils/mathUtils';

interface QuickMathToolbarProps {
  value: string;
  onChange: (newValue: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  currency?: string;
  className?: string;
  showMathTools?: boolean;
}

export const QuickMathToolbar: React.FC<QuickMathToolbarProps> = ({
  value,
  onChange,
  inputRef,
  currency = 'kr',
  className = '',
  showMathTools = true,
}) => {
  const livePreview = formatLiveMathPreview(value);
  const currentNum = parseMathAmount(value);

  // Focus input helper to ensure keyboard stays open on mobile/web
  const keepFocus = () => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const preventBlur = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  // Quick divide action (e.g. ÷ 2)
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
    keepFocus();
  };

  // Append operator to value
  const handleAppendOperator = (operator: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // Replace last operator if already ending with an operator
    if (/[+×÷-]\s*$/.test(trimmed)) {
      const updated = trimmed.replace(/[+×÷-]\s*$/, `${operator} `);
      onChange(updated);
    } else {
      onChange(`${trimmed} ${operator} `);
    }
    keepFocus();
  };

  // Evaluate expression
  const handleEvaluate = () => {
    const evaluated = parseMathAmount(value);
    if (evaluated !== null) {
      const formatted = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 })
        .format(evaluated)
        .replace(/\s/g, ' ');
      onChange(formatted);
    }
    keepFocus();
  };

  const isValueValid = value.trim().length > 0;

  return (
    <div className={`w-full flex flex-col items-center gap-2 mt-2 ${className}`}>
      {/* Live Math Calculation Result Badge */}
      {livePreview !== null && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          onMouseDown={preventBlur}
          onClick={handleEvaluate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-xs font-bold border border-[var(--accent-color)]/30 hover:bg-[var(--accent-color)] hover:text-white transition-all shadow-sm cursor-pointer active:scale-95"
          title="Klicka för att använda beräknat belopp"
        >
          <span className="font-extrabold text-sm">=</span>
          <span className="text-sm">{livePreview} {currency}</span>
          <span className="text-[10px] opacity-80 font-normal ml-1 bg-white/20 px-1.5 py-0.5 rounded-md">Verkställ</span>
        </motion.button>
      )}

      {/* Quick Operator Toolbar Bar */}
      {showMathTools && (
        <div className="w-full flex items-center justify-center gap-1.5 overflow-x-auto py-1 px-1 no-scrollbar">
          {/* Quick Division Chips */}
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => handleQuickDivide(2)}
            disabled={!isValueValid}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--surface-color)] hover:bg-[var(--bg-hover)] text-xs font-bold text-[var(--text-primary)] border border-[var(--border-strong)] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0 shadow-sm cursor-pointer"
            title="Dela på 2"
          >
            <span className="text-[var(--accent-color)]">÷</span>2
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => handleQuickDivide(3)}
            disabled={!isValueValid}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--surface-color)] hover:bg-[var(--bg-hover)] text-xs font-bold text-[var(--text-primary)] border border-[var(--border-strong)] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0 shadow-sm cursor-pointer"
            title="Dela på 3"
          >
            <span className="text-[var(--accent-color)]">÷</span>3
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => handleQuickDivide(4)}
            disabled={!isValueValid}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--surface-color)] hover:bg-[var(--bg-hover)] text-xs font-bold text-[var(--text-primary)] border border-[var(--border-strong)] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0 shadow-sm cursor-pointer"
            title="Dela på 4"
          >
            <span className="text-[var(--accent-color)]">÷</span>4
          </button>

          <div className="h-4 w-[1px] bg-[var(--border-color)] mx-0.5 shrink-0" />

          {/* Math Operators */}
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => handleAppendOperator('+')}
            disabled={!isValueValid}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--surface-color)] hover:bg-[var(--bg-hover)] text-base font-bold text-[var(--text-primary)] border border-[var(--border-strong)] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0 shadow-sm cursor-pointer"
            title="Plus (+)"
          >
            +
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => handleAppendOperator('-')}
            disabled={!isValueValid}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--surface-color)] hover:bg-[var(--bg-hover)] text-base font-bold text-[var(--text-primary)] border border-[var(--border-strong)] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0 shadow-sm cursor-pointer"
            title="Minus (-)"
          >
            −
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => handleAppendOperator('×')}
            disabled={!isValueValid}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--surface-color)] hover:bg-[var(--bg-hover)] text-base font-bold text-[var(--text-primary)] border border-[var(--border-strong)] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0 shadow-sm cursor-pointer"
            title="Gånger (×)"
          >
            ×
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => handleAppendOperator('÷')}
            disabled={!isValueValid}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--surface-color)] hover:bg-[var(--bg-hover)] text-base font-bold text-[var(--text-primary)] border border-[var(--border-strong)] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none shrink-0 shadow-sm cursor-pointer"
            title="Delat med (÷)"
          >
            ÷
          </button>

          {/* Equal button if expression exists */}
          {hasMathOperators(value) && (
            <button
              type="button"
              onMouseDown={preventBlur}
              onClick={handleEvaluate}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--accent-color)] text-white text-xs font-extrabold transition-all active:scale-95 shrink-0 shadow-md cursor-pointer ml-1"
              title="Verkställ beräkning"
            >
              =
            </button>
          )}
        </div>
      )}
    </div>
  );
};
