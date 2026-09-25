import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Check, Plus, Tag } from 'lucide-react';
import { Config } from '../types';

interface QuickExpenseWidgetProps {
  config: Config;
  selectedDate: Date;
  onAddExpense: (amount: number, note?: string) => Promise<void> | void;
}

export function QuickExpenseWidget({
  config,
  selectedDate,
  onAddExpense,
}: QuickExpenseWidgetProps) {
  const [rawAmount, setRawAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentSuccess, setRecentSuccess] = useState<number | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const lang = config.language || 'sv';
  const isEn = lang === 'en';

  const isToday = React.useMemo(() => {
    return new Date(selectedDate).toDateString() === new Date().toDateString();
  }, [selectedDate]);

  // Clean numeric string into a float
  const numericAmount = React.useMemo(() => {
    if (!rawAmount) return 0;
    const clean = rawAmount.replace(/\s+/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed;
  }, [rawAmount]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Allow only digits, comma, period and spaces
    val = val.replace(/[^0-9.,]/g, '');
    // Ensure only one comma or period
    const parts = val.split(/[.,]/);
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setRawAmount(val);
  };

  const handlePresetClick = (addValue: number) => {
    if (numericAmount > 0) {
      setRawAmount(String(Math.round((numericAmount + addValue) * 100) / 100));
    } else {
      setRawAmount(String(addValue));
    }
    amountInputRef.current?.focus();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (numericAmount <= 0 || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const amountToSave = numericAmount;
      const cleanNote = note.trim();

      await onAddExpense(amountToSave, cleanNote);

      // Trigger temporary success state
      setRecentSuccess(amountToSave);
      setRawAmount('');
      setNote('');

      // Auto-hide success feedback after 2.5 seconds
      setTimeout(() => {
        setRecentSuccess(null);
      }, 2500);
    } catch (err) {
      console.error('Failed to quick-add expense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formattedDateStr = React.useMemo(() => {
    if (isToday) return null;
    return selectedDate.toLocaleDateString(isEn ? 'en-US' : 'sv-SE', {
      day: 'numeric',
      month: 'short',
    });
  }, [isToday, selectedDate, isEn]);

  return (
    <div
      className="bg-[var(--surface-color)] border border-[var(--border-color)]/80 rounded-[20px] p-3.5 sm:p-4 shadow-2xs transition-all relative overflow-hidden"
      id="quick_expense_widget"
    >
      {/* Header with Title & Category Meta */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Zap size={15} strokeWidth={2.2} />
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <h4 className="text-[13px] sm:text-[14px] font-bold text-[var(--text-primary)] tracking-tight truncate">
              {isEn ? 'Quick expense' : 'Snabb utgift'}
            </h4>
            <span className="text-[11px] font-medium text-[var(--text-secondary)] opacity-75 flex items-center gap-1 shrink-0">
              <Tag size={10} strokeWidth={2} />
              <span>{isEn ? 'Uncategorized' : 'Okategoriserat'}</span>
            </span>
          </div>
        </div>

        {/* Date Context or Success Micro-badge */}
        <AnimatePresence mode="wait">
          {recentSuccess !== null ? (
            <motion.div
              key="success-toast"
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold shrink-0"
            >
              <Check size={12} strokeWidth={2.5} />
              <span>
                {recentSuccess} {config.currency || 'kr'} {isEn ? 'registered!' : 'registrerad!'}
              </span>
            </motion.div>
          ) : formattedDateStr ? (
            <motion.span
              key="date-badge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full shrink-0"
            >
              {isEn ? `For ${formattedDateStr}` : `På ${formattedDateStr}`}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Amount Field */}
          <div className="relative flex-1 flex items-center bg-[var(--surface-muted)]/70 dark:bg-white/5 border border-[var(--border-color)]/70 hover:border-[var(--border-color)] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 rounded-xl px-3 py-2 transition-all">
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={rawAmount}
              onChange={handleAmountChange}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-[var(--text-primary)] font-bold text-lg sm:text-xl font-amount tabular-nums outline-none placeholder:text-[var(--text-secondary)]/35"
              id="quick_expense_amount_input"
              autoComplete="off"
            />
            <span className="text-xs font-bold text-[var(--text-secondary)] ml-1 select-none shrink-0 font-amount">
              {config.currency || 'kr'}
            </span>
          </div>

          {/* Optional Note / What was it? */}
          <div className="relative flex-[1.2] flex items-center bg-[var(--surface-muted)]/70 dark:bg-white/5 border border-[var(--border-color)]/70 hover:border-[var(--border-color)] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 rounded-xl px-3 py-2 transition-all">
            <input
              type="text"
              placeholder={isEn ? 'What was it? (optional)' : 'Vad köpte du? (valfritt)'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-[var(--text-primary)] text-sm font-medium outline-none placeholder:text-[var(--text-secondary)]/35"
              id="quick_expense_note_input"
              autoComplete="off"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={numericAmount <= 0 || isSubmitting}
            className={`h-10 sm:h-11 px-4 sm:px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 shrink-0 transition-all select-none ${
              numericAmount > 0
                ? 'bg-accent text-white shadow-xs hover:opacity-90 active:scale-95 cursor-pointer'
                : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]/40 cursor-not-allowed border border-[var(--border-color)]/40'
            }`}
            id="quick_expense_submit_btn"
          >
            {isSubmitting ? (
              <span className="text-xs">{isEn ? 'Saving...' : 'Sparar...'}</span>
            ) : recentSuccess !== null ? (
              <>
                <Check size={16} strokeWidth={2.5} />
                <span>{isEn ? 'Done' : 'Klar'}</span>
              </>
            ) : (
              <>
                <Plus size={16} strokeWidth={2.5} />
                <span>{isEn ? 'Register' : 'Registrera'}</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Amount Preset Chips */}
        <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto scrollbar-hide">
          <span className="text-[10px] font-semibold text-[var(--text-secondary)] opacity-50 uppercase tracking-wider select-none shrink-0 mr-1">
            {isEn ? 'Quick:' : 'Snabbt:'}
          </span>
          {[20, 50, 100, 200, 500].map((presetVal) => (
            <button
              key={presetVal}
              type="button"
              onClick={() => handlePresetClick(presetVal)}
              className="text-[11px] font-semibold font-amount tabular-nums text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)]/50 hover:bg-[var(--surface-muted)] border border-[var(--border-color)]/40 hover:border-[var(--border-color)] px-2.5 py-0.5 rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
            >
              +{presetVal}
            </button>
          ))}
          {rawAmount && (
            <button
              type="button"
              onClick={() => {
                setRawAmount('');
                setNote('');
              }}
              className="text-[10px] font-medium text-[var(--text-secondary)]/70 hover:text-rose-500 ml-auto transition-colors cursor-pointer select-none px-1"
            >
              {isEn ? 'Clear' : 'Rensa'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
