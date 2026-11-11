import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { WeekendHandlingMode } from '../../utils/periodEngine';
import {
  IncomeItem,
  FixedExpenseItem,
  TransactionItem,
  compareTransactionsChronologically,
} from '../../components/HomeTab';
import { flushPendingMarketingConsent } from '../../utils/marketingConsent';
import { syncFirstTouchToAccount } from '../../utils/attribution';
import { startActivityTracking } from '../../utils/activity';
import { isDemoMode } from '../../utils/demoUtils';
import { supabase } from '../../supabaseClient';
import { bankService, BankConnection, BankAccount } from '../../services/bankService';
import { dataService } from '../../services/dataService';
import { seedDemoData } from '../../utils/demoData';
import { Frequency } from '../../types';
import { getLogoUrl } from '../../utils/logo';
import {
  analyzeBankTransactionsForOnboarding,
  extractSwishPhoneNumber,
} from '../../utils/bankHistoryAnalyzer';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import {
  formatIsoDateStockholm,
  formatIsoTimeStockholm,
  getSwedishDateStr,
} from '../../utils/swedishDate';
import {
  loadCachedAppState,
  saveCachedAppState,
  clearCachedAppState,
  getExcludeInternalTransfers,
  getMerchantAliases,
  hydrateAllUserPreferencesFromProfile,
  extractSavedFixedFromProfile,
  extractSavedIncomesFromProfile,
  clearAllLocalAppData,
  resolveSwishPhoneToName,
  saveSwishPhoneDirectoryEntry,
} from '../../utils/appCache';

import {
  sanitizeTransactionItem,
  mapBankTransactionsToAppItems,
} from '../../app/transactionMapping';
import { reconcileFixedExpensesList, reconcileIncomesList } from '../../app/reconcileLists';
import { apiUrl } from '../../utils/platform';

const SWISH_LOOKUP_ENABLED = import.meta.env.VITE_ENABLE_SWISH_LOOKUP === 'true';

const AUTO_SYNC_COOLDOWN_MS = 15 * 60 * 1000; // Minst 15 min mellan automatiska bakgrundssynkningar (PSD2-vänlig kvot, manuell synk körs alltid direkt)
const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000; // Bakgrundskontroll var 15:e minut när användaren är aktiv i appen

export interface AccountDataContext {
  connections: BankConnection[];
  fixedExpensesRef: React.MutableRefObject<FixedExpenseItem[]>;
  hydrationInFlightRef: React.MutableRefObject<string | null>;
  incomesRef: React.MutableRefObject<IncomeItem[]>;
  isDeletingAccountRef: React.MutableRefObject<boolean>;
  lastHydratedUserIdRef: React.MutableRefObject<string | null>;
  lastSyncTimestampRef: React.MutableRefObject<number>;
  pendingBankCallbackRef: React.MutableRefObject<{
    code: string;
    state: string;
    promise: Promise<void> | null;
    done: boolean;
  } | null>;
  pendingRefreshRef: React.MutableRefObject<boolean>;
  refreshInFlightRef: React.MutableRefObject<Promise<{
    connections: BankConnection[];
    accounts: BankAccount[];
  }> | null>;
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  setCallbackStatusMsg: React.Dispatch<React.SetStateAction<string | null>>;
  setConnections: React.Dispatch<React.SetStateAction<BankConnection[]>>;
  setExcludeInternalTransfersState: React.Dispatch<React.SetStateAction<boolean>>;
  setFixedExpenses: React.Dispatch<React.SetStateAction<FixedExpenseItem[]>>;
  setIncomes: React.Dispatch<React.SetStateAction<IncomeItem[]>>;
  setIsBankModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsInitialLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsOnboardingActive: React.Dispatch<React.SetStateAction<boolean>>;
  setShowLanding: React.Dispatch<React.SetStateAction<boolean>>;
  setTargetPayday: React.Dispatch<React.SetStateAction<number>>;
  setTransactions: React.Dispatch<React.SetStateAction<TransactionItem[]>>;
  setUserAvatar: React.Dispatch<React.SetStateAction<string | null>>;
  setUserEmail: React.Dispatch<React.SetStateAction<string | null>>;
  setUserId: React.Dispatch<React.SetStateAction<string | null>>;
  setUserName: React.Dispatch<React.SetStateAction<string | null>>;
  setWeekendHandling: React.Dispatch<React.SetStateAction<WeekendHandlingMode>>;
  syncInFlightRef: React.MutableRefObject<boolean>;
  targetPayday: number;
  transactions: TransactionItem[];
  transactionsRef: React.MutableRefObject<TransactionItem[]>;
  userAvatar: string | null;
  userId: string | null;
  userIdRef: React.MutableRefObject<string | null>;
  weekendHandling: WeekendHandlingMode;
}

/**
 * Inloggning, laddning av användarens data från Supabase och bankkopplingen
 * (status, synk, återkomst från banken, realtid). Flyttad från App.tsx.
 */
export function useAccountData({
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
}: AccountDataContext) {
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

    // Namnuppslag för okända Swish-nummer kräver en server (/api/swish/lookup) som inte finns ännu.
    // Numren samlas ändå ovan, så att uppslaget kan slås på när servern finns.
    if (unresolvedPhones.size === 0 || !SWISH_LOOKUP_ENABLED) return;

    unresolvedPhones.forEach((phone) => {
      fetch(apiUrl(`/api/swish/lookup?phone=${encodeURIComponent(phone)}`))
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
        void syncFirstTouchToAccount();
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

  return { refreshBankStatus, loadSupabaseUserData, performSilentBankSync, hasActiveBankConnection };
}
