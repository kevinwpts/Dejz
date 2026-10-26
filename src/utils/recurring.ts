import { TransactionItem, FixedExpenseItem, IncomeItem } from '../components/HomeTab';
import { extractMerchantKeyVariants, normalizeMerchantKey } from './appCache';

export interface RecurringMatchResult {
  isRecurring: boolean;
  type?: 'expense' | 'income';
  matchedName?: string;
  matchedItemId?: string;
}

const EVERYDAY_GROCERY_OR_FOOD_KEYWORDS = [
  'ica maxi',
  'maxi ica',
  'ica kvantum',
  'ica supermarket',
  'ica nära',
  'ica nara',
  'stora coop',
  'coop ',
  'willys',
  'hemköp',
  'hemkop',
  'lidl',
  'city gross',
  'systembolaget',
  'mcdonalds',
  'max burgers',
  'max hamburger',
  'burger king',
  'espresso house',
  'pressbyrån',
  'pressbyran',
  '7-eleven',
  'foodora',
  'wolt',
];

const GENERIC_WRAPPER_WORDS = new Set([
  'hyra',
  'boende',
  'lön',
  'lon',
  'ab',
  'aktiebolag',
  'sverige',
  'sweden',
  'se',
  'autogiro',
  'bankgiro',
  'plusgiro',
  'kort',
  'kortköp',
  'kortkop',
  'betalning',
  'månadsavgift',
  'manadsavgift',
  'abonnemang',
  'försäkring',
  'forsakring',
  'hemförsäkring',
  'hemforsakring',
  'el',
  'bredband',
  'mobil',
  'plus',
  'premium',
  'standard',
  'familj',
  'individual',
]);

function extractSpecificBrandTokens(name: string): string[] {
  const variants = extractMerchantKeyVariants(name);
  const tokens = new Set<string>();

  for (const v of variants) {
    if (v.length >= 3 && !GENERIC_WRAPPER_WORDS.has(v)) {
      tokens.add(v);
    }
    const cleaned = v
      .replace(/[()[\]/.,:;-]+/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 4 && !GENERIC_WRAPPER_WORDS.has(w));
    for (const word of cleaned) {
      tokens.add(word);
    }
  }

  return Array.from(tokens);
}

function isEverydayGroceryPurchase(combinedNorm: string): boolean {
  const padded = ` ${combinedNorm} `;
  if (
    padded.includes(' ica ') &&
    !padded.includes('försäkring') &&
    !padded.includes('forsakring') &&
    !padded.includes('banken')
  ) {
    return true;
  }
  if (padded.includes(' coop ')) {
    return true;
  }
  return EVERYDAY_GROCERY_OR_FOOD_KEYWORDS.some((kw) => combinedNorm.includes(kw));
}

export function findMatchingFixedExpense(
  tx: Partial<TransactionItem> | string | null | undefined,
  fixedExpenses?: FixedExpenseItem[]
): FixedExpenseItem | null {
  if (!tx || !fixedExpenses || fixedExpenses.length === 0) return null;

  const isStr = typeof tx === 'string';
  const txTitleNorm = normalizeMerchantKey(isStr ? tx : tx.title || '');
  const combinedNorm = normalizeMerchantKey(
    isStr
      ? tx
      : [tx.title, tx.rawDescription, tx.counterpartyName, tx.note].filter(Boolean).join(' ')
  );

  if (!combinedNorm) return null;

  const isGrocery = isEverydayGroceryPurchase(combinedNorm);

  for (const exp of fixedExpenses) {
    const expNameNorm = normalizeMerchantKey(exp.name);
    const expOrigNorm = exp.originalName ? normalizeMerchantKey(exp.originalName) : '';
    if (!expNameNorm) continue;

    // Exact match on normalized title or originalName always wins
    if (
      txTitleNorm === expNameNorm ||
      (expOrigNorm && txTitleNorm === expOrigNorm)
    ) {
      return exp;
    }

    // Never let an everyday grocery/restaurant trip fuzzy-match a fixed expense
    if (isGrocery && !isEverydayGroceryPurchase(expNameNorm)) {
      continue;
    }

    const candidateNames = [exp.name, exp.originalName].filter(Boolean) as string[];
    for (const candName of candidateNames) {
      const variants = extractMerchantKeyVariants(candName);
      for (const v of variants) {
        if (v.length >= 3 && (combinedNorm.includes(v) || (txTitleNorm.length >= 4 && v.includes(txTitleNorm)))) {
          return exp;
        }
      }

      const brandTokens = extractSpecificBrandTokens(candName);
      for (const token of brandTokens) {
        // Guard against "max" matching "max burgers" or "ica" matching "ica kvantum"
        if (token === 'max' || token === 'ica' || token === 'coop' || token === 'apple') {
          continue;
        }
        if (token.length >= 5 && combinedNorm.includes(token)) {
          return exp;
        }
      }
    }
  }

  return null;
}

export function findMatchingIncome(
  tx: Partial<TransactionItem> | string | null | undefined,
  incomes?: IncomeItem[]
): IncomeItem | null {
  if (!tx || !incomes || incomes.length === 0) return null;

  const isStr = typeof tx === 'string';
  const txTitleNorm = normalizeMerchantKey(isStr ? tx : tx.title || '');
  const combinedNorm = normalizeMerchantKey(
    isStr
      ? tx
      : [tx.title, tx.rawDescription, tx.counterpartyName, tx.note].filter(Boolean).join(' ')
  );

  if (!combinedNorm) return null;

  for (const inc of incomes) {
    const incNameNorm = normalizeMerchantKey(inc.name);
    const incOrigNorm = inc.originalName ? normalizeMerchantKey(inc.originalName) : '';
    if (!incNameNorm) continue;

    if (
      txTitleNorm === incNameNorm ||
      (incOrigNorm && txTitleNorm === incOrigNorm)
    ) {
      return inc;
    }

    const candidateNames = [inc.name, inc.originalName].filter(Boolean) as string[];
    for (const candName of candidateNames) {
      const variants = extractMerchantKeyVariants(candName);
      for (const v of variants) {
        if (v.length >= 3 && (combinedNorm.includes(v) || (txTitleNorm.length >= 3 && v.includes(txTitleNorm)))) {
          return inc;
        }
      }

      const brandTokens = extractSpecificBrandTokens(candName);
      for (const token of brandTokens) {
        if (token.length >= 4 && combinedNorm.includes(token)) {
          return inc;
        }
      }
    }
  }

  return null;
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
  const txCat = (tx.category || '').toLowerCase().trim();

  // 1. Match against fixed expenses (when not an explicit income)
  if (tx.type !== 'income') {
    const matchedExp = findMatchingFixedExpense(tx, fixedExpenses);
    if (matchedExp) {
      return {
        isRecurring: true,
        type: 'expense',
        matchedName: matchedExp.name,
        matchedItemId: matchedExp.id,
      };
    }
  }

  // 2. Match against fixed incomes (when not an explicit expense, or if income)
  if (tx.type === 'income') {
    const matchedInc = findMatchingIncome(tx, incomes);
    if (matchedInc) {
      return {
        isRecurring: true,
        type: 'income',
        matchedName: matchedInc.name,
        matchedItemId: matchedInc.id,
      };
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
