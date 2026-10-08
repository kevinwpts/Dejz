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

  // Calculate spent ratio between 0 and 100%
  const spentRatio = useMemo(() => {
    if (disposablePotCents <= 0) return 0;
    const spent = disposablePotCents - remainingCents;
    const ratio = (spent / disposablePotCents) * 100;
    return Math.max(0, Math.min(100, ratio));
  }, [remainingCents, disposablePotCents]);

  return (
    <div className="w-full select-none">
      <div className="bg-[var(--surface-color)] rounded-[16px] p-5 sm:p-6 shadow-sm relative overflow-hidden transition-all">
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-[13px] font-semibold text-[var(--text-secondary)] tracking-tight">
              {label}
            </span>
            {onOpenInfo && (
              <button
                type="button"
                onClick={onOpenInfo}
                className="p-1 -m-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer border-none bg-transparent flex items-center justify-center"
                aria-label="Info"
                title={isEn ? 'How is this calculated?' : 'Hur beräknas detta?'}
              >
                <Icon name="info" size={13} />
              </button>
            )}
          </div>

          {/* Status Indicator (fully round dot without text) */}
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/[0.03] dark:bg-white/[0.05]">
            <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: status.colorHex }} />
          </div>
        </div>

        {/* Large Amount Display */}
        <div className="flex items-baseline gap-1.5 my-2">
          <AnimatedNumber
            value={remainingCents}
            className={`text-[36px] sm:text-[42px] font-extrabold leading-none font-amount tabular-nums tracking-tight ${
              isNegative ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text-primary)]'
            }`}
            formatter={(val) => formatAmount(val, language)}
          />
          <span
            className={`text-base sm:text-lg font-medium leading-none ${
              isNegative ? 'text-rose-600/80 dark:text-rose-400/80' : 'text-[var(--text-secondary)]'
            }`}
          >
            {currency || 'kr'}
          </span>
        </div>

        {/* Progress Bar (fully rounded) */}
        <div className="mt-4 mb-3 space-y-1.5">
          <div className="flex justify-between items-center text-[11px] font-medium text-[var(--text-secondary)]">
            <span>{isEn ? 'Budget usage' : 'Budgetanvändning'}</span>
            <span className="font-amount tabular-nums">{Math.round(spentRatio)}%</span>
          </div>
          <div className="relative h-3 w-full bg-black/[0.04] dark:bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${spentRatio}%`,
                backgroundColor: status.colorHex,
              }}
            />
          </div>
        </div>

        {/* Bottom Time / Payday Countdown Info */}
        {timeText && (
          <div className="pt-3 border-t border-black/[0.03] dark:border-white/[0.04] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="font-medium tracking-tight">{timeText}</span>
            {remainingDays !== undefined && totalDays !== undefined && (
              <span className="font-amount tabular-nums text-[11px] opacity-80">
                {isEn ? `Day ${totalDays - remainingDays + 1} of ${totalDays}` : `Dag ${totalDays - remainingDays + 1} av ${totalDays}`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
