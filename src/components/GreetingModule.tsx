import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, Info, X } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { BudgetGauge } from './BudgetGauge';
import { formatAmount } from '../utils/format';
import { feedback } from '../utils/feedback';

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
  allTransactions?: any[];
  children?: React.ReactNode;
  categoryBudgets?: React.ReactNode;
}
export function GreetingModule({
  currency,
  language,
  stats,
  t,
  calendarDays,
  periodStart,
  periodEnd,
  children,
  categoryBudgets,
}: GreetingModuleProps) {
  const isEn = language === 'en';
  const [isPeriodInfoOpen, setIsPeriodInfoOpen] = useState(false);
  const [isCalculationInfoOpen, setIsCalculationInfoOpen] = useState(false);

  const effectiveRemainingDays = useMemo(() => {
    if (!stats) return 1;
    const normDate = new Date();
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
  }, [calendarDays, stats?.remainingDays]);

  // Period interval string e.g. "24 sep – 22 okt"
  const periodIntervalText = useMemo(() => {
    const start = stats?.periodStart || periodStart;
    const end = stats?.periodEnd || periodEnd;
    if (!start || !end) return '—';
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '—';

    const formatDate = (d: Date) => {
      const formatted = d.toLocaleDateString(isEn ? 'en-US' : 'sv-SE', {
        day: 'numeric',
        month: 'short',
      });
      return formatted.replace(/\.$/, '');
    };

    return `${formatDate(startDate)} \u2013 ${formatDate(endDate)}`;
  }, [stats?.periodStart, stats?.periodEnd, periodStart, periodEnd, isEn]);

  // Days value string e.g. "23 dagar"
  const daysValueText = useMemo(() => {
    if (stats?.isPastPeriod) {
      return isEn ? 'Avslutad' : 'Avslutad';
    }
    const days = effectiveRemainingDays;
    return isEn ? `${days} ${days === 1 ? 'day' : 'days'}` : `${days} ${days === 1 ? 'dag' : 'dagar'}`;
  }, [stats?.isPastPeriod, effectiveRemainingDays, isEn]);

  const handleCardClick = () => {
    try {
      if (typeof feedback?.tap === 'function') {
        feedback.tap();
      }
    } catch (_err) {
      // safe fallback
    }
    setIsPeriodInfoOpen(true);
  };

  return (
    <div className="flex flex-col font-sans relative">
      {/* TOP HERO SUMMARY SECTION (Sits directly on app background) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full -mt-2 sm:-mt-3 pt-0 mb-4 sm:mb-5 select-none px-1"
      >
        {/* Budget Gauge */}
        <BudgetGauge
          remainingCents={stats?.remainingPeriodCents || 0}
          disposablePotCents={stats?.disposablePot || 0}
          currency={currency}
          language={language}
          label={t('totalRemaining')}
          onOpenInfo={() => setIsCalculationInfoOpen(true)}
        />

        {/* Interactive Large Countdown Widget Card */}
        <button
          type="button"
          onClick={handleCardClick}
          className="w-full max-w-[320px] mx-auto mt-4 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between gap-4 animate-fade-in text-left cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.05] active:scale-[0.99] transition-all"
        >
          <div className="flex flex-col">
            <span className="text-[9px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-wider">
              {isEn ? 'Days left' : 'Dagar kvar'}
            </span>
            <span className="text-[28px] font-bold font-amount leading-none text-[var(--accent-color)] mt-1.5 select-none tabular-nums">
              {stats?.isPastPeriod ? '0' : effectiveRemainingDays}
            </span>
            <span className="text-[11px] font-medium text-[var(--text-secondary)] mt-1">
              {isEn ? 'until next payday' : 'till nästa lön'}
            </span>
          </div>

          <div className="h-10 w-[1px] bg-black/[0.06] dark:bg-white/[0.08]" />

          <div className="flex flex-col items-end text-right">
            <span className="text-[9px] font-extrabold text-[var(--text-tertiary)] uppercase tracking-wider">
              {isEn ? 'Current period' : 'Aktuell period'}
            </span>
            <span className="text-[13.5px] font-bold text-[var(--text-primary)] mt-1.5">
              {periodIntervalText}
            </span>
          </div>
        </button>
      </motion.div>

      {/* 2. DINA BUDGETAR CAROUSEL */}
      {categoryBudgets}

      {children}

      {/* Period & Payday Info Modal */}
      {isPeriodInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsPeriodInfoOpen(false)} 
          />
          <div className="relative w-full max-w-[320px] bg-white dark:bg-[#1C1C1C] rounded-[28px] p-5 border border-black/[0.08] dark:border-white/[0.08] shadow-2xl space-y-4 z-10 text-left font-sans">
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold font-display tracking-wider text-sm">
                <Info size={16} className="text-[var(--accent-color)]" strokeWidth={2} />
                <span>{isEn ? 'Period & Payday' : 'Period & Nästa Lön'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPeriodInfoOpen(false)}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                aria-label="Stäng"
              >
                <X size={17} strokeWidth={2} />
              </button>
            </div>

            {/* Content items */}
            <div className="space-y-2.5 pt-1">
              {/* Period */}
              <div className="flex items-center gap-3 p-3 rounded-[14px] bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10">
                <div className="w-8 h-8 rounded-[14px] bg-white dark:bg-white/10 flex items-center justify-center text-[var(--text-primary)] shrink-0 shadow-xs border border-black/5 dark:border-white/5">
                  <Calendar size={16} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] tracking-wider">
                    {isEn ? 'Current period' : 'Aktuell period'}
                  </span>
                  <span className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">
                    {periodIntervalText}
                  </span>
                </div>
              </div>

              {/* Payday / Next Salary */}
              <div className="flex items-center gap-3 p-3 rounded-[14px] bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10">
                <div className="w-8 h-8 rounded-[14px] bg-white dark:bg-white/10 flex items-center justify-center text-[var(--text-primary)] shrink-0 shadow-xs border border-black/5 dark:border-white/5">
                  <Clock size={16} strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] tracking-wider">
                    {isEn ? 'Next payday' : 'Nästa lön'}
                  </span>
                  <span className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">
                    {daysValueText} {isEn ? 'until payday' : 'kvar till lön'}
                  </span>
                </div>
              </div>
            </div>

            {/* Close action */}
            <button
              type="button"
              onClick={() => setIsPeriodInfoOpen(false)}
              className="w-full h-11 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-xs flex items-center justify-center"
            >
              {isEn ? 'Close' : 'Stäng'}
            </button>
          </div>
        </div>
      )}

      {/* Detailed Calculation Info Modal */}
      {isCalculationInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsCalculationInfoOpen(false)} 
          />
          <div className="relative w-full max-w-[340px] bg-white dark:bg-[#1C1C1C] rounded-[28px] p-5 border border-black/[0.08] dark:border-white/[0.08] shadow-2xl space-y-4 z-10 text-left font-sans">
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold font-display tracking-wider text-xs uppercase">
                <Info size={16} className="text-[var(--accent-color)]" strokeWidth={2.4} />
                <span>{isEn ? 'Calculation Details' : 'Hur räknas det ut?'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCalculationInfoOpen(false)}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border-none"
                aria-label="Stäng"
              >
                <X size={17} strokeWidth={2} />
              </button>
            </div>

            {/* Explanatory introduction */}
            <p className="text-xs text-[var(--text-secondary)] leading-normal">
              {isEn 
                ? 'Your remaining budget is what is left for variable spending after deducting bills and savings from your income.' 
                : 'Kvar att spendera är vad som återstår för rörliga köp under perioden efter att fasta utgifter och sparande räknats bort.'}
            </p>

            {/* Real-time Math Breakdown */}
            <div className="space-y-2 pt-1">
              {/* 1. Incomes */}
              <div className="flex justify-between items-center text-xs py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Total Income' : 'Totala inkomster'}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-amount tabular-nums">
                  +{formatAmount(stats?.totalIncome || 0, language)} {currency}
                </span>
              </div>

              {/* 2. Fixed Expenses */}
              <div className="flex justify-between items-center text-xs py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Fixed Expenses' : 'Fasta utgifter (verkliga)'}</span>
                <span className="font-semibold text-rose-500 dark:text-rose-400 font-amount tabular-nums">
                  -{formatAmount(stats?.totalFixed || 0, language)} {currency}
                </span>
              </div>

              {/* 3. Monthly Savings */}
              <div className="flex justify-between items-center text-xs py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Monthly Savings' : 'Månadssparande'}</span>
                <span className="font-semibold text-amber-500 font-amount tabular-nums">
                  -{formatAmount(stats?.totalSavings || 0, language)} {currency}
                </span>
              </div>

              {/* 4. Disposable Pot = Income - Fixed - Savings */}
              <div className="flex justify-between items-center text-xs py-1.5 px-2 bg-black/[0.03] dark:bg-white/[0.04] rounded-lg">
                <span className="font-medium text-[var(--text-primary)]">{isEn ? 'Disposable Pot' : 'Rörlig pott för perioden'}</span>
                <span className="font-bold text-[var(--text-primary)] font-amount tabular-nums">
                  ={formatAmount(stats?.disposablePot || 0, language)} {currency}
                </span>
              </div>

              {/* 5. Total Spent in Period */}
              <div className="flex justify-between items-center text-xs py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Variable Spent' : 'Spenderat hittills'}</span>
                <span className="font-semibold text-rose-500 dark:text-rose-400 font-amount tabular-nums">
                  -{formatAmount(stats?.totalSpentInPeriod || 0, language)} {currency}
                </span>
              </div>

              {/* 6. Extra Income / Swish */}
              {stats?.totalExtraIncomeInPeriod > 0 && (
                <div className="flex justify-between items-center text-xs py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-[var(--text-secondary)]">{isEn ? 'Extra Income' : 'Extra inkomster'}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-amount tabular-nums">
                    +{formatAmount(stats?.totalExtraIncomeInPeriod || 0, language)} {currency}
                  </span>
                </div>
              )}

              {/* 7. Remaining to Spend */}
              <div className="flex justify-between items-center text-xs py-2 px-2 bg-[var(--accent-color)]/10 dark:bg-[var(--accent-color)]/20 rounded-lg border border-[var(--accent-color)]/15">
                <span className="font-bold text-[var(--text-primary)]">{isEn ? 'Remaining to Spend' : 'Kvar att spendera'}</span>
                <span className="font-extrabold text-[var(--text-primary)] font-amount tabular-nums">
                  {formatAmount(stats?.remainingPeriodCents || 0, language)} {currency}
                </span>
              </div>
            </div>

            {/* Close action */}
            <button
              type="button"
              onClick={() => setIsCalculationInfoOpen(false)}
              className="w-full h-11 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-xs flex items-center justify-center border-none mt-2"
            >
              {isEn ? 'Got it' : 'Jag förstår'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
