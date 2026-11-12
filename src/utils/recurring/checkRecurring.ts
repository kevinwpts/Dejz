// Avgör om en enskild transaktion är en återkommande fast utgift eller inkomst.
import type { TransactionItem, FixedExpenseItem, IncomeItem } from '../../app/models';
import { isHybridSubscriptionAndOneOffMerchant } from './text';
import {
  findAllMatchingFixedExpensesByMerchant,
  findMatchingFixedExpense,
  findMatchingIncome,
  isFixedExpenseAmountMatch,
} from './matching';

export interface RecurringMatchResult {
  isRecurring: boolean;
  hasExactAmountMatch?: boolean;
  type?: 'expense' | 'income';
  matchedName?: string;
  matchedItemId?: string;
  matchedItem?: FixedExpenseItem | IncomeItem;
}

/**
 * Checks if a transaction represents a recurring fixed expense or income.
 * Matches against known fixed expenses and incomes registered in the app.
 */
export function checkIsRecurringTransaction(
  tx: Partial<TransactionItem> | null | undefined,
  fixedExpenses?: FixedExpenseItem[],
  incomes?: IncomeItem[]
): RecurringMatchResult {
  if (!tx) return { isRecurring: false };

  // Explicit ID prefix check (items generated directly from fixed items)
  if (tx.id?.startsWith('fix-')) {
    return { isRecurring: true, hasExactAmountMatch: true, type: 'expense', matchedName: tx.title };
  }
  if (tx.id?.startsWith('inc-')) {
    return { isRecurring: true, hasExactAmountMatch: true, type: 'income', matchedName: tx.title };
  }

  const txTitle = (tx.title || '').toLowerCase().trim();
  const txRaw = (tx.rawDescription || '').toLowerCase().trim();
  const txCat = (tx.category || '').toLowerCase().trim();
  const txAmt = Math.round(Math.abs(Number(tx.amount) || 0));

  // 1. Match against fixed expenses (when not an explicit income)
  if (tx.type !== 'income') {
    const allMatchedExps = findAllMatchingFixedExpensesByMerchant(tx, fixedExpenses);
    const matchedExp = findMatchingFixedExpense(tx, fixedExpenses);
    if (matchedExp) {
      const isExplicitlyLinked = tx.linkedFixedExpenseId === matchedExp.id;
      const hasExactAmountMatch =
        isExplicitlyLinked ||
        (allMatchedExps.length > 0
          ? allMatchedExps.some((exp) => isFixedExpenseAmountMatch(exp, txAmt))
          : isFixedExpenseAmountMatch(matchedExp, txAmt));

      // För hybrid-handlare (t.ex. Apple, Klarna, Google, Amazon, kollektivtrafik) där man både kan ha
      // ett fast abonnemang OCH göra engångsköp: kräv att beloppet stämmer överens med den fasta utgiften!
      if (!isExplicitlyLinked && !hasExactAmountMatch && isHybridSubscriptionAndOneOffMerchant(tx)) {
        return {
          isRecurring: false,
          hasExactAmountMatch: false,
        };
      }

      return {
        isRecurring: true,
        hasExactAmountMatch,
        type: 'expense',
        matchedName: matchedExp.name,
        matchedItemId: matchedExp.id,
        matchedItem: matchedExp,
      };
    }
  }

  // 2. Match against fixed incomes (when not an explicit expense, or if income)
  if (tx.type === 'income') {
    if (tx.category === 'Återbetalning') {
      return { isRecurring: false, hasExactAmountMatch: false };
    }
    const matchedInc = findMatchingIncome(tx, incomes);
    if (matchedInc) {
      const incAmt = Math.round(Math.abs(Number(matchedInc.amount) || 0));
      const hasExactAmountMatch =
        tx.linkedIncomeId === matchedInc.id ||
        txAmt <= 0 ||
        Math.abs(incAmt - txAmt) <= Math.max(25, Math.round(incAmt * 0.1));
      return {
        isRecurring: true,
        hasExactAmountMatch,
        type: 'income',
        matchedName: matchedInc.name,
        matchedItemId: matchedInc.id,
        matchedItem: matchedInc,
      };
    }
  }

  // 3. Fallback for salary income (always recurring)
  if (
    tx.type === 'income' &&
    tx.category !== 'Återbetalning' &&
    (txCat === 'lön' ||
      txTitle.includes('lön') ||
      txRaw.includes('lön') ||
      txRaw.includes('salary') ||
      txRaw.includes('löneutbetalning'))
  ) {
    return { isRecurring: true, hasExactAmountMatch: true, type: 'income', matchedName: 'Lön' };
  }

  return { isRecurring: false, hasExactAmountMatch: false };
}
