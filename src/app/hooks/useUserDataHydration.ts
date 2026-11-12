// Laddar all användardata vid appstart (Supabase-tabeller + bankdata) och lägger in den i appen i ett enda steg.
import { useCallback } from 'react';
import { compareTransactionsChronologically } from '../../components/HomeTab';
import type { WeekendHandlingMode } from '../../utils/periodEngine';
import { bankService } from '../../services/bankService';
import { dataService } from '../../services/dataService';
import { Frequency } from '../../types';
import { analyzeBankTransactionsForOnboarding } from '../../utils/bankHistoryAnalyzer';
import { deduplicateTransactions } from '../../utils/transactionDedup';
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
} from '../../utils/appCache';
import { mapBankTransactionsToAppItems } from '../../app/transactionMapping';
import { reconcileFixedExpensesList, reconcileIncomesList } from '../../app/reconcileLists';
import type { AccountDataContext, BankStatusResult } from './accountDataTypes';
import { keepPrevUserFlags, mapDbTransactions, resolveOnboardingActive } from './accountDataHelpers';

type UserDataHydrationDeps = Pick<
  AccountDataContext,
  | 'fixedExpensesRef'
  | 'incomesRef'
  | 'isDeletingAccountRef'
  | 'lastHydratedUserIdRef'
  | 'setBankAccounts'
  | 'setConnections'
  | 'setExcludeInternalTransfersState'
  | 'setFixedExpenses'
  | 'setIncomes'
  | 'setIsInitialLoading'
  | 'setIsOnboardingActive'
  | 'setTargetPayday'
  | 'setTransactions'
  | 'setUserAvatar'
  | 'setWeekendHandling'
  | 'targetPayday'
  | 'transactionsRef'
  | 'userAvatar'
  | 'userIdRef'
  | 'weekendHandling'
>;

/** Atomär helhetshydrering av både Supabase-tabeller och bankdata samtidigt vid appstart. */
export function useUserDataHydration({
  fixedExpensesRef,
  incomesRef,
  isDeletingAccountRef,
  lastHydratedUserIdRef,
  setBankAccounts,
  setConnections,
  setExcludeInternalTransfersState,
  setFixedExpenses,
  setIncomes,
  setIsInitialLoading,
  setIsOnboardingActive,
  setTargetPayday,
  setTransactions,
  setUserAvatar,
  setWeekendHandling,
  targetPayday,
  transactionsRef,
  userAvatar,
  userIdRef,
  weekendHandling,
}: UserDataHydrationDeps): (uid: string) => Promise<BankStatusResult> {
  return useCallback(
    async (uid: string): Promise<BankStatusResult> => {
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
          hydrateAllUserPreferencesFromProfile(dbProfile, uid);
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

        const mappedDbTxs = mapDbTransactions(
          dbTxs,
          reconciledFix.items,
          reconciledInc.items,
          aliases
        );

        const prevMap = new Map(transactionsRef.current.map((t) => [t.id, t]));
        const uniqueBankTxs =
          validBankTxs.length > 0
            ? mapBankTransactionsToAppItems(
                validBankTxs,
                accs,
                reconciledFix.items,
                reconciledInc.items,
                aliases
              ).map((tx) => keepPrevUserFlags(tx, prevMap))
            : [];

        const combinedTxs = deduplicateTransactions([...uniqueBankTxs, ...mappedDbTxs]);
        combinedTxs.sort(compareTransactionsChronologically);

        if (isDeletingAccountRef.current || userIdRef.current !== uid) {
          return { connections: [], accounts: [] };
        }

        // Kontrollera om användaren har slutfört onboardingen eller ska fortsätta där de slutade
        const hasAnyExistingUserData =
          conns.length > 0 ||
          reconciledInc.items.length > 0 ||
          reconciledFix.items.length > 0 ||
          combinedTxs.length > 0;
        setIsOnboardingActive(resolveOnboardingActive(dbProfile, hasAnyExistingUserData));

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
    [
      targetPayday,
      weekendHandling,
      userAvatar,
      fixedExpensesRef,
      incomesRef,
      isDeletingAccountRef,
      lastHydratedUserIdRef,
      setBankAccounts,
      setConnections,
      setExcludeInternalTransfersState,
      setFixedExpenses,
      setIncomes,
      setIsInitialLoading,
      setIsOnboardingActive,
      setTargetPayday,
      setTransactions,
      setUserAvatar,
      setWeekendHandling,
      transactionsRef,
      userIdRef,
    ]
  );
}
