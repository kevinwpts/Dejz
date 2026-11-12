import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { WelcomeBetaCard } from './WelcomeBetaCard';
import { PeriodInfo, isDateInPeriod } from '../utils/periodEngine';
import { deduplicateTransactions } from '../utils/transactionDedup';
import {
  formatSwedishDateHeading,
  getSwedishDateStr,
} from '../utils/swedishDate';
import { checkIsRecurringTransaction, reconcilePeriodRecurringMatches } from '../utils/recurring';
import {
  getShowBudgetBreakdownOnHome,
  getShowAccountsOnHome,
  getSavingsGoals,
  getReviewedTransactionIds,
  hasInitializedReviewedTransactions,
  markTransactionsReviewed,
} from '../utils/appCache';
import type { AccountItem, FixedExpenseItem, IncomeItem, TransactionItem } from '../app/models';
import { compareTransactionsChronologically, doesTransactionMatchAccount } from '../app/models';
import { HomeHeroCard } from './home/HomeHeroCard';
import { HomeAccountsCard } from './home/HomeAccountsCard';
import { HomeGoalsCard } from './home/HomeGoalsCard';
import { HomeTimeline } from './home/HomeTimeline';
import { HomeQuickViewSheet } from './home/HomeQuickViewSheet';
import { HomeAccountSheet } from './home/HomeAccountSheet';
import { HomeSinceLastSheet } from './home/HomeSinceLastSheet';

// Typer och hjälpfunktioner finns i app/models.ts – exporteras här vidare så att gamla importer fungerar
export type { AccountItem, FixedExpenseItem, IncomeItem, TransactionItem } from '../app/models';
export { compareTransactionsChronologically, doesTransactionMatchAccount, formatFixedCancellationBadge, getTransactionTime, isFixedExpenseActiveInPeriod } from '../app/models';

