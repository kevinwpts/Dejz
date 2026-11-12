import type { RefObject, SetStateAction } from 'react';
import React from 'react';
import {
  ArrowCounterClockwise,
  CalendarBlank,
  Heart,
  Package,
  Paperclip,
} from '@phosphor-icons/react';
import { PeriodInfo, isDateInPeriod } from '../../utils/periodEngine';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { SwipeableTxRow } from '../ui/SwipeableTxRow';
import { formatSwedishDateHeading } from '../../utils/swedishDate';
import { checkIsRecurringTransaction } from '../../utils/recurring';
import type { FixedExpenseItem, IncomeItem, TransactionItem } from '../../app/models';
import { getTransactionTime } from '../../app/models';

export interface HomeTimelineProps {
  timelineScrollRef: RefObject<HTMLDivElement | null>;
  handleTimelineScroll: () => void;
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  handleMouseUpOrLeave: () => void;
  handleWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  timelineDays: { dateKey: string; topLabel: string; dayNum: string; shortMonth: string; fullHeading: string; }[];
  selectedDateKey: string;
  todayStr: string;
  transactionsByDate: Map<string, TransactionItem[]>;
  period: PeriodInfo;
  incomes: IncomeItem[];
  periodRecurringMatches: { claimedFixedTxIds: Set<string>; matchedFixedTxByExpId: Map<string, TransactionItem>; matchedFixedIds: Set<string>; claimedIncomeTxIds: Set<string>; matchedIncomeTxByIncId: Map<string, TransactionItem>; matchedIncomeIds: Set<string>; };
  fixedExpenses: FixedExpenseItem[];
  dayButtonRefs: RefObject<Record<string, HTMLButtonElement | null>>;
  dragStateRef: RefObject<{ isDown: boolean; startX: number; scrollLeft: number; hasDragged: boolean; }>;
  setSelectedDateKey: (value: SetStateAction<string>) => void;
  isInitialLoading: boolean;
  isTodayScrolledOut: boolean;
  handleJumpToToday: () => void;
  selectedDayItems: TransactionItem[];
  selectedDayNet: number;
  formatKr: (amount: number) => string;
  handleMarkReviewed: (ids: string[]) => void;
  onSelectTransaction: (tx: TransactionItem) => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  onExcludeTransaction?: (id: string, exclude: boolean) => void;
}

