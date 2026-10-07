import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, Info, X } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { BudgetGauge } from './BudgetGauge';
import { formatAmount } from '../utils/format';

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
  const [selectedAlternative, setSelectedAlternative] = useState<'pill' | 'progress' | 'card' | 'integrated' | 'double'>('pill');

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

  return (
    <div className="flex flex-col font-sans relative">
      {/* TOP HERO SUMMARY SECTION (Sits directly on app background) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full -mt-2 sm:-mt-3 pt-0 mb-4 sm:mb-5 select-none px-1"
      >
        {/* Interactive Alternative Design Selector */}
        <div className="flex justify-center mb-4 px-2">
          <div className="inline-flex items-center gap-0.5 p-1 bg-black/[0.03] dark:bg-white/[0.04] rounded-[14px] overflow-x-auto max-w-full no-scrollbar">
            {[
              { id: 'pill', label: isEn ? 'Pill' : 'Original' },
              { id: 'progress', label: isEn ? 'Timeline' : 'Tidslinje' },
              { id: 'card', label: isEn ? 'Card' : 'Kort' },
              { id: 'integrated', label: isEn ? 'Integrated' : 'Integrerad' },
              { id: 'double', label: isEn ? 'Double' : 'Dubbel' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  if (typeof feedback.selection === 'function') feedback.selection();
                  setSelectedAlternative(opt.id as any);
                }}
                className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold rounded-[10px] transition-all cursor-pointer whitespace-nowrap border-none select-none ${
                  selectedAlternative === opt.id
                    ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Budget Gauge */}
        <BudgetGauge
          remainingCents={stats?.remainingPeriodCents || 0}
          disposablePotCents={stats?.disposablePot || 0}
          currency={currency}
          language={language}
          label={t('totalRemaining')}
          onOpenInfo={() => setIsCalculationInfoOpen(true)}
          timeText={
            selectedAlternative === 'integrated'
              ? (stats?.isPastPeriod ? (isEn ? 'Period Ended' : 'Perioden avslutad') : `${effectiveRemainingDays} ${isEn ? 'days until payday' : 'dagar kvar till lön'}`)
              : selectedAlternative === 'double'
              ? (isEn ? 'Outer: Money · Inner: Time' : 'Yttre: Pengar · Inre: Tid')
              : undefined
          }
          timeRatio={
            selectedAlternative === 'double'
              ? (stats?.totalDaysInPeriod ? (stats.totalDaysInPeriod - effectiveRemainingDays) / stats.totalDaysInPeriod : 0)
              : undefined
          }
        />

        {/* 1. Original Pill Design */}
        {selectedAlternative === 'pill' && (
          <div className="flex justify-center mt-1 sm:mt-2">
            <button
              type="button"
              onClick={() => setIsPeriodInfoOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] active:scale-98 border border-black/[0.06] dark:border-white/[0.08] text-xs transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                <Calendar size={13} className="text-[var(--accent-color)] shrink-0" strokeWidth={2.2} />
                <span className="font-medium tracking-tight">{periodIntervalText}</span>
              </div>

              <span className="w-1 h-1 rounded-full bg-black/20 dark:bg-white/20 shrink-0" />

              <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                <Clock size={13} className="text-[var(--accent-color)] shrink-0" strokeWidth={2.2} />
                <span className="font-semibold tracking-tight">
                  {stats?.isPastPeriod ? (isEn ? 'Ended' : 'Avslutad') : `${daysValueText} ${isEn ? '' : 'kvar'}`}
                </span>
              </div>
            </button>
          </div>
        )}

        {/* 2. Linear Timeline/Progress Design */}
        {selectedAlternative === 'progress' && (
          <div className="w-full max-w-[320px] mx-auto mt-4 px-4 py-3 rounded-2xl bg-black/[0.015] dark:bg-white/[0.025] border border-black/[0.03] dark:border-white/[0.05] animate-fade-in text-left">
            <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] font-medium mb-1.5 px-0.5">
              <span>{periodIntervalText.split(' \u2013 ')[0] || 'Start'}</span>
              <span>{periodIntervalText.split(' \u2013 ')[1] || 'Slut'}</span>
            </div>
            
            {/* Progress Bar Track */}
            <div className="h-1.5 w-full bg-[#E2DDD4] dark:bg-white/10 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-[var(--accent-color)] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, ((stats?.totalDaysInPeriod - effectiveRemainingDays) / stats?.totalDaysInPeriod) * 100))}%` }}
              />
            </div>

            <div className="flex justify-between items-center mt-2 px-0.5">
              <span className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1">
                <Clock size={11} className="text-[var(--accent-color)]" strokeWidth={2.5} />
                {stats?.isPastPeriod ? (isEn ? 'Ended' : 'Avslutad') : `${daysValueText} ${isEn ? 'left' : 'kvar'}`}
              </span>
              <span className="text-[10px] font-medium text-[var(--text-tertiary)]">
                {Math.round(((stats?.totalDaysInPeriod - effectiveRemainingDays) / stats?.totalDaysInPeriod) * 100)}% {isEn ? 'elapsed' : 'passerat'}
              </span>
            </div>
          </div>
        )}

        {/* 3. Interactive Large Countdown Widget Card */}
        {selectedAlternative === 'card' && (
          <div className="w-full max-w-[320px] mx-auto mt-4 p-4 rounded-[22px] bg-white dark:bg-[#161616] border border-black/[0.04] dark:border-white/[0.06] shadow-sm flex items-center justify-between gap-4 animate-fade-in text-left">
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
                {isEn ? 'Period range' : 'Periodgränser'}
              </span>
              <span className="text-[13px] font-semibold text-[var(--text-primary)] mt-1.5">
                {periodIntervalText}
              </span>
              <span className="text-[10px] font-medium text-[var(--text-secondary)] mt-1">
                {stats?.totalDaysInPeriod} {isEn ? 'days total' : 'dagar totalt'}
              </span>
            </div>
          </div>
        )}
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
