// Smart sammanslagning för befintliga användare (Inställningar → Bankkoppling). Del av bankanalysen (tidigare utils/bankHistoryAnalyzer.ts).
import { BankAccount, BankTransactionItem } from '../../services/bankService';
import { SWEDISH_EXPENSE_PRESETS } from '../../data/swedishExpensePresets';
import { Config, FixedExpense, Income, Transaction } from '../../types';
import { getLogoUrl, getLearnedBrandCategory } from '../logo';
import { getActualBankPaymentDateAndMeta } from '../swedishDate';
import {
  resolveMerchantAlias,
  normalizeCategoryToValid,
  getStoredPaymentMethods,
} from '../appCache';
import {
  ExistingBudgetBankSyncPlan,
  ExistingBudgetFixedExpenseMatch,
  ExistingBudgetIncomeMatch,
  PeriodBankPurchaseCandidate,
} from './types';
import {
  getNormalizedBankTxAmount,
  isLikelyCreditCardInvoiceBankTx,
  isLikelyMerchantRefundBankTx,
  resolveBankTxSekAmount,
} from './normalization';
import {
  EVERYDAY_MERCHANT_RULES,
  EXTENDED_FIXED_EXPENSE_RULES,
  categorizeBankTransactionForApp,
} from './merchantRules';
import { runCoreBankDetection } from './history';

// ---------------------------------------------------------------------------
// 5. SMART MERGE ANALYZER FOR EXISTING USERS (SETTINGS -> BANKKOPPLING)
// ---------------------------------------------------------------------------

export function isSameFixedExpenseName(nameA: string | null | undefined, nameB: string | null | undefined): boolean {
  const a = String(nameA || '').toLowerCase().trim();
  const b = String(nameB || '').toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (
    (a.includes('hyra') || a.includes('boende') || a.includes('fastighet')) &&
    (b.includes('hyra') || b.includes('boende') || b.includes('fastighet'))
  ) {
    return true;
  }
  return false;
}

