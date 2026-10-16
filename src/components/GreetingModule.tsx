import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Button, Card, Icon, Modal } from './ui';
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

  const startPot = useMemo(() => {
    if (disposablePotCents > 0) return disposablePotCents;
    if (remainingCents > 0) return remainingCents;
    return 0;
  }, [disposablePotCents, remainingCents]);

  const percentage = useMemo(() => {
    if (startPot <= 0) return 0;
    if (remainingCents <= 0) return 0;
    return Math.round((remainingCents / startPot) * 100);
  }, [remainingCents, startPot]);

  const clampedFraction = useMemo(() => {
    if (startPot <= 0) return 0;
    if (remainingCents <= 0) return 0;
    return Math.max(0, Math.min(1, remainingCents / startPot));
  }, [remainingCents, startPot]);

  return (
    <div className="flex flex-col font-sans relative space-y-3.5">
      {/* 1. Main Neutral Hero Card - Kvar att spendera */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full select-none"
      >
        <div
          className="bg-[var(--surface-color)] border-none rounded-card p-5 sm:p-6 relative overflow-hidden transition-all shadow-subtle flex flex-col justify-between gap-3.5 text-[var(--text-primary)]"
        >
          {/* Top Row: Label & Info button */}
          <div className="relative z-10 flex items-center justify-between">
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

          {/* Middle: Large Amount */}
          <div className="relative z-10 flex items-baseline gap-1.5 min-w-0 py-0.5">
            <AnimatedNumber
              value={remainingCents}
              className={`text-hero-amount leading-none font-bold tabular-nums tracking-tight ${
                remainingCents < 0 ? 'text-[var(--danger-color)]' : 'text-[var(--text-primary)]'
              }`}
              formatter={(val) => formatAmount(val, language)}
            />
            <span className="text-[20px] leading-none shrink-0 font-semibold text-[var(--text-tertiary)] align-baseline tracking-tight">
              {currency || 'kr'}
            </span>
          </div>

          {/* Bottom: Thin progress bar + percentage */}
          <div className="relative z-10 space-y-2 pt-1">
            <div className="flex items-center justify-between text-micro-label font-medium text-[var(--text-secondary)]">
              <span>{isEn ? 'Remaining spendable' : 'Spenderbart kvar'}</span>
              <span className="font-amount tabular-nums font-bold text-[var(--text-primary)]">
                {remainingCents < 0 ? '0' : percentage} % {isEn ? 'left' : 'kvar'}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-black/[0.07] dark:bg-white/[0.09] overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${remainingCents < 0 ? 0 : Math.max(0, Math.min(100, clampedFraction * 100))}%`,
                  backgroundColor: 'var(--accent-color)'
                }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. Two Separate White Modules: Aktuell period & Nästa lön */}
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 select-none">
        {/* Module 1: Aktuell period */}
        <Card
          variant="default"
          padding="default"
          onClick={onOpenPeriodInfo}
          className="flex flex-col justify-between gap-1.5 text-left min-w-0 cursor-pointer hover:border-[var(--border-control)] transition-all"
        >
          <span className="text-metric-label font-medium text-[var(--text-secondary)] truncate">
            {isEn ? 'Current period' : 'Aktuell period'}
          </span>
          <span className="text-body-medium font-medium text-[var(--text-primary)] truncate mt-0.5">
            {periodIntervalText || (isEn ? 'Current period' : 'Aktuell period')}
          </span>
        </Card>

        {/* Module 2: Nästa lön */}
        <Card
          variant="default"
          padding="default"
          onClick={onOpenPeriodInfo}
          className="flex flex-col justify-between gap-1.5 text-left min-w-0 cursor-pointer hover:border-[var(--border-control)] transition-all"
        >
          <span className="text-metric-label font-medium text-[var(--text-secondary)] truncate">
            {isEn ? 'Next payday' : 'Nästa lön'}
          </span>
          <span className="text-body-medium font-medium font-amount tabular-nums text-[var(--text-primary)] truncate mt-0.5">
            {paydayText || '-'}
          </span>
        </Card>
      </div>

      {/* Detailed Calculation Info Modal */}
      <Modal
        isOpen={isCalculationInfoOpen}
        onClose={() => setIsCalculationInfoOpen(false)}
        title={isEn ? 'Calculation Details' : 'Hur räknas det ut?'}
        headerLeading={
          <div className="w-8 h-8 rounded-icon-button bg-[var(--accent-color)]/10 flex items-center justify-center shrink-0">
            <Icon name="info" size={16} className="text-[var(--accent-color)]" />
          </div>
        }
        size="sm"
        footer={
          <Button
            type="button"
            variant="primary"
            size="md"
            fullWidth
            onClick={() => setIsCalculationInfoOpen(false)}
          >
            {isEn ? 'Got it' : 'Jag förstår'}
          </Button>
        }
      >
        <div className="space-y-4 text-left font-sans">
          {/* Explanatory introduction */}
          <p className="text-secondary text-[var(--text-secondary)] leading-normal">
            {isEn 
              ? 'Your remaining budget is what is left for variable spending after deducting bills and savings from your income.' 
              : 'Kvar att spendera är vad som återstår för rörliga köp under perioden efter att fasta utgifter och sparande räknats bort.'}
          </p>

          {/* Status Explanation Card */}
          <div className={`p-3 rounded-card-nested border flex items-start gap-2.5 ${status.badgeBgClass} border-subtle`}>
            <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 shadow-xs" style={{ backgroundColor: status.colorHex }} />
            <div className="flex flex-col min-w-0 text-secondary">
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
            <div className="flex justify-between items-center text-secondary py-1 border-b border-subtle">
              <span className="text-[var(--text-secondary)]">{isEn ? 'Total Income' : 'Totala inkomster'}</span>
              <span className="font-semibold text-[var(--success-color)] font-amount tabular-nums">
                +{formatAmount(stats?.totalIncome || 0, language)} {currency}
              </span>
            </div>

            {/* 2. Fixed Expenses */}
            <div className="flex justify-between items-center text-secondary py-1 border-b border-subtle">
              <span className="text-[var(--text-secondary)]">{isEn ? 'Fixed Expenses' : 'Fasta utgifter (verkliga)'}</span>
              <span className="font-semibold text-[var(--danger-color)] font-amount tabular-nums">
                −{formatAmount(stats?.totalFixed || 0, language)} {currency}
              </span>
            </div>

            {/* 3. Monthly Savings */}
            <div className="flex justify-between items-center text-secondary py-1 border-b border-subtle">
              <span className="text-[var(--text-secondary)]">{isEn ? 'Monthly Savings' : 'Månadssparande'}</span>
              <span className="font-semibold text-[var(--warning-color)] font-amount tabular-nums">
                −{formatAmount(stats?.totalSavings || 0, language)} {currency}
              </span>
            </div>

            {/* 4. Disposable Pot = Income - Fixed - Savings */}
            <div className="flex justify-between items-center text-secondary py-1.5 px-2 bg-black/[0.03] dark:bg-white/[0.04] rounded-card-nested">
              <span className="font-medium text-[var(--text-primary)]">{isEn ? 'Disposable Pot' : 'Rörlig pott för perioden'}</span>
              <span className="font-bold text-[var(--text-primary)] font-amount tabular-nums">
                ={formatAmount(stats?.disposablePot || 0, language)} {currency}
              </span>
            </div>

            {/* 5. Total Spent in Period */}
            <div className="flex justify-between items-center text-secondary py-1 border-b border-subtle">
              <span className="text-[var(--text-secondary)]">{isEn ? 'Variable Spent' : 'Spenderat hittills'}</span>
              <span className="font-semibold text-[var(--danger-color)] font-amount tabular-nums">
                −{formatAmount(stats?.totalSpentInPeriod || 0, language)} {currency}
              </span>
            </div>

            {/* 6. Extra Income / Swish */}
            {stats?.totalExtraIncomeInPeriod > 0 && (
              <div className="flex justify-between items-center text-secondary py-1 border-b border-subtle">
                <span className="text-[var(--text-secondary)]">{isEn ? 'Extra Income' : 'Extra inkomster'}</span>
                <span className="font-semibold text-[var(--success-color)] font-amount tabular-nums">
                  +{formatAmount(stats?.totalExtraIncomeInPeriod || 0, language)} {currency}
                </span>
              </div>
            )}

            {/* 7. Remaining to Spend */}
            <div className="flex justify-between items-center text-secondary py-2 px-2 bg-[var(--accent-color)]/10 dark:bg-[var(--accent-color)]/20 rounded-card-nested border border-[var(--accent-color)]/15">
              <span className="font-bold text-[var(--text-primary)]">{isEn ? 'Remaining to Spend' : 'Kvar att spendera'}</span>
              <span className="font-extrabold text-[var(--text-primary)] font-amount tabular-nums">
                {formatAmount(stats?.remainingPeriodCents || 0, language)} {currency}
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
