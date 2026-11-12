// Hämtar bankstatus + banktransaktioner (Enable Banking) och uppdaterar inkomster, fasta poster och köp i ett steg.
import { useCallback } from 'react';
import { compareTransactionsChronologically } from '../models';
import { bankService } from '../../services/bankService';
import { dataService } from '../../services/dataService';
import { Frequency } from '../../types';
import { analyzeBankTransactionsForOnboarding } from '../../utils/bankAnalysis/history/onboarding';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import { saveCachedAppState } from '../../utils/cache/appState';
import { getMerchantAliases } from '../../utils/cache/merchants';
import { sanitizeTransactionItem } from '../transactions/sanitizeTransaction';
import { mapBankTransactionsToAppItems } from '../transactions/mapBankTransactions';
import { reconcileFixedExpensesList, reconcileIncomesList } from '../../app/reconcileLists';
import type { AccountDataContext, BankStatusResult } from './accountDataTypes';
import { keepPrevUserFlags } from './accountDataHelpers';

type BankStatusRefreshDeps = Pick<
  AccountDataContext,
  | 'fixedExpensesRef'
  | 'incomesRef'
  | 'isDeletingAccountRef'
  | 'pendingRefreshRef'
  | 'refreshInFlightRef'
  | 'setBankAccounts'
  | 'setConnections'
  | 'setFixedExpenses'
  | 'setIncomes'
  | 'setIsInitialLoading'
  | 'setTransactions'
  | 'targetPayday'
  | 'transactionsRef'
  | 'userIdRef'
  | 'weekendHandling'
>;

/** Ladda Enable Banking status + banktransaktioner och synka atomärt med befintligt state. */
export function useBankStatusRefresh({
  fixedExpensesRef,
  incomesRef,
  isDeletingAccountRef,
  pendingRefreshRef,
  refreshInFlightRef,
  setBankAccounts,
  setConnections,
  setFixedExpenses,
  setIncomes,
  setIsInitialLoading,
  setTransactions,
  targetPayday,
  transactionsRef,
  userIdRef,
  weekendHandling,
}: BankStatusRefreshDeps): () => Promise<BankStatusResult> {
  const refreshBankStatus = useCallback((): Promise<BankStatusResult> => {
    // Egen namngiven funktion så att en köad uppdatering kan köra om sig själv (i `finally`)
    const refresh = async (): Promise<BankStatusResult> => {
      if (!userIdRef.current || isDeletingAccountRef.current) {
        return { connections: [], accounts: [] };
      }
      if (refreshInFlightRef.current) {
        pendingRefreshRef.current = true;
        return refreshInFlightRef.current;
      }

      const runRefresh = async (): Promise<BankStatusResult> => {
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
            ).map((tx) => keepPrevUserFlags(tx, prevMap));

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
            void refresh();
          } else {
            pendingRefreshRef.current = false;
          }
        }
      };

      const promise = runRefresh();
      refreshInFlightRef.current = promise;
      return promise;
    };
    return refresh();
  }, [
    targetPayday,
    weekendHandling,
    fixedExpensesRef,
    incomesRef,
    isDeletingAccountRef,
    pendingRefreshRef,
    refreshInFlightRef,
    setBankAccounts,
    setConnections,
    setFixedExpenses,
    setIncomes,
    setIsInitialLoading,
    setTransactions,
    transactionsRef,
    userIdRef,
  ]);

  return refreshBankStatus;
}
