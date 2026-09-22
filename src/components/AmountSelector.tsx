import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { X, Check, Keyboard, Sparkles } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { feedback } from '../utils/feedback';
import { formatAmount, parseAmount } from '../utils/format';

interface AmountSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  maxAmount: number;
  currency: string;
  t: (key: TranslationKey, options?: Record<string, string | number>) => string;
  title: string;
  remainingDays?: number;
  theme?: 'default';
}

export function AmountSelector({
  isOpen,
  onClose,
  onConfirm,
  maxAmount,
  currency,
  t,
  title,
  remainingDays,
  _theme = 'default'
}: AmountSelectorProps) {
  const [amount, setAmount] = useState(0);
  const [isManualInput, setIsManualInput] = useState(false);
  const [inputValue, setInputValue] = useState('0');
  const inputRef = useRef<HTMLInputElement>(null);

  const accentClass = 'text-accent';
  const _borderClass = 'border-accent';
  const bgClass = 'bg-accent/5';
  const borderLightClass = 'border-accent/10';
  const bgLightClass = 'bg-accent/10';
  const btnBgClass = 'bg-[var(--accent-color)]';
  const btnTextClass = 'text-[var(--text-on-accent)]';
  const accentColorVar = 'var(--accent-color)';
  
  // Simple background
  const modalBgClass = 'bg-[var(--bg-secondary)]';

  useEffect(() => {
    if (isOpen) {
      setAmount(0);
      setInputValue('0');
      setIsManualInput(false);
    }
  }, [isOpen]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value !== amount) {
      feedback.slider();
    }
    setAmount(value);
    setInputValue(formatAmount(value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmount(e.target.value);
    setInputValue(formatted);
    const numValue = parseAmount(formatted);
    setAmount(Math.min(maxAmount, numValue));
  };

  const handleInputBlur = () => {
    setIsManualInput(false);
    const parsed = parseAmount(inputValue);
    if (parsed > maxAmount) {
      setInputValue(formatAmount(maxAmount));
      setAmount(maxAmount);
    }
  };

  const handleConfirm = () => {
    feedback.tap();
    onConfirm(amount);
    onClose();
  };

  useEffect(() => {
    if (isManualInput && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isManualInput]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" 
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`w-full max-w-sm ${modalBgClass} rounded-[28px] p-6 border border-[var(--border-color)] overflow-hidden shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pb-4">
              <div className="w-full flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-accent text-[var(--text-on-accent)]`}>
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">{title}</h3>
                </div>
                <button 
                  onClick={onClose} 
                  className="w-9 h-9 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--border-color)] transition-colors cursor-pointer"
                >
                  <X size={18} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="w-full flex flex-col items-center space-y-6 mb-6 relative z-10">
              <div 
                className="text-center w-full"
                
              >
                {isManualInput ? (
                  <div className="flex items-center justify-center gap-2 bg-[var(--surface-color)] p-4 rounded-[16px] border border-[var(--border-color)] focus-within:border-accent transition-all">
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="numeric"
                      value={inputValue}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      onKeyDown={(e) => e.key === 'Enter' && handleInputBlur()}
                      className={`text-4xl font-semibold ${accentClass} bg-transparent w-48 text-center focus:outline-none font-amount`}
                    />
                  </div>
                ) : (
                  <div 
                    onClick={() => setIsManualInput(true)}
                    className="flex flex-col items-center cursor-pointer group bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] p-5 rounded-[16px] border border-[var(--border-color)] hover:border-accent/30 transition-all"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className={`text-5xl font-semibold text-[var(--text-primary)] font-amount group-hover:${accentClass} transition-colors`}>
                        {formatAmount(amount)}
                      </span>
                      <span className="text-xl font-semibold text-[var(--text-secondary)] opacity-50">
                        {currency}
                      </span>
                    </div>
                    <span className={`text-xs font-medium ${accentClass} mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 bg-[var(--surface-muted)] px-3 py-1 rounded-full`}>
                      <Keyboard size={14} /> {t('manualInput')}
                    </span>
                  </div>
                )}
              </div>

              {remainingDays && remainingDays > 0 && amount > 0 && (
                <div
                  
                  className={`${bgClass} border ${borderLightClass} rounded-[16px] p-4 w-full text-center relative overflow-hidden`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full bg-accent`} />
                  <p className={`text-xs font-medium ${accentClass} mb-2`}>{t('economyImpact')}</p>
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-baseline gap-1.5 bg-[var(--surface-color)] px-3 py-1.5 rounded-full border border-[var(--border-color)]">
                      <span className={`text-xl font-semibold ${accentClass} font-amount`}>
                        -{Math.round(amount / remainingDays)} {currency}
                      </span>
                      <span className={`text-xs font-semibold ${accentClass} opacity-70`}>/ dag</span>
                    </div>
                    <span className="text-[11px] font-medium text-[var(--text-secondary)] mt-2 max-w-[250px] leading-relaxed">
                      {t('dailyBudgetImpact', { days: remainingDays === 1 ? 'den återstående dagen' : `de återstående ${remainingDays} dagarna` })}
                    </span>
                  </div>
                </div>
              )}

              <div className="w-full px-1 space-y-4">
                <div className="relative h-12 flex items-center bg-[var(--surface-color)] px-4 rounded-[12px] border border-[var(--border-color)]">
                  <input
                    type="range"
                    min="0"
                    max={maxAmount}
                    value={amount}
                    onChange={handleSliderChange}
                    className="w-full h-2.5 bg-[var(--surface-muted)] rounded-[8px] appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${accentColorVar} 0%, ${accentColorVar} ${maxAmount > 0 ? (amount / maxAmount) * 100 : 0}%, var(--surface-muted) ${maxAmount > 0 ? (amount / maxAmount) * 100 : 0}%, var(--surface-muted) 100%)`
                    }}
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">0 {currency}</span>
                  <button 
                    onClick={() => {
                      setAmount(maxAmount);
                      setInputValue(maxAmount.toString());
                    }}
                    className={`px-3 py-1 ${bgLightClass} ${accentClass} rounded-full text-xs font-medium hover:bg-accent/20 transition-all active:scale-95`}
                  >
                    Max
                  </button>
                  <span className="text-xs font-medium text-[var(--text-secondary)]">{maxAmount.toLocaleString('sv-SE')} {currency}</span>
                </div>
              </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-3 relative z-10">
              <button
                onClick={onClose}
                className="py-3 rounded-[12px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-color)] border border-[var(--border-color)] hover:bg-[var(--surface-muted)] active:scale-95 transition-all text-xs"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={amount <= 0}
                className={`${btnBgClass} ${btnTextClass} py-3 rounded-[12px] font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 hover:brightness-110 text-xs`}
              >
                <Check size={18} strokeWidth={2.5} />
                {t('confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