export const HomeTimeline: React.FC<HomeTimelineProps> = ({
  timelineScrollRef,
  handleTimelineScroll,
  handleMouseDown,
  handleMouseMove,
  handleMouseUpOrLeave,
  handleWheel,
  timelineDays,
  selectedDateKey,
  todayStr,
  transactionsByDate,
  period,
  incomes,
  periodRecurringMatches,
  fixedExpenses,
  dayButtonRefs,
  dragStateRef,
  setSelectedDateKey,
  isInitialLoading,
  isTodayScrolledOut,
  handleJumpToToday,
  selectedDayItems,
  selectedDayNet,
  formatKr,
  handleMarkReviewed,
  onSelectTransaction,
  onToggleHeart,
  onTogglePackage,
  onExcludeTransaction,
}) => (
    <>
      {/* ============================================================== */}
      {/* MODUL 3: HORISONTELL TIDSLINJE PER DAG (Direkt mot bakgrunden) */}
      {/* ============================================================== */}
      <section className="pt-1">
        {/* Horisontell scrollbar tidslinje där varje dag kan väljas */}
        <div
          ref={timelineScrollRef}
          onScroll={handleTimelineScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onWheel={handleWheel}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 pb-6 -mb-3.5 select-none cursor-grab active:cursor-grabbing"
        >
          {timelineDays.map((day) => {
            const isSelected = day.dateKey === selectedDateKey;
            const isToday = day.dateKey === todayStr;
            const dayTxs = transactionsByDate.get(day.dateKey) || [];
            let hasActivity = dayTxs.length > 0;

            if (day.dateKey > todayStr) {
              const parts = day.dateKey.split('-');
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10);
              const dayOfMonth = parseInt(parts[2], 10);
              const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

              const isDayInCurrentPeriod = isDateInPeriod(day.dateKey, period);
              const hasPlannedIncome = incomes.some(
                (inc) =>
                  !(
                    isDayInCurrentPeriod &&
                    periodRecurringMatches.matchedIncomeIds.has(inc.id)
                  ) && Math.min(Number(inc.payday) || 25, lastDayOfMonth) === dayOfMonth
              );
              const hasPlannedExpense = fixedExpenses.some(
                (exp) =>
                  !(
                    isDayInCurrentPeriod &&
                    periodRecurringMatches.matchedFixedIds.has(exp.id)
                  ) && Math.min(Number(exp.dueDay) || 28, lastDayOfMonth) === dayOfMonth
              );

              if (hasPlannedIncome || hasPlannedExpense) {
                hasActivity = true;
              }
            }

            return (
              <button
                key={day.dateKey}
                ref={(el) => {
                  dayButtonRefs.current[day.dateKey] = el;
                }}
                type="button"
                onClick={() => {
                  if (!dragStateRef.current.hasDragged) {
                    setSelectedDateKey(day.dateKey);
                  }
                }}
                className={`relative shrink-0 w-[50px] sm:w-[54px] h-[60px] sm:h-[62px] rounded-2xl transition-all flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-[var(--date-active-bg)] text-[var(--date-active-color)] shadow-[var(--date-active-shadow)]'
                    : 'bg-transparent hover:bg-[var(--surface-color)]/70 text-[var(--text-primary)]'
                }`}
              >
                <span
                  className={`text-caption leading-none ${
                    isSelected
                      ? 'text-[var(--date-active-color)]/80 font-normal'
                      : isToday
                      ? 'text-[var(--text-primary)] font-semibold'
                      : 'text-[var(--text-muted)] font-normal'
                  }`}
                >
                  {day.topLabel}
                </span>
                <span
                  className={`font-display text-callout tabular-nums leading-none mt-1.5 no-privacy-blur ${
                    isSelected || isToday ? 'font-semibold' : 'font-normal'
                  }`}
                >
                  {day.dayNum}
                </span>
                <div className="h-1.5 flex items-center justify-center mt-1.5">
                  {hasActivity && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-[var(--date-active-color)]'
                          : isToday
                          ? 'bg-[var(--text-primary)]'
                          : 'bg-[var(--text-muted)]/60'
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Vald dags händelser samlade i ett enhetligt listkort med generöst mellanrum till tidslinjen */}
        <div className="mt-3.5 sm:mt-4 space-y-1.5">
          {!isInitialLoading && (
            <div className="ui-date-header px-1">
              <div className="flex items-center gap-2 min-w-0">
                <span>{formatSwedishDateHeading(selectedDateKey)}</span>
                {(selectedDateKey !== todayStr || isTodayScrolledOut) && (
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-caption font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
                  >
                    <ArrowCounterClockwise size={11} weight="bold" />
                    <span>Idag</span>
                  </button>
                )}
              </div>
              {selectedDayItems.length > 0 && (
                <span className="tabular-nums font-medium text-[var(--text-secondary)]">
                  {selectedDayNet > 0 ? '+' : selectedDayNet < 0 ? '−' : ''}
                  {formatKr(Math.abs(selectedDayNet))}
                </span>
              )}
            </div>
          )}
        {selectedDayItems.length > 0 ? (
          <div>
            <div className="ui-list-card">
            {selectedDayItems.map((tx) => {
              const isIncome = tx.type === 'income';
              const isPlanned = tx.id.startsWith('planned-');
              const recurringStatus = checkIsRecurringTransaction(
                tx,
                fixedExpenses,
                incomes
              );
              const hasReceipts = Boolean(
                (Array.isArray(tx.receipts) && tx.receipts.length > 0) || tx.receiptUrl
              );

              const rowContent = (
                <button
                  type="button"
                  onClick={() => {
                    handleMarkReviewed([tx.id]);
                    onSelectTransaction(tx);
                  }}
                  className="ui-tx-row"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ItemLogo
                      name={tx.title}
                      category={tx.category}
                      logoUrl={tx.logo}
                      size="md"
                      isRecurring={recurringStatus.isRecurring || isPlanned}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title">
                        {tx.title}
                      </span>
                      <span className="ui-row-subtitle">
                        <CategoryIcon
                          category={tx.category}
                          size={11}
                          className="shrink-0"
                        />
                        <span className="truncate">{tx.category}</span>
                        {tx.isHearted && (
                          <Heart
                            size={11}
                            weight="fill"
                            className="text-negative-solid shrink-0 ml-0.5"
                          />
                        )}
                        {tx.isWaitingForPackage && (
                          <Package
                            size={11}
                            weight="fill"
                            className="text-caution-solid shrink-0 ml-0.5"
                          />
                        )}
                        {hasReceipts && (
                          <Paperclip
                            size={11}
                            weight="bold"
                            className="text-[var(--text-secondary)] shrink-0 ml-0.5"
                          />
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={isIncome ? 'ui-row-amount-income' : 'ui-row-amount'}
                    >
                      {isIncome ? `+${formatKr(tx.amount)}` : `−${formatKr(tx.amount)}`}
                    </span>
                    {(() => {
                      const isPending =
                        tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD';
                      const statusSub = isPending
                        ? 'Reserverat'
                        : tx.time === 'Planerad'
                        ? 'Planerad'
                        : getTransactionTime(tx);
                      return statusSub ? (
                        <span className="ui-row-meta">
                          {statusSub}
                        </span>
                      ) : null;
                    })()}
                  </div>
                </button>
              );

              if (isPlanned) {
                return <div key={tx.id}>{rowContent}</div>;
              }

              return (
                <SwipeableTxRow
                  key={tx.id}
                  isHearted={tx.isHearted}
                  isWaitingForPackage={tx.isWaitingForPackage}
                  isExcluded={tx.isExcluded}
                  onToggleHeart={
                    onToggleHeart ? () => onToggleHeart(tx.id, !tx.isHearted) : undefined
                  }
                  onTogglePackage={
                    onTogglePackage
                      ? () => onTogglePackage(tx.id, !tx.isWaitingForPackage)
                      : undefined
                  }
                  onToggleExclude={
                    onExcludeTransaction
                      ? () => onExcludeTransaction(tx.id, !tx.isExcluded)
                      : undefined
                  }
                >
                  {rowContent}
                </SwipeableTxRow>
              );
            })}
            </div>
          </div>
        ) : isInitialLoading ? (
          <div className="ui-list-card animate-pulse">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="py-3 sm:py-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--surface-raised)]" />
                  <div className="space-y-1.5">
                    <div className="w-28 h-3 rounded bg-[var(--surface-raised)]" />
                    <div className="w-20 h-2.5 rounded bg-[var(--surface-raised)]" />
                  </div>
                </div>
                <div className="w-16 h-3.5 rounded bg-[var(--surface-raised)]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="ui-empty-state py-8 px-4">
            <CalendarBlank size={32} weight="light" className="ui-empty-icon" />
            <p className="ui-empty-sub mt-0">
              Inga händelser denna dag
            </p>
          </div>
        )}
        </div>
      </section>
    </>
);
