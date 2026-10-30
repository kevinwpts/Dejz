import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Bank,
  CalendarBlank,
  CaretDown,
  CaretRight,
  Check,
  Heart,
  Package,
  Paperclip,
  Users,
  X,
} from '@phosphor-icons/react';
import { PeriodInfo, getDueDateInPeriod, isDueDayPaidInPeriod, isDateInPeriod } from '../utils/periodEngine';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';
import { SwishLogo } from './SwishLogo';
import { SwipeableTxRow } from './ui/SwipeableTxRow';
import { BottomSheet } from './ui/BottomSheet';
import { deduplicateTransactions } from '../utils/transactionDedup';
import {
  formatIsoTimeStockholm,
  formatSwedishDateHeading,
  getSwedishDateStr,
  getYesterdaySwedishDateStr,
} from '../utils/swedishDate';
import { checkIsRecurringTransaction, findMatchingFixedExpense } from '../utils/recurring';
import {
  getShowAccountsOnHome,
  setShowAccountsOnHome,
  getReviewedTransactionIds,
  hasInitializedReviewedTransactions,
  markTransactionsReviewed,
} from '../utils/appCache';

export interface AccountItem {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  type: 'checking' | 'savings';
  logo?: string;
}

export interface IncomeItem {
  id: string;
  name: string;
  originalName?: string;
  amount: number;
  payday: number;
  category: string;
  logo?: string;
  bankAccountName?: string;
}

export interface FixedExpenseItem {
  id: string;
  name: string;
  originalName?: string;
  amount: number;
  fullAmount?: number;
  isShared?: boolean;
  dueDay: number;
  category: string;
  paymentMethod?: string;
  logo?: string;
  bankAccountName?: string;
  receiptUrl?: string;
  receiptName?: string;
  receipts?: { url: string; name: string }[];
}

export interface TransactionItem {
  id: string;
  title: string;
  amount: number;
  originalAmount?: number;
  linkedSwishTxId?: string;
  category: string;
  date: string;
  time?: string;
  note?: string;
  logo?: string;
  type?: 'expense' | 'income';
  bookingDate?: string;
  bookingStatus?: string;
  reconciliationStatus?: string;
  isExcluded?: boolean;
  isHearted?: boolean;
  isWaitingForPackage?: boolean;
  isWaitingForSwish?: boolean;
  pendingSwishAmount?: number;
  pendingSwishRecipient?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  receiptName?: string;
  receipts?: { url: string; name: string }[];

  // Information hämtad från Enable Banking / Open Banking API
  rawDescription?: string;
  counterpartyName?: string;
  currency?: string;
  creditDebitIndicator?: string;
  transactionId?: string;
  entryReference?: string;
  valueDate?: string;
  bankAccountId?: string;
  bankAccountName?: string;
  rawJson?: any;
}

export function doesTransactionMatchAccount(
  tx: TransactionItem,
  acc: AccountItem
): boolean {
  if (tx.bankAccountId && acc.id) {
    return tx.bankAccountId === acc.id;
  }
  const rawName = (tx.bankAccountName || '').toLowerCase();
  if (!rawName) return false;

  const accDigits = (acc.accountNumber || '').replace(/\D/g, '');
  if (accDigits.length >= 4) {
    const last4 = accDigits.slice(-4);
    const rawDigits = rawName.replace(/\D/g, '');
    if (rawDigits.length >= 4 && rawDigits.endsWith(last4)) {
      return true;
    }
  }

  return rawName.includes((acc.name || '').toLowerCase());
}

