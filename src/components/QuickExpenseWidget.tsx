import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Check, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { Config, Transaction } from '../types';
import { parseQuickExpense } from '../utils/expenseAiParser';
import { feedback } from '../utils/feedback';

interface QuickExpenseWidgetProps {
  config: Config;
  selectedDate: Date;
  allTransactions?: Transaction[];
  onAddExpense: (amount: number, note?: string, category?: string) => Promise<void> | void;
  onAddIncome?: (date?: Date) => void;
  onOpenFullExpenseForm?: (date?: Date) => void;
}

export function QuickExpenseWidget({
  config,
  selectedDate,
  allTransactions = [],
  onAddExpense,
  onAddIncome,
  onOpenFullExpenseForm,
}: QuickExpenseWidgetProps) {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ amount: number; merchant: string; category: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lang = config.language || 'sv';
  const isEn = lang === 'en';
  const defaultCategory = isEn ? 'Uncategorized' : 'Okategoriserat';

  const isToday = useMemo(() => {
    return new Date(selectedDate).toDateString() === new Date().toDateString();
  }, [selectedDate]);

  const formattedDateStr = useMemo(() => {
    if (isToday) return null;
    return selectedDate.toLocaleDateString(isEn ? 'en-US' : 'sv-SE', {
      day: 'numeric',
      month: 'short',
    });
  }, [isToday, selectedDate, isEn]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputText.trim();
    if (!clean || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Parse with Swedish brand base -> user history -> Google AI Edge function -> fallback
      const parsed = await parseQuickExpense(
        clean,
        config.categories || [],
        allTransactions,
        defaultCategory
      );

      if (!parsed.amount || parsed.amount <= 0) {
        setErrorMessage(isEn ? 'Please specify an amount (e.g. 300kr Coop)' : 'Ange ett belopp (t.ex. 300kr Coop)');
        setIsProcessing(false);
        inputRef.current?.focus();
        return;
      }

      // Add expense
      await onAddExpense(parsed.amount, parsed.merchant, parsed.category);
      feedback.success();

      // Show temporary feedback toast
      setSuccessInfo({
        amount: parsed.amount,
        merchant: parsed.merchant,
        category: parsed.category,
      });
      setInputText('');

      setTimeout(() => {
        setSuccessInfo(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to quick-add expense:', err);
      setErrorMessage(isEn ? 'Could not save expense' : 'Kunde inte spara utgiften');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="bg-[var(--surface-color)] border border-[var(--border-color)]/80 rounded-[20px] p-3.5 sm:p-4 shadow-2xs transition-all relative"
      id="quick_expense_widget"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Zap size={14} strokeWidth={2.2} />
          </div>
          <h4 className="text-[13px] sm:text-[14px] font-bold text-[var(--text-primary)] tracking-tight">
            {isEn ? 'Quick expense' : 'Snabb utgift'}
          </h4>

          {/* Date context if not today */}
          {formattedDateStr && (
            <span className="text-[11px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full shrink-0">
              {isEn ? `For ${formattedDateStr}` : `På ${formattedDateStr}`}
            </span>
          )}
        </div>

        {/* Discrete Secondary Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onAddIncome && (
            <button
              type="button"
              onClick={() => onAddIncome(selectedDate)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              title={isEn ? 'Add income' : 'Lägg till inkomst'}
            >
              <Plus size={12} strokeWidth={2.8} />
              <span>{isEn ? 'Income' : 'Inkomst'}</span>
            </button>
          )}
          {onOpenFullExpenseForm && (
            <button
              type="button"
              onClick={() => onOpenFullExpenseForm(selectedDate)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)]/80 hover:bg-[var(--surface-muted)] border border-[var(--border-color)]/60 active:scale-95 transition-all cursor-pointer"
              title={isEn ? 'Detailed form' : 'Detaljerat formulär'}
            >
              <span>{isEn ? 'More' : 'Fler val'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Single Input Field Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center bg-[var(--surface-muted)]/70 dark:bg-white/5 border border-[var(--border-color)]/70 hover:border-[var(--border-color)] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 rounded-xl transition-all pl-3.5 pr-1.5 py-1.5 min-h-[44px]">
          <input
            ref={inputRef}
            type="text"
            placeholder={isEn ? 'e.g. 300kr Coop, 45 Coffee, SL 42...' : 't.ex. 300kr Coop, 45 kaffe, SL 42...'}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-[var(--text-primary)] text-sm sm:text-[14.5px] font-medium outline-none placeholder:text-[var(--text-secondary)]/40 pr-2"
            id="quick_expense_smart_input"
            autoComplete="off"
            disabled={isProcessing}
          />

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            aria-label={isEn ? 'Add' : 'Lägg till'}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg font-bold flex items-center justify-center shrink-0 transition-all select-none ${
              inputText.trim() && !isProcessing
                ? 'bg-accent text-white shadow-xs hover:opacity-90 active:scale-95 cursor-pointer'
                : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]/30 cursor-not-allowed border border-[var(--border-color)]/40'
            }`}
            id="quick_expense_submit_btn"
          >
            {isProcessing ? (
              <Sparkles size={15} className="animate-spin text-white" />
            ) : (
              <Plus size={18} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </form>

      {/* Instant Success Feedback Toast */}
      <AnimatePresence>
        {successInfo && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-semibold"
          >
            <Check size={14} strokeWidth={2.5} className="shrink-0" />
            <span className="truncate">
              {isEn ? 'Added' : 'Lade till'}{' '}
              <strong className="font-bold">{successInfo.amount} {config.currency || 'kr'}</strong>{' '}
              {successInfo.merchant !== 'Snabb utgift' && <>({successInfo.merchant}) </>}
              {successInfo.category && <span className="opacity-80 font-normal">under {successInfo.category}</span>} ✨
            </span>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-medium"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
