// Hittar liknande transaktioner (samma butik, kedja, fasta utgift eller inkomst) och summerar dem.
import type { TransactionItem, FixedExpenseItem, IncomeItem } from '../../app/models';
import { compareTransactionsChronologically } from '../../app/models';
import {
  extractMerchantKeyVariants,
  isGenericPlaceholderMerchant,
  normalizeMerchantKey,
} from '../appCache';
import { GENERIC_WRAPPER_WORDS } from './text';
import { findMatchingFixedExpense, findMatchingIncome } from './matching';
import { detectMerchantChain } from './merchantChains';

export interface SimilarTransactionsSummary {
  brandLabel: string;
  transactions: TransactionItem[];
  sameMerchantTransactions: TransactionItem[];
  totalAmount: number;
  averageAmount: number;
}

function extractNormalizedSwishPhoneFromTx(tx: Partial<TransactionItem> | null | undefined): string {
  if (!tx) return '';
  for (const field of [tx.rawDescription, tx.counterpartyName, tx.title]) {
    if (!field) continue;
    const m = String(field).match(/(?:\+?46\s*7[02369]|0046\s*7[02369]|07[02369]|123)(?:[\s-]?\d){7}/);
    if (m) {
      const digits = m[0].replace(/\D/g, '');
      if (digits.startsWith('00467') && digits.length === 13) return '07' + digits.slice(5);
      if (digits.startsWith('467') && digits.length === 11) return '07' + digits.slice(3);
      if ((digits.startsWith('07') || digits.startsWith('123')) && digits.length === 10) return digits;
    }
  }
  return '';
}

/**
 * Finds all transactions in `allTransactions` that belong to the same merchant, chain,
 * fixed expense, or income as `targetTx` (sorted newest first).
 * Also separates `sameMerchantTransactions` (exact same store/location name, e.g. "Circle K Varberg")
 * from `transactions` (all stores in the same chain, e.g. "Circle K Helsingborg", "Circle K Stockholm").
 */
export function findSimilarTransactionsForTransaction(
  targetTx: TransactionItem | null | undefined,
  allTransactions: TransactionItem[] = [],
  fixedExpenses: FixedExpenseItem[] = [],
  incomes: IncomeItem[] = []
): SimilarTransactionsSummary {
  if (!targetTx) {
    return {
      brandLabel: '',
      transactions: [],
      sameMerchantTransactions: [],
      totalAmount: 0,
      averageAmount: 0,
    };
  }

  const targetType = targetTx.type === 'income' ? 'income' : 'expense';
  const targetSwishPhone = extractNormalizedSwishPhoneFromTx(targetTx);
  const isTargetSwish =
    Boolean(targetSwishPhone) ||
    targetTx.category === 'Swish' ||
    /\bswish\b/i.test(`${targetTx.title || ''} ${targetTx.rawDescription || ''} ${targetTx.counterpartyName || ''}`);

  const matchedFixed =
    targetType === 'expense' ? findMatchingFixedExpense(targetTx, fixedExpenses) : null;
  const matchedIncome =
    targetType === 'income' ? findMatchingIncome(targetTx, incomes) : null;
  const targetChain = detectMerchantChain(targetTx);
  const targetTitleNorm = normalizeMerchantKey(targetTx.title || '');
  const targetRawNorm = normalizeMerchantKey(
    targetTx.counterpartyName || targetTx.rawDescription || targetTx.title || ''
  );
  const targetVariants = extractMerchantKeyVariants(targetTx.title || '').filter(
    (v) => v.length >= 4 && !GENERIC_WRAPPER_WORDS.has(v)
  );
  const isTargetGeneric = isGenericPlaceholderMerchant(targetTx.title);

  const matched: TransactionItem[] = [];
  const sameMerchant: TransactionItem[] = [];

  for (const tx of allTransactions) {
    if (tx.id === targetTx.id) {
      matched.push(tx);
      sameMerchant.push(tx);
      continue;
    }

    const txType = tx.type === 'income' ? 'income' : 'expense';
    const isStoreRefundForExpense =
      targetType === 'expense' && txType === 'income' && tx.category === 'Återbetalning';
    if (txType !== targetType && !isStoreRefundForExpense) continue;

    const otherSwishPhone = extractNormalizedSwishPhoneFromTx(tx);
    const isOtherSwish =
      Boolean(otherSwishPhone) ||
      tx.category === 'Swish' ||
      /\bswish\b/i.test(`${tx.title || ''} ${tx.rawDescription || ''} ${tx.counterpartyName || ''}`);

    // Swish-transaktioner får ENDAST grupperas med andra Swish-transaktioner som har EXAKT samma telefonnummer
    // (eller exakt samma namngivna person om inget telefonnummer finns). Olika telefonnummer får ALDRIG slås ihop!
    if (isTargetSwish || isOtherSwish) {
      if (!isTargetSwish || !isOtherSwish) continue;
      if (targetSwishPhone || otherSwishPhone) {
        if (targetSwishPhone && otherSwishPhone && targetSwishPhone === otherSwishPhone) {
          matched.push(tx);
          sameMerchant.push(tx);
        }
        continue;
      }
      const otherTitleNormSwish = normalizeMerchantKey(tx.title || '');
      if (
        !isTargetGeneric &&
        targetTitleNorm &&
        targetTitleNorm === otherTitleNormSwish
      ) {
        matched.push(tx);
        sameMerchant.push(tx);
      }
      continue;
    }

    const otherTitleNorm = normalizeMerchantKey(tx.title || '');
    const otherRawNorm = normalizeMerchantKey(
      tx.counterpartyName || tx.rawDescription || tx.title || ''
    );

    const isExactSameStore =
      !isTargetGeneric &&
      Boolean(
        (targetTitleNorm && otherTitleNorm === targetTitleNorm) ||
          (targetRawNorm && otherRawNorm === targetRawNorm)
      );

    if (isExactSameStore) {
      sameMerchant.push(tx);
    }

    // 1. Same fixed expense
    if (matchedFixed) {
      const otherFixed = findMatchingFixedExpense(tx, [matchedFixed]);
      if (otherFixed && otherFixed.id === matchedFixed.id) {
        matched.push(tx);
        continue;
      }
    }

    // 2. Same income source
    if (matchedIncome) {
      const otherInc = findMatchingIncome(tx, [matchedIncome]);
      if (otherInc && otherInc.id === matchedIncome.id) {
        matched.push(tx);
        continue;
      }
    }

    // 3. Same known retail/service chain (e.g. "Circle K Varberg", "Circle K Helsingborg" & "Circle K Stockholm")
    if (targetChain) {
      const otherChain = detectMerchantChain(tx);
      if (otherChain && otherChain.key === targetChain.key) {
        matched.push(tx);
        continue;
      }
    }

    // 4. Exact normalized title match
    if (targetTitleNorm && otherTitleNorm === targetTitleNorm) {
      if (!isTargetGeneric) {
        matched.push(tx);
        continue;
      }
      // For generic titles, require same rawDescription/counterpartyName
      const rawA = normalizeMerchantKey(targetTx.rawDescription || targetTx.counterpartyName || '');
      const rawB = normalizeMerchantKey(tx.rawDescription || tx.counterpartyName || '');
      if (rawA && rawA === rawB) {
        matched.push(tx);
        sameMerchant.push(tx);
        continue;
      }
    }

    // 5. Shared brand variant (for non-generic merchants)
    if (!isTargetGeneric && targetVariants.length > 0 && !isGenericPlaceholderMerchant(tx.title)) {
      const otherVariants = extractMerchantKeyVariants(tx.title || '').filter(
        (v) => v.length >= 4 && !GENERIC_WRAPPER_WORDS.has(v)
      );
      if (targetVariants.some((tv) => otherVariants.includes(tv))) {
        matched.push(tx);
        continue;
      }
    }
  }

  matched.sort(compareTransactionsChronologically);
  sameMerchant.sort(compareTransactionsChronologically);

  const totalAmount = Math.max(
    0,
    matched.reduce((sum, t) => {
      const amt = Math.abs(Number(t.amount) || 0);
      if (targetType === 'expense' && t.type === 'income' && t.category === 'Återbetalning') {
        return sum - amt;
      }
      return sum + amt;
    }, 0)
  );
  const expenseCount =
    targetType === 'expense'
      ? matched.filter((t) => t.type !== 'income').length || matched.length
      : matched.length;
  const averageAmount = expenseCount > 0 ? Math.round(totalAmount / expenseCount) : 0;

  const brandLabel =
    matchedFixed?.name ||
    matchedIncome?.name ||
    targetChain?.label ||
    targetTx.title ||
    'Mottagare';

  return {
    brandLabel,
    transactions: matched,
    sameMerchantTransactions: sameMerchant,
    totalAmount,
    averageAmount,
  };
}

