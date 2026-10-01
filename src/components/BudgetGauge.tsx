import React, { useMemo } from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import { formatAmount } from '../utils/format';

interface BudgetGaugeProps {
  remainingCents: number;
  disposablePotCents: number;
  currency: string;
  language: string;
  label?: string;
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

  // SVG viewBox = "0 0 340 180"
  // Arc center = (170, 170)
  // Outer radius R = 170, Inner radius r = 136, Stroke width = 34
  // Stroke center radius = (170 + 136) / 2 = 153
  const strokeRadius = 153;
  const arcLength = Math.PI * strokeRadius; // ~480.6637
  const dashOffset = arcLength * (1 - fillRatio);

  /*
    Closed track shape path string with 6px rounded end caps at bottom left/right corners:
    - Outer arc radius R = 170 from (0, 164) to (340, 164)
    - Inner arc radius r = 136 from (300, 164) to (40, 164)
    - 6px corner arcs at (0,164)-(6,170), (334,170)-(340,164), (306,170)-(300,164), (34,170)-(40,164)
  */
  const trackPath =
    "M 6,170 A 6,6 0 0,1 0,164 A 170,170 0 0,1 340,164 A 6,6 0 0,1 334,170 L 306,170 A 6,6 0 0,1 300,164 A 136,136 0 0,0 40,164 A 6,6 0 0,1 34,170 Z";

  return (
    <div className="w-full max-w-[380px] mx-auto px-6 pt-2 pb-1 relative select-none">
      <div className="relative w-full aspect-[340/180]">
        <svg
          viewBox="0 0 340 180"
          className="w-full h-full block overflow-visible"
        >
          <defs>
            <clipPath id="budget-gauge-clip">
              <path d={trackPath} />
            </clipPath>
          </defs>

          {/* Clipped Group for exact 6px rounded end caps */}
          <g clipPath="url(#budget-gauge-clip)">
            {/* Background track (discrete neutral theme color) */}
            <path
              d={trackPath}
              className="fill-[#E2DDD4] dark:fill-[#333333] transition-colors duration-300"
            />

            {/* Solid orange fill arc (#FF7518) */}
            <path
              d="M 17,170 A 153,153 0 0,1 323,170"
              fill="none"
              stroke="#FF7518"
              strokeWidth="38"
              strokeLinecap="butt"
              strokeDasharray={`${arcLength} ${arcLength}`}
              strokeDashoffset={dashOffset}
              style={{
                transition: prefersReducedMotion
                  ? 'none'
                  : 'stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </g>
        </svg>

        {/* Text centered inside the semi-circle arc */}
        <div className="absolute inset-x-0 bottom-1 sm:bottom-2 flex flex-col items-center justify-center text-center pointer-events-none">
          {/* Heading: 14px, medium, secondary text color */}
          <span className="text-[14px] font-medium text-[#6D6962] dark:text-[#A8A8A8] block leading-snug">
            {label}
          </span>

          {/* Remaining amount: ~38px, semibold, Swedish number format */}
          <div className="flex items-baseline justify-center gap-1.5 mt-1">
            <AnimatedNumber
              value={remainingCents}
              className={`text-[34px] sm:text-[38px] font-semibold leading-none font-amount tabular-nums tracking-tight ${
                isNegative
                  ? 'text-rose-500 dark:text-rose-400'
                  : 'text-[#1C1917] dark:text-white'
              }`}
              formatter={(val) => formatAmount(val, language)}
            />
            <span
              className={`text-[18px] sm:text-[20px] font-normal leading-none ${
                isNegative
                  ? 'text-rose-500/80 dark:text-rose-400/80'
                  : 'text-[#6D6962] dark:text-[#A8A8A8]'
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
