import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, MinusCircle, PlusCircle, Zap } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { formatAmount } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';
import { DejziAvatar } from './DejziSummaryModal';
import { parseQuickExpense } from '../utils/expenseAiParser';
import { feedback } from '../utils/feedback';

export { DejziAvatar };

interface GreetingModuleProps {
  userName?: string;
  availableForD: number;
  currency: string;
  isToday: boolean;
  date: Date;
  language: string;
  stats: any;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  calendarDays: any[];
  setSelectedDate: (date: Date) => void;
  setCurrentPeriodDate?: (date: Date) => void;
  periodStart: Date;
  periodEnd: Date;
  isFuturePeriod: boolean;
  isPastPeriod: boolean;
  periods?: any[];
  variant?: 'default' | 'compact';
  showPeriodSelector?: boolean;
  avatarUrl?: string | null;
  onNavigate: (tab: string, section?: string) => void;
  showFixedInCalendar?: boolean;
  isCurrentPeriod?: boolean;
  currentPeriodDate?: Date;
  config: any;
  onUpdateConfig?: (newConfig: any) => void;
  onAddExpense?: () => void;
  onAddIncome?: () => void;
  onQuickAddExpense?: (amount: number, note?: string, category?: string) => Promise<void> | void;
  onOpenCalculator?: () => void;
  allTransactions?: any[];
  children?: React.ReactNode;
}

