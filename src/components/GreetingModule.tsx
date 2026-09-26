import React, { useState, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, ArrowDownLeft, ArrowUpRight, Zap } from 'lucide-react';
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
    <div className="space-y-5 font-sans relative">
      {/* The Premium Frosted Hero Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-[28px] p-5 sm:p-6 bg-white/[0.035] dark:bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,0.25)] flex flex-col space-y-5 overflow-hidden"
      >
        {/* Subtle interior ambient specular highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* 1. Header Hero: Totalt kvar + Dagar till lön */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          {/* Left: TOTALT KVAR */}
          <div className="flex flex-col text-left justify-center min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-400 mb-1.5 block">
              {t('totalRemaining')}
            </span>
            <div className="flex items-baseline gap-1.5">
              <AnimatedNumber 
                value={stats?.remainingPeriodCents || 0} 
                className={`text-[44px] sm:text-[52px] md:text-[58px] leading-none font-extrabold font-amount tabular-nums tracking-tight ${
                  isNegative ? 'text-rose-400' : 'text-white'
                }`}
                formatter={(val) => formatAmount(val, language)}
              />
              <span className={`text-[20px] sm:text-[22px] font-semibold ${
                isNegative ? 'text-rose-400/80' : 'text-slate-400'
              }`}>
                {currency}
              </span>
            </div>
          </div>

          {/* Right: Dagar till nästa lön (Clean Minimalist Frosted Capsule) */}
          <div className="self-start flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-md shrink-0 shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-slate-300 shrink-0">
              <Calendar size={14} strokeWidth={1.6} />
            </div>
            <div className="flex flex-col items-start min-w-0 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
                {isEn ? 'Days to payday' : 'Dagar till lön'}
              </span>
              <span className="text-[13px] sm:text-[14px] font-bold text-slate-200 font-amount tabular-nums leading-tight mt-0.5">
                {effectiveRemainingDays} {isEn ? (effectiveRemainingDays === 1 ? 'day' : 'days') : (effectiveRemainingDays === 1 ? 'dag' : 'dagar')}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Quick Action Bar: – Utgift, + Inkomst, Snabb-inmatning (Clean Unified Monochrome System) */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Utgift Button */}
          <button
            type="button"
            onClick={() => {
              feedback.tap();
              onAddExpense?.();
            }}
            className="h-11 px-3.5 sm:px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.08] backdrop-blur-md flex items-center justify-center gap-2 shrink-0 group cursor-pointer text-xs font-semibold text-slate-200 transition-all shadow-2xs"
          >
            <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.08] text-slate-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowDownLeft size={14} strokeWidth={1.75} />
            </div>
            <span>{isEn ? 'Expense' : 'Utgift'}</span>
          </button>

          {/* Inkomst Button */}
          <button
            type="button"
            onClick={() => {
              feedback.tap();
              onAddIncome?.();
            }}
            className="h-11 px-3.5 sm:px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.08] backdrop-blur-md flex items-center justify-center gap-2 shrink-0 group cursor-pointer text-xs font-semibold text-slate-200 transition-all shadow-2xs"
          >
            <div className="w-6 h-6 rounded-lg bg-white/[0.06] border border-white/[0.08] text-slate-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowUpRight size={14} strokeWidth={1.75} />
            </div>
            <span>{isEn ? 'Income' : 'Inkomst'}</span>
          </button>

          {/* Snabbutgift-inmatning */}
          <form onSubmit={handleQuickExpenseSubmit} className="flex-1 flex items-center gap-2 min-w-[200px]">
            <div className="relative flex-1 min-w-0">
              <input
                ref={quickInputRef}
                type="text"
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                placeholder={isEn ? "Quick: 45kr Coop" : "Snabb: t.ex. 45kr ICA"}
                className="w-full h-11 px-3.5 rounded-2xl bg-white/[0.03] focus:bg-white/[0.06] border border-white/[0.08] focus:border-indigo-400/40 backdrop-blur-md text-xs sm:text-sm font-medium text-white placeholder-slate-500 outline-none transition-all shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={!quickText.trim() || isSubmittingQuick}
              className="h-11 px-3.5 sm:px-4 rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] disabled:opacity-30 active:scale-95 border border-white/[0.1] text-slate-200 font-semibold text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title={isEn ? "Save quick expense" : "Spara snabbutgift"}
            >
              <Zap size={13} strokeWidth={1.75} className="text-slate-300" />
              <span className="hidden sm:inline">{isEn ? 'Save' : 'Spara'}</span>
            </button>
          </form>
        </div>

        {/* 3. Budget Categories Section Integrated with Generous Breathing Room */}
        {children && (
          <div className="w-full pt-2 border-t border-white/[0.06]">
            {children}
          </div>
        )}
      </motion.div>
    </div>
  );
}
