import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { WeekendHandlingMode } from './utils/periodEngine';
import { Navbar } from './components/Navbar';
import { BottomNav, AppTab } from './components/BottomNav';
import { AddEntrySheet, isVoiceEntrySupported } from './components/VoiceEntry';
import { BalanceSheet } from './components/BalanceSheet';
import {
  HomeTab,
  IncomeItem,
  FixedExpenseItem,
  TransactionItem,
  getTransactionTime,
} from './components/HomeTab';
import { FixedTab } from './components/FixedTab';
import { AnalysisTab } from './components/AnalysisTab';
import { TransactionsTab } from './components/TransactionsTab';
import { SettingsTab, SettingsSubView, SETTINGS_SUBVIEW_TITLES } from './components/SettingsTab';
import { SavingsGoalsView } from './components/SavingsGoalsView';
import { FriendsChatView } from './components/FriendsChatView';
import { LandingPage } from './components/LandingPage';
import { OnboardingFlow } from './components/OnboardingFlow';
import { isBankEnabledForEmail } from './utils/bankFeatureFlag';
import {
  PartnerSimulatorColumn,
  getSplitSimulatorActive,
  setSplitSimulatorActive,
} from './components/AdminSimulator';
import { ItemLogo } from './components/ItemLogo';
import { CategoryIcon } from './components/CategoryIcon';
import { Heart, Package, Paperclip, FileText, Eye } from '@phosphor-icons/react';
import { BankModal } from './components/modals/BankModal';
import { IncomeModal } from './components/modals/IncomeModal';
import { FixedExpenseModal } from './components/modals/FixedExpenseModal';
import { TransactionModal } from './components/modals/TransactionModal';
import { AuthModal } from './components/modals/AuthModal';
import { SetNewPasswordSheet } from './components/SetNewPasswordSheet';
import { FeedbackSheet } from './components/FeedbackSheet';
import { SearchModal } from './components/modals/SearchModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { PullToRefresh } from './components/ui/PullToRefresh';
import { EmptyClusterArtwork } from './components/ui/VisualArtwork';
import { supabase } from './supabaseClient';
import { getHouseholdState, subscribeToHouseholdRealtime } from './utils/householdSync';
import {
  connectFriendsChatWebSocket,
  getStoredFriends,
  getTotalUnreadChatCount,
  normalizeSocialUserKey,
} from './utils/friendsChatSync';
import { BankConnection, BankAccount } from './services/bankService';
import { formatSwedishDateHeading, getItemReceipts } from './utils/swedishDate';
import {
  loadCachedAppState,
  hasCachedBankData,
  getExcludeInternalTransfers,
  setExcludeInternalTransfers,
  getMerchantAliases,
  saveAccountMeta,
  syncAllUserPreferencesToSupabase,
  cancelPendingPreferenceSync,
  clearAllLocalAppData,
  setManualBalance,
  getSavingsGoals,
} from './utils/appCache';
import { checkIsRecurringTransaction } from './utils/recurring';
import { useBudgetTotals } from './app/hooks/useBudgetTotals';
import { useAccountData } from './app/hooks/useAccountData';
import { useAppActions } from './app/hooks/useAppActions';
import { useProfileSettings } from './app/hooks/useProfileSettings';
import { usePeriodData } from './app/hooks/usePeriodData';
import {
  FeedbackToast,
  FeedbackToastState,
  ReceiptPreviewSheet,
  UndoToast,
} from './app/components/AppToasts';
import { useAiMerchantCleaning } from './app/hooks/useAiMerchantCleaning';