export function GreetingModule({
  availableForD: _availableForD,
  currency,
  date,
  language,
  stats,
  t,
  calendarDays,
  config,
  onAddExpense,
  onAddIncome,
  onQuickAddExpense,
  _onOpenCalculator,
  allTransactions = [],
  children
}: GreetingModuleProps) {
  const isEn = language === 'en';
  const [quickText, setQuickText] = useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  const effectiveRemainingDays = useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) return stats?.remainingDays || 1;
    const normDate = new Date(date || new Date());
    normDate.setHours(0, 0, 0, 0);
    const index = calendarDays.findIndex((d: any) => {
      const dDate = new Date(d.date);
      dDate.setHours(0, 0, 0, 0);
      return dDate.getTime() === normDate.getTime();
    });
    if (index !== -1) {
      return Math.max(1, calendarDays.length - index);
    }
    return stats?.remainingDays || 1;
  }, [calendarDays, date, stats?.remainingDays]);

  const handleQuickExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickText.trim();
    if (!clean || isSubmittingQuick || !onQuickAddExpense) return;

    setIsSubmittingQuick(true);
    try {
      const defaultCategory = isEn ? 'Uncategorized' : 'Okategoriserat';
      const parsed = await parseQuickExpense(
        clean,
        config?.categories || [],
        allTransactions,
        defaultCategory
      );

      if (parsed.amount && parsed.amount > 0) {
        await onQuickAddExpense(parsed.amount, parsed.merchant, parsed.category);
        feedback.success();
        setQuickText('');
        setIsQuickExpenseOpen(false);
      }
    } catch (_err) {
      console.error('Quick expense failed', _err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 font-sans relative">
      {/* The Premium Main Rounded Card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="pb-1 text-[var(--text-primary)] relative flex flex-col"
      >
        <div className="w-full relative flex flex-col pt-1 pb-1">
          {/* Header Top Row: Left Stats & Right Dagar till nästa lön Badge */}
          <div className="flex items-start justify-between gap-4">
            {/* Left Side: Totalt kvar */}
            <div className="flex flex-col text-left justify-center min-w-0">
              <span className="text-xs font-bold text-[var(--text-secondary)] tracking-wider mb-1.5 block uppercase">
                {t('totalRemaining')}
              </span>
              <div className="flex items-baseline gap-1.5">
                <AnimatedNumber 
                  value={stats?.remainingPeriodCents || 0} 
                  className={`text-[42px] sm:text-[48px] md:text-[54px] leading-none font-black text-[var(--text-primary)] font-amount tabular-nums tracking-tight ${
                    (stats?.remainingPeriodCents || 0) < 0 ? 'text-rose-500' : ''
                  }`}
                  formatter={(val) => formatAmount(val, language)}
                />
                <span className={`text-[20px] sm:text-[22px] font-bold ${
                  (stats?.remainingPeriodCents || 0) < 0 ? 'text-rose-500' : 'text-[var(--text-secondary)]'
                }`}>
                  {currency}
                </span>
              </div>
            </div>

            {/* Right Side: Dagar till nästa lön */}
            <div className="flex items-center gap-2 sm:gap-2.5 p-2 px-3 sm:px-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-color)]/70 shrink-0 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--accent-color)] shrink-0">
                <Calendar size={16} strokeWidth={2.2} />
              </div>
              <div className="flex flex-col items-start min-w-0 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-80 leading-none">
                  {isEn ? 'Days to payday' : 'Dagar till nästa lön'}
                </span>
                <span className="text-[13px] sm:text-[14px] font-extrabold text-[var(--text-primary)] font-amount tabular-nums leading-tight mt-0.5">
                  {effectiveRemainingDays} {isEn ? (effectiveRemainingDays === 1 ? 'day' : 'days') : (effectiveRemainingDays === 1 ? 'dag' : 'dagar')}
                </span>
              </div>
            </div>
          </div>

          {/* Middle Row: Single Horizontal Row with Utgift button, Inkomst button, and Snabbutgift input field */}
          <div className="flex items-center gap-1.5 sm:gap-2 pt-3.5">
            {/* 1. Utgift Button */}
            <button
              type="button"
              onClick={() => {
                feedback.tap();
                onAddExpense?.();
              }}
              className="h-11 px-3 sm:px-3.5 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)]/70 flex items-center justify-center gap-1.5 shrink-0 active:scale-95 shadow-2xs group cursor-pointer text-xs font-bold text-[var(--text-primary)]"
            >
              <MinusCircle size={16} strokeWidth={2.2} className="text-rose-500 dark:text-rose-400 group-hover:scale-105 transition-transform" />
              <span>{isEn ? 'Expense' : 'Utgift'}</span>
            </button>

            {/* 2. Inkomst Button */}
            <button
              type="button"
              onClick={() => {
                feedback.tap();
                onAddIncome?.();
              }}
              className="h-11 px-3 sm:px-3.5 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] border border-[var(--border-color)]/70 flex items-center justify-center gap-1.5 shrink-0 active:scale-95 shadow-2xs group cursor-pointer text-xs font-bold text-[var(--text-primary)]"
            >
              <PlusCircle size={16} strokeWidth={2.2} className="text-emerald-500 dark:text-emerald-400 group-hover:scale-105 transition-transform" />
              <span>{isEn ? 'Income' : 'Inkomst'}</span>
            </button>

            {/* 3. Snabbutgift-rutan */}
            <form onSubmit={handleQuickExpenseSubmit} className="flex-1 flex items-center gap-1.5 min-w-0">
              <div className="relative flex-1 min-w-0">
                <input
                  ref={quickInputRef}
                  type="text"
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  placeholder={isEn ? "Quick: 45kr Coop" : "Snabbutgift: t.ex. 45kr ICA"}
                  className="w-full h-11 px-3 sm:px-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-color)]/70 text-xs sm:text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]/55 focus:border-amber-500 outline-none transition-all shadow-2xs"
                />
              </div>
              <button
                type="submit"
                disabled={!quickText.trim() || isSubmittingQuick}
                className="h-11 px-3 sm:px-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs disabled:opacity-40 active:scale-95 transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
                title={isEn ? "Save quick expense" : "Spara snabbutgift"}
              >
                <Zap size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">{isEn ? 'Save' : 'Spara'}</span>
              </button>
            </form>
          </div>

          {/* Category Budgets Carousel in the bottom of the module */}
          {children && (
            <div className="w-full pt-3 mt-3 text-left">
              {children}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
