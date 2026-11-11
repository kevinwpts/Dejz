import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  calculateCurrentPeriod,
  PeriodInfo,
  WeekendHandlingMode,
  isDateInPeriod,
} from './utils/periodEngine';
import { Navbar } from './components/Navbar';
import { BottomNav, AppTab } from './components/BottomNav';
import { AddEntrySheet, isVoiceEntrySupported } from './components/VoiceEntry';
import { BalanceSheet } from './components/BalanceSheet';
import {
  HomeTab,
  AccountItem,
  IncomeItem,
  FixedExpenseItem,
  TransactionItem,
  getTransactionTime,
  compareTransactionsChronologically,
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
import { bankService, BankConnection, BankAccount } from './services/bankService';
import { dataService } from './services/dataService';
import { Frequency } from './types';
import { getLogoUrl } from './utils/logo';
import { formatBankAccountNumber, getBankAccountTitle } from './utils/bankHistoryAnalyzer';
import { deduplicateTransactions } from './utils/transactionDedup';
import { formatSwedishDateHeading, getItemReceipts } from './utils/swedishDate';
import {
  loadCachedAppState,
  saveCachedAppState,
  hasCachedBankData,
  clearCachedAppState,
  dismissFixedMerchant,
  unDismissFixedMerchant,
  dismissIncomeMerchant,
  unDismissIncomeMerchant,
  markFixedIdDeleted,
  unmarkFixedIdDeleted,
  markIncomeIdDeleted,
  unmarkIncomeIdDeleted,
  saveManualFixedOverride,
  saveManualIncomeOverride,
  getExcludeInternalTransfers,
  setExcludeInternalTransfers,
  setTransactionExcludedState,
  isTransactionManuallyExcluded,
  getMerchantAliases,
  saveMerchantAlias,
  removeMerchantAliasForSources,
  normalizeMerchantKey,
  ensureValidUuid,
  propagateCategoryChangeInCache,
  getTransactionMetaMap,
  saveTransactionMeta,
  getAccountMetaMap,
  saveAccountMeta,
  syncAllUserPreferencesToSupabase,
  cancelPendingPreferenceSync,
  clearAllLocalAppData,
  setManualBalance,
  getSavingsGoals,
} from './utils/appCache';
import { findInternalTransferIds, isInternalTransferTransaction } from './utils/transferDetection';
import {
  checkIsRecurringTransaction,
  findAllMatchingFixedExpensesByMerchant,
  reconcilePeriodRecurringMatches,
} from './utils/recurring';
import { useBudgetTotals } from './app/hooks/useBudgetTotals';
import { useAccountData } from './app/hooks/useAccountData';
import { useVariableBillEstimates } from './app/hooks/useVariableBillEstimates';
import {
  FeedbackToast,
  FeedbackToastState,
  ReceiptPreviewSheet,
  UndoToast,
} from './app/components/AppToasts';
import { useAiMerchantCleaning } from './app/hooks/useAiMerchantCleaning';
import { useSavingsGoalCredit } from './app/hooks/useSavingsGoalCredit';

import { sanitizeTransactionItem } from './app/transactionMapping';
import { getPayDatesForIncome } from './app/incomeSchedule';

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

  const [accountMetaVersion, setAccountMetaVersion] = useState(0);
  const [selectedGoalIdInView, setSelectedGoalIdInView] = useState<string | null>(null);

  // Konvertera Enable Banking-konton till visningskonton för Hem-fliken
  const accounts: AccountItem[] = useMemo(() => {
    const connMap = new Map<string, { name: string; logo?: string | null }>();
    for (const c of connections) {
      connMap.set(c.id, { name: c.aspsp_name, logo: c.aspsp_logo });
    }

    const activeAccs = bankAccounts.filter((a) => a.is_selected !== false);
    const listToUse = activeAccs.length > 0 ? activeAccs : bankAccounts;
    const accountMeta = getAccountMetaMap();

    return listToUse.map((ba) => {
      const connInfo = connMap.get(ba.connection_id);
      const bankName = connInfo?.name || 'Bank';
      const originalName = getBankAccountTitle(ba, bankName);
      const meta = accountMeta[ba.id];
      const displayName =
        meta?.customName && meta.customName.trim()
          ? meta.customName.trim()
          : originalName;
      const formattedNumber = formatBankAccountNumber(ba.bban || ba.iban || ba.product || '');
      return {
        id: ba.id,
        name: displayName,
        originalName,
        accountNumber: formattedNumber,
        bankName,
        balance: Number(ba.balance_amount) || 0,
        type: 'checking' as const,
        logo: connInfo?.logo || getLogoUrl(bankName, 'Bank'),
        excludeFromTotalBalance: Boolean(meta?.excludeFromTotalBalance),
      };
    });
  }, [connections, bankAccounts, accountMetaVersion]);

  const connectedBank = useMemo(() => {
    const activeConns = connections.filter((c) => c.status === 'active');
    if (activeConns.length > 0) {
      return activeConns.map((c) => c.aspsp_name).join(', ');
    }
    if (connections.length > 0) {
      return connections.map((c) => c.aspsp_name).join(', ');
    }
    return null;
  }, [connections]);

  // Beräkna aktuell period (från lönedag till dagen innan nästa lön) med vald helghantering:
  const period: PeriodInfo = useMemo(() => {
    return calculateCurrentPeriod(new Date(), targetPayday, weekendHandling);
  }, [targetPayday, weekendHandling]);

  // Uppdatera lönedag & spara till Supabase + cache
  const handleUpdatePayday = useCallback(
    (day: number) => {
      setTargetPayday(day);
      saveCachedAppState({ targetPayday: day });
      if (userId) {
        dataService.updateProfile(userId, { payday: day }).catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera helghantering & spara till Supabase + cache
  const handleUpdateWeekendHandling = useCallback(
    (mode: WeekendHandlingMode) => {
      setWeekendHandling(mode);
      saveCachedAppState({ weekendHandling: mode });
      if (userId) {
        dataService
          .updateProfile(userId, { payday_before_weekend: mode === 'before' })
          .catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera profilbild
  const handleUpdateAvatar = useCallback(
    (avatarDataUrl: string | null) => {
      setUserAvatar(avatarDataUrl);
      saveCachedAppState({ userAvatar: avatarDataUrl });
      if (userId && avatarDataUrl) {
        dataService.updateProfile(userId, { avatar_url: avatarDataUrl }).catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera e-post
  const handleUpdateEmail = useCallback(
    (email: string) => {
      setUserEmail(email);
      saveCachedAppState({ userEmail: email });
      if (userId && userId !== 'demo-user' && userId !== 'preview-user') {
        supabase.auth.updateUser({ email }).catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera namn
  const handleUpdateName = useCallback(
    (name: string) => {
      const clean = name.trim();
      setUserName(clean || null);
      try {
        if (clean) {
          localStorage.setItem('dejz_user_name', clean);
        } else {
          localStorage.removeItem('dejz_user_name');
        }
      } catch {
        // ignore
      }
      if (userId && userId !== 'demo-user' && userId !== 'preview-user') {
        supabase.auth.updateUser({ data: { full_name: clean } }).catch(() => {});
      }
    },
    [userId]
  );

  // Totalt saldo
  const totalBalance = useMemo(() => {
    return accounts
      .filter((a) => !a.excludeFromTotalBalance)
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  }, [accounts]);

  // Alla interna överföringar (enskilda och parvisa mellan egna konton)
  const internalTransferIds = useMemo(() => {
    if (!excludeInternalTransfers) return new Set<string>();
    return findInternalTransferIds(transactions, bankAccounts, userEmail, userName);
  }, [transactions, excludeInternalTransfers, bankAccounts, userEmail, userName]);

  // Transaktioner som tillhör den aktuella löneperioden (från lönedag till dagen innan nästa lön)
  const periodTransactions = useMemo(() => {
    const aliases = getMerchantAliases();
    const sanitized = transactions
      .filter((t) => {
        if (!isDateInPeriod(t.date, period)) return false;
        if (t.isExcluded) return false;
        if (isTransactionManuallyExcluded(t.id)) return false;
        if (
          excludeInternalTransfers &&
          (internalTransferIds.has(t.id) ||
            isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
        ) {
          return false;
        }
        return true;
      })
      .map((t) => sanitizeTransactionItem(t, fixedExpenses, incomes, aliases))
      .filter((t) => {
        if (
          excludeInternalTransfers &&
          (internalTransferIds.has(t.id) ||
            isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
        ) {
          return false;
        }
        return true;
      });

    const list = deduplicateTransactions(sanitized);

    list.sort(compareTransactionsChronologically);
    return list;
  }, [
    transactions,
    period,
    excludeInternalTransfers,
    internalTransferIds,
    bankAccounts,
    userEmail,
    userName,
    fixedExpenses,
    incomes,
  ]);

  // 1-till-1-matchning mellan periodens faktiska banktransaktioner och fasta utgifter/inkomster:
  // Varje fast utgift kan högst kopplas till 1 transaktion per period, och när en fast inkomst/utgift
  // väl har bokförts används dess faktiska belopp under perioden.
  const periodRecurringMatches = useMemo(() => {
    return reconcilePeriodRecurringMatches(periodTransactions, fixedExpenses, incomes);
  }, [periodTransactions, fixedExpenses, incomes]);

  useSavingsGoalCredit({ fixedExpenses, periodRecurringMatches, period, hasActiveBankConnection });

  // Enhetlig transaktionslista för både Hem ("Senaste transaktioner"), Historik och Sök:
  // Garanterar att antalet reserverade transaktioner och historikrader alltid är 100% identiskt oavsett flik.
  const displayTransactions = useMemo(() => {
    const aliases = getMerchantAliases();
    const visibleSource = transactions.filter((t) => {
      if (t.isExcluded) return false;
      if (isTransactionManuallyExcluded(t.id)) return false;
      if (
        excludeInternalTransfers &&
        (internalTransferIds.has(t.id) ||
          isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
      ) {
        return false;
      }
      return true;
    });
    const combined = visibleSource
      .map((t) => sanitizeTransactionItem(t, fixedExpenses, incomes, aliases))
      .filter((t) => {
        if (
          excludeInternalTransfers &&
          (internalTransferIds.has(t.id) ||
            isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
        ) {
          return false;
        }
        return true;
      });
    for (const inc of incomes) {
      if (!inc.amount || inc.amount <= 0) continue;
      const payDates = getPayDatesForIncome(inc, targetPayday, weekendHandling === 'before');
      for (const pDate of payDates) {
        const genId = `inc-${inc.id}-${pDate}`;
        if (dismissedTxIds.includes(genId)) continue;

        const isCovered = combined.some((t) => {
          if (t.type !== 'income') return false;
          if (t.id === genId) return true;
          const sameAmount = Math.abs((Number(t.amount) || 0) - inc.amount) <= 5;
          if (!sameAmount) return false;
          const d1 = new Date(t.date).getTime();
          const d2 = new Date(pDate).getTime();
          return !isNaN(d1) && !isNaN(d2) && Math.abs(d1 - d2) <= 3 * 86400 * 1000;
        });

        if (!isCovered) {
          combined.push({
            id: genId,
            title: inc.name,
            amount: inc.amount,
            type: 'income',
            category: inc.category || 'Lön',
            date: pDate,
            time: '',
            logo: inc.logo || getLogoUrl(inc.name, inc.category || 'Lön'),
          });
        }
      }
    }
    const deduped = deduplicateTransactions(combined);
    deduped.sort(compareTransactionsChronologically);
    return deduped;
  }, [
    transactions,
    fixedExpenses,
    incomes,
    targetPayday,
    weekendHandling,
    dismissedTxIds,
    excludeInternalTransfers,
    internalTransferIds,
    bankAccounts,
    userEmail,
    userName,
  ]);

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

  // Synka med Enable Banking
  const handleSyncBank = async () => {
    setSyncingBank(true);
    lastSyncTimestampRef.current = Date.now();
    try {
      await bankService.sync();
      await refreshBankStatus();
    } catch {
      // ignore error
    } finally {
      setSyncingBank(false);
    }
  };

  // Koppla från Enable Banking
  const handleDisconnectBank = async (connectionId?: string) => {
    const targetId = connectionId || connections[0]?.id;
    if (!targetId) return;
    try {
      await bankService.disconnect(targetId);
      await refreshBankStatus();
    } catch {
      await refreshBankStatus();
    }
  };

  const handleAddIncome = async (
    data: Omit<IncomeItem, 'id'>
  ): Promise<IncomeItem> => {
    unDismissIncomeMerchant(data.name, data.originalName);
    const logo = data.logo || getLogoUrl(data.name, data.category);
    const validId = ensureValidUuid(
      undefined,
      `income:${userId || 'local'}:${normalizeMerchantKey(data.name)}:${data.amount}:${Date.now()}`
    );
    unmarkIncomeIdDeleted(validId);
    saveManualIncomeOverride(
      data.name,
      {
        amount: data.amount,
        payday: data.payday,
        category: data.category,
        name: data.name,
        linkedAliases: data.linkedAliases,
      },
      data.originalName || data.name,
      validId,
      true
    );
    const newItem: IncomeItem = {
      ...data,
      originalName: data.originalName || data.name,
      logo,
      id: validId,
    };
    const nextIncomes = [...incomesRef.current, newItem];
    incomesRef.current = nextIncomes;
    setIncomes(nextIncomes);
    saveCachedAppState({ userId: userIdRef.current, incomes: nextIncomes });
    syncAllUserPreferencesToSupabase(true);

    if (userId) {
      dataService
        .saveIncomeSource(userId, {
          id: newItem.id,
          name: newItem.name,
          originalName: newItem.originalName,
          amount: newItem.amount,
          deductionDay: newItem.payday,
          category: newItem.category,
          frequency: Frequency.MONTHLY,
          logo,
        })
        .catch(() => {});
    }
    return newItem;
  };

  const handleUpdateIncome = async (updated: IncomeItem) => {
    const existing = incomesRef.current.find((i) => i.id === updated.id);
    const rootOriginalName = existing?.originalName || existing?.name || updated.name;

    unDismissIncomeMerchant(updated.name, rootOriginalName);
    const logo = updated.logo || getLogoUrl(updated.name, updated.category);
    const validId = ensureValidUuid(
      updated.id,
      `income:${userId || 'local'}:${normalizeMerchantKey(rootOriginalName)}`
    );
    unmarkIncomeIdDeleted(validId);
    saveManualIncomeOverride(
      updated.name,
      {
        amount: updated.amount,
        payday: updated.payday,
        category: updated.category,
        name: updated.name,
        linkedAliases: updated.linkedAliases,
      },
      rootOriginalName,
      validId,
      true
    );

    const itemWithLogo: IncomeItem = {
      ...updated,
      id: validId,
      originalName: rootOriginalName,
      logo,
    };

    const nextIncomes = incomesRef.current.map((i) =>
      i.id === updated.id ? itemWithLogo : i
    );
    incomesRef.current = nextIncomes;
    setIncomes(nextIncomes);

    const aliases = getMerchantAliases();
    const nextTxs = transactionsRef.current.map((tx) =>
      sanitizeTransactionItem(tx, fixedExpensesRef.current, nextIncomes, aliases)
    );
    transactionsRef.current = nextTxs;
    setTransactions(nextTxs);

    saveCachedAppState({ userId: userIdRef.current, incomes: nextIncomes, transactions: nextTxs });
    syncAllUserPreferencesToSupabase(true);

    if (userId) {
      dataService
        .saveIncomeSource(userId, {
          id: itemWithLogo.id,
          name: itemWithLogo.name,
          originalName: itemWithLogo.originalName,
          amount: itemWithLogo.amount,
          deductionDay: itemWithLogo.payday,
          category: itemWithLogo.category,
          frequency: Frequency.MONTHLY,
          logo,
        })
        .catch(() => {});
    }
  };

  const handleDeleteIncome = async (id: string) => {
    const item = incomesRef.current.find((i) => i.id === id);
    markIncomeIdDeleted(id);
    if (item) {
      const sameMerchantRemaining = incomesRef.current.filter(
        (i) => i.id !== id && normalizeMerchantKey(i.name) === normalizeMerchantKey(item.name)
      );
      if (sameMerchantRemaining.length === 0) {
        dismissIncomeMerchant(item.name, item.originalName);
      }
    }
    const nextIncomes = incomesRef.current.filter((i) => i.id !== id);
    incomesRef.current = nextIncomes;
    setIncomes(nextIncomes);
    saveCachedAppState({ userId: userIdRef.current, incomes: nextIncomes });
    syncAllUserPreferencesToSupabase(true);

    if (userId) {
      dataService.deleteIncomeSource(id, userId, []).catch(() => {});
    }
  };

  const handleAddFixed = async (
    data: Omit<FixedExpenseItem, 'id'>
  ): Promise<FixedExpenseItem> => {
    unDismissFixedMerchant(data.name, data.originalName);
    const logo = data.logo || getLogoUrl(data.name, data.category);
    const validId = ensureValidUuid(
      undefined,
      `fixed:${userId || 'local'}:${normalizeMerchantKey(data.name)}:${data.amount}:${Date.now()}`
    );
    unmarkFixedIdDeleted(validId);
    saveManualFixedOverride(
      data.name,
      {
        amount: data.amount,
        isShared: data.isShared,
        fullAmount: data.fullAmount,
        dueDay: data.dueDay,
        category: data.category,
        paymentMethod: data.paymentMethod,
        name: data.name,
        receipts: data.receipts,
        linkedAliases: data.linkedAliases,
        linkedGoalId: data.linkedGoalId,
      },
      data.originalName || data.name,
      validId,
      true
    );
    const newItem: FixedExpenseItem = {
      ...data,
      originalName: data.originalName || data.name,
      logo,
      id: validId,
    };
    const nextFixed = [...fixedExpensesRef.current, newItem].sort(
      (a, b) => a.dueDay - b.dueDay
    );
    fixedExpensesRef.current = nextFixed;
    setFixedExpenses(nextFixed);
    saveCachedAppState({ userId: userIdRef.current, fixedExpenses: nextFixed });
    syncAllUserPreferencesToSupabase(true);

    if (userId) {
      dataService
        .saveFixedExpense(userId, {
          id: newItem.id,
          name: newItem.name,
          originalName: newItem.originalName,
          amount: newItem.amount,
          deductionDay: newItem.dueDay,
          category: newItem.category,
          paymentMethod: newItem.paymentMethod || 'Autogiro',
          frequency: Frequency.MONTHLY,
          logo,
          isShared: newItem.isShared,
          fullAmount: newItem.fullAmount,
          receiptUrl: newItem.receiptUrl,
          receiptName: newItem.receiptName,
        })
        .catch(() => {});
    }
    return newItem;
  };

  const handleMarkAsFixed = async (tx: TransactionItem, kind: 'expense' | 'income') => {
    const day = parseInt(tx.date.slice(8, 10), 10) || (kind === 'expense' ? 27 : 25);

    // Save any edited transaction metadata (title, category, paymentMethod, note) so the transaction itself keeps the edits
    saveTransactionMeta(tx.id, {
      customTitle: tx.title,
      customCategory: tx.category,
      paymentMethod: tx.paymentMethod,
      note: tx.note,
    });
    setTransactions((prev) => {
      const next = prev.map((item) =>
        item.id === tx.id
          ? {
              ...item,
              title: tx.title,
              category: tx.category,
              paymentMethod: tx.paymentMethod,
              note: tx.note,
            }
          : item
      );
      transactionsRef.current = next;
      saveCachedAppState({ userId: userIdRef.current, transactions: next });
      return next;
    });

    setIsTxModalOpen(false);
    setSelectedTransaction(null);

    if (kind === 'expense') {
      const created = await handleAddFixed({
        name: tx.title,
        originalName: tx.counterpartyName || tx.rawDescription || tx.title,
        amount: tx.amount,
        dueDay: day,
        category: tx.category || 'Räkningar',
        paymentMethod: tx.paymentMethod || 'Autogiro',
        logo: tx.logo,
      });

      // Link transaction metadata to this newly created fixed expense
      saveTransactionMeta(tx.id, { linkedFixedExpenseId: created.id });
      setTransactions((prev) => {
        const next = prev.map((item) =>
          item.id === tx.id ? { ...item, linkedFixedExpenseId: created.id } : item
        );
        transactionsRef.current = next;
        saveCachedAppState({ userId: userIdRef.current, transactions: next });
        return next;
      });

      showFeedbackToast({
        id: `created-fixed-${created.id}`,
        title: 'Sparad som fast utgift',
        undoLabel: 'Ångra',
        onUndo: () => {
          handleDeleteFixed(created.id);
          saveTransactionMeta(tx.id, { linkedFixedExpenseId: '' });
          setTransactions((prev) => {
            const next = prev.map((item) =>
              item.id === tx.id ? { ...item, linkedFixedExpenseId: undefined } : item
            );
            transactionsRef.current = next;
            return next;
          });
        },
      });
    } else {
      const created = await handleAddIncome({
        name: tx.title,
        originalName: tx.counterpartyName || tx.rawDescription || tx.title,
        amount: tx.amount,
        payday: day,
        category: tx.category || 'Lön',
        logo: tx.logo,
      });

      // Link transaction metadata to this newly created income
      saveTransactionMeta(tx.id, { linkedIncomeId: created.id });
      setTransactions((prev) => {
        const next = prev.map((item) =>
          item.id === tx.id ? { ...item, linkedIncomeId: created.id } : item
        );
        transactionsRef.current = next;
        saveCachedAppState({ userId: userIdRef.current, transactions: next });
        return next;
      });

      showFeedbackToast({
        id: `created-income-${created.id}`,
        title: 'Sparad som inkomst',
        undoLabel: 'Ångra',
        onUndo: () => {
          handleDeleteIncome(created.id);
          saveTransactionMeta(tx.id, { linkedIncomeId: '' });
          setTransactions((prev) => {
            const next = prev.map((item) =>
              item.id === tx.id ? { ...item, linkedIncomeId: undefined } : item
            );
            transactionsRef.current = next;
            return next;
          });
        },
      });
    }
  };

  const handleLinkTransactionToFixed = async (
    tx: TransactionItem,
    targetItem: FixedExpenseItem | IncomeItem | null,
    kind: 'expense' | 'income'
  ) => {
    const rawCandidate = (tx.counterpartyName || tx.rawDescription || tx.title || '').trim();

    if (kind === 'expense') {
      const nextLinkedId = targetItem ? targetItem.id : '';
      saveTransactionMeta(tx.id, { linkedFixedExpenseId: nextLinkedId });

      if (targetItem) {
        const exp = targetItem as FixedExpenseItem;
        const currentAliases = Array.isArray(exp.linkedAliases) ? exp.linkedAliases : [];
        const updatedAliases =
          rawCandidate && !currentAliases.includes(rawCandidate)
            ? [...currentAliases, rawCandidate]
            : currentAliases;
        await handleUpdateFixed({
          ...exp,
          linkedAliases: updatedAliases,
        });
      }

      setTransactions((prev) => {
        const next = prev.map((item) =>
          item.id === tx.id ? { ...item, linkedFixedExpenseId: nextLinkedId } : item
        );
        transactionsRef.current = next;
        saveCachedAppState({ userId: userIdRef.current, transactions: next });
        return next;
      });
      setSelectedTransaction((prev) =>
        prev && prev.id === tx.id ? { ...prev, linkedFixedExpenseId: nextLinkedId } : prev
      );

      if (targetItem) {
        showFeedbackToast({
          id: `link-fixed-${tx.id}-${targetItem.id}`,
          title: `Kopplad till ${targetItem.name}`,
          subtitle: `${tx.title} matchas nu som fast utgift`,
          actionLabel: 'Visa i Fasta',
          onAction: () => setActiveTab('fixed'),
          undoLabel: 'Ångra',
          onUndo: () => {
            handleLinkTransactionToFixed(tx, null, 'expense');
          },
        });
      } else {
        showFeedbackToast({
          id: `unlink-fixed-${tx.id}`,
          title: 'Koppling borttagen',
          subtitle: `${tx.title} är inte längre kopplad till fast utgift`,
        });
      }
    } else {
      const nextLinkedId = targetItem ? targetItem.id : '';
      saveTransactionMeta(tx.id, { linkedIncomeId: nextLinkedId });

      if (targetItem) {
        const inc = targetItem as IncomeItem;
        const currentAliases = Array.isArray(inc.linkedAliases) ? inc.linkedAliases : [];
        const updatedAliases =
          rawCandidate && !currentAliases.includes(rawCandidate)
            ? [...currentAliases, rawCandidate]
            : currentAliases;
        await handleUpdateIncome({
          ...inc,
          linkedAliases: updatedAliases,
        });
      }

      setTransactions((prev) => {
        const next = prev.map((item) =>
          item.id === tx.id ? { ...item, linkedIncomeId: nextLinkedId } : item
        );
        transactionsRef.current = next;
        saveCachedAppState({ userId: userIdRef.current, transactions: next });
        return next;
      });
      setSelectedTransaction((prev) =>
        prev && prev.id === tx.id ? { ...prev, linkedIncomeId: nextLinkedId } : prev
      );

      if (targetItem) {
        showFeedbackToast({
          id: `link-inc-${tx.id}-${targetItem.id}`,
          title: `Kopplad till ${targetItem.name}`,
          subtitle: `${tx.title} matchas nu som fast inkomst`,
          actionLabel: 'Visa i Inkomster',
          onAction: () => setActiveTab('fixed'),
          undoLabel: 'Ångra',
          onUndo: () => {
            handleLinkTransactionToFixed(tx, null, 'income');
          },
        });
      } else {
        showFeedbackToast({
          id: `unlink-inc-${tx.id}`,
          title: 'Koppling borttagen',
          subtitle: `${tx.title} är inte längre kopplad till fast inkomst`,
        });
      }
    }
  };

  const handleToggleHeart = useCallback((id: string, isHearted: boolean) => {
    saveTransactionMeta(id, { isHearted });
    setTransactions((prev) => {
      const next = prev.map((tx) => (tx.id === id ? { ...tx, isHearted } : tx));
      transactionsRef.current = next;
      saveCachedAppState({ transactions: next });
      return next;
    });
    setSelectedTransaction((prev) =>
      prev && prev.id === id ? { ...prev, isHearted } : prev
    );
  }, []);

  const handleTogglePackage = useCallback((id: string, isWaitingForPackage: boolean) => {
    saveTransactionMeta(id, { isWaitingForPackage });
    setTransactions((prev) => {
      const next = prev.map((tx) => (tx.id === id ? { ...tx, isWaitingForPackage } : tx));
      transactionsRef.current = next;
      saveCachedAppState({ transactions: next });
      return next;
    });
    setSelectedTransaction((prev) =>
      prev && prev.id === id ? { ...prev, isWaitingForPackage } : prev
    );
  }, []);

  const handleCategoryMutated = useCallback(
    (oldName: string, newName: string, kind: 'expense' | 'income') => {
      propagateCategoryChangeInCache(oldName, newName);
      const oldLower = oldName.trim().toLowerCase();

      if (kind === 'expense') {
        const nextFixed = fixedExpensesRef.current.map((f) =>
          (f.category || '').trim().toLowerCase() === oldLower
            ? { ...f, category: newName }
            : f
        );
        fixedExpensesRef.current = nextFixed;
        setFixedExpenses(nextFixed);
      } else {
        const nextIncomes = incomesRef.current.map((i) =>
          (i.category || '').trim().toLowerCase() === oldLower
            ? { ...i, category: newName }
            : i
        );
        incomesRef.current = nextIncomes;
        setIncomes(nextIncomes);
      }

      const nextTxs = transactionsRef.current.map((tx) => {
        const txKind = tx.type === 'income' ? 'income' : 'expense';
        if (
          txKind === kind &&
          (tx.category || '').trim().toLowerCase() === oldLower
        ) {
          return { ...tx, category: newName };
        }
        return tx;
      });
      transactionsRef.current = nextTxs;
      setTransactions(nextTxs);

      saveCachedAppState({
        incomes: incomesRef.current,
        fixedExpenses: fixedExpensesRef.current,
        transactions: transactionsRef.current,
      });
    },
    []
  );

  const handleUpdateFixed = async (updated: FixedExpenseItem) => {
    const existing = fixedExpensesRef.current.find((f) => f.id === updated.id);
    const rootOriginalName = existing?.originalName || existing?.name || updated.name;

    unDismissFixedMerchant(updated.name, rootOriginalName);

    const logo = updated.logo || getLogoUrl(updated.name, updated.category);
    const validId = ensureValidUuid(
      updated.id,
      `fixed:${userId || userIdRef.current || 'local'}:${normalizeMerchantKey(rootOriginalName)}:${updated.amount}`
    );
    unmarkFixedIdDeleted(validId);

    saveManualFixedOverride(
      updated.name,
      {
        amount: updated.amount,
        isShared: updated.isShared,
        fullAmount: updated.fullAmount,
        dueDay: updated.dueDay,
        category: updated.category,
        paymentMethod: updated.paymentMethod,
        name: updated.name,
        receipts: updated.receipts,
        linkedAliases: updated.linkedAliases,
        linkedGoalId: updated.linkedGoalId,
        isCancelled: updated.isCancelled,
        hasNoMorePayments: updated.hasNoMorePayments,
        lastPaymentDate: updated.lastPaymentDate,
      },
      rootOriginalName,
      validId,
      true
    );

    const itemWithLogo: FixedExpenseItem = {
      ...updated,
      id: validId,
      originalName: rootOriginalName,
      logo,
    };

    const nextFixed = fixedExpensesRef.current
      .map((f) => (f.id === updated.id ? itemWithLogo : f))
      .sort((a, b) => a.dueDay - b.dueDay);
    fixedExpensesRef.current = nextFixed;
    setFixedExpenses(nextFixed);
    setSelectedFixedExpense((prev) =>
      prev && prev.id === updated.id ? itemWithLogo : prev
    );

    const aliases = getMerchantAliases();
    const nextTxs = transactionsRef.current.map((tx) =>
      sanitizeTransactionItem(tx, nextFixed, incomesRef.current, aliases)
    );
    transactionsRef.current = nextTxs;
    setTransactions(nextTxs);

    saveCachedAppState({
      ...(userIdRef.current ? { userId: userIdRef.current } : {}),
      fixedExpenses: nextFixed,
      transactions: nextTxs,
    });
    syncAllUserPreferencesToSupabase(true);

    const activeUid = userId || userIdRef.current;
    if (activeUid) {
      void dataService
        .saveFixedExpense(activeUid, {
          id: itemWithLogo.id,
          name: itemWithLogo.name,
          originalName: itemWithLogo.originalName,
          amount: itemWithLogo.amount,
          isShared: itemWithLogo.isShared,
          fullAmount: itemWithLogo.fullAmount,
          receiptUrl: itemWithLogo.receiptUrl,
          receiptName: itemWithLogo.receiptName,
          deductionDay: itemWithLogo.dueDay,
          category: itemWithLogo.category,
          paymentMethod: itemWithLogo.paymentMethod || 'Autogiro',
          frequency: Frequency.MONTHLY,
          logo,
          isCancelled: itemWithLogo.isCancelled,
          hasNoMorePayments: itemWithLogo.hasNoMorePayments,
          lastPaymentDate: itemWithLogo.lastPaymentDate,
        })
        .catch(() => {});
    }
  };

  // Räkningar som varierar (el m.m.): uppskattning från de 3 senaste dragningarna
  useVariableBillEstimates({
    fixedExpenses,
    transactions,
    period,
    periodRecurringMatches,
    hasActiveBankConnection,
    onUpdateFixed: handleUpdateFixed,
  });

  const handleDeleteFixed = async (id: string) => {
    const item = fixedExpensesRef.current.find((f) => f.id === id);
    markFixedIdDeleted(id);
    const nextFixed = fixedExpensesRef.current.filter((f) => f.id !== id);
    const hasRemainingSameMerchant = item
      ? findAllMatchingFixedExpensesByMerchant(
          { title: item.originalName || item.name, rawDescription: item.name },
          nextFixed
        ).length > 0
      : false;

    const namesToDelete: string[] = [];
    if (item && !hasRemainingSameMerchant) {
      dismissFixedMerchant(item.name, item.originalName);
      namesToDelete.push(item.name);
      if (item.originalName) namesToDelete.push(item.originalName);
    }
    fixedExpensesRef.current = nextFixed;
    setFixedExpenses(nextFixed);
    saveCachedAppState({
      ...(userIdRef.current ? { userId: userIdRef.current } : {}),
      fixedExpenses: nextFixed,
    });
    syncAllUserPreferencesToSupabase(true);

    const activeUid = userId || userIdRef.current;
    if (activeUid) {
      void dataService.deleteFixedExpense(id, activeUid, namesToDelete).catch(() => {});
    }
  };

  const handleAddTransaction = async (data: Omit<TransactionItem, 'id'>) => {
    const logo = data.logo || getLogoUrl(data.title, data.category);
    const aliases = getMerchantAliases();
    const newId = 'tx-' + Date.now();
    saveTransactionMeta(newId, {
      originalTitle: data.originalTitle || data.title,
      ...(data.receiptUrl || (data.receipts && data.receipts.length > 0)
        ? {
            receiptUrl: data.receiptUrl,
            receiptName: data.receiptName,
            receipts: data.receipts,
          }
        : {}),
    });
    const newItem: TransactionItem = sanitizeTransactionItem(
      { ...data, originalTitle: data.originalTitle || data.title, logo, id: newId },
      fixedExpensesRef.current,
      incomesRef.current,
      aliases
    );
    const nextTxs = [newItem, ...transactionsRef.current];
    transactionsRef.current = nextTxs;
    setTransactions(nextTxs);
    saveCachedAppState({ transactions: nextTxs });

    if (userId) {
      await dataService
        .addTransaction(userId, {
          amount: newItem.amount,
          category: newItem.category,
          merchant: newItem.title,
          note: newItem.note,
          tags: [],
          timestamp: new Date(newItem.date).getTime() || Date.now(),
          type: 'expense',
          logo: newItem.logo,
        })
        .catch(() => {});
    }
  };

  const handleUpdateTransaction = async (
    updated: TransactionItem,
    applyToSimilarIds?: string[],
    options?: {
      renameScope?: 'single' | 'same-merchant' | 'chain';
      renameTargetIds?: string[];
      categoryTargetIds?: string[];
    }
  ) => {
    const existing = transactionsRef.current.find((t) => t.id === updated.id);
    const existingMeta = getTransactionMetaMap()[updated.id];
    const rootOriginalTitle =
      existing?.originalTitle ||
      existingMeta?.originalTitle ||
      existing?.title ||
      updated.originalTitle ||
      updated.title;
    const titleChanged = Boolean(
      existing && existing.title.toLowerCase().trim() !== updated.title.toLowerCase().trim()
    );
    const categoryChanged = Boolean(existing && existing.category !== updated.category);

    const renameScope = options?.renameScope || 'single';
    const renameSet = new Set<string>(
      titleChanged && renameScope !== 'single' ? options?.renameTargetIds || [] : []
    );
    const categorySet = new Set<string>(
      options?.categoryTargetIds || (!titleChanged && applyToSimilarIds ? applyToSimilarIds : [])
    );

    // 1. Om användaren valt att byta namn bakåt i tiden och framåt i tiden ('same-merchant' eller 'chain')
    if (titleChanged && (renameScope === 'same-merchant' || renameScope === 'chain') && existing) {
      removeMerchantAliasForSources([
        existing.title,
        existing.originalTitle,
        existing.counterpartyName,
        existing.rawDescription,
      ]);
      saveMerchantAlias(existing.title, updated.title, updated.category);
      if (existing.counterpartyName) {
        saveMerchantAlias(existing.counterpartyName, updated.title, updated.category);
      }
      if (existing.rawDescription) {
        saveMerchantAlias(existing.rawDescription, updated.title, updated.category);
      }
      for (const tx of transactionsRef.current) {
        if (renameSet.has(tx.id) || tx.id === updated.id) {
          const txMeta = getTransactionMetaMap()[tx.id];
          const txOriginalTitle =
            tx.originalTitle || txMeta?.originalTitle || tx.title;
          removeMerchantAliasForSources([
            tx.title,
            tx.originalTitle,
            tx.counterpartyName,
            tx.rawDescription,
          ]);
          saveMerchantAlias(tx.title, updated.title, updated.category);
          if (tx.counterpartyName) {
            saveMerchantAlias(tx.counterpartyName, updated.title, updated.category);
          }
          if (tx.rawDescription) {
            saveMerchantAlias(tx.rawDescription, updated.title, updated.category);
          }
          saveTransactionMeta(tx.id, {
            originalTitle: txOriginalTitle,
            customTitle: updated.title,
            ...(categoryChanged ? { customCategory: updated.category } : {}),
          });
        }
      }
    }

    // 2. Om användaren ändrar KATEGORI bakåt och framåt i tiden, spara regeln för både befintliga och framtida transaktioner
    if (categoryChanged && (categorySet.size > 0 || renameScope !== 'single') && existing) {
      const targetTitle = titleChanged && renameScope !== 'single' ? updated.title : existing.title;
      saveMerchantAlias(existing.title, targetTitle, updated.category);
      if (existing.counterpartyName) {
        saveMerchantAlias(existing.counterpartyName, targetTitle, updated.category);
      }
      if (existing.rawDescription) {
        saveMerchantAlias(existing.rawDescription, targetTitle, updated.category);
      }
      for (const tx of transactionsRef.current) {
        if (categorySet.has(tx.id)) {
          const keepTitle =
            tx.id === updated.id || renameSet.has(tx.id) ? updated.title : tx.title;
          saveTransactionMeta(tx.id, { customCategory: updated.category });
          saveMerchantAlias(tx.title, keepTitle, updated.category);
          if (tx.counterpartyName) {
            saveMerchantAlias(tx.counterpartyName, keepTitle, updated.category);
          }
          if (tx.rawDescription) {
            saveMerchantAlias(tx.rawDescription, keepTitle, updated.category);
          }
        }
      }
    }

    // 3. Spara per-transaktions-metadata för den redigerade transaktionen först så sanitizeTransactionItem respekterar customTitle/customCategory
    const nextCustomTitle = titleChanged
      ? updated.title
      : existingMeta?.customTitle;
    const nextCustomCategory = categoryChanged
      ? updated.category
      : existingMeta?.customCategory;

    saveTransactionMeta(updated.id, {
      originalTitle: rootOriginalTitle,
      ...(nextCustomTitle ? { customTitle: nextCustomTitle } : {}),
      ...(nextCustomCategory ? { customCategory: nextCustomCategory } : {}),
      isHearted: updated.isHearted,
      isWaitingForPackage: updated.isWaitingForPackage,
      isWaitingForSwish: updated.isWaitingForSwish,
      pendingSwishAmount: updated.pendingSwishAmount,
      pendingSwishRecipient: updated.pendingSwishRecipient,
      receiptUrl: updated.receiptUrl,
      receiptName: updated.receiptName,
      receipts: updated.receipts,
      paymentMethod: updated.paymentMethod,
      note: updated.note,
      customAmount:
        updated.originalAmount !== undefined &&
        updated.originalAmount > updated.amount
          ? updated.amount
          : undefined,
      originalAmount: updated.originalAmount,
      linkedSwishTxId: updated.linkedSwishTxId,
    });

    const logo = updated.logo || getLogoUrl(updated.title, updated.category);
    const aliases = getMerchantAliases();
    const itemWithLogo: TransactionItem = sanitizeTransactionItem(
      { ...updated, originalTitle: rootOriginalTitle, logo },
      fixedExpensesRef.current,
      incomesRef.current,
      aliases
    );

    setTransactions((prev) => {
      const exists = prev.some((t) => t.id === itemWithLogo.id);
      const next = exists
        ? prev.map((t) => {
            if (t.id === itemWithLogo.id) return itemWithLogo;
            const shouldRename = renameSet.has(t.id);
            const shouldRecategorize = categorySet.has(t.id);
            if (shouldRename || shouldRecategorize) {
              const nextTitle = shouldRename ? itemWithLogo.title : t.title;
              const nextCat = shouldRecategorize ? itemWithLogo.category : t.category;
              return {
                ...t,
                title: nextTitle,
                category: nextCat,
                logo: getLogoUrl(nextTitle, nextCat) || t.logo,
              };
            }
            return t;
          })
        : [itemWithLogo, ...prev];
      transactionsRef.current = next;
      saveCachedAppState({ transactions: next });
      return next;
    });
    setSelectedTransaction(itemWithLogo);
    syncAllUserPreferencesToSupabase();

    if (renameScope !== 'single' && renameSet.size > 1) {
      showFeedbackToast({
        id: `bulk-rename-${updated.id}`,
        title: 'Uppdaterat bakåt & framåt i tiden',
        subtitle: `Sparades för ${renameSet.size} transaktioner med "${updated.title}"`,
      });
    } else if (categorySet.size > 1) {
      showFeedbackToast({
        id: `bulk-cat-${updated.id}`,
        title: 'Kategori uppdaterad',
        subtitle: `Ändrades till ${updated.category} för ${categorySet.size} transaktioner`,
      });
    }

    if (userId && !itemWithLogo.id.startsWith('bank-') && !itemWithLogo.id.startsWith('inc-')) {
      await dataService
        .updateTransaction(itemWithLogo.id, {
          amount: itemWithLogo.amount,
          category: itemWithLogo.category,
          merchant: itemWithLogo.title,
          note: itemWithLogo.note,
          tags: [],
          timestamp: new Date(itemWithLogo.date).getTime() || Date.now(),
          type: itemWithLogo.type || 'expense',
          logo,
        })
        .catch(() => {});
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== id);
      transactionsRef.current = next;
      saveCachedAppState({ transactions: next });
      return next;
    });
    if (id.startsWith('inc-')) {
      setDismissedTxIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
    if (userId && !id.startsWith('bank-') && !id.startsWith('inc-')) {
      await dataService.deleteTransaction(id).catch(() => {});
    }
  };

  const handleExcludeTransaction = async (
    id: string,
    exclude: boolean,
    skipToast?: boolean
  ) => {
    const targetTx = transactionsRef.current.find((t) => t.id === id);
    if (!skipToast && targetTx) {
      if (undoTimerRef.current) {
        window.clearTimeout(undoTimerRef.current);
      }
      setUndoToast({
        id,
        excluded: exclude,
        title: targetTx.title || 'Köpet',
      });
      undoTimerRef.current = window.setTimeout(() => {
        setUndoToast(null);
      }, 4500);
    }

    setTransactionExcludedState(id, exclude);
    if (id.startsWith('bank-')) {
      setTransactionExcludedState(id.replace(/^bank-/, ''), exclude);
    }
    setTransactions((prev) => {
      const next = prev.map((t) =>
        t.id === id
          ? {
              ...t,
              isExcluded: exclude,
              reconciliationStatus: exclude ? 'excluded' : 'unprocessed',
            }
          : t
      );
      transactionsRef.current = next;
      saveCachedAppState({ transactions: next });
      return next;
    });
    setSelectedTransaction((prev) =>
      prev && prev.id === id
        ? {
            ...prev,
            isExcluded: exclude,
            reconciliationStatus: exclude ? 'excluded' : 'unprocessed',
          }
        : prev
    );
    if (id.startsWith('bank-')) {
      const bankTxId = id.replace(/^bank-/, '');
      await bankService
        .updateTransactionReconciliation(bankTxId, {
          reconciliation_status: exclude ? 'excluded' : 'unprocessed',
        })
        .catch(() => {});
      refreshBankStatus();
    }
  };

  const handleSignOut = async () => {
    try {
      localStorage.setItem('dejz_logged_out', 'true');
      localStorage.removeItem('dejz_onboarding_in_progress');
      localStorage.removeItem('dejz_onboarding_step');
      localStorage.removeItem('dejz_user_name');
      localStorage.removeItem('dejz_user_email');
    } catch {
      // ignore
    }
    cancelPendingPreferenceSync();
    clearCachedAppState();
    clearAllLocalAppData(false);
    userIdRef.current = null;
    lastHydratedUserIdRef.current = null;
    incomesRef.current = [];
    fixedExpensesRef.current = [];
    transactionsRef.current = [];
    setUserId(null);
    setUserEmail(null);
    setUserName(null);
    setUserAvatar(null);
    setConnections([]);
    setBankAccounts([]);
    setIncomes([]);
    setFixedExpenses([]);
    setTransactions([]);
    setActiveTab('home');
    setSettingsSubView(null);
    await supabase.auth.signOut().catch(() => {});
    setShowLanding(true);
    setIsOnboardingActive(false);
  };

  const handleDeleteAccount = async () => {
    const uidFromState = userId || userIdRef.current;
    const emailFromState = userEmail;
    const connsToDisconnect = [...connections];

    // 1. Stoppa omedelbart alla pågående bakgrundssynkningar och förhindra återskapande
    isDeletingAccountRef.current = true;
    pendingRefreshRef.current = false;
    cancelPendingPreferenceSync();

    // 2. Töm minnes-refs omedelbart så att inga pågående effekter kan läsa eller återskapa gammal data
    incomesRef.current = [];
    fixedExpensesRef.current = [];
    transactionsRef.current = [];
    aiCleanedKeysRef.current.clear();

    const withFastTimeout = <T,>(promise: Promise<T>, ms = 3000): Promise<T | null> =>
      Promise.race([
        promise.catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
      ]);

    try {
      // Hämta session och Bearer-token FÖRST innan localStorage rensas eller signOut körs
      const sessionRes: any = await withFastTimeout(supabase.auth.getSession(), 1500);
      const session = sessionRes?.data?.session || null;
      const token = session?.access_token || null;
      const sessionUid = session?.user?.id || null;
      const stateUid =
        uidFromState && uidFromState !== 'demo-user' && uidFromState !== 'preview-user'
          ? uidFromState
          : null;
      const primaryUid = sessionUid || stateUid;
      const emailToDelete = session?.user?.email || emailFromState || null;

      // 3. Starta frånkoppling av Enable Banking-sessioner i bakgrunden (utan att blockera raderingen)
      if (connsToDisconnect.length > 0 && primaryUid) {
        connsToDisconnect
          .filter((c) => c.status !== 'revoked')
          .forEach((c) => {
            bankService.disconnect(c.id).catch(() => {});
          });
      }

      // 4. Kör server-side permanent radering (med 4s timeout) – kör klient-fallback endast om servern ej nås
      let serverDeleted = false;
      if (primaryUid || emailToDelete) {
        const res = await withFastTimeout(
          fetch('/api/auth/delete-account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              userId: primaryUid,
              secondaryUserId: stateUid,
              email: emailToDelete,
            }),
          }),
          4000
        );
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success && !data?.localOnly) {
            serverDeleted = true;
          }
        }
      }

      if (!serverDeleted && primaryUid) {
        await withFastTimeout(
          Promise.allSettled([
            dataService.deleteAllUserData(primaryUid, true),
            bankService.deleteAccount(),
          ]),
          3000
        );
      }
    } catch (err) {
      console.error('Error during account deletion:', err);
    } finally {
      // 5. Logga ut lokalt direkt (utan att vänta på nätverksanrop mot redan raderad auth.users-post) och rensa all lokal lagring
      await withFastTimeout(supabase.auth.signOut({ scope: 'local' }), 800);
      clearAllLocalAppData(false);

      userIdRef.current = null;
      lastHydratedUserIdRef.current = null;
      incomesRef.current = [];
      fixedExpensesRef.current = [];
      transactionsRef.current = [];
      aiCleanedKeysRef.current.clear();

      setUserId(null);
      setUserEmail(null);
      setUserName(null);
      setUserAvatar(null);
      setConnections([]);
      setBankAccounts([]);
      setIncomes([]);
      setFixedExpenses([]);
      setTransactions([]);
      setDismissedTxIds([]);
      setTargetPayday(25);
      setWeekendHandling('before');
      setSettingsSubView('main');
      setActiveTab('home');
      setIsOnboardingActive(false);
      setShowLanding(true);
      setTimeout(() => {
        isDeletingAccountRef.current = false;
      }, 1000);
    }
  };

  const handleResetAccount = async () => {
    const activeUid = userId || userIdRef.current;
    const connsToDisconnect = [...connections];

    // 1. Stoppa omedelbart alla pågående bakgrundssynkningar och Realtime-uppdateringar
    // så att fasta utgifter aldrig kan återskapas under eller direkt efter nollställningen
    isDeletingAccountRef.current = true;
    pendingRefreshRef.current = false;
    cancelPendingPreferenceSync();

    // 2. Töm minnes-refs och React-state direkt så att inga gamla poster ligger kvar i minnet
    incomesRef.current = [];
    fixedExpensesRef.current = [];
    transactionsRef.current = [];
    aiCleanedKeysRef.current.clear();

    setIncomes([]);
    setFixedExpenses([]);
    setTransactions([]);
    setDismissedTxIds([]);
    setConnections([]);
    setBankAccounts([]);

    const withFastTimeout = <T,>(promise: Promise<T>, ms = 3000): Promise<T | null> =>
      Promise.race([
        promise.catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
      ]);

    try {
      if (activeUid && activeUid !== 'demo-user' && activeUid !== 'preview-user') {
        const sessionRes: any = await withFastTimeout(supabase.auth.getSession(), 1500);
        const token = sessionRes?.data?.session?.access_token;

        // Koppla från bank i bakgrunden så det inte låser nollställningen
        if (connsToDisconnect.length > 0) {
          connsToDisconnect
            .filter((c) => c.status !== 'revoked')
            .forEach((c) => {
              bankService.disconnect(c.id).catch(() => {});
            });
        }

        const res = await withFastTimeout(
          fetch('/api/auth/reset-account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ userId: activeUid }),
          }),
          3500
        );

        let serverReset = false;
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success && !data?.localOnly) {
            serverReset = true;
          }
        }

        if (!serverReset) {
          await withFastTimeout(dataService.deleteAllUserData(activeUid), 3000);
        }
      } else if (activeUid) {
        await withFastTimeout(dataService.deleteAllUserData(activeUid), 2000);
      }
    } catch (err) {
      console.error('Error during account reset:', err);
    } finally {
      clearAllLocalAppData(true); // Behåll tema och inloggningssession

      incomesRef.current = [];
      fixedExpensesRef.current = [];
      transactionsRef.current = [];
      aiCleanedKeysRef.current.clear();

      setIncomes([]);
      setFixedExpenses([]);
      setTransactions([]);
      setDismissedTxIds([]);
      setConnections([]);
      setBankAccounts([]);

      // Skriv över app-cachen med tom data så den inte återuppstår vid refresh
      if (activeUid) {
        saveCachedAppState({
          userId: activeUid,
          incomes: [],
          fixedExpenses: [],
          transactions: [],
          connections: [],
          bankAccounts: [],
        });
      }

      try {
        localStorage.setItem('dejz_onboarding_v2_done', 'true');
        localStorage.removeItem('dejz_onboarding_in_progress');
        localStorage.removeItem('dejz_onboarding_step');
      } catch {
        // ignore
      }

      setSettingsSubView('main');
      setActiveTab('home');
      setCallbackStatusMsg('Kontot har nollställts och du kan börja om på nytt.');
      setTimeout(() => setCallbackStatusMsg(null), 4000);
      setTimeout(() => {
        isDeletingAccountRef.current = false;
      }, 1500);
    }
  };

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
