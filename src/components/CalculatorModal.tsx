import React, { useState } from 'react';
import { motion } from 'motion/react';

import { X, Delete, Divide, Minus, Plus, X as Multiply, Equal, Percent } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: any) => string;
}

export function CalculatorModal({ _isOpen, onClose, _t }: CalculatorModalProps) {
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
    { label: <Delete size={20} />, action: handleDelete, type: 'special' },
    { label: <Percent size={20} />, action: handlePercent, type: 'special' },
    { label: <Divide size={20} />, action: () => handleOperator('÷'), type: 'operator' },
    { label: '7', action: () => handleNumber('7'), type: 'number' },
    { label: '8', action: () => handleNumber('8'), type: 'number' },
    { label: '9', action: () => handleNumber('9'), type: 'number' },
    { label: <Multiply size={20} />, action: () => handleOperator('×'), type: 'operator' },
    { label: '4', action: () => handleNumber('4'), type: 'number' },
    { label: '5', action: () => handleNumber('5'), type: 'number' },
    { label: '6', action: () => handleNumber('6'), type: 'number' },
    { label: <Minus size={20} />, action: () => handleOperator('-'), type: 'operator' },
    { label: '1', action: () => handleNumber('1'), type: 'number' },
    { label: '2', action: () => handleNumber('2'), type: 'number' },
    { label: '3', action: () => handleNumber('3'), type: 'number' },
    { label: <Plus size={20} />, action: () => handleOperator('+'), type: 'operator' },
    { label: '0', action: () => handleNumber('0'), type: 'number', wide: true },
    { label: '.', action: () => handleNumber('.'), type: 'number' },
    { label: <Equal size={20} />, action: handleEqual, type: 'equal' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
          <div
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-white dark:bg-[#1E1B22] w-full max-w-[320px] rounded-[28px] overflow-hidden border border-black/[0.08] dark:border-white/[0.08] overscroll-contain shadow-2xl font-sans"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#1C1917] dark:text-white">Kalkylator</h3>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white transition-colors cursor-pointer">
                  <X size={16} strokeWidth={2} />
                </button>
              </div>

              <div className="bg-[var(--surface-muted)] p-5 rounded-[16px] border border-[var(--border-color)] text-right space-y-1">
                <div className="text-xs font-medium text-[var(--text-tertiary)] h-4 overflow-hidden">
                  {equation}
                </div>
                <div className="text-3xl font-semibold text-[var(--text-primary)] font-amount truncate">
                  {display}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {buttons.map((btn, i) => (
                  <button
                    key={i}
                    onClick={btn.action}
                    className={`
                      h-12 flex items-center justify-center rounded-[12px] font-semibold text-base transition-all active:scale-95 cursor-pointer
                      ${btn.wide ? 'col-span-2' : ''}
                      ${btn.type === 'number' ? 'bg-[var(--surface-color)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)]' : ''}
                      ${btn.type === 'operator' ? 'bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20' : ''}
                      ${btn.type === 'special' ? 'bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]' : ''}
                      ${btn.type === 'equal' ? 'bg-accent text-[var(--text-on-accent)]' : ''}
                    `}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
    </motion.div>
  );
}
