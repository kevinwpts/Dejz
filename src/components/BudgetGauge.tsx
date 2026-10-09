import React, { useMemo, useState, useRef, useCallback } from 'react';
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
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  // Compute points from Day 1 in the period to today
  const trendPoints = useMemo(() => {
    interface PointItem {
      day: number;
      value: number;
      label: string;
      dateStr?: string;
      isToday: boolean;
    }

    const points: PointItem[] = [];

    if (calendarDays && calendarDays.length > 0) {
      // Find today's index in the period
      const todayIdx = calendarDays.findIndex((d: any) => d.isToday);
      const endIndex = todayIdx !== -1 ? todayIdx : Math.max(0, calendarDays.length - 1);
      const slice = calendarDays.slice(0, endIndex + 1);

      // Start from the initial disposable pot
      let currentBal = disposablePotCents > 0 ? disposablePotCents : remainingCents;

      // First point: Period Start (Day 1 start)
      points.push({
        day: 1,
        value: currentBal,
        label: isEn ? 'Day 1 Start' : 'Dag 1 Start',
        isToday: slice.length === 1 && todayIdx === 0,
      });

      // Walk through passed days and compute remaining balance after each day's activity
      slice.forEach((d: any, idx: number) => {
        const spent = Number(d.daySpent) || 0;
        const inc = Number(d.dayIncome) || 0;
        currentBal = currentBal - spent + inc;

        const isLastDay = idx === slice.length - 1;
        const formattedDate = d.date
          ? new Date(d.date).toLocaleDateString(isEn ? 'en-US' : 'sv-SE', {
              day: 'numeric',
              month: 'short',
            })
          : undefined;

        points.push({
          day: idx + 1,
          value: isLastDay ? remainingCents : currentBal,
          label: isEn ? `Day ${idx + 1}` : `Dag ${idx + 1}`,
          dateStr: formattedDate,
          isToday: isLastDay,
        });
      });
    }

    // Safety fallback: Ensure we always have at least 2 points to draw a clean line
    if (points.length < 2) {
      const startPot = disposablePotCents > 0 ? disposablePotCents : remainingCents + 100000;
      return [
        { day: 1, value: startPot, label: isEn ? 'Day 1' : 'Dag 1', isToday: false },
        { day: 2, value: remainingCents, label: isEn ? 'Today' : 'Idag', isToday: true },
      ];
    }

    return points;
  }, [calendarDays, disposablePotCents, remainingCents, isEn]);

  // Dimensions of SVG sparkline
  const svgWidth = 126;
  const svgHeight = 44;
  const padX = 6;
  const padY = 6;

  const { pathD, areaD, screenPoints } = useMemo(() => {
    if (trendPoints.length < 2) {
      return { pathD: '', areaD: '', screenPoints: [] };
    }

    const values = trendPoints.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const usableWidth = svgWidth - padX * 2;
    const usableHeight = svgHeight - padY * 2;

    const pts = trendPoints.map((p, i) => {
      const x = padX + (i / (trendPoints.length - 1)) * usableWidth;
      const y = svgHeight - padY - ((p.value - min) / range) * usableHeight;
      return { ...p, x, y };
    });

    // Build smooth cubic Bezier path
    let pD = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      pD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const lastPt = pts[pts.length - 1];
    const firstPt = pts[0];
    const aD = `${pD} L ${lastPt.x.toFixed(1)} ${svgHeight} L ${firstPt.x.toFixed(1)} ${svgHeight} Z`;

    return { pathD: pD, areaD: aD, screenPoints: pts };
  }, [trendPoints]);

  const lastPoint = screenPoints[screenPoints.length - 1];
  const activePoint = hoveredIndex !== null && screenPoints[hoveredIndex] ? screenPoints[hoveredIndex] : null;

  // Handle pointer interactions on the SVG chart
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current || screenPoints.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const svgX = (clientX / rect.width) * svgWidth;

      // Find closest point by x coordinate
      let closestIdx = 0;
      let minDiff = Infinity;
      screenPoints.forEach((pt, idx) => {
        const diff = Math.abs(pt.x - svgX);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      setHoveredIndex(closestIdx);
    },
    [screenPoints]
  );

  const handlePointerLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  return (
    <div className="w-full select-none">
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-card,16px)] p-4 sm:p-5 shadow-sm relative overflow-hidden transition-all">
        {/* Top Header Row */}
        <div className="flex items-center justify-between mb-2 sm:mb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-secondary font-semibold">
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

          {/* Status Indicator (round dot) */}
          <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/[0.03] dark:bg-white/[0.05]">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: status.colorHex }} />
          </div>
        </div>

        {/* Amount & Trend Line Chart Row */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 my-1">
          {/* Large Amount Display */}
          <div className="flex items-baseline gap-1 sm:gap-1.5 shrink-0 min-w-0">
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

          {/* Trend Line Chart (Always visible on all screen sizes, Day 1 -> Today) */}
          <div className="flex flex-col items-end shrink-0">
            {/* Header / Tooltip on hover */}
            <div className="h-4 flex items-center justify-end mb-1">
              {activePoint ? (
                <span className="text-micro-label font-semibold text-[var(--text-primary)] tabular-nums animate-fade-in">
                  {activePoint.label}: {formatAmount(activePoint.value, language)} {currency}
                </span>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.colorHex }} />
                  <span className="text-micro-label font-medium text-[var(--text-secondary)]">
                    {isEn ? 'Day 1 → Today' : 'Dag 1 → Idag'}
                  </span>
                </div>
              )}
            </div>

            {/* SVG Sparkline Container */}
            <div className="relative w-[114px] xs:w-[126px] sm:w-[136px] h-[40px] sm:h-[44px]">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible cursor-crosshair touch-none"
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
              >
                <defs>
                  <linearGradient id="budgetTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={status.colorHex} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={status.colorHex} stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Subtle baseline */}
                <line
                  x1={padX}
                  y1={svgHeight - padY}
                  x2={svgWidth - padX}
                  y2={svgHeight - padY}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />

                {/* Area under curve */}
                {areaD && <path d={areaD} fill="url(#budgetTrendGradient)" />}

                {/* Line Path */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={status.colorHex}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Active Hover Point Marker */}
                {activePoint && (
                  <g>
                    <line
                      x1={activePoint.x}
                      y1={padY}
                      x2={activePoint.x}
                      y2={svgHeight - padY}
                      stroke={status.colorHex}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      strokeOpacity="0.5"
                    />
                    <circle
                      cx={activePoint.x}
                      cy={activePoint.y}
                      r="4.5"
                      fill={status.colorHex}
                      stroke="var(--surface-color)"
                      strokeWidth="2"
                    />
                  </g>
                )}

                {/* End Point (Today) with glowing pulse */}
                {!activePoint && lastPoint && (
                  <g>
                    <circle
                      cx={lastPoint.x}
                      cy={lastPoint.y}
                      r="6.5"
                      fill={status.colorHex}
                      fillOpacity="0.2"
                      className="animate-pulse"
                    />
                    <circle
                      cx={lastPoint.x}
                      cy={lastPoint.y}
                      r="3.5"
                      fill={status.colorHex}
                      stroke="var(--surface-color)"
                      strokeWidth="1.5"
                    />
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Time / Payday Countdown Info */}
        {timeText && (
          <div className="pt-2.5 sm:pt-3 mt-2 border-t border-black/[0.03] dark:border-white/[0.04] flex items-center justify-between text-label text-[var(--text-secondary)]">
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
