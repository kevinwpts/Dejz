import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ArrowCounterClockwise,
  Bank,
  CalendarBlank,
  CaretDown,
  CaretRight,
  Check,
  Copy,
  Heart,
  Package,
  Paperclip,
  PencilSimple,
  Users,
  X,
} from '@phosphor-icons/react';
import { PeriodInfo, isDateInPeriod } from '../utils/periodEngine';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';
import { SwipeableTxRow } from './ui/SwipeableTxRow';
import { BottomSheet } from './ui/BottomSheet';
import {
  getGoalArtworkTheme,
  GoalArtworkIllustration,
  TiltedGoalsPromoArtwork,
} from './ui/VisualArtwork';
import { deduplicateTransactions } from '../utils/transactionDedup';
import {
  formatIsoTimeStockholm,
  formatSwedishDateHeading,
  getSwedishDateStr,
  getYesterdaySwedishDateStr,
} from '../utils/swedishDate';
import {
  checkIsRecurringTransaction,
  reconcilePeriodRecurringMatches,
} from '../utils/recurring';
import {
  getShowBudgetBreakdownOnHome,
  setShowBudgetBreakdownOnHome,
  getShowAccountsOnHome,
  setShowAccountsOnHome,
  getSavingsGoals,
  getReviewedTransactionIds,
  hasInitializedReviewedTransactions,
  markTransactionsReviewed,
} from '../utils/appCache';
import {
  getHouseholdState,
  hasConnectedHouseholdPartner,
  computeMyHouseholdSummary,
  calculateHouseholdSettlement,
} from '../utils/householdSync';

export interface AccountItem {
  id: string;
  name: string;
  originalName?: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  type: 'checking' | 'savings';
  logo?: string;
  excludeFromTotalBalance?: boolean;
}

export interface IncomeItem {
  id: string;
  name: string;
  originalName?: string;
  linkedAliases?: string[];
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
  linkedAliases?: string[];
  linkedGoalId?: string;
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
  isCancelled?: boolean;
  lastPaymentDate?: string;
  hasNoMorePayments?: boolean;
}

const SHORT_SWEDISH_MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'maj',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
];

export function isFixedExpenseActiveInPeriod(
  exp: FixedExpenseItem,
  period: PeriodInfo
): boolean {
  if (!exp.isCancelled) return true;
  if (exp.hasNoMorePayments) return false;
  if (exp.lastPaymentDate && /^\d{4}-\d{2}$/.test(exp.lastPaymentDate)) {
    const periodEndYm = (period.endDate || '').slice(0, 7);
    if (periodEndYm && periodEndYm > exp.lastPaymentDate) {
      return false;
    }
  }
  return true;
}

export function formatFixedCancellationBadge(exp: FixedExpenseItem): string | null {
  if (!exp.isCancelled) return null;
  if (exp.hasNoMorePayments) return 'Uppsagd · Slut';
  if (exp.lastPaymentDate && /^\d{4}-\d{2}$/.test(exp.lastPaymentDate)) {
    const [yStr, mStr] = exp.lastPaymentDate.split('-');
    const targetYear = parseInt(yStr, 10);
    const targetMonth = parseInt(mStr, 10) - 1;
    const nowStr = getSwedishDateStr();
    const nowYear = parseInt(nowStr.slice(0, 4), 10);
    const nowMonth = parseInt(nowStr.slice(5, 7), 10) - 1;
    const diffMonths = (targetYear - nowYear) * 12 + (targetMonth - nowMonth);
    const monthLabel = SHORT_SWEDISH_MONTHS[targetMonth] || exp.lastPaymentDate;

    if (diffMonths < 0) return 'Uppsagd · Slut';
    if (diffMonths === 0) return `Uppsagd · Sista ${monthLabel}`;
    if (diffMonths <= 6) return `Uppsagd · ${diffMonths} mån kvar`;
    return `Uppsagd · Sista ${monthLabel}`;
  }
  return 'Uppsagd';
}

export interface TransactionItem {
  id: string;
  title: string;
  originalTitle?: string;
  amount: number;
  originalAmount?: number;
  linkedSwishTxId?: string;
  linkedFixedExpenseId?: string;
  linkedIncomeId?: string;
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
  isSharedExpense?: boolean;
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
  createdAt?: string;
  sortOrder?: number;
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

  // 3. Om banken enbart skickade bokföringsdatum utan klockslag (PSD2 standard för SEB m.fl.),
  // returnera tom sträng — hitta aldrig på ett påhittat klockslag.
  return '';
}

export function compareTransactionsChronologically(
  a: TransactionItem,
  b: TransactionItem
): number {
  const dateCmp = (b.date || '').localeCompare(a.date || '');
  if (dateCmp !== 0) return dateCmp;

  const timeA = getTransactionTime(a);
  const timeB = getTransactionTime(b);
  if (timeA && timeB && timeA !== timeB) {
    return timeB.localeCompare(timeA);
  }

  if (
    typeof a.sortOrder === 'number' &&
    typeof b.sortOrder === 'number' &&
    a.sortOrder !== b.sortOrder
  ) {
    return b.sortOrder - a.sortOrder;
  }

  // Om den ena transaktionen hämtades vid en senare synkning än den andra (> 10 sek skillnad),
  // har den inträffat senare under dagen och ska ligga överst.
  if (a.createdAt && b.createdAt) {
    const msA = Date.parse(a.createdAt);
    const msB = Date.parse(b.createdAt);
    if (Number.isFinite(msA) && Number.isFinite(msB) && Math.abs(msB - msA) > 10_000) {
      return msB - msA;
    }
  }

  // Bankens sekventiella bokföringsreferens (t.ex. SEB entry_reference) ökar kronologiskt under dagen
  if (a.entryReference && b.entryReference && a.entryReference !== b.entryReference) {
    return b.entryReference.localeCompare(a.entryReference);
  }

  if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
    return b.createdAt.localeCompare(a.createdAt);
  }

  return 0;
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
  userEmail?: string | null;
  userName?: string | null;
  onNavigateToHousehold?: () => void;
  /** Saldo just nu (utan bank) – visas som en rad under hemkortet */
  manualBalance?: { amount: number; at: string } | null;
  onOpenBalance?: () => void;
}

