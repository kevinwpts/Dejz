import React, { useMemo } from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import { formatAmount } from '../utils/format';
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
  _timeRatio,
  remainingDays,
  totalDays,
  _calendarDays,
  periodIntervalText,
  paydayText,
  _onOpenPeriodInfo,
}: BudgetGaugeProps) {
  const isEn = language === 'en';
  const isNegative = remainingCents < 0;

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

  return (
    <div className="w-full select-none">
      <Card
        variant="accent"
        padding="md"
        style={{ backgroundColor: 'var(--accent-color)', color: 'var(--on-accent)' }}
        className="border-none relative overflow-hidden transition-all shadow-subtle text-[var(--on-accent)]"
      >
        {/* Main Row: Total remaining budget + Per day budget + Thick Circular Gauge Ring */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Column: Totalt kvar + Stora siffran + /dag */}
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-card-title sm:text-body font-medium text-[var(--on-accent)] opacity-90">
                {label || (isEn ? 'Total remaining' : 'Totalt kvar')}
              </span>
              {onOpenInfo && (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof feedback?.tap === 'function') feedback.tap();
                    onOpenInfo();
                  }}
                  className="p-1 -m-1 rounded-full text-[var(--on-accent)] opacity-80 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                  aria-label="Info"
                  title={isEn ? 'How is this calculated?' : 'Hur beräknas detta?'}
                >
                  <Icon name="info" size={13} />
                </button>
              )}
            </div>

            <div className="flex items-baseline gap-1.5 min-w-0 pt-0.5">
              <AnimatedNumber
                value={remainingCents}
                className={`text-hero-amount leading-none font-bold tabular-nums tracking-tight ${
                  isNegative ? 'text-[var(--danger-color)]' : 'text-[var(--on-accent)]'
                }`}
                formatter={(val) => formatAmount(val, language)}
              />
              <span
                className={`text-sm sm:text-base leading-none shrink-0 font-medium ${
                  isNegative ? 'text-[var(--danger-color)]/80' : 'text-[var(--on-accent)]/80'
                }`}
              >
                {currency || 'kr'}
              </span>
            </div>

            {/* Per dag beloppet placerat direkt under det stora beloppet */}
            <div className="flex items-center gap-2 pt-0.5 text-xs text-[var(--on-accent)] opacity-90">
              <span className="font-semibold text-[var(--on-accent)] font-amount tabular-nums">
                {formatAmount(Math.round(remainingCents / Math.max(1, remainingDays ?? 1)), language)} {currency || 'kr'}{isEn ? '/day' : '/dag'}
              </span>
            </div>
          </div>

          {/* Right Column: Thick Circular Progress Ring */}
          <div className="flex-shrink-0 flex items-center justify-center pl-1">
            <div className="relative w-[84px] h-[84px] sm:w-[92px] sm:h-[92px] flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
                {/* Background Track Circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="8.5"
                  className="text-[var(--on-accent)] opacity-20 fill-none"
                />
                {/* Foreground Animated Circle */}
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="8.5"
                  strokeLinecap="round"
                  strokeDasharray={201.06}
                  strokeDashoffset={201.06 * (1 - clampedFraction)}
                  className="text-[var(--on-accent)] transition-all duration-500 ease-out fill-none"
                />
              </svg>
              {/* Center Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[16px] sm:text-[17px] font-bold font-amount tabular-nums text-[var(--on-accent)] leading-none">
                  {percentage}%
                </span>
                <span className="text-micro-label font-bold text-[var(--on-accent)] opacity-85 uppercase tracking-wider mt-0.5">
                  {isEn ? 'left' : 'kvar'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Divider + Aktuell period & Nästa lön */}
        {periodIntervalText ? (
          <div
            className="w-full pt-2.5 mt-2.5 border-t border-[var(--on-accent)]/20 flex items-center justify-between text-left p-0 text-[var(--on-accent)] select-none"
          >
            {/* Left: Aktuell period */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 text-label font-medium leading-tight text-[var(--on-accent)] opacity-80">
                <Icon name="calendar" size={12} className="shrink-0 opacity-80" />
                <span>{isEn ? 'Current period' : 'Aktuell period'}</span>
              </div>
              <span className="text-secondary sm:text-body font-semibold text-[var(--on-accent)] truncate mt-0.5">
                {periodIntervalText}
              </span>
            </div>

            {/* Subtle Divider */}
            <div className="h-5 w-[1px] bg-[var(--on-accent)]/20 shrink-0 mx-3" />

            {/* Right: Nästa lön */}
            <div className="flex flex-col items-end shrink-0 text-right">
              <div className="flex items-center gap-1.5 text-label font-medium leading-tight justify-end text-[var(--on-accent)] opacity-80">
                <Icon name="coins" size={12} className="shrink-0 opacity-80" />
                <span>{isEn ? 'Next payday' : 'Nästa lön'}</span>
              </div>
              <span className="text-secondary sm:text-body font-semibold font-amount tabular-nums text-[var(--on-accent)] truncate mt-0.5">
                {paydayText}
              </span>
            </div>
          </div>
        ) : timeText ? (
          <div className="pt-2 mt-2 border-t border-[var(--on-accent)]/20 flex items-center justify-between text-xs text-[var(--on-accent)] opacity-90">
            <div className="flex items-center gap-1.5 font-medium tracking-tight text-[var(--on-accent)]">
              <Icon name="calendar" size={12} className="shrink-0 opacity-80" />
              <span>{timeText}</span>
            </div>
            {remainingDays !== undefined && totalDays !== undefined && (
              <span className="font-amount tabular-nums text-micro-label text-[var(--on-accent)] opacity-80">
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