export function getTransactionTime(
  tx: Pick<TransactionItem, 'id' | 'title' | 'category' | 'date' | 'time' | 'note'> & {
    amount?: number;
    bookingStatus?: string;
  }
): string {
  // Reserverade transaktioner ska inte visa klockslag
  if (tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD') {
    return '';
  }

  // 1. Om tx.time redan är ett faktiskt klockslag "HH:MM"
  if (tx.time && typeof tx.time === 'string') {
    const trimmed = tx.time.trim();
    if (
      /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) &&
      trimmed !== '12:00' &&
      trimmed !== '00:00'
    ) {
      return trimmed;
    }
    // Om tx.time är en ISO-sträng med faktisk tid
    if (
      trimmed.includes('T') &&
      !trimmed.includes('T00:00') &&
      !trimmed.includes('T12:00')
    ) {
      const parsedStockholm = formatIsoTimeStockholm(trimmed);
      if (parsedStockholm && parsedStockholm !== '00:00' && parsedStockholm !== '12:00') {
        return parsedStockholm;
      }
    }
  }

  // 2. Om klockslag finns i noteringen eller beskrivningen
  if (tx.note) {
    const noteMatch = tx.note.match(/\b([01]\d|2[0-3])[:.]([0-5]\d)\b/);
    if (noteMatch) {
      const hhmm = `${noteMatch[1]}:${noteMatch[2]}`;
      if (hhmm !== '12:00' && hhmm !== '00:00') {
        return hhmm;
      }
    }
  }

  // 3. Om banken enbart skickade bokföringsdatum utan klockslag (PSD2 standard för bokförda poster),
  // generera ett deterministiskt, konsekvent klockslag baserat på transaktionens unika nyckel
  const seedStr = `${tx.id || ''}|${tx.date || ''}|${tx.title || ''}|${tx.amount || 0}`;
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const absHash = Math.abs(hash);
  const hour = 8 + (absHash % 13); // 08:00 - 20:59
  const minute = (Math.floor(absHash / 17) % 60);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

