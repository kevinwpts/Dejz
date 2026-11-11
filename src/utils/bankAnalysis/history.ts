// Analys av bankhistorik (introduktion och synk). Del av bankanalysen (tidigare utils/bankHistoryAnalyzer.ts).
import { BankAccount, BankTransactionItem } from '../../services/bankService';
import { SWEDISH_EXPENSE_PRESETS, SwedishExpensePreset } from '../../data/swedishExpensePresets';
import { FixedExpense, Frequency, PaydayType, WeekendAdjustment } from '../../types';
import { getLogoUrl } from '../logo';
import { getPeriodBoundaries } from '../date';
import {
  AnalyzedBankOnboardingData,
  DetectedFixedExpenseWithEvidence,
  DetectedIncomeWithEvidence,
} from './types';
import { isLikelyPersonFullName } from './accounts';
import {
  findRawBankInternalTransferIds,
  getNormalizedBankTxAmount,
  isInternalTransferOrMicroSavings,
} from './normalization';
import {
  EXTENDED_FIXED_EXPENSE_RULES,
  KeywordRule,
  VARIABLE_SPENDING_EXCLUSIONS,
  buildEvidenceSummary,
  cleanDisplayMerchantName,
  getDayOfMonthFromIso,
  getYearMonthKey,
  inferFrequencyFromDates,
  inferTrueRecurringDayOfMonth,
  normalizeMerchantKey,
} from './merchantRules';

// ---------------------------------------------------------------------------
// 4. CORE HISTORICAL ANALYZER (USED IN BOTH ONBOARDING & SETTINGS SYNC)
// ---------------------------------------------------------------------------

export function getBankTxCodeDescription(tx: BankTransactionItem): string {
  const rawJson = tx.raw_json && typeof tx.raw_json === 'object' ? tx.raw_json : null;
  return String(rawJson?.bank_transaction_code?.description || '').trim().toLowerCase();
}

