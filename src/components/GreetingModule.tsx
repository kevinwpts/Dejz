import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Icon, Modal } from './ui';
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
  onNavigate?: (tab: string, section?: string) => void;
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
  onNavigate,
}: GreetingModuleProps) {
  const isEn = language === 'en';
  const [isCalculationInfoOpen, setIsCalculationInfoOpen] = useState(false);

  const remainingCents = stats?.remainingPeriodCents || 0;
  const disposablePotCents = stats?.disposablePot || 0;
  const totalExtraIncomeUpToToday = stats?.totalExtraIncomeUpToToday || 0;
  const totalPotCents = Math.max(0, disposablePotCents + totalExtraIncomeUpToToday);

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

  const dailyRemaining = useMemo(() => {
    if (stats?.isPastPeriod || remainingCents <= 0 || effectiveRemainingDays <= 0) return 0;
    return Math.round(remainingCents / effectiveRemainingDays);
  }, [stats?.isPastPeriod, remainingCents, effectiveRemainingDays]);

  const remainingRatioPercent = useMemo(() => {
    if (remainingCents < 0) return 100;
    if (totalPotCents <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((remainingCents / totalPotCents) * 100)));
  }, [remainingCents, totalPotCents]);

  const totalIncomeDisplay = Math.round((stats?.totalIncome || 0) + totalExtraIncomeUpToToday);
  const totalFixedDisplay = Math.round(stats?.totalFixed || 0);
  const totalSavingsDisplay = Math.round((stats?.totalSavings || 0) + (stats?.totalSavedInPot || 0));
  const totalSpentDisplay = Math.round(stats?.totalSpentInPeriod || 0);

  const formattedPaydayBadge = useMemo(() => {
    if (!paydayText) return '';
    if (stats?.isPastPeriod) return paydayText;
    const lower = paydayText.toLowerCase();
    if (
      lower.includes('kvar') ||
      lower.includes('left') ||
      lower.includes('idag') ||
      lower.includes('today') ||
      lower.includes('avslutad') ||
      lower.includes('ended')
    ) {
      return paydayText;
    }
    return isEn ? `${paydayText} left` : `${paydayText} kvar`;
  }, [paydayText, stats?.isPastPeriod, isEn]);

  return (
    <div className="flex flex-col font-sans relative space-y-3.5">
      {/* 1. Unified Main Hero Card - Kvar att spendera + Hela ekonomin */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full select-none"
      >
        <div
          className="bg-[var(--surface-color)] rounded-card p-4 sm:p-5 relative overflow-hidden transition-all flex flex-col justify-between gap-3.5 text-[var(--text-primary)]"
        >
          {/* Upper Hero Area: Label, Period pill, Info button & Large Amount */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-card-title sm:text-body font-medium text-[var(--text-secondary)] truncate">
                {t('totalRemaining') || (isEn ? 'Remaining to spend' : 'Kvar att spendera')}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onOpenPeriodInfo}
                  className="text-micro-label font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer bg-transparent border-none p-0 flex items-center gap-1 tabular-nums"
                >
                  <span>{periodIntervalText}</span>
                  {formattedPaydayBadge && (
                    <>
                      <span className="text-[var(--text-tertiary)]">·</span>
                      <span className="text-[var(--text-primary)] font-semibold">
                        {formattedPaydayBadge}
                      </span>
                    </>
                  )}
                </button>
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
            </div>

            <div className="flex items-end justify-between gap-3 min-w-0 py-0.5">
              <div className="flex items-baseline gap-1.5 min-w-0">
                <AnimatedNumber
                  value={remainingCents}
                  className={`text-hero-amount leading-none font-bold tabular-nums tracking-tight ${
                    remainingCents < 0 ? 'text-[var(--danger-color)]' : 'text-[var(--text-primary)]'
                  }`}
                  formatter={(val) => `${val < 0 ? '−' : ''}${formatAmount(Math.abs(val), language)}`}
                />
                <span className="text-[14px] leading-none shrink-0 font-medium text-[var(--text-secondary)] align-baseline">
                  {currency || 'kr'}
                </span>
              </div>

              {/* Right Context: Per day + Total pot */}
              <div className="flex flex-col items-end shrink-0 text-right pb-0.5">
                {!stats?.isPastPeriod && (
                  remainingCents > 0 ? (
                    <span className="text-body-medium font-semibold font-amount tabular-nums text-[var(--text-primary)] leading-tight">
                      ~{formatAmount(dailyRemaining, language)} {currency || 'kr'}/{isEn ? 'day' : 'dag'}
                    </span>
                  ) : remainingCents < 0 ? (
                    <span className="text-label font-semibold text-[var(--danger-color)] leading-tight">
                      {isEn ? 'Over budget' : 'Över budget'}
                    </span>
                  ) : totalPotCents > 0 ? (
                    <span className="text-label font-semibold font-amount tabular-nums text-[var(--text-secondary)] leading-tight">
                      0 {currency || 'kr'}/{isEn ? 'day' : 'dag'}
                    </span>
                  ) : null
                )}
                {totalPotCents > 0 && (
                  <span className="text-micro-label text-[var(--text-secondary)] font-amount tabular-nums leading-tight mt-0.5">
                    {isEn ? 'of' : 'av'} {formatAmount(totalPotCents, language)} {currency || 'kr'}
                  </span>
                )}
              </div>
            </div>

            {/* Thin Progress Bar */}
            {totalPotCents > 0 && (
              <div className="w-full h-1 bg-[var(--surface-muted)] rounded-full overflow-hidden mt-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    remainingCents < 0 || status.level === 'danger'
                      ? 'bg-[var(--danger-color)]'
                      : remainingRatioPercent <= 20 || status.level === 'warning'
                      ? 'bg-[var(--warning-color)]'
                      : 'bg-[var(--success-color)]'
                  }`}
                  style={{ width: `${remainingRatioPercent}%` }}
                />
              </div>
            )}
          </div>

          {/* Integrated 4-Column Economy Breakdown Footer */}
          <div className="pt-3 border-t border-[var(--border-divider)] grid grid-cols-4 divide-x divide-[var(--border-divider)] text-left w-full">
            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                onNavigate?.('budget', 'income');
              }}
              className="flex flex-col min-w-0 pr-2 text-left bg-transparent border-none p-0 cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all"
            >
              <span className="text-micro-label font-medium text-[var(--text-secondary)] truncate">
                {isEn ? 'Income' : 'Inkomst'}
              </span>
              <span
                className={`text-label font-semibold font-amount tabular-nums truncate mt-0.5 ${
                  totalIncomeDisplay > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                {totalIncomeDisplay > 0 ? formatAmount(totalIncomeDisplay, language) : '0'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                onNavigate?.('budget', 'fixed');
              }}
              className="flex flex-col min-w-0 px-2.5 text-left bg-transparent border-y-0 border-r-0 p-0 cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all"
            >
              <span className="text-micro-label font-medium text-[var(--text-secondary)] truncate">
                {isEn ? 'Fixed' : 'Fasta'}
              </span>
              <span
                className={`text-label font-semibold font-amount tabular-nums truncate mt-0.5 ${
                  totalFixedDisplay > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                {totalFixedDisplay > 0 ? formatAmount(totalFixedDisplay, language) : '0'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                onNavigate?.('budget', 'savings');
              }}
              className="flex flex-col min-w-0 px-2.5 text-left bg-transparent border-y-0 border-r-0 p-0 cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all"
            >
              <span className="text-micro-label font-medium text-[var(--text-secondary)] truncate">
                {isEn ? 'Savings' : 'Sparande'}
              </span>
              <span
                className={`text-label font-semibold font-amount tabular-nums truncate mt-0.5 ${
                  totalSavingsDisplay > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                {totalSavingsDisplay > 0 ? formatAmount(totalSavingsDisplay, language) : '0'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof feedback?.light === 'function') feedback.light();
                onNavigate?.('transactions');
              }}
              className="flex flex-col min-w-0 pl-2.5 text-left bg-transparent border-y-0 border-r-0 p-0 cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all"
            >
              <span className="text-micro-label font-medium text-[var(--text-secondary)] truncate">
                {isEn ? 'Spent' : 'Spenderat'}
              </span>
              <span
                className={`text-label font-semibold font-amount tabular-nums truncate mt-0.5 ${
                  totalSpentDisplay > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                {totalSpentDisplay > 0 ? formatAmount(totalSpentDisplay, language) : '0'}
              </span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Detailed Calculation Info Modal */}
      {isCalculationInfoOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCalculationInfoOpen(false)}
          title={isEn ? 'Calculation Details' : 'Hur räknas det ut?'}
          size="sm"
        >
          <div className="space-y-4 text-left font-sans select-none">
            {/* Explanatory introduction */}
            <p className="text-secondary text-[var(--text-secondary)] leading-normal">
              {isEn 
                ? 'Your remaining budget is what is left for variable spending after deducting bills and savings from your income.' 
                : 'Kvar att spendera är vad som återstår för rörliga köp under perioden efter att fasta utgifter och sparande räknats bort.'}
            </p>

            {/* Status Explanation Surface (Zero Box-in-Box border) */}
            <div className={`p-3 rounded-card-nested flex flex-col min-w-0 text-xs ${status.badgeBgClass}`}>
              <span className={`font-bold ${status.badgeTextClass}`}>
                {isEn ? status.labelEn : status.labelSv}
              </span>
              <p className="text-label text-[var(--text-secondary)] mt-0.5 leading-snug">
                {isEn ? status.descriptionEn : status.descriptionSv}
              </p>
            </div>

            {/* Real-time Math Breakdown */}
            <div className="space-y-2 pt-0.5">
              {/* 1. Incomes */}
              <div className="flex justify-between items-center text-xs py-1 border-b border-[var(--border-divider)]">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Total Income' : 'Totala inkomster'}</span>
                <span className="font-semibold text-[var(--text-primary)] font-amount tabular-nums">
                  {formatAmount(stats?.totalIncome || 0, language)} {currency}
                </span>
              </div>

              {/* 2. Fixed Expenses */}
              <div className="flex justify-between items-center text-xs py-1 border-b border-[var(--border-divider)]">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Fixed Expenses' : 'Fasta utgifter (verkliga)'}</span>
                <span className="font-semibold text-[var(--text-primary)] font-amount tabular-nums">
                  −{formatAmount(stats?.totalFixed || 0, language)} {currency}
                </span>
              </div>

              {/* 3. Monthly Savings */}
              <div className="flex justify-between items-center text-xs py-1 border-b border-[var(--border-divider)]">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Monthly Savings' : 'Månadssparande'}</span>
                <span className="font-semibold text-[var(--text-primary)] font-amount tabular-nums">
                  −{formatAmount(totalSavingsDisplay, language)} {currency}
                </span>
              </div>

              {/* 4. Disposable Pot = Income - Fixed - Savings */}
              <div className="flex justify-between items-center text-xs py-2 px-2.5 bg-[var(--surface-muted)] rounded-card-nested">
                <span className="font-medium text-[var(--text-primary)]">{isEn ? 'Disposable Pot' : 'Rörlig pott för perioden'}</span>
                <span className="font-bold text-[var(--text-primary)] font-amount tabular-nums">
                  {formatAmount(stats?.disposablePot || 0, language)} {currency}
                </span>
              </div>

              {/* 5. Total Spent in Period */}
              <div className="flex justify-between items-center text-xs py-1 border-b border-[var(--border-divider)]">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Variable Spent' : 'Spenderat hittills'}</span>
                <span className="font-semibold text-[var(--text-primary)] font-amount tabular-nums">
                  −{formatAmount(stats?.totalSpentInPeriod || 0, language)} {currency}
                </span>
              </div>

              {/* 6. Extra Income / Swish */}
              {stats?.totalExtraIncomeInPeriod > 0 && (
                <div className="flex justify-between items-center text-xs py-1 border-b border-[var(--border-divider)]">
                  <span className="text-[var(--text-secondary)]">{isEn ? 'Extra Income' : 'Extra inkomster'}</span>
                  <span className="font-semibold text-[var(--text-primary)] font-amount tabular-nums">
                    +{formatAmount(stats?.totalExtraIncomeInPeriod || 0, language)} {currency}
                  </span>
                </div>
              )}

              {/* 7. Remaining to Spend */}
              <div
                className={`flex justify-between items-center text-xs py-2.5 px-2.5 rounded-card-nested ${
                  remainingCents < 0 ? 'bg-[var(--danger-container)]' : 'bg-[var(--surface-muted)]'
                }`}
              >
                <span className="font-bold text-[var(--text-primary)]">{isEn ? 'Remaining to Spend' : 'Kvar att spendera'}</span>
                <span
                  className={`font-extrabold font-amount tabular-nums ${
                    remainingCents < 0 ? 'text-[var(--danger-color)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {remainingCents < 0 ? '−' : ''}{formatAmount(Math.abs(Math.round(stats?.remainingPeriodCents || 0)), language)} {currency}
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
