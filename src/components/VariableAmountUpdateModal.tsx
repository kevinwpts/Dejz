import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { BudgetItemLogo } from './BudgetItem';
import { Config } from '../types';
import { TranslationKey } from '../i18n';
import { formatAmount, parseAmount } from '../utils/format';
import { evaluateAndFormatAmount } from '../utils/mathUtils';
import { useScrollLock } from '../hooks/useScrollLock';
import { Button } from './ui';

interface VariableAmountUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  onSave: (amount: number) => void;
  config: Config;
  t: (key: TranslationKey) => string;
  periodName?: string;
}

export function VariableAmountUpdateModal({
  isOpen,
  onClose,
  item,
  onSave,
  config,
  t,
  periodName: _periodName
}: VariableAmountUpdateModalProps) {
  const [amount, setAmount] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen && item) {
      setAmount('');
    }
  }, [isOpen, item]);

  if (!item) return null;

  const handleSave = () => {
    const numValue = parseAmount(amount);
    const finalAmount = amount.trim() === '' ? Number(item.amount || 0) : numValue;
    onSave(finalAmount);
    onClose();
  };

  const defaultAmountText = formatAmount(item.amount || 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-transparent"
          />
          
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="bg-[var(--bg-color)] w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] border-none relative flex flex-col overflow-hidden shadow-2xl pb-0 font-sans text-[var(--text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Handle on Mobile */}
            <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

            {/* Clean, minimal header */}
            <div className="px-6 pt-4 pb-3 grid grid-cols-[40px_1fr_40px] items-center shrink-0 border-b border-black/[0.06] dark:border-white/[0.08]">
               <div className="w-9 h-9 bg-[var(--surface-color)] rounded-full flex items-center justify-center shadow-none shrink-0 overflow-hidden border-none">
                 <BudgetItemLogo item={item} type={item.budgetType === 'income' ? 'income' : 'expense'} config={config} />
               </div>
               <div className="flex flex-col items-center overflow-hidden px-2 text-center">
                 <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-[var(--text-primary)] truncate">
                   {item.name}
                 </h2>
               </div>
               <div className="flex justify-end">
                 <button
                   type="button"
                   onClick={onClose}
                   className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer border-none shadow-none"
                   aria-label={t('close')}
                 >
                   <X size={16} strokeWidth={2.5} />
                 </button>
               </div>
            </div>

            <div className="px-6 py-6 space-y-4">
              {/* Amount Input */}
              <div className="relative group overflow-hidden rounded-[16px]">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(formatAmount(e.target.value))}
                  onBlur={() => setAmount(evaluateAndFormatAmount(amount))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setAmount(evaluateAndFormatAmount(amount));
                      handleSave();
                    }
                  }}
                  placeholder={defaultAmountText}
                  className="w-full bg-[var(--surface-muted)] border border-[var(--border-color)] text-[var(--text-primary)] px-6 py-6 rounded-[16px] transition-all outline-none font-amount text-4xl sm:text-5xl font-bold tracking-tighter text-center pr-20 focus:border-[var(--accent-color)]"
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="text-xs font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-full">
                    {config.currency || 'kr'}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Action Button */}
            <div className="shrink-0 p-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom)+0.5rem)] sm:pb-5 border-t border-[var(--border-color)] bg-[var(--bg-color)]">
              <Button
                type="button"
                onClick={handleSave}
                variant="primary"
                fullWidth
                size="lg"
                icon={<Check size={18} strokeWidth={2} />}
              >
                {t('save')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
