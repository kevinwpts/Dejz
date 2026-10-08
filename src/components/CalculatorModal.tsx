import React, { useState } from 'react';
import { Delete, Divide, Minus, Plus, X as Multiply, Equal, Percent } from 'lucide-react';
import { Modal } from './ui';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  t?: (key: any) => string;
}

export function CalculatorModal({ isOpen, onClose }: CalculatorModalProps) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  const handleNumber = (num: string) => {
    if (display === '0' || isFinished) {
      setDisplay(num);
      setIsFinished(false);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
    setIsFinished(false);
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setIsFinished(false);
  };

  const handleDelete = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleEqual = () => {
    try {
      const fullEquation = equation + display;
      // Replace symbols for eval
      const evalEquation = fullEquation.replace(/×/g, '*').replace(/÷/g, '/');
      const result = new Function(`return ${evalEquation}`)();
      setDisplay(String(Number(result.toFixed(8))));
      setEquation('');
      setIsFinished(true);
    } catch (_e) {
      setDisplay('Error');
      setEquation('');
      setIsFinished(true);
    }
  };

  const handlePercent = () => {
    setDisplay(String(Number(display) / 100));
  };

  const buttons = [
    { label: 'C', action: handleClear, type: 'special' },
    { label: <Delete size={20} strokeWidth={2} />, action: handleDelete, type: 'special' },
    { label: <Percent size={20} strokeWidth={2} />, action: handlePercent, type: 'special' },
    { label: <Divide size={20} strokeWidth={2} />, action: () => handleOperator('÷'), type: 'operator' },
    { label: '7', action: () => handleNumber('7'), type: 'number' },
    { label: '8', action: () => handleNumber('8'), type: 'number' },
    { label: '9', action: () => handleNumber('9'), type: 'number' },
    { label: <Multiply size={20} strokeWidth={2} />, action: () => handleOperator('×'), type: 'operator' },
    { label: '4', action: () => handleNumber('4'), type: 'number' },
    { label: '5', action: () => handleNumber('5'), type: 'number' },
    { label: '6', action: () => handleNumber('6'), type: 'number' },
    { label: <Minus size={20} strokeWidth={2} />, action: () => handleOperator('-'), type: 'operator' },
    { label: '1', action: () => handleNumber('1'), type: 'number' },
    { label: '2', action: () => handleNumber('2'), type: 'number' },
    { label: '3', action: () => handleNumber('3'), type: 'number' },
    { label: <Plus size={20} strokeWidth={2} />, action: () => handleOperator('+'), type: 'operator' },
    { label: '0', action: () => handleNumber('0'), type: 'number', wide: true },
    { label: '.', action: () => handleNumber('.'), type: 'number' },
    { label: <Equal size={20} strokeWidth={2} />, action: handleEqual, type: 'equal' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      center
      size="xs"
      title="Kalkylator"
      showCloseButton={true}
      bodyClassName="p-5 space-y-4"
    >
      <div className="bg-black/[0.04] dark:bg-white/[0.06] p-4 rounded-[8px] border border-black/5 dark:border-white/10 text-right space-y-1">
        <div className="text-xs font-medium text-[var(--text-tertiary)] h-4 overflow-hidden tabular-nums">
          {equation}
        </div>
        <div className="text-3xl font-bold text-[var(--text-primary)] font-amount tabular-nums truncate">
          {display}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {buttons.map((btn, i) => (
          <button
            key={i}
            type="button"
            onClick={btn.action}
            className={`
              h-12 flex items-center justify-center rounded-[8px] font-semibold text-base transition-all active:scale-[0.95] cursor-pointer
              ${btn.wide ? 'col-span-2' : ''}
              ${btn.type === 'number' ? 'bg-white dark:bg-white/5 text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 border border-black/5 dark:border-white/5 shadow-xs' : ''}
              ${btn.type === 'operator' ? 'bg-[var(--accent-color)]/10 text-[var(--accent-color)] hover:bg-[var(--accent-color)]/20 border border-[var(--accent-color)]/20' : ''}
              ${btn.type === 'special' ? 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-black/5 dark:border-white/5' : ''}
              ${btn.type === 'equal' ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-xs' : ''}
            `}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