export function analyzeBankForExistingBudget(params: {
  bankTransactions: BankTransactionItem[];
  userAccounts?: BankAccount[];
  existingFixedExpenses: FixedExpense[];
  existingIncomes: Income[];
  existingAppTransactions: Transaction[];
  config: Config;
}): ExistingBudgetBankSyncPlan {
  const {
    bankTransactions,
    userAccounts = [],
    existingFixedExpenses = [],
    existingIncomes = [],
    existingAppTransactions = [],
    config,
  } = params;

  const currentPayday = config.payday || 25;
  const paydayBeforeWeekend =
    config.paydayBeforeWeekend !== undefined ? config.paydayBeforeWeekend : true;
  const availableCategories = (config.categories || []).map((c) => c.name);

  if (!Array.isArray(bankTransactions) || bankTransactions.length === 0) {
    return {
      periodStartIso: new Date().toISOString().split('T')[0],
      periodPurchases: [],
      skippedFixedInPeriodCount: 0,
      skippedInternalTransfersCount: 0,
      fixedExpenseMatches: [],
      incomeMatches: [],
      analyzedTransactionCount: 0,
    };
  }

  const core = runCoreBankDetection(
    bankTransactions,
    currentPayday,
    paydayBeforeWeekend,
    userAccounts
  );

  const activeExistingFixed = existingFixedExpenses.filter((e) => !e.isCancelled);
  const cancelledExistingFixed = existingFixedExpenses.filter((e) => Boolean(e.isCancelled));

  const matchesExistingUserFixed = (tx: BankTransactionItem): boolean => {
    const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    for (const fixed of activeExistingFixed) {
      const fixedName = String(fixed.name || '').toLowerCase().trim();
      if (fixedName.length >= 3 && text.includes(fixedName)) return true;
      const cleanedFixed = fixedName.replace(/^hyra\s*\(|\)$/g, '').trim();
      if (cleanedFixed.length >= 3 && text.includes(cleanedFixed)) return true;
    }
    return false;
  };

  // 1. Compare Detected Fixed Expenses against Existing Fixed Expenses
  // Requirement 5: "Historiska förslag får inte återaktivera uppsagda abonnemang eller ersätta användarens befintliga avtal."
  const fixedExpenseMatches: ExistingBudgetFixedExpenseMatch[] = [];

  core.detectedFixedExpenses.forEach((det, idx) => {
    // Never suggest or reactivate a subscription that the user has marked as cancelled!
    const matchesCancelled = cancelledExistingFixed.some((canc) =>
      isSameFixedExpenseName(canc.name, det.name)
    );
    if (matchesCancelled) {
      return;
    }

    const matchedExisting = activeExistingFixed.find(
      (ex) =>
        isSameFixedExpenseName(ex.name, det.name) ||
        (ex.category === det.category &&
          det.amount >= 2000 &&
          Math.abs(ex.amount - det.amount) <= 300)
    );

    if (!matchedExisting) {
      fixedExpenseMatches.push({
        id: `fixed_match_${idx}_${det.name}`,
        detected: det,
        status: 'new',
      });
      return;
    }

    const diff = Math.abs(Number(matchedExisting.amount) - Number(det.amount));
    if (diff >= 5) {
      fixedExpenseMatches.push({
        id: `fixed_match_${idx}_${det.name}`,
        detected: det,
        status: 'amount_changed',
        existingExpense: matchedExisting,
      });
      return;
    }

    fixedExpenseMatches.push({
      id: `fixed_match_${idx}_${det.name}`,
      detected: det,
      status: 'already_exists',
      existingExpense: matchedExisting,
    });
  });

  // 2. Compare Detected Incomes against Existing Incomes
  const incomeMatches: ExistingBudgetIncomeMatch[] = core.detectedIncomes.map((det, idx) => {
    const matchedInc = existingIncomes.find(
      (inc) =>
        String(inc.name || '').toLowerCase().includes('lön') ||
        String(inc.category || '').toLowerCase() === String(det.category || '').toLowerCase() ||
        String(inc.name || '').toLowerCase() === String(det.name || '').toLowerCase()
    );

    if (!matchedInc) {
      return {
        id: `inc_match_${idx}`,
        detected: det,
        status: 'new',
      };
    }

    const diff = Math.abs(Number(matchedInc.amount) - Number(det.amount));
    if (diff >= 50) {
      return {
        id: `inc_match_${idx}`,
        detected: det,
        status: 'amount_changed',
        existingIncome: matchedInc,
      };
    }

    return {
      id: `inc_match_${idx}`,
      detected: det,
      status: 'already_exists',
      existingIncome: matchedInc,
    };
  });

  // 3. Collect Variable Everyday Purchases in the Current Pay Period
  const periodPurchases: PeriodBankPurchaseCandidate[] = [];
  let skippedFixedInPeriodCount = 0;
  let skippedInternalTransfersCount = 0;

  for (const tx of bankTransactions) {
    //Requirement 8: Reserved purchases (PDNG / HOLD) do NOT affect ordinary budget in v1
    if (tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD') {
      continue;
    }

    const txDate = tx.booking_date || tx.transaction_date || tx.value_date || '';
    if (!txDate || txDate < core.periodStartIso) continue;

    if (core.internalTransferIds.has(tx.id)) {
      skippedInternalTransfersCount++;
      continue;
    }

    const signedAmt = getNormalizedBankTxAmount(tx);
    if (signedAmt >= 0) continue; // Only outgoing purchases

    if (core.fixedTransactionIds.has(tx.id) || matchesExistingUserFixed(tx)) {
      skippedFixedInPeriodCount++;
      continue;
    }

    const absAmount = Math.round(Math.abs(signedAmt) * 100) / 100;
    if (absAmount <= 0) continue;

    const categorized = categorizeBankTransactionForApp(tx, availableCategories);
    const parsedDateMs = Date.parse(`${txDate}T12:00:00`);
    const timestamp = Number.isFinite(parsedDateMs) ? parsedDateMs : Date.now();

    const alreadyInApp = existingAppTransactions.some((appTx) => {
      if (appTx.bankTransactionId === tx.id) return true;
      if (Array.isArray(appTx.tags)) {
        if (
          appTx.tags.includes(`bank_tx:${tx.id}`) ||
          appTx.tags.includes(`bank_key:${tx.external_key}`)
        ) {
          return true;
        }
      }
      const sameAmount = Math.abs(Number(appTx.amount) - absAmount) < 1;
      const dayDiff = Math.abs(Number(appTx.timestamp) - timestamp) / (1000 * 60 * 60 * 24);
      return sameAmount && dayDiff <= 2.5;
    });

    periodPurchases.push({
      bankTxId: tx.id,
      externalKey: tx.external_key,
      merchant: categorized.merchant,
      rawDescription: tx.description,
      amount: absAmount,
      dateIso: txDate,
      timestamp,
      category: categorized.category,
      logo: categorized.logo,
      isReserved: false,
      alreadyInApp,
    });
  }

  return {
    periodStartIso: core.periodStartIso,
    periodPurchases,
    skippedFixedInPeriodCount,
    skippedInternalTransfersCount,
    fixedExpenseMatches,
    incomeMatches,
    analyzedTransactionCount: bankTransactions.length,
  };
}