interface HomeTabProps {
  period: PeriodInfo;
  connectedBank: string | null;
  accounts: AccountItem[];
  /** Är ett bankkonto kopplat? "Sedan sist" visas bara då – utan bank har man själv lagt in köpen. */
  hasBankConnection?: boolean;
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
  onNavigateToGoals?: () => void;
  onSelectAccount?: (accountId: string) => void;
  onUpdateAccountMeta?: (
    accountId: string,
    patch: { customName?: string; excludeFromTotalBalance?: boolean }
  ) => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  onExcludeTransaction?: (id: string, exclude: boolean) => void;
  onUpdateTransaction?: (tx: TransactionItem) => void;
  /** Saldo just nu (utan bank) – visas som en rad under hemkortet */
  manualBalance?: { amount: number; at: string } | null;
  onOpenBalance?: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  period,
  connectedBank: _connectedBank,
  accounts,
  hasBankConnection = false,
  incomes = [],
  fixedExpenses = [],
  transactions,
  totalBalance,
  totalIncome,
  totalFixedExpenses,
  totalVariableSpent,
  kvarAttSpendera,
  dagsbudget: _dagsbudget,
  isInitialLoading = false,
  onOpenBank,
  onSelectTransaction,
  onSelectFixed,
  onSelectIncome,
  onNavigateToGoals,
  onSelectAccount,
  onUpdateAccountMeta,
  onToggleHeart,
  onTogglePackage,
  onExcludeTransaction,
  onUpdateTransaction: _onUpdateTransaction,
  manualBalance: _manualBalance = null,
  onOpenBalance,
}) => {
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState<boolean>(() =>
    getShowBudgetBreakdownOnHome()
  );
  const [showAccounts, setShowAccounts] = useState<boolean>(() => getShowAccountsOnHome());
  const [showGoals, setShowGoals] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('dejz_show_goals_home');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [activeHeroPopup, setActiveHeroPopup] = useState<'income' | 'fixed' | 'variable' | null>(
    null
  );
  const savingsGoals = useMemo(() => {
    // Sparmålen ligger i localStorage – läs om dem när köp, räkningar, inkomster eller saldon ändras
    void transactions;
    void fixedExpenses;
    void incomes;
    void accounts;
    void totalBalance;
    return getSavingsGoals();
  }, [transactions, fixedExpenses, incomes, accounts, totalBalance]);
  const resolveHomeGoalAmount = useCallback(
    (g: (typeof savingsGoals)[number]): number => {
      if (g.linkedAccountId === '__TOTAL__') {
        return accounts.length > 0 || totalBalance > 0
          ? Math.max(0, Math.round(Number(totalBalance) || 0))
          : Math.max(0, Math.round(Number(g.currentAmount) || 0));
      }
      if (g.linkedAccountId) {
        const matched = accounts.find(
          (a) =>
            a.id === g.linkedAccountId ||
            (g.linkedAccountName &&
              a.name.trim().toLowerCase() === g.linkedAccountName.trim().toLowerCase())
        );
        if (matched) {
          return Math.max(0, Math.round(Number(matched.balance) || 0));
        }
      }
      return Math.max(0, Math.round(Number(g.currentAmount) || 0));
    },
    [accounts, totalBalance]
  );
  const totalSavedInGoals = useMemo(() => {
    const hasTotalLinked = savingsGoals.some((g) => g.linkedAccountId === '__TOTAL__');
    const seenAccountIds = new Set<string>();
    let total = 0;

    for (const g of savingsGoals) {
      if (g.linkedAccountId === '__TOTAL__') {
        if (!seenAccountIds.has('__TOTAL__')) {
          seenAccountIds.add('__TOTAL__');
          total += resolveHomeGoalAmount(g);
        }
        continue;
      }
      if (g.linkedAccountId) {
        const matched = accounts.find(
          (a) =>
            a.id === g.linkedAccountId ||
            (g.linkedAccountName &&
              a.name.trim().toLowerCase() === g.linkedAccountName.trim().toLowerCase())
        );
        const key = matched ? matched.id : g.linkedAccountId;
        if (hasTotalLinked && matched && !matched.excludeFromTotalBalance) {
          continue;
        }
        if (seenAccountIds.has(key)) {
          continue;
        }
        seenAccountIds.add(key);
        total += resolveHomeGoalAmount(g);
        continue;
      }
      total += resolveHomeGoalAmount(g);
    }

    return total;
  }, [savingsGoals, resolveHomeGoalAmount, accounts]);
  const [selectedAccountModalId, setSelectedAccountModalId] = useState<string | null>(null);
  const [isEditingAccountName, setIsEditingAccountName] = useState(false);
  const [accountNameDraft, setAccountNameDraft] = useState('');
  const [copiedAccountNumber, setCopiedAccountNumber] = useState(false);
  const todayStr = useMemo(() => getSwedishDateStr(), []);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getSwedishDateStr());
  const [isTodayScrolledOut, setIsTodayScrolledOut] = useState<boolean>(false);
  const [_reviewedIds, setReviewedIds] = useState<Set<string>>(() => getReviewedTransactionIds());

  const activeModalAccount = useMemo(
    () =>
      selectedAccountModalId
        ? accounts.find((a) => a.id === selectedAccountModalId) || null
        : null,
    [accounts, selectedAccountModalId]
  );

  const activeAccountTransactions = useMemo(() => {
    if (!activeModalAccount) return [];
    const deduped = deduplicateTransactions(transactions || []);
    return deduped
      .filter((tx) => !tx.isExcluded && doesTransactionMatchAccount(tx, activeModalAccount))
      .sort(compareTransactionsChronologically);
  }, [transactions, activeModalAccount]);

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

  const handleMarkReviewed = (ids: string[]) => {
    markTransactionsReviewed(ids);
    setReviewedIds(getReviewedTransactionIds());
  };

  // "Sedan sist"-överblick för nya köp sedan förra besöket i appen
  const [sinceLastVisitTxs, setSinceLastVisitTxs] = useState<TransactionItem[]>([]);
  const [isSinceLastOpen, setIsSinceLastOpen] = useState(false);

  useEffect(() => {
    if (!hasBankConnection) return;
    if (isInitialLoading || !transactions || transactions.length === 0) return;
    const SEEN_STORAGE_KEY = 'dejz_seen_tx_ids_v2';
    try {
      const deduped = deduplicateTransactions(transactions);
      const recentCutoff = (() => {
        const parts = todayStr.split('-');
        const d = new Date(
          Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10) - 3, 12, 0, 0)
        );
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
          d.getUTCDate()
        ).padStart(2, '0')}`;
      })();

      const rawSeen = localStorage.getItem(SEEN_STORAGE_KEY);
      if (!rawSeen) {
        // Första gången: visa senaste inköpsdagens rörliga köp (om det finns köp senaste 3 dagarna)
        const recentExpenses = deduped.filter(
          (tx) =>
            !tx.isExcluded &&
            tx.type === 'expense' &&
            (tx.date || '') >= recentCutoff &&
            (tx.date || '') <= todayStr &&
            !checkIsRecurringTransaction(tx, fixedExpenses, incomes).isRecurring
        );

        if (recentExpenses.length > 0) {
          const latestDate = recentExpenses.reduce(
            (maxD, tx) => ((tx.date || '') > maxD ? tx.date : maxD),
            ''
          );
          const batch = recentExpenses
            .filter((tx) => tx.date === latestDate)
            .slice(0, 6);
          const batchIdSet = new Set(batch.map((b) => b.id));
          const initialSeen = deduped
            .filter((tx) => !batchIdSet.has(tx.id))
            .map((tx) => tx.id);
          localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(initialSeen));
          if (batch.length > 0) {
            setSinceLastVisitTxs(batch);
            setIsSinceLastOpen(true);
          }
        } else {
          localStorage.setItem(
            SEEN_STORAGE_KEY,
            JSON.stringify(deduped.map((tx) => tx.id))
          );
        }
        return;
      }

      const seenSet = new Set<string>(JSON.parse(rawSeen) || []);
      const newlyArrived = deduped
        .filter(
          (tx) =>
            !seenSet.has(tx.id) &&
            !tx.isExcluded &&
            tx.type === 'expense' &&
            (tx.date || '') >= recentCutoff &&
            (tx.date || '') <= todayStr &&
            !checkIsRecurringTransaction(tx, fixedExpenses, incomes).isRecurring
        )
        .slice(0, 8);

      if (newlyArrived.length > 0) {
        setSinceLastVisitTxs(newlyArrived);
        setIsSinceLastOpen(true);
      }
    } catch {
      // ignore storage errors
    }
  }, [transactions, isInitialLoading, todayStr, fixedExpenses, incomes, hasBankConnection]);

  const dismissSinceLastVisit = useCallback(() => {
    setIsSinceLastOpen(false);
    try {
      const SEEN_STORAGE_KEY = 'dejz_seen_tx_ids_v2';
      const rawSeen = localStorage.getItem(SEEN_STORAGE_KEY);
      const seenSet = new Set<string>(rawSeen ? JSON.parse(rawSeen) : []);
      for (const tx of transactions || []) {
        if (tx.id) seenSet.add(tx.id);
      }
      for (const tx of sinceLastVisitTxs) {
        if (tx.id) seenSet.add(tx.id);
      }
      localStorage.setItem(
        SEEN_STORAGE_KEY,
        JSON.stringify(Array.from(seenSet).slice(-2500))
      );
      if (sinceLastVisitTxs.length > 0) {
        handleMarkReviewed(sinceLastVisitTxs.map((t) => t.id));
      }
    } catch {
      // ignore
    }
  }, [transactions, sinceLastVisitTxs]);

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

  const periodRecurringMatches = useMemo(() => {
    const deduped = deduplicateTransactions(transactions || []).filter(
      (tx) => !tx.isExcluded && isDateInPeriod(tx.date, period)
    );
    return reconcilePeriodRecurringMatches(deduped, fixedExpenses, incomes);
  }, [transactions, period, fixedExpenses, incomes]);

  // Rörliga transaktioner under aktuell löneperiod (för snabbvy vid klick på "Rörligt")
  const variablePeriodTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions || []);
    const alreadyLinkedSwishIds = new Set<string>();
    for (const tx of deduped) {
      if (tx.linkedSwishTxId) {
        alreadyLinkedSwishIds.add(tx.linkedSwishTxId);
      }
    }

    return deduped
      .filter((tx) => {
        if (tx.isExcluded) return false;
        if (!isDateInPeriod(tx.date, period)) return false;
        if (tx.type === 'income') {
          if (tx.category === 'Återbetalning') return true;
          if (
            (tx.category === 'Swish' || /swish/i.test(tx.title || '')) &&
            !periodRecurringMatches.claimedIncomeTxIds.has(tx.id) &&
            !alreadyLinkedSwishIds.has(tx.id)
          ) {
            return true;
          }
          return false;
        }
        if (periodRecurringMatches.claimedFixedTxIds.has(tx.id)) {
          return false;
        }
        return true;
      })
      .sort(compareTransactionsChronologically);
  }, [transactions, period, periodRecurringMatches]);

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
    const btn = dayButtonRefs.current[dateKey];
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
    const todayBtn = dayButtonRefs.current[todayStr];
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

  return (
    <div className="ui-page">
      <HomeHeroCard
        kvarAttSpendera={kvarAttSpendera}
        totalIncome={totalIncome}
        totalFixedExpenses={totalFixedExpenses}
        totalVariableSpent={totalVariableSpent}
        onOpenBalance={onOpenBalance}
        accounts={accounts}
        period={period}
        formatKr={formatKr}
        showBudgetBreakdown={showBudgetBreakdown}
        setShowBudgetBreakdown={setShowBudgetBreakdown}
        isInitialLoading={isInitialLoading}
        setActiveHeroPopup={setActiveHeroPopup}
      />

      {/* Välkomstkort för nya användare (första veckan, kan stängas) */}
      <WelcomeBetaCard />

      <HomeAccountsCard
        accounts={accounts}
        showAccounts={showAccounts}
        setShowAccounts={setShowAccounts}
        isInitialLoading={isInitialLoading}
        formatKr={formatKr}
        totalBalance={totalBalance}
        setSelectedAccountModalId={setSelectedAccountModalId}
        setAccountNameDraft={setAccountNameDraft}
        setIsEditingAccountName={setIsEditingAccountName}
        setCopiedAccountNumber={setCopiedAccountNumber}
        onOpenBank={onOpenBank}
      />

      <HomeGoalsCard
        onNavigateToGoals={onNavigateToGoals}
        showGoals={showGoals}
        setShowGoals={setShowGoals}
        formatKr={formatKr}
        totalSavedInGoals={totalSavedInGoals}
        savingsGoals={savingsGoals}
        resolveHomeGoalAmount={resolveHomeGoalAmount}
      />

      <HomeTimeline
        timelineScrollRef={timelineScrollRef}
        handleTimelineScroll={handleTimelineScroll}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUpOrLeave={handleMouseUpOrLeave}
        handleWheel={handleWheel}
        timelineDays={timelineDays}
        selectedDateKey={selectedDateKey}
        todayStr={todayStr}
        transactionsByDate={transactionsByDate}
        period={period}
        incomes={incomes}
        periodRecurringMatches={periodRecurringMatches}
        fixedExpenses={fixedExpenses}
        dayButtonRefs={dayButtonRefs}
        dragStateRef={dragStateRef}
        setSelectedDateKey={setSelectedDateKey}
        isInitialLoading={isInitialLoading}
        isTodayScrolledOut={isTodayScrolledOut}
        handleJumpToToday={handleJumpToToday}
        selectedDayItems={selectedDayItems}
        selectedDayNet={selectedDayNet}
        formatKr={formatKr}
        handleMarkReviewed={handleMarkReviewed}
        onSelectTransaction={onSelectTransaction}
        onToggleHeart={onToggleHeart}
        onTogglePackage={onTogglePackage}
        onExcludeTransaction={onExcludeTransaction}
      />

      <HomeQuickViewSheet
        activeHeroPopup={activeHeroPopup}
        setActiveHeroPopup={setActiveHeroPopup}
        transactions={transactions}
        period={period}
        periodRecurringMatches={periodRecurringMatches}
        incomes={incomes}
        onSelectIncome={onSelectIncome}
        formatKr={formatKr}
        onSelectTransaction={onSelectTransaction}
        fixedExpenses={fixedExpenses}
        onSelectFixed={onSelectFixed}
        variablePeriodTransactions={variablePeriodTransactions}
        todayStr={todayStr}
      />

      <HomeAccountSheet
        activeModalAccount={activeModalAccount}
        setSelectedAccountModalId={setSelectedAccountModalId}
        setIsEditingAccountName={setIsEditingAccountName}
        isEditingAccountName={isEditingAccountName}
        accountNameDraft={accountNameDraft}
        setAccountNameDraft={setAccountNameDraft}
        onUpdateAccountMeta={onUpdateAccountMeta}
        formatKr={formatKr}
        setCopiedAccountNumber={setCopiedAccountNumber}
        copiedAccountNumber={copiedAccountNumber}
        activeAccountTransactions={activeAccountTransactions}
        onSelectAccount={onSelectAccount}
        fixedExpenses={fixedExpenses}
        incomes={incomes}
        onSelectTransaction={onSelectTransaction}
      />

      <HomeSinceLastSheet
        isSinceLastOpen={isSinceLastOpen}
        sinceLastVisitTxs={sinceLastVisitTxs}
        dismissSinceLastVisit={dismissSinceLastVisit}
        formatKr={formatKr}
        onSelectTransaction={onSelectTransaction}
      />
    </div>
  );
};