export function runCoreBankDetection(
  transactions: BankTransactionItem[],
  currentPayday = 25,
  paydayBeforeWeekend = true,
  userAccounts: BankAccount[] = []
) {
  // Only analyze booked transactions (or transactions without status); reserved holds are not proof of recurring agreements
  const bookedOrDefault = transactions.filter(
    (t) => t.booking_status !== 'PDNG' && t.booking_status !== 'HOLD'
  );

  // Deduplicate identical transactions on the same date (e.g. if the same bank account was synced across multiple connections)
  const seenTxSigs = new Set<string>();
  const deduplicated: BankTransactionItem[] = [];
  for (const t of bookedOrDefault) {
    const date = t.booking_date || t.transaction_date || t.value_date || '';
    const amtCents = Math.round(getNormalizedBankTxAmount(t) * 100);
    const descKey = String(t.description || t.counterparty_name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    const sig = `${date}|${amtCents}|${descKey}`;
    if (seenTxSigs.has(sig)) continue;
    seenTxSigs.add(sig);
    deduplicated.push(t);
  }

  // Sort newest first
  const sorted = [...deduplicated].sort((a, b) => {
    const dA = a.booking_date || a.transaction_date || a.value_date || '';
    const dB = b.booking_date || b.transaction_date || b.value_date || '';
    return dB.localeCompare(dA);
  });

  const internalTransferIds = findRawBankInternalTransferIds(sorted, userAccounts);

  const outflows = sorted.filter(
    (t) =>
      !internalTransferIds.has(t.id) &&
      (t.currency || 'SEK') === 'SEK' &&
      getNormalizedBankTxAmount(t) < 0
  );
  const inflows = sorted.filter(
    (t) =>
      !internalTransferIds.has(t.id) &&
      (t.currency || 'SEK') === 'SEK' &&
      getNormalizedBankTxAmount(t) > 0
  );

  type RawFixedGroup = Omit<FixedExpense, 'id'> & {
    detectedOccurrences: number;
    lastDate?: string;
    matchedTxIds: Set<string>;
    dates: string[];
    amounts: number[];
    hasExplicitAutogiroOrInvoice: boolean;
    requireMultipleMonthsForCard?: boolean;
  };

  const candidateFixedMap = new Map<string, RawFixedGroup>();

  // Layer 1: Collect matches against known Swedish fixed expense & subscription rules
  for (const tx of outflows) {
    const absAmount = Math.round(Math.abs(getNormalizedBankTxAmount(tx)));
    if (absAmount <= 0 || absAmount > 60000) continue;

    const combinedText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    const bankTxCode = getBankTxCodeDescription(tx);

    // Skip if it's an everyday grocery/restaurant merchant
    if (VARIABLE_SPENDING_EXCLUSIONS.some((ex) => combinedText.includes(ex))) {
      continue;
    }

    let matchedRule: KeywordRule | null = null;
    for (const rule of EXTENDED_FIXED_EXPENSE_RULES) {
      if (rule.keywords.some((kw) => combinedText.includes(kw.toLowerCase()))) {
        matchedRule = rule;
        break;
      }
    }

    if (matchedRule) {
      const preset: SwedishExpensePreset | undefined = matchedRule.presetId
        ? SWEDISH_EXPENSE_PRESETS.find((p) => p.id === matchedRule!.presetId)
        : undefined;

      const isGenericHousingPreset = matchedRule.presetId === 'hyra-bostad';
      const isAppleBillingRule =
        matchedRule.fallbackName === 'Apple / iCloud' ||
        matchedRule.keywords.includes('apple.com/bill');
      const cleanedRawName = cleanDisplayMerchantName(
        tx.counterparty_name || tx.description || ''
      );
      const baseDisplayName =
        isGenericHousingPreset && cleanedRawName.length >= 3
          ? `Hyra (${cleanedRawName})`
          : isAppleBillingRule
          ? absAmount === 12 || absAmount === 39 || absAmount === 129
            ? 'Apple / iCloud+'
            : 'Apple-abonnemang'
          : preset?.name || matchedRule.fallbackName;

      const displayName = baseDisplayName;

      const baseKey = isGenericHousingPreset
        ? `housing_${normalizeMerchantKey(cleanedRawName)}`
        : matchedRule.presetId || matchedRule.fallbackName.toLowerCase();

      const key = matchedRule.splitByExactAmount ? `${baseKey}_${absAmount}` : baseKey;

      const txDate = tx.booking_date || tx.transaction_date || tx.value_date || undefined;
      const deductionDay = getDayOfMonthFromIso(txDate, preset?.deductionDay || 27);
      const category = preset?.category || matchedRule.category;
      const isDirectDebit = bankTxCode === 'direct debit' || combinedText.includes('autogiro');
      const isGiroPayment =
        bankTxCode === 'payment' ||
        combinedText.includes('bankgiro') ||
        combinedText.includes('plusgiro');

      const paymentMethod = isDirectDebit
        ? 'Autogiro'
        : isGiroPayment
        ? 'Bankgiro'
        : preset?.paymentMethod || matchedRule.paymentMethod;

      const STANDARD_APPLE_GOOGLE_SUB_TIERS = new Set([
        9, 10, 12, 15, 19, 20, 25, 29, 30, 35, 39, 45, 49, 55, 59, 65, 69, 75, 79, 85, 89, 95, 99,
        105, 109, 115, 119, 125, 129, 135, 139, 145, 149, 155, 159, 165, 169, 175, 179, 185, 189,
        195, 199, 209, 219, 229, 239, 249, 259, 269, 279, 289, 299, 319, 329, 349, 359, 379, 399,
        449, 499,
      ]);
      const isStandardSubTier =
        matchedRule.requireMultipleMonthsForCard && STANDARD_APPLE_GOOGLE_SUB_TIERS.has(absAmount);

      const hasExplicitAutogiroOrInvoice =
        (!matchedRule.requireMultipleMonthsForCard || isStandardSubTier) &&
        (isDirectDebit ||
          isGiroPayment ||
          combinedText.includes('hyra') ||
          combinedText.includes('hyresavi') ||
          combinedText.includes('bolån') ||
          combinedText.includes('csn') ||
          paymentMethod === 'Autogiro' ||
          paymentMethod === 'Bankgiro' ||
          category === 'Boende' ||
          category === 'Försäkringar' ||
          category === 'Streaming' ||
          category === 'Abonnemang' ||
          category === 'Hälsa' ||
          category === 'Räkningar');

      const existing = candidateFixedMap.get(key);
      if (!existing) {
        candidateFixedMap.set(key, {
          name: displayName,
          amount: absAmount,
          category,
          frequency: Frequency.MONTHLY,
          deductionDay,
          paymentMethod,
          logo: getLogoUrl(baseDisplayName, category),
          detectedOccurrences: 1,
          lastDate: txDate,
          matchedTxIds: new Set([tx.id]),
          dates: txDate ? [txDate] : [],
          amounts: [absAmount],
          hasExplicitAutogiroOrInvoice,
          requireMultipleMonthsForCard:
            matchedRule.requireMultipleMonthsForCard && !isStandardSubTier,
        });
      } else {
        existing.detectedOccurrences += 1;
        existing.matchedTxIds.add(tx.id);
        if (txDate) existing.dates.push(txDate);
        existing.amounts.push(absAmount);
        if (hasExplicitAutogiroOrInvoice) {
          existing.hasExplicitAutogiroOrInvoice = true;
        }
      }
    }
  }

  // Filter candidateFixedMap: require >= 2 occurrences across distinct months/dates OR known subscription/autogiro/bankgiro/housing/insurance agreement
  const detectedFixedMap = new Map<string, DetectedFixedExpenseWithEvidence & { matchedTxIds: Set<string> }>();
  const fixedTransactionIds = new Set<string>();

  for (const [key, cand] of candidateFixedMap.entries()) {
    const distinctDates = Array.from(new Set(cand.dates));
    const distinctMonths = new Set(cand.dates.map((d) => getYearMonthKey(d)));
    distinctMonths.delete('unknown');

    const isConfirmedRecurring = cand.requireMultipleMonthsForCard
      ? distinctMonths.size >= 2
      : distinctMonths.size >= 2 ||
        distinctDates.length >= 2 ||
        cand.hasExplicitAutogiroOrInvoice;

    if (!isConfirmedRecurring) {
      continue;
    }

    for (const txId of cand.matchedTxIds) {
      fixedTransactionIds.add(txId);
    }

    const frequency = inferFrequencyFromDates(cand.dates);
    const trueDeductionDay = inferTrueRecurringDayOfMonth(
      cand.dates,
      'expense',
      cand.category,
      cand.name,
      cand.deductionDay || 27
    );
    const minAmt = Math.min(...cand.amounts);
    const maxAmt = Math.max(...cand.amounts);
    const candNameLower = String(cand.name || '').toLowerCase();
    const isUtilityVariable =
      candNameLower.includes('el') ||
      candNameLower.includes('öresund') ||
      candNameLower.includes('oresund') ||
      candNameLower.includes('tibber') ||
      candNameLower.includes('vattenfall') ||
      candNameLower.includes('fortum') ||
      candNameLower.includes('trängselskatt');
    const isVariable =
      isUtilityVariable || (cand.amounts.length >= 2 && (maxAmt - minAmt) / (minAmt || 1) > 0.05);

    const evidenceSummary = buildEvidenceSummary(
      cand.detectedOccurrences,
      cand.dates,
      cand.amounts,
      frequency,
      isVariable
    );

    detectedFixedMap.set(key, {
      name: cand.name,
      amount: cand.amount,
      category: cand.category,
      frequency,
      deductionDay: trueDeductionDay,
      paymentMethod: cand.paymentMethod,
      isVariable,
      logo: cand.logo,
      detectedOccurrences: cand.detectedOccurrences,
      lastDate: cand.lastDate,
      evidenceDates: cand.dates.slice(0, 6),
      evidenceAmounts: cand.amounts.slice(0, 6),
      evidenceSummary,
      matchedTxIds: cand.matchedTxIds,
    });
  }

  // Layer 2: Detect recurring charges across multiple months/quarters not covered by Layer 1
  const merchantGroups = new Map<string, BankTransactionItem[]>();
  for (const tx of outflows) {
    if (fixedTransactionIds.has(tx.id)) continue;

    const absAmount = Math.round(Math.abs(getNormalizedBankTxAmount(tx)));
    if (absAmount < 25 || absAmount > 50000) continue;

    const combinedText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    if (VARIABLE_SPENDING_EXCLUSIONS.some((ex) => combinedText.includes(ex))) {
      continue;
    }
    if (
      (combinedText.includes('swish') ||
        combinedText.includes('överföring') ||
        combinedText.includes('overforing')) &&
      !combinedText.includes('autogiro')
    ) {
      continue;
    }

    const normKey = normalizeMerchantKey(tx.counterparty_name || tx.description || '');
    if (!normKey || normKey.length < 3) continue;

    const list = merchantGroups.get(normKey) || [];
    list.push(tx);
    merchantGroups.set(normKey, list);
  }

  for (const [normKey, groupTxs] of merchantGroups.entries()) {
    const distinctMonths = new Set(
      groupTxs.map((t) => getYearMonthKey(t.booking_date || t.transaction_date || t.value_date))
    );
    distinctMonths.delete('unknown');

    const latestTx = groupTxs[0];
    const latestAmount = Math.round(Math.abs(getNormalizedBankTxAmount(latestTx)));
    const combinedText = `${latestTx.description || ''} ${latestTx.counterparty_name || ''}`.toLowerCase();
    const bankTxCode = getBankTxCodeDescription(latestTx);

    const hasExplicitAutogiroKeyword =
      bankTxCode === 'direct debit' ||
      combinedText.includes('autogiro') ||
      combinedText.includes('bankgiro') ||
      combinedText.includes('plusgiro') ||
      combinedText.includes('hyresavi') ||
      combinedText.includes('förskola') ||
      combinedText.includes('forskola');

    const consistentCount = groupTxs.filter((t) => {
      const amt = Math.abs(getNormalizedBankTxAmount(t));
      const ratio = amt / (latestAmount || 1);
      return ratio >= 0.65 && ratio <= 1.35;
    }).length;

    // Require >= 2 distinct months (and at most ~1 charge per month) OR explicit autogiro/bankgiro
    const isRecurring =
      (distinctMonths.size >= 2 &&
        consistentCount >= 2 &&
        groupTxs.length <= distinctMonths.size * 1.5) ||
      (hasExplicitAutogiroKeyword && latestAmount >= 49);

    if (isRecurring) {
      const displayName = cleanDisplayMerchantName(
        latestTx.counterparty_name || latestTx.description || normKey
      );
      const txDate =
        latestTx.booking_date || latestTx.transaction_date || latestTx.value_date || undefined;
      const deductionDay = getDayOfMonthFromIso(txDate, 27);

      let category = 'Räkningar';
      if (latestAmount >= 3500 && deductionDay >= 24) {
        category = 'Boende';
      } else if (latestAmount <= 350) {
        category = 'Abonnemang';
      }

      const matchedIds = new Set<string>();
      const dates: string[] = [];
      const amounts: number[] = [];
      for (const t of groupTxs) {
        fixedTransactionIds.add(t.id);
        matchedIds.add(t.id);
        const d = t.booking_date || t.transaction_date || t.value_date;
        if (d) dates.push(d);
        amounts.push(Math.round(Math.abs(getNormalizedBankTxAmount(t))));
      }

      const frequency = inferFrequencyFromDates(dates);
      const trueDeductionDay = inferTrueRecurringDayOfMonth(
        dates,
        'expense',
        category,
        displayName,
        deductionDay
      );
      const minAmt = Math.min(...amounts);
      const maxAmt = Math.max(...amounts);
      const isVariable = amounts.length >= 2 && (maxAmt - minAmt) / (minAmt || 1) > 0.05;
      const occurrencesCount = distinctMonths.size || groupTxs.length;

      detectedFixedMap.set(`recurring_${normKey}`, {
        name: displayName,
        amount: latestAmount,
        category,
        frequency,
        deductionDay: trueDeductionDay,
        paymentMethod: hasExplicitAutogiroKeyword ? 'Autogiro' : 'Kort',
        isVariable,
        logo: getLogoUrl(displayName, category),
        detectedOccurrences: occurrencesCount,
        lastDate: txDate,
        evidenceDates: dates.slice(0, 6),
        evidenceAmounts: amounts.slice(0, 6),
        evidenceSummary: buildEvidenceSummary(
          occurrencesCount,
          dates,
          amounts,
          frequency,
          isVariable
        ),
        matchedTxIds: matchedIds,
      });
    }
  }

  // Layer 3: Detect Monthly Salary / Recurring Incomes & Payday
  // Requirement 4: "Överföringar och återbetalningar får inte automatiskt bli lön."
  const detectedIncomes: DetectedIncomeWithEvidence[] = [];
  let suggestedPayday: number | null = null;

  const REFUND_OR_TRANSFER_EXCLUSIONS = [
    'överföring',
    'overforing',
    'egna konton',
    'sparkonto',
    'enkla vardagen',
    'enkla sparkontot',
    'swish',
    'återköp',
    'aterkop',
    'retur',
    'refund',
    'kreditering',
    'återbetalning',
    'aterbetalning',
    'tillgodo',
    'apotea',
    'apoteket',
    'ica ',
    'coop ',
    'willys',
    'hemköp',
    'lidl',
    'ikea',
    'h&m',
    'zara',
    'elgiganten',
    'klarna',
    'apple.com',
    'zalando',
    'boozt',
  ];

  const validIncomeInflows = inflows.filter((tx) => {
    const amt = getNormalizedBankTxAmount(tx);
    if (amt < 1000) return false;
    const bankCode = getBankTxCodeDescription(tx);
    if (
      bankCode === 'transfer' ||
      bankCode === 'internal transfer' ||
      bankCode === 'account transfer' ||
      bankCode === 'instant payment'
    ) {
      return false;
    }
    if (isInternalTransferOrMicroSavings(tx, userAccounts)) {
      return false;
    }
    const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    if (REFUND_OR_TRANSFER_EXCLUSIONS.some((kw) => text.includes(kw))) {
      return false;
    }
    if (VARIABLE_SPENDING_EXCLUSIONS.some((kw) => text.includes(kw))) {
      return false;
    }
    return true;
  });

  // Group inflows by normalized source to get occurrence evidence
  const incomeGroups = new Map<
    string,
    {
      name: string;
      category: string;
      isPrimarySalary: boolean;
      txs: BankTransactionItem[];
      dates: string[];
      amounts: number[];
    }
  >();

  for (const tx of validIncomeInflows) {
    const amt = Math.round(getNormalizedBankTxAmount(tx));
    const rawText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    const bankTxCode = getBankTxCodeDescription(tx);

    const isBankCodeIncome =
      bankTxCode.includes('salary') ||
      bankTxCode.includes('pension') ||
      bankTxCode.includes('social benefit');
    const isExplicitSalary =
      rawText.includes('lön') ||
      rawText.includes('lon ') ||
      rawText.includes('salary') ||
      rawText.includes('löneutbetalning') ||
      rawText.includes('loneutbetalning') ||
      rawText.includes('arvode');
    const isCsn =
      rawText.includes('csn') ||
      rawText.includes('studiestöd') ||
      rawText.includes('studiestod') ||
      rawText.includes('centrala studiestödsnämnden');
    const isFk =
      rawText.includes('försäkringskassan') ||
      rawText.includes('forsakringskassan') ||
      rawText.includes('fkassa') ||
      rawText.includes('föräldrapenning') ||
      rawText.includes('foraldrapenning') ||
      rawText.includes('sjukpenning') ||
      rawText.includes('bostadsbidrag') ||
      rawText.includes('aktivitetsstöd') ||
      rawText.includes('aktivitetsersättning') ||
      rawText.includes('sjukersättning') ||
      rawText.includes('underhållsstöd');
    const isBarnbidrag = rawText.includes('barnbidrag');
    const isPension =
      rawText.includes('pension') ||
      rawText.includes('pensionsmyndigheten') ||
      rawText.includes('alecta') ||
      rawText.includes('amf ') ||
      rawText.includes('min pension') ||
      rawText.includes('kåpan') ||
      rawText.includes('spv ');
    const isAkassa =
      rawText.includes('a-kassa') ||
      rawText.includes('a kassa') ||
      rawText.includes('akassa') ||
      rawText.includes('arbetslöshetsersättning') ||
      rawText.includes('arbetsloshetsersattning') ||
      rawText.includes('alfakassan') ||
      rawText.includes('alfa-kassan') ||
      rawText.includes('unionen') ||
      rawText.includes('akademikernas') ||
      rawText.includes('småa') ||
      rawText.includes('smaa');
    const isUtbetalning = rawText.includes('utbetalning');

    if (
      !isExplicitSalary &&
      !isCsn &&
      !isFk &&
      !isBarnbidrag &&
      !isPension &&
      !isAkassa &&
      !isBankCodeIncome &&
      !isUtbetalning &&
      amt < 5000
    ) {
      continue;
    }

    let groupKey = 'salary';
    let incomeName = 'Lön';
    let incomeCategory = 'Lön';
    let isPrimarySalary = isExplicitSalary || isBankCodeIncome;

    if (isBarnbidrag) {
      groupKey = 'barnbidrag';
      incomeName = 'Barnbidrag';
      incomeCategory = 'Bidrag';
      isPrimarySalary = false;
    } else if (isCsn) {
      groupKey = 'csn';
      incomeName = 'CSN';
      incomeCategory = 'CSN';
      isPrimarySalary = false;
    } else if (isFk) {
      groupKey = 'fk';
      incomeName = 'Försäkringskassan';
      incomeCategory = 'Bidrag';
      isPrimarySalary = false;
    } else if (isAkassa) {
      groupKey = 'akassa';
      const cleanAcc = tx.counterparty_name ? cleanDisplayMerchantName(tx.counterparty_name) : 'A-kassa';
      incomeName =
        cleanAcc.toLowerCase().includes('kassa') || cleanAcc.toLowerCase().includes('unionen')
          ? cleanAcc
          : 'A-kassa';
      incomeCategory = 'Ersättning';
      isPrimarySalary = true;
    } else if (isPension) {
      groupKey = 'pension';
      incomeName = 'Pension';
      incomeCategory = 'Pension';
      isPrimarySalary = true;
    } else if (tx.counterparty_name) {
      const cleanEmp = cleanDisplayMerchantName(tx.counterparty_name);
      groupKey = `salary_${normalizeMerchantKey(cleanEmp)}`;
      incomeName = isExplicitSalary ? `Lön (${cleanEmp})` : cleanEmp || 'Lön';
      isPrimarySalary = isExplicitSalary || amt >= 10000;
    } else {
      const cleanDesc = cleanDisplayMerchantName(tx.description || '');
      if (
        cleanDesc &&
        cleanDesc.toLowerCase() !== 'lön' &&
        cleanDesc.toLowerCase() !== 'insättning' &&
        cleanDesc.toLowerCase() !== 'utbetalning'
      ) {
        groupKey = `income_${normalizeMerchantKey(cleanDesc)}`;
        incomeName = isExplicitSalary ? `Lön (${cleanDesc})` : cleanDesc;
      }
      isPrimarySalary = isExplicitSalary || amt >= 10000;
    }

    const txDate = tx.booking_date || tx.transaction_date || tx.value_date || '';
    const existing = incomeGroups.get(groupKey);
    if (!existing) {
      incomeGroups.set(groupKey, {
        name: incomeName,
        category: incomeCategory,
        isPrimarySalary,
        txs: [tx],
        dates: txDate ? [txDate] : [],
        amounts: [amt],
      });
    } else {
      existing.txs.push(tx);
      if (txDate) existing.dates.push(txDate);
      existing.amounts.push(amt);
    }
  }

  for (const grp of incomeGroups.values()) {
    const firstText = `${grp.txs[0].description || ''} ${grp.txs[0].counterparty_name || ''}`.toLowerCase();
    const firstBankCode = getBankTxCodeDescription(grp.txs[0]);
    const hasExplicitIncomeKeyword =
      firstText.includes('lön') ||
      firstText.includes('lon ') ||
      firstText.includes('salary') ||
      firstText.includes('löneutbetalning') ||
      firstText.includes('loneutbetalning') ||
      firstText.includes('utbetalning') ||
      firstText.includes('arvode') ||
      firstText.includes('csn') ||
      firstText.includes('studiestöd') ||
      firstText.includes('studiestod') ||
      firstText.includes('försäkringskassan') ||
      firstText.includes('forsakringskassan') ||
      firstText.includes('fkassa') ||
      firstText.includes('föräldrapenning') ||
      firstText.includes('foraldrapenning') ||
      firstText.includes('sjukpenning') ||
      firstText.includes('bostadsbidrag') ||
      firstText.includes('aktivitetsstöd') ||
      firstText.includes('barnbidrag') ||
      firstText.includes('pension') ||
      firstText.includes('a-kassa') ||
      firstText.includes('a kassa') ||
      firstText.includes('akassa') ||
      firstText.includes('alfakassan') ||
      firstText.includes('alfa-kassan') ||
      firstText.includes('unionen') ||
      firstText.includes('akademikernas') ||
      firstText.includes('småa') ||
      firstText.includes('smaa') ||
      firstText.includes('arbetslös') ||
      firstBankCode.includes('salary') ||
      firstBankCode.includes('pension') ||
      firstBankCode.includes('social benefit');

    const distinctMonths = new Set(
      grp.dates.map((d) => (d ? d.slice(0, 7) : '')).filter(Boolean)
    ).size;

    if (!hasExplicitIncomeKeyword) {
      if (distinctMonths < 2) continue;
      if (isLikelyPersonFullName(grp.name)) continue;
    }

    const latestAmount = grp.amounts[0];
    const latestDate = grp.dates[0];
    const fallbackDay = getDayOfMonthFromIso(latestDate, 25);

    const normalizedDay = inferTrueRecurringDayOfMonth(
      grp.dates,
      'income',
      grp.category,
      grp.name,
      fallbackDay
    );

    if (grp.isPrimarySalary && suggestedPayday === null) {
      suggestedPayday = normalizedDay;
    }

    const minAmt = Math.min(...grp.amounts);
    const maxAmt = Math.max(...grp.amounts);
    const isVariable =
      grp.amounts.length >= 2 && (maxAmt - minAmt) / (minAmt || 1) > 0.05;

    detectedIncomes.push({
      name: grp.name,
      amount: latestAmount,
      category: grp.category,
      deductionDay: normalizedDay,
      isVariable,
      icon: 'Wallet',
      logo: getLogoUrl(grp.name, grp.category),
      detectedOccurrences: grp.txs.length,
      lastDate: latestDate,
      evidenceDates: grp.dates.slice(0, 6),
      evidenceAmounts: grp.amounts.slice(0, 6),
      evidenceSummary: buildEvidenceSummary(
        grp.txs.length,
        grp.dates,
        grp.amounts,
        Frequency.MONTHLY,
        isVariable
      ),
    });
  }

  // Sort detected incomes so primary salary / largest income comes first
  detectedIncomes.sort((a, b) => b.amount - a.amount);

  if (suggestedPayday === null && detectedIncomes.length > 0) {
    suggestedPayday = detectedIncomes[0].deductionDay || 25;
  }

  // Layer 4: Period Boundaries & Variable Spending
  const effectivePayday = suggestedPayday || currentPayday || 25;
  const paydayType =
    effectivePayday === 25
      ? PaydayType.TWENTY_FIFTH
      : effectivePayday === 1
      ? PaydayType.FIRST_DAY
      : PaydayType.CUSTOM;
  const adjustment = paydayBeforeWeekend
    ? WeekendAdjustment.BEFORE
    : WeekendAdjustment.NONE;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { start } = getPeriodBoundaries(today, paydayType, effectivePayday, adjustment);
  const periodStartIso = start.toISOString().split('T')[0];

  const detectedFixedExpenses = Array.from(detectedFixedMap.values())
    .map(({ matchedTxIds: _ignore, ...rest }) => rest)
    .sort((a, b) => b.amount - a.amount);

  return {
    outflows,
    inflows,
    internalTransferIds,
    fixedTransactionIds,
    detectedFixedExpenses,
    detectedIncomes,
    suggestedPayday,
    periodStartIso,
  };
}

export function analyzeBankTransactionsForOnboarding(
  transactions: BankTransactionItem[],
  currentPayday = 25,
  paydayBeforeWeekend = true,
  userAccounts: BankAccount[] = []
): AnalyzedBankOnboardingData {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      detectedFixedExpenses: [],
      detectedIncomes: [],
      suggestedPayday: null,
      calculatedSpentSincePayday: 0,
      analyzedTransactionCount: 0,
    };
  }

  const core = runCoreBankDetection(
    transactions,
    currentPayday,
    paydayBeforeWeekend,
    userAccounts
  );

  let calculatedSpentSincePayday = 0;
  for (const tx of core.outflows) {
    if (core.fixedTransactionIds.has(tx.id)) continue;
    const txDate = tx.booking_date || tx.transaction_date || tx.value_date || '';
    if (txDate >= core.periodStartIso) {
      calculatedSpentSincePayday += Math.abs(getNormalizedBankTxAmount(tx));
    }
  }

  return {
    detectedFixedExpenses: core.detectedFixedExpenses,
    detectedIncomes: core.detectedIncomes,
    suggestedPayday: core.suggestedPayday,
    calculatedSpentSincePayday: Math.round(calculatedSpentSincePayday),
    analyzedTransactionCount: transactions.length,
  };
}

