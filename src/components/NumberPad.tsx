import React from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import { parseMathAmount, formatLiveMathPreview } from '../utils/mathUtils';

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
    if (/[+×÷-]\s*$/.test(raw)) {
      onChange(raw.replace(/[+×÷-]\s*$/, '').trim());
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

    if (/[+×÷-]\s*$/.test(raw)) {
      onChange(raw.replace(/[+×÷-]\s*$/, `${op} `));
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
    <div className={`w-full flex flex-col gap-2 select-none ${className}`}>
      {/* Live calculation banner if expression active */}
      {livePreview !== null && (
        <button
          type="button"
          onClick={handleEvaluate}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-[14px] bg-[var(--accent-color)] text-[var(--text-on-accent)] text-xs font-bold shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          title="Klicka för att verkställa beräkningen"
        >
          <span className="opacity-90">Beräknat belopp:</span>
          <span className="text-sm font-extrabold flex items-center gap-1">
            = {livePreview} {currency}
            <span className="text-[10px] font-normal bg-white/20 px-1.5 py-0.5 rounded-md ml-1.5">Verkställ</span>
          </span>
        </button>
      )}

      {/* Operators & Splits Toolbar (Placed above the full-width number pad) */}
      <div className="grid grid-cols-8 gap-1.5 w-full">
        {/* Quick Splits */}
        <button
          type="button"
          onClick={() => handleQuickDivide(2)}
          disabled={!isValueValid}
          className="h-9 flex items-center justify-center rounded-[12px] bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] text-[11px] sm:text-xs font-semibold text-[#1C1917] dark:text-white border border-[#E6E2D8]/60 dark:border-white/[0.06] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Dela på 2"
        >
          <span>÷2</span>
        </button>
        <button
          type="button"
          onClick={() => handleQuickDivide(3)}
          disabled={!isValueValid}
          className="h-9 flex items-center justify-center rounded-[12px] bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] text-[11px] sm:text-xs font-semibold text-[#1C1917] dark:text-white border border-[#E6E2D8]/60 dark:border-white/[0.06] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Dela på 3"
        >
          <span>÷3</span>
        </button>
        <button
          type="button"
          onClick={() => handleQuickDivide(4)}
          disabled={!isValueValid}
          className="h-9 flex items-center justify-center rounded-[12px] bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] text-[11px] sm:text-xs font-semibold text-[#1C1917] dark:text-white border border-[#E6E2D8]/60 dark:border-white/[0.06] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Dela på 4"
        >
          <span>÷4</span>
        </button>

        {/* Math Operators: ÷, ×, −, + */}
        <button
          type="button"
          onClick={() => handleOperator('÷')}
          disabled={!isValueValid}
          className="h-9 flex items-center justify-center text-sm font-semibold bg-black/5 dark:bg-white/[0.04] text-[#1C1917] dark:text-white rounded-[12px] border border-[#E6E2D8]/60 dark:border-white/[0.06] hover:bg-black/10 dark:hover:bg-white/[0.08] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Delat med (÷)"
        >
          ÷
        </button>
        <button
          type="button"
          onClick={() => handleOperator('×')}
          disabled={!isValueValid}
          className="h-9 flex items-center justify-center text-sm font-semibold bg-black/5 dark:bg-white/[0.04] text-[#1C1917] dark:text-white rounded-[12px] border border-[#E6E2D8]/60 dark:border-white/[0.06] hover:bg-black/10 dark:hover:bg-white/[0.08] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Gånger (×)"
        >
          ×
        </button>
        <button
          type="button"
          onClick={() => handleOperator('−')}
          disabled={!isValueValid}
          className="h-9 flex items-center justify-center text-sm font-semibold bg-black/5 dark:bg-white/[0.04] text-[#1C1917] dark:text-white rounded-[12px] border border-[#E6E2D8]/60 dark:border-white/[0.06] hover:bg-black/10 dark:hover:bg-white/[0.08] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Minus (−)"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => handleOperator('+')}
          disabled={!isValueValid}
          className="h-9 flex items-center justify-center text-sm font-semibold bg-black/5 dark:bg-white/[0.04] text-[#1C1917] dark:text-white rounded-[12px] border border-[#E6E2D8]/60 dark:border-white/[0.06] hover:bg-black/10 dark:hover:bg-white/[0.08] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Plus (+)"
        >
          +
        </button>

        {/* Clear / Reset Action */}
        <button
          type="button"
          onClick={handleClear}
          disabled={!value || value === '0'}
          className="h-9 flex items-center justify-center rounded-[12px] bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.08] text-[#6E6961] dark:text-[#9CA6BC] hover:text-rose-500 text-xs font-medium border border-[#E6E2D8]/60 dark:border-white/[0.06] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          title="Rensa belopp"
        >
          <RotateCcw size={13} strokeWidth={2} />
        </button>
      </div>

      {/* Full-Width 3-Column Number Pad with Soft Surface Buttons */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {/* Row 1: 1, 2, 3 */}
        <button
          type="button"
          onClick={() => handleDigit('1')}
          className="h-[50px] sm:h-[54px] flex items-center justify-center text-xl sm:text-2xl font-bold bg-white dark:bg-white/[0.06] text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-white/[0.08] rounded-[16px] hover:bg-[#F7F5F0] dark:hover:bg-white/[0.1] shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          1
        </button>
        <button
          type="button"
          onClick={() => handleDigit('2')}
          className="h-[50px] sm:h-[54px] flex items-center justify-center text-xl sm:text-2xl font-bold bg-white dark:bg-white/[0.06] text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-white/[0.08] rounded-[16px] hover:bg-[#F7F5F0] dark:hover:bg-white/[0.1] shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          2
        </button>
        <button
          type="button"
          onClick={() => handleDigit('3')}
          className="h-[50px] sm:h-[54px] flex items-center justify-center text-xl sm:text-2xl font-bold bg-white dark:bg-white/[0.06] text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-white/[0.08] rounded-[16px] hover:bg-[#F7F5F0] dark:hover:bg-white/[0.1] shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          3
        </button>

        {/* Row 2: 4, 5, 6 */}
        <button
          type="button"
          onClick={() => handleDigit('4')}
          className="h-[50px] sm:h-[54px] flex items-center justify-center text-xl sm:text-2xl font-bold bg-white dark:bg-white/[0.06] text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-white/[0.08] rounded-[16px] hover:bg-[#F7F5F0] dark:hover:bg-white/[0.1] shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          4
        </button>
        <button
          type="button"
          onClick={() => handleDigit('5')}
          className="h-[50px] sm:h-[54px] flex items-center justify-center text-xl sm:text-2xl font-bold bg-white dark:bg-white/[0.06] text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-white/[0.08] rounded-[16px] hover:bg-[#F7F5F0] dark:hover:bg-white/[0.1] shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          5
        </button>
        <button
          type="button"
          onClick={() => handleDigit('6')}
          className="h-[50px] sm:h-[54px] flex items-center justify-center text-xl sm:text-2xl font-bold bg-white dark:bg-white/[0.06] text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-white/[0.08] rounded-[16px] hover:bg-[#F7F5F0] dark:hover:bg-white/[0.1] shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          6
        </button>

        {/* Row 3: 7, 8, 9 */}
        <button
          type="button"
          onClick={() => handleDigit('7')}
          className="h-[50px] sm:h-[54px] flex items-center justify-center text-xl sm:text-2xl font-bold bg-white dark:bg-white/[0.06] text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-white/[0.08] rounded-[16px] hover:bg-[#F7F5F0] dark:hover:bg-white/[0.1] shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          7
        </button>
        <button
          type="button"
          onClick={() => handleDigit('8')}
          className="h-[50px] sm:h-[54px] flex items-center justify-center text-xl sm:text-2xl font-bold bg-white dark:bg-white/[0.06] text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-white/[0.08] rounded-[16px] hover:bg-[#F7F5F0] dark:hover:bg-white/[0.1] shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          8
        </button>
        <button
          type="button"
          onClick={() => handleDigit('9')}
          className="h-[50px] sm:h-[54px] flex items-center justify-center text-xl sm:text-2xl font-bold bg-white dark:bg-white/[0.06] text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-white/[0.08] rounded-[16px] hover:bg-[#F7F5F0] dark:hover:bg-white/[0.1] shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          9
        </button>

        {/* Row 4: Comma, 0, Backspace */}
        <button
          type="button"
          onClick={handleComma}
          className="h-[50px] sm:h-[54px] flex items-center justify-center text-xl sm:text-2xl font-bold bg-white dark:bg-white/[0.06] text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-white/[0.08] rounded-[16px] hover:bg-[#F7F5F0] dark:hover:bg-white/[0.1] shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          ,
        </button>
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-[50px] sm:h-[54px] flex items-center justify-center text-xl sm:text-2xl font-bold bg-white dark:bg-white/[0.06] text-[#1C1917] dark:text-white border border-[#E6E2D8] dark:border-white/[0.08] rounded-[16px] hover:bg-[#F7F5F0] dark:hover:bg-white/[0.1] shadow-2xs transition-all active:scale-95 cursor-pointer"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className="h-[50px] sm:h-[54px] flex items-center justify-center text-[#6E6961] dark:text-[#9CA6BC] hover:text-[#1C1917] dark:hover:text-white bg-white dark:bg-white/[0.06] border border-[#E6E2D8] dark:border-white/[0.08] rounded-[16px] hover:bg-[#F7F5F0] dark:hover:bg-white/[0.1] shadow-2xs transition-all active:scale-95 cursor-pointer"
          title="Radera"
        >
          <Delete size={22} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
