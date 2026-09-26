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
    <div className="space-y-8 font-sans relative">
      {/* 1. HERO AREA: Pure typography & space resting directly on the ambient background */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="pt-3 sm:pt-6 pb-1 text-left space-y-2.5"
      >
        {/* Tracked Minimalist Uppercase Label */}
        <span className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.2em] text-[#C7CDDC]/85 block select-none">
          {t('totalRemaining')}
        </span>

        {/* Large Elegant Typographic Amount */}
        <div className="flex items-baseline gap-2.5">
          <AnimatedNumber 
            value={stats?.remainingPeriodCents || 0} 
            className={`text-[54px] sm:text-[66px] md:text-[76px] leading-[0.98] font-black font-amount tabular-nums tracking-[-0.035em] ${
              isNegative ? 'text-rose-400' : 'text-white'
            }`}
            formatter={(val) => formatAmount(val, language)}
          />
          <span className={`text-[22px] sm:text-[26px] font-medium tracking-normal ${
            isNegative ? 'text-rose-400/80' : 'text-[#C7CDDC]/85'
          }`}>
            {currency}
          </span>
        </div>

        {/* Payday info - subtle natural typographic line */}
        <div className="flex items-center gap-2 pt-0.5 text-[#C7CDDC]/85 text-xs sm:text-[13px] font-medium">
          <Calendar size={14} strokeWidth={1.75} className="text-[#C7CDDC]/80 shrink-0" />
          <span>
            {effectiveRemainingDays} {isEn ? (effectiveRemainingDays === 1 ? 'day to payday' : 'days to payday') : (effectiveRemainingDays === 1 ? 'dag till nästa lön' : 'dagar till nästa lön')}
          </span>
        </div>
      </motion.div>

      {/* 2. ACTIONS: Precise glass specifications (rgba(255,255,255,0.045), blur 18px, border 0.08, shadow 0 8px 30px rgba(0,0,0,0.15)) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="space-y-3"
      >
        {/* Primary Action Buttons (Utgift, Inkomst, Skanna) */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
          {/* Utgift */}
          <button
            type="button"
            onClick={() => {
              feedback.tap();
              onAddExpense?.();
            }}
            className="h-13 sm:h-14 px-3 sm:px-4 rounded-2xl bg-white/[0.045] hover:bg-white/[0.07] active:scale-[0.98] border border-white/[0.08] backdrop-blur-[18px] flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 group cursor-pointer text-xs sm:text-sm font-semibold text-[#C7CDDC] hover:text-white transition-all shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
          >
            <ArrowDownLeft size={16} strokeWidth={1.75} className="text-[#C7CDDC] group-hover:text-white transition-colors" />
            <span className="truncate">{isEn ? 'Expense' : 'Utgift'}</span>
          </button>

          {/* Inkomst */}
          <button
            type="button"
            onClick={() => {
              feedback.tap();
              onAddIncome?.();
            }}
            className="h-13 sm:h-14 px-3 sm:px-4 rounded-2xl bg-white/[0.045] hover:bg-white/[0.07] active:scale-[0.98] border border-white/[0.08] backdrop-blur-[18px] flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 group cursor-pointer text-xs sm:text-sm font-semibold text-[#C7CDDC] hover:text-white transition-all shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
          >
            <ArrowUpRight size={16} strokeWidth={1.75} className="text-[#C7CDDC] group-hover:text-white transition-colors" />
            <span className="truncate">{isEn ? 'Income' : 'Inkomst'}</span>
          </button>

          {/* Skanna kvitto */}
          <button
            type="button"
            onClick={() => {
              feedback.tap();
              onAddExpense?.();
            }}
            className="h-13 sm:h-14 px-3 sm:px-4 rounded-2xl bg-white/[0.045] hover:bg-white/[0.07] active:scale-[0.98] border border-white/[0.08] backdrop-blur-[18px] flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2.5 group cursor-pointer text-xs sm:text-sm font-semibold text-[#C7CDDC] hover:text-white transition-all shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
          >
            <Camera size={16} strokeWidth={1.75} className="text-[#C7CDDC] group-hover:text-white transition-colors" />
            <span className="truncate">{isEn ? 'Scan' : 'Skanna'}</span>
          </button>
        </div>

        {/* Snabbutgift Input Bar (rgba(255,255,255,0.04), blur 18px, border 0.07) */}
        <form onSubmit={handleQuickExpenseSubmit} className="relative flex items-center">
          <input
            ref={quickInputRef}
            type="text"
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            placeholder={isEn ? "Quick expense: e.g. 45 Coop" : "Snabbutgift: t.ex. 45 ICA"}
            className="w-full h-12 pl-4 pr-12 rounded-2xl bg-white/[0.04] hover:bg-white/[0.055] focus:bg-white/[0.07] border border-white/[0.07] focus:border-white/[0.14] backdrop-blur-[18px] text-xs sm:text-sm font-medium text-white placeholder-slate-400 outline-none transition-all shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
          />
          <button
            type="submit"
            disabled={!quickText.trim() || isSubmittingQuick}
            className="absolute right-1.5 w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-20 active:scale-95 text-[#C7CDDC] flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed border border-white/[0.07]"
            title={isEn ? "Save quick expense" : "Spara snabbutgift"}
          >
            <Zap size={14} strokeWidth={1.75} className="text-[#C7CDDC]" />
          </button>
        </form>
      </motion.div>

      {children}
    </div>
  );
}
