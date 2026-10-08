import React, { useMemo } from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import { formatAmount } from '../utils/format';
import { getBudgetStatus } from '../utils/budgetStatus';
import { Icon } from './ui/Icon';

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
}: BudgetGaugeProps) {
  // Respect prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

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

  // Calculate fill ratio between 0 and 1
  const fillRatio = useMemo(() => {
    if (disposablePotCents <= 0) return 0;
    const ratio = remainingCents / disposablePotCents;
    return Math.max(0, Math.min(1, ratio));
  }, [remainingCents, disposablePotCents]);

  // Dash offset calculated with normalized pathLength = 100
  const dashOffset = 100 * (1 - fillRatio);

  // Original standard semi-circle arc path geometry
  const gaugePath = "M 22 180 A 158 158 0 0 1 338 180";
  const innerGaugePath = "M 42 180 A 138 138 0 0 1 318 180";

  return (
    <div className="w-full max-w-[360px] mx-auto px-4 relative select-none">
      <div className="relative w-full aspect-[360/198]">
        <svg
          viewBox="0 0 360 198"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto block overflow-visible"
        >
          {/* Layer 1: Background track in discrete neutral theme color */}
          <path
            d={gaugePath}
            fill="none"
            strokeWidth="30"
            strokeLinecap="butt"
            pathLength={100}
            className="stroke-[#E2DDD4] dark:stroke-white/10 transition-colors duration-300"
          />

          {/* Layer 2: Fill arc using current status color (decoupled from user accent color) */}
          <path
            d={gaugePath}
            fill="none"
            stroke={status.colorHex}
            strokeWidth="30"
            strokeLinecap="butt"
            pathLength={100}
            strokeDasharray="100 100"
            strokeDashoffset={dashOffset}
            style={{
              transition: prefersReducedMotion
                ? 'none'
                : 'stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1), stroke 300ms ease',
            }}
          />

          {/* Concentric Layer 3 (Time Tracker): Thinner inner track showing elapsed time */}
          {timeRatio !== undefined && (
            <>
              <path
                d={innerGaugePath}
                fill="none"
                strokeWidth="10"
                strokeLinecap="butt"
                pathLength={100}
                className="stroke-[#E2DDD4]/40 dark:stroke-white/5 transition-colors duration-300"
              />
              <path
                d={innerGaugePath}
                fill="none"
                stroke={status.colorHex}
                strokeWidth="10"
                strokeLinecap="butt"
                pathLength={100}
                strokeDasharray="100 100"
                strokeDashoffset={100 * (1 - timeRatio)}
                className="opacity-35"
                style={{
                  transition: prefersReducedMotion
                    ? 'none'
                    : 'stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1), stroke 300ms ease',
                }}
              />
            </>
          )}
        </svg>

        {/* Text centered inside the semi-circle arc */}
        <div className="absolute inset-x-0 bottom-7 sm:bottom-8 flex flex-col items-center justify-center text-center pointer-events-none">
          {/* Heading & Info Button */}
          <div className="flex items-center justify-center gap-1.5 pointer-events-auto">
            <span className="text-[13px] sm:text-[14px] font-medium text-[#6D6962] dark:text-[#A8A8A8] block leading-snug">
              {label}
            </span>
            {onOpenInfo && (
              <button
                type="button"
                onClick={onOpenInfo}
                className="p-1 -m-1 rounded-full text-[#6D6962]/75 hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                aria-label="Info"
                title={language === 'en' ? 'How is this calculated?' : 'Hur beräknas detta?'}
              >
                <Icon name="info" size={12.5} />
              </button>
            )}
          </div>

          {/* Remaining amount: Swedish number format, app's standard text color */}
          <div className="flex items-baseline justify-center gap-1 mt-1">
            <AnimatedNumber
              value={remainingCents}
              className={`text-[34px] sm:text-[38px] font-semibold leading-none font-amount tabular-nums tracking-tight ${
                isNegative
                  ? 'text-rose-500 dark:text-rose-400'
                  : 'text-[var(--text-primary)]'
              }`}
              formatter={(val) => formatAmount(val, language)}
            />
            <span
              className={`text-[18px] sm:text-[20px] font-normal leading-none ${
                isNegative
                  ? 'text-rose-500/80 dark:text-rose-400/80'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              {currency || 'kr'}
            </span>
          </div>

          {/* Integrated Time Countdown */}
          {timeText && (
            <span className="text-[11px] font-semibold text-[#6D6962] dark:text-[#A8A8A8] mt-1.5 block leading-none select-none tracking-tight animate-fade-in">
              {timeText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
