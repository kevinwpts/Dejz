import React, { useMemo } from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import { formatAmount } from '../utils/format';
import { getBudgetStatus } from '../utils/budgetStatus';
import { Icon } from './ui/Icon';
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

  // Circle geometry (viewBox 0 0 64 64)
  const radius = 26;
  const circumference = 2 * Math.PI * radius; // ≈ 163.363
  const strokeDashoffset = circumference * (1 - clampedFraction);

  const subLabel = useMemo(() => {
    if (isNegative) return isEn ? 'exceeded' : 'slut';
    if (percentage === 0) return isEn ? '0 left' : '0 kvar';
    return isEn ? 'left' : 'kvar';
  }, [isNegative, percentage, isEn]);

  const circleTitle = useMemo(() => {
    return isEn
      ? `Start: ${formatAmount(startPot, language)} ${currency} · Left: ${formatAmount(remainingCents, language)} ${currency} (${percentage}%)`
      : `Start: ${formatAmount(startPot, language)} ${currency} · Kvar: ${formatAmount(remainingCents, language)} ${currency} (${percentage}%)`;
  }, [startPot, remainingCents, percentage, language, currency, isEn]);

  return (
    <div className="w-full select-none">
      <div className="bg-[var(--surface-color)] rounded-card card-p shadow-subtle relative overflow-hidden transition-all">
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-2 sm:mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-secondary font-semibold">
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
        </div>

        {/* Amount & Circular Gauge Row */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 my-1">
          {/* Large Amount Display (Left) */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-1 sm:gap-1.5 min-w-0">
              <AnimatedNumber
                value={remainingCents}
                className={`text-hero-amount leading-none ${
                  isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-primary)]'
                }`}
                formatter={(val) => formatAmount(val, language)}
              />
              <span
                className={`text-card-title leading-none shrink-0 ${
                  isNegative ? 'text-rose-600/80 dark:text-rose-400/80' : 'text-[var(--text-secondary)]'
                }`}
              >
                {currency || 'kr'}
              </span>
            </div>

            {/* Status indicator badge under amount */}
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: status.colorHex }}
              />
              <span className="text-micro-label font-medium text-[var(--text-secondary)] truncate">
                {isEn ? status.labelEn : status.labelSv}
              </span>
            </div>
          </div>

          {/* Circular Progress Gauge (Right) */}
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
            <div className="relative w-[60px] h-[60px] sm:w-[66px] sm:h-[66px] flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-full h-full transform -rotate-90">
                {/* Background track circle */}
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4.5"
                  className="text-black/[0.06] dark:text-white/[0.08]"
                />
                {/* Animated active progress arc */}
                {clampedFraction > 0 && (
                  <circle
                    cx="32"
                    cy="32"
                    r={radius}
                    fill="none"
                    stroke={status.colorHex}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
                  />
                )}
              </svg>

              {/* Inside circle content: percentage & status */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="font-amount font-bold text-xs sm:text-[13px] tabular-nums text-[var(--text-primary)] leading-none">
                  {percentage}%
                </span>
                <span className="text-[9px] text-[var(--text-secondary)] font-medium leading-none mt-0.5">
                  {subLabel}
                </span>
              </div>
            </div>

            <span className="text-micro-label text-[var(--text-secondary)] font-medium mt-1 tabular-nums whitespace-nowrap">
              {isEn ? 'of start' : 'av start'}
            </span>
          </button>
        </div>

        {/* Bottom Time / Payday Countdown Info */}
        {timeText && (
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
        )}
      </div>
    </div>
  );
}
