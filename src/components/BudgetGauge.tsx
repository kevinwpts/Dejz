import React, { useMemo } from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import { formatAmount } from '../utils/format';
import { getBudgetStatus } from '../utils/budgetStatus';
import { Icon } from './ui/Icon';
import { Card } from './ui/Card';
import { feedback } from '../utils/feedback';

interface BudgetGaugeProps {
  remainingCents: number;
  disposablePotCents: number;
  currency: string;
  language: string;
  label?: string;
  onOpenInfo?: () => void;
  timeText?: string;
  timeRatio?: number;
  remainingDays?: number;
  totalDays?: number;
  calendarDays?: any[];
  periodIntervalText?: string;
  paydayText?: string;
  onOpenPeriodInfo?: () => void;
}

export function BudgetGauge({
  remainingCents,
  disposablePotCents,
  currency,
  language,
  label = 'Kvar att spendera',
  onOpenInfo,
  timeText,
  timeRatio,
  remainingDays,
  totalDays,
  _calendarDays,
  periodIntervalText,
  paydayText,
  onOpenPeriodInfo,
}: BudgetGaugeProps) {
  const isEn = language === 'en';
  const isNegative = remainingCents < 0;

  // Derive status from economic state and remaining time
  const status = useMemo(() => {
    const calcRemainingDays = remainingDays ?? (timeRatio !== undefined ? Math.round(timeRatio * 30) : 15);
    const calcTotalDays = totalDays ?? 30;
    return getBudgetStatus({
      remainingCents,
      disposablePotCents,
      remainingDays: calcRemainingDays,
      totalDays: calcTotalDays,
    });
  }, [remainingCents, disposablePotCents, remainingDays, totalDays, timeRatio]);

  // Initial disposable budget from the start of the period (100% baseline)
  const startPot = useMemo(() => {
    if (disposablePotCents > 0) return disposablePotCents;
    if (remainingCents > 0) return remainingCents;
    return 0;
  }, [disposablePotCents, remainingCents]);

  // Percentage representing where the user is now compared to the beginning of the period
  const percentage = useMemo(() => {
    if (startPot <= 0) return 0;
    if (remainingCents <= 0) return 0;
    return Math.round((remainingCents / startPot) * 100);
  }, [remainingCents, startPot]);

  // Clamped fraction (0 to 1) for the SVG progress ring
  const clampedFraction = useMemo(() => {
    if (startPot <= 0) return 0;
    if (remainingCents <= 0) return 0;
    return Math.max(0, Math.min(1, remainingCents / startPot));
  }, [remainingCents, startPot]);

  // Semi-circle arc geometry (viewBox 0 0 100 56, center at 50,50 with r=40)
  const arcLength = Math.PI * 40; // ≈ 125.664
  const strokeDashoffset = arcLength * (1 - clampedFraction);

  const circleTitle = useMemo(() => {
    return isEn
      ? `Start: ${formatAmount(startPot, language)} ${currency} · Left: ${formatAmount(remainingCents, language)} ${currency} (${percentage}%)`
      : `Start: ${formatAmount(startPot, language)} ${currency} · Kvar: ${formatAmount(remainingCents, language)} ${currency} (${percentage}%)`;
  }, [startPot, remainingCents, percentage, language, currency, isEn]);

  return (
    <div className="w-full select-none">
      <Card variant="default" padding="md" className="border-none relative overflow-hidden transition-all">
        {/* Main Row: (Label + Hero Amount) on left, Semi-circle Gauge on right */}
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          {/* Primary Amount for entire period (Left) */}
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-metric-label">
                {label}
              </span>
              {onOpenInfo && (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof feedback?.tap === 'function') feedback.tap();
                    onOpenInfo();
                  }}
                  className="p-1 -m-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                  aria-label="Info"
                  title={isEn ? 'How is this calculated?' : 'Hur beräknas detta?'}
                >
                  <Icon name="info" size={13} />
                </button>
              )}
            </div>

            <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
              <AnimatedNumber
                value={remainingCents}
                className={`text-hero-amount leading-none font-semibold ${
                  isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-primary)]'
                }`}
                formatter={(val) => formatAmount(val, language)}
              />
              <span
                className={`text-card-title leading-none shrink-0 font-medium ${
                  isNegative ? 'text-rose-600/80 dark:text-rose-400/80' : 'text-[var(--text-secondary)]'
                }`}
              >
                {currency || 'kr'}
              </span>
            </div>
          </div>

          {/* Elegant Enlarged Semi-Circle Progress Indicator (Right) */}
          <button
            type="button"
            onClick={() => {
              if (typeof feedback?.tap === 'function') feedback.tap();
              onOpenInfo?.();
            }}
            className="flex flex-col items-center shrink-0 p-1 -m-1 rounded-[var(--radius-card-nested,10px)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-all cursor-pointer border-none bg-transparent active:scale-95 text-left group"
            aria-label={isEn ? 'Budget status details' : 'Detaljer för budgetstatus'}
            title={circleTitle}
          >
            <div className="relative w-[124px] sm:w-[140px] h-[66px] sm:h-[74px] flex items-end justify-center">
              <svg viewBox="0 0 100 58" className="w-full h-full overflow-visible">
                {/* Background track semi-circle */}
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  className="text-black/[0.06] dark:text-white/[0.08]"
                />
                {/* Active progress arc with semantic color */}
                {clampedFraction > 0 && (
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke={status.colorHex}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={arcLength}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
                  />
                )}
              </svg>

              {/* Inside semi-circle: visually centered percentage text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-2.5 sm:pt-3 pointer-events-none">
                <span className="font-amount font-bold text-base sm:text-lg tabular-nums text-[var(--text-primary)] leading-none tracking-tight">
                  {percentage}%
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Bottom Section: Divider + Aktuell period & Nästa lön */}
        {periodIntervalText ? (
          <button
            type="button"
            onClick={() => {
              if (typeof feedback?.tap === 'function') feedback.tap();
              onOpenPeriodInfo?.();
            }}
            className="w-full pt-3 mt-3 border-t border-subtle flex items-center justify-between text-left cursor-pointer active:scale-[0.99] transition-all bg-transparent border-none p-0 group"
          >
            {/* Left: Aktuell period */}
            <div className="flex flex-col min-w-0">
              <span className="text-label text-[var(--text-secondary)] font-normal leading-tight">
                {isEn ? 'Current period' : 'Aktuell period'}
              </span>
              <span className="text-body-medium text-[var(--text-primary)] font-medium truncate mt-0.5 group-hover:text-[var(--accent-color)] transition-colors">
                {periodIntervalText}
              </span>
            </div>

            {/* Subtle Divider */}
            <div className="h-6 w-[1px] bg-black/[0.06] dark:bg-white/[0.08] shrink-0 mx-3" />

            {/* Right: Nästa lön */}
            <div className="flex flex-col items-end shrink-0 text-right">
              <span className="text-label text-[var(--text-secondary)] font-normal leading-tight">
                {isEn ? 'Next payday' : 'Nästa lön'}
              </span>
              <span className="text-body-medium text-[var(--text-primary)] font-medium font-amount tabular-nums truncate mt-0.5 group-hover:text-[var(--accent-color)] transition-colors">
                {paydayText}
              </span>
            </div>
          </button>
        ) : timeText ? (
          <div className="pt-2.5 sm:pt-3 mt-2 border-t border-subtle flex items-center justify-between text-label text-[var(--text-secondary)]">
            <span className="font-medium tracking-tight">{timeText}</span>
            {remainingDays !== undefined && totalDays !== undefined && (
              <span className="font-amount tabular-nums text-micro-label opacity-80">
                {isEn
                  ? `Day ${totalDays - remainingDays + 1} of ${totalDays}`
                  : `Dag ${totalDays - remainingDays + 1} av ${totalDays}`}
              </span>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