/**
 * Finds all historical transactions that match a specific FixedExpenseItem.
 */
export function findTransactionsForFixedExpense(
  expense: FixedExpenseItem | null | undefined,
  allTransactions: TransactionItem[] = []
): SimilarTransactionsSummary {
  if (!expense) {
    return {
      brandLabel: '',
      transactions: [],
      sameMerchantTransactions: [],
      totalAmount: 0,
      averageAmount: 0,
    };
  }

  const expChain = detectMerchantChain({ title: expense.name, rawDescription: expense.originalName });

  const matched = allTransactions.filter((tx) => {
    if (tx.type === 'income') return false;
    const hit = findMatchingFixedExpense(tx, [expense]);
    if (hit && hit.id === expense.id) return true;
    if (expChain) {
      const txChain = detectMerchantChain(tx);
      if (txChain && txChain.key === expChain.key) return true;
    }
    return false;
  });

  matched.sort(compareTransactionsChronologically);

  const totalAmount = matched.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  const averageAmount = matched.length > 0 ? Math.round(totalAmount / matched.length) : 0;

  return {
    brandLabel: expense.name,
    transactions: matched,
    sameMerchantTransactions: matched,
    totalAmount,
    averageAmount,
  };
}

/**
 * Finds all historical transactions that match a specific IncomeItem.
 */
export function findTransactionsForIncome(
  income: IncomeItem | null | undefined,
  allTransactions: TransactionItem[] = []
): SimilarTransactionsSummary {
  if (!income) {
    return {
      brandLabel: '',
      transactions: [],
      sameMerchantTransactions: [],
      totalAmount: 0,
      averageAmount: 0,
    };
  }

  const matched = allTransactions.filter((tx) => {
    if (tx.type !== 'income') return false;
    const hit = findMatchingIncome(tx, [income]);
    return Boolean(hit && hit.id === income.id);
  });

  matched.sort(compareTransactionsChronologically);

  const totalAmount = matched.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  const averageAmount = matched.length > 0 ? Math.round(totalAmount / matched.length) : 0;

  return {
    brandLabel: income.name,
    transactions: matched,
    sameMerchantTransactions: matched,
    totalAmount,
    averageAmount,
  };
}
