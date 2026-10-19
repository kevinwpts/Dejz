import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Icon } from './ui';
import { TranslationKey } from '../i18n';
import { AnimatedNumber } from './AnimatedNumber';
import { formatAmount } from '../utils/format';
import { getBudgetStatus } from '../utils/budgetStatus';
import { feedback } from '../utils/feedback';

interface GreetingModuleProps {
  userName?: string;
  currency: string;
  language: string;
  stats: any;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  calendarDays: any[];
  periodStart: Date;
  periodEnd: Date;
  periodIntervalText?: string;
  paydayText?: string;
  onOpenPeriodInfo?: () => void;
}

export function GreetingModule({
  currency,
  language,
  stats,
  t,
  calendarDays,
  periodStart,
  periodEnd,
  periodIntervalText,
  paydayText,
  onOpenPeriodInfo,
}: GreetingModuleProps) {
  const isEn = language === 'en';
  const [isCalculationInfoOpen, setIsCalculationInfoOpen] = useState(false);

  const remainingCents = stats?.remainingPeriodCents || 0;
  const disposablePotCents = stats?.disposablePot || 0;

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

  const totalDaysInPeriod = useMemo(() => {
    if (!periodStart || !periodEnd) return 30;
    const start = new Date(periodStart).getTime();
    const end = new Date(periodEnd).getTime();
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 30;
  }, [periodStart, periodEnd]);

  const status = useMemo(() => {
    return getBudgetStatus({
      remainingCents: remainingCents,
      disposablePotCents: disposablePotCents,
      remainingDays: effectiveRemainingDays,
      totalDays: totalDaysInPeriod,
    });
  }, [remainingCents, disposablePotCents, effectiveRemainingDays, totalDaysInPeriod]);

  return (
    <div className="flex flex-col font-sans relative space-y-3.5">
      {/* 1. Unified Main Hero Card - Kvar att spendera + Aktuell period & Nästa lön */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full select-none"
      >
        <div
          className="bg-[var(--surface-color)] border border-subtle rounded-card p-4 sm:p-5 relative overflow-hidden transition-all shadow-subtle flex flex-col justify-between gap-3.5 text-[var(--text-primary)]"
        >
          {/* Upper Hero Area: Label, Info button & Large Amount */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-card-title sm:text-body font-medium text-[var(--text-secondary)]">
                {t('totalRemaining') || (isEn ? 'Remaining to spend' : 'Kvar att spendera')}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.tap === 'function') feedback.tap();
                  setIsCalculationInfoOpen(true);
                }}
                className="p-1 -m-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                aria-label="Info"
                title={isEn ? 'How is this calculated?' : 'Hur beräknas detta?'}
              >
                <Icon name="info" size={14} />
              </button>
            </div>

            <div className="flex items-baseline gap-1.5 min-w-0 py-0.5">
              <AnimatedNumber
                value={remainingCents}
                className={`text-hero-amount leading-none font-bold tabular-nums tracking-tight ${
                  remainingCents < 0 ? 'text-[var(--danger-color)]' : 'text-[var(--text-primary)]'
                }`}
                formatter={(val) => formatAmount(val, language)}
              />
              <span className="text-[14px] leading-none shrink-0 font-medium text-[var(--text-secondary)] align-baseline">
                {currency || 'kr'}
              </span>
            </div>
          </div>

          {/* Integrated Footer Row: Aktuell period & Nästa lön */}
          <button
            type="button"
            onClick={onOpenPeriodInfo}
            className="pt-3 border-t border-[var(--border-divider)] grid grid-cols-2 gap-3 text-left w-full bg-transparent border-x-0 border-b-0 cursor-pointer group transition-opacity hover:opacity-85 active:opacity-75"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-metric-label font-medium text-[var(--text-secondary)] truncate">
                {isEn ? 'Current period' : 'Aktuell period'}
              </span>
              <span className="text-body-medium font-semibold text-[var(--text-primary)] truncate mt-0.5">
                {periodIntervalText || (isEn ? 'Current period' : 'Aktuell period')}
              </span>
            </div>

            <div className="flex flex-col min-w-0 pl-3 border-l border-[var(--border-divider)]">
              <span className="text-metric-label font-medium text-[var(--text-secondary)] truncate">
                {isEn ? 'Next payday' : 'Nästa lön'}
              </span>
              <span className="text-body-medium font-semibold font-amount tabular-nums text-[var(--text-primary)] truncate mt-0.5">
                {paydayText || '-'}
              </span>
            </div>
          </button>
        </div>
      </motion.div>

      {/* Detailed Calculation Info Modal */}
      {isCalculationInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
          <div 
            className="fixed inset-0" 
            onClick={() => setIsCalculationInfoOpen(false)} 
          />
          <div className="relative w-full max-w-[340px] bg-[var(--surface-color)] rounded-card p-5 border border-subtle shadow-subtle space-y-4 z-10 text-left font-sans">
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2 text-[var(--text-primary)] font-semibold text-sm">
                <Icon name="info" size={16} className="text-[var(--accent-color)]" />
                <span>{isEn ? 'Calculation Details' : 'Hur räknas det ut?'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCalculationInfoOpen(false)}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border-none"
                aria-label="Stäng"
              >
                <Icon name="x" size={17} />
              </button>
            </div>

            {/* Explanatory introduction */}
            <p className="text-xs text-[var(--text-secondary)] leading-normal">
              {isEn 
                ? 'Your remaining budget is what is left for variable spending after deducting bills and savings from your income.' 
                : 'Kvar att spendera är vad som återstår för rörliga köp under perioden efter att fasta utgifter och sparande räknats bort.'}
            </p>

            {/* Status Explanation Surface (Zero Box-in-Box border) */}
            <div className={`p-3 rounded-card-nested flex items-start gap-2.5 ${status.badgeBgClass}`}>
              <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: status.colorHex }} />
              <div className="flex flex-col min-w-0 text-xs">
                <span className={`font-bold ${status.badgeTextClass}`}>
                  {isEn ? status.labelEn : status.labelSv}
                </span>
                <p className="text-label text-[var(--text-secondary)] mt-0.5 leading-snug">
                  {isEn ? status.descriptionEn : status.descriptionSv}
                </p>
              </div>
            </div>

            {/* Real-time Math Breakdown */}
            <div className="space-y-2 pt-1">
              {/* 1. Incomes */}
              <div className="flex justify-between items-center text-xs py-1 border-b border-[var(--border-divider)]">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Total Income' : 'Totala inkomster'}</span>
                <span className="font-semibold text-[var(--success-color)] font-amount tabular-nums">
                  +{formatAmount(stats?.totalIncome || 0, language)} {currency}
                </span>
              </div>

              {/* 2. Fixed Expenses */}
              <div className="flex justify-between items-center text-xs py-1 border-b border-[var(--border-divider)]">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Fixed Expenses' : 'Fasta utgifter (verkliga)'}</span>
                <span className="font-semibold text-[var(--danger-color)] font-amount tabular-nums">
                  −{formatAmount(stats?.totalFixed || 0, language)} {currency}
                </span>
              </div>

              {/* 3. Monthly Savings */}
              <div className="flex justify-between items-center text-xs py-1 border-b border-[var(--border-divider)]">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Monthly Savings' : 'Månadssparande'}</span>
                <span className="font-semibold text-[var(--warning-color)] font-amount tabular-nums">
                  −{formatAmount(stats?.totalSavings || 0, language)} {currency}
                </span>
              </div>

              {/* 4. Disposable Pot = Income - Fixed - Savings */}
              <div className="flex justify-between items-center text-xs py-2 px-2.5 bg-[var(--surface-muted)] rounded-card-nested">
                <span className="font-medium text-[var(--text-primary)]">{isEn ? 'Disposable Pot' : 'Rörlig pott för perioden'}</span>
                <span className="font-bold text-[var(--text-primary)] font-amount tabular-nums">
                  ={formatAmount(stats?.disposablePot || 0, language)} {currency}
                </span>
              </div>

              {/* 5. Total Spent in Period */}
              <div className="flex justify-between items-center text-xs py-1 border-b border-[var(--border-divider)]">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Variable Spent' : 'Spenderat hittills'}</span>
                <span className="font-semibold text-[var(--danger-color)] font-amount tabular-nums">
                  −{formatAmount(stats?.totalSpentInPeriod || 0, language)} {currency}
                </span>
              </div>

              {/* 6. Extra Income / Swish */}
              {stats?.totalExtraIncomeInPeriod > 0 && (
                <div className="flex justify-between items-center text-xs py-1 border-b border-[var(--border-divider)]">
                  <span className="text-[var(--text-secondary)]">{isEn ? 'Extra Income' : 'Extra inkomster'}</span>
                  <span className="font-semibold text-[var(--success-color)] font-amount tabular-nums">
                    +{formatAmount(stats?.totalExtraIncomeInPeriod || 0, language)} {currency}
                  </span>
                </div>
              )}

              {/* 7. Remaining to Spend */}
              <div className="flex justify-between items-center text-xs py-2.5 px-2.5 bg-[var(--accent-soft)] rounded-card-nested">
                <span className="font-bold text-[var(--text-primary)]">{isEn ? 'Remaining to Spend' : 'Kvar att spendera'}</span>
                <span className="font-extrabold text-[var(--accent-color)] font-amount tabular-nums">
                  {formatAmount(stats?.remainingPeriodCents || 0, language)} {currency}
                </span>
              </div>
            </div>

            {/* Close action */}
            <button
              type="button"
              onClick={() => setIsCalculationInfoOpen(false)}
              className="w-full h-11 rounded-[var(--radius-button,12px)] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-xs flex items-center justify-center border-none mt-2"
            >
              {isEn ? 'Got it' : 'Jag förstår'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