interface HomeTabProps {
  period: PeriodInfo;
  connectedBank: string | null;
  accounts: AccountItem[];
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  totalBalance: number;
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableSpent: number;
  kvarAttSpendera: number;
  dagsbudget: number;
  isInitialLoading?: boolean;
  onOpenBank: () => void;
  onSelectTransaction: (tx: TransactionItem) => void;
  onSelectFixed?: (exp: FixedExpenseItem) => void;
  onSelectIncome?: (inc: IncomeItem) => void;
  onNavigateToFixed: () => void;
  onNavigateToTransactions: () => void;
  onSelectAccount?: (accountId: string) => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  onExcludeTransaction?: (id: string, exclude: boolean) => void;
  onUpdateTransaction?: (tx: TransactionItem) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  period,
  connectedBank,
  accounts,
  incomes = [],
  fixedExpenses = [],
  transactions,
  totalBalance,
  totalIncome,
  totalFixedExpenses,
  totalVariableSpent,
  kvarAttSpendera,
  dagsbudget,
  isInitialLoading = false,
  onOpenBank,
  onSelectTransaction,
  onSelectFixed,
  onSelectIncome,
  onSelectAccount,
  onToggleHeart,
  onTogglePackage,
  onExcludeTransaction,
  onUpdateTransaction,
}) => {
  const [showAccounts, setShowAccounts] = useState<boolean>(() => getShowAccountsOnHome());
  const [showCashflowForecast, setShowCashflowForecast] = useState<boolean>(false);
  const [activeHeroPopup, setActiveHeroPopup] = useState<'income' | 'fixed' | 'variable' | null>(
    null
  );
  const todayStr = useMemo(() => getSwedishDateStr(), []);
  const yesterdayStr = useMemo(() => getYesterdaySwedishDateStr(), []);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getSwedishDateStr());
  const [daysBackToLoad, setDaysBackToLoad] = useState<number>(365);
  const [daysForwardToLoad, setDaysForwardToLoad] = useState<number>(365);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => getReviewedTransactionIds());
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  // Initialize reviewed IDs on first run so only transactions from the last 3 days appear as new
  useEffect(() => {
    if (!transactions || transactions.length === 0) return;
    if (!hasInitializedReviewedTransactions()) {
      const parts = todayStr.split('-');
      const d = new Date(
        Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10) - 3, 12, 0, 0)
      );
      const cutoffStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
        d.getUTCDate()
      ).padStart(2, '0')}`;
      const olderIds = transactions.filter((t) => (t.date || '') < cutoffStr).map((t) => t.id);
      markTransactionsReviewed(olderIds);
      setReviewedIds(getReviewedTransactionIds());
    }
  }, [transactions, todayStr]);

  const unreviewedTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions || []);
    return deduped
      .filter((tx) => !tx.isExcluded && !reviewedIds.has(tx.id))
      .sort((a, b) => {
        const dCmp = (b.date || '').localeCompare(a.date || '');
        if (dCmp !== 0) return dCmp;
        return getTransactionTime(b).localeCompare(getTransactionTime(a));
      })
      .slice(0, 20);
  }, [transactions, reviewedIds]);

  const handleMarkReviewed = (ids: string[]) => {
    markTransactionsReviewed(ids);
    setReviewedIds(getReviewedTransactionIds());
  };

  // Spenderingstakt (Burn-rate) & Kassaprognos fram till nästa lön
  const cashflowInsight = useMemo(() => {
    const disposableBudget = Math.max(0, totalIncome - totalFixedExpenses);
    const totalDays = Math.max(1, period.totalDays);
    const daysRemaining = Math.max(0, period.daysRemaining);
    const daysPassed = Math.max(1, Math.min(totalDays, totalDays - daysRemaining));

    const idealDailySpend = disposableBudget > 0 ? disposableBudget / totalDays : 0;
    const expectedVariableByToday = idealDailySpend * daysPassed;
    const paceDelta = Math.round(expectedVariableByToday - totalVariableSpent);
    const actualDailyBurn = daysPassed > 0 ? totalVariableSpent / daysPassed : 0;
    const projectedEndSurplus = Math.round(
      kvarAttSpendera - actualDailyBurn * daysRemaining
    );

    const periodProgressPct = Math.min(100, Math.round((daysPassed / totalDays) * 100));
    const budgetUsedPct =
      disposableBudget > 0
        ? Math.min(100, Math.round((totalVariableSpent / disposableBudget) * 100))
        : 0;

    // Kommande obetalda fasta utgifter i perioden
    const periodExpenseTxs = (transactions || []).filter(
      (tx) => tx.type !== 'income' && !tx.isExcluded && isDateInPeriod(tx.date, period)
    );
    const upcomingFixed = fixedExpenses
      .filter((exp) => {
        const matched = periodExpenseTxs.some((tx) =>
          Boolean(findMatchingFixedExpense(tx, [exp]))
        );
        const passed = isDueDayPaidInPeriod(exp.dueDay, period);
        return !matched && !passed;
      })
      .map((exp) => ({
        ...exp,
        dueDate: getDueDateInPeriod(exp.dueDay, period),
      }))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const upcomingFixedTotal = upcomingFixed.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
      0
    );

    return {
      disposableBudget,
      idealDailySpend: Math.round(idealDailySpend),
      actualDailyBurn: Math.round(actualDailyBurn),
      paceDelta,
      projectedEndSurplus,
      periodProgressPct,
      budgetUsedPct,
      upcomingFixed,
      upcomingFixedTotal,
    };
  }, [
    totalIncome,
    totalFixedExpenses,
    totalVariableSpent,
    kvarAttSpendera,
    period,
    transactions,
    fixedExpenses,
  ]);

  // ”Väntar på Swish”-lista + automatisk matchning mot inkomna Swish-insättningar
  const pendingSwishItems = useMemo(() => {
    const deduped = deduplicateTransactions(transactions || []);
    const waiting = deduped.filter((t) => Boolean(t.isWaitingForSwish));
    if (waiting.length === 0) return [];

    const incomingSwishTxs = deduped.filter((t) => {
      if (t.type !== 'income' || t.isExcluded) return false;
      return (
        t.category === 'Swish' ||
        /swish/i.test(t.title || '') ||
        /swish/i.test(t.rawDescription || '')
      );
    });

    return waiting.map((tx) => {
      const expectedAmt =
        tx.pendingSwishAmount ||
        (tx.originalAmount && tx.originalAmount > tx.amount
          ? tx.originalAmount - tx.amount
          : Math.round(tx.amount / 2));

      // Sök efter en inkommen Swish på eller efter utgiftens datum med matchande belopp
      const suggestedSwish = incomingSwishTxs.find((sw) => {
        if ((sw.date || '') < (tx.date || '')) return false;
        return Math.abs(Math.round(sw.amount) - Math.round(expectedAmt)) <= 5;
      });

      return {
        tx,
        expectedAmt,
        suggestedSwish,
      };
    });
  }, [transactions]);

  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const dayButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
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

  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  // Rörliga transaktioner under aktuell löneperiod (för snabbvy vid klick på "Rörligt")
  const variablePeriodTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions || []);
    return deduped
      .filter((tx) => {
        if (tx.isExcluded) return false;
        if (!isDateInPeriod(tx.date, period)) return false;
        if (tx.type === 'income') {
          return tx.category === 'Återbetalning';
        }
        const recurring = checkIsRecurringTransaction(tx, fixedExpenses, incomes);
        if (recurring.isRecurring && recurring.type === 'expense') {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dCmp = (b.date || '').localeCompare(a.date || '');
        if (dCmp !== 0) return dCmp;
        return getTransactionTime(b).localeCompare(getTransactionTime(a));
      });
  }, [transactions, period, fixedExpenses, incomes]);

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
      items.sort((a, b) => getTransactionTime(b).localeCompare(getTransactionTime(a)));
    }

    return map;
  }, [transactions, todayStr]);

  const isInitialScrollDoneRef = useRef(false);
  const prevScrollWidthRef = useRef<number | null>(null);

  // Generate continuous horizontal timeline days with past days on the left, Idag in the middle, and upcoming days on the right
  const timelineDays = useMemo(() => {
    const parts = todayStr.split('-');
    const baseYear = parseInt(parts[0], 10);
    const baseMonth = parseInt(parts[1], 10) - 1;
    const baseDay = parseInt(parts[2], 10);
    const todayDate = new Date(Date.UTC(baseYear, baseMonth, baseDay, 12, 0, 0));

    // Find oldest and newest dates so the timeline is always continuous
    let earliestDateStr = todayStr;
    let latestDateStr = todayStr;
    for (const key of transactionsByDate.keys()) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        if (key < earliestDateStr) earliestDateStr = key;
        if (key > latestDateStr) latestDateStr = key;
      }
    }
    if (selectedDateKey && selectedDateKey < earliestDateStr) {
      earliestDateStr = selectedDateKey;
    }
    if (selectedDateKey && selectedDateKey > latestDateStr) {
      latestDateStr = selectedDateKey;
    }

    const eParts = earliestDateStr.split('-');
    const earliestDate = new Date(
      Date.UTC(
        parseInt(eParts[0], 10),
        parseInt(eParts[1], 10) - 1,
        parseInt(eParts[2], 10),
        12,
        0,
        0
      )
    );
    const diffDaysFromEarliest =
      Math.ceil((todayDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 60;

    const lParts = latestDateStr.split('-');
    const latestDate = new Date(
      Date.UTC(
        parseInt(lParts[0], 10),
        parseInt(lParts[1], 10) - 1,
        parseInt(lParts[2], 10),
        12,
        0,
        0
      )
    );
    const diffDaysToLatest =
      Math.ceil((latestDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)) + 60;

    const totalPastDays = Math.max(daysBackToLoad, diffDaysFromEarliest, 365);
    const totalFutureDays = Math.max(daysForwardToLoad, diffDaysToLatest, 365);

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
  }, [
    transactionsByDate,
    todayStr,
    yesterdayStr,
    selectedDateKey,
    daysBackToLoad,
    daysForwardToLoad,
  ]);

  // Keep scroll position anchored when prepending older days to the left
  useEffect(() => {
    const container = timelineScrollRef.current;
    if (container && prevScrollWidthRef.current !== null) {
      const widthDiff = container.scrollWidth - prevScrollWidthRef.current;
      if (widthDiff > 0) {
        container.scrollLeft += widthDiff;
      }
      prevScrollWidthRef.current = null;
    }
  }, [timelineDays]);

  // Center the selected date button (starts with Idag right in the middle)
  useEffect(() => {
    const centerSelectedButton = (behavior: ScrollBehavior) => {
      const btn = dayButtonRefs.current[selectedDateKey];
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
    };

    if (!isInitialScrollDoneRef.current) {
      centerSelectedButton('auto');
      const rafId = requestAnimationFrame(() => {
        centerSelectedButton('auto');
        isInitialScrollDoneRef.current = true;
      });
      return () => cancelAnimationFrame(rafId);
    }

    centerSelectedButton('smooth');
  }, [selectedDateKey]);

  const handleTimelineScroll = () => {
    const el = timelineScrollRef.current;
    if (!el) return;
    if (el.scrollLeft <= 240 && prevScrollWidthRef.current === null) {
      prevScrollWidthRef.current = el.scrollWidth;
      setDaysBackToLoad((prev) => prev + 180);
    } else if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 240) {
      setDaysForwardToLoad((prev) => prev + 180);
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

    for (const inc of incomes) {
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
  }, [transactionsByDate, selectedDateKey, todayStr, incomes, fixedExpenses]);

  const selectedDayNet = useMemo(() => {
    return selectedDayItems.reduce((acc, item) => {
      const amt = Number(item.amount) || 0;
      return item.type === 'income' ? acc + amt : acc - amt;
    }, 0);
  }, [selectedDayItems]);

  return (
    <div className="ui-page">
      {/* ============================================================== */}
      {/* MODUL 1: KVAR ATT SPENDERA (Hero Bento Card)                   */}
      {/* ============================================================== */}
      <section className="ui-card-p">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] text-[var(--text-secondary)] font-normal">
              Kvar att spendera
            </span>
            <span className="text-[12px] font-normal text-[var(--text-secondary)] tabular-nums">
              {period.startLabel} – {period.endLabel}
            </span>
          </div>

          {isInitialLoading && accounts.length === 0 ? (
            <div className="h-9 w-40 rounded-2xl bg-[var(--surface-raised)] animate-pulse mt-1" />
          ) : (
            <div className="font-display text-[28px] sm:text-[30px] font-semibold tracking-[-0.02em] leading-tight text-[var(--text-primary)] tabular-nums mt-0.5">
              {formatKr(kvarAttSpendera)}
            </div>
          )}
        </div>

        {/* 3-Column Hairline Breakdown (No nested boxes) */}
        <div className="ui-stat-grid pt-4 mt-4 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setActiveHeroPopup('income')}
            className="pr-3 text-left min-w-0 cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity focus:outline-none"
          >
            <span className="ui-stat-label">
              Inkomst
            </span>
            {isInitialLoading && accounts.length === 0 ? (
              <div className="h-4 w-12 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
            ) : (
              <span className="ui-stat-value text-emerald-600 dark:text-emerald-400">
                +{formatKr(totalIncome)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveHeroPopup('fixed')}
            className="px-3 text-left min-w-0 cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity focus:outline-none"
          >
            <span className="ui-stat-label">
              Fasta
            </span>
            {isInitialLoading && accounts.length === 0 ? (
              <div className="h-4 w-12 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
            ) : (
              <span className="ui-stat-value">
                -{formatKr(totalFixedExpenses)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveHeroPopup('variable')}
            className="pl-3 text-left min-w-0 cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity focus:outline-none"
          >
            <span className="ui-stat-label">
              Rörligt
            </span>
            {isInitialLoading && accounts.length === 0 ? (
              <div className="h-4 w-12 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
            ) : (
              <span className="ui-stat-value">
                -{formatKr(totalVariableSpent)}
              </span>
            )}
          </button>
        </div>
      </section>

      {/* ============================================================== */}
      {/* MODUL 2: TOTALT SALDO MED MJUK KONTO-ACCORDION                 */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-[22px] px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[12px] text-[var(--text-secondary)] font-normal block">
              Totalt saldo
            </span>
            {isInitialLoading && accounts.length === 0 ? (
              <div className="h-7 w-32 rounded-lg bg-[var(--surface-raised)] animate-pulse mt-1" />
            ) : (
              <div className="font-display text-[22px] sm:text-[24px] font-semibold tracking-[-0.02em] leading-tight text-[var(--text-primary)] tabular-nums mt-0.5">
                {formatKr(totalBalance)}
              </div>
            )}
          </div>

          {accounts.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const next = !showAccounts;
                setShowAccounts(next);
                setShowAccountsOnHome(next);
              }}
              className="py-1 px-1.5 text-[12px] font-normal text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              title={showAccounts ? 'Dölj kontolista' : 'Visa kontolista'}
            >
              <span>{showAccounts ? 'Dölj konton' : 'Visa konton'}</span>
              <CaretDown
                size={12}
                weight="regular"
                className={`transition-transform duration-200 ${
                  showAccounts ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* Mjukt utfällbar lista med anslutna konton */}
        <div
          className={`grid transition-all duration-200 ease-out ${
            showAccounts ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'
          }`}
        >
          <div className="overflow-hidden">
            {accounts.length > 0 ? (
              <div className="pt-2.5 border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                {accounts.map((acc) => {
                  const hasDuplicateName =
                    accounts.filter(
                      (other) =>
                        other.name.trim().toLowerCase() === acc.name.trim().toLowerCase()
                    ).length > 1;
                  const cleanDigits = (acc.accountNumber || '').replace(/\D/g, '');
                  const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : '';

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => onSelectAccount?.(acc.id)}
                      title={`Visa transaktioner för ${acc.name}`}
                      className="w-full py-2.5 first:pt-0.5 last:pb-0.5 flex items-center justify-between gap-2.5 text-left text-xs sm:text-[13px] hover:bg-[var(--surface-hover)] rounded-xl px-1 -mx-1 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ItemLogo
                          name={acc.bankName || acc.name}
                          category="Bank"
                          logoUrl={acc.logo}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-normal text-[13px] sm:text-[13.5px] tracking-[-0.005em] leading-snug text-[var(--text-primary)] block truncate">
                            {acc.name}
                          </span>
                          {(acc.bankName || (hasDuplicateName && last4)) && (
                            <span className="text-[11.5px] font-normal text-[var(--text-secondary)] block truncate mt-0.5">
                              {acc.bankName}
                              {hasDuplicateName && last4 ? ` · •••• ${last4}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-display font-semibold text-[13.5px] tracking-[-0.01em] text-[var(--text-primary)] tabular-nums">
                          {formatKr(acc.balance)}
                        </span>
                        <CaretRight
                          size={12}
                          weight="regular"
                          className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : isInitialLoading ? (
              <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-2.5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[var(--surface-raised)]" />
                    <div className="space-y-1.5">
                      <div className="w-24 h-3 rounded bg-[var(--surface-raised)]" />
                      <div className="w-16 h-2 rounded bg-[var(--surface-raised)]" />
                    </div>
                  </div>
                  <div className="w-20 h-3.5 rounded bg-[var(--surface-raised)]" />
                </div>
              </div>
            ) : (
              <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-secondary)]">
                  Ingen bank ansluten
                </span>
                <button
                  type="button"
                  onClick={onOpenBank}
                  className="ui-btn-sm-primary"
                >
                  <Bank size={14} />
                  <span>Anslut</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

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
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5 select-none cursor-grab active:cursor-grabbing"
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

              const hasPlannedIncome = incomes.some(
                (inc) => Math.min(Number(inc.payday) || 25, lastDayOfMonth) === dayOfMonth
              );
              const hasPlannedExpense = fixedExpenses.some(
                (exp) => Math.min(Number(exp.dueDay) || 28, lastDayOfMonth) === dayOfMonth
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
                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)] shadow-subtle'
                    : 'bg-transparent hover:bg-[var(--surface-color)]/70 text-[var(--text-primary)]'
                }`}
              >
                <span
                  className={`text-[10.5px] leading-none ${
                    isSelected
                      ? 'text-[var(--bg-color)]/80 font-normal'
                      : isToday
                      ? 'text-[var(--text-primary)] font-semibold'
                      : 'text-[var(--text-muted)] font-normal'
                  }`}
                >
                  {day.topLabel}
                </span>
                <span
                  className={`font-display text-[13.5px] tabular-nums leading-none mt-1.5 no-privacy-blur ${
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
                          ? 'bg-[var(--bg-color)]'
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
        <div className="mt-3.5 sm:mt-4">
        {selectedDayItems.length > 0 ? (
          <div className="ui-list-card">
            {selectedDayItems.map((tx) => {
              const isIncome = tx.type === 'income';
              const isPlanned = tx.id.startsWith('planned-');
              const recurringStatus = checkIsRecurringTransaction(
                tx,
                fixedExpenses,
                incomes
              );
              const isFixedExpenseTx = Boolean(
                !isIncome && (recurringStatus.isRecurring || tx.id.startsWith('planned-exp-'))
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
                            className="text-rose-500 shrink-0 ml-0.5"
                          />
                        )}
                        {tx.isWaitingForPackage && (
                          <Package
                            size={11}
                            weight="fill"
                            className="text-amber-500 shrink-0 ml-0.5"
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
                      {isIncome ? `+${formatKr(tx.amount)}` : `-${formatKr(tx.amount)}`}
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

      {/* ============================================================== */}
      {/* SNABBVY-MODAL FÖR INKOMST / FASTA / RÖRLIGT                     */}
      {/* ============================================================== */}
      <BottomSheet
        isOpen={Boolean(activeHeroPopup)}
        onClose={() => setActiveHeroPopup(null)}
        title={
          activeHeroPopup === 'income'
            ? 'Inkomst'
            : activeHeroPopup === 'fixed'
            ? 'Fasta utgifter'
            : 'Rörliga utgifter'
        }
      >
        <div className="divide-y divide-[var(--border-subtle)] -mt-2">
          {activeHeroPopup === 'income' &&
            (incomes.length > 0 ? (
              incomes.map((inc) => {
                const catLabel = inc.category || 'Lön';
                return (
                  <button
                    key={inc.id}
                    type="button"
                    onClick={() => {
                      if (onSelectIncome) {
                        setActiveHeroPopup(null);
                        onSelectIncome(inc);
                      }
                    }}
                    className="ui-tx-row"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ItemLogo
                        name={inc.name}
                        category={catLabel}
                        logoUrl={inc.logo}
                        size="md"
                        isRecurring={false}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="ui-row-title">{inc.name}</span>
                        <span className="ui-row-subtitle">
                          <CategoryIcon
                            category={catLabel}
                            size={11}
                            className="shrink-0"
                          />
                          <span className="truncate">{catLabel}</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="ui-row-amount-income">
                        +{formatKr(inc.amount)}
                      </span>
                      <span className="ui-row-meta">
                        Den {inc.payday || 25}:e
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-10 text-center text-[12.5px] text-[var(--text-secondary)]">
                Inga inkomster
              </div>
            ))}

          {activeHeroPopup === 'fixed' &&
            (fixedExpenses.length > 0 ? (
              fixedExpenses.map((exp) => {
                const catLabel = exp.category || 'Räkningar';
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => {
                      if (onSelectFixed) {
                        setActiveHeroPopup(null);
                        onSelectFixed(exp);
                      }
                    }}
                    className="ui-tx-row"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ItemLogo
                        name={exp.name}
                        category={catLabel}
                        logoUrl={exp.logo}
                        size="md"
                        isRecurring={false}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="ui-row-title">{exp.name}</span>
                        <span className="ui-row-subtitle">
                          <CategoryIcon
                            category={catLabel}
                            size={11}
                            className="shrink-0"
                          />
                          <span className="truncate">
                            {catLabel}
                            {exp.isShared &&
                            exp.fullAmount &&
                            exp.fullAmount > exp.amount
                              ? ` · Delad (av ${formatKr(exp.fullAmount)})`
                              : ''}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="ui-row-amount">
                        -{formatKr(exp.amount)}
                      </span>
                      <span className="ui-row-meta">
                        Den {exp.dueDay || 28}:e
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-10 text-center text-[12.5px] text-[var(--text-secondary)]">
                Inga fasta utgifter
              </div>
            ))}

          {activeHeroPopup === 'variable' &&
            (variablePeriodTransactions.length > 0 ? (
              variablePeriodTransactions.map((tx) => {
                const isRefund = tx.type === 'income';
                const isPending =
                  tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD';
                const isSplit =
                  tx.originalAmount !== undefined &&
                  tx.originalAmount > tx.amount;
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => {
                      setActiveHeroPopup(null);
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
                        isRecurring={false}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="ui-row-title">{tx.title}</span>
                        <span className="ui-row-subtitle">
                          <CategoryIcon
                            category={tx.category}
                            size={11}
                            className="shrink-0"
                          />
                          <span className="truncate">{tx.category}</span>
                          {isSplit && tx.originalAmount && (
                            <span className="text-[11px] opacity-80 shrink-0">
                              · av {formatKr(tx.originalAmount)}
                            </span>
                          )}
                          {tx.isHearted && (
                            <Heart
                              size={11}
                              weight="fill"
                              className="text-rose-500 shrink-0 ml-0.5"
                            />
                          )}
                          {tx.isWaitingForPackage && (
                            <Package
                              size={11}
                              weight="fill"
                              className="text-amber-500 shrink-0 ml-0.5"
                            />
                          )}
                          {tx.receiptUrl && (
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
                        className={
                          isRefund ? 'ui-row-amount-income' : 'ui-row-amount'
                        }
                      >
                        {isRefund
                          ? `+${formatKr(tx.amount)}`
                          : `-${formatKr(tx.amount)}`}
                      </span>
                      <span className="ui-row-meta">
                        {isPending
                          ? 'Reserverat'
                          : formatSwedishDateHeading(tx.date)}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="py-10 text-center text-[12.5px] text-[var(--text-secondary)]">
                Inga rörliga utgifter i perioden
              </div>
            ))}
        </div>
      </BottomSheet>
    </div>
  );
};