/** "idag 14:02", "igår 09:10" eller "4 nov" */
function formatBalanceUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
  const time = d.toLocaleTimeString('sv-SE', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    minute: '2-digit',
  });
  if (day === getSwedishDateStr()) return `idag ${time}`;
  if (day === getYesterdaySwedishDateStr()) return `igår ${time}`;
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm', day: 'numeric', month: 'short' });
}

export const HomeTab: React.FC<HomeTabProps> = ({
  period,
  connectedBank: _connectedBank,
  accounts,
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
  userEmail,
  userName,
  onNavigateToHousehold,
  manualBalance = null,
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
  const [heroBudgetMode, setHeroBudgetMode] = useState<'personal' | 'joint'>(() => {
    if (typeof window === 'undefined') return 'personal';
    try {
      return localStorage.getItem('dejz_hero_budget_mode') === 'joint' ? 'joint' : 'personal';
    } catch {
      return 'personal';
    }
  });

  const handleSetHeroBudgetMode = (mode: 'personal' | 'joint') => {
    setHeroBudgetMode(mode);
    try {
      localStorage.setItem('dejz_hero_budget_mode', mode);
    } catch {
      // ignore
    }
  };

  const [householdTick, setHouseholdTick] = useState(0);

  useEffect(() => {
    const onHhUpdate = () => setHouseholdTick((t) => t + 1);
    window.addEventListener('dejz:household-updated', onHhUpdate);
    return () => window.removeEventListener('dejz:household-updated', onHhUpdate);
  }, []);

  const householdBudgetStats = useMemo(() => {
    void householdTick;
    const hh = getHouseholdState();
    if (!hasConnectedHouseholdPartner(hh) || !hh) return null;

    const mySummary = computeMyHouseholdSummary({
      userEmail,
      userName,
      period,
      incomes,
      fixedExpenses,
      transactions,
      sharedCategories: hh.sharedCategories || ['Mat & dryck', 'Boende', 'Räkningar'],
    });

    const otherMembers = Object.values(hh.members || {}).filter(
      (m) => m.email.toLowerCase() !== mySummary.email.toLowerCase()
    );

    const partnerMember = otherMembers[0] || null;

    const jointIncome =
      (Number(totalIncome) || 0) +
      otherMembers.reduce((sum, m) => sum + (Number(m.totalIncome) || 0), 0);
    const jointFixed =
      (Number(mySummary.sharedFixedPaid) || 0) +
      otherMembers.reduce((sum, m) => sum + (Number(m.sharedFixedPaid) || 0), 0);
    const jointVariable =
      (Number(mySummary.sharedVariableSpent) || 0) +
      otherMembers.reduce((sum, m) => sum + (Number(m.sharedVariableSpent) || 0), 0);
    const jointKvar = jointIncome - jointFixed - jointVariable;

    const settlement = calculateHouseholdSettlement(hh, mySummary.email, period.startDate);

    return {
      householdName: hh.name || 'Gemensamt hushåll',
      myName: mySummary.name || 'Jag',
      partnerName: partnerMember?.name || 'Partner',
      jointIncome,
      jointFixed,
      jointVariable,
      jointKvar,
      settlement,
    };
  }, [
    householdTick,
    userEmail,
    userName,
    period,
    incomes,
    fixedExpenses,
    transactions,
    totalIncome,
  ]);
  const savingsGoals = useMemo(
    () => getSavingsGoals(),
    [transactions, fixedExpenses, incomes, accounts, totalBalance]
  );
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
  const yesterdayStr = useMemo(() => getYesterdaySwedishDateStr(), []);
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
  }, [transactions, isInitialLoading, todayStr, fixedExpenses, incomes]);

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
  }, [todayStr, yesterdayStr]);

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
      {/* ============================================================== */}
      {/* MODUL 1: KVAR ATT SPENDERA (Hero Bento Card)                   */}
      {/* ============================================================== */}
      {(() => {
        const isJointMode = Boolean(householdBudgetStats && heroBudgetMode === 'joint');
        const activeKvar = isJointMode ? householdBudgetStats!.jointKvar : kvarAttSpendera;
        const activeIncome = isJointMode ? householdBudgetStats!.jointIncome : totalIncome;
        const activeFixed = isJointMode ? householdBudgetStats!.jointFixed : totalFixedExpenses;
        const activeVariable = isJointMode
          ? householdBudgetStats!.jointVariable
          : totalVariableSpent;
        const isOverBudget = activeKvar < 0;

        // Takt i löneperioden: stapeln = andel av pengarna som är använda,
        // strecket = var idag ligger i perioden.
        const timeShare = Math.min(
          1,
          Math.max(0, period.daysElapsed / Math.max(1, period.daysTotal))
        );
        const spendable = Math.max(0, activeKvar + activeVariable);
        const spent = Math.max(0, activeVariable);
        // Batteri: andel av periodens pengar som finns kvar (full på lönedagen, tom vid nästa lön)
        const remainingShare = spendable > 0 ? Math.max(0, Math.min(1, activeKvar / spendable)) : 0;
        const paceDiff = Math.round(spendable * timeShare - spent); // + = under planen
        const tolerance = Math.max(100, spendable * 0.03);
        const pace: 'over' | 'fast' | 'good' = isOverBudget
          ? 'over'
          : paceDiff < -tolerance
          ? 'fast'
          : 'good';
        const daysLabel =
          period.daysRemaining === 0
            ? 'Lön idag'
            : period.daysRemaining === 1
            ? '1 dag till lön'
            : `${period.daysRemaining} dagar till lön`;

        return (
          <section className={`ui-card-p dejz-hero ${isOverBudget ? 'dejz-hero--over' : ''}`}>
            {householdBudgetStats && (
              <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[var(--border-subtle)]">
                <div className="inline-flex items-center p-0.5 rounded-full bg-[var(--bg-color)] border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => handleSetHeroBudgetMode('personal')}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      heroBudgetMode === 'personal'
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Mitt eget
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetHeroBudgetMode('joint')}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      heroBudgetMode === 'joint'
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Users size={12} weight="bold" />
                    <span>Gemensamt</span>
                  </button>
                </div>

                {onNavigateToHousehold && (
                  <button
                    type="button"
                    onClick={onNavigateToHousehold}
                    className="text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer hover:opacity-80"
                  >
                    {householdBudgetStats.settlement.isSettledForCurrentPeriod ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check size={11} weight="bold" />
                        <span>Utjämnat</span>
                      </span>
                    ) : householdBudgetStats.settlement.netBalance > 5 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {householdBudgetStats.partnerName} är skyldig {formatKr(householdBudgetStats.settlement.netBalance)}
                      </span>
                    ) : householdBudgetStats.settlement.netBalance < -5 ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        Du ska swisha {formatKr(Math.abs(householdBudgetStats.settlement.netBalance))}
                      </span>
                    ) : (
                      <span className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        Delad ekonomi
                      </span>
                    )}
                    <CaretRight size={10} weight="bold" className="text-[var(--text-muted)]" />
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                const next = !showBudgetBreakdown;
                setShowBudgetBreakdown(next);
                setShowBudgetBreakdownOnHome(next);
              }}
              className="w-full text-left cursor-pointer group focus:outline-none"
              aria-expanded={showBudgetBreakdown}
              title={showBudgetBreakdown ? 'Dölj budgetdetaljer' : 'Visa budgetdetaljer'}
            >
              <div className="flex items-center justify-between gap-2">
                {isJointMode ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="flex -space-x-1 shrink-0">
                      <span className="w-4 h-4 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center font-display font-semibold text-[8px] uppercase">
                        {householdBudgetStats!.myName.slice(0, 1)}
                      </span>
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-[var(--surface-color)] flex items-center justify-center font-display font-semibold text-[8px] uppercase">
                        {householdBudgetStats!.partnerName.slice(0, 1)}
                      </span>
                    </span>
                    <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                      Hushållet · {householdBudgetStats!.myName} & {householdBudgetStats!.partnerName}
                    </span>
                  </div>
                ) : (
                  <span
                    className={`text-[13px] font-normal ${
                      isOverBudget
                        ? 'text-rose-600 dark:text-rose-400 font-medium'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {isOverBudget ? 'Över budget' : 'Kvar att spendera'}
                  </span>
                )}
                <span className="text-[13px] font-normal text-[var(--text-secondary)] tabular-nums text-right shrink-0">
                  {daysLabel}
                </span>
              </div>

              <div className="mt-0.5">
                {isInitialLoading && accounts.length === 0 ? (
                  <div className="h-11 w-44 rounded-2xl bg-[var(--surface-raised)] animate-pulse mt-1.5" />
                ) : (
                  <div className="min-w-0">
                    <div
                      className={`font-display text-[44px] sm:text-[48px] font-[600] tracking-[-0.035em] leading-none tabular-nums mt-1.5 ${
                        activeKvar >= 0
                          ? 'text-[var(--text-primary)]'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatKr(activeKvar)}
                    </div>
                    {/* Beloppet i bildform: fylld del = det som är kvar. Färgen visar takten. */}
                    <div
                      className="mt-4 h-2 rounded-full bg-[var(--bg-color)] overflow-hidden"
                      role="meter"
                      aria-label="Kvar av löneperiodens pengar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(remainingShare * 100)}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pace === "fast" ? "bg-amber-400" : "bg-[var(--text-primary)]"
                        }`}
                        style={{ width: `${remainingShare * 100}%` }}
                      />
                    </div>
                    {isJointMode && (
                      <div className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">
                        <span>
                          Din andel ({Math.round(householdBudgetStats!.settlement.myShareRatio * 100)} %):
                        </span>
                        <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                          {formatKr(Math.round(activeKvar * householdBudgetStats!.settlement.myShareRatio))}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Text bara när något behöver uppmärksamhet */}
              {pace !== 'good' && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[12px] tabular-nums">
                  <span
                    aria-hidden="true"
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      pace === 'over' ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-[var(--text-secondary)]">
                    {pace === 'over' ? (
                      <>Pengarna är slut för den här perioden</>
                    ) : (
                      <>
                        <span className="font-medium text-amber-700 dark:text-amber-400">Lite för snabbt</span>
                        {' – '}
                        {formatKr(Math.abs(paceDiff))} över planen
                      </>
                    )}
                  </span>
                </div>
              )}
            </button>

            {/* Mjukt utfällbar 3-kolumns översikt (Inkomst · Fasta · Rörligt) */}
            <div
              className={`grid transition-all duration-200 ease-out ${
                showBudgetBreakdown
                  ? 'grid-rows-[1fr] opacity-100 mt-5'
                  : 'grid-rows-[0fr] opacity-0 mt-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="ui-stat-grid pt-4 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() =>
                      isJointMode && onNavigateToHousehold
                        ? onNavigateToHousehold()
                        : setActiveHeroPopup('income')
                    }
                    className="pr-3 text-left min-w-0 cursor-pointer group/stat hover:opacity-85 active:scale-[0.98] transition-all focus:outline-none"
                  >
                    <span className="ui-stat-label inline-flex items-center gap-1">
                      <span>{isJointMode ? 'Gemensam inkomst' : 'Inkomst'}</span>
                    </span>
                    {isInitialLoading && accounts.length === 0 ? (
                      <div className="h-4 w-12 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
                    ) : (
                      <span className="ui-stat-value text-emerald-600 dark:text-emerald-400">
                        +{formatKr(activeIncome)}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      isJointMode && onNavigateToHousehold
                        ? onNavigateToHousehold()
                        : setActiveHeroPopup('fixed')
                    }
                    className="px-3 text-left min-w-0 cursor-pointer group/stat hover:opacity-85 active:scale-[0.98] transition-all focus:outline-none"
                  >
                    <span className="ui-stat-label inline-flex items-center gap-1">
                      <span>{isJointMode ? 'Gemensamma fasta' : 'Fasta'}</span>
                    </span>
                    {isInitialLoading && accounts.length === 0 ? (
                      <div className="h-4 w-12 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
                    ) : (
                      <span className="ui-stat-value text-[var(--text-primary)]">
                        -{formatKr(activeFixed)}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      isJointMode && onNavigateToHousehold
                        ? onNavigateToHousehold()
                        : setActiveHeroPopup('variable')
                    }
                    className="pl-3 text-left min-w-0 cursor-pointer group/stat hover:opacity-85 active:scale-[0.98] transition-all focus:outline-none"
                  >
                    <span className="ui-stat-label inline-flex items-center gap-1">
                      <span>{isJointMode ? 'Gemensamt rörligt' : 'Rörligt'}</span>
                    </span>
                    {isInitialLoading && accounts.length === 0 ? (
                      <div className="h-4 w-12 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
                    ) : (
                      <span className="ui-stat-value text-[var(--text-primary)]">
                        -{formatKr(activeVariable)}
                      </span>
                    )}
                  </button>
                </div>
                {manualBalance && !isJointMode && (
                  <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
                    Beloppet utgår från ditt saldo på {formatKr(manualBalance.amount)} minus räkningarna
                    som är kvar före lön.
                  </p>
                )}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ============================================================== */}
      {/* SALDO JUST NU (utan bank): gör "kvar" exakt utan att logga allt */}
      {/* ============================================================== */}
      {onOpenBalance && accounts.length === 0 && (
        <button
          type="button"
          onClick={onOpenBalance}
          className="w-full bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3.5 sm:px-5 flex items-center gap-3 text-left cursor-pointer hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all"
        >
          <span className="w-9 h-9 rounded-full bg-[var(--bg-color)] flex items-center justify-center shrink-0 text-[var(--text-primary)]">
            <Bank size={18} weight="regular" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium text-[var(--text-primary)] truncate">
              {manualBalance ? 'Saldo på kontot' : 'Stämmer beloppet?'}
            </span>
            <span className="block text-[12px] text-[var(--text-secondary)] truncate mt-0.5">
              {manualBalance
                ? `Uppdaterat ${formatBalanceUpdatedAt(manualBalance.at)}`
                : 'Skriv in ditt saldo så räknar Dejz exakt'}
            </span>
          </span>
          {manualBalance && (
            <span className="font-display font-semibold text-[15px] tabular-nums text-[var(--text-primary)] shrink-0">
              {formatKr(manualBalance.amount)}
            </span>
          )}
          <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
        </button>
      )}

      {/* ============================================================== */}
      {/* MODUL 2: TOTALT SALDO · BANKKONTON                             */}
      {/* Visas bara när det finns kopplade/inlagda konton – annars blir */}
      {/* det ett förvirrande "0 kr"-kort för användare utan bank.       */}
      {/* ============================================================== */}
      {accounts.length > 0 && (
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={() => {
            const next = !showAccounts;
            setShowAccounts(next);
            setShowAccountsOnHome(next);
          }}
          className="w-full flex items-center justify-between gap-3 text-left cursor-pointer group focus:outline-none"
          aria-expanded={showAccounts}
          title={showAccounts ? 'Dölj konton' : 'Visa konton'}
        >
          <div className="min-w-0">
            <span className="text-[12px] text-[var(--text-secondary)] font-normal block">
              Totalt saldo
            </span>
            {isInitialLoading && accounts.length === 0 ? (
              <div className="h-7 w-32 rounded-lg bg-[var(--surface-raised)] animate-pulse mt-1" />
            ) : (
              <div className="font-display text-[20px] sm:text-[20px] font-semibold tracking-[-0.015em] leading-tight text-[var(--text-primary)] tabular-nums mt-0.5">
                {formatKr(totalBalance)}
              </div>
            )}
          </div>

          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:bg-[var(--bg-color)] transition-all shrink-0">
            <CaretDown
              size={14}
              weight="regular"
              className={`transition-transform duration-200 ${
                showAccounts ? 'rotate-180' : ''
              }`}
            />
          </span>
        </button>

        {/* Mjukt utfällbar lista med dina bankkonton */}
        <div
          className={`grid transition-all duration-200 ease-out ${
            showAccounts ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="pt-2.5 border-t border-[var(--border-subtle)]">
              {accounts.length > 0 ? (
                <div className="divide-y divide-[var(--border-subtle)]">
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
                        onClick={() => {
                          setSelectedAccountModalId(acc.id);
                          setAccountNameDraft(acc.name);
                          setIsEditingAccountName(false);
                          setCopiedAccountNumber(false);
                        }}
                        title={`Visa kontodetaljer för ${acc.name}`}
                        className="w-full py-2.5 first:pt-1 last:pb-0.5 flex items-center justify-between gap-2.5 text-left text-xs sm:text-[13px] hover:bg-[var(--surface-hover)] rounded-xl px-1 -mx-1 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <ItemLogo
                            name={acc.bankName || acc.name}
                            category="Bank"
                            logoUrl={acc.logo}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-normal text-[13px] sm:text-[14px] tracking-[-0.005em] leading-snug text-[var(--text-primary)] block truncate">
                              {acc.name}
                            </span>
                            {(acc.bankName ||
                              (hasDuplicateName && last4) ||
                              acc.excludeFromTotalBalance) && (
                              <span className="text-[12px] font-normal text-[var(--text-secondary)] block truncate mt-0.5">
                                {acc.bankName}
                                {hasDuplicateName && last4 ? ` · •••• ${last4}` : ''}
                                {acc.excludeFromTotalBalance ? ' · Ej i totalt' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`font-display font-semibold text-[14px] tracking-[-0.01em] tabular-nums ${
                              acc.excludeFromTotalBalance
                                ? 'text-[var(--text-secondary)]'
                                : 'text-[var(--text-primary)]'
                            }`}
                          >
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
                <div className="space-y-2.5 animate-pulse pt-1">
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
                <div className="pt-1 flex items-center justify-between gap-3">
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
        </div>
      </section>
      )}

      {/* ============================================================== */}
      {/* MODUL 2.5: SPARMÅL · BUFFERT & DRÖMMAR                         */}
      {/* ============================================================== */}
      {onNavigateToGoals && (
        <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={() => {
              const next = !showGoals;
              setShowGoals(next);
              try {
                localStorage.setItem('dejz_show_goals_home', String(next));
              } catch {
                // ignore
              }
            }}
            className="w-full flex items-center justify-between gap-3 text-left cursor-pointer group focus:outline-none"
            aria-expanded={showGoals}
            title={showGoals ? 'Dölj sparmål' : 'Visa sparmål'}
          >
            <div className="min-w-0">
              <span className="text-[12px] text-[var(--text-secondary)] font-normal block">
                Sparmål
              </span>
              <div className="font-display text-[20px] sm:text-[20px] font-semibold tracking-[-0.015em] leading-tight text-[var(--text-primary)] tabular-nums mt-0.5">
                {formatKr(totalSavedInGoals)}
              </div>
            </div>

            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:bg-[var(--bg-color)] transition-all shrink-0">
              <CaretDown
                size={14}
                weight="regular"
                className={`transition-transform duration-200 ${
                  showGoals ? 'rotate-180' : ''
                }`}
              />
            </span>
          </button>

          <div
            className={`grid transition-all duration-200 ease-out ${
              showGoals ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="pt-2.5 border-t border-[var(--border-subtle)]">
                {savingsGoals.length > 0 ? (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {savingsGoals.map((goal) => {
                      const effectiveGoalAmt = resolveHomeGoalAmount(goal);
                      const pct =
                        goal.targetAmount > 0
                          ? Math.min(100, Math.round((effectiveGoalAmt / goal.targetAmount) * 100))
                          : 0;
                      const theme = getGoalArtworkTheme(goal.artworkId);

                      return (
                        <button
                          key={goal.id}
                          type="button"
                          onClick={onNavigateToGoals}
                          className="w-full py-2.5 first:pt-1 last:pb-0.5 flex items-center gap-3 text-left hover:bg-[var(--surface-hover)] rounded-xl px-1 -mx-1 transition-colors cursor-pointer group"
                        >
                          <div
                            className="w-9 h-9 rounded-full overflow-hidden relative shrink-0 border border-black/5 dark:border-white/10"
                            style={{
                              backgroundColor: goal.customImageUrl ? undefined : theme.tileBg,
                            }}
                          >
                            {goal.customImageUrl ? (
                              <img
                                src={goal.customImageUrl}
                                alt={goal.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute -right-2 top-0.5 w-9 h-9">
                                <GoalArtworkIllustration artworkId={goal.artworkId} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-normal text-[13px] sm:text-[14px] tracking-[-0.005em] leading-snug text-[var(--text-primary)] truncate">
                                {goal.name}
                              </span>
                              <span className="font-display font-semibold text-[14px] tracking-[-0.01em] text-[var(--text-primary)] tabular-nums shrink-0">
                                {formatKr(effectiveGoalAmt)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-color)] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: theme.progressColor,
                                  }}
                                />
                              </div>
                              <span className="text-[11px] font-medium text-[var(--text-secondary)] tabular-nums shrink-0">
                                {pct} %
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onNavigateToGoals}
                    className="w-full pt-1 flex items-center justify-between gap-3 text-left hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-normal text-[13px] sm:text-[14px] text-[var(--text-primary)] leading-snug block">
                        Spara till en resa, buffert eller dröm
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                        <span>Skapa ditt första sparmål</span>
                        <CaretRight size={11} />
                      </span>
                    </div>
                    <TiltedGoalsPromoArtwork />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
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
                  className={`text-[11px] leading-none ${
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
                  className={`font-display text-[14px] tabular-nums leading-none mt-1.5 no-privacy-blur ${
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
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer active:scale-95"
                  >
                    <ArrowCounterClockwise size={11} weight="bold" />
                    <span>Idag</span>
                  </button>
                )}
              </div>
              {selectedDayItems.length > 0 && (
                <span className="tabular-nums font-medium text-[var(--text-secondary)]">
                  {selectedDayNet > 0 ? '+' : selectedDayNet < 0 ? '-' : ''}
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
        surfaceClass="bg-[var(--bg-color)]"
        title={
          activeHeroPopup === 'income'
            ? 'Inkomst'
            : activeHeroPopup === 'fixed'
            ? 'Fasta utgifter'
            : 'Rörliga utgifter'
        }
      >
        <div>
          {activeHeroPopup === 'income' &&
            (() => {
              const extraIncomeTxs = deduplicateTransactions(transactions || []).filter(
                (tx) =>
                  !tx.isExcluded &&
                  tx.type === 'income' &&
                  !(typeof tx.id === 'string' && tx.id.startsWith('inc-')) &&
                  isDateInPeriod(tx.date, period) &&
                  !periodRecurringMatches.claimedIncomeTxIds.has(tx.id) &&
                  tx.category !== 'Återbetalning' &&
                  tx.category !== 'Swish' &&
                  !/swish/i.test(tx.title || '')
              );

              if (incomes.length === 0 && extraIncomeTxs.length === 0) {
                return (
                  <div className="ui-list-card py-10 text-center text-[13px] text-[var(--text-secondary)]">
                    Inga inkomster
                  </div>
                );
              }

              return (
                <div className="ui-list-card">
                  {incomes.map((inc) => {
                    const catLabel = inc.category || 'Lön';
                    const matchedTx =
                      periodRecurringMatches.matchedIncomeTxByIncId.get(inc.id);
                    const effectiveAmt = matchedTx
                      ? Math.round(Math.abs(Number(matchedTx.amount) || 0))
                      : Math.round(Number(inc.amount) || 0);
                    const hasVariableDiff =
                      Boolean(matchedTx) &&
                      effectiveAmt !== Math.round(Number(inc.amount) || 0);

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
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <ItemLogo
                            name={inc.name}
                            category={catLabel}
                            logoUrl={inc.logo}
                            size="md"
                            isRecurring={false}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="ui-row-title">{inc.name}</span>
                            <span className="ui-row-subtitle flex items-center gap-1">
                              <CategoryIcon
                                category={catLabel}
                                size={11}
                                className="shrink-0 text-[var(--text-secondary)]"
                              />
                              <span className="truncate">{catLabel}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="ui-row-amount-income">
                            +{formatKr(effectiveAmt)}
                          </span>
                          <span className="ui-row-meta flex items-center justify-end gap-1">
                            <span>
                              {hasVariableDiff
                                ? `Riktvärde ${formatKr(inc.amount)}`
                                : `Den ${inc.payday || 25}:e`}
                            </span>
                            {matchedTx && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                · Utbetald
                              </span>
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {extraIncomeTxs.map((tx) => {
                    const catLabel = tx.category || 'Övrig inkomst';
                    const isPending =
                      tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD';
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
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <ItemLogo
                            name={tx.title}
                            category={catLabel}
                            logoUrl={tx.logo}
                            size="md"
                            isRecurring={false}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="ui-row-title">{tx.title}</span>
                            <span className="ui-row-subtitle flex items-center gap-1">
                              <CategoryIcon
                                category={catLabel}
                                size={11}
                                className="shrink-0 text-[var(--text-secondary)]"
                              />
                              <span className="truncate">{catLabel}</span>
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="ui-row-amount-income">
                            +{formatKr(tx.amount)}
                          </span>
                          <span className="ui-row-meta">
                            {isPending
                              ? 'Reserverat'
                              : formatSwedishDateHeading(tx.date)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

          {activeHeroPopup === 'fixed' &&
            (fixedExpenses.length > 0 ? (
              <div className="ui-list-card">
                {fixedExpenses.map((exp) => {
                  const catLabel = exp.category || 'Räkningar';
                  const matchedTx =
                    periodRecurringMatches.matchedFixedTxByExpId.get(exp.id);
                  const isPartnerConnected = hasConnectedHouseholdPartner();
                  const shareRatio =
                    isPartnerConnected &&
                    exp.isShared &&
                    exp.fullAmount &&
                    exp.fullAmount > 0 &&
                    exp.amount > 0
                      ? exp.amount / exp.fullAmount
                      : 1;
                  const effectiveAmt = matchedTx
                    ? Math.round(Math.abs(Number(matchedTx.amount) || 0) * shareRatio)
                    : Math.round(Number(exp.amount) || 0);
                  const hasVariableDiff =
                    Boolean(matchedTx) &&
                    effectiveAmt !== Math.round(Number(exp.amount) || 0);

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
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <ItemLogo
                          name={exp.name}
                          category={catLabel}
                          logoUrl={exp.logo}
                          size="md"
                          isRecurring={true}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="ui-row-title truncate block">
                            {exp.name}
                          </span>
                          <span className="ui-row-subtitle flex items-center gap-1">
                            <CategoryIcon
                              category={catLabel}
                              size={11}
                              className="shrink-0 text-[var(--text-secondary)]"
                            />
                            <span className="truncate">
                              {catLabel}
                              {isPartnerConnected && exp.isShared
                                ? exp.fullAmount && exp.fullAmount > exp.amount
                                  ? ` · Delad (Totalt ${formatKr(exp.fullAmount)})`
                                  : ' · Delad'
                                : ''}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="ui-row-amount">
                          -{formatKr(effectiveAmt)}
                        </span>
                        <span className="ui-row-meta flex items-center justify-end gap-1">
                          <span>
                            {hasVariableDiff
                              ? `Riktvärde ${formatKr(exp.amount)}`
                              : `Den ${exp.dueDay || 28}:e`}
                          </span>
                          {matchedTx && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              · Betald
                            </span>
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="ui-list-card py-10 text-center text-[13px] text-[var(--text-secondary)]">
                Inga fasta utgifter
              </div>
            ))}

          {activeHeroPopup === 'variable' &&
            (() => {
              if (variablePeriodTransactions.length === 0) {
                return (
                  <div className="ui-list-card py-10 text-center text-[13px] text-[var(--text-secondary)]">
                    Inga rörliga utgifter i perioden
                  </div>
                );
              }

              const groupsMap = new Map<string, TransactionItem[]>();
              for (const tx of variablePeriodTransactions) {
                const key = tx.date || todayStr;
                const list = groupsMap.get(key);
                if (list) {
                  list.push(tx);
                } else {
                  groupsMap.set(key, [tx]);
                }
              }

              const sortedDateKeys = Array.from(groupsMap.keys()).sort((a, b) =>
                b.localeCompare(a)
              );

              return (
                <div className="space-y-4">
                  {sortedDateKeys.map((dateKey) => {
                    const items = groupsMap.get(dateKey) || [];
                    const dayNet = items.reduce((acc, item) => {
                      const amt = Number(item.amount) || 0;
                      return item.type === 'income' ? acc + amt : acc - amt;
                    }, 0);

                    return (
                      <div key={dateKey}>
                        <div className="ui-date-header">
                          <span className="font-medium text-[var(--text-secondary)]">
                            {formatSwedishDateHeading(dateKey)}
                          </span>
                          <span
                            className={`font-display font-medium tabular-nums ${
                              dayNet > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            {dayNet > 0
                              ? `+${formatKr(dayNet)}`
                              : dayNet < 0
                              ? `-${formatKr(Math.abs(dayNet))}`
                              : formatKr(0)}
                          </span>
                        </div>

                        <section className="ui-list-card">
                          {items.map((tx) => {
                            const isRefund = tx.type === 'income';
                            const isPending =
                              tx.bookingStatus === 'PDNG' ||
                              tx.bookingStatus === 'HOLD';
                            const isSplit =
                              hasConnectedHouseholdPartner() &&
                              tx.originalAmount !== undefined &&
                              tx.originalAmount > tx.amount;
                            const hasReceipts = Boolean(
                              (Array.isArray(tx.receipts) &&
                                tx.receipts.length > 0) ||
                                tx.receiptUrl
                            );
                            const statusSub = isPending
                              ? 'Reserverat'
                              : getTransactionTime(tx);

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
                                    <span className="ui-row-title">
                                      {tx.title}
                                    </span>
                                    <span className="ui-row-subtitle">
                                      <CategoryIcon
                                        category={tx.category}
                                        size={11}
                                        className="shrink-0"
                                      />
                                      <span className="truncate">
                                        {tx.category}
                                      </span>
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
                                    className={
                                      isRefund
                                        ? 'ui-row-amount-income'
                                        : 'ui-row-amount'
                                    }
                                  >
                                    {isRefund
                                      ? `+${formatKr(tx.amount)}`
                                      : `-${formatKr(tx.amount)}`}
                                  </span>
                                  {statusSub ? (
                                    <span className="ui-row-meta">
                                      {statusSub}
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            );
                          })}
                        </section>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
        </div>
      </BottomSheet>

      {/* ============================================================== */}
      {/* KONTOKORT-MODAL (BOTTOM SHEET VID KLICK PÅ KONTO)              */}
      {/* ============================================================== */}
      <BottomSheet
        isOpen={Boolean(activeModalAccount)}
        onClose={() => {
          setSelectedAccountModalId(null);
          setIsEditingAccountName(false);
        }}
        title={activeModalAccount?.bankName || 'Konto'}
      >
        {activeModalAccount && (
          <div className="space-y-4">
            {/* Konto-huvud med logotyp, redigerbart namn och stort saldo */}
            <div className="flex flex-col items-center text-center pt-1 pb-2">
              <ItemLogo
                name={activeModalAccount.bankName || activeModalAccount.name}
                category="Bank"
                logoUrl={activeModalAccount.logo}
                size="lg"
              />

              {isEditingAccountName ? (
                <div className="mt-3 w-full max-w-[260px] flex items-center gap-1.5">
                  <input
                    type="text"
                    value={accountNameDraft}
                    onChange={(e) => setAccountNameDraft(e.target.value)}
                    placeholder={activeModalAccount.originalName || activeModalAccount.name}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onUpdateAccountMeta?.(activeModalAccount.id, {
                          customName: accountNameDraft.trim(),
                        });
                        setIsEditingAccountName(false);
                      } else if (e.key === 'Escape') {
                        setIsEditingAccountName(false);
                      }
                    }}
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[14px] font-medium text-[var(--text-primary)] text-center focus:outline-none focus:border-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateAccountMeta?.(activeModalAccount.id, {
                        customName: accountNameDraft.trim(),
                      });
                      setIsEditingAccountName(false);
                    }}
                    className="w-8 h-8 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center shrink-0 cursor-pointer"
                    title="Spara namn"
                  >
                    <Check size={14} weight="bold" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingAccountName(false)}
                    className="w-8 h-8 rounded-xl bg-[var(--surface-raised)] text-[var(--text-secondary)] flex items-center justify-center shrink-0 cursor-pointer"
                    title="Avbryt"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAccountNameDraft(activeModalAccount.name);
                    setIsEditingAccountName(true);
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-[16px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] hover:opacity-80 transition-opacity cursor-pointer"
                  title="Byt namn på kontot"
                >
                  <span>{activeModalAccount.name}</span>
                  <PencilSimple size={13} className="text-[var(--text-muted)]" />
                </button>
              )}

              <div className="font-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.025em] text-[var(--text-primary)] tabular-nums mt-1 leading-tight">
                {formatKr(activeModalAccount.balance)}
              </div>
            </div>

            {/* Kontouppgifter & Inställningar */}
            <div className="rounded-2xl bg-[var(--surface-raised)]/60 border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] px-3.5">
              {activeModalAccount.accountNumber && (
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[12px] text-[var(--text-secondary)] block">
                      Kontonummer
                    </span>
                    <span className="text-[13px] font-medium text-[var(--text-primary)] tabular-nums">
                      {activeModalAccount.accountNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.clipboard && activeModalAccount.accountNumber) {
                        navigator.clipboard
                          .writeText(activeModalAccount.accountNumber)
                          .catch(() => {});
                        setCopiedAccountNumber(true);
                        setTimeout(() => setCopiedAccountNumber(false), 2000);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
                  >
                    {copiedAccountNumber ? (
                      <>
                        <Check size={12} weight="bold" className="text-emerald-500" />
                        <span>Kopierat</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Kopiera</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Räkna med i Totalt saldo */}
              <div className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[13px] font-normal text-[var(--text-primary)] block">
                    Räkna med i Totalt saldo
                  </span>
                  <span className="text-[12px] text-[var(--text-secondary)] block">
                    Inkludera kontots saldo på hemskärmen
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!activeModalAccount.excludeFromTotalBalance}
                  onClick={() => {
                    onUpdateAccountMeta?.(activeModalAccount.id, {
                      excludeFromTotalBalance: !activeModalAccount.excludeFromTotalBalance,
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    !activeModalAccount.excludeFromTotalBalance
                      ? 'bg-[var(--text-primary)]'
                      : 'bg-[var(--border-subtle)]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--bg-color)] shadow transition duration-200 ease-in-out ${
                      !activeModalAccount.excludeFromTotalBalance
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Senaste händelser på kontot */}
            <div>
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Senaste händelser ({activeAccountTransactions.length})
                </span>
                {activeAccountTransactions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = activeModalAccount.id;
                      setSelectedAccountModalId(null);
                      onSelectAccount?.(targetId);
                    }}
                    className="text-[12px] font-medium text-[var(--text-primary)] hover:opacity-75 transition-opacity cursor-pointer"
                  >
                    Visa alla
                  </button>
                )}
              </div>

              {activeAccountTransactions.length > 0 ? (
                <div className="rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--border-subtle)] px-3 divide-y divide-[var(--border-subtle)]">
                  {activeAccountTransactions.slice(0, 6).map((tx) => {
                    const isIncome = tx.type === 'income';
                    const isPending =
                      tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD';
                    const recurring = checkIsRecurringTransaction(
                      tx,
                      fixedExpenses,
                      incomes
                    );
                    return (
                      <button
                        key={`acc-tx-${tx.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedAccountModalId(null);
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
                            isRecurring={recurring.isRecurring}
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
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={
                              isIncome ? 'ui-row-amount-income' : 'ui-row-amount'
                            }
                          >
                            {isIncome
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
                  })}
                </div>
              ) : (
                <div className="rounded-2xl bg-[var(--surface-raised)]/40 border border-[var(--border-subtle)] py-6 text-center text-[13px] text-[var(--text-secondary)]">
                  Inga bokförda händelser på detta konto än
                </div>
              )}
            </div>

            {activeAccountTransactions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const targetId = activeModalAccount.id;
                  setSelectedAccountModalId(null);
                  onSelectAccount?.(targetId);
                }}
                className="w-full py-3 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] text-[14px] font-semibold tracking-[-0.01em] hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
              >
                Visa alla transaktioner ({activeAccountTransactions.length})
              </button>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ============================================================== */}
      {/* SEDAN SIST-ÖVERBLICK (NYA KÖP SEDAN FÖRRA BESÖKET)             */}
      {/* ============================================================== */}
      <BottomSheet
        isOpen={isSinceLastOpen && sinceLastVisitTxs.length > 0}
        onClose={dismissSinceLastVisit}
        title="Sedan sist"
      >
        <div className="space-y-4">
          <div className="flex items-baseline justify-between px-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {sinceLastVisitTxs.length} {sinceLastVisitTxs.length === 1 ? 'köp' : 'köp'}
            </span>
            <span className="font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] text-[var(--text-primary)] tabular-nums">
              -{formatKr(sinceLastVisitTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0))}
            </span>
          </div>

          <div className="ui-sheet-group">
            {sinceLastVisitTxs.map((tx) => (
              <button
                key={`since-last-${tx.id}`}
                type="button"
                onClick={() => {
                  dismissSinceLastVisit();
                  onSelectTransaction(tx);
                }}
                className="ui-tx-row px-4"
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
                    <span className="ui-row-title truncate block">{tx.title}</span>
                    <span className="ui-row-subtitle flex items-center gap-1">
                      <CategoryIcon category={tx.category} size={11} className="shrink-0" />
                      <span className="truncate">{tx.category}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="ui-row-amount">-{formatKr(tx.amount)}</span>
                  <span className="ui-row-meta">{formatSwedishDateHeading(tx.date)}</span>
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={dismissSinceLastVisit}
            className="w-full ui-btn-primary"
          >
            <span>OK</span>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};

