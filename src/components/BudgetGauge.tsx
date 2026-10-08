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
  calendarDays = [],
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

  // Compute trend data from day 1 to today
  const chartData = useMemo(() => {
    if (!calendarDays || calendarDays.length === 0) return [];
    const todayIdx = calendarDays.findIndex((d: any) => d.isToday);
    const endIndex = todayIdx !== -1 ? todayIdx : calendarDays.length - 1;
    const slice = calendarDays.slice(0, endIndex + 1);
    return slice.map((d: any) => d.availableForD ?? 0);
  }, [calendarDays]);

  const { pathD, areaD, points } = useMemo(() => {
    if (chartData.length < 2) return { pathD: '', areaD: '', points: [] };
    const minVal = Math.min(...chartData);
    const maxVal = Math.max(...chartData);
    const range = maxVal - minVal || 1;
    const width = 130;
    const height = 44;

    const pts = chartData.map((val, i) => {
      const x = (i / (chartData.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 10) - 5;
      return { x, y };
    });

    const pD = pts.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const aD = `${pD} L ${width} ${height} L 0 ${height} Z`;
    return { pathD: pD, areaD: aD, points: pts };
  }, [chartData]);

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

        {/* Amount & Trend Line Chart Row */}
        <div className="flex items-center justify-between gap-4 my-2">
          {/* Large Amount Display */}
          <div className="flex items-baseline gap-1.5">
            <AnimatedNumber
              value={remainingCents}
              className={`text-[34px] sm:text-[40px] font-extrabold leading-none font-amount tabular-nums tracking-tight ${
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

          {/* Trend Line Chart (Day 1 -> Today) */}
          {chartData.length > 1 && (
            <div className="hidden xs:flex flex-col items-end shrink-0">
              <span className="text-[10px] font-medium text-[var(--text-secondary)] mb-1 tracking-tight">
                {isEn ? 'Trend (Day 1 → Today)' : 'Trend (Dag 1 → Idag)'}
              </span>
              <div className="relative w-[120px] sm:w-[136px] h-[42px]">
                <svg viewBox="0 0 130 44" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={status.colorHex} stopOpacity="0.25" />
                      <stop offset="100%" stopColor={status.colorHex} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={areaD} fill="url(#trendGradient)" />
                  <path
                    d={pathD}
                    fill="none"
                    stroke={status.colorHex}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {points.length > 0 && (
                    <circle
                      cx={points[points.length - 1].x}
                      cy={points[points.length - 1].y}
                      r="3.5"
                      fill={status.colorHex}
                      className="shadow-sm"
                    />
                  )}
                </svg>
              </div>
            </div>
          )}
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