/**
 * Returns all booked variable bank transactions (across all periods in bank history)
 * that should be automatically imported into the app's main `transactions` table
 * so they appear in Hem, Historik, Analys, and Budget without duplicating fixed expenses or internal transfers.
 */
export function getAutoImportableBankTransactions(
  paramsOrTxs:
    | {
        bankTransactions: BankTransactionItem[];
        userAccounts?: BankAccount[];
        existingFixedExpenses: FixedExpense[];
        existingIncomes?: Income[];
        existingAppTransactions: Transaction[];
        config?: Config | null;
        dismissedBankTxIds?: Set<string> | string[];
      }
    | BankTransactionItem[],
  posUserAccounts?: BankAccount[],
  posExistingFixedExpenses?: FixedExpense[],
  posExistingAppTransactions?: Transaction[],
  posConfig?: Config | null,
  posDismissedBankTxIds?: Set<string> | string[]
): Array<Omit<Transaction, 'id'>> {
  const isArrayArg = Array.isArray(paramsOrTxs);
  const bankTransactions = isArrayArg ? paramsOrTxs : paramsOrTxs?.bankTransactions || [];
  const userAccounts = isArrayArg ? posUserAccounts || [] : paramsOrTxs?.userAccounts || [];
  const existingFixedExpenses = isArrayArg
    ? posExistingFixedExpenses || []
    : paramsOrTxs?.existingFixedExpenses || [];
  const existingAppTransactions = isArrayArg
    ? posExistingAppTransactions || []
    : paramsOrTxs?.existingAppTransactions || [];
  const config = isArrayArg ? posConfig : paramsOrTxs?.config;
  const rawDismissed = isArrayArg ? posDismissedBankTxIds : paramsOrTxs?.dismissedBankTxIds;
  const dismissedSet =
    rawDismissed instanceof Set
      ? rawDismissed
      : Array.isArray(rawDismissed)
      ? new Set(rawDismissed)
      : new Set<string>();

  if (!Array.isArray(bankTransactions) || bankTransactions.length === 0) {
    return [];
  }

  const currentPayday = config?.payday || 25;
  const paydayBeforeWeekend =
    config?.paydayBeforeWeekend !== undefined ? config.paydayBeforeWeekend : true;
  const availableCategories = (config?.categories || []).map((c: any) =>
    typeof c === 'string' ? c : c?.name || ''
  );

  // Filter to selected budget accounts if userAccounts is non-empty
  const allowedAccountIds = new Set(
    userAccounts
      .filter((a) => a.is_selected && a.include_in_budget !== false)
      .map((a) => a.id)
  );

  const rawRelevantBankTxs =
    allowedAccountIds.size > 0
      ? bankTransactions.filter((t) => allowedAccountIds.has(t.bank_account_id))
      : bankTransactions;

  // Sort BOOK transactions before PDNG/HOLD so booked transactions take precedence over reservations
  const relevantBankTxs = [...rawRelevantBankTxs].sort((a, b) => {
    const aBook = a.booking_status === 'BOOK' ? 0 : 1;
    const bBook = b.booking_status === 'BOOK' ? 0 : 1;
    if (aBook !== bBook) return aBook - bBook;
    const dA = a.booking_date || a.transaction_date || a.value_date || '';
    const dB = b.booking_date || b.transaction_date || b.value_date || '';
    return dB.localeCompare(dA);
  });

  const core = runCoreBankDetection(
    relevantBankTxs,
    currentPayday,
    paydayBeforeWeekend,
    userAccounts
  );

  const activeExistingFixed = existingFixedExpenses.filter((e) => !e.isCancelled);

  const matchesExistingUserFixed = (tx: BankTransactionItem): boolean => {
    const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    for (const fixed of activeExistingFixed) {
      const fixedName = String(fixed.name || '').toLowerCase().trim();
      if (fixedName.length >= 3 && text.includes(fixedName)) return true;
      const cleanedFixed = fixedName.replace(/^hyra\s*\(|\)$/g, '').trim();
      if (cleanedFixed.length >= 3 && text.includes(cleanedFixed)) return true;
    }
    return false;
  };

  const toImport: Array<Omit<Transaction, 'id'>> = [];
  const seenKeysInBatch = new Set<string>();

  for (const tx of relevantBankTxs) {
    if (
      tx.booking_status === 'CNCL' ||
      tx.booking_status === 'RJCT'
    ) {
      continue;
    }

    if (
      tx.reconciliation_status === 'excluded' ||
      tx.reconciliation_status === 'internal_transfer' ||
      tx.reconciliation_status === 'confirmed_fixed_expense' ||
      tx.reconciliation_status === 'confirmed_income' ||
      tx.reconciliation_status === 'confirmed_saving' ||
      tx.reconciliation_status === 'reserved_replaced'
    ) {
      continue;
    }

    if (
      dismissedSet.has(tx.id) ||
      (tx.external_key && dismissedSet.has(tx.external_key))
    ) {
      continue;
    }

    if (seenKeysInBatch.has(tx.id) || (tx.external_key && seenKeysInBatch.has(tx.external_key))) {
      continue;
    }

    if (core.internalTransferIds.has(tx.id)) {
      continue;
    }

    // Skip large monthly credit card / collector invoices so they don't double-count card purchases
    if (isLikelyCreditCardInvoiceBankTx(tx)) {
      continue;
    }

    const { signedSekAmount: signedAmt, absSekAmount: absAmount, originalCurrency, originalAmount } =
      resolveBankTxSekAmount(tx);
    const isMerchantRefund = signedAmt > 0 && isLikelyMerchantRefundBankTx(tx);

    // Only auto-import outgoing variable purchases or verified store refunds
    if (signedAmt >= 0 && !isMerchantRefund) {
      continue;
    }

    if (!isMerchantRefund && (core.fixedTransactionIds.has(tx.id) || matchesExistingUserFixed(tx))) {
      continue;
    }

    if (absAmount <= 0) continue;

    const { paymentDate } = getActualBankPaymentDateAndMeta(tx);
    const txDate = paymentDate;
    const parsedDateMs = txDate ? Date.parse(`${txDate}T12:00:00`) : NaN;
    const timestamp = Number.isFinite(parsedDateMs) ? parsedDateMs : Date.now();

    const categorized = categorizeBankTransactionForApp(tx, availableCategories);
    const isReserved = tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD';

    // Om detta är en aktiv reservation (PDNG/HOLD), hoppa ENDAST över den om en bokförd (BOOK)
    // transaktion i samma batch har exakt samma transaction_id eller entry_reference.
    if (isReserved && (tx.transaction_id || tx.entry_reference)) {
      const hasExactSameRefInBatch = relevantBankTxs.some(
        (other) =>
          other.id !== tx.id &&
          other.booking_status === 'BOOK' &&
          ((tx.transaction_id && other.transaction_id === tx.transaction_id) ||
            (tx.entry_reference && other.entry_reference === tx.entry_reference))
      );
      if (hasExactSameRefInBatch) {
        continue;
      }
    }

    const alreadyInApp = existingAppTransactions.some((appTx) => {
      if (appTx.bankTransactionId === tx.id) return true;
      const hasBankTag =
        Array.isArray(appTx.tags) && appTx.tags.some((t) => t.startsWith('bank_tx:'));
      if (Array.isArray(appTx.tags)) {
        if (
          appTx.tags.includes(`bank_tx:${tx.id}`) ||
          (tx.external_key && appTx.tags.includes(`bank_key:${tx.external_key}`))
        ) {
          return true;
        }
      }
      // Om appTx redan är en annan banktransaktion (har eget bankTransactionId / bank_tx-tagg),
      // är det ett separat köp från banken och får ALDRIG dubblettfiltreras bort på bara belopp/butik!
      if (appTx.bankTransactionId || hasBankTag) {
        return false;
      }
      // Matcha endast mot manuellt inlagda transaktioner (som saknar bankTransactionId) på samma dag, belopp och butik
      const sameAmount = Math.abs(Math.abs(Number(appTx.amount)) - absAmount) < 0.5;
      const dayDiff = Math.abs(Number(appTx.timestamp) - timestamp) / (1000 * 60 * 60 * 24);
      const sameMerchant =
        String(appTx.merchant || '').toLowerCase().trim() ===
        String(categorized.merchant || '').toLowerCase().trim();
      return sameAmount && dayDiff <= 1.5 && sameMerchant;
    });

    if (alreadyInApp) {
      continue;
    }

    seenKeysInBatch.add(tx.id);
    if (tx.external_key) seenKeysInBatch.add(tx.external_key);

    const tags = [`bank_tx:${tx.id}`];
    if (tx.external_key) tags.push(`bank_key:${tx.external_key}`);
    if (tx.bank_account_id) tags.push(`bank_acc:${tx.bank_account_id}`);
    if (isMerchantRefund) tags.push('bank_refund');

    toImport.push({
      amount: isMerchantRefund ? -absAmount : absAmount,
      type: 'expense',
      category: categorized.category,
      merchant: categorized.merchant,
      note: tx.description || categorized.merchant,
      timestamp,
      isBackdated: false,
      logo: categorized.logo,
      paymentMethod: 'Kortbetalning',
      tags,
      bankTransactionId: tx.id,
      bankAccountId: tx.bank_account_id,
      originalBankDescription: tx.description,
      originalBankAmount: originalCurrency !== 'SEK' ? originalAmount : signedAmt,
      originalBankCurrency: originalCurrency,
    });
  }

  return toImport;
}

