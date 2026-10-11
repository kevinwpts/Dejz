import React, { useRef, useEffect, useState, useMemo } from 'react';
import { FixedExpense, Config, Transaction } from '../types';
import { TransactionLogo } from './TransactionLogo';
import { formatAmount } from '../utils/format';
import { Card } from './ui/Card';
import { Modal } from './ui/Modal';

interface FixedExpenseScrollTimelineProps {
  expenses: FixedExpense[];
  config: Config;
  onSelectExpense: (expense: FixedExpense) => void;
}

export function FixedExpenseScrollTimeline({
  expenses,
  config,
  onSelectExpense,
}: FixedExpenseScrollTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedDayGroup, setSelectedDayGroup] = useState<{ day: number; expenses: FixedExpense[] } | null>(null);

  const today = new Date();
  const currentDay = today.getDate(); // 1 - 31

  // Filter out cancelled expenses
  const activeExpenses = useMemo(() => {
    return (expenses || []).filter((e) => !e.isCancelled);
  }, [expenses]);

  // Group active expenses by deduction day (1..31)
  const expensesByDay = useMemo(() => {
    const map: Record<number, FixedExpense[]> = {};
    activeExpenses.forEach((exp) => {
      const d =
        typeof exp.deductionDay === 'number' && exp.deductionDay >= 1
          ? Math.min(31, exp.deductionDay)
          : 1;
      if (!map[d]) map[d] = [];
      map[d].push(exp);
    });
    return map;
  }, [activeExpenses]);

  // Total width of the timeline track in pixels
  // 1500px gives 46px per day, ensuring ample breathing room between consecutive days
  const TRACK_WIDTH = 1500;
  const PADDING_X = 42;
  const USABLE_WIDTH = TRACK_WIDTH - PADDING_X * 2;

  // Calculate pixel X for a given day (1..31)
  const getDayX = (day: number) => {
    const clamped = Math.max(1, Math.min(31, day));
    return PADDING_X + ((clamped - 1) / 30) * USABLE_WIDTH;
  };

  // Center scroll on a specific day
  const scrollToDay = (day: number, smooth = true) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const targetX = getDayX(day);
    const containerWidth = container.clientWidth;
    const scrollTarget = Math.max(
      0,
      Math.min(TRACK_WIDTH - containerWidth, targetX - containerWidth / 2)
    );

    container.scrollTo({
      left: scrollTarget,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  // Center on today on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToDay(currentDay, false);
      updateScrollIndicators();
    }, 60);
    return () => clearTimeout(timer);
  }, [currentDay]);

  const updateScrollIndicators = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 12);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 12);
  };

  // Unique days that have expenses, sorted
  const daysWithExpenses = useMemo(() => {
    return Object.keys(expensesByDay)
      .map(Number)
      .sort((a, b) => a - b);
  }, [expensesByDay]);

  // Calculate vertical layout for markers to strictly avoid overlap on adjacent days
  const markerLayoutByDay = useMemo(() => {
    const layout: Record<number, { bottomPx: number; isElevated: boolean }> = {};

    for (let i = 0; i < daysWithExpenses.length; i++) {
      const day = daysWithExpenses[i];
      const prevDay = i > 0 ? daysWithExpenses[i - 1] : null;
      const nextDay = i < daysWithExpenses.length - 1 ? daysWithExpenses[i + 1] : null;

      // Check if closely adjacent to previous or next day
      const closeToPrev = prevDay !== null && day - prevDay <= 1;
      const closeToNext = nextDay !== null && nextDay - day <= 1;

      if (closeToPrev || closeToNext) {
        // Alternate elevation so adjacent markers never sit on the same vertical baseline
        const prevElevated = prevDay !== null && layout[prevDay]?.isElevated;
        const isElevated = !prevElevated;
        layout[day] = {
          bottomPx: isElevated ? 30 : 8,
          isElevated,
        };
      } else {
        // Standard baseline: aligned right over timeline axis
        layout[day] = {
          bottomPx: 8,
          isElevated: false,
        };
      }
    }

    return layout;
  }, [daysWithExpenses]);

  const isEn = config?.language === 'en';

  return (
    <div className="w-full select-none py-0.5">
      <Card variant="default" padding="sm" className="space-y-1.5 sm:space-y-2">
        <div className="flex items-center justify-between px-1 pt-0.5">
          <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
            {isEn ? 'Payments' : 'Betalningar'}
          </h3>
          <span className="text-label font-medium text-[var(--text-secondary)]">
            {activeExpenses.length} {isEn ? 'scheduled' : 'st'}
          </span>
        </div>

        {/* Horizontally Scrollable Timeline Track */}
        <div className="relative w-full overflow-hidden">
          {/* Soft edge gradient fades into card surface */}
          {canScrollLeft && (
            <div
              className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-12 z-30"
              style={{
                background: 'linear-gradient(to right, var(--surface-color), transparent)',
              }}
            />
          )}
          {canScrollRight && (
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-12 z-30"
              style={{
                background: 'linear-gradient(to left, var(--surface-color), transparent)',
              }}
            />
          )}

          {/* Horizontal scroll container with strict vertical lock */}
          <div
            ref={scrollContainerRef}
            onScroll={updateScrollIndicators}
            className="overflow-x-auto overflow-y-hidden touch-pan-x overscroll-x-contain no-scrollbar scroll-smooth w-full py-0.5"
            style={{
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {/* Compact timeline track: height 104px */}
            <div
              data-timeline-track
              className="relative h-[104px] select-none"
              style={{ width: `${TRACK_WIDTH}px` }}
            >
              {/* Timeline Horizontal Axis Bar */}
              <div
                className="absolute bottom-6 inset-x-6 h-[2px] rounded-full pointer-events-none"
                style={{
                  backgroundColor: 'var(--border-subtle)',
                }}
              >
                {/* Progress fill up to Today */}
                <div
                  className="h-full rounded-full transition-all duration-300 opacity-60"
                  style={{
                    width: `${((Math.max(1, Math.min(31, currentDay)) - 1) / 30) * 100}%`,
                    backgroundColor: 'var(--accent-color)',
                  }}
                />
              </div>

              {/* Glowing Accent Marker for Today directly on the axis */}
              {currentDay >= 1 && currentDay <= 31 && (
                <div
                  className="absolute bottom-6 z-20 flex items-center justify-center pointer-events-none transform -translate-x-1/2 translate-y-1/2"
                  style={{ left: `${getDayX(currentDay)}px` }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-xs"
                    style={{
                      backgroundColor: 'var(--accent-color)',
                      boxShadow: '0 0 0 3px color-mix(in srgb, var(--accent-color) 25%, transparent)',
                    }}
                  />
                </div>
              )}

              {/* Expense Markers: EXACTLY ONE visual marker per day with expenses */}
              <div className="absolute inset-x-0 top-0 bottom-6 pointer-events-auto">
                {daysWithExpenses.map((day) => {
                  const dayExps = expensesByDay[day] || [];
                  if (dayExps.length === 0) return null;

                  const dayX = getDayX(day);
                  // Representative expense for logo display
                  const primaryExp = dayExps[0];
                  const hasMultiple = dayExps.length > 1;
                  const layout = markerLayoutByDay[day] || { bottomPx: 10, isElevated: false };

                  const tx: Transaction = {
                    id: primaryExp.id,
                    amount: primaryExp.amount,
                    category: primaryExp.category,
                    merchant: primaryExp.name,
                    type: 'expense',
                    timestamp: Date.now(),
                    logo: primaryExp.logo,
                    icon: primaryExp.icon,
                    paymentMethod: primaryExp.paymentMethod as any,
                    deductionDay: day,
                    frequency: primaryExp.frequency,
                  };

                  const tooltipText = hasMultiple
                    ? `${dayExps.length} ${isEn ? 'payments on day' : 'betalningar den'} ${day}: ${dayExps.map((e) => e.name).join(', ')}`
                    : `${primaryExp.name} (${isEn ? 'Day' : 'Dag'} ${day}) - ${formatAmount(primaryExp.amount, config?.language)} ${config?.currency || 'kr'}`;

                  return (
                    <div
                      key={`day-${day}`}
                      className="absolute flex items-center justify-center transform -translate-x-1/2 z-20"
                      style={{
                        left: `${dayX}px`,
                        bottom: `${layout.bottomPx}px`,
                      }}
                    >
                      {/* Subtle connector stem linking elevated markers down to the timeline axis */}
                      {layout.isElevated && (
                        <div
                          className="absolute pointer-events-none"
                          style={{
                            width: '1.5px',
                            top: '100%',
                            height: `${layout.bottomPx - 10}px`,
                            backgroundColor: 'var(--border-subtle)',
                            opacity: 0.8,
                          }}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (hasMultiple) {
                            setSelectedDayGroup({ day, expenses: dayExps });
                          } else {
                            onSelectExpense(primaryExp);
                          }
                        }}
                        className="relative group w-[30px] h-[30px] rounded-full shadow-subtle border flex items-center justify-center transition-all duration-150 active:scale-95 hover:scale-110 hover:z-30 cursor-pointer bg-[var(--surface-color)] border-[var(--border-subtle)] hover:border-[var(--text-secondary)]"
                        title={tooltipText}
                      >
                        <TransactionLogo transaction={tx} config={config} size="sm" />

                        {/* Discrete count badge when multiple expenses share the same day: non-overlapping and compact */}
                        {hasMultiple && (
                          <span
                            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-micro-label font-bold flex items-center justify-center border leading-none shadow-xs pointer-events-none z-30"
                            style={{
                              backgroundColor: 'var(--surface-color)',
                              color: 'var(--text-primary)',
                              borderColor: 'var(--border-subtle)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                            }}
                          >
                            {dayExps.length}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Day Ruler Axis (Days 1 to 31, with "Idag" for current day) */}
              <div className="absolute bottom-0 inset-x-0 h-6 flex items-center select-none pointer-events-none">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                  const isCurrent = d === currentDay;
                  const hasExpense = (expensesByDay[d] || []).length > 0;
                  const dX = getDayX(d);

                  return (
                    <div
                      key={d}
                      className="absolute flex flex-col items-center transform -translate-x-1/2"
                      style={{ left: `${dX}px` }}
                    >
                      {/* Tick mark */}
                      <div
                        className="w-[1px] mb-0.5 transition-colors"
                        style={{
                          height: isCurrent ? '5px' : (d % 5 === 0 || d === 1 || d === 31) ? '4px' : '2.5px',
                          backgroundColor: isCurrent
                            ? 'var(--accent-color)'
                            : hasExpense
                            ? 'var(--text-primary)'
                            : 'var(--border-subtle)',
                        }}
                      />
                      {/* "Idag" for current day, or day number for other days */}
                      {isCurrent ? (
                        <span className="text-micro-label font-bold text-[var(--accent-color)] tracking-tight whitespace-nowrap">
                          Idag
                        </span>
                      ) : (
                        <span
                          className={`text-micro-label tabular-nums transition-colors ${
                            hasExpense
                              ? 'font-semibold text-[var(--text-primary)]'
                              : 'font-normal text-[var(--text-tertiary)]'
                          }`}
                        >
                          {d}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal for viewing multiple payments on the same day */}
      <Modal
        isOpen={Boolean(selectedDayGroup)}
        onClose={() => setSelectedDayGroup(null)}
        title={
          selectedDayGroup ? (
            <span className="text-base font-bold text-[var(--text-primary)]">
              {isEn ? `Payments on Day ${selectedDayGroup.day}` : `Betalningar dag ${selectedDayGroup.day}`}
            </span>
          ) : null
        }
        subtitle={
          selectedDayGroup ? (
            <span className="text-xs text-[var(--text-secondary)]">
              {selectedDayGroup.expenses.length} {isEn ? 'scheduled expenses' : 'fasta utgifter'}
            </span>
          ) : null
        }
        size="sm"
        center
      >
        {selectedDayGroup && (
          <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
            {selectedDayGroup.expenses.map((exp) => {
              const itemTx: Transaction = {
                id: exp.id,
                amount: exp.amount,
                category: exp.category,
                merchant: exp.name,
                type: 'expense',
                timestamp: Date.now(),
                logo: exp.logo,
                icon: exp.icon,
                paymentMethod: exp.paymentMethod as any,
                deductionDay: selectedDayGroup.day,
                frequency: exp.frequency,
              };

              return (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => {
                    setSelectedDayGroup(null);
                    onSelectExpense(exp);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-[var(--radius-card-nested,14px)] bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--border-subtle)] transition-all cursor-pointer text-left active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <TransactionLogo transaction={itemTx} config={config} size="sm" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {exp.name}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] truncate">
                        {exp.category || (isEn ? 'Fixed expense' : 'Fast utgift')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                      −{formatAmount(exp.amount, config?.language)} {config?.currency || 'kr'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
