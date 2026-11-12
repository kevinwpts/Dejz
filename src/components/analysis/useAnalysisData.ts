// Analys-flikens siffror: perioder, periodens inkomster/fasta/rörliga, summor, kategorier och tårtbitar
import { useMemo } from 'react';
import {
  PeriodInfo,
  isDateInPeriod,
  calculateCurrentPeriod,
  WeekendHandlingMode,
} from '../../utils/periodEngine';
import type { TransactionItem, FixedExpenseItem, IncomeItem } from '../../app/models';
import { resolveCategoryColor } from '../CategoryIcon';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import { isTransactionManuallyExcluded } from '../../utils/appCache';
import {
  checkIsRecurringTransaction,
  reconcilePeriodRecurringMatches,
} from '../../utils/recurring';
import { getFixedExpenseAmountInPeriod } from '../../utils/budgetEngine';
import {
  findInternalTransferIds,
  isInternalTransferTransaction,
} from '../../utils/transferDetection';
import type { BankAccount } from '../../services/bankService';
import { buildCategoryBreakdown } from '../../utils/categoryBreakdown';

export interface AnalysisDataInput {
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  targetPayday: number;
  weekendHandling: WeekendHandlingMode;
  excludeInternalTransfers: boolean;
  bankAccounts: BankAccount[];
  userEmail: string | null;
  userName: string | null;
  periodOffset: number;
}

/** En tårtbit i cirkeldiagrammet (en utgiftskategori) */
export interface ExpenseChartSlice {
  category: string;
  amount: number;
  fraction: number;
  percentage: number;
  exactPercentage: string;
  startFraction: number;
  color: string;
}

