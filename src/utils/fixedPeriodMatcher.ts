import { FixedExpense, Income, Transaction } from '../types';
import { findKnownBrandDomain } from './logo';

export interface MatchedFixedItemInfo {
  itemId: string;
  transactionId: string;
  transaction: Transaction;
  actualAmount: number;
  dateStr: string;
  timestamp: number;
}

export interface PeriodReconciliationResult {
  matchedFixedExpenses: Record<string, MatchedFixedItemInfo>;
  matchedIncomes: Record<string, MatchedFixedItemInfo>;
  matchedSavings: Record<string, MatchedFixedItemInfo>;
  matchedTransactionIds: Set<string>;
  txToFixedItemMap: Record<
    string,
    { kind: 'expense' | 'income' | 'savings'; itemId: string; itemName: string }
  >;
}

function normalizeMatchText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(
      /\b(ab|aktiebolag|as|oy|aps|ltd|gmbh|inc|llc|sverige|sweden|autogiro|betalning| kortköp|bg|pg|bankgiro|plusgiro|se)\b/gi,
      ' '
    )
    .replace(/[^a-z0-9åäö]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMerchantRaw(tx: Transaction): string {
  const m =
    typeof tx.merchant === 'object'
      ? (tx.merchant as any)?.name
      : tx.merchant ||
        (typeof tx.category === 'object' ? (tx.category as any)?.name : tx.category);
  return String(m || '').trim();
}

function isNameMatch(itemNameRaw: string, txMerchantRaw: string): boolean {
  const itemClean = normalizeMatchText(itemNameRaw);
  const txClean = normalizeMatchText(txMerchantRaw);
  if (!itemClean || !txClean) return false;

  if (itemClean === txClean) return true;
  if (itemClean.length >= 3 && txClean.includes(itemClean)) return true;
  if (txClean.length >= 3 && itemClean.includes(txClean)) return true;

  const itemDomain = findKnownBrandDomain(itemNameRaw);
  const txDomain = findKnownBrandDomain(txMerchantRaw);
  if (itemDomain && txDomain && itemDomain === txDomain) return true;

  const itemTokens = itemClean.split(' ').filter((t) => t.length >= 3);
  const txTokens = txClean.split(' ').filter((t) => t.length >= 3);
  if (itemTokens.length > 0 && txTokens.length > 0) {
    if (itemTokens[0] === txTokens[0] && itemTokens[0].length >= 4) {
      return true;
    }
  }

  return false;
}

const SALARY_KEYWORDS = [
  'lön',
  'lon',
  'salary',
  'löneutbetalning',
  'loneutbetalning',
  'utbetalning lön',
  'insättning lön',
  'csn',
  'föräldrapenning',
  'foraldrapenning',
  'pension',
  'a-kassa',
  'försäkringskassan',
  'forsakringskassan',
];

function isLikelySalaryOrIncomeMatch(income: Income, tx: Transaction): boolean {
  const incName = String(income.name || income.category || '');
  const txMerchant = getMerchantRaw(tx);
  const txNote = typeof tx.note === 'string' ? tx.note : '';

  if (isNameMatch(incName, txMerchant) || (txNote && isNameMatch(incName, txNote))) {
    return true;
  }

  const incClean = normalizeMatchText(incName);
  const txClean = normalizeMatchText(`${txMerchant} ${txNote}`);
  const isIncomeSalaryNamed = SALARY_KEYWORDS.some((kw) => incClean.includes(kw));
  const isTxSalaryNamed = SALARY_KEYWORDS.some((kw) => txClean.includes(kw));

  if (isIncomeSalaryNamed && isTxSalaryNamed) {
    return true;
  }

  // If the user has a main salary item (e.g. >= 8 000 kr) and receives a bank income within 25% of that amount
  const expectedAmount = Math.abs(Number(income.amount) || 0);
  const actualAmount = Math.abs(Number(tx.amount) || 0);
  if (expectedAmount >= 5000 && actualAmount >= 5000) {
    const diffRatio = Math.abs(actualAmount - expectedAmount) / expectedAmount;
    if (diffRatio <= 0.25) {
      return true;
    }
  }

  return false;
}

/**
 * Matches period transactions against the user's Fixed Expenses, Incomes, and Monthly Savings
 * so that bank-imported salary and bills are linked to "Min ekonomi" instead of being
 * double-counted as variable everyday spending or extra income.
 */
export function reconcilePeriodFixedAndVariable(
  periodTransactions: Transaction[],
  activeFixedExpenses: FixedExpense[],
  dueIncomes: Income[],
  dueSavings: any[] = []
): PeriodReconciliationResult {
  const matchedFixedExpenses: Record<string, MatchedFixedItemInfo> = {};
  const matchedIncomes: Record<string, MatchedFixedItemInfo> = {};
  const matchedSavings: Record<string, MatchedFixedItemInfo> = {};
  const matchedTransactionIds = new Set<string>();
  const txToFixedItemMap: Record<
    string,
    { kind: 'expense' | 'income' | 'savings'; itemId: string; itemName: string }
  > = {};

  if (!Array.isArray(periodTransactions) || periodTransactions.length === 0) {
    return {
      matchedFixedExpenses,
      matchedIncomes,
      matchedSavings,
      matchedTransactionIds,
      txToFixedItemMap,
    };
  }

  const expenseTxs = periodTransactions.filter(
    (tx) => tx && tx.type === 'expense' && (Number(tx.amount) || 0) > 0
  );
  const incomeTxs = periodTransactions.filter(
    (tx) => tx && tx.type === 'income' && (Number(tx.amount) || 0) > 0
  );

  // 1. Match Fixed Incomes (e.g. Lön, CSN, Barnbidrag)
  for (const inc of dueIncomes || []) {
    if (!inc || !inc.id) continue;
    const expected = Math.abs(Number(inc.amount) || 0);
    let bestTx: Transaction | null = null;
    let bestScore = Infinity;

    for (const tx of incomeTxs) {
      if (matchedTransactionIds.has(tx.id)) continue;
      if (!isLikelySalaryOrIncomeMatch(inc, tx)) continue;

      const actual = Math.abs(Number(tx.amount) || 0);
      const diffRatio = expected > 0 ? Math.abs(actual - expected) / expected : 0;
      const maxTolerance = inc.isVariable ? 0.65 : 0.35;
      if (expected > 0 && diffRatio > maxTolerance) continue;

      if (diffRatio < bestScore) {
        bestScore = diffRatio;
        bestTx = tx;
      }
    }

    if (bestTx) {
      matchedTransactionIds.add(bestTx.id);
      const info: MatchedFixedItemInfo = {
        itemId: inc.id,
        transactionId: bestTx.id,
        transaction: bestTx,
        actualAmount: Math.round(Math.abs(Number(bestTx.amount) || 0)),
        dateStr: bestTx.date || new Date(bestTx.timestamp).toISOString().slice(0, 10),
        timestamp: bestTx.timestamp,
      };
      matchedIncomes[inc.id] = info;
      txToFixedItemMap[bestTx.id] = {
        kind: 'income',
        itemId: inc.id,
        itemName: inc.name || 'Inkomst',
      };
    }
  }

  // 2. Match Fixed Expenses (e.g. Hyra, Spotify, El, Försäkring, Bolån)
  for (const fe of activeFixedExpenses || []) {
    if (!fe || !fe.id) continue;
    const expected = Math.abs(Number(fe.amount) || 0);
    const feName = String(fe.name || fe.category || '');
    let bestTx: Transaction | null = null;
    let bestScore = Infinity;

    for (const tx of expenseTxs) {
      if (matchedTransactionIds.has(tx.id)) continue;
      const txMerchant = getMerchantRaw(tx);
      const txNote = typeof tx.note === 'string' ? tx.note : '';

      const nameMatches =
        isNameMatch(feName, txMerchant) || (txNote ? isNameMatch(feName, txNote) : false);
      if (!nameMatches) continue;

      const actual = Math.abs(Number(tx.amount) || 0);
      const diffRatio = expected > 0 ? Math.abs(actual - expected) / expected : 0;
      const maxTolerance = fe.isVariable ? 0.85 : 0.35;
      if (expected > 0 && diffRatio > maxTolerance) continue;

      if (diffRatio < bestScore) {
        bestScore = diffRatio;
        bestTx = tx;
      }
    }

    if (bestTx) {
      matchedTransactionIds.add(bestTx.id);
      const info: MatchedFixedItemInfo = {
        itemId: fe.id,
        transactionId: bestTx.id,
        transaction: bestTx,
        actualAmount: Math.round(Math.abs(Number(bestTx.amount) || 0)),
        dateStr: bestTx.date || new Date(bestTx.timestamp).toISOString().slice(0, 10),
        timestamp: bestTx.timestamp,
      };
      matchedFixedExpenses[fe.id] = info;
      txToFixedItemMap[bestTx.id] = {
        kind: 'expense',
        itemId: fe.id,
        itemName: fe.name || 'Fast utgift',
      };
    }
  }

  // 3. Match Monthly Savings items if they appear as expense/transfer transactions
  for (const sav of dueSavings || []) {
    if (!sav || !sav.id) continue;
    const expected = Math.abs(Number(sav.amount) || Number(sav.targetAmount) || 0);
    const savName = String(sav.name || sav.title || '');
    if (!savName) continue;

    let bestTx: Transaction | null = null;
    let bestScore = Infinity;

    for (const tx of expenseTxs) {
      if (matchedTransactionIds.has(tx.id)) continue;
      const txMerchant = getMerchantRaw(tx);
      if (!isNameMatch(savName, txMerchant)) continue;

      const actual = Math.abs(Number(tx.amount) || 0);
      const diffRatio = expected > 0 ? Math.abs(actual - expected) / expected : 0;
      if (expected > 0 && diffRatio > 0.35) continue;

      if (diffRatio < bestScore) {
        bestScore = diffRatio;
        bestTx = tx;
      }
    }

    if (bestTx) {
      matchedTransactionIds.add(bestTx.id);
      const info: MatchedFixedItemInfo = {
        itemId: sav.id,
        transactionId: bestTx.id,
        transaction: bestTx,
        actualAmount: Math.round(Math.abs(Number(bestTx.amount) || 0)),
        dateStr: bestTx.date || new Date(bestTx.timestamp).toISOString().slice(0, 10),
        timestamp: bestTx.timestamp,
      };
      matchedSavings[sav.id] = info;
      txToFixedItemMap[bestTx.id] = {
        kind: 'savings',
        itemId: sav.id,
        itemName: savName,
      };
    }
  }

  return {
    matchedFixedExpenses,
    matchedIncomes,
    matchedSavings,
    matchedTransactionIds,
    txToFixedItemMap,
  };
}
