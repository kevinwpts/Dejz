import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, ArrowDownLeft, ArrowUpRight, Camera, Zap } from 'lucide-react';
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
      }
    } catch (_err) {
      console.error('Quick expense failed', _err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const isNegative = (stats?.remainingPeriodCents || 0) < 0;

  return (
    <div className="space-y-7 font-sans relative">
      {/* 1. HERO AREA: Directly on background without card, container or border */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="pt-4 sm:pt-6 pb-2 text-left space-y-2"
      >
        {/* Uppercase Tracked Label */}
        <span className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400 block">
          {t('totalRemaining')}
        </span>

        {/* Massive Elegant Typography Amount */}
        <div className="flex items-baseline gap-2">
          <AnimatedNumber 
            value={stats?.remainingPeriodCents || 0} 
            className={`text-[52px] sm:text-[64px] md:text-[72px] leading-none font-black font-amount tabular-nums tracking-[-0.03em] ${
              isNegative ? 'text-rose-400' : 'text-white'
            }`}
            formatter={(val) => formatAmount(val, language)}
          />
          <span className={`text-[22px] sm:text-[26px] font-semibold tracking-normal ${
            isNegative ? 'text-rose-400/80' : 'text-slate-400'
          }`}>
            {currency}
          </span>
        </div>

        {/* Days to payday - natural typographic line in the hero area (not a heavy card) */}
        <div className="flex items-center gap-2 pt-1 text-slate-400 text-xs sm:text-[13px] font-medium">
          <Calendar size={14} strokeWidth={1.75} className="text-slate-400" />
          <span>
            {effectiveRemainingDays} {isEn ? (effectiveRemainingDays === 1 ? 'day to payday' : 'days to payday') : (effectiveRemainingDays === 1 ? 'dag till nästa lön' : 'dagar till nästa lön')}
          </span>
        </div>
      </motion.div>

      {/* 2. ACTIONS: Standalone, spacious, clean touch targets directly on the background */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-3"
      >
        {/* Row 1: The 3 Primary Actions (Utgift, Inkomst, Skanna kvitto) */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
          {/* Utgift Button */}
          <button
            type="button"
            onClick={() => {
              feedback.tap();
              onAddExpense?.();
            }}
            className="h-13 sm:h-14 px-3 sm:px-4 rounded-2xl bg-white/[0.035] hover:bg-white/[0.07] active:scale-[0.98] border border-white/[0.07] backdrop-blur-md flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 shrink-0 group cursor-pointer text-xs sm:text-sm font-semibold text-slate-200 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
          >
            <ArrowDownLeft size={17} strokeWidth={1.8} className="text-slate-300 group-hover:text-white transition-colors" />
            <span className="truncate">{isEn ? 'Expense' : 'Utgift'}</span>
          </button>

          {/* Inkomst Button */}
          <button
            type="button"
            onClick={() => {
              feedback.tap();
              onAddIncome?.();
            }}
            className="h-13 sm:h-14 px-3 sm:px-4 rounded-2xl bg-white/[0.035] hover:bg-white/[0.07] active:scale-[0.98] border border-white/[0.07] backdrop-blur-md flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 shrink-0 group cursor-pointer text-xs sm:text-sm font-semibold text-slate-200 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
          >
            <ArrowUpRight size={17} strokeWidth={1.8} className="text-slate-300 group-hover:text-white transition-colors" />
            <span className="truncate">{isEn ? 'Income' : 'Inkomst'}</span>
          </button>

          {/* Skanna kvitto Button */}
          <button
            type="button"
            onClick={() => {
              feedback.tap();
              onAddExpense?.();
            }}
            className="h-13 sm:h-14 px-3 sm:px-4 rounded-2xl bg-white/[0.035] hover:bg-white/[0.07] active:scale-[0.98] border border-white/[0.07] backdrop-blur-md flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 shrink-0 group cursor-pointer text-xs sm:text-sm font-semibold text-slate-200 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
          >
            <Camera size={17} strokeWidth={1.8} className="text-slate-300 group-hover:text-white transition-colors" />
            <span className="truncate">{isEn ? 'Scan receipt' : 'Skanna'}</span>
          </button>
        </div>

        {/* Row 2: Snabbutgift standalone input bar */}
        <form onSubmit={handleQuickExpenseSubmit} className="relative flex items-center">
          <input
            ref={quickInputRef}
            type="text"
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            placeholder={isEn ? "Quick expense: e.g. 45 Coop" : "Snabbutgift: t.ex. 45 ICA"}
            className="w-full h-12 pl-4 pr-12 rounded-2xl bg-white/[0.03] focus:bg-white/[0.06] border border-white/[0.07] focus:border-white/20 backdrop-blur-md text-xs sm:text-sm font-medium text-white placeholder-slate-500 outline-none transition-all shadow-[0_4px_16px_rgba(0,0,0,0.1)]"
          />
          <button
            type="submit"
            disabled={!quickText.trim() || isSubmittingQuick}
            className="absolute right-1.5 w-9 h-9 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] disabled:opacity-20 active:scale-95 text-slate-200 flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed border border-white/[0.08]"
            title={isEn ? "Save quick expense" : "Spara snabbutgift"}
          >
            <Zap size={14} strokeWidth={1.8} className="text-slate-300" />
          </button>
        </form>
      </motion.div>

      {/* 3. Budget Categories passed as standalone section */}
      {children}
    </div>
  );
}
