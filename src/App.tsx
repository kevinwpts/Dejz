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
import { Heart, Package, Paperclip, FileText, Eye, CheckCircle, X } from '@phosphor-icons/react';
import { BankModal } from './components/modals/BankModal';
import { IncomeModal } from './components/modals/IncomeModal';
import { FixedExpenseModal } from './components/modals/FixedExpenseModal';
import { TransactionModal } from './components/modals/TransactionModal';
import { AuthModal } from './components/modals/AuthModal';
import { SetNewPasswordSheet } from './components/SetNewPasswordSheet';
import { FeedbackSheet } from './components/FeedbackSheet';
import { flushPendingMarketingConsent } from './utils/marketingConsent';
import { startActivityTracking } from './utils/activity';
import { isDemoMode } from './utils/demoUtils';
import { SearchModal } from './components/modals/SearchModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { PullToRefresh } from './components/ui/PullToRefresh';
import { BottomSheet } from './components/ui/BottomSheet';
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
import { seedDemoData } from './utils/demoData';
import { Frequency } from './types';
import { getLogoUrl, saveLearnedBrandDomain } from './utils/logo';
import {
  analyzeBankTransactionsForOnboarding,
  extractSwishPhoneNumber,
  formatBankAccountNumber,
  getBankAccountTitle,
  needsAiMerchantCleaning,
} from './utils/bankHistoryAnalyzer';
import { deduplicateTransactions } from './utils/transactionDedup';
import {
  formatIsoDateStockholm,
  formatIsoTimeStockholm,
  formatSwedishDateHeading,
  getItemReceipts,
  getSwedishDateStr,
} from './utils/swedishDate';
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
  resolveMerchantAlias,
  removeMerchantAliasForSources,
  isGenericPlaceholderMerchant,
  normalizeMerchantKey,
  ensureValidUuid,
  normalizeCategoryToValid,
  propagateCategoryChangeInCache,
  hydrateAllUserPreferencesFromProfile,
  extractSavedFixedFromProfile,
  extractSavedIncomesFromProfile,
  getTransactionMetaMap,
  saveTransactionMeta,
  getAccountMetaMap,
  saveAccountMeta,
  syncAllUserPreferencesToSupabase,
  cancelPendingPreferenceSync,
  clearAllLocalAppData,
  getStoredExpenseCategories,
  getStoredIncomeCategories,
  getManualBalance,
  setManualBalance,
  ManualBalance,
  getSavingsGoals,
  saveSavingsGoals,
  resolveSwishPhoneToName,
  saveSwishPhoneDirectoryEntry,
} from './utils/appCache';
import { findInternalTransferIds, isInternalTransferTransaction } from './utils/transferDetection';
import {
  checkIsRecurringTransaction,
  findMatchingFixedExpense,
  findMatchingIncome,
  findAllMatchingFixedExpensesByMerchant,
  reconcilePeriodRecurringMatches,
} from './utils/recurring';
import { estimateVariableBill } from './utils/variableBills';
import {
  computeDagsbudget,
  computeKvar,
  computeKvarFromBalance,
  computeTotalFixed,
  computeTotalIncome,
  computeVariableSpent,
} from './utils/budgetEngine';

import { sanitizeTransactionItem, mapBankTransactionsToAppItems } from './app/transactionMapping';
import { getPayDatesForIncome } from './app/incomeSchedule';
import { reconcileFixedExpensesList, reconcileIncomesList } from './app/reconcileLists';

