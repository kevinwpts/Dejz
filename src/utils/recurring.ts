import { TransactionItem, FixedExpenseItem, IncomeItem } from '../components/HomeTab';
import {
  extractMerchantKeyVariants,
  isGenericPlaceholderMerchant,
  normalizeMerchantKey,
} from './appCache';

export interface RecurringMatchResult {
  isRecurring: boolean;
  hasExactAmountMatch?: boolean;
  type?: 'expense' | 'income';
  matchedName?: string;
  matchedItemId?: string;
  matchedItem?: FixedExpenseItem | IncomeItem;
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
  'bilförsäkring',
  'bilforsakring',
  'barnförsäkring',
  'barnforsakring',
  'olycksfallsförsäkring',
  'olycksfallsforsakring',
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

function getFixedExpenseAmountDistance(exp: FixedExpenseItem, txAmount: number): number {
  const expAmt = Math.round(Math.abs(Number(exp.amount) || 0));
  const fullAmt = exp.fullAmount ? Math.round(Math.abs(Number(exp.fullAmount) || 0)) : 0;
  const distPrimary = Math.abs(expAmt - txAmount);
  const distFull = fullAmt > 0 ? Math.abs(fullAmt - txAmount) : Infinity;
  return Math.min(distPrimary, distFull);
}

export function isFixedExpenseAmountMatch(exp: FixedExpenseItem, txAmount: number): boolean {
  if (!txAmount || txAmount <= 0) return true;
  const dist = getFixedExpenseAmountDistance(exp, txAmount);
  const refAmt = Math.max(exp.amount || 0, exp.fullAmount || 0, txAmount);
  return dist <= Math.max(10, Math.round(refAmt * 0.08));
}

export function findAllMatchingFixedExpensesByMerchant(
  tx: Partial<TransactionItem> | string | null | undefined,
  fixedExpenses?: FixedExpenseItem[]
): FixedExpenseItem[] {
  if (!tx || !fixedExpenses || fixedExpenses.length === 0) return [];

  const isStr = typeof tx === 'string';
  const txTitleNorm = normalizeMerchantKey(isStr ? tx : tx.title || '');
  const combinedNorm = normalizeMerchantKey(
    isStr
      ? tx
      : [tx.title, tx.rawDescription, tx.counterpartyName, tx.note].filter(Boolean).join(' ')
  );

  const isGrocery = combinedNorm ? isEverydayGroceryPurchase(combinedNorm) : false;
  const matches: FixedExpenseItem[] = [];

  if (combinedNorm) {
    for (const exp of fixedExpenses) {
      const expNameNorm = normalizeMerchantKey(exp.name);
      const expOrigNorm = exp.originalName ? normalizeMerchantKey(exp.originalName) : '';
      if (!expNameNorm) continue;

      if (
        txTitleNorm === expNameNorm ||
        (expOrigNorm && txTitleNorm === expOrigNorm)
      ) {
        matches.push(exp);
        continue;
      }

      if (isGrocery && !isEverydayGroceryPurchase(expNameNorm)) {
        continue;
      }

      let matchedThisExp = false;
      const candidateNames = [exp.name, exp.originalName].filter(Boolean) as string[];
      for (const candName of candidateNames) {
        if (matchedThisExp) break;
        const variants = extractMerchantKeyVariants(candName);
        for (const v of variants) {
          if (
            v.length >= 3 &&
            (combinedNorm.includes(v) || (txTitleNorm.length >= 4 && v.includes(txTitleNorm)))
          ) {
            matches.push(exp);
            matchedThisExp = true;
            break;
          }
        }
        if (matchedThisExp) break;

        const brandTokens = extractSpecificBrandTokens(candName);
        for (const token of brandTokens) {
          if (token === 'max' || token === 'ica' || token === 'coop' || token === 'apple') {
            continue;
          }
          if (token.length >= 5 && combinedNorm.includes(token)) {
            matches.push(exp);
            matchedThisExp = true;
            break;
          }
        }
      }
    }
  }

  return matches;
}

export function findMatchingFixedExpense(
  tx: Partial<TransactionItem> | string | null | undefined,
  fixedExpenses?: FixedExpenseItem[]
): FixedExpenseItem | null {
  if (!tx || !fixedExpenses || fixedExpenses.length === 0) return null;

  const isStr = typeof tx === 'string';
  const txTitleNorm = normalizeMerchantKey(isStr ? tx : tx.title || '');
  const txAmt = !isStr ? Math.round(Math.abs(Number(tx.amount) || 0)) : 0;

  const candidates = findAllMatchingFixedExpensesByMerchant(tx, fixedExpenses);
  if (candidates.length > 0) {
    if (candidates.length === 1) {
      return candidates[0];
    }
    // Om användaren har flera fasta utgifter hos samma aktör (t.ex. 3 olika försäkringar hos Folksam),
    // prioritera alltid den fasta utgift vars titel ELLER belopp stämmer bäst överens med transaktionen!
    if (txAmt > 0) {
      const sorted = [...candidates].sort((a, b) => {
        const distA = getFixedExpenseAmountDistance(a, txAmt);
        const distB = getFixedExpenseAmountDistance(b, txAmt);
        if (distA !== distB) return distA - distB;
        const aExactTitle = normalizeMerchantKey(a.name) === txTitleNorm ? 0 : 1;
        const bExactTitle = normalizeMerchantKey(b.name) === txTitleNorm ? 0 : 1;
        return aExactTitle - bExactTitle;
      });
      return sorted[0];
    }
    return candidates[0];
  }

  const combinedNorm = normalizeMerchantKey(
    isStr
      ? tx
      : [tx.title, tx.rawDescription, tx.counterpartyName, tx.note].filter(Boolean).join(' ')
  );
  const isGrocery = combinedNorm ? isEverydayGroceryPurchase(combinedNorm) : false;

  // Fallback för anonyma bankrader (t.ex. "Banktransaktion", "Betalning", "Autogiro" där banken tappat mottagarnamnet
  // när en reserverad hyra eller räkning övergått till bokförd post):
  // Om beloppet på kronan matchar en registrerad fast utgift (>= 150 kr), koppla den till rätt fast utgift!
  if (!isStr && !isGrocery && tx.type !== 'income') {
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

const HYBRID_SUBSCRIPTION_AND_ONEOFF_KEYWORDS = [
  'apple',
  'itunes',
  'app store',
  'google',
  'youtube',
  'klarna',
  'qliro',
  'walley',
  'svea',
  'amazon',
  'paypal',
  'swish',
  'ica',
  'coop',
  'sj ',
  'sl ',
  'skånetrafiken',
  'skanetrafiken',
  'västtrafik',
  'vasttrafik',
  'easypark',
  'aimo',
  'parkster',
  'uber',
  'bolt',
  'foodora',
  'wolt',
];

function isHybridSubscriptionAndOneOffMerchant(tx: Partial<TransactionItem>): boolean {
  const combined = `${tx.title || ''} ${tx.rawDescription || ''} ${tx.counterpartyName || ''}`
    .toLowerCase()
    .trim();
  if (!combined) return false;
  return HYBRID_SUBSCRIPTION_AND_ONEOFF_KEYWORDS.some((kw) => combined.includes(kw));
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
      const hasExactAmountMatch =
        allMatchedExps.length > 0
          ? allMatchedExps.some((exp) => isFixedExpenseAmountMatch(exp, txAmt))
          : isFixedExpenseAmountMatch(matchedExp, txAmt);

      // För hybrid-handlare (t.ex. Apple, Klarna, Google, Amazon, kollektivtrafik) där man både kan ha
      // ett fast abonnemang OCH göra engångsköp: kräv att beloppet stämmer överens med den fasta utgiften!
      if (!hasExactAmountMatch && isHybridSubscriptionAndOneOffMerchant(tx)) {
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
        txAmt <= 0 || Math.abs(incAmt - txAmt) <= Math.max(25, Math.round(incAmt * 0.1));
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

/**
 * Säkerställer 1-till-1-matchning mellan periodens faktiska banktransaktioner och användarens
 * fasta utgifter respektive fasta inkomster:
 * - Varje fast utgift kan sluka HÖGST 1 transaktion per löneperiod (den som bäst matchar belopp & förfallodag).
 *   Om användaren gör 2 köp hos samma företag under samma period räknas det extra köpet som rörlig utgift!
 * - Returnerar även de faktiska bokförda transaktionerna per fast utgift/inkomst så att pågående period
 *   alltid använder det faktiska beloppet så fort räkningen/lönen har bokförts.
 */
export function reconcilePeriodRecurringMatches(
  periodTransactions: TransactionItem[] = [],
  fixedExpenses: FixedExpenseItem[] = [],
  incomes: IncomeItem[] = []
): {
  claimedFixedTxIds: Set<string>;
  matchedFixedTxByExpId: Map<string, TransactionItem>;
  matchedFixedIds: Set<string>;
  claimedIncomeTxIds: Set<string>;
  matchedIncomeTxByIncId: Map<string, TransactionItem>;
  matchedIncomeIds: Set<string>;
} {
  const claimedFixedTxIds = new Set<string>();
  const matchedFixedTxByExpId = new Map<string, TransactionItem>();
  const matchedFixedIds = new Set<string>();
  const claimedIncomeTxIds = new Set<string>();
  const matchedIncomeTxByIncId = new Map<string, TransactionItem>();
  const matchedIncomeIds = new Set<string>();

  const expenseTxs = periodTransactions.filter((t) => t && !t.isExcluded && t.type !== 'income');
  const incomeTxs = periodTransactions.filter(
    (t) => t && !t.isExcluded && t.type === 'income' && t.category !== 'Återbetalning'
  );

  // 1. Koppla högst 1 transaktion per fast utgift (bästa belopps- och förfallodagsmatchning först)
  const candidatePairs: {
    exp: FixedExpenseItem;
    tx: TransactionItem;
    amtDist: number;
    dayDist: number;
  }[] = [];

  for (const exp of fixedExpenses) {
    for (const tx of expenseTxs) {
      const candidatesForTx = findAllMatchingFixedExpensesByMerchant(tx, [exp]);
      const fallbackMatch =
        candidatesForTx.length === 0 ? findMatchingFixedExpense(tx, [exp]) : candidatesForTx[0];
      if (!fallbackMatch || fallbackMatch.id !== exp.id) continue;

      const txAmt = Math.round(Math.abs(Number(tx.amount) || 0));
      const exactAmtMatch = isFixedExpenseAmountMatch(exp, txAmt);
      if (!exactAmtMatch && isHybridSubscriptionAndOneOffMerchant(tx)) {
        continue;
      }

      const amtDist = getFixedExpenseAmountDistance(exp, txAmt);
      const txDay = parseInt((tx.date || '').slice(8, 10), 10) || 27;
      const dueDay = Number(exp.dueDay) || 27;
      const rawDayDiff = Math.abs(txDay - dueDay);
      const dayDist = Math.min(rawDayDiff, 31 - rawDayDiff);

      candidatePairs.push({ exp, tx, amtDist, dayDist });
    }
  }

  candidatePairs.sort((a, b) => {
    if (a.amtDist !== b.amtDist) return a.amtDist - b.amtDist;
    return a.dayDist - b.dayDist;
  });

  for (const pair of candidatePairs) {
    if (matchedFixedTxByExpId.has(pair.exp.id)) continue;
    if (claimedFixedTxIds.has(pair.tx.id)) continue;
    matchedFixedTxByExpId.set(pair.exp.id, pair.tx);
    matchedFixedIds.add(pair.exp.id);
    claimedFixedTxIds.add(pair.tx.id);
  }

  // Även explicita "fix-"-poster räknas som fasta
  for (const tx of expenseTxs) {
    if (tx.id?.startsWith('fix-')) {
      claimedFixedTxIds.add(tx.id);
    }
  }

  // 2. Koppla högst 1 transaktion per fast inkomst
  const incomePairs: {
    inc: IncomeItem;
    tx: TransactionItem;
    amtDist: number;
  }[] = [];

  for (const inc of incomes) {
    for (const tx of incomeTxs) {
      const matched = findMatchingIncome(tx, [inc]);
      const isSalaryFallback =
        !matched &&
        (inc.category === 'Lön' || /lön/i.test(inc.name)) &&
        (tx.category === 'Lön' ||
          /lön|salary|löneutbetalning/i.test(`${tx.title || ''} ${tx.rawDescription || ''}`));
      if ((!matched || matched.id !== inc.id) && !isSalaryFallback) continue;

      const incAmt = Math.round(Math.abs(Number(inc.amount) || 0));
      const txAmt = Math.round(Math.abs(Number(tx.amount) || 0));
      incomePairs.push({
        inc,
        tx,
        amtDist: Math.abs(incAmt - txAmt),
      });
    }
  }

  incomePairs.sort((a, b) => a.amtDist - b.amtDist);

  for (const pair of incomePairs) {
    if (matchedIncomeTxByIncId.has(pair.inc.id)) continue;
    if (claimedIncomeTxIds.has(pair.tx.id)) continue;
    matchedIncomeTxByIncId.set(pair.inc.id, pair.tx);
    matchedIncomeIds.add(pair.inc.id);
    claimedIncomeTxIds.add(pair.tx.id);
  }

  for (const tx of incomeTxs) {
    const rec = checkIsRecurringTransaction(tx, fixedExpenses, incomes);
    if (rec.isRecurring && rec.type === 'income') {
      claimedIncomeTxIds.add(tx.id);
    }
  }

  return {
    claimedFixedTxIds,
    matchedFixedTxByExpId,
    matchedFixedIds,
    claimedIncomeTxIds,
    matchedIncomeTxByIncId,
    matchedIncomeIds,
  };
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
  sameMerchantTransactions: TransactionItem[];
  totalAmount: number;
  averageAmount: number;
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
      // For generic titles (e.g. "Swish"), require same rawDescription/counterpartyName or amount
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

  matched.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  sameMerchant.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

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

  matched.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

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

  matched.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

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