export function useAnalysisData({
  incomes,
  fixedExpenses,
  transactions,
  targetPayday,
  weekendHandling,
  excludeInternalTransfers,
  bankAccounts,
  userEmail,
  userName,
  periodOffset,
}: AnalysisDataInput) {
  // Generate available periods (current + past 5 periods)
  const availablePeriods = useMemo(() => {
    const list: { offset: number; info: PeriodInfo }[] = [];
    for (let i = 0; i >= -5; i--) {
      const refDate = new Date();
      refDate.setMonth(refDate.getMonth() + i);
      list.push({
        offset: i,
        info: calculateCurrentPeriod(refDate, targetPayday, weekendHandling),
      });
    }
    return list;
  }, [targetPayday, weekendHandling]);

  const computedPeriod = useMemo(() => {
    const refDate = new Date();
    refDate.setMonth(refDate.getMonth() + periodOffset);
    return calculateCurrentPeriod(refDate, targetPayday, weekendHandling);
  }, [periodOffset, targetPayday, weekendHandling]);

  const internalTransferIds = useMemo(() => {
    if (!excludeInternalTransfers) return new Set<string>();
    return findInternalTransferIds(transactions, bankAccounts, userEmail, userName);
  }, [transactions, excludeInternalTransfers, bankAccounts, userEmail, userName]);

  // Filter transactions for computedPeriod
  const periodTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions);
    return deduped.filter((t) => {
      if (t.isExcluded) return false;
      if (isTransactionManuallyExcluded(t.id)) return false;
      if (
        excludeInternalTransfers &&
        (internalTransferIds.has(t.id) ||
          isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
      ) {
        return false;
      }
      return isDateInPeriod(t.date, computedPeriod);
    });
  }, [
    transactions,
    computedPeriod,
    excludeInternalTransfers,
    internalTransferIds,
    bankAccounts,
    userEmail,
    userName,
  ]);

  const periodRecurringMatches = useMemo(() => {
    return reconcilePeriodRecurringMatches(periodTransactions, fixedExpenses, incomes);
  }, [periodTransactions, fixedExpenses, incomes]);

  const alreadyLinkedSwishIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tx of transactions) {
      if (tx.linkedSwishTxId) ids.add(tx.linkedSwishTxId);
    }
    for (const tx of periodTransactions) {
      if (tx.linkedSwishTxId) ids.add(tx.linkedSwishTxId);
    }
    return ids;
  }, [transactions, periodTransactions]);

  const periodIncomesList = useMemo(() => {
    // För historiska perioder med faktiska banktransaktioner: använd de inkomster som faktiskt kom in då (exkl. butiksreturer/återbetalningar och Swish-utlägg)
    if (periodOffset < 0 && periodTransactions.length > 0) {
      const txIncomes = periodTransactions.filter(
        (t) =>
          t.type === 'income' &&
          t.category !== 'Återbetalning' &&
          !(
            (t.category === 'Swish' || /swish/i.test(t.title || '')) &&
            !periodRecurringMatches.claimedIncomeTxIds.has(t.id)
          )
      );
      if (txIncomes.length > 0) {
        return txIncomes.map((tx) => {
          const recurring = checkIsRecurringTransaction(tx, fixedExpenses, incomes);
          const matchedInc =
            recurring.isRecurring && recurring.type === 'income'
              ? (recurring.matchedItem as IncomeItem | undefined)
              : undefined;
          return {
            id: matchedInc?.id || tx.id,
            name: matchedInc?.name || tx.title,
            originalName: matchedInc?.originalName || tx.rawDescription,
            amount: tx.amount,
            payday: matchedInc?.payday || parseInt((tx.date || '').slice(8, 10), 10) || targetPayday,
            category: matchedInc?.category || tx.category || 'Lön',
            logo: matchedInc?.logo || tx.logo,
            type: 'income' as const,
          };
        });
      }
    }

    const mappedFixedIncomes = incomes.map((inc) => {
      const matchedTx = periodRecurringMatches.matchedIncomeTxByIncId.get(inc.id);
      return {
        ...inc,
        type: 'income' as const,
        amount: matchedTx ? Math.round(Math.abs(Number(matchedTx.amount) || 0)) : inc.amount,
      };
    });

    const extraIncomeTxs = periodTransactions
      .filter(
        (t) =>
          t.type === 'income' &&
          !(typeof t.id === 'string' && t.id.startsWith('inc-')) &&
          !periodRecurringMatches.claimedIncomeTxIds.has(t.id) &&
          t.category !== 'Återbetalning' &&
          t.category !== 'Swish' &&
          !/swish/i.test(t.title || '')
      )
      .map((tx) => ({
        id: tx.id,
        name: tx.title,
        originalName: tx.rawDescription,
        amount: Math.round(Math.abs(Number(tx.amount) || 0)),
        payday: parseInt((tx.date || '').slice(8, 10), 10) || targetPayday,
        category: tx.category || 'Övrig inkomst',
        logo: tx.logo,
        type: 'income' as const,
      }));

    return [...mappedFixedIncomes, ...extraIncomeTxs];
  }, [
    incomes,
    fixedExpenses,
    periodOffset,
    periodTransactions,
    periodRecurringMatches,
    targetPayday,
  ]);

  const periodFixedList = useMemo(() => {
    // För historiska perioder med faktiska transaktioner: använd periodens faktiska fasta utgifter (1-till-1-matchade)
    if (periodOffset < 0 && periodTransactions.length > 0) {
      const recurringExpenseTxs = periodTransactions.filter((t) =>
        periodRecurringMatches.claimedFixedTxIds.has(t.id)
      );

      if (recurringExpenseTxs.length > 0) {
        return recurringExpenseTxs.map((tx) => {
          const recurring = checkIsRecurringTransaction(tx, fixedExpenses, incomes);
          const matchedExp = recurring.matchedItem as FixedExpenseItem | undefined;
          const shareRatio =
            matchedExp?.isShared &&
            matchedExp.fullAmount &&
            matchedExp.fullAmount > 0 &&
            matchedExp.amount > 0
              ? matchedExp.amount / matchedExp.fullAmount
              : 1;
          const effectiveHistoricalAmt = Math.round(tx.amount * shareRatio);

          return {
            id: matchedExp?.id || tx.id,
            name: matchedExp?.name || tx.title,
            originalName: matchedExp?.originalName || tx.rawDescription,
            amount: effectiveHistoricalAmt,
            fullAmount: matchedExp?.isShared ? tx.amount : undefined,
            isShared: matchedExp?.isShared,
            dueDay: matchedExp?.dueDay || parseInt((tx.date || '').slice(8, 10), 10) || 27,
            category: matchedExp?.category || tx.category || 'Räkningar',
            paymentMethod: matchedExp?.paymentMethod || tx.paymentMethod,
            logo: matchedExp?.logo || tx.logo,
            type: 'expense' as const,
          };
        });
      }
    }

    return fixedExpenses.map((exp) => {
      const matchedTx = periodRecurringMatches.matchedFixedTxByExpId.get(exp.id);
      // Samma uträkning som hemkortet (räknemotorn)
      const effectiveAmt = getFixedExpenseAmountInPeriod(exp, matchedTx, computedPeriod);
      return {
        ...exp,
        type: 'expense' as const,
        amount: effectiveAmt,
      };
    });
  }, [fixedExpenses, incomes, periodOffset, periodTransactions, periodRecurringMatches, computedPeriod]);

  // Rörliga utgifter under perioden (exkl. 1-till-1-matchade fasta utgifter, 100 % konsekvent med Hemfliken)
  const variableTransactions = useMemo(() => {
    return periodTransactions.filter((t) => {
      if (t.type === 'income') return false;
      if (periodRecurringMatches.claimedFixedTxIds.has(t.id)) {
        return false;
      }
      return true;
    });
  }, [periodTransactions, periodRecurringMatches]);

  // Returer ('Återbetalning') samt mottagna Swish-utläggsersättningar under perioden
  const reimbursementTransactions = useMemo(() => {
    return periodTransactions.filter((t) => {
      if (t.type !== 'income') return false;
      if (t.category === 'Återbetalning') return true;
      if (
        (t.category === 'Swish' || /swish/i.test(t.title || '')) &&
        !periodRecurringMatches.claimedIncomeTxIds.has(t.id) &&
        !alreadyLinkedSwishIds.has(t.id)
      ) {
        return true;
      }
      return false;
    });
  }, [periodTransactions, periodRecurringMatches, alreadyLinkedSwishIds]);

  const unlinkedManualSplitReductions = useMemo(() => {
    return variableTransactions.reduce((sum, t) => {
      if (
        !t.linkedSwishTxId &&
        typeof t.originalAmount === 'number' &&
        t.originalAmount > (Number(t.amount) || 0)
      ) {
        return sum + Math.max(0, t.originalAmount - (Number(t.amount) || 0));
      }
      return sum;
    }, 0);
  }, [variableTransactions]);

  const periodIncomeTotal = useMemo(() => {
    return periodIncomesList.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [periodIncomesList]);

  const periodFixedTotal = useMemo(() => {
    return periodFixedList.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [periodFixedList]);

  const periodVariableTotal = useMemo(() => {
    const rawSpent = variableTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    let storeRefunds = 0;
    let unlinkedSwish = 0;
    for (const t of reimbursementTransactions) {
      const amt = Math.abs(Number(t.amount) || 0);
      if (t.category === 'Återbetalning') {
        storeRefunds += amt;
      } else {
        unlinkedSwish += amt;
      }
    }
    const effectiveSwishDeduction = Math.max(0, unlinkedSwish - unlinkedManualSplitReductions);
    return Math.max(0, rawSpent - storeRefunds - effectiveSwishDeduction);
  }, [variableTransactions, reimbursementTransactions, unlinkedManualSplitReductions]);

  const totalSpent = periodFixedTotal + periodVariableTotal;
  const netSavings = periodIncomeTotal - totalSpent;

  // Kategorilistan: utgifter och inkomster hålls isär (se utils/categoryBreakdown.ts)
  const categoryBreakdown = useMemo(
    () =>
      buildCategoryBreakdown({
        variableTransactions,
        periodFixedList,
        reimbursementTransactions,
        unlinkedManualSplitReductions,
        periodIncomesList,
      }),
    [
      variableTransactions,
      periodFixedList,
      reimbursementTransactions,
      unlinkedManualSplitReductions,
      periodIncomesList,
    ]
  );

  // Utgiftskategorier med procentandel för cirkeldiagrammet
  const expenseChartSlices = useMemo((): ExpenseChartSlice[] => {
    const expenseCats = categoryBreakdown.filter(
      (c) => !c.isIncomeCategory && c.amount > 0
    );
    const sum = expenseCats.reduce((acc, c) => acc + c.amount, 0);
    if (sum <= 0) return [];

    let cumulativeFraction = 0;
    return expenseCats.map((cat) => {
      const fraction = cat.amount / sum;
      const startFraction = cumulativeFraction;
      cumulativeFraction += fraction;
      return {
        category: cat.category,
        amount: cat.amount,
        fraction,
        percentage: Math.round(fraction * 100),
        exactPercentage: (fraction * 100).toFixed(1),
        startFraction,
        color: resolveCategoryColor(cat.category),
      };
    });
  }, [categoryBreakdown]);

  return {
    availablePeriods,
    computedPeriod,
    periodIncomeTotal,
    totalSpent,
    netSavings,
    categoryBreakdown,
    expenseChartSlices,
  };
}