import { sanitizeTransactionItem } from './app/transactionMapping';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [selectedHistoryAccountId, setSelectedHistoryAccountId] = useState<string | null>(null);
  const [settingsSubView, setSettingsSubView] = useState<SettingsSubView>('main');
  const [autoOpenGoalWizard, setAutoOpenGoalWizard] = useState(false);
  const [splitSimulatorActive, setSplitSimulatorActiveState] = useState<boolean>(() =>
    getSplitSimulatorActive()
  );
  const [mobileSimPane, setMobileSimPane] = useState<'mine' | 'partner'>('mine');

  useEffect(() => {
    const onSimChanged = () => {
      setSplitSimulatorActiveState(getSplitSimulatorActive());
    };
    window.addEventListener('dejz:split-simulator-changed', onSimChanged);
    window.addEventListener('dejz:simulator-toggled', onSimChanged);
    return () => {
      window.removeEventListener('dejz:split-simulator-changed', onSimChanged);
      window.removeEventListener('dejz:simulator-toggled', onSimChanged);
    };
  }, []);

  const handleToggleSplitSimulator = useCallback((active: boolean) => {
    setSplitSimulatorActive(active);
    setSplitSimulatorActiveState(active);
    if (!active) {
      setMobileSimPane('mine');
    }
  }, []);

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

  // Realtidssynk för Delad budget (Hushåll)
  useEffect(() => {
    const hh = getHouseholdState();
    if (!hh || !hh.householdId || !hh.inviteCode) return;
    const unsubscribe = subscribeToHouseholdRealtime(
      hh.householdId,
      hh.inviteCode,
      () => {
        setAccountMetaVersion((v) => v + 1);
      }
    );
    return unsubscribe;
  }, [activeTab, settingsSubView]);

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
  const [selectedChatFriendKey, setSelectedChatFriendKey] = useState<string | null>(null);
  const [socialTick, setSocialTick] = useState(0);

  // Realtids-WebSocket för Vänner & Chatt
  useEffect(() => {
    const onSocialUpdate = () => setSocialTick((t) => t + 1);
    window.addEventListener('dejz:social-updated', onSocialUpdate);
    const disconnectWs = connectFriendsChatWebSocket({
      userEmail,
      userName,
      userAvatar,
    });
    return () => {
      window.removeEventListener('dejz:social-updated', onSocialUpdate);
      disconnectWs();
    };
  }, [userEmail, userName, userAvatar]);

  const friendsUnreadCount = useMemo(() => {
    void socialTick;
    return getTotalUnreadChatCount(normalizeSocialUserKey(userEmail, userName));
  }, [userEmail, userName, socialTick]);

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

  // Inloggning, data från Supabase och bankkoppling (se app/hooks/useAccountData.ts)
  const { refreshBankStatus, loadSupabaseUserData, performSilentBankSync, hasActiveBankConnection } =
    useAccountData({
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
    });

  // Lönedag, helghantering, namn, e-post och profilbild (app/hooks/useProfileSettings.tsx)
  const {
    handleUpdateWeekendHandling,
    handleUpdateName,
    handleUpdatePayday,
    handleUpdateAvatar,
    handleUpdateEmail,
  } = useProfileSettings({
    setTargetPayday,
    userId,
    setWeekendHandling,
    setUserAvatar,
    setUserEmail,
    setUserName,
  });
  // Löneperioden: konton, period, periodens transaktioner och kopplingar (app/hooks/usePeriodData.tsx)
  const {
    setAccountMetaVersion,
    periodTransactions,
    periodRecurringMatches,
    period,
    internalTransferIds,
    selectedGoalIdInView,
    setSelectedGoalIdInView,
    displayTransactions,
    connectedBank,
    accounts,
    totalBalance,
  } = usePeriodData({
    connections,
    bankAccounts,
    targetPayday,
    weekendHandling,
    excludeInternalTransfers,
    transactions,
    userEmail,
    userName,
    fixedExpenses,
    incomes,
    hasActiveBankConnection,
    dismissedTxIds,
  });

  const {
    totalIncome,
    totalFixedExpenses,
    totalVariableSpent,
    activeManualBalance,
    kvarAttSpendera,
    dagsbudget,
  } = useBudgetTotals({
    incomes,
    fixedExpenses,
    transactions,
    periodTransactions,
    periodRecurringMatches,
    period,
    targetPayday,
    hasActiveBankConnection,
    excludeInternalTransfers,
    internalTransferIds,
    bankAccounts,
    userEmail,
    userName,
    isInitialLoading,
    userId,
  });
  // Alla åtgärder: lägga till/ändra/ta bort köp, fasta utgifter, inkomster, logga ut … (app/hooks/useAppActions.tsx)
  const {
    handleAddIncome,
    handleUpdateIncome,
    handleDeleteIncome,
    handleAddFixed,
    handleUpdateFixed,
    handleDeleteFixed,
    handleToggleHeart,
    handleTogglePackage,
    handleExcludeTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleDisconnectBank,
    handleSyncBank,
    handleSignOut,
    handleDeleteAccount,
    handleResetAccount,
    handleCategoryMutated,
    handleMarkAsFixed,
    handleAddTransaction,
    handleLinkTransactionToFixed,
  } = useAppActions({
    setSyncingBank,
    lastSyncTimestampRef,
    refreshBankStatus,
    connections,
    userId,
    incomesRef,
    setIncomes,
    userIdRef,
    transactionsRef,
    fixedExpensesRef,
    setTransactions,
    setFixedExpenses,
    setIsTxModalOpen,
    setSelectedTransaction,
    showFeedbackToast,
    setActiveTab,
    setSelectedFixedExpense,
    fixedExpenses,
    transactions,
    period,
    periodRecurringMatches,
    hasActiveBankConnection,
    setDismissedTxIds,
    undoTimerRef,
    setUndoToast,
    lastHydratedUserIdRef,
    setUserId,
    setUserEmail,
    setUserName,
    setUserAvatar,
    setConnections,
    setBankAccounts,
    setSettingsSubView,
    setShowLanding,
    setIsOnboardingActive,
    userEmail,
    isDeletingAccountRef,
    pendingRefreshRef,
    aiCleanedKeysRef,
    setTargetPayday,
    setWeekendHandling,
    setCallbackStatusMsg,
  });

  if (showLanding || (!userId && !isInitialLoading && !isOnboardingActive)) {
    return (
      <LandingPage
        existingEmail={userEmail}
        onContinueExisting={() => {
          try {
            localStorage.setItem('dejz_onboarding_v2_done', 'true');
            localStorage.setItem('dejz_onboarding_completed', 'true');
          } catch {
            // ignore
          }
          setShowLanding(false);
          setIsOnboardingActive(false);
        }}
        onAuthenticated={(email, mode) => {
          try {
            localStorage.removeItem('dejz_logged_out');
          } catch {
            // ignore
          }
          if (mode === 'register') {
            cancelPendingPreferenceSync();
            clearAllLocalAppData(true);
            try {
              localStorage.setItem('dejz_onboarding_in_progress', 'true');
              localStorage.setItem('dejz_onboarding_step', '1');
              localStorage.removeItem('dejz_onboarding_v2_done');
              localStorage.removeItem('dejz_onboarding_completed');
            } catch {
              // ignore
            }
            incomesRef.current = [];
            fixedExpensesRef.current = [];
            transactionsRef.current = [];
            setIncomes([]);
            setFixedExpenses([]);
            setTransactions([]);
            setConnections([]);
            setBankAccounts([]);
            setDismissedTxIds([]);
          }
          if (mode === 'register') {
            setIsOnboardingActive(true);
            setShowLanding(false);
            syncAllUserPreferencesToSupabase(true);
          } else {
            setIsInitialLoading(true);
            setShowLanding(false);
          }
          setUserEmail(email);
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              setUserId(session.user.id);
              userIdRef.current = session.user.id;
              loadSupabaseUserData(session.user.id);
            } else if (!userIdRef.current) {
              setUserId('preview-user');
              userIdRef.current = 'preview-user';
            }
          });
        }}
      />
    );
  }

  const shouldShowOnboarding =
    isOnboardingActive ||
    (() => {
      try {
        return (
          localStorage.getItem('dejz_onboarding_in_progress') === 'true' &&
          localStorage.getItem('dejz_onboarding_v2_done') !== 'true'
        );
      } catch {
        return false;
      }
    })();

  if (shouldShowOnboarding) {
    return (
      <>
        <OnboardingFlow
          bankEnabled={isBankEnabledForEmail(userEmail)}
          initialName={userName || ''}
          targetPayday={targetPayday}
          initialWeekendHandling={weekendHandling}
          onUpdateWeekendHandling={handleUpdateWeekendHandling}
          connections={connections}
          bankAccounts={bankAccounts}
          bankCallbackStatusMsg={callbackStatusMsg}
          onBankStateUpdated={(conns, accs) => {
            setConnections(conns);
            setBankAccounts(accs);
            refreshBankStatus();
          }}
          incomes={incomes}
          fixedExpenses={fixedExpenses}
          onSaveName={handleUpdateName}
          onUpdatePayday={handleUpdatePayday}
          onOpenBankModal={(bankName?: string) => {
            setPreselectedBankName(bankName || null);
            setIsBankModalOpen(true);
          }}
          onAddIncome={handleAddIncome}
          onUpdateIncome={handleUpdateIncome}
          onDeleteIncome={handleDeleteIncome}
          onAddFixed={handleAddFixed}
          onUpdateFixed={handleUpdateFixed}
          onDeleteFixed={handleDeleteFixed}
          onBackToLanding={() => {
            try {
              localStorage.removeItem('dejz_onboarding_in_progress');
              localStorage.removeItem('dejz_onboarding_step');
            } catch {
              // ignore
            }
            setIsOnboardingActive(false);
            setShowLanding(true);
          }}
          onComplete={() => {
            try {
              localStorage.setItem('dejz_onboarding_v2_done', 'true');
              localStorage.setItem('dejz_onboarding_completed', 'true');
              localStorage.removeItem('dejz_onboarding_in_progress');
              localStorage.removeItem('dejz_onboarding_step');
            } catch {
              // ignore
            }
            syncAllUserPreferencesToSupabase(true);
            setIsOnboardingActive(false);
            setShowLanding(false);
            setActiveTab('home');
          }}
        />
        <BankModal
          isOpen={isBankModalOpen}
          userEmail={userEmail}
          connections={connections}
          bankAccounts={bankAccounts}
          preselectedBankName={preselectedBankName}
          onClose={() => {
            setIsBankModalOpen(false);
            setPreselectedBankName(null);
          }}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onBankStateUpdated={(conns, accs) => {
            setConnections(conns);
            setBankAccounts(accs);
            refreshBankStatus();
          }}
        />
        <SetNewPasswordSheet
          open={isPasswordRecovery && Boolean(userId)}
          onDone={() => {
            endPasswordRecovery();
            showFeedbackToast({ id: 'password-updated', title: 'Lösenordet är bytt' });
          }}
          onSkip={endPasswordRecovery}
        />
      </>
    );
  }

  return (
    <div
      style={{ backgroundImage: 'var(--bg-gradient)' }}
      className={`min-h-screen bg-[var(--bg-color)] bg-no-repeat text-[var(--text-primary)] flex flex-col font-sans transition-colors selection:bg-[var(--text-primary)] selection:text-[var(--bg-color)] ${
        splitSimulatorActive ? 'min-[820px]:pr-[410px]' : ''
      }`}
    >
      {/* Top Switcher Bar when simulator is active on narrower screens (<820px) */}
      {splitSimulatorActive && (
        <div className="min-[820px]:hidden sticky top-0 z-[160] bg-[var(--surface-color)]/95 backdrop-blur-xl border-b border-[var(--border-subtle)] px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex-1 grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setMobileSimPane('mine')}
              className={`py-1.5 rounded-lg text-xs font-display font-semibold transition-colors cursor-pointer ${
                mobileSimPane === 'mine'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Min app
            </button>
            <button
              type="button"
              onClick={() => setMobileSimPane('partner')}
              className={`py-1.5 rounded-lg text-xs font-display font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mobileSimPane === 'partner'
                  ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Motpartens telefon</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleToggleSplitSimulator(false)}
            className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
          >
            Stäng
          </button>
        </div>
      )}

      <div
        className={`app-spatial-shell flex-1 flex flex-col min-h-screen ${
          splitSimulatorActive && mobileSimPane === 'partner' ? 'max-[819px]:hidden' : ''
        }`}
      >
      <Navbar
        userEmail={userEmail}
        userName={userName}
        userAvatar={userAvatar}
        navigationKey={`${activeTab}:${settingsSubView}:${selectedHistoryAccountId || ''}:${selectedGoalIdInView || ''}:${selectedChatFriendKey || ''}`}
        hasUnreadNotifications={false}
        friendsUnreadCount={friendsUnreadCount}
        hideActions={activeTab === 'settings'}
        hideSearch
        pageTitle={
          activeTab === 'settings'
            ? settingsSubView === 'main'
              ? 'Inställningar'
              : SETTINGS_SUBVIEW_TITLES[settingsSubView]
            : activeTab === 'goals'
            ? 'Sparmål'
            : activeTab === 'saved'
            ? 'Sparade köp'
            : activeTab === 'packages'
            ? 'Väntar på paket'
            : activeTab === 'receipts'
            ? 'Kvitton'
            : activeTab === 'friends'
            ? selectedChatFriendKey
              ? getStoredFriends().find((f) => f.key === selectedChatFriendKey)?.name ||
                'Chatt'
              : 'Vänner & chatt'
            : null
        }
        onBack={() => {
          if (activeTab === 'friends' && selectedChatFriendKey) {
            setSelectedChatFriendKey(null);
            return;
          }
          if (
            selectedGoalIdInView &&
            (activeTab === 'goals' || (activeTab === 'settings' && settingsSubView === 'goals'))
          ) {
            setSelectedGoalIdInView(null);
            return;
          }
          if (
            activeTab === 'settings' &&
            (settingsSubView === 'privacy' ||
              settingsSubView === 'terms' ||
              settingsSubView === 'psd2' ||
              settingsSubView === 'cookies')
          ) {
            setSettingsSubView('legal');
            return;
          }
          if (activeTab === 'settings' && settingsSubView !== 'main') {
            setSettingsSubView('main');
          } else if (
            activeTab === 'goals' ||
            activeTab === 'receipts' ||
            activeTab === 'packages' ||
            activeTab === 'saved'
          ) {
            // Sparmål, kvitton och paket öppnas från profilen – tillbaka dit
            setSettingsSubView('main');
            setActiveTab('settings');
          } else {
            setActiveTab('home');
          }
        }}
        onLogoClick={() => {
          setIsSearchModalOpen(false);
          setIsNotificationsModalOpen(false);
          setSelectedGoalIdInView(null);
          setSettingsSubView('main');
          setActiveTab('home');
        }}
        onProfileClick={() => {
          setIsSearchModalOpen(false);
          setIsNotificationsModalOpen(false);
          setSelectedGoalIdInView(null);
          setSettingsSubView('main');
          setActiveTab('settings');
        }}
        onSearchClick={() => {
          setIsNotificationsModalOpen(false);
          setIsSearchModalOpen(true);
        }}
        onNotificationsClick={() => {
          setIsSearchModalOpen(false);
          setIsNotificationsModalOpen(true);
        }}
      />

      {callbackStatusMsg && (
        <div className="max-w-md mx-auto w-full px-4 pt-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center">
            {callbackStatusMsg}
          </div>
        </div>
      )}

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        transactions={displayTransactions}
        fixedExpenses={fixedExpenses}
        incomes={incomes}
        period={period}
        onSelectTransaction={(tx) => {
          setSelectedTransaction(tx);
          setIsTxModalOpen(true);
        }}
        onSelectFixed={(exp) => {
          setSelectedFixedExpense(exp);
          setIsFixedModalOpen(true);
        }}
        onSelectIncome={(inc) => {
          setSelectedIncome(inc);
          setIsIncomeModalOpen(true);
        }}
      />

      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        period={period}
        kvarAttSpendera={kvarAttSpendera}
        dagsbudget={dagsbudget}
        fixedExpenses={fixedExpenses}
        incomes={incomes}
        transactions={displayTransactions}
        onSelectFixed={(exp) => {
          setSelectedFixedExpense(exp);
          setIsFixedModalOpen(true);
        }}
        onSelectTransaction={(tx) => {
          setSelectedTransaction(tx);
          setIsTxModalOpen(true);
        }}
      />

      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4">
        <PullToRefresh
          disabled={activeTab === 'friends' && Boolean(selectedChatFriendKey)}
          onRefresh={async () => {
            await performSilentBankSync(true);
            await refreshBankStatus();
          }}
        >
          <>
            {activeTab === 'home' && (
                <HomeTab
                  hasBankConnection={hasActiveBankConnection}
                  period={period}
                  connectedBank={connectedBank}
                  accounts={accounts}
                  incomes={incomes}
                  fixedExpenses={fixedExpenses}
                  transactions={displayTransactions}
                  totalBalance={totalBalance}
                  totalIncome={totalIncome}
                  totalFixedExpenses={totalFixedExpenses}
                  totalVariableSpent={totalVariableSpent}
                  kvarAttSpendera={kvarAttSpendera}
                  dagsbudget={dagsbudget}
                  isInitialLoading={isInitialLoading}
                  onOpenBank={() => setIsBankModalOpen(true)}
                  onSelectTransaction={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onSelectFixed={(exp) => {
                    setSelectedFixedExpense(exp);
                    setIsFixedModalOpen(true);
                  }}
                  onSelectIncome={(inc) => {
                    setSelectedIncome(inc);
                    setIsIncomeModalOpen(true);
                  }}
                  onNavigateToFixed={() => setActiveTab('fixed')}
                  onNavigateToTransactions={() => setActiveTab('transactions')}
                  onNavigateToGoals={() => {
                    setSelectedGoalIdInView(null);
                    setActiveTab('goals');
                  }}
                  onNavigateToHousehold={() => {
                    setSettingsSubView('household');
                    setActiveTab('settings');
                  }}
                  manualBalance={activeManualBalance}
                  onOpenBalance={hasActiveBankConnection ? undefined : () => setIsBalanceSheetOpen(true)}
                  userEmail={userEmail}
                  userName={userName}
                  onSelectAccount={(accountId) => {
                    setSelectedHistoryAccountId(accountId);
                    setActiveTab('transactions');
                  }}
                  onUpdateAccountMeta={(accountId, patch) => {
                    saveAccountMeta(accountId, patch);
                    setAccountMetaVersion((v) => v + 1);
                  }}
                  onToggleHeart={handleToggleHeart}
                  onTogglePackage={handleTogglePackage}
                  onExcludeTransaction={handleExcludeTransaction}
                  onUpdateTransaction={handleUpdateTransaction}
                />
              )}

              {activeTab === 'fixed' && (
                <FixedTab
                  periodMatches={periodRecurringMatches}
                  period={period}
                  incomes={incomes}
                  fixedExpenses={fixedExpenses}
                  totalIncome={totalIncome}
                  totalFixedExpenses={totalFixedExpenses}
                  transactions={displayTransactions}
                  accounts={accounts}
                  userEmail={userEmail}
                  userName={userName}
                  onSelectIncome={(inc) => {
                    setSelectedIncome(inc);
                    setIsIncomeModalOpen(true);
                  }}
                  onSelectFixed={(exp) => {
                    setSelectedFixedExpense(exp);
                    setIsFixedModalOpen(true);
                  }}
                  onAddIncome={() => {
                    setSelectedIncome(null);
                    setIsIncomeModalOpen(true);
                  }}
                  onAddFixed={() => {
                    setSelectedFixedExpense(null);
                    setIsFixedModalOpen(true);
                  }}
                  onOpenDiscover={() => {
                    setSettingsSubView('discover');
                    setActiveTab('settings');
                  }}
                  onOpenHousehold={() => {
                    setSettingsSubView('household');
                    setActiveTab('settings');
                  }}
                  onOpenGoals={() => setActiveTab('goals')}
                  onDeleteIncome={handleDeleteIncome}
                  onDeleteFixed={handleDeleteFixed}
                  onUpdateFixed={handleUpdateFixed}
                />
              )}

              {activeTab === 'analysis' && (
                <AnalysisTab
                  period={period}
                  incomes={incomes}
                  fixedExpenses={fixedExpenses}
                  transactions={displayTransactions}
                  totalIncome={totalIncome}
                  totalFixedExpenses={totalFixedExpenses}
                  totalVariableSpent={totalVariableSpent}
                  targetPayday={targetPayday}
                  weekendHandling={weekendHandling}
                  excludeInternalTransfers={excludeInternalTransfers}
                  bankAccounts={bankAccounts}
                  userEmail={userEmail}
                  userName={userName}
                  onSelectTransaction={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onSelectFixed={(exp) => {
                    setSelectedFixedExpense(exp);
                    setIsFixedModalOpen(true);
                  }}
                  onSelectIncome={(inc) => {
                    setSelectedIncome(inc);
                    setIsIncomeModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'transactions' && (
                <TransactionsTab
                  transactions={displayTransactions}
                  fixedExpenses={fixedExpenses}
                  incomes={incomes}
                  totalVariableSpent={totalVariableSpent}
                  period={period}
                  targetPayday={targetPayday}
                  weekendHandling={weekendHandling}
                  accounts={accounts}
                  selectedAccountId={selectedHistoryAccountId}
                  onSelectAccount={setSelectedHistoryAccountId}
                  onSelectTransaction={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onAddTransaction={() => {
                    setSelectedTransaction(null);
                    setIsTxModalOpen(true);
                  }}
                  onDeleteTransaction={handleDeleteTransaction}
                  onToggleHeart={handleToggleHeart}
                  onTogglePackage={handleTogglePackage}
                  onExcludeTransaction={handleExcludeTransaction}
                />
              )}

              {activeTab === 'goals' && (
                <SavingsGoalsView
                  onCreateMonthlySaving={({ goalId, goalName, amount }) => {
                    void handleAddFixed({
                      name: `Sparande: ${goalName}`,
                      amount,
                      dueDay: targetPayday || 25,
                      category: 'Sparande',
                      paymentMethod: 'Överföring',
                      linkedGoalId: goalId,
                    });
                    showFeedbackToast({ id: `monthly-saving-${goalId}`, title: 'Månadssparande tillagt' });
                  }}
                  userName={userName}
                  transactions={displayTransactions}
                  accounts={accounts}
                  totalBalance={totalBalance}
                  selectedGoalId={selectedGoalIdInView}
                  onSelectGoalId={setSelectedGoalIdInView}
                  autoOpenCreate={autoOpenGoalWizard}
                  onAutoOpenConsumed={() => setAutoOpenGoalWizard(false)}
                />
              )}

              {activeTab === 'friends' && (
                <FriendsChatView
                  period={period}
                  userEmail={userEmail}
                  userName={userName}
                  userAvatar={userAvatar}
                  transactions={displayTransactions}
                  fixedExpenses={fixedExpenses}
                  incomes={incomes}
                  initialSelectedFriendKey={selectedChatFriendKey}
                  onSelectFriendKey={setSelectedChatFriendKey}
                  onOpenHousehold={() => {
                    setSettingsSubView('household');
                    setActiveTab('settings');
                  }}
                  onOpenGoals={() => setActiveTab('goals')}
                />
              )}

              {activeTab === 'saved' && (
                <div className="ui-page">
                  {(() => {
                    const heartedList = displayTransactions.filter((t) => t.isHearted);
                    if (heartedList.length === 0) {
                      return (
                        <section className="ui-empty-state-page animate-fade-in">
                          <EmptyClusterArtwork variant="saved" />
                          <p className="ui-empty-title">
                            Inga sparade köp än
                          </p>
                          <p className="ui-empty-sub">
                            Markera en transaktion med ett hjärta för att enkelt hitta den här.
                          </p>
                        </section>
                      );
                    }

                    const map = new Map<string, TransactionItem[]>();
                    for (const tx of heartedList) {
                      const key = tx.date || 'Okänt';
                      const arr = map.get(key) || [];
                      arr.push(tx);
                      map.set(key, arr);
                    }
                    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

                    return sortedKeys.map((dateKey) => {
                      const dayItems = map.get(dateKey)!;
                      const net = dayItems.reduce((acc, item) => {
                        const amt = Number(item.amount) || 0;
                        return item.type === 'income' ? acc + amt : acc - amt;
                      }, 0);
                      const netStr =
                        new Intl.NumberFormat('sv-SE').format(Math.round(Math.abs(net))) + ' kr';

                      return (
                        <section key={`saved-${dateKey}`} className="ui-section">
                          <div className="ui-date-header">
                            <span className="ui-date-header-title">
                              {formatSwedishDateHeading(dateKey)}
                            </span>
                            <span
                              className={`ui-date-header-sum ${
                                net > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''
                              }`}
                            >
                              {net > 0 ? `+${netStr}` : `−${netStr}`}
                            </span>
                          </div>

                          <div className="ui-list-card">
                            {dayItems.map((tx) => {
                              const isIncome = tx.type === 'income';
                              const formattedAmt =
                                new Intl.NumberFormat('sv-SE').format(Math.round(tx.amount)) + ' kr';
                              return (
                                <button
                                  key={tx.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTransaction(tx);
                                    setIsTxModalOpen(true);
                                  }}
                                  className="ui-tx-row"
                                >
                                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
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
                                      <span className="ui-row-subtitle flex items-center gap-1.5">
                                        <CategoryIcon
                                          category={tx.category}
                                          size={11}
                                          className="shrink-0 text-[var(--text-secondary)]"
                                        />
                                        <span className="truncate">{tx.category}</span>
                                        {tx.isHearted && (
                                          <Heart
                                            size={11}
                                            weight="fill"
                                            className="text-rose-500 shrink-0"
                                          />
                                        )}
                                        {tx.isWaitingForPackage && (
                                          <Package
                                            size={11}
                                            weight="fill"
                                            className="text-amber-500 shrink-0"
                                          />
                                        )}
                                        {tx.receiptUrl && (
                                          <Paperclip
                                            size={11}
                                            weight="bold"
                                            className="text-[var(--text-secondary)] shrink-0"
                                          />
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span
                                      className={`ui-row-amount ${
                                        isIncome ? 'ui-row-amount-income' : ''
                                      }`}
                                    >
                                      {isIncome ? `+${formattedAmt}` : `−${formattedAmt}`}
                                    </span>
                                    <span className="ui-row-meta">
                                      {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                                        ? 'Reserverat'
                                        : getTransactionTime(tx)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      );
                    });
                  })()}
                </div>
              )}

              {activeTab === 'packages' && (
                <div className="ui-page">
                  {(() => {
                    const packageList = displayTransactions.filter((t) => t.isWaitingForPackage);
                    if (packageList.length === 0) {
                      return (
                        <section className="ui-empty-state-page animate-fade-in">
                          <EmptyClusterArtwork variant="packages" />
                          <p className="ui-empty-title">
                            Inga paket på väg
                          </p>
                          <p className="ui-empty-sub">
                            Markera ett onlineköp som &quot;Väntar på paket&quot; för att hålla koll tills det har levererats.
                          </p>
                        </section>
                      );
                    }

                    const map = new Map<string, TransactionItem[]>();
                    for (const tx of packageList) {
                      const key = tx.date || 'Okänt';
                      const arr = map.get(key) || [];
                      arr.push(tx);
                      map.set(key, arr);
                    }
                    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

                    return sortedKeys.map((dateKey) => {
                      const dayItems = map.get(dateKey)!;
                      const net = dayItems.reduce((acc, item) => {
                        const amt = Number(item.amount) || 0;
                        return item.type === 'income' ? acc + amt : acc - amt;
                      }, 0);
                      const netStr =
                        new Intl.NumberFormat('sv-SE').format(Math.round(Math.abs(net))) + ' kr';

                      return (
                        <section key={`pkg-${dateKey}`} className="ui-section">
                          <div className="ui-date-header">
                            <span className="ui-date-header-title">
                              {formatSwedishDateHeading(dateKey)}
                            </span>
                            <span
                              className={`ui-date-header-sum ${
                                net > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''
                              }`}
                            >
                              {net > 0 ? `+${netStr}` : `−${netStr}`}
                            </span>
                          </div>

                          <div className="ui-list-card">
                            {dayItems.map((tx) => {
                              const isIncome = tx.type === 'income';
                              const formattedAmt =
                                new Intl.NumberFormat('sv-SE').format(Math.round(tx.amount)) + ' kr';
                              return (
                                <div
                                  key={tx.id}
                                  className="py-3 sm:py-3.5 flex items-center justify-between gap-3.5 text-[13px] sm:text-sm"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTransaction(tx);
                                      setIsTxModalOpen(true);
                                    }}
                                    className="flex items-center gap-3.5 min-w-0 flex-1 text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                                  >
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
                                      <span className="ui-row-subtitle flex items-center gap-1.5">
                                        <CategoryIcon
                                          category={tx.category}
                                          size={11}
                                          className="shrink-0 text-[var(--text-secondary)]"
                                        />
                                        <span className="truncate">{tx.category}</span>
                                        {tx.isHearted && (
                                          <Heart
                                            size={11}
                                            weight="fill"
                                            className="text-rose-500 shrink-0"
                                          />
                                        )}
                                        {tx.isWaitingForPackage && (
                                          <Package
                                            size={11}
                                            weight="fill"
                                            className="text-amber-500 shrink-0"
                                          />
                                        )}
                                        {tx.receiptUrl && (
                                          <Paperclip
                                            size={11}
                                            weight="bold"
                                            className="text-[var(--text-secondary)] shrink-0"
                                          />
                                        )}
                                      </span>
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-2.5 shrink-0">
                                    <div className="text-right">
                                      <span
                                        className={`ui-row-amount ${
                                          isIncome ? 'ui-row-amount-income' : ''
                                        }`}
                                      >
                                        {isIncome ? `+${formattedAmt}` : `−${formattedAmt}`}
                                      </span>
                                      <span className="ui-row-meta">
                                        {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                                          ? 'Reserverat'
                                          : getTransactionTime(tx)}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePackage(tx.id, false)}
                                      title="Markera som mottaget"
                                      className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                    >
                                      <Package size={14} weight="fill" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    });
                  })()}
                </div>
              )}

              {activeTab === 'receipts' && (
                <div className="ui-page">
                  {displayTransactions.some((t) => getItemReceipts(t).length > 0) ||
                  fixedExpenses.some((f) => getItemReceipts(f).length > 0) ? (
                    <section className="ui-list-card">
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {fixedExpenses
                          .filter((f) => getItemReceipts(f).length > 0)
                          .map((exp) => {
                            const expReceipts = getItemReceipts(exp);
                            const formattedAmt =
                              new Intl.NumberFormat('sv-SE').format(Math.round(exp.amount)) +
                              ' kr';
                            return (
                              <div
                                key={`receipt-fix-${exp.id}`}
                                className="py-3 sm:py-3.5 flex items-center justify-between gap-3.5 text-[13px] sm:text-sm"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFixedExpense(exp);
                                    setIsFixedModalOpen(true);
                                  }}
                                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                                >
                                  <ItemLogo
                                    name={exp.name}
                                    category={exp.category}
                                    logoUrl={exp.logo}
                                    size="md"
                                    isRecurring={true}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="ui-row-title">
                                      {exp.name}
                                    </span>
                                    <span className="ui-row-subtitle flex items-center gap-1.5">
                                      <CategoryIcon
                                        category={exp.category || 'Räkningar'}
                                        size={11}
                                        className="shrink-0 text-[var(--text-secondary)]"
                                      />
                                      <span className="truncate">{exp.category}</span>
                                      <Paperclip
                                        size={11}
                                        weight="bold"
                                        className="text-[var(--text-secondary)] shrink-0"
                                      />
                                      {expReceipts.length > 1 && (
                                        <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                                          {expReceipts.length} st
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </button>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <div className="text-right">
                                    <span className="ui-row-amount">
                                      −{formattedAmt}
                                    </span>
                                    <span className="ui-row-meta truncate max-w-[110px]">
                                      {expReceipts.length > 1
                                        ? `${expReceipts.length} kvitton`
                                        : expReceipts[0]?.name || 'Kvitto'}
                                    </span>
                                  </div>
                                  {expReceipts[0] && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewReceipt({
                                          url: expReceipts[0].url,
                                          name: expReceipts[0].name || exp.name || 'Kvitto',
                                        });
                                      }}
                                      className="ui-icon-btn"
                                      title="Öppna kvitto"
                                    >
                                      {expReceipts[0].url.startsWith('data:image/') ? (
                                        <Eye size={14} />
                                      ) : (
                                        <FileText size={14} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                        {displayTransactions
                          .filter((t) => getItemReceipts(t).length > 0)
                          .map((tx) => {
                            const txReceipts = getItemReceipts(tx);
                            const isIncome = tx.type === 'income';
                            const recurring = checkIsRecurringTransaction(
                              tx,
                              fixedExpenses,
                              incomes
                            );
                            const formattedAmt =
                              new Intl.NumberFormat('sv-SE').format(Math.round(tx.amount)) + ' kr';
                            return (
                              <div
                                key={`receipt-tx-${tx.id}`}
                                className="py-3 sm:py-3.5 flex items-center justify-between gap-3.5 text-[13px] sm:text-sm"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTransaction(tx);
                                    setIsTxModalOpen(true);
                                  }}
                                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                                >
                                  <ItemLogo
                                    name={tx.title}
                                    category={tx.category}
                                    logoUrl={tx.logo}
                                    size="md"
                                    isRecurring={recurring.isRecurring}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="ui-row-title">
                                      {tx.title}
                                    </span>
                                    <span className="ui-row-subtitle flex items-center gap-1.5">
                                      <CategoryIcon
                                        category={tx.category}
                                        size={11}
                                        className="shrink-0 text-[var(--text-secondary)]"
                                      />
                                      <span className="truncate">{tx.category}</span>
                                      {tx.isHearted && (
                                        <Heart
                                          size={11}
                                          weight="fill"
                                          className="text-rose-500 shrink-0"
                                        />
                                      )}
                                      {tx.isWaitingForPackage && (
                                        <Package
                                          size={11}
                                          weight="fill"
                                          className="text-amber-500 shrink-0"
                                        />
                                      )}
                                      <Paperclip
                                        size={11}
                                        weight="bold"
                                        className="text-[var(--text-secondary)] shrink-0"
                                      />
                                      <span className="truncate">
                                        ·{' '}
                                        {txReceipts.length > 1
                                          ? `${txReceipts.length} kvitton`
                                          : txReceipts[0]?.name || 'Kvitto'}
                                      </span>
                                    </span>
                                  </div>
                                </button>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <div className="text-right">
                                    <span
                                      className={`ui-row-amount ${
                                        isIncome ? 'ui-row-amount-income' : ''
                                      }`}
                                    >
                                      {isIncome ? `+${formattedAmt}` : `−${formattedAmt}`}
                                    </span>
                                    <span className="ui-row-meta">
                                      {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                                        ? 'Reserverat'
                                        : getTransactionTime(tx)}
                                    </span>
                                  </div>
                                  {txReceipts[0] && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewReceipt({
                                          url: txReceipts[0].url,
                                          name: txReceipts[0].name || tx.title || 'Kvitto',
                                        });
                                      }}
                                      className="ui-icon-btn"
                                      title="Öppna kvitto"
                                    >
                                      {txReceipts[0].url.startsWith('data:image/') ? (
                                        <Eye size={14} />
                                      ) : (
                                        <FileText size={14} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </section>
                  ) : (
                    <section className="ui-empty-state-page animate-fade-in">
                      <EmptyClusterArtwork variant="receipts" />
                      <p className="ui-empty-title">
                        Inga bifogade kvitton än
                      </p>
                      <p className="ui-empty-sub">
                        Fota eller ladda upp kvitton på dina köp och fasta utgifter så samlas alla här.
                      </p>
                    </section>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <SettingsTab
                  period={period}
                  connectedBank={connectedBank}
                  connections={connections}
                  bankAccounts={bankAccounts}
                  accounts={accounts}
                  onRefreshBankStatus={refreshBankStatus}
                  syncingBank={syncingBank}
                  targetPayday={targetPayday}
                  weekendHandling={weekendHandling}
                  userEmail={userEmail}
                  userName={userName}
                  userAvatar={userAvatar}
                  excludeInternalTransfers={excludeInternalTransfers}
                  transactions={displayTransactions}
                  fixedExpenses={fixedExpenses}
                  incomes={incomes}
                  onToggleExcludeInternalTransfers={handleToggleExcludeInternalTransfers}
                  onUpdatePayday={handleUpdatePayday}
                  onUpdateWeekendHandling={handleUpdateWeekendHandling}
                  onUpdateAvatar={handleUpdateAvatar}
                  onOpenBank={() => setIsBankModalOpen(true)}
                  onDisconnectBank={handleDisconnectBank}
                  onSyncBank={handleSyncBank}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                  onSignOut={handleSignOut}
                  onDeleteAccount={handleDeleteAccount}
                  onResetAccount={handleResetAccount}
                  onSelectTransaction={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onAddIncome={handleAddIncome}
                  onAddFixed={handleAddFixed}
                  onUpdateIncome={handleUpdateIncome}
                  onUpdateFixed={handleUpdateFixed}
                  onUpdateEmail={handleUpdateEmail}
                  onUpdateName={handleUpdateName}
                  onStartOnboarding={() => setIsOnboardingActive(true)}
                  onCategoryMutated={handleCategoryMutated}
                  subView={settingsSubView}
                  onSubViewChange={(next) => {
                    setSelectedGoalIdInView(null);
                    setSettingsSubView(next);
                  }}
                  selectedGoalId={selectedGoalIdInView}
                  onSelectGoalId={setSelectedGoalIdInView}
                  onOpenFriendsChat={(friendKey) => {
                    setSelectedChatFriendKey(friendKey || null);
                    setActiveTab('friends');
                  }}
                  splitSimulatorActive={splitSimulatorActive}
                  onToggleSplitSimulator={handleToggleSplitSimulator}
                  onStartCreateGoalWizard={() => {
                    setSelectedGoalIdInView(null);
                    setAutoOpenGoalWizard(true);
                    setActiveTab('goals');
                  }}
                  onOpenAddFixedModal={() => {
                    setSelectedFixedExpense(null);
                    setIsFixedModalOpen(true);
                  }}
                  onOpenPreviewFixedModal={(exp) => {
                    setSelectedFixedExpense(exp);
                    setIsFixedModalOpen(true);
                  }}
                  onOpenAddIncomeModal={() => {
                    setSelectedIncome(null);
                    setIsIncomeModalOpen(true);
                  }}
                  onOpenAddTransactionModal={() => {
                    setSelectedTransaction(null);
                    setIsTxModalOpen(true);
                  }}
                  onOpenPreviewTransactionModal={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onApplyFixedExpenses={(items) => {
                    setFixedExpenses(items);
                  }}
                  onOpenSection={(section) => {
                    setSelectedGoalIdInView(null);
                    setActiveTab(section);
                  }}
                  sectionCounts={{
                    goals: getSavingsGoals().length,
                    packages: displayTransactions.filter((t) => t.isWaitingForPackage).length,
                    receipts:
                      displayTransactions.reduce((sum, t) => sum + getItemReceipts(t).length, 0) +
                      fixedExpenses.reduce((sum, f) => sum + getItemReceipts(f).length, 0),
                  }}
                />
              )}
          </>
        </PullToRefresh>
      </main>

      <BalanceSheet
        isOpen={isBalanceSheetOpen}
        onClose={() => setIsBalanceSheetOpen(false)}
        current={activeManualBalance}
        onSave={(amount) => {
          setManualBalance({ amount, at: new Date().toISOString() });
          setIsBalanceSheetOpen(false);
        }}
        onClear={() => {
          setManualBalance(null);
          setIsBalanceSheetOpen(false);
        }}
      />

      <AddEntrySheet
        isOpen={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onResult={(result) => {
          setIsAddSheetOpen(false);
          setSelectedTransaction(null);
          setTxPrefill(result);
          setIsTxModalOpen(true);
        }}
        onManual={() => {
          setIsAddSheetOpen(false);
          setSelectedTransaction(null);
          setTxPrefill(null);
          setIsTxModalOpen(true);
        }}
      />

      {!(activeTab === 'friends' && Boolean(selectedChatFriendKey)) && (
        <BottomNav
          activeTab={activeTab}
          onAddTransaction={() => {
            setSelectedTransaction(null);
            setTxPrefill(null);
            // Utan taligenkänning i webbläsaren går vi direkt till manuell inmatning
            if (isVoiceEntrySupported()) setIsAddSheetOpen(true);
            else setIsTxModalOpen(true);
          }}
          onChangeTab={(tab) => {
            setIsSearchModalOpen(false);
            setIsNotificationsModalOpen(false);
            setSettingsSubView('main');
            if (tab !== 'friends') {
              setSelectedChatFriendKey(null);
            }
            setActiveTab(tab);
          }}
          onOpenHousehold={() => {
            setIsSearchModalOpen(false);
            setIsNotificationsModalOpen(false);
            setSettingsSubView('household');
            setActiveTab('settings');
          }}
          onOpenDiscover={() => {
            setIsSearchModalOpen(false);
            setIsNotificationsModalOpen(false);
            setSettingsSubView('discover');
            setActiveTab('settings');
          }}
          activeSettingsSubView={settingsSubView}
          goalsCount={getSavingsGoals().length}
          friendsUnreadCount={friendsUnreadCount}
          savedCount={displayTransactions.filter((t) => t.isHearted).length}
          packagesCount={displayTransactions.filter((t) => t.isWaitingForPackage).length}
          receiptsCount={
            displayTransactions.reduce((sum, t) => sum + getItemReceipts(t).length, 0) +
            fixedExpenses.reduce((sum, f) => sum + getItemReceipts(f).length, 0)
          }
        />
      )}
      </div>

      <BankModal
        isOpen={isBankModalOpen}
        userEmail={userEmail}
        connections={connections}
        bankAccounts={bankAccounts}
        preselectedBankName={preselectedBankName}
        onClose={() => {
          setIsBankModalOpen(false);
          setPreselectedBankName(null);
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onBankStateUpdated={(conns, accs) => {
          setConnections(conns);
          setBankAccounts(accs);
          refreshBankStatus();
        }}
      />

      <IncomeModal
        isOpen={isIncomeModalOpen}
        initialIncome={selectedIncome}
        accounts={accounts}
        transactions={displayTransactions}
        onClose={() => {
          setIsIncomeModalOpen(false);
          setSelectedIncome(null);
        }}
        onSelectTransaction={(tx) => {
          setIsIncomeModalOpen(false);
          setSelectedIncome(null);
          setSelectedTransaction(tx);
          setIsTxModalOpen(true);
        }}
        onSave={handleAddIncome}
        onUpdate={handleUpdateIncome}
        onDelete={handleDeleteIncome}
      />

      <FixedExpenseModal
        isOpen={isFixedModalOpen}
        initialExpense={selectedFixedExpense}
        fixedExpenses={fixedExpenses}
        accounts={accounts}
        transactions={displayTransactions}
        onClose={() => {
          setIsFixedModalOpen(false);
          setSelectedFixedExpense(null);
        }}
        onSelectTransaction={(tx) => {
          setIsFixedModalOpen(false);
          setSelectedFixedExpense(null);
          setSelectedTransaction(tx);
          setIsTxModalOpen(true);
        }}
        onMarkAsFixed={handleMarkAsFixed}
        onSave={handleAddFixed}
        onUpdate={handleUpdateFixed}
        onDelete={handleDeleteFixed}
      />

      <TransactionModal
        isOpen={isTxModalOpen}
        initialTransaction={selectedTransaction}
        transactions={displayTransactions}
        accounts={accounts}
        fixedExpenses={fixedExpenses}
        incomes={incomes}
        userEmail={userEmail}
        userName={userName}
        onOpenFriendsChat={(friendKey) => {
          setIsTxModalOpen(false);
          setSelectedTransaction(null);
          setSelectedChatFriendKey(friendKey || null);
          setActiveTab('friends');
        }}
        prefill={txPrefill}
        onClose={() => {
          setIsTxModalOpen(false);
          setSelectedTransaction(null);
          setTxPrefill(null);
        }}
        onSelectTransaction={(tx) => {
          setSelectedTransaction(tx);
        }}
        onSave={handleAddTransaction}
        onUpdate={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
        onExclude={handleExcludeTransaction}
        onMarkAsFixed={handleMarkAsFixed}
        onLinkToFixed={handleLinkTransactionToFixed}
        onToggleHeart={handleToggleHeart}
        onTogglePackage={handleTogglePackage}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(email) => {
          setUserEmail(email);
          refreshBankStatus();
        }}
      />

      {/* Ångra-notis när ett köp tas bort ur budgeten */}
      <UndoToast
        toast={undoToast}
        onUndo={() => {
          if (!undoToast) return;
          const { id, excluded } = undoToast;
          if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
          setUndoToast(null);
          handleExcludeTransaction(id, !excluded, true);
        }}
      />

      {/* Floating Modern Confirmation Feedback Toast */}
      <FeedbackSheet />

      <SetNewPasswordSheet
        open={isPasswordRecovery && Boolean(userId)}
        onDone={() => {
          endPasswordRecovery();
          showFeedbackToast({ id: 'password-updated', title: 'Lösenordet är bytt' });
        }}
        onSkip={endPasswordRecovery}
      />

      <FeedbackToast
        toast={feedbackToast}
        onClose={() => {
          if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
          setFeedbackToast(null);
        }}
      />

      {/* Kvittovisare */}
      <ReceiptPreviewSheet receipt={previewReceipt} onClose={() => setPreviewReceipt(null)} />

      {/* Live Split-Screen Simulator (Du + Motpart sida vid sida på datorn, eller växlingsbar på mindre skärm) */}
      {splitSimulatorActive && (
        <div
          className={
            mobileSimPane === 'partner'
              ? 'flex-1 flex justify-center p-2 sm:p-4 min-[820px]:fixed min-[820px]:right-3 min-[820px]:top-3 min-[820px]:bottom-3 min-[820px]:p-0 z-[120] items-stretch'
              : 'fixed right-3 top-3 bottom-3 z-[120] hidden min-[820px]:flex items-stretch'
          }
        >
          <PartnerSimulatorColumn
            myUserEmail={userEmail}
            myUserName={userName}
            selectedFriendKeyInMyApp={selectedChatFriendKey}
            onSelectFriendInMyApp={(fk) => {
              setSelectedChatFriendKey(fk);
              setActiveTab('friends');
              setMobileSimPane('mine');
            }}
            onCloseSimulator={() => handleToggleSplitSimulator(false)}
          />
        </div>
      )}
    </div>
  );
};

export default App;
