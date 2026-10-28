import { TransactionItem, FixedExpenseItem, IncomeItem } from '../components/HomeTab';
import {
  extractMerchantKeyVariants,
  isGenericPlaceholderMerchant,
  normalizeMerchantKey,
} from './appCache';

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

  const isGrocery = combinedNorm ? isEverydayGroceryPurchase(combinedNorm) : false;

  if (combinedNorm) {
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
  }

  // Fallback för anonyma bankrader (t.ex. "Banktransaktion", "Betalning", "Autogiro" där banken tappat mottagarnamnet
  // när en reserverad hyra eller räkning övergått till bokförd post):
  // Om beloppet på kronan matchar en registrerad fast utgift (>= 150 kr), koppla den till rätt fast utgift!
  if (!isStr && !isGrocery && tx.type !== 'income') {
    const txAmt = Math.round(Math.abs(Number(tx.amount) || 0));
    if (txAmt >= 150) {
      const hasGenericTitle =
        isGenericPlaceholderMerchant(tx.title) &&
        isGenericPlaceholderMerchant(tx.counterpartyName) &&
        isGenericPlaceholderMerchant(tx.rawDescription);

      if (hasGenericTitle) {
        const exactAmountMatch = fixedExpenses.find(
          (exp) => Math.round(Math.abs(Number(exp.amount) || 0)) === txAmt
        );
        if (exactAmountMatch) {
          return exactAmountMatch;
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

  if (combinedNorm) {
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
  }

  if (!isStr && tx.type === 'income') {
    const txAmt = Math.round(Math.abs(Number(tx.amount) || 0));
    if (txAmt >= 500) {
      const hasGenericTitle =
        isGenericPlaceholderMerchant(tx.title) &&
        isGenericPlaceholderMerchant(tx.counterpartyName) &&
        isGenericPlaceholderMerchant(tx.rawDescription);

      if (hasGenericTitle) {
        const exactAmountMatch = incomes.find(
          (inc) => Math.round(Math.abs(Number(inc.amount) || 0)) === txAmt
        );
        if (exactAmountMatch) {
          return exactAmountMatch;
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

const KNOWN_MERCHANT_CHAINS: { key: string; label: string; patterns: RegExp[] }[] = [
  { key: 'hemkop', label: 'Hemköp', patterns: [/\bhemk[öo]p\b/i] },
  { key: 'coop', label: 'Coop', patterns: [/\b(stora\s+coop|coop\s+forum|coop\s+konsum|coop\s+n[äa]ra|coop\s+extra|coop)\b/i] },
  {
    key: 'ica',
    label: 'ICA',
    patterns: [/\b(ica\s+maxi|maxi\s+ica|ica\s+kvantum|ica\s+supermarket|ica\s+n[äa]ra|ica\s+butik)\b/i, /\bica\b(?!\s*(banken|f[öo]rs[äa]kring))/i],
  },
  { key: 'willys', label: 'Willys', patterns: [/\bwillys\b/i] },
  { key: 'lidl', label: 'Lidl', patterns: [/\blidl\b/i] },
  { key: 'citygross', label: 'City Gross', patterns: [/\bcity\s*gross\b/i] },
  { key: 'systembolaget', label: 'Systembolaget', patterns: [/\bsystembolaget\b/i] },
  { key: 'espressohouse', label: 'Espresso House', patterns: [/\bespresso\s*house\b/i] },
  { key: 'mcdonalds', label: "McDonald's", patterns: [/\bmcdonald'?s?\b/i] },
  { key: 'maxburgers', label: 'Max Burgers', patterns: [/\bmax\s+(burgers|hamburger)/i] },
  { key: 'burgerking', label: 'Burger King', patterns: [/\bburger\s*king\b/i] },
  { key: 'pressbyran', label: 'Pressbyrån', patterns: [/\bpressbyr[åa]n\b/i] },
  { key: '7eleven', label: '7-Eleven', patterns: [/\b7[\s-]*eleven\b/i] },
  { key: 'foodora', label: 'Foodora', patterns: [/\bfoodora\b/i] },
  { key: 'wolt', label: 'Wolt', patterns: [/\bwolt\b/i] },
  { key: 'apoteket', label: 'Apoteket', patterns: [/\bapoteket\b/i] },
  { key: 'apotekhjartat', label: 'Apotek Hjärtat', patterns: [/\bapotek\s+hj[äa]rtat\b/i] },
  { key: 'kronansapotek', label: 'Kronans Apotek', patterns: [/\bkronans\s+apotek\b/i] },
  { key: 'apotea', label: 'Apotea', patterns: [/\bapotea\b/i] },
  { key: 'clasohlson', label: 'Clas Ohlson', patterns: [/\bclas\s*ohlson\b/i] },
  { key: 'ikea', label: 'IKEA', patterns: [/\bikea\b/i] },
  { key: 'biltema', label: 'Biltema', patterns: [/\bbiltema\b/i] },
  { key: 'jula', label: 'Jula', patterns: [/\bjula\b/i] },
  { key: 'rusta', label: 'Rusta', patterns: [/\brusta\b/i] },
  { key: 'normal', label: 'Normal', patterns: [/\bnormal\b/i] },
  { key: 'ahlens', label: 'Åhléns', patterns: [/\b[åa]hl[ée]ns\b/i] },
  { key: 'hm', label: 'H&M', patterns: [/\bh\s*&\s*m\b/i, /\bhennes\s*&\s*mauritz\b/i] },
  { key: 'elgiganten', label: 'Elgiganten', patterns: [/\belgiganten\b/i] },
  { key: 'netonnet', label: 'NetOnNet', patterns: [/\bnetonnet\b/i] },
  { key: 'kjell', label: 'Kjell & Company', patterns: [/\bkjell\s*(&|o)\s*co/i] },
  { key: 'skanetrafiken', label: 'Skånetrafiken', patterns: [/\bsk[åa]netrafiken\b/i] },
  { key: 'vasttrafik', label: 'Västtrafik', patterns: [/\bv[äa]sttrafik\b/i] },
  { key: 'sl', label: 'SL', patterns: [/\bab\s+storstockholms\s+lokaltrafik\b/i] },
  { key: 'sj', label: 'SJ', patterns: [/\bsj\s+ab\b/i] },
  { key: 'uber', label: 'Uber', patterns: [/\buber\b/i] },
  { key: 'bolt', label: 'Bolt', patterns: [/\bbolt\b/i] },
  { key: 'circlek', label: 'Circle K', patterns: [/\bcircle\s*k\b/i] },
  { key: 'okq8', label: 'OKQ8', patterns: [/\bokq8\b/i] },
  { key: 'preem', label: 'Preem', patterns: [/\bpreem\b/i] },
  { key: 'easypark', label: 'EasyPark', patterns: [/\beasypark\b/i] },
  { key: 'aimopark', label: 'Aimo Park', patterns: [/\baimo\s*park\b/i] },
  { key: 'parkster', label: 'Parkster', patterns: [/\bparkster\b/i] },
  { key: 'klarna', label: 'Klarna', patterns: [/\bklarna\b/i] },
  { key: 'spotify', label: 'Spotify', patterns: [/\bspotify\b/i] },
  { key: 'netflix', label: 'Netflix', patterns: [/\bnetflix\b/i] },
  { key: 'sveafastigheter', label: 'Svea Fastigheter', patterns: [/\bsvea\s*fastigheter\b/i] },
  { key: 'heimstaden', label: 'Heimstaden', patterns: [/\bheimstaden\b/i] },
];

function detectMerchantChain(tx: Partial<TransactionItem>): { key: string; label: string } | null {
  const combined = [tx.title, tx.rawDescription, tx.counterpartyName].filter(Boolean).join(' ');
  if (!combined) return null;
  for (const chain of KNOWN_MERCHANT_CHAINS) {
    if (chain.patterns.some((re) => re.test(combined))) {
      return { key: chain.key, label: chain.label };
    }
  }
  return null;
}

export interface SimilarTransactionsSummary {
  brandLabel: string;
  transactions: TransactionItem[];
  totalAmount: number;
  averageAmount: number;
}

/**
 * Finds all transactions in `allTransactions` that belong to the same merchant, chain,
 * fixed expense, or income as `targetTx` (sorted newest first).
 */
export function findSimilarTransactionsForTransaction(
  targetTx: TransactionItem | null | undefined,
  allTransactions: TransactionItem[] = [],
  fixedExpenses: FixedExpenseItem[] = [],
  incomes: IncomeItem[] = []
): SimilarTransactionsSummary {
  if (!targetTx) {
    return { brandLabel: '', transactions: [], totalAmount: 0, averageAmount: 0 };
  }

  const targetType = targetTx.type === 'income' ? 'income' : 'expense';
  const matchedFixed =
    targetType === 'expense' ? findMatchingFixedExpense(targetTx, fixedExpenses) : null;
  const matchedIncome =
    targetType === 'income' ? findMatchingIncome(targetTx, incomes) : null;
  const targetChain = detectMerchantChain(targetTx);
  const targetTitleNorm = normalizeMerchantKey(targetTx.title || '');
  const targetVariants = extractMerchantKeyVariants(targetTx.title || '').filter(
    (v) => v.length >= 4 && !GENERIC_WRAPPER_WORDS.has(v)
  );
  const isTargetGeneric = isGenericPlaceholderMerchant(targetTx.title);

  const matched: TransactionItem[] = [];

  for (const tx of allTransactions) {
    if (tx.id === targetTx.id) {
      matched.push(tx);
      continue;
    }

    const txType = tx.type === 'income' ? 'income' : 'expense';
    if (txType !== targetType) continue;

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

    // 3. Same known retail/service chain (e.g. "Coop", "Hemköp Helsingborg Rydebäck" & "Hemköp")
    if (targetChain) {
      const otherChain = detectMerchantChain(tx);
      if (otherChain && otherChain.key === targetChain.key) {
        matched.push(tx);
        continue;
      }
    }

    // 4. Exact normalized title match
    const otherTitleNorm = normalizeMerchantKey(tx.title || '');
    if (targetTitleNorm && otherTitleNorm === targetTitleNorm) {
      if (!isTargetGeneric) {
        matched.push(tx);
        continue;
      }
      // For generic titles (e.g. "Swish"), require same rawDescription/counterpartyName or amount
      const rawA = normalizeMerchantKey(targetTx.rawDescription || targetTx.counterpartyName || '');
      const rawB = normalizeMerchantKey(tx.rawDescription || tx.counterpartyName || '');
      if (rawA && rawA === rawB) {
        matched.push(tx);
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

  matched.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalAmount = matched.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  const averageAmount = matched.length > 0 ? Math.round(totalAmount / matched.length) : 0;

  const brandLabel =
    matchedFixed?.name ||
    matchedIncome?.name ||
    targetChain?.label ||
    targetTx.title ||
    'Mottagare';

  return {
    brandLabel,
    transactions: matched,
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
    return { brandLabel: '', transactions: [], totalAmount: 0, averageAmount: 0 };
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

  matched.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalAmount = matched.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  const averageAmount = matched.length > 0 ? Math.round(totalAmount / matched.length) : 0;

  return {
    brandLabel: expense.name,
    transactions: matched,
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
    return { brandLabel: '', transactions: [], totalAmount: 0, averageAmount: 0 };
  }

  const matched = allTransactions.filter((tx) => {
    if (tx.type !== 'income') return false;
    const hit = findMatchingIncome(tx, [income]);
    return Boolean(hit && hit.id === income.id);
  });

  matched.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalAmount = matched.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  const averageAmount = matched.length > 0 ? Math.round(totalAmount / matched.length) : 0;

  return {
    brandLabel: income.name,
    transactions: matched,
    totalAmount,
    averageAmount,
  };
}