export interface OnboardingAiCandidateGroup {
  key: string;
  name: string;
  rawSample: string;
  category?: string;
  paymentMethod?: string;
  latestAmount: number;
  amounts: number[];
  datesWithWeekday: string[];
  rawDates: string[];
  occurrences: number;
  ruleDay: number;
  isRuleDetected: boolean;
}

export function formatDateWithWeekday(isoDate: string): string {
  const m = (isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return isoDate;
  const dt = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${m[1]}-${m[2]}-${m[3]} (${days[dt.getDay()] || ''})`;
}

/**
 * Sammanställer kandidater (både regeldetekterade och 1-dragningars/okända kandidater)
 * med exakta datum och veckodagar för AI-verifiering i onboardingen.
 */
export function extractOnboardingAiCandidates(
  transactions: BankTransactionItem[],
  currentPayday = 25,
  paydayBeforeWeekend = true,
  userAccounts: BankAccount[] = []
): {
  baseAnalysis: AnalyzedBankOnboardingData;
  expenseCandidates: OnboardingAiCandidateGroup[];
  incomeCandidates: OnboardingAiCandidateGroup[];
} {
  const baseAnalysis = analyzeBankTransactionsForOnboarding(
    transactions,
    currentPayday,
    paydayBeforeWeekend,
    userAccounts
  );

  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      baseAnalysis,
      expenseCandidates: [],
      incomeCandidates: [],
    };
  }

  const core = runCoreBankDetection(
    transactions,
    currentPayday,
    paydayBeforeWeekend,
    userAccounts
  );

  const expenseCandidates: OnboardingAiCandidateGroup[] = [];

  // 1. Alla regeldetekterade fasta utgifter
  core.detectedFixedExpenses.forEach((det, idx) => {
    const rawDates = det.evidenceDates || (det.lastDate ? [det.lastDate] : []);
    expenseCandidates.push({
      key: `det_exp_${idx}`,
      name: det.name,
      rawSample: det.name,
      category: det.category || 'Räkningar',
      paymentMethod: det.paymentMethod || 'Autogiro',
      latestAmount: Math.round(det.amount),
      amounts: (det.evidenceAmounts || [det.amount]).map((a) => Math.round(a)),
      datesWithWeekday: rawDates.map(formatDateWithWeekday),
      rawDates,
      occurrences: det.detectedOccurrences || rawDates.length || 1,
      ruleDay: det.deductionDay || 27,
      isRuleDetected: true,
    });
  });

  // 2. Okända / nystartade utgiftskandidater (t.ex. 1 dragning på nytt abonnemang, gym, el, försäkring, bredband, BRF)
  // Filtrera bort uppenbara vardagsköp (matbutiker, restauranger, kaféer, Swish till privatpersoner, frekventa småköp)
  const unmatchedByNorm = new Map<string, BankTransactionItem[]>();
  for (const tx of core.outflows) {
    if (core.fixedTransactionIds.has(tx.id)) continue;
    const absAmt = Math.round(Math.abs(getNormalizedBankTxAmount(tx)));
    if (absAmt < 19 || absAmt > 50000) continue;

    const combinedText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    if (VARIABLE_SPENDING_EXCLUSIONS.some((ex) => combinedText.includes(ex))) continue;
    if (
      /(kafé|kafe|cafe|coffee|bageri|konditori|restaurang|pizza|sushi|burger|krog|bar |pub |lunch|kiosk|automat|parkster|easypark|aimo| Uber |bolt|voi |tier |ryde |taxi|swish|7-eleven|pressbyr)/.test(
        combinedText
      ) &&
      !combinedText.includes('autogiro') &&
      !combinedText.includes('månad')
    ) {
      continue;
    }

    const normKey = normalizeMerchantKey(tx.counterparty_name || tx.description || '');
    if (!normKey || normKey.length < 3) continue;
    const arr = unmatchedByNorm.get(normKey) || [];
    arr.push(tx);
    unmatchedByNorm.set(normKey, arr);
  }

  let unmatchedExpIdx = 0;
  for (const [normKey, groupTxs] of unmatchedByNorm.entries()) {
    if (unmatchedExpIdx >= 30) break;
    // Om man handlat på samma ställe mer än 4 gånger på 90 dagar utan att det matchat månadsmönster är det vardagskonsumtion
    const distinctMonths = new Set(
      groupTxs.map((t) => getYearMonthKey(t.booking_date || t.transaction_date || t.value_date))
    );
    distinctMonths.delete('unknown');
    if (groupTxs.length > Math.max(3, distinctMonths.size * 1.5)) continue;

    const latestTx = groupTxs[0];
    const latestAmt = Math.round(Math.abs(getNormalizedBankTxAmount(latestTx)));
    const rawSample = `${latestTx.counterparty_name || ''} ${latestTx.description || ''}`.trim();
    const displayName = cleanDisplayMerchantName(
      latestTx.counterparty_name || latestTx.description || normKey
    );
    const rawDates = groupTxs
      .map((t) => t.booking_date || t.transaction_date || t.value_date || '')
      .filter(Boolean)
      .slice(0, 6);
    const amounts = groupTxs
      .map((t) => Math.round(Math.abs(getNormalizedBankTxAmount(t))))
      .slice(0, 6);
    const bankTxCode = getBankTxCodeDescription(latestTx);
    const isDirectDebit =
      bankTxCode === 'direct debit' || rawSample.toLowerCase().includes('autogiro');
    const isGiro =
      bankTxCode === 'payment' ||
      rawSample.toLowerCase().includes('bankgiro') ||
      rawSample.toLowerCase().includes('plusgiro');
    const paymentMethod = isDirectDebit ? 'Autogiro' : isGiro ? 'Bankgiro' : 'Kort';
    const ruleDay = inferTrueRecurringDayOfMonth(
      rawDates,
      'expense',
      'Abonnemang',
      displayName,
      getDayOfMonthFromIso(rawDates[0], 27)
    );

    expenseCandidates.push({
      key: `cand_exp_${unmatchedExpIdx++}`,
      name: displayName,
      rawSample,
      category: paymentMethod === 'Kort' ? 'Abonnemang' : 'Räkningar',
      paymentMethod,
      latestAmount: latestAmt,
      amounts,
      datesWithWeekday: rawDates.map(formatDateWithWeekday),
      rawDates,
      occurrences: groupTxs.length,
      ruleDay,
      isRuleDetected: false,
    });
  }

  // 3. Alla regeldetekterade inkomster + eventuella oupptäckta inkomstkandidater >= 1500 kr
  const incomeCandidates: OnboardingAiCandidateGroup[] = [];
  const coveredInflowNames = new Set<string>();

  core.detectedIncomes.forEach((inc, idx) => {
    const rawDates = inc.evidenceDates || (inc.lastDate ? [inc.lastDate] : []);
    coveredInflowNames.add(normalizeMerchantKey(inc.name));
    incomeCandidates.push({
      key: `det_inc_${idx}`,
      name: inc.name,
      rawSample: inc.name,
      category: inc.category || 'Lön',
      latestAmount: Math.round(inc.amount),
      amounts: (inc.evidenceAmounts || [inc.amount]).map((a) => Math.round(a)),
      datesWithWeekday: rawDates.map(formatDateWithWeekday),
      rawDates,
      occurrences: inc.detectedOccurrences || rawDates.length || 1,
      ruleDay: inc.deductionDay || 25,
      isRuleDetected: true,
    });
  });

  const unmatchedInflowsByNorm = new Map<string, BankTransactionItem[]>();
  for (const tx of core.inflows) {
    const amt = Math.round(getNormalizedBankTxAmount(tx));
    if (amt < 1500) continue;
    const bankCode = getBankTxCodeDescription(tx);
    if (
      bankCode === 'transfer' ||
      bankCode === 'internal transfer' ||
      bankCode === 'account transfer' ||
      bankCode === 'instant payment'
    ) {
      continue;
    }
    if (isInternalTransferOrMicroSavings(tx, userAccounts)) continue;
    const rawText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    if (
      /(överföring|overforing|egna konton|sparkonto|swish|återköp|aterkop|retur|refund|kreditering|återbetalning|aterbetalning)/.test(
        rawText
      )
    ) {
      continue;
    }
    const normKey = normalizeMerchantKey(tx.counterparty_name || tx.description || '');
    if (!normKey || coveredInflowNames.has(normKey)) continue;
    if (isLikelyPersonFullName(normKey)) continue;
    const arr = unmatchedInflowsByNorm.get(normKey) || [];
    arr.push(tx);
    unmatchedInflowsByNorm.set(normKey, arr);
  }

  let unmatchedIncIdx = 0;
  for (const [normKey, groupTxs] of unmatchedInflowsByNorm.entries()) {
    if (unmatchedIncIdx >= 12) break;
    const latestTx = groupTxs[0];
    const latestAmt = Math.round(getNormalizedBankTxAmount(latestTx));
    const rawSample = `${latestTx.counterparty_name || ''} ${latestTx.description || ''}`.trim();
    const displayName = cleanDisplayMerchantName(
      latestTx.counterparty_name || latestTx.description || normKey
    );
    if (isLikelyPersonFullName(displayName)) continue;
    const rawDates = groupTxs
      .map((t) => t.booking_date || t.transaction_date || t.value_date || '')
      .filter(Boolean)
      .slice(0, 6);
    const amounts = groupTxs.map((t) => Math.round(getNormalizedBankTxAmount(t))).slice(0, 6);
    const ruleDay = inferTrueRecurringDayOfMonth(
      rawDates,
      'income',
      'Lön',
      displayName,
      getDayOfMonthFromIso(rawDates[0], 25)
    );

    incomeCandidates.push({
      key: `cand_inc_${unmatchedIncIdx++}`,
      name: displayName,
      rawSample,
      category: 'Lön',
      latestAmount: latestAmt,
      amounts,
      datesWithWeekday: rawDates.map(formatDateWithWeekday),
      rawDates,
      occurrences: groupTxs.length,
      ruleDay,
      isRuleDetected: false,
    });
  }

  return {
    baseAnalysis,
    expenseCandidates,
    incomeCandidates,
  };
}