const AUTO_SYNC_COOLDOWN_MS = 15 * 60 * 1000; // Minst 15 min mellan automatiska bakgrundssynkningar (PSD2-vänlig kvot, manuell synk körs alltid direkt)
const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000; // Bakgrundskontroll var 15:e minut när användaren är aktiv i appen

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

  interface FeedbackToastState {
    id: string;
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onAction?: () => void;
    undoLabel?: string;
    onUndo?: () => void;
  }
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

  // Tyst AI-tvätt i bakgrunden för kryptiska/okända bankrader (t.ex. ZETTLE*GBG KAF, NYX*SVENSKA, KLARNA*84920)
  const aiCleanedKeysRef = useRef<Set<string>>(new Set());
  const aiCleanInFlightRef = useRef<boolean>(false);

  useEffect(() => {
    if (aiCleanInFlightRef.current || transactions.length === 0) return;

    const currentAliases = getMerchantAliases();
    const candidatesByKey = new Map<
      string,
      { key: string; rawText: string; amount: number; time: string; type: 'expense' | 'income' }
    >();

    for (const tx of transactions) {
      if (!tx || tx.isExcluded) continue;
      const rawSource = (
        tx.rawDescription ||
        tx.counterpartyName ||
        tx.note ||
        tx.title ||
        ''
      ).trim();
      if (!rawSource || rawSource.length < 2) continue;

      const normKey = normalizeMerchantKey(rawSource);
      if (!normKey || aiCleanedKeysRef.current.has(normKey)) continue;

      // Hoppa över om användaren eller tidigare AI-körning redan har sparat ett alias
      if (resolveMerchantAlias(rawSource, currentAliases)) {
        aiCleanedKeysRef.current.add(normKey);
        continue;
      }

      // Hoppa över om den matchar en fast utgift eller fast inkomst
      if (
        tx.type !== 'income' &&
        fixedExpensesRef.current.length > 0 &&
        findMatchingFixedExpense(tx, fixedExpensesRef.current)
      ) {
        aiCleanedKeysRef.current.add(normKey);
        continue;
      }
      if (
        tx.type === 'income' &&
        incomesRef.current.length > 0 &&
        findMatchingIncome(tx, incomesRef.current)
      ) {
        aiCleanedKeysRef.current.add(normKey);
        continue;
      }

      const isUncategorizedOrMissingLogo =
        tx.category === 'Övrigt' ||
        !getLogoUrl(tx.title, tx.category) ||
        needsAiMerchantCleaning(rawSource, tx.title, tx.category);

      if (isUncategorizedOrMissingLogo) {
        if (!candidatesByKey.has(normKey)) {
          candidatesByKey.set(normKey, {
            key: normKey,
            rawText: rawSource,
            amount: tx.amount,
            time: getTransactionTime(tx),
            type: tx.type === 'income' ? 'income' : 'expense',
          });
        }
      } else {
        aiCleanedKeysRef.current.add(normKey);
      }
    }

    if (candidatesByKey.size === 0) return;

    const batchItems = Array.from(candidatesByKey.values()).slice(0, 35);
    for (const item of batchItems) {
      aiCleanedKeysRef.current.add(item.key);
    }

    aiCleanInFlightRef.current = true;
    const expenseCategories = getStoredExpenseCategories().map((c) => c.name);
    const incomeCategories = getStoredIncomeCategories().map((c) => c.name);

    fetch('/api/ai/clean-merchants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: batchItems,
        expenseCategories,
        incomeCategories,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (
          isDeletingAccountRef.current ||
          !userIdRef.current ||
          !data ||
          !Array.isArray(data.results) ||
          data.results.length === 0
        ) {
          return;
        }

        let anySaved = false;
        for (const resItem of data.results) {
          const orig = candidatesByKey.get(resItem.key);
          if (!orig) continue;
          const cleanTrimmed = String(resItem.cleanName || '').trim();
          const domainTrimmed = String(resItem.domain || '').trim();
          if (isGenericPlaceholderMerchant(orig.rawText)) {
            continue;
          }
          const validCat = normalizeCategoryToValid(
            resItem.category,
            orig.type
          );
          // Spara inlärd domän (för företagslogga) och kategori utan att skriva över bankens transaktionsnamn!
          if (domainTrimmed || (validCat && validCat !== 'Övrigt')) {
            saveLearnedBrandDomain(orig.rawText, domainTrimmed, validCat);
            if (cleanTrimmed) {
              saveLearnedBrandDomain(cleanTrimmed, domainTrimmed, validCat);
            }
            anySaved = true;
          }
        }

        if (anySaved && !isDeletingAccountRef.current && userIdRef.current) {
          const updatedAliases = getMerchantAliases();
          setTransactions((prev) => {
            const next = deduplicateTransactions(
              prev.map((t) =>
                sanitizeTransactionItem(
                  t,
                  fixedExpensesRef.current,
                  incomesRef.current,
                  updatedAliases
                )
              )
            );
            saveCachedAppState({ transactions: next });
            return next;
          });
        }
      })
      .catch(() => {
        // Ignorera nätverksfel tyst i bakgrunden
      })
      .finally(() => {
        aiCleanInFlightRef.current = false;
      });
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

  // Ladda Enable Banking status + banktransaktioner och synka atomärt med befintligt state
  const refreshBankStatus = useCallback(async (): Promise<{
    connections: BankConnection[];
    accounts: BankAccount[];
  }> => {
    if (!userIdRef.current || isDeletingAccountRef.current) {
      return { connections: [], accounts: [] };
    }
    if (refreshInFlightRef.current) {
      pendingRefreshRef.current = true;
      return refreshInFlightRef.current;
    }

    const runRefresh = async (): Promise<{
      connections: BankConnection[];
      accounts: BankAccount[];
    }> => {
      const requestedUid = userIdRef.current;
      if (!requestedUid || isDeletingAccountRef.current) {
        return { connections: [], accounts: [] };
      }
      try {
        const [status, bankTxs] = await Promise.all([
          bankService.getStatus(),
          bankService.listAllTransactionsForReconciliation(5000).catch(() => []),
        ]);
        const activeUid = userIdRef.current;
        if (!activeUid || isDeletingAccountRef.current || activeUid !== requestedUid) {
          return { connections: [], accounts: [] };
        }

        const conns = status.connections || [];
        const accs = status.accounts || [];
        const hasActiveConns = conns.some((c) => c.status !== 'revoked');

        if (hasActiveConns && Array.isArray(bankTxs) && bankTxs.length > 0) {
          const analyzed = analyzeBankTransactionsForOnboarding(
            bankTxs,
            targetPayday,
            weekendHandling === 'before',
            accs
          );

          const reconciledInc = reconcileIncomesList({
            currentList: incomesRef.current,
            detectedList: analyzed.detectedIncomes,
            targetPayday,
            uid: activeUid,
          });

          const reconciledFix = reconcileFixedExpensesList({
            currentList: fixedExpensesRef.current,
            detectedList: analyzed.detectedFixedExpenses,
            uid: activeUid,
          });

          const aliases = getMerchantAliases();
          const prevMap = new Map(transactionsRef.current.map((t) => [t.id, t]));
          const uniqueBankTxs = mapBankTransactionsToAppItems(
            bankTxs,
            accs,
            reconciledFix.items,
            reconciledInc.items,
            aliases
          ).map((tx) => {
            const prev = prevMap.get(tx.id);
            if (!prev) return tx;
            return {
              ...tx,
              isHearted: prev.isHearted ?? tx.isHearted,
              isWaitingForPackage: prev.isWaitingForPackage ?? tx.isWaitingForPackage,
              receiptUrl: prev.receiptUrl ?? tx.receiptUrl,
              receiptName: prev.receiptName ?? tx.receiptName,
              receipts: prev.receipts ?? tx.receipts,
              note: prev.note ?? tx.note,
            };
          });

          const nonBankPrev = transactionsRef.current
            .filter((p) => !p.id.startsWith('bank-'))
            .map((t) =>
              sanitizeTransactionItem(t, reconciledFix.items, reconciledInc.items, aliases)
            );

          const combinedTxs = deduplicateTransactions([...uniqueBankTxs, ...nonBankPrev]);
          combinedTxs.sort(compareTransactionsChronologically);

          if (!userIdRef.current || isDeletingAccountRef.current || userIdRef.current !== activeUid) {
            return { connections: [], accounts: [] };
          }

          // Uppdatera samtliga states i ett enda atomärt steg (inget hoppande eller flimmer)
          incomesRef.current = reconciledInc.items;
          fixedExpensesRef.current = reconciledFix.items;
          transactionsRef.current = combinedTxs;

          setConnections(conns);
          setBankAccounts(accs);
          setIncomes(reconciledInc.items);
          setFixedExpenses(reconciledFix.items);
          setTransactions(combinedTxs);
          setIsInitialLoading(false);

          saveCachedAppState({
            userId: activeUid,
            connections: conns,
            bankAccounts: accs,
            incomes: reconciledInc.items,
            fixedExpenses: reconciledFix.items,
            transactions: combinedTxs,
            targetPayday,
            weekendHandling,
          });

          // Spara eventuella nyupptäckta fasta poster till Supabase i bakgrunden så DB och cache alltid matchar
          if (activeUid && !isDeletingAccountRef.current) {
            for (const item of reconciledFix.toPersist) {
              dataService
                .saveFixedExpense(activeUid, {
                  id: item.id,
                  name: item.name,
                  originalName: item.originalName,
                  amount: item.amount,
                  deductionDay: item.dueDay,
                  category: item.category,
                  paymentMethod: item.paymentMethod || 'Autogiro',
                  frequency: Frequency.MONTHLY,
                  logo: item.logo,
                })
                .catch(() => {});
            }
            for (const inc of reconciledInc.toPersist) {
              dataService
                .saveIncomeSource(activeUid, {
                  id: inc.id,
                  name: inc.name,
                  originalName: inc.originalName,
                  amount: inc.amount,
                  deductionDay: inc.payday,
                  category: inc.category,
                  frequency: Frequency.MONTHLY,
                  logo: inc.logo,
                })
                .catch(() => {});
            }
          }
        } else {
          if (!userIdRef.current || isDeletingAccountRef.current || userIdRef.current !== activeUid) {
            return { connections: [], accounts: [] };
          }
          setConnections(conns);
          setBankAccounts(accs);
          setIsInitialLoading(false);

          if (!hasActiveConns) {
            const nonBankOnly = transactionsRef.current.filter((p) => !p.id.startsWith('bank-'));
            if (nonBankOnly.length !== transactionsRef.current.length) {
              transactionsRef.current = nonBankOnly;
              setTransactions(nonBankOnly);
            }
            saveCachedAppState({
              userId: activeUid,
              connections: conns,
              bankAccounts: accs,
              transactions: nonBankOnly,
            });
          } else {
            saveCachedAppState({
              userId: activeUid,
              connections: conns,
              bankAccounts: accs,
            });
          }
        }

        return { connections: conns, accounts: accs };
      } catch {
        setIsInitialLoading(false);
        return { connections: [], accounts: [] };
      } finally {
        refreshInFlightRef.current = null;
        if (pendingRefreshRef.current && userIdRef.current && !isDeletingAccountRef.current) {
          pendingRefreshRef.current = false;
          void refreshBankStatus();
        } else {
          pendingRefreshRef.current = false;
        }
      }
    };

    const promise = runRefresh();
    refreshInFlightRef.current = promise;
    return promise;
  }, [targetPayday, weekendHandling]);

  // Atomär helhetshydrering av både Supabase-tabeller och Bankdata samtidigt vid appstart
  const loadSupabaseUserData = useCallback(
    async (
      uid: string
    ): Promise<{ connections: BankConnection[]; accounts: BankAccount[] }> => {
      if (!uid || isDeletingAccountRef.current) {
        return { connections: [], accounts: [] };
      }

      const cachedState = loadCachedAppState();
      const isDifferentUser =
        (lastHydratedUserIdRef.current !== null && lastHydratedUserIdRef.current !== uid) ||
        (cachedState?.userId !== undefined && cachedState.userId !== null && cachedState.userId !== uid);

      if (isDifferentUser) {
        incomesRef.current = [];
        fixedExpensesRef.current = [];
        transactionsRef.current = [];
        clearCachedAppState();
        clearAllLocalAppData(true);
      }
      lastHydratedUserIdRef.current = uid;

      try {
        const [
          dbIncomes,
          dbFixed,
          dbTxs,
          dbSettings,
          dbProfile,
          bankStatus,
          bankTxs,
        ] = await Promise.all([
          dataService.getIncomeSources(uid).catch(() => []),
          dataService.getFixedExpenses(uid).catch(() => []),
          dataService.getTransactions(uid).catch(() => []),
          dataService.getSettings(uid).catch(() => null),
          dataService.getProfile(uid).catch(() => null),
          bankService.getStatus().catch(() => ({ connections: [], accounts: [] })),
          bankService.listAllTransactionsForReconciliation(5000).catch(() => []),
        ]);

        if (isDeletingAccountRef.current || userIdRef.current !== uid) {
          return { connections: [], accounts: [] };
        }

        const conns = bankStatus.connections || [];
        const accs = bankStatus.accounts || [];
        const hasActiveConns = conns.some((c) => c.status !== 'revoked');
        const validBankTxs = hasActiveConns && Array.isArray(bankTxs) ? bankTxs : [];

        const resolvedPayday = dbSettings?.payday || targetPayday || 25;
        let resolvedWeekend: WeekendHandlingMode = weekendHandling;
        if (dbSettings?.paydayBeforeWeekend !== undefined) {
          const savedLocal = localStorage.getItem('dejz_weekend_handling');
          if (!savedLocal) {
            resolvedWeekend = dbSettings.paydayBeforeWeekend ? 'before' : 'none';
          }
        }

        if (dbSettings?.payday) {
          setTargetPayday(resolvedPayday);
        }
        if (resolvedWeekend !== weekendHandling) {
          setWeekendHandling(resolvedWeekend);
        }
        if (dbProfile) {
          hydrateAllUserPreferencesFromProfile(dbProfile);
          setExcludeInternalTransfersState(getExcludeInternalTransfers());
        }
        if (dbProfile?.avatar_url) {
          setUserAvatar(dbProfile.avatar_url);
        }

        const analyzed =
          validBankTxs.length > 0
            ? analyzeBankTransactionsForOnboarding(
                validBankTxs,
                resolvedPayday,
                resolvedWeekend === 'before',
                accs
              )
            : null;

        const profileSavedFixed = extractSavedFixedFromProfile(dbProfile);
        const profileSavedIncomes = extractSavedIncomesFromProfile(dbProfile);

        const localIncomesToMerge = !isDifferentUser
          ? [
              ...profileSavedIncomes,
              ...(cachedState?.incomes || []),
              ...incomesRef.current,
            ]
          : [...profileSavedIncomes];

        const localFixedToMerge = !isDifferentUser
          ? [
              ...profileSavedFixed,
              ...(cachedState?.fixedExpenses || []),
              ...fixedExpensesRef.current,
            ]
          : [...profileSavedFixed];

        const reconciledInc = reconcileIncomesList({
          currentList: localIncomesToMerge,
          dbList: dbIncomes,
          detectedList: analyzed?.detectedIncomes || null,
          targetPayday: resolvedPayday,
          uid,
        });

        const reconciledFix = reconcileFixedExpensesList({
          currentList: localFixedToMerge,
          dbList: dbFixed,
          detectedList: analyzed?.detectedFixedExpenses || null,
          uid,
        });

        const aliases = getMerchantAliases();

        const mappedDbTxs: TransactionItem[] = Array.isArray(dbTxs)
          ? dbTxs.map((t) => {
              const isIncome = t.type === 'income';
              const title =
                t.merchant || t.note || t.category || (isIncome ? 'Inkomst' : 'Utgift');
              const cat = t.category || (isIncome ? 'Inkomst' : 'Övrigt');
              const todayStr = getSwedishDateStr();
              let dateStr = formatIsoDateStockholm(t.timestamp);
              if (dateStr > todayStr) {
                dateStr = todayStr;
              }
              const explicitTime = t.timestamp ? formatIsoTimeStockholm(t.timestamp) : null;
              return sanitizeTransactionItem(
                {
                  id: t.id,
                  title,
                  amount: Math.abs(Number(t.amount) || 0),
                  type: isIncome ? ('income' as const) : ('expense' as const),
                  category: cat,
                  date: dateStr,
                  time:
                    explicitTime && explicitTime !== '00:00' && explicitTime !== '12:00'
                      ? explicitTime
                      : '',
                  createdAt: t.timestamp || undefined,
                  note: t.note,
                  logo: t.logo || getLogoUrl(title, cat),
                },
                reconciledFix.items,
                reconciledInc.items,
                aliases
              );
            })
          : [];

        const prevMap = new Map(transactionsRef.current.map((t) => [t.id, t]));
        const uniqueBankTxs =
          validBankTxs.length > 0
            ? mapBankTransactionsToAppItems(
                validBankTxs,
                accs,
                reconciledFix.items,
                reconciledInc.items,
                aliases
              ).map((tx) => {
                const prev = prevMap.get(tx.id);
                if (!prev) return tx;
                return {
                  ...tx,
                  isHearted: prev.isHearted ?? tx.isHearted,
                  isWaitingForPackage: prev.isWaitingForPackage ?? tx.isWaitingForPackage,
                  receiptUrl: prev.receiptUrl ?? tx.receiptUrl,
                  receiptName: prev.receiptName ?? tx.receiptName,
                  receipts: prev.receipts ?? tx.receipts,
                  note: prev.note ?? tx.note,
                };
              })
            : [];

        const combinedTxs = deduplicateTransactions([...uniqueBankTxs, ...mappedDbTxs]);
        combinedTxs.sort(compareTransactionsChronologically);

        if (isDeletingAccountRef.current || userIdRef.current !== uid) {
          return { connections: [], accounts: [] };
        }

        // Kontrollera om användaren har slutfört onboardingen eller ska fortsätta där de slutade
        const profilePrefs =
          dbProfile?.user_preferences && typeof dbProfile.user_preferences === 'object'
            ? dbProfile.user_preferences
            : {};
        const hasAnyExistingUserData =
          conns.length > 0 ||
          reconciledInc.items.length > 0 ||
          reconciledFix.items.length > 0 ||
          combinedTxs.length > 0;
        const explicitlyCompleted =
          profilePrefs.onboardingCompleted === true ||
          localStorage.getItem('dejz_onboarding_v2_done') === 'true' ||
          localStorage.getItem('dejz_onboarding_completed') === 'true';
        const explicitlyIncomplete =
          !explicitlyCompleted &&
          (profilePrefs.onboardingCompleted === false ||
            profilePrefs.onboardingInProgress === true ||
            localStorage.getItem('dejz_onboarding_in_progress') === 'true');

        if (!explicitlyCompleted && (explicitlyIncomplete || !hasAnyExistingUserData)) {
          try {
            localStorage.setItem('dejz_onboarding_in_progress', 'true');
            if (!localStorage.getItem('dejz_onboarding_step')) {
              localStorage.setItem(
                'dejz_onboarding_step',
                String(profilePrefs.onboardingStep || '1')
              );
            }
          } catch {
            // ignore
          }
          setIsOnboardingActive(true);
        } else {
          try {
            localStorage.setItem('dejz_onboarding_v2_done', 'true');
            localStorage.setItem('dejz_onboarding_completed', 'true');
            localStorage.removeItem('dejz_onboarding_in_progress');
          } catch {
            // ignore
          }
          setIsOnboardingActive(false);
        }

        // Tillämpa alla beräknade listor i ett enda atomärt steg
        incomesRef.current = reconciledInc.items;
        fixedExpensesRef.current = reconciledFix.items;
        transactionsRef.current = combinedTxs;

        setConnections(conns);
        setBankAccounts(accs);
        setIncomes(reconciledInc.items);
        setFixedExpenses(reconciledFix.items);
        setTransactions(combinedTxs);
        setIsInitialLoading(false);

        saveCachedAppState({
          userId: uid,
          userAvatar: dbProfile?.avatar_url || userAvatar,
          targetPayday: resolvedPayday,
          weekendHandling: resolvedWeekend,
          connections: conns,
          bankAccounts: accs,
          incomes: reconciledInc.items,
          fixedExpenses: reconciledFix.items,
          transactions: combinedTxs,
        });

        // Synka nyupptäckta fasta poster till Supabase så att databasen aldrig saknar bankupptäckta poster
        if (!isDeletingAccountRef.current && userIdRef.current === uid) {
          for (const item of reconciledFix.toPersist) {
            dataService
              .saveFixedExpense(uid, {
                id: item.id,
                name: item.name,
                originalName: item.originalName,
                amount: item.amount,
                isShared: item.isShared,
                fullAmount: item.fullAmount,
                receiptUrl: item.receiptUrl,
                receiptName: item.receiptName,
                deductionDay: item.dueDay,
                category: item.category,
                paymentMethod: item.paymentMethod || 'Autogiro',
                frequency: Frequency.MONTHLY,
                logo: item.logo,
              })
              .catch(() => {});
          }
          for (const inc of reconciledInc.toPersist) {
            dataService
              .saveIncomeSource(uid, {
                id: inc.id,
                name: inc.name,
                originalName: inc.originalName,
                amount: inc.amount,
                deductionDay: inc.payday,
                category: inc.category,
                frequency: Frequency.MONTHLY,
                logo: inc.logo,
              })
              .catch(() => {});
          }
        }

        return { connections: conns, accounts: accs };
      } catch {
        setIsInitialLoading(false);
        return { connections: [], accounts: [] };
      }
    },
    [targetPayday, weekendHandling, userAvatar]
  );

  // Tyst bakgrundssynk mot Enable Banking via Supabase Edge Function
  const performSilentBankSync = useCallback(
    async (force = false) => {
      if (syncInFlightRef.current) return;
      const now = Date.now();
      if (!force && now - lastSyncTimestampRef.current < AUTO_SYNC_COOLDOWN_MS) {
        return;
      }

      syncInFlightRef.current = true;
      lastSyncTimestampRef.current = now;

      try {
        await bankService.sync();
        await refreshBankStatus();
      } catch {
        // Tyst felhantering vid automatisk bakgrundssynk
      } finally {
        syncInFlightRef.current = false;
      }
    },
    [refreshBankStatus]
  );

  // Hantera Enable Banking OAuth callback (?code=...&state=...) koordinerat utan race conditions
  const processPendingBankCallback = useCallback(async () => {
    const pending = pendingBankCallbackRef.current;
    if (!pending || pending.done) return;
    if (pending.promise) {
      await pending.promise;
      return;
    }

    const runExchange = async () => {
      try {
        setCallbackStatusMsg('Slutför bankkoppling och hämtar dina konton...');
        window.history.replaceState({}, '', '/');

        const res = await bankService.exchangeCode({
          code: pending.code,
          state: pending.state,
        });

        try {
          localStorage.removeItem('dejz_onboarding_pending_bank_auth');
        } catch {
          // ignore
        }

        const isOnboardingCallback =
          res.originContext === 'onboarding' ||
          localStorage.getItem('dejz_onboarding_in_progress') === 'true';

        if (isOnboardingCallback) {
          try {
            localStorage.setItem('dejz_onboarding_in_progress', 'true');
            localStorage.setItem('dejz_onboarding_step', '2');
            localStorage.removeItem('dejz_onboarding_accounts_confirmed');
          } catch {
            // ignore
          }
          setIsOnboardingActive(true);
          setShowLanding(false);
        }

        // Uppdatera anslutning & konton direkt så att onboardingen reagerar omedelbart
        if (res.connection) {
          setConnections((prev) => {
            const filtered = prev.filter((c) => c.id !== res.connection.id);
            return [res.connection, ...filtered];
          });
        }
        if (Array.isArray(res.accounts) && res.accounts.length > 0) {
          setBankAccounts((prev) => {
            const newIds = new Set(res.accounts.map((a) => a.id));
            const kept = prev.filter((a) => !newIds.has(a.id));
            return [...res.accounts, ...kept];
          });
        }

        // Under onboardingen får användaren FÖRST välja vilka konton som ska synkas i steg 2 ("Välj konton")!
        // Endast om banken kopplades inifrån Inställningar (utanför onboardingen) synkas alla direkt.
        const allIds = (res.accounts || []).map((a) => a.id);
        if (!isOnboardingCallback && res.connection && allIds.length > 0) {
          await bankService
            .selectAccounts({
              connectionId: res.connection.id,
              selectedAccountIds: allIds,
            })
            .catch(() => {});
          setCallbackStatusMsg('Synkar transaktioner från din bank...');
          await bankService
            .sync({ connectionId: res.connection.id, fullSync: true })
            .catch(() => {});
          await refreshBankStatus();
        }

        pending.done = true;
        setCallbackStatusMsg(null);
        if (!isOnboardingCallback) {
          setIsBankModalOpen(true);
        }
      } catch (err: any) {
        pending.done = true;
        setCallbackStatusMsg(`Kunde inte slutföra bankkoppling: ${err.message || 'Okänt fel'}`);
        setTimeout(() => setCallbackStatusMsg(null), 6000);
      }
    };

    pending.promise = runExchange();
    await pending.promise;
  }, [refreshBankStatus]);

  useEffect(() => {
    if (userId && pendingBankCallbackRef.current && !pendingBankCallbackRef.current.done) {
      processPendingBankCallback();
    }
  }, [userId, processPendingBankCallback]);

  // Lyssna på uppdateringar i Swish-nummerkatalogen och slå upp okända telefonnummer i bakgrunden
  const lookedUpSwishPhonesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const handleDirectoryUpdate = () => {
      setTransactions((prev) => prev.map((tx) => sanitizeTransactionItem(tx)));
    };
    window.addEventListener('dejz:swish-directory-updated', handleDirectoryUpdate);
    return () => window.removeEventListener('dejz:swish-directory-updated', handleDirectoryUpdate);
  }, []);

  useEffect(() => {
    const unresolvedPhones = new Set<string>();
    for (const tx of transactions) {
      if (tx.category !== 'Swish' && !/swish/i.test(tx.title || '') && !/swish/i.test(tx.rawDescription || '')) {
        continue;
      }
      const phone = extractSwishPhoneNumber(
        `${tx.rawDescription || ''} ${tx.counterpartyName || ''} ${tx.title || ''}`
      );
      if (!phone) continue;
      if (resolveSwishPhoneToName(phone)) continue;
      if (lookedUpSwishPhonesRef.current.has(phone)) continue;
      lookedUpSwishPhonesRef.current.add(phone);
      unresolvedPhones.add(phone);
    }

    if (unresolvedPhones.size === 0) return;

    unresolvedPhones.forEach((phone) => {
      fetch(`/api/swish/lookup?phone=${encodeURIComponent(phone)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.name && typeof data.name === 'string') {
            saveSwishPhoneDirectoryEntry(phone, data.name);
          }
        })
        .catch(() => {});
    });
  }, [transactions]);

  // Initiera Supabase-session och trigga en enda koordinerad, atomär hydrering vid appstart
  useEffect(() => {
    const runCoordinateHydration = async (sessionUser: any) => {
      if (isDeletingAccountRef.current) return;
      const uid = sessionUser.id;
      setUserId(uid);
      userIdRef.current = uid;
      setUserEmail(sessionUser.email || null);
      // Svar på nyhetsbrevsfrågan från registreringen sparas nu när kontot finns
      if (!isDemoMode()) {
        void flushPendingMarketingConsent();
        // "Senast aktiv" / "Aktiv nu" i Supabase (tabellen user_activity)
        startActivityTracking();
      }

      try {
        const isOnboardingPending =
          localStorage.getItem('dejz_onboarding_in_progress') === 'true';
        const isOnboardingDone =
          localStorage.getItem('dejz_onboarding_v2_done') === 'true' ||
          localStorage.getItem('dejz_onboarding_completed') === 'true';
        const isBrandNewUser =
          !isOnboardingDone &&
          Boolean(sessionUser?.created_at) &&
          Date.now() - new Date(sessionUser.created_at).getTime() < 90_000;

        if (isOnboardingPending || isBrandNewUser) {
          if (!isOnboardingPending) {
            localStorage.setItem('dejz_onboarding_in_progress', 'true');
            localStorage.setItem('dejz_onboarding_step', '1');
          }
          setIsOnboardingActive(true);
        }
      } catch {
        // ignore
      }

      setShowLanding(false);
      const metaAvatar =
        sessionUser.user_metadata?.avatar_url ||
        sessionUser.user_metadata?.picture ||
        null;
      if (metaAvatar) setUserAvatar(metaAvatar);

      const metaFullName =
        sessionUser.user_metadata?.full_name ||
        sessionUser.user_metadata?.name ||
        '';
      if (metaFullName && typeof metaFullName === 'string') {
        const firstName = metaFullName.trim().split(/\s+/)[0];
        if (firstName) {
          setUserName((prev) => {
            if (prev) return prev;
            try {
              localStorage.setItem('dejz_user_name', firstName);
            } catch {
              // ignore
            }
            return firstName;
          });
        }
      }

      // Förhindra att getSession och onAuthStateChange kör dubbla parallella hydreringar vid mount
      if (hydrationInFlightRef.current === uid) {
        return;
      }
      hydrationInFlightRef.current = uid;
      try {
        // Om vi precis kom tillbaka från BankID / Enable Banking (?code=...&state=...),
        // slutför bankkopplingen FÖRE loadSupabaseUserData så att tom data aldrig skriver över kopplingen!
        if (pendingBankCallbackRef.current && !pendingBankCallbackRef.current.done) {
          await processPendingBankCallback();
        }
        const status = await loadSupabaseUserData(uid);
        const activeConns = status.connections.filter((c) => c.status === 'active');
        const isWaitingForOnboardingAccountChoice =
          localStorage.getItem('dejz_onboarding_in_progress') === 'true' &&
          localStorage.getItem('dejz_onboarding_accounts_confirmed') !== 'true';

        if (activeConns.length > 0 && !isWaitingForOnboardingAccountChoice) {
          // Kontrollera om banken redan synkades alldeles nyss (inom senaste 3 minuterna)
          // för att undvika dubbel hämtning direkt vid appstart
          const latestSyncMs = activeConns.reduce((maxMs, conn) => {
            const t = conn.last_synced_at ? new Date(conn.last_synced_at).getTime() : 0;
            return Number.isFinite(t) && t > maxMs ? t : maxMs;
          }, 0);
          const syncedRecently = latestSyncMs > 0 && Date.now() - latestSyncMs < 180_000;
          if (syncedRecently) {
            lastSyncTimestampRef.current = latestSyncMs;
          } else {
            performSilentBankSync(false);
          }
        }
      } finally {
        hydrationInFlightRef.current = null;
        setIsInitialLoading(false);
      }
    };

    // Bekräftelselänk från mejlet: dejz.se/bekrafta?token_hash=…&type=signup
    // Länken går via dejz.se (inte supabase.co) så att mejlet inte ser ut som nätfiske.
    const verifyEmailLinkIfPresent = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get('token_hash');
        const type = params.get('type');
        if (!tokenHash || !type) return;
        // En länk får bara användas en gång – kör aldrig kontrollen två gånger
        const w = window as any;
        if (w.__dejzEmailLinkCheck) return w.__dejzEmailLinkCheck;
        w.__dejzEmailLinkCheck = (async () => {
          window.history.replaceState(null, '', '/');
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (error) {
            // Visa förklaringen på inloggningssidan (läses av LandingPage)
            try {
              sessionStorage.setItem('dejz_auth_link_error', 'expired');
            } catch {
              // ignore
            }
            window.dispatchEvent(new Event('dejz-auth-link-error'));
            return;
          }
          try {
            localStorage.removeItem('dejz_logged_out');
            if (type === 'recovery') {
              sessionStorage.setItem('dejz_password_recovery', '1');
            }
          } catch {
            // ignore
          }
          if (type === 'recovery') {
            window.dispatchEvent(new Event('dejz-password-recovery'));
          }
        })();
        return w.__dejzEmailLinkCheck;
      } catch {
        // ignore – vanlig uppstart fortsätter
      }
    };

    verifyEmailLinkIfPresent()
      .then(() => supabase.auth.getSession())
      .then(async ({ data: { session } }: any) => {
        // Endast lokalt (npm run dev): http://localhost:3000/?demo öppnar appen med påhittad
        // demodata – används för skärmbilder till startsidan. Finns inte i produktionsbygget.
        if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')) {
          const demo = seedDemoData();
          // ?demo&onboarding visar introduktionen från början (för att testa och ta skärmbilder)
          const demoOnboarding = new URLSearchParams(window.location.search).has('onboarding');
          if (demoOnboarding) {
            localStorage.removeItem('dejz_onboarding_v2_done');
            localStorage.removeItem('dejz_onboarding_completed');
            localStorage.setItem('dejz_onboarding_in_progress', 'true');
            localStorage.setItem('dejz_onboarding_step', '1');
          } else {
            localStorage.setItem('dejz_onboarding_v2_done', 'true');
            localStorage.setItem('dejz_onboarding_completed', 'true');
            localStorage.removeItem('dejz_onboarding_in_progress');
            localStorage.removeItem('dejz_onboarding_step');
          }
          localStorage.removeItem('dejz_logged_out');
          setIsOnboardingActive(demoOnboarding);
          await runCoordinateHydration({ ...demo.user, created_at: '2025-01-01T00:00:00.000Z' });
          return;
        }
        if (session?.user && localStorage.getItem('dejz_logged_out') !== 'true') {
          await runCoordinateHydration(session.user);
        } else {
          setIsInitialLoading(false);
        }
      })
      .catch(() => {
        setIsInitialLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      // Gammal återställningslänk (via supabase.co) – be om nytt lösenord även då
      if (event === 'PASSWORD_RECOVERY') {
        try {
          sessionStorage.setItem('dejz_password_recovery', '1');
        } catch {
          // ignore
        }
        window.dispatchEvent(new Event('dejz-password-recovery'));
      }
      // I lokalt demoläge (?demo) ska en riktig inloggning aldrig ta över demodatan
      if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')) {
        return;
      }
      if (session?.user && localStorage.getItem('dejz_logged_out') !== 'true') {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || session.user.id !== userIdRef.current) {
          void runCoordinateHydration(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        userIdRef.current = null;
        setUserEmail(null);
        setUserName(null);
        setUserAvatar(null);
        setConnections([]);
        setBankAccounts([]);
        setIncomes([]);
        setFixedExpenses([]);
        setTransactions([]);
        setIsInitialLoading(false);
        setShowLanding(true);
        setIsOnboardingActive(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadSupabaseUserData, performSilentBankSync]);

  // Kontinuerlig automatisk synk i appen
  const hasActiveBankConnection = useMemo(
    () => connections.some((c) => c.status === 'active'),
    [connections]
  );

  useEffect(() => {
    if (!userId || !hasActiveBankConnection) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        performSilentBankSync(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        performSilentBankSync(false);
      }
    }, AUTO_SYNC_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.clearInterval(intervalId);
    };
  }, [userId, hasActiveBankConnection, performSilentBankSync]);

  // Supabase Realtime: Lyssna på databasändringar med debounce för att undvika synk-stormar
  useEffect(() => {
    if (!userId) return;

    let debounceTimer: number | null = null;
    const scheduleDebouncedRefresh = () => {
      // Om performSilentBankSync redan körs anropar den själv refreshBankStatus när den är klar
      if (syncInFlightRef.current) return;
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        if (!syncInFlightRef.current) {
          refreshBankStatus();
        }
      }, 800);
    };

    const channel = supabase
      .channel(`dejz-live-bank-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts',
          filter: `user_id=eq.${userId}`,
        },
        scheduleDebouncedRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_transactions',
          filter: `user_id=eq.${userId}`,
        },
        scheduleDebouncedRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_connections',
          filter: `user_id=eq.${userId}`,
        },
        scheduleDebouncedRefresh
      )
      .subscribe();

    return () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [userId, refreshBankStatus]);

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

  // Automatisk påfyllning av Sparmål när en kopplad fast utgift (t.ex. Avanza månadssparande) matchas i perioden:
  // Varje unik banktransaktion bokförs högst en gång på målet via `tx-goal-${matchedTx.id}`.
  useEffect(() => {
    const linkedExps = fixedExpenses.filter((e) => e.linkedGoalId);
    if (linkedExps.length === 0) return;

    const goals = getSavingsGoals();
    if (!goals || goals.length === 0) return;

    let mutated = false;
    const nextGoals = goals.map((goal) => {
      let updatedGoal = goal;
      for (const exp of linkedExps) {
        if (exp.linkedGoalId !== goal.id) continue;
        const matchedTx = periodRecurringMatches.matchedFixedTxByExpId.get(exp.id);
        if (!matchedTx) continue;

        const activityId = `tx-goal-${matchedTx.id}`;
        const alreadyCredited = (updatedGoal.activities || []).some(
          (a) => a.id === activityId
        );
        if (alreadyCredited) continue;

        const shareRatio =
          exp.isShared && exp.fullAmount && exp.fullAmount > 0 && exp.amount > 0
            ? exp.amount / exp.fullAmount
            : 1;
        const creditAmt = Math.round(Math.abs(Number(matchedTx.amount) || 0) * shareRatio);
        if (creditAmt <= 0) continue;

        mutated = true;
        updatedGoal = {
          ...updatedGoal,
          currentAmount: (Number(updatedGoal.currentAmount) || 0) + creditAmt,
          activities: [
            {
              id: activityId,
              text: `${exp.name} (+${creditAmt.toLocaleString('sv-SE')} kr)`,
              date: matchedTx.date,
              amount: creditAmt,
            },
            ...(updatedGoal.activities || []),
          ],
        };
      }
      return updatedGoal;
    });

    if (mutated) {
      saveSavingsGoals(nextGoals);
    }
  }, [fixedExpenses, periodRecurringMatches]);

  // Utan bank: ett månadssparande (fast utgift kopplad till ett sparmål) läggs till i målet
  // en gång per löneperiod när dragningsdagen har passerat – samma period som det dras av från "kvar".
  useEffect(() => {
    if (hasActiveBankConnection) return; // med bank sköts det av matchningen ovan
    const linkedExps = fixedExpenses.filter(
      (e) => e.linkedGoalId && !e.isCancelled && Number(e.amount) > 0
    );
    if (linkedExps.length === 0 || !period?.startDate) return;
    const goals = getSavingsGoals();
    if (!goals || goals.length === 0) return;

    const start = new Date(period.startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const periodKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(
      start.getDate()
    ).padStart(2, '0')}`;

    // Har dragningsdagen (t.ex. den 25:e) inträffat mellan periodens start och idag?
    const dueDatePassed = (dueDay: number): string | null => {
      for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        if (d.getDate() === Math.min(Math.max(1, dueDay), lastDay)) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
            d.getDate()
          ).padStart(2, '0')}`;
        }
      }
      return null;
    };

    let mutated = false;
    const nextGoals = goals.map((goal) => {
      let updatedGoal = goal;
      for (const exp of linkedExps) {
        if (exp.linkedGoalId !== goal.id) continue;
        const dueIso = dueDatePassed(Number(exp.dueDay) || 25);
        if (!dueIso) continue;
        const activityId = `fixed-goal-${exp.id}-${periodKey}`;
        if ((updatedGoal.activities || []).some((a) => a.id === activityId)) continue;
        const creditAmt = Math.round(Number(exp.amount) || 0);
        if (creditAmt <= 0) continue;
        mutated = true;
        updatedGoal = {
          ...updatedGoal,
          currentAmount: (Number(updatedGoal.currentAmount) || 0) + creditAmt,
          activities: [
            {
              id: activityId,
              text: `Månadssparande (+${creditAmt.toLocaleString('sv-SE')} kr)`,
              date: dueIso,
              amount: creditAmt,
            },
            ...(updatedGoal.activities || []),
          ],
        };
      }
      return updatedGoal;
    });

    if (mutated) {
      saveSavingsGoals(nextGoals); // skickar själv 'dejz:goals-updated' så vyerna uppdateras
    }
  }, [fixedExpenses, period, hasActiveBankConnection]);

  // Total inkomst under aktuell period (faktiskt bokfört belopp för lön/inkomst som redan kommit in, annars mallbelopp + eventuella extra engångsinkomster i perioden)
  // Allt räknas i räknemotorn (utils/budgetEngine.ts) – samma regler överallt i appen
  const isIgnoredTx = useCallback(
    (t: TransactionItem) =>
      isTransactionManuallyExcluded(t.id) ||
      (excludeInternalTransfers &&
        (internalTransferIds.has(t.id) ||
          isInternalTransferTransaction(t, bankAccounts, userEmail, userName))),
    [excludeInternalTransfers, internalTransferIds, bankAccounts, userEmail, userName]
  );

  const totalIncome = useMemo(
    () =>
      computeTotalIncome({
        incomes,
        periodTransactions,
        matches: periodRecurringMatches,
        isIgnored: isIgnoredTx,
      }),
    [incomes, periodTransactions, periodRecurringMatches, isIgnoredTx]
  );

  // Totala fasta kostnader under aktuell period (faktiskt bokfört belopp för räkningar som redan dragits, annars mallbelopp)
  const totalFixedExpenses = useMemo(
    () => computeTotalFixed(fixedExpenses, periodRecurringMatches, period),
    [fixedExpenses, periodRecurringMatches, period]
  );

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

  // Totala rörliga köp under aktuell period:
  // - Exkluderar ENDAST den specifika transaktion som matchats 1-till-1 mot varje fast utgift (så att 2:a köpet hos samma handlare eller engångsköp hos Apple/Klarna alltid räknas i Rörligt).
  // - Räknar av butiksreturer ('Återbetalning') samt mottagna Swish-utläggsersättningar som inte redan länkats till ett specifikt köp.
  const totalVariableSpent = useMemo(
    () =>
      computeVariableSpent({
        allTransactions: transactions,
        periodTransactions,
        matches: periodRecurringMatches,
        isIgnored: isIgnoredTx,
      }),
    [transactions, periodTransactions, periodRecurringMatches, isIgnoredTx]
  );

  // "Saldo just nu" (utan bank): användaren skriver in vad som finns på kontot
  const [manualBalance, setManualBalanceState] = useState<ManualBalance | null>(() =>
    getManualBalance()
  );
  useEffect(() => {
    const reload = () => setManualBalanceState(getManualBalance());
    window.addEventListener('dejz-manual-balance', reload);
    reload(); // profilen kan ha laddat ett saldo från en annan enhet
    return () => window.removeEventListener('dejz-manual-balance', reload);
  }, [isInitialLoading, userId]);

  // Saldot gäller bara i den löneperiod det skrevs in
  const activeManualBalance = useMemo(() => {
    if (!manualBalance || hasActiveBankConnection) return null;
    const at = new Date(manualBalance.at);
    if (isNaN(at.getTime()) || at.getTime() < period.startDate.getTime()) return null;
    return manualBalance;
  }, [manualBalance, period, hasActiveBankConnection]);

  // Kvar = saldo − räkningar som dras efter att saldot skrevs in − köp sedan dess + inkomster som kommer före lön
  const kvarFromBalance = useMemo(() => {
    if (!activeManualBalance) return null;
    return computeKvarFromBalance({
      balance: activeManualBalance,
      fixedExpenses,
      incomes,
      period,
      targetPayday,
      periodTransactions,
      matches: periodRecurringMatches,
      isIgnored: (t) => isTransactionManuallyExcluded(t.id),
    });
  }, [
    activeManualBalance,
    fixedExpenses,
    incomes,
    period,
    targetPayday,
    periodTransactions,
    periodRecurringMatches,
  ]);

  // Kvar att spendera under aktuell period (kan vara negativt om man gått över budget)
  const kvarAttSpendera = useMemo(
    () =>
      computeKvar({
        kvarFromBalance,
        totalIncome,
        totalFixed: totalFixedExpenses,
        totalVariableSpent,
      }),
    [kvarFromBalance, totalIncome, totalFixedExpenses, totalVariableSpent]
  );

  // Dagsbudget
  const dagsbudget = useMemo(
    () => computeDagsbudget(kvarAttSpendera, period.daysRemaining),
    [kvarAttSpendera, period.daysRemaining]
  );

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

  // Räkningar som varierar (el m.m.): uppskatta nästa dragning som snittet av de 3 senaste.
  // Körs högst en gång per räkning och löneperiod, bara innan räkningen dragits, och bara med bank.
  // Ändrar man beloppet själv efteråt får det stå kvar resten av perioden.
  useEffect(() => {
    if (isDemoMode() || !hasActiveBankConnection || !period?.startDate) return;
    const periodStartIso = formatIsoDateStockholm(period.startDate);
    for (const exp of fixedExpenses) {
      if (periodRecurringMatches.matchedFixedIds.has(exp.id)) continue;
      const est = estimateVariableBill(exp, transactions, periodStartIso);
      if (!est || Math.abs(est.estimate - (Number(exp.amount) || 0)) < 10) continue;
      const doneKey = `dejz_varbill_estimate:${exp.id}:${periodStartIso}`;
      try {
        if (localStorage.getItem(doneKey)) continue;
        localStorage.setItem(doneKey, String(est.estimate));
      } catch {
        continue;
      }
      void handleUpdateFixed({ ...exp, amount: est.estimate });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveBankConnection, period?.startDate, fixedExpenses, transactions, periodRecurringMatches]);

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
      const sessionRes = await withFastTimeout(supabase.auth.getSession(), 1500);
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
        const sessionRes = await withFastTimeout(supabase.auth.getSession(), 1500);
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

      {/* Floating Undo Toast for Swipe Exclude */}
      {undoToast && (
        <div className="fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[150] w-[calc(100%-2rem)] max-w-sm animate-fade-in">
          <div className="px-4 py-3 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] shadow-xl flex items-center justify-between gap-3 text-xs">
            <span className="font-medium truncate">
              {undoToast.excluded
                ? `${undoToast.title} räknas inte i budget`
                : `${undoToast.title} räknas med i budget`}
            </span>
            <button
              type="button"
              onClick={() => {
                const { id, excluded } = undoToast;
                if (undoTimerRef.current) {
                  window.clearTimeout(undoTimerRef.current);
                }
                setUndoToast(null);
                handleExcludeTransaction(id, !excluded, true);
              }}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-color)]/15 hover:bg-[var(--bg-color)]/25 font-display font-bold shrink-0 cursor-pointer transition-colors"
            >
              Ångra
            </button>
          </div>
        </div>
      )}

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

      {feedbackToast && (
        <div className="fixed bottom-[calc(5.6rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[220] w-[calc(100%-2rem)] max-w-sm animate-fade-in pointer-events-auto">
          {/* Mörk notis i iOS-/Revolut-stil: en rad text + Ångra */}
          <div className="pl-3.5 pr-2 py-2 min-h-[48px] rounded-2xl bg-[#16141F] text-white shadow-[0_16px_40px_-12px_rgba(22,20,31,0.45)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle size={20} weight="fill" className="text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[14px] font-medium truncate">{feedbackToast.title}</p>
                {feedbackToast.subtitle && (
                  <p className="text-[12px] text-white/60 truncate">{feedbackToast.subtitle}</p>
                )}
              </div>
            </div>

            <div className="flex items-center shrink-0">
              {feedbackToast.actionLabel && feedbackToast.onAction && (
                <button
                  type="button"
                  onClick={() => {
                    const action = feedbackToast.onAction;
                    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
                    setFeedbackToast(null);
                    action?.();
                  }}
                  className="px-3 py-2 rounded-xl text-[14px] font-semibold text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  {feedbackToast.actionLabel}
                </button>
              )}

              {feedbackToast.undoLabel && feedbackToast.onUndo ? (
                <button
                  type="button"
                  onClick={() => {
                    const undo = feedbackToast.onUndo;
                    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
                    setFeedbackToast(null);
                    undo?.();
                  }}
                  className="px-3 py-2 rounded-xl text-[14px] font-semibold text-[#B4A8FF] hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  {feedbackToast.undoLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
                    setFeedbackToast(null);
                  }}
                  className="w-9 h-9 rounded-xl text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Stäng"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* In-App Receipt Lightbox Sheet */}
      <BottomSheet
        isOpen={Boolean(previewReceipt)}
        onClose={() => setPreviewReceipt(null)}
        title={previewReceipt?.name || 'Kvitto'}
        zIndexClass="z-[190]"
      >
        {previewReceipt && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-2 overflow-hidden flex items-center justify-center max-h-[60dvh]">
              {previewReceipt.url.startsWith('data:image/') ||
              /\.(png|jpe?g|webp|gif)$/i.test(previewReceipt.url) ? (
                <img
                  src={previewReceipt.url}
                  alt={previewReceipt.name}
                  className="max-h-[56dvh] w-auto object-contain rounded-xl"
                />
              ) : (
                <iframe
                  src={previewReceipt.url}
                  title={previewReceipt.name}
                  className="w-full h-[52dvh] rounded-xl border-0"
                />
              )}
            </div>
            <a
              href={previewReceipt.url}
              download={previewReceipt.name || 'kvitto.jpg'}
              className="ui-btn-primary"
            >
              <FileText size={14} weight="bold" />
              <span>Spara fil</span>
            </a>
          </div>
        )}
      </BottomSheet>

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
