import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Bank,
  CalendarBlank,
  CaretRight,
  Check,
  Eye,
  EyeSlash,
  Heart,
  Package,
  Paperclip,
  Sparkle,
  Users,
  X,
} from '@phosphor-icons/react';
import { PeriodInfo } from '../utils/periodEngine';
import { ItemLogo } from './ItemLogo';
import { SwipeableTxRow } from './ui/SwipeableTxRow';
import { BottomSheet } from './ui/BottomSheet';
import { deduplicateTransactions } from '../utils/transactionDedup';
import {
  formatIsoTimeStockholm,
  formatSwedishDateHeading,
  getSwedishDateStr,
  getYesterdaySwedishDateStr,
} from '../utils/swedishDate';
import { checkIsRecurringTransaction } from '../utils/recurring';
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
  paymentMethod?: string;
  receiptUrl?: string;
  receiptName?: string;

  // Information hämtad från Enable Banking / Open Banking API
  rawDescription?: string;
  counterpartyName?: string;
  currency?: string;
  creditDebitIndicator?: string;
  transactionId?: string;
  entryReference?: string;
  valueDate?: string;
  bankAccountName?: string;
  rawJson?: any;
}

export function getTransactionTime(
  tx: Pick<TransactionItem, 'id' | 'title' | 'category' | 'date' | 'time' | 'note'> & {
    amount?: number;
  }
): string {
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

  // Returnera tom sträng om banken inte levererat en riktig tidsstämpel (hitta aldrig på klockslag)
  return '';
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
  onNavigateToFixed: () => void;
  onNavigateToTransactions: () => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  onExcludeTransaction?: (id: string, exclude: boolean) => void;
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
  isInitialLoading = false,
  onOpenBank,
  onSelectTransaction,
  onToggleHeart,
  onTogglePackage,
  onExcludeTransaction,
}) => {
  const [showAccounts, setShowAccounts] = useState<boolean>(() => getShowAccountsOnHome());
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

      let topLabel = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Stockholm',
        weekday: 'short',
      })
        .format(dObj)
        .replace('.', '');
      topLabel = topLabel.charAt(0).toUpperCase() + topLabel.slice(1);

      if (dateStr === todayStr) topLabel = 'Idag';
      else if (dateStr === yesterdayStr) topLabel = 'Igår';

      const dayNum = String(dObj.getUTCDate());
      const shortMonth = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Stockholm',
        month: 'short',
      })
        .format(dObj)
        .replace('.', '');

      result.push({
        dateKey: dateStr,
        topLabel,
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
            <span className="text-xs text-[var(--text-muted)] font-medium">
              Kvar att spendera
            </span>
            <span className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums">
              {period.startLabel} – {period.endLabel}
            </span>
          </div>

          {isInitialLoading && accounts.length === 0 ? (
            <div className="h-10 w-44 rounded-2xl bg-[var(--surface-raised)] animate-pulse mt-1" />
          ) : (
            <div className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] tabular-nums">
              {formatKr(kvarAttSpendera)}
            </div>
          )}

          <div className="text-xs text-[var(--text-muted)] font-medium mt-1 tabular-nums">
            {period.daysRemaining} {period.daysRemaining === 1 ? 'dag' : 'dagar'} till nästa lön
          </div>
        </div>

        {/* 3-Column Hairline Breakdown (No nested boxes) */}
        <div className="ui-stat-grid pt-4 mt-4 border-t border-[var(--border-subtle)]">
          <div className="pr-3 text-left min-w-0">
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
          </div>

          <div className="px-3 text-left min-w-0">
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
          </div>

          <div className="pl-3 text-left min-w-0">
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
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* MODUL 2: TOTALT SALDO MED MJUK KONTO-ACCORDION                 */}
      {/* ============================================================== */}
      <section className="ui-card-p">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">
                Totalt saldo
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !showAccounts;
                  setShowAccounts(next);
                  setShowAccountsOnHome(next);
                }}
                className="ui-icon-btn"
                title={showAccounts ? 'Dölj konton' : 'Visa konton'}
              >
                {showAccounts ? <Eye size={15} /> : <EyeSlash size={15} />}
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenBank}
              className="py-1.5 px-2.5 -mr-1.5 rounded-xl text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-color)] transition-colors cursor-pointer"
            >
              {connectedBank ? 'Hantera' : isInitialLoading ? '' : '+ Anslut'}
            </button>
          </div>
          {isInitialLoading && accounts.length === 0 ? (
            <div className="h-9 w-36 rounded-xl bg-[var(--surface-raised)] animate-pulse mt-1" />
          ) : (
            <div className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] tabular-nums">
              {formatKr(totalBalance)}
            </div>
          )}
        </div>

        {/* Mjukt utfällbar lista med anslutna konton */}
        <div
          className={`grid transition-all duration-200 ease-out ${
            showAccounts ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'
          }`}
        >
          <div className="overflow-hidden">
            {accounts.length > 0 ? (
              <div className="pt-3 border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2.5 text-xs sm:text-[13px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <ItemLogo
                        name={acc.bankName || acc.name}
                        category="Bank"
                        logoUrl={acc.logo}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-[var(--text-primary)] block truncate">
                          {acc.name}
                        </span>
                      </div>
                    </div>
                    <span className="font-display font-bold text-[var(--text-primary)] tabular-nums shrink-0">
                      {formatKr(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>
            ) : isInitialLoading ? (
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5 animate-pulse">
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
              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-muted)]">
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
      {/* MODUL 2.5: GRANSKA NYA KÖP (Inbox-flöde)                       */}
      {/* ============================================================== */}
      {unreviewedTransactions.length > 0 && (
        <button
          type="button"
          onClick={() => setIsInboxOpen(true)}
          className="w-full ui-card hover:border-[var(--text-muted)] px-4 py-3.5 flex items-center justify-between gap-3 transition-all active:scale-[0.99] cursor-pointer group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center shrink-0">
              <Sparkle size={16} weight="fill" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs sm:text-[13px] font-bold text-[var(--text-primary)] block truncate">
                {unreviewedTransactions.length === 1
                  ? '1 ny händelse att granska'
                  : `${unreviewedTransactions.length} nya händelser att granska`}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block truncate mt-0.5">
                Kontrollera kategori eller markera som klara
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2.5 py-1 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[11px] font-bold text-[var(--text-primary)]">
              Granska
            </span>
            <CaretRight
              size={14}
              weight="bold"
              className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
            />
          </div>
        </button>
      )}

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
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 select-none cursor-grab active:cursor-grabbing"
        >
          {timelineDays.map((day) => {
            const isSelected = day.dateKey === selectedDateKey;
            const isToday = day.dateKey === todayStr;
            const dayTxs = transactionsByDate.get(day.dateKey) || [];
            let hasActivity = dayTxs.length > 0;
            let hasIncomeActivity = dayTxs.some((t) => t.type === 'income');

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

              if (hasPlannedIncome) {
                hasActivity = true;
                hasIncomeActivity = true;
              } else if (hasPlannedExpense) {
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
                className={`shrink-0 w-[56px] sm:w-[60px] h-[68px] sm:h-[72px] rounded-2xl border transition-all flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] shadow-sm'
                    : isToday
                    ? 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--text-muted)]/60 hover:border-[var(--text-primary)]'
                    : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                }`}
              >
                <span
                  className={`text-[11px] font-semibold tracking-tight leading-none ${
                    isSelected
                      ? 'opacity-80'
                      : isToday
                      ? 'text-[var(--text-primary)] font-bold'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {day.topLabel}
                </span>
                <span className="font-display font-bold text-sm sm:text-[15px] tabular-nums leading-none mt-1.5 no-privacy-blur">
                  {day.dayNum}
                </span>
                <div className="h-1.5 flex items-center justify-center mt-1.5">
                  {hasActivity && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        hasIncomeActivity
                          ? isSelected
                            ? 'bg-emerald-400'
                            : 'bg-emerald-500'
                          : isSelected
                          ? 'bg-[var(--bg-color)]/75'
                          : 'bg-[var(--text-muted)]/60'
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Vald dags rubrik & summering */}
        <div className="ui-section-header pt-1.5 pb-2.5">
          <span className="ui-section-title">
            {formatSwedishDateHeading(selectedDateKey)}
          </span>
          {selectedDayItems.length > 0 && (
            <span
              className={`ui-section-meta ${
                selectedDayNet > 0
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : ''
              }`}
            >
              {selectedDayNet > 0
                ? `+${formatKr(selectedDayNet)}`
                : selectedDayNet < 0
                ? `-${formatKr(Math.abs(selectedDayNet))}`
                : formatKr(0)}
            </span>
          )}
        </div>

        {/* Vald dags händelser samlade i ett enhetligt kort med tunna skiljelinjer */}
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
              const isSplit =
                tx.originalAmount !== undefined && tx.originalAmount > tx.amount;

              const rowContent = (
                <button
                  type="button"
                  onClick={() => {
                    handleMarkReviewed([tx.id]);
                    onSelectTransaction(tx);
                  }}
                  className="ui-tx-row"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <ItemLogo
                      name={tx.title}
                      category={tx.category}
                      logoUrl={tx.logo}
                      size="md"
                      isRecurring={recurringStatus.isRecurring}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title flex items-center gap-1.5">
                        <span className="truncate">{tx.title}</span>
                        {tx.isHearted && (
                          <Heart
                            size={13}
                            weight="fill"
                            className="text-rose-500 shrink-0"
                          />
                        )}
                        {tx.isWaitingForPackage && (
                          <Package
                            size={13}
                            weight="fill"
                            className="text-amber-500 shrink-0"
                          />
                        )}
                        {tx.receiptUrl && (
                          <Paperclip
                            size={13}
                            weight="bold"
                            className="text-[var(--text-secondary)] shrink-0"
                          />
                        )}
                        {isSplit && (
                          <Users
                            size={13}
                            weight="fill"
                            className="text-emerald-500 shrink-0"
                            title="Delad utgift"
                          />
                        )}
                      </span>
                      <span className="ui-row-subtitle flex items-center gap-1">
                        <span className="truncate">{tx.category}</span>
                        {isSplit && tx.originalAmount && (
                          <span className="text-[11px] opacity-75 shrink-0">
                            · av {formatKr(tx.originalAmount)}
                          </span>
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
                      const realTime =
                        tx.time === 'Planerad' ? 'Planerad' : getTransactionTime(tx);
                      const statusSub =
                        realTime ||
                        (tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                          ? 'Reserverat'
                          : '');
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
          <div className="ui-empty-state py-6 px-4">
            <div className="ui-empty-icon text-[var(--text-muted)]">
              <CalendarBlank size={16} weight="duotone" />
            </div>
            <p className="ui-empty-sub">
              Inga händelser denna dag
            </p>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* DEDIKERAD BOTTOM-SHEET FÖR ATT GRANSKA NYA HÄNDELSER           */}
      {/* ============================================================== */}
      <BottomSheet
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        title="Granska nya händelser"
      >
        <div className="space-y-4">
          {unreviewedTransactions.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)] font-medium">
                  Tryck på en rad för att ändra kategori eller dela belopp
                </span>
              </div>

              <div className="ui-sheet-group">
                {unreviewedTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  return (
                    <div
                      key={`inbox-${tx.id}`}
                      className="ui-row"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          handleMarkReviewed([tx.id]);
                          setIsInboxOpen(false);
                          onSelectTransaction(tx);
                        }}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                      >
                        <ItemLogo
                          name={tx.title}
                          category={tx.category}
                          logoUrl={tx.logo}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-[var(--text-primary)] block truncate">
                            {tx.title}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5 truncate">
                            <span className="truncate">{tx.category}</span>
                            <span>· {formatSwedishDateHeading(tx.date)}</span>
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-display font-bold text-xs tabular-nums ${
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {isIncome ? `+${formatKr(tx.amount)}` : `-${formatKr(tx.amount)}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMarkReviewed([tx.id])}
                          title="Markera som granskad"
                          className="ui-icon-btn-surface hover:text-emerald-500 hover:border-emerald-500/40"
                        >
                          <Check size={14} weight="bold" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  handleMarkReviewed(unreviewedTransactions.map((t) => t.id));
                  setIsInboxOpen(false);
                }}
                className="w-full ui-btn-primary"
              >
                <Check size={14} weight="bold" />
                <span>Markera alla som granskade ({unreviewedTransactions.length})</span>
              </button>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="ui-empty-title">
                Alla nya händelser är granskade!
              </p>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
};

