// Hemflikens tidslinje: dagarna att välja bland, vald dag, scroll/dra-hantering och dagens poster
import type React from 'react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { PeriodInfo, isDateInPeriod } from '../../utils/periodEngine';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import { formatSwedishDateHeading, getSwedishDateStr } from '../../utils/swedishDate';
import type { reconcilePeriodRecurringMatches } from '../../utils/recurring/periodReconcile';
import { type FixedExpenseItem, type IncomeItem, type TransactionItem, compareTransactionsChronologically } from '../../app/models';

interface HomeTimelineInputs {
  transactions: TransactionItem[];
  todayStr: string;
  period: PeriodInfo;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  periodRecurringMatches: ReturnType<typeof reconcilePeriodRecurringMatches>;
}

export function useHomeTimeline({
  transactions,
  todayStr,
  period,
  incomes,
  fixedExpenses,
  periodRecurringMatches,
}: HomeTimelineInputs) {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getSwedishDateStr());
  const [isTodayScrolledOut, setIsTodayScrolledOut] = useState<boolean>(false);

  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const dayButtonsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const dragStateRef = useRef<{
    isDown: boolean;
    startX: number;
    scrollLeft: number;
    hasDragged: boolean;
  }>({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasDragged: false,
  });

  // Group all deduplicated transactions by date (YYYY-MM-DD)
  const transactionsByDate = useMemo(() => {
    const deduped = deduplicateTransactions(transactions || []);
    const map = new Map<string, TransactionItem[]>();

    for (const tx of deduped) {
      const key = tx.date || todayStr;
      const arr = map.get(key) || [];
      arr.push(tx);
      map.set(key, arr);
    }

    for (const [, items] of map.entries()) {
      items.sort(compareTransactionsChronologically);
    }

    return map;
  }, [transactions, todayStr]);

  const isInitialScrollDoneRef = useRef(false);

  // Generate continuous horizontal timeline days (90 days back, Idag in the middle, 35 days forward)
  const timelineDays = useMemo(() => {
    const parts = todayStr.split('-');
    const baseYear = parseInt(parts[0], 10);
    const baseMonth = parseInt(parts[1], 10) - 1;
    const baseDay = parseInt(parts[2], 10);
    const todayDate = new Date(Date.UTC(baseYear, baseMonth, baseDay, 12, 0, 0));

    const totalPastDays = 90;
    const totalFutureDays = 35;

    const result: {
      dateKey: string;
      topLabel: string;
      dayNum: string;
      shortMonth: string;
      fullHeading: string;
    }[] = [];

    for (let offset = -totalPastDays; offset <= totalFutureDays; offset++) {
      const dObj = new Date(todayDate);
      dObj.setUTCDate(dObj.getUTCDate() + offset);

      const yyyy = dObj.getUTCFullYear();
      const mm = String(dObj.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dObj.getUTCDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      let weekdayShort = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Stockholm',
        weekday: 'short',
      })
        .format(dObj)
        .replace('.', '');
      weekdayShort = weekdayShort.charAt(0).toUpperCase() + weekdayShort.slice(1);

      const dayNum = String(dObj.getUTCDate());
      const shortMonth = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Stockholm',
        month: 'short',
      })
        .format(dObj)
        .replace('.', '');

      result.push({
        dateKey: dateStr,
        topLabel: weekdayShort,
        dayNum,
        shortMonth,
        fullHeading: formatSwedishDateHeading(dateStr),
      });
    }

    return result;
  }, [todayStr]);

  const centerDateButton = useCallback((dateKey: string, behavior: ScrollBehavior) => {
    const btn = dayButtonsRef.current[dateKey];
    const container = timelineScrollRef.current;
    if (!btn || !container) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const offset =
      btnRect.left -
      containerRect.left -
      containerRect.width / 2 +
      btnRect.width / 2;
    container.scrollBy({ left: offset, behavior });
  }, []);

  const handleJumpToToday = useCallback(() => {
    setSelectedDateKey(todayStr);
    setIsTodayScrolledOut(false);
    centerDateButton(todayStr, 'smooth');
  }, [todayStr, centerDateButton]);

  // Center the selected date button (starts with Idag right in the middle)
  useEffect(() => {
    if (!isInitialScrollDoneRef.current) {
      centerDateButton(selectedDateKey, 'auto');
      const rafId = requestAnimationFrame(() => {
        centerDateButton(selectedDateKey, 'auto');
        isInitialScrollDoneRef.current = true;
      });
      return () => cancelAnimationFrame(rafId);
    }

    centerDateButton(selectedDateKey, 'smooth');
  }, [selectedDateKey, centerDateButton]);

  const handleTimelineScroll = () => {
    const container = timelineScrollRef.current;
    const todayBtn = dayButtonsRef.current[todayStr];
    if (!container || !todayBtn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = todayBtn.getBoundingClientRect();
    const isOut = bRect.right < cRect.left + 16 || bRect.left > cRect.right - 16;
    if (isOut !== isTodayScrolledOut) {
      setIsTodayScrolledOut(isOut);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = timelineScrollRef.current;
    if (!el) return;
    dragStateRef.current = {
      isDown: true,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      hasDragged: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = timelineScrollRef.current;
    if (!el || !dragStateRef.current.isDown) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragStateRef.current.startX;
    if (Math.abs(walk) > 5) {
      dragStateRef.current.hasDragged = true;
      el.scrollLeft = dragStateRef.current.scrollLeft - walk;
    }
  };

  const handleMouseUpOrLeave = () => {
    dragStateRef.current.isDown = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = timelineScrollRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  };

  const selectedDayItems = useMemo(() => {
    const actualTxs = transactionsByDate.get(selectedDateKey) || [];
    if (selectedDateKey <= todayStr) {
      return actualTxs;
    }

    // För kommande dagar i framtiden: visa även planerade fasta utgifter och inkomster som infaller på dagen
    const parts = selectedDateKey.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const dayOfMonth = parseInt(parts[2], 10);
    const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    const plannedItems: TransactionItem[] = [...actualTxs];
    const isSelectedInCurrentPeriod = isDateInPeriod(selectedDateKey, period);

    for (const inc of incomes) {
      if (
        isSelectedInCurrentPeriod &&
        periodRecurringMatches.matchedIncomeIds.has(inc.id)
      ) {
        continue;
      }
      const effectivePayday = Math.min(Number(inc.payday) || 25, lastDayOfMonth);
      if (effectivePayday === dayOfMonth) {
        plannedItems.push({
          id: `planned-inc-${inc.id}-${selectedDateKey}`,
          title: inc.name,
          amount: inc.amount,
          category: inc.category || 'Lön',
          date: selectedDateKey,
          time: 'Planerad',
          type: 'income',
          logo: inc.logo,
          bankAccountName: inc.bankAccountName,
        });
      }
    }

    for (const exp of fixedExpenses) {
      if (
        isSelectedInCurrentPeriod &&
        periodRecurringMatches.matchedFixedIds.has(exp.id)
      ) {
        continue;
      }
      const effectiveDueDay = Math.min(Number(exp.dueDay) || 28, lastDayOfMonth);
      if (effectiveDueDay === dayOfMonth) {
        plannedItems.push({
          id: `planned-exp-${exp.id}-${selectedDateKey}`,
          title: exp.name,
          amount: exp.amount,
          category: exp.category || 'Räkningar',
          date: selectedDateKey,
          time: 'Planerad',
          type: 'expense',
          logo: exp.logo,
          paymentMethod: exp.paymentMethod,
          bankAccountName: exp.bankAccountName,
        });
      }
    }

    return plannedItems;
  }, [
    transactionsByDate,
    selectedDateKey,
    todayStr,
    incomes,
    fixedExpenses,
    period,
    periodRecurringMatches,
  ]);

  const selectedDayNet = useMemo(() => {
    return selectedDayItems.reduce((acc, item) => {
      const amt = Number(item.amount) || 0;
      return item.type === 'income' ? acc + amt : acc - amt;
    }, 0);
  }, [selectedDayItems]);

  return {
    timelineScrollRef,
    dayButtonsRef,
    dragStateRef,
    selectedDateKey,
    setSelectedDateKey,
    isTodayScrolledOut,
    transactionsByDate,
    timelineDays,
    handleJumpToToday,
    handleTimelineScroll,
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleWheel,
    selectedDayItems,
    selectedDayNet,
  };
}
