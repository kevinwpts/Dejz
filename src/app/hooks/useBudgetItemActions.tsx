import { IncomeItem, FixedExpenseItem, TransactionItem } from '../models';
import { dataService } from '../../services/dataService';
import { Frequency } from '../../types';
import { getLogoUrl } from '../../utils/logo';
import { saveCachedAppState, normalizeMerchantKey, ensureValidUuid } from '../../utils/cache/appState';
import { dismissFixedMerchant, unDismissFixedMerchant, dismissIncomeMerchant, unDismissIncomeMerchant, markFixedIdDeleted, unmarkFixedIdDeleted, markIncomeIdDeleted, unmarkIncomeIdDeleted, saveManualFixedOverride, saveManualIncomeOverride, getMerchantAliases } from '../../utils/cache/merchants';
import { saveTransactionMeta } from '../../utils/cache/itemMeta';
import { syncAllUserPreferencesToSupabase } from '../../utils/cache/preferencesSync';
import { findAllMatchingFixedExpensesByMerchant } from '../../utils/recurring/matching';
import { useVariableBillEstimates } from './useVariableBillEstimates';
import { sanitizeTransactionItem } from '../transactions/sanitizeTransaction';
import type { UseAppActionsContext } from './useAppActions';

/** Inkomster och fasta utgifter: lägga till, ändra, ta bort och koppla köp. */
export function useBudgetItemActions({
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
}: UseAppActionsContext) {
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

  return {
    handleAddIncome,
    handleUpdateIncome,
    handleDeleteIncome,
    handleAddFixed,
    handleMarkAsFixed,
    handleLinkTransactionToFixed,
    handleUpdateFixed,
    handleDeleteFixed,
  };
}
