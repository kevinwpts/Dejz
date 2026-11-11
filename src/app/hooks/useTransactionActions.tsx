import { useCallback } from 'react';
import { TransactionItem } from '../../components/HomeTab';
import { bankService } from '../../services/bankService';
import { dataService } from '../../services/dataService';
import { getLogoUrl } from '../../utils/logo';
import {
  saveCachedAppState,
  setTransactionExcludedState,
  getMerchantAliases,
  saveMerchantAlias,
  removeMerchantAliasForSources,
  propagateCategoryChangeInCache,
  getTransactionMetaMap,
  saveTransactionMeta,
  syncAllUserPreferencesToSupabase,
} from '../../utils/appCache';
import { sanitizeTransactionItem } from '../transactionMapping';
import type { UseAppActionsContext } from './useAppActions';

/** Köp: lägga till, ändra, ta bort, undanta, hjärta, paket och kategoribyte. */
export function useTransactionActions({
  refreshBankStatus,
  userId,
  incomesRef,
  setIncomes,
  transactionsRef,
  fixedExpensesRef,
  setTransactions,
  setFixedExpenses,
  setSelectedTransaction,
  showFeedbackToast,
  setDismissedTxIds,
  undoTimerRef,
  setUndoToast,
}: UseAppActionsContext) {
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

  return {
    handleToggleHeart,
    handleTogglePackage,
    handleCategoryMutated,
    handleAddTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleExcludeTransaction,
  };
}
