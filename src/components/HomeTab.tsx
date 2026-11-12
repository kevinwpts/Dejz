import React, { useState, useMemo, useCallback } from 'react';
import { WelcomeBetaCard } from './WelcomeBetaCard';
import { PeriodInfo, isDateInPeriod } from '../utils/periodEngine';
import { deduplicateTransactions } from '../utils/transactionDedup';
import { getSwedishDateStr } from '../utils/swedishDate';
import { reconcilePeriodRecurringMatches } from '../utils/recurring/periodReconcile';
import { getShowBudgetBreakdownOnHome, getShowAccountsOnHome } from '../utils/cache/categories';
import { markTransactionsReviewed } from '../utils/cache/itemMeta';
import { type AccountItem, type FixedExpenseItem, type IncomeItem, type TransactionItem, compareTransactionsChronologically, doesTransactionMatchAccount } from '../app/models';
import { HomeHeroCard } from './home/HomeHeroCard';
import { HomeAccountsCard } from './home/HomeAccountsCard';
import { HomeGoalsCard } from './home/HomeGoalsCard';
import { HomeTimeline } from './home/HomeTimeline';
import { HomeQuickViewSheet } from './home/HomeQuickViewSheet';
import { HomeAccountSheet } from './home/HomeAccountSheet';
import { HomeSinceLastSheet } from './home/HomeSinceLastSheet';
import { useSinceLastVisit } from './home/useSinceLastVisit';
import { useHomeTimeline } from './home/useHomeTimeline';
import { useSavingsGoals } from '../utils/hooks/useSavingsGoals';

// Samma tomma listor varje gång – en ny [] vid varje render skulle räkna om "Sedan sist" hela tiden
const NO_INCOMES: IncomeItem[] = [];
const NO_FIXED_EXPENSES: FixedExpenseItem[] = [];

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

// Visa sparmål på Hem (standard: ja). Utanför komponenten – React Compiler kan inte optimera try/catch med villkor.
function readShowGoalsOnHome(): boolean {
  try {
    const saved = localStorage.getItem('dejz_show_goals_home');
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

export const HomeTab: React.FC<HomeTabProps> = ({
  period,
  connectedBank: _connectedBank,
  accounts,
  hasBankConnection = false,
  incomes = NO_INCOMES,
  fixedExpenses = NO_FIXED_EXPENSES,
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
  const [showGoals, setShowGoals] = useState<boolean>(readShowGoalsOnHome);
  const [activeHeroPopup, setActiveHeroPopup] = useState<'income' | 'fixed' | 'variable' | null>(
    null
  );
  // Sparmålen ligger i localStorage – läses vid varje rendering och när de sparas
  const savingsGoals = useSavingsGoals();
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

  const handleMarkReviewed = (ids: string[]) => {
    markTransactionsReviewed(ids);
  };

  // "Sedan sist": nya köp sedan förra besöket (se home/useSinceLastVisit.ts)
  const { sinceLastVisitTxs, isSinceLastOpen, dismissSinceLastVisit } = useSinceLastVisit({
    transactions,
    isInitialLoading,
    todayStr,
    fixedExpenses,
    incomes,
    hasBankConnection,
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

  // Tidslinjen: dagar, vald dag och dagens poster (se home/useHomeTimeline.ts)
  const {
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
  } = useHomeTimeline({
    transactions,
    todayStr,
    period,
    incomes,
    fixedExpenses,
    periodRecurringMatches,
  });

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
        dayButtonRefs={dayButtonsRef}
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

