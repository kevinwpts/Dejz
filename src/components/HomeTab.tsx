import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Bank,
  ArrowRight,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Eye,
  EyeSlash,
  Heart,
  Package,
  Paperclip,
} from '@phosphor-icons/react';
import { PeriodInfo } from '../utils/periodEngine';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';
import { deduplicateTransactions } from '../utils/transactionDedup';
import {
  formatIsoTimeStockholm,
  formatSwedishDateHeading,
  getSwedishDateStr,
  getYesterdaySwedishDateStr,
} from '../utils/swedishDate';
import { checkIsRecurringTransaction } from '../utils/recurring';

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
  // 1. Om tx.time redan är ett klockslag "HH:MM"
  if (tx.time && typeof tx.time === 'string') {
    const trimmed = tx.time.trim();
    if (
      /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) &&
      trimmed !== '12:00' &&
      trimmed !== '00:00'
    ) {
      return trimmed;
    }
    // Om tx.time är en ISO-sträng
    if (trimmed.includes('T')) {
      const parsedStockholm = formatIsoTimeStockholm(trimmed);
      if (parsedStockholm) return parsedStockholm;
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

  // 3. Deterministiskt klockslag i svensk lokal tid anpassat efter butikskategori
  const amtStr =
    (tx as any).amount !== undefined
      ? String(Math.round(Number((tx as any).amount)))
      : '';
  const seedStr = `${tx.title || ''}|${tx.date || ''}|${amtStr}`;
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const absHash = Math.abs(hash);

  const cat = (tx.category || '').toLowerCase();
  if (
    cat.includes('lön') ||
    cat.includes('csn') ||
    cat.includes('bidrag') ||
    cat.includes('pension')
  ) {
    return '08:00';
  }

  let startHour = 8;
  let hourSpan = 12; // 08:00 - 19:59
  if (cat.includes('fika') || cat.includes('restaurang') || cat.includes('nöje')) {
    startHour = 11;
    hourSpan = 10;
  } else if (cat.includes('transport')) {
    startHour = 7;
    hourSpan = 12;
  } else if (cat.includes('mat')) {
    startHour = 9;
    hourSpan = 12;
  } else if (cat.includes('swish')) {
    startHour = 10;
    hourSpan = 12;
  }

  const hour = startHour + (absHash % hourSpan);
  const minute = Math.floor(absHash / 31) % 60;
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
  onNavigateToFixed: () => void;
  onNavigateToTransactions: () => void;
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
  onNavigateToTransactions,
}) => {
  const [showAccounts, setShowAccounts] = useState(true);
  const todayStr = useMemo(() => getSwedishDateStr(), []);
  const yesterdayStr = useMemo(() => getYesterdaySwedishDateStr(), []);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getSwedishDateStr());
  const [daysBackToLoad, setDaysBackToLoad] = useState<number>(365);
  const [daysForwardToLoad, setDaysForwardToLoad] = useState<number>(365);

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

  const stepSelectedDate = (daysDelta: number) => {
    const parts = selectedDateKey.split('-');
    const dObj = new Date(
      Date.UTC(
        parseInt(parts[0], 10),
        parseInt(parts[1], 10) - 1,
        parseInt(parts[2], 10),
        12,
        0,
        0
      )
    );
    dObj.setUTCDate(dObj.getUTCDate() + daysDelta);
    const yyyy = dObj.getUTCFullYear();
    const mm = String(dObj.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dObj.getUTCDate()).padStart(2, '0');
    const nextKey = `${yyyy}-${mm}-${dd}`;
    setSelectedDateKey(nextKey);
  };

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
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* ============================================================== */}
      {/* MODUL 1: KVAR ATT SPENDERA (Hero Bento Card)                   */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-5">
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

        {/* 3-Column Bento Breakdown */}
        <div className="grid grid-cols-3 gap-2 mt-5">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-left min-w-0">
            <span className="text-[11px] text-[var(--text-muted)] font-medium block mb-0.5">
              Inkomst
            </span>
            {isInitialLoading && accounts.length === 0 ? (
              <div className="h-4 w-12 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
            ) : (
              <span className="font-display font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 tabular-nums block tracking-tight">
                +{formatKr(totalIncome)}
              </span>
            )}
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-left min-w-0">
            <span className="text-[11px] text-[var(--text-muted)] font-medium block mb-0.5">
              Fasta
            </span>
            {isInitialLoading && accounts.length === 0 ? (
              <div className="h-4 w-12 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
            ) : (
              <span className="font-display font-bold text-xs sm:text-sm text-[var(--text-primary)] tabular-nums block tracking-tight">
                -{formatKr(totalFixedExpenses)}
              </span>
            )}
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-left min-w-0">
            <span className="text-[11px] text-[var(--text-muted)] font-medium block mb-0.5">
              Rörligt
            </span>
            {isInitialLoading && accounts.length === 0 ? (
              <div className="h-4 w-12 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
            ) : (
              <span className="font-display font-bold text-xs sm:text-sm text-[var(--text-primary)] tabular-nums block tracking-tight">
                -{formatKr(totalVariableSpent)}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* MODUL 2: TOTALT SALDO MED MJUK KONTO-ACCORDION                 */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">
                Totalt saldo
              </span>
              <button
                type="button"
                onClick={() => setShowAccounts(!showAccounts)}
                className="w-7 h-7 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 flex items-center justify-center transition-all cursor-pointer"
                title={showAccounts ? 'Dölj konton' : 'Visa konton'}
              >
                {showAccounts ? <Eye size={14} /> : <EyeSlash size={14} />}
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenBank}
              className="text-xs font-semibold text-[var(--text-primary)] hover:opacity-75 transition-opacity cursor-pointer"
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
              <div className="pt-3.5 border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
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
              <div className="pt-3.5 border-t border-[var(--border-subtle)] space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[var(--surface-raised)]" />
                    <div className="space-y-1.5">
                      <div className="w-24 h-3 rounded bg-[var(--surface-raised)]" />
                      <div className="w-16 h-2 rounded bg-[var(--surface-raised)]" />
                    </div>
                  </div>
                  <div className="w-20 h-4 rounded bg-[var(--surface-raised)]" />
                </div>
              </div>
            ) : (
              <div className="pt-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-muted)]">
                  Ingen bank ansluten
                </span>
                <button
                  type="button"
                  onClick={onOpenBank}
                  className="px-3.5 py-2 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 shrink-0 cursor-pointer"
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
      <section className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-sm text-[var(--text-primary)]">
              Händelser
            </h2>
            {selectedDateKey !== todayStr && (
              <button
                type="button"
                onClick={() => setSelectedDateKey(todayStr)}
                className="px-2 py-0.5 rounded-lg bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Idag
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => stepSelectedDate(-1)}
                className="w-7 h-7 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 flex items-center justify-center transition-all cursor-pointer"
                title="En dag bakåt i tiden"
              >
                <CaretLeft size={13} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => stepSelectedDate(1)}
                className="w-7 h-7 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 flex items-center justify-center transition-all cursor-pointer"
                title="En dag framåt i tiden"
              >
                <CaretRight size={13} weight="bold" />
              </button>
            </div>

            {transactions.length > 0 && (
              <button
                type="button"
                onClick={onNavigateToTransactions}
                className="text-xs font-semibold text-[var(--text-primary)] hover:opacity-75 transition-opacity flex items-center gap-1 cursor-pointer ml-1"
              >
                <span>Alla</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>

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
                className={`shrink-0 min-w-[48px] py-2.5 px-2.5 rounded-2xl border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                    : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                }`}
              >
                <span
                  className={`text-[10px] font-semibold leading-tight ${
                    isSelected ? 'opacity-80' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {day.topLabel}
                </span>
                <span className="font-display font-bold text-sm tabular-nums leading-tight">
                  {day.dayNum}
                </span>
              </button>
            );
          })}
        </div>

        {/* Vald dags rubrik & summering */}
        <div className="flex items-center justify-between pt-2 pb-2.5 text-xs">
          <span className="font-bold text-[var(--text-secondary)]">
            {formatSwedishDateHeading(selectedDateKey)}
          </span>
          {selectedDayItems.length > 0 && (
            <span
              className={`font-display font-semibold tabular-nums ${
                selectedDayNet > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-[var(--text-muted)]'
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

        {/* Enbart den valda dagens händelser som separata kort */}
        {selectedDayItems.length > 0 ? (
          <div className="space-y-2">
            {selectedDayItems.map((tx) => {
              const isIncome = tx.type === 'income';
              const recurringStatus = checkIsRecurringTransaction(
                tx,
                fixedExpenses,
                incomes
              );

              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => onSelectTransaction(tx)}
                  className="w-full p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] flex items-center justify-between gap-3 text-sm text-left active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ItemLogo
                      name={tx.title}
                      category={tx.category}
                      logoUrl={tx.logo}
                      size="md"
                      isRecurring={recurringStatus.isRecurring}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
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
                      </span>
                      <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 truncate mt-0.5">
                        <CategoryIcon category={tx.category} size={12} />
                        <span className="truncate">{tx.category}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-display font-bold tabular-nums block ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {isIncome ? `+${formatKr(tx.amount)}` : `-${formatKr(tx.amount)}`}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] tabular-nums block mt-0.5">
                      {tx.time === 'Planerad' ? 'Planerad' : getTransactionTime(tx)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : isInitialLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[var(--surface-raised)]" />
                  <div className="space-y-1.5">
                    <div className="w-28 h-3.5 rounded bg-[var(--surface-raised)]" />
                    <div className="w-20 h-2.5 rounded bg-[var(--surface-raised)]" />
                  </div>
                </div>
                <div className="w-16 h-4 rounded bg-[var(--surface-raised)]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 px-4 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-center">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center justify-center mx-auto mb-2">
              <CalendarBlank size={18} weight="duotone" />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Inga händelser denna dag
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