export function normalizePaymentMethodName(rawMethod: string | undefined): string | undefined {
  if (!rawMethod) return undefined;
  const stored = getStoredPaymentMethods().map((m) => m.name);
  if (stored.includes(rawMethod)) return rawMethod;
  const lower = rawMethod.toLowerCase();
  if (lower.includes('bankgiro') || lower.includes('plusgiro')) {
    const bgMatch = stored.find(
      (m) => m.toLowerCase().includes('bankgiro') || m.toLowerCase().includes('plusgiro')
    );
    return bgMatch || 'Bankgiro / Plusgiro';
  }
  if (lower.includes('autogiro')) {
    return stored.find((m) => m.toLowerCase().includes('autogiro')) || 'Autogiro';
  }
  if (lower.includes('kort')) {
    return stored.find((m) => m.toLowerCase().includes('kort')) || 'Kort';
  }
  if (lower.includes('e-faktura') || lower.includes('efaktura')) {
    return stored.find((m) => m.toLowerCase().includes('e-faktura')) || 'E-faktura';
  }
  if (lower.includes('faktura')) {
    return stored.find((m) => m.toLowerCase() === 'faktura') || 'Faktura';
  }
  if (lower.includes('swish')) {
    return stored.find((m) => m.toLowerCase().includes('swish')) || 'Swish';
  }
  return rawMethod;
}

