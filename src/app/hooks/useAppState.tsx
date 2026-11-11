import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { WeekendHandlingMode } from '../../utils/periodEngine';
import { AppTab } from '../../components/BottomNav';
import { IncomeItem, FixedExpenseItem, TransactionItem } from '../../components/HomeTab';
import type { SettingsSubView } from '../../components/settings/subviews';
import { BankConnection, BankAccount } from '../../services/bankService';
import {
  loadCachedAppState,
  hasCachedBankData,
  getExcludeInternalTransfers,
  setExcludeInternalTransfers,
  getMerchantAliases,
} from '../../utils/appCache';
import { FeedbackToastState } from '../components/AppToasts';
import { useAiMerchantCleaning } from './useAiMerchantCleaning';
import { sanitizeTransactionItem } from '../transactionMapping';

/**
 * Appens tillstånd: inloggad användare, listorna (inkomster, fasta utgifter, köp), bankdata,
 * inställningar och vilka fönster som är öppna. Flyttad från App.tsx.
 */
export function useAppState() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [selectedHistoryAccountId, setSelectedHistoryAccountId] = useState<string | null>(null);
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>('main');
  const [autoOpenGoalWizard, setAutoOpenGoalWizard] = useState(false);
  const [undoToast, setUndoToast] = useState<{
    id: string;
    excluded: boolean;
    title: string;
  } | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  const [feedbackToast, setFeedbackToast] = useState<FeedbackToastState | null>(null);

  // "Glömt lösenord": personen kom in via länken i mejlet och ska välja ett nytt lösenord
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('dejz_password_recovery') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const onRecovery = () => setIsPasswordRecovery(true);
    window.addEventListener('dejz-password-recovery', onRecovery);
    return () => window.removeEventListener('dejz-password-recovery', onRecovery);
  }, []);
  const endPasswordRecovery = () => {
    try {
      sessionStorage.removeItem('dejz_password_recovery');
    } catch {
      // ignore
    }
    setIsPasswordRecovery(false);
  };
  const feedbackTimerRef = useRef<number | null>(null);

  const showFeedbackToast = useCallback((toast: FeedbackToastState, durationMs = 5500) => {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    setFeedbackToast(toast);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackToast((current) => (current?.id === toast.id ? null : current));
    }, durationMs);
  }, []);

  const [previewReceipt, setPreviewReceipt] = useState<{
    url: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [activeTab, settingsSubView, selectedHistoryAccountId]);

  const initialCache = useMemo(() => loadCachedAppState(), []);

  // Lönedagsinställning (standard 25:e)
  const [targetPayday, setTargetPayday] = useState<number>(
    () => initialCache?.targetPayday || 25
  );

  // Helghantering (standard 'before' = fredagen före helg)
  const [weekendHandling, setWeekendHandling] = useState<WeekendHandlingMode>(
    () => (initialCache?.weekendHandling as WeekendHandlingMode) || 'before'
  );

  // Enable Banking connections & accounts
  const [connections, setConnections] = useState<BankConnection[]>(
    () => initialCache?.connections || []
  );
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(
    () => initialCache?.bankAccounts || []
  );
  const [syncingBank, setSyncingBank] = useState(false);
  const [callbackStatusMsg, setCallbackStatusMsg] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get('code') && params.get('state')) {
      return 'Slutför bankkoppling och hämtar dina konton...';
    }
    return null;
  });
  const pendingBankCallbackRef = useRef<{
    code: string;
    state: string;
    promise: Promise<void> | null;
    done: boolean;
  } | null>(
    (() => {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      if (code && state) {
        return { code, state, promise: null, done: false };
      }
      return null;
    })()
  );

  // Inställning för att dölja och exkludera interna överföringar från "Kvar att spendera"
  const [excludeInternalTransfers, setExcludeInternalTransfersState] = useState<boolean>(() =>
    getExcludeInternalTransfers()
  );

  const handleToggleExcludeInternalTransfers = useCallback((val: boolean) => {
    setExcludeInternalTransfersState(val);
    setExcludeInternalTransfers(val);
  }, []);

  // Initial loading guard: only true if there is completely no cached banking data
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(
    () => !hasCachedBankData()
  );

  // Refs för tyst automatisk bakgrundssynk & atomär hydrering
  const syncInFlightRef = useRef(false);
  const lastSyncTimestampRef = useRef<number>(0);
  const hydrationInFlightRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef<Promise<{
    connections: BankConnection[];
    accounts: BankAccount[];
  }> | null>(null);
  const pendingRefreshRef = useRef(false);

  // Riktiga inkomster
  const [incomes, setIncomes] = useState<IncomeItem[]>(
    () => initialCache?.incomes || []
  );

  // Riktiga fasta utgifter
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseItem[]>(
    () => initialCache?.fixedExpenses || []
  );

  // Riktiga köp (tvättas direkt vid laddning så att ev. gamla felaktiga alias återställs till bankens namn)
  const [transactions, setTransactions] = useState<TransactionItem[]>(() => {
    const rawList = initialCache?.transactions || [];
    const initFixed = initialCache?.fixedExpenses || [];
    const initInc = initialCache?.incomes || [];
    const initAliases = getMerchantAliases();
    return rawList.map((tx) => sanitizeTransactionItem(tx, initFixed, initInc, initAliases));
  });

  // Refs till senaste listorna så att asynkrona synkar aldrig läser utdaterade closures
  const incomesRef = useRef<IncomeItem[]>(incomes);
  useEffect(() => {
    incomesRef.current = incomes;
  }, [incomes]);

  const fixedExpensesRef = useRef<FixedExpenseItem[]>(fixedExpenses);
  useEffect(() => {
    fixedExpensesRef.current = fixedExpenses;
  }, [fixedExpenses]);

  const transactionsRef = useRef<TransactionItem[]>(transactions);
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // Inloggad användare i Supabase
  const [userId, setUserId] = useState<string | null>(
    () => initialCache?.userId || null
  );
  const [userEmail, setUserEmail] = useState<string | null>(
    () => initialCache?.userEmail || null
  );
  const [userName, setUserName] = useState<string | null>(() => {
    try {
      return localStorage.getItem('dejz_user_name') || null;
    } catch {
      return null;
    }
  });
  const [userAvatar, setUserAvatar] = useState<string | null>(
    () => initialCache?.userAvatar || null
  );
  // Landningssida & Onboarding
  const [isOnboardingActive, setIsOnboardingActive] = useState<boolean>(() => {
    try {
      if (localStorage.getItem('dejz_onboarding_v2_done') === 'true') {
        return false;
      }
      if (localStorage.getItem('dejz_onboarding_in_progress') === 'true') {
        return true;
      }
      if (initialCache?.userId && localStorage.getItem('dejz_onboarding_v2_done') !== 'true') {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  const [showLanding, setShowLanding] = useState<boolean>(() => {
    try {
      if (localStorage.getItem('dejz_logged_out') === 'true') {
        return true;
      }
      if (localStorage.getItem('dejz_onboarding_in_progress') === 'true') {
        return false;
      }
      if (localStorage.getItem('dejz_onboarding_v2_done') === 'true') {
        return false;
      }
      if (initialCache?.userId) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  });

  // Styr när DEJZ-splashskärmen tonas ut mjukt när appen har laddat klart
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const splashEl = document.getElementById('dejz-splash');
    if (!splashEl) return;

    const hideSplash = () => {
      splashEl.classList.add('dejz-splash-hide');
      window.setTimeout(() => {
        if (splashEl) {
          splashEl.style.display = 'none';
        }
      }, 450);
    };

    if (!isInitialLoading || showLanding || isOnboardingActive) {
      const minDisplayTimer = window.setTimeout(hideSplash, 550);
      return () => window.clearTimeout(minDisplayTimer);
    }

    // Säkerhetstimer så att splashen aldrig fastnar om nätverket är långsamt
    const fallbackTimer = window.setTimeout(hideSplash, 1200);
    return () => window.clearTimeout(fallbackTimer);
  }, [isInitialLoading, showLanding, isOnboardingActive]);

  const userIdRef = useRef<string | null>(userId);
  const isDeletingAccountRef = useRef<boolean>(false);

  // Tyst AI-tvätt av kryptiska butiksnamn i bakgrunden (se app/hooks/useAiMerchantCleaning.ts)
  const aiCleanedKeysRef = useAiMerchantCleaning({
    transactions,
    setTransactions,
    incomesRef,
    fixedExpensesRef,
    userIdRef,
    isDeletingAccountRef,
  });
  const lastHydratedUserIdRef = useRef<string | null>(initialCache?.userId || null);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Modaltillstånd
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [preselectedBankName, setPreselectedBankName] = useState<string | null>(null);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<IncomeItem | null>(null);
  const [isFixedModalOpen, setIsFixedModalOpen] = useState(false);
  const [selectedFixedExpense, setSelectedFixedExpense] = useState<FixedExpenseItem | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  // Förifyllt nytt köp från röstknappen ("Ica 143 kronor")
  const [txPrefill, setTxPrefill] = useState<{ title: string; amount?: number } | null>(null);
  // Plusknappens ruta: prata in eller fyll i manuellt
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isBalanceSheetOpen, setIsBalanceSheetOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  // Borttagna genererade inkomst-ID:n
  const [dismissedTxIds, setDismissedTxIds] = useState<string[]>([]);

  return {
    connections,
    fixedExpensesRef,
    hydrationInFlightRef,
    incomesRef,
    isDeletingAccountRef,
    lastHydratedUserIdRef,
    lastSyncTimestampRef,
    pendingBankCallbackRef,
    pendingRefreshRef,
    refreshInFlightRef,
    setBankAccounts,
    setCallbackStatusMsg,
    setConnections,
    setExcludeInternalTransfersState,
    setFixedExpenses,
    setIncomes,
    setIsBankModalOpen,
    setIsInitialLoading,
    setIsOnboardingActive,
    setShowLanding,
    setTargetPayday,
    setTransactions,
    setUserAvatar,
    setUserEmail,
    setUserId,
    setUserName,
    setWeekendHandling,
    syncInFlightRef,
    targetPayday,
    transactions,
    transactionsRef,
    userAvatar,
    userId,
    userIdRef,
    weekendHandling,
    bankAccounts,
    excludeInternalTransfers,
    userEmail,
    userName,
    fixedExpenses,
    incomes,
    dismissedTxIds,
    activeTab,
    settingsSubView,
    isInitialLoading,
    setSyncingBank,
    setIsTxModalOpen,
    setSelectedTransaction,
    showFeedbackToast,
    setActiveTab,
    setSelectedFixedExpense,
    setDismissedTxIds,
    undoTimerRef,
    setUndoToast,
    setSettingsSubView,
    aiCleanedKeysRef,
    showLanding,
    isOnboardingActive,
    callbackStatusMsg,
    setPreselectedBankName,
    isBankModalOpen,
    preselectedBankName,
    setIsAuthModalOpen,
    isPasswordRecovery,
    endPasswordRecovery,
    selectedHistoryAccountId,
    setIsSearchModalOpen,
    setIsNotificationsModalOpen,
    isSearchModalOpen,
    setIsFixedModalOpen,
    setSelectedIncome,
    setIsIncomeModalOpen,
    isNotificationsModalOpen,
    setIsBalanceSheetOpen,
    setSelectedHistoryAccountId,
    autoOpenGoalWizard,
    setAutoOpenGoalWizard,
    setPreviewReceipt,
    syncingBank,
    handleToggleExcludeInternalTransfers,
    isBalanceSheetOpen,
    isAddSheetOpen,
    setIsAddSheetOpen,
    setTxPrefill,
    isIncomeModalOpen,
    selectedIncome,
    isFixedModalOpen,
    selectedFixedExpense,
    isTxModalOpen,
    selectedTransaction,
    txPrefill,
    isAuthModalOpen,
    undoToast,
    feedbackToast,
    feedbackTimerRef,
    setFeedbackToast,
    previewReceipt,
  };
}
