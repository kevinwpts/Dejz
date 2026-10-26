import { TransactionItem, FixedExpenseItem, IncomeItem } from '../components/HomeTab';

export interface RecurringMatchResult {
  isRecurring: boolean;
  type?: 'expense' | 'income';
  matchedName?: string;
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
    return { isRecurring: true, type: 'expense', matchedName: tx.title };
  }
  if (tx.id?.startsWith('inc-')) {
    return { isRecurring: true, type: 'income', matchedName: tx.title };
  }

  const txTitle = (tx.title || '').toLowerCase().trim();
  const txRaw = (tx.rawDescription || '').toLowerCase().trim();
  const txCounterparty = (tx.counterpartyName || '').toLowerCase().trim();
  const txCat = (tx.category || '').toLowerCase().trim();

  // 1. Match against fixed expenses
  if (fixedExpenses && fixedExpenses.length > 0) {
    for (const exp of fixedExpenses) {
      const expName = exp.name.toLowerCase().trim();
      if (!expName) continue;

      if (
        txTitle === expName ||
        (txTitle.length >= 3 && expName.includes(txTitle)) ||
        (expName.length >= 3 && txTitle.includes(expName)) ||
        (txRaw && txRaw.includes(expName)) ||
        (txCounterparty && txCounterparty.includes(expName))
      ) {
        return { isRecurring: true, type: 'expense', matchedName: exp.name };
      }
    }
  }

  // 2. Match against fixed incomes
  if (incomes && incomes.length > 0) {
    for (const inc of incomes) {
      const incName = inc.name.toLowerCase().trim();
      if (!incName) continue;

      if (
        txTitle === incName ||
        (txTitle.length >= 3 && incName.includes(txTitle)) ||
        (incName.length >= 3 && txTitle.includes(incName)) ||
        (txRaw && txRaw.includes(incName)) ||
        (txCounterparty && txCounterparty.includes(incName))
      ) {
        return { isRecurring: true, type: 'income', matchedName: inc.name };
      }
    }
  }

  // 3. Fallback for salary income (always recurring)
  if (
    tx.type === 'income' &&
    (txCat === 'lön' ||
      txTitle.includes('lön') ||
      txRaw.includes('lön') ||
      txRaw.includes('salary') ||
      txRaw.includes('löneutbetalning'))
  ) {
    return { isRecurring: true, type: 'income', matchedName: 'Lön' };
  }

  return { isRecurring: false };
}
