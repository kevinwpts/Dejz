import React, { useMemo } from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import { formatAmount } from '../utils/format';

interface BudgetGaugeProps {
  remainingCents: number;
  disposablePotCents: number;
  currency: string;
  language: string;
  label?: string;
  onOpenInfo?: () => void;
}

export function BudgetGauge({
  remainingCents,
  disposablePotCents,
  currency,
  language,
  label = 'Kvar att spendera',
}: BudgetGaugeProps) {
  // Respect prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const isNegative = remainingCents < 0;

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

  return (
    <div className="w-full max-w-[360px] mx-auto px-4 relative select-none">
      <div className="relative w-full aspect-[360/198]">
        <svg
          viewBox="0 0 360 198"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto block overflow-visible"
        >
          {/* Layer 1: Background track in grey */}
          <path
            d={gaugePath}
            fill="none"
            strokeWidth="30"
            strokeLinecap="butt"
            pathLength={100}
            className="stroke-[#E2DDD4] dark:stroke-white/10 transition-colors duration-300"
          />

          {/* Layer 2: Fill arc using accent color */}
          <path
            d={gaugePath}
            fill="none"
            stroke="var(--accent-color)"
            strokeWidth="30"
            strokeLinecap="butt"
            pathLength={100}
            strokeDasharray="100 100"
            strokeDashoffset={dashOffset}
            style={{
              transition: prefersReducedMotion
                ? 'none'
                : 'stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>

        {/* Text centered inside the semi-circle arc */}
        <div className="absolute inset-x-0 bottom-3 sm:bottom-4 flex flex-col items-center justify-center text-center pointer-events-none">
          {/* Heading */}
          <div className="flex items-center justify-center gap-1.5 pointer-events-auto">
            <span className="text-[13px] sm:text-[14px] font-medium text-[#6D6962] dark:text-[#A8A8A8] block leading-snug">
              {label}
            </span>
          </div>

          {/* Remaining amount: Swedish number format */}
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
        </div>
      </div>
    </div>
  );
}