export function matchesKeywordSmart(text: string, kw: string): boolean {
  const cleanKw = kw.toLowerCase();
  const trimmedKw = cleanKw.trim();
  if (!trimmedKw) return false;
  if (cleanKw.endsWith(' ')) {
    const padded = ` ${text} `;
    return padded.includes(` ${trimmedKw} `) || text === trimmedKw || text.startsWith(cleanKw);
  }
  // For very short 2-3 char keywords like "sl", "el", "dn", "vy", "ul", require word boundary
  if (trimmedKw.length <= 3 && /^[a-zåäö0-9]+$/i.test(trimmedKw)) {
    const escaped = trimmedKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-zåäö0-9])${escaped}($|[^a-zåäö0-9])`, 'i').test(text);
  }
  return text.includes(trimmedKw);
}

/**
 * Automatically infers category, payment method, and logo when a user manually types
 * a merchant or item name (e.g. "Riksbyggen", "Netflix", "A-kassa", "SATS", "ICA").
 */
export function inferCategoryAndMethodFromName(
  rawName: string,
  kind: 'fixed' | 'income' | 'transaction'
): {
  category?: string;
  paymentMethod?: string;
  logo?: string;
} | null {
  try {
    const trimmed = (rawName || '').trim();
    if (trimmed.length < 2) return null;

    const text = trimmed.toLowerCase();
    const categoryKind = kind === 'income' ? 'income' : 'expense';

    // 1. Check user's custom merchant aliases first
    const alias = resolveMerchantAlias(trimmed);
    if (alias?.category) {
      return {
        category: normalizeCategoryToValid(alias.category, categoryKind),
        logo: getLogoUrl(alias.name || trimmed),
      };
    }

    // 2. Income rules
    if (kind === 'income') {
      if (
        [
          'barnbidrag',
          'försäkringskassan',
          'forsakringskassan',
          'fkassa',
          'föräldrapenning',
          'foraldrapenning',
          'sjukpenning',
          'bostadsbidrag',
          'aktivitetsstöd',
          'aktivitetsersättning',
          'sjukersättning',
          'underhållsstöd',
          'csn',
          'studiestöd',
          'studiestod',
          'studiemedel',
          'bidrag',
          'a-kassa',
          'a kassa',
          'akassa',
          'alfakassan',
          'alfa-kassan',
          'unionen',
          'akademikernas',
          'småa',
          'smaa',
          'arbetslöshetsersättning',
          'ersättning',
        ].some((kw) => matchesKeywordSmart(text, kw))
      ) {
        return {
          category: normalizeCategoryToValid('Bidrag', 'income'),
          logo: getLogoUrl(trimmed),
        };
      }

      if (
        [
          'pension',
          'pensionsmyndigheten',
          'alecta',
          'amf',
          'kåpan',
          'min pension',
          'tjänstepension',
          'spv',
        ].some((kw) => matchesKeywordSmart(text, kw))
      ) {
        return {
          category: normalizeCategoryToValid('Pension', 'income'),
          logo: getLogoUrl(trimmed),
        };
      }

      if (matchesKeywordSmart(text, 'swish')) {
        return {
          category: normalizeCategoryToValid('Swish', 'income'),
          paymentMethod: 'Swish',
          logo: getLogoUrl(trimmed),
        };
      }

      if (
        ['lön', 'lon', 'salary', 'arvode', 'löneutbetalning', 'bonus', 'timlön'].some((kw) =>
          matchesKeywordSmart(text, kw)
        )
      ) {
        return {
          category: normalizeCategoryToValid('Lön', 'income'),
          logo: getLogoUrl(trimmed),
        };
      }

      return null;
    }

    // 3. Check EXTENDED_FIXED_EXPENSE_RULES (Riksbyggen, Netflix, Spotify, Tibber, Hedvig, Tele2, SATS, A-kassa, etc.)
    for (const rule of EXTENDED_FIXED_EXPENSE_RULES) {
      if (rule.keywords.some((kw) => matchesKeywordSmart(text, kw))) {
        return {
          category: normalizeCategoryToValid(rule.category, 'expense'),
          paymentMethod: normalizePaymentMethodName(rule.paymentMethod),
          logo: getLogoUrl(rule.fallbackName || trimmed),
        };
      }
    }

    // 4. Check SWEDISH_EXPENSE_PRESETS
    for (const preset of SWEDISH_EXPENSE_PRESETS) {
      const presetNameLower = preset.name.toLowerCase();
      if (
        presetNameLower === text ||
        (text.length >= 3 && matchesKeywordSmart(text, presetNameLower))
      ) {
        return {
          category: normalizeCategoryToValid(preset.category, 'expense'),
          paymentMethod: normalizePaymentMethodName(preset.paymentMethod),
          logo: getLogoUrl(preset.name),
        };
      }
    }

    // 5. Check EVERYDAY_MERCHANT_RULES (ICA, Coop, Willys, Systembolaget, Foodora, Circle K, Apotea, IKEA, etc.)
    for (const merch of EVERYDAY_MERCHANT_RULES) {
      if (
        merch.cleanName.toLowerCase() === text ||
        merch.keywords.some((kw) => matchesKeywordSmart(text, kw))
      ) {
        return {
          category: normalizeCategoryToValid(merch.preferredCategories[0] || 'Övrigt', 'expense'),
          paymentMethod: kind === 'transaction' ? 'Kort' : undefined,
          logo: getLogoUrl(merch.cleanName),
        };
      }
    }

    // 5.5 Check learned AI category cache
    const learnedCategory = getLearnedBrandCategory(trimmed);
    if (learnedCategory) {
      return {
        category: normalizeCategoryToValid(learnedCategory, 'expense'),
        paymentMethod: kind === 'transaction' ? 'Kort' : undefined,
        logo: getLogoUrl(trimmed, learnedCategory),
      };
    }

  // 6. Broad Swedish category keyword fallback for manual names
  const manualKeywordGroups: Array<{
    keywords: string[];
    category: string;
    paymentMethod?: string;
  }> = [
    {
      keywords: [
        'riksbyggen',
        'hsb',
        'brf',
        'sbc',
        'bostadsrätt',
        'bostadsratt',
        'hyra',
        'avgift',
        'månadsavgift',
        'manadsavgift',
        'boende',
        'lägenhet',
        'lagenhet',
        'fastighet',
        'heimstaden',
        'wallenstam',
        'willhem',
        'akelius',
        'balder',
        'stena',
        'poseidon',
        'familjebostäder',
        'stockholmshem',
        'svenska bostäder',
        'mimer',
        'uppsalahem',
        'samfällighet',
        'samfallighet',
      ],
      category: 'Boende',
      paymentMethod: 'Bankgiro / Plusgiro',
    },
    {
      keywords: [
        'bolån',
        'bolan',
        'bostadslån',
        'amortering',
        'ränta',
        'ranta',
        'hypotek',
        'sbab',
        'landshypotek',
        'stabelo',
        'el',
        'elräkning',
        'elrakning',
        'elnät',
        'elnat',
        'tibber',
        'vattenfall',
        'fortum',
        'eon',
        'e.on',
        'ellevio',
        'öresundskraft',
        'oresundskraft',
        'fjärrvärme',
        'fjarrvarme',
        'vatten',
        'avlopp',
        'sophämtning',
        'renhållning',
        'verisure',
        'sector alarm',
        'hemlarm',
      ],
      category: 'Boende',
      paymentMethod: 'Autogiro',
    },
    {
      keywords: [
        'försäkring',
        'forsakring',
        'hemförsäkring',
        'hemforsakring',
        'bilförsäkring',
        'bilforsakring',
        'personförsäkring',
        'olycksfall',
        'barnförsäkring',
        'djurförsäkring',
        'livförsäkring',
        'villaförsäkring',
        'hedvig',
        'folksam',
        'trygg-hansa',
        'trygghansa',
        'länsförsäkringar',
        'lansforsakringar',
        'agria',
        'lassie',
        'gjensidige',
        'moderna',
        'svedea',
        'bliwa',
      ],
      category: 'Försäkring',
      paymentMethod: 'Autogiro',
    },
    {
      keywords: [
        'netflix',
        'spotify',
        'youtube',
        'disney',
        'hbo',
        'viaplay',
        'tv4',
        'prime',
        'skyshowtime',
        'discovery',
        'storytel',
        'bookbeat',
        'nextory',
        'podme',
        'audible',
        'tidal',
        'apple',
        'icloud',
        'google one',
        'chatgpt',
        'openai',
        'claude',
        'cursor',
        'midjourney',
        'microsoft',
        'adobe',
        '1password',
        'nordvpn',
        'mullvad',
        'dropbox',
        'canva',
        'patreon',
        'substack',
        'duolingo',
        'playstation',
        'xbox',
        'nintendo',
        'discord',
        'steam',
        'aftonbladet',
        'expressen',
        'dn',
        'svd',
        'readly',
        'prenumeration',
        'streaming',
      ],
      category: 'Abonnemang',
      paymentMethod: 'Kort',
    },
    {
      keywords: [
        'tele2',
        'telia',
        'telenor',
        'tre',
        'vimla',
        'hallon',
        'halebop',
        'fello',
        'comviq',
        'bahnhof',
        'ownit',
        'bredband',
        'bredband2',
        'fiber',
        'mobil',
        'mobilabonnemang',
        'telefon',
        'abonnemang',
        'sappa',
        'open infra',
        'globalconnect',
      ],
      category: 'Abonnemang',
      paymentMethod: 'Autogiro',
    },
    {
      keywords: [
        'gym',
        'träning',
        'traning',
        'sats',
        'nordic wellness',
        'fitness24seven',
        'friskis',
        'actic',
        'stc',
        'malkars',
        'member 24',
        'member24',
        'strava',
        'whoop',
        'padel',
        'matchi',
        'pdm',
        'apotek',
        'apotea',
        'meds',
        'tandläkare',
        'tandlakare',
        'tandvård',
        'frisör',
        'frisor',
        'bokadirekt',
        'massage',
        'naprapat',
        'kiropraktor',
        'kry',
        'doktor',
        'vårdcentral',
      ],
      category: 'Hälsa',
      paymentMethod: kind === 'fixed' ? 'Autogiro' : 'Kort',
    },
    {
      keywords: [
        'sl',
        'västtrafik',
        'vasttrafik',
        'skånetrafiken',
        'skanetrafiken',
        'hallandstrafiken',
        'ul',
        'länstrafiken',
        'busskort',
        'månadskort',
        'pendelkort',
        'kollektivtrafik',
        'parkering',
        'boendeparkering',
        'garage',
        'easypark',
        'aimo',
        'apcoa',
        'parkster',
        'bensin',
        'diesel',
        'laddning',
        'trängselskatt',
        'trangselskatt',
        'fordonsskatt',
        'bilskatt',
        'billån',
        'billeasing',
        'leasing',
        'uber',
        'bolt',
        'voi',
        'tier',
        'lime',
        'ryde',
        'taxi',
        'sj',
        'vy',
        'mtrx',
        'flixbus',
        'sas',
        'norwegian',
        'ryanair',
      ],
      category: 'Transport',
      paymentMethod: kind === 'fixed' ? 'Autogiro' : 'Kort',
    },
    {
      keywords: [
        'csn',
        'studielån',
        'studiemedel',
        'a-kassa',
        'akassa',
        'fack',
        'fackförbund',
        'fackavgift',
        'unionen',
        'akademikernas',
        'kommunal',
        'vision',
        'alfakassan',
        'småa',
        'handels',
        'lärarnas',
        'if metall',
        'vårdförbundet',
        'ledarna',
        'lån',
        'privatlån',
        'blancolån',
        'kredit',
        'anyfin',
        'resurs',
        'ikano',
        'marginalen',
        'avida',
        'brocc',
        'förskola',
        'forskola',
        'barnomsorg',
        'fritids',
        'bankavgift',
      ],
      category: 'Räkningar',
      paymentMethod: 'Autogiro',
    },
    {
      keywords: [
        'ica',
        'coop',
        'willys',
        'hemköp',
        'hemkop',
        'lidl',
        'city gross',
        'citygross',
        'mathem',
        'hellofresh',
        'linas matkasse',
        'systembolaget',
        'mat',
        'livsmedel',
        'handla',
        'ost',
        'chark',
        'fisk',
        'delikatess',
      ],
      category: 'Mat & dryck',
      paymentMethod: 'Kort',
    },
    {
      keywords: [
        'holy greens',
        'holygreens',
        'restaurang',
        'lunch',
        'middag',
        'kaffe',
        'fika',
        'café',
        'cafe',
        'kafé',
        'konditori',
        'bageri',
        'espresso house',
        'waynes',
        'joe & the juice',
        'fabrique',
        'gateau',
        'bröd & salt',
        'brod & salt',
        'mr cake',
        'starbucks',
        'foodora',
        'wolt',
        'uber eats',
        'mcdonalds',
        'burger king',
        'max burgers',
        'bastard burgers',
        'brödernas',
        'brodernas',
        'mister york',
        'phils burger',
        'chopchop',
        'sushi',
        'sushi yama',
        'pinchos',
        'olearys',
        'vapiano',
        'basta',
        'taco bar',
        'subway',
        'kfc',
        'pizza',
        'pizzeria',
        'kebab',
        'falafel',
        'thai',
        'wok',
        'ramen',
        'poké',
        'poke',
        'sallad',
        'salad',
        'bistro',
        'brasserie',
        'krog',
        'gästgiveri',
        'uteliv',
        'bar',
        'pub',
        'nattklubb',
        'bio',
        'filmstaden',
        'konsert',
        'ticketmaster',
        'axs',
        'liseberg',
        'gröna lund',
      ],
      category: 'Uteliv',
      paymentMethod: 'Kort',
    },
    {
      keywords: [
        'shopping',
        'kläder',
        'klader',
        'skor',
        'inredning',
        'möbler',
        'mobler',
        'elektronik',
        'h&m',
        'zara',
        'åhléns',
        'ahlens',
        'lagerhaus',
        'granit',
        'cervera',
        'hemtex',
        'ikea',
        'rusta',
        'jula',
        'biltema',
        'clas ohlson',
        'kjell',
        'elgiganten',
        'netonnet',
        'webhallen',
        'power',
        'stadium',
        'intersport',
        'xxl',
        'boozt',
        'zalando',
        'lyko',
        'kicks',
        'sephora',
        'rituals',
        'normal',
        'akademibokhandeln',
        'bokus',
        'adlibris',
        'blomsterlandet',
        'plantagen',
        'arkenzoo',
        'musti',
      ],
      category: 'Shopping',
      paymentMethod: 'Kort',
    },
  ];

    for (const group of manualKeywordGroups) {
      if (group.keywords.some((kw) => matchesKeywordSmart(text, kw))) {
        return {
          category: normalizeCategoryToValid(group.category, 'expense'),
          paymentMethod: normalizePaymentMethodName(group.paymentMethod),
          logo: getLogoUrl(trimmed),
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}
