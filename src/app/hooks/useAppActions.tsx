import type { MutableRefObject, SetStateAction } from 'react';
import { useCallback } from 'react';
import { PeriodInfo, WeekendHandlingMode } from '../../utils/periodEngine';
import { AppTab } from '../../components/BottomNav';
import { IncomeItem, FixedExpenseItem, TransactionItem } from '../../components/HomeTab';
import { SettingsSubView } from '../../components/SettingsTab';
import { supabase } from '../../supabaseClient';
import { bankService, BankConnection, BankAccount } from '../../services/bankService';
import { dataService } from '../../services/dataService';
import { Frequency } from '../../types';
import { getLogoUrl } from '../../utils/logo';
import {
  saveCachedAppState,
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
  setTransactionExcludedState,
  getMerchantAliases,
  saveMerchantAlias,
  removeMerchantAliasForSources,
  normalizeMerchantKey,
  ensureValidUuid,
  propagateCategoryChangeInCache,
  getTransactionMetaMap,
  saveTransactionMeta,
  syncAllUserPreferencesToSupabase,
  cancelPendingPreferenceSync,
  clearAllLocalAppData,
} from '../../utils/appCache';
import { findAllMatchingFixedExpensesByMerchant } from '../../utils/recurring';
import { useVariableBillEstimates } from './useVariableBillEstimates';
import { FeedbackToastState } from '../components/AppToasts';
import { sanitizeTransactionItem } from '../transactionMapping';

export interface UseAppActionsContext {
  setSyncingBank: (value: SetStateAction<boolean>) => void;
  lastSyncTimestampRef: MutableRefObject<number>;
  refreshBankStatus: () => Promise<{ connections: BankConnection[]; accounts: BankAccount[]; }>;
  connections: BankConnection[];
  userId: string;
  incomesRef: MutableRefObject<IncomeItem[]>;
  setIncomes: (value: SetStateAction<IncomeItem[]>) => void;
  userIdRef: MutableRefObject<string>;
  transactionsRef: MutableRefObject<TransactionItem[]>;
  fixedExpensesRef: MutableRefObject<FixedExpenseItem[]>;
  setTransactions: (value: SetStateAction<TransactionItem[]>) => void;
  setFixedExpenses: (value: SetStateAction<FixedExpenseItem[]>) => void;
  setIsTxModalOpen: (value: SetStateAction<boolean>) => void;
  setSelectedTransaction: (value: SetStateAction<TransactionItem>) => void;
  showFeedbackToast: (toast: FeedbackToastState, durationMs?: number) => void;
  setActiveTab: (value: SetStateAction<AppTab>) => void;
  setSelectedFixedExpense: (value: SetStateAction<FixedExpenseItem>) => void;
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  period: PeriodInfo;
  periodRecurringMatches: { claimedFixedTxIds: Set<string>; matchedFixedTxByExpId: Map<string, TransactionItem>; matchedFixedIds: Set<string>; claimedIncomeTxIds: Set<string>; matchedIncomeTxByIncId: Map<string, TransactionItem>; matchedIncomeIds: Set<string>; };
  hasActiveBankConnection: boolean;
  setDismissedTxIds: (value: SetStateAction<string[]>) => void;
  undoTimerRef: MutableRefObject<number>;
  setUndoToast: (value: SetStateAction<{ id: string; excluded: boolean; title: string; }>) => void;
  lastHydratedUserIdRef: MutableRefObject<string>;
  setUserId: (value: SetStateAction<string>) => void;
  setUserEmail: (value: SetStateAction<string>) => void;
  setUserName: (value: SetStateAction<string>) => void;
  setUserAvatar: (value: SetStateAction<string>) => void;
  setConnections: (value: SetStateAction<BankConnection[]>) => void;
  setBankAccounts: (value: SetStateAction<BankAccount[]>) => void;
  setSettingsSubView: (value: SetStateAction<SettingsSubView>) => void;
  setShowLanding: (value: SetStateAction<boolean>) => void;
  setIsOnboardingActive: (value: SetStateAction<boolean>) => void;
  userEmail: string;
  isDeletingAccountRef: MutableRefObject<boolean>;
  pendingRefreshRef: MutableRefObject<boolean>;
  aiCleanedKeysRef: MutableRefObject<Set<string>>;
  setTargetPayday: (value: SetStateAction<number>) => void;
  setWeekendHandling: (value: SetStateAction<WeekendHandlingMode>) => void;
  setCallbackStatusMsg: (value: SetStateAction<string>) => void;
}

export function useAppActions({
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
}: UseAppActionsContext) {
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

  return {
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
  };
}
