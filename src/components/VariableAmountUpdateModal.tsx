import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { BudgetItemLogo } from './BudgetItem';
import { Config } from '../types';
import { TranslationKey } from '../i18n';
import { formatAmount, parseAmount } from '../utils/format';
import { useScrollLock } from '../hooks/useScrollLock';
import { evaluateAndFormatAmount } from '../utils/mathUtils';
import { Button, IconButton } from './ui';

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
  periodName
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
    // If empty, use default item amount
    const finalAmount = amount.trim() === '' ? Number(item.amount || 0) : numValue;
    onSave(finalAmount);
    onClose();
  };

  const handleQuickPreset = () => {
    setAmount(formatAmount(item.amount || 0));
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
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="bg-white dark:bg-[#2D2D2D] w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] border-t sm:border border-black/[0.08] dark:border-white/[0.08] relative flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh] shadow-2xl pb-0 font-sans text-[var(--text-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Handle on Mobile */}
            <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

            {/* Clean Header */}
            <div className="px-6 pt-3 sm:pt-5 pb-4 grid grid-cols-[44px_1fr_44px] items-center shrink-0 border-b border-black/[0.06] dark:border-white/[0.08]">
               <div className="w-10 h-10 bg-black/5 dark:bg-[#2D2D2D] border border-black/10 dark:border-white/10 rounded-full flex items-center justify-center shadow-none shrink-0 overflow-hidden">
                 <BudgetItemLogo item={item} type={item.budgetType === 'income' ? 'income' : 'expense'} config={config} />
               </div>
               <div className="flex flex-col items-center overflow-hidden px-2 text-center">
                 <h2 className="text-base sm:text-lg font-bold text-[#1C1917] dark:text-white truncate tracking-tight">
                   {item.name}
                 </h2>
                 <span className="text-xs font-semibold text-[#05B862]">
                   {periodName ? `${periodName}` : (item.budgetType === 'income' ? (config.language === 'en' ? 'Income' : 'Inkomst') : t('fixedExpense'))}
                 </span>
               </div>
               <div className="flex justify-end">
                 <IconButton 
                   icon={<X size={18} strokeWidth={2} />}
                   onClick={onClose}
                   variant="muted"
                   size="sm"
                   aria-label={t('close')}
                 />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 custom-scrollbar touch-pan-y overscroll-contain min-h-0">
              {/* Amount Input */}
              <div className="space-y-3">
                <div className="relative group overflow-hidden rounded-[14px]">
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
                      }
                    }}
                    placeholder={defaultAmountText}
                    className="w-full bg-[var(--surface-muted)] border border-[var(--border-color)] text-[var(--text-primary)] px-6 py-7 rounded-[14px] transition-all outline-none font-amount text-4xl sm:text-5xl font-bold tracking-tighter text-center pr-20"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="text-xs font-semibold text-accent bg-accent/10 px-3 py-1.5 rounded-full">
                      {config.currency || 'kr'}
                    </span>
                  </div>
                </div>

                {/* Clean Standard Amount Shortcut Pill */}
                {item.amount && (
                  <div className="flex justify-center pt-1">
                    <button
                      type="button"
                      onClick={handleQuickPreset}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border-color)] transition-all cursor-pointer active:scale-95"
                    >
                      <span>Standardbelopp:</span>
                      <span className="font-bold text-[var(--text-primary)]">{defaultAmountText} {config.currency || 'kr'}</span>
                    </button>
                  </div>
                )}
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
                icon={<Check size={18} strokeWidth={2.5} />}
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
