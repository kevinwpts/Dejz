// Plan för befintliga användare (Inställningar → Bankkoppling): vad banken visar jämfört med budgeten.
import { BankAccount, BankTransactionItem } from '../../../services/bankService';
import { Config, FixedExpense, Income, Transaction } from '../../../types';
import { ExistingBudgetBankSyncPlan, PeriodBankPurchaseCandidate } from '../types';
import { getNormalizedBankTxAmount } from '../normalization';
import { categorizeBankTransactionForApp } from '../merchantRules';
import { CoreBankDetectionResult, runCoreBankDetection } from '../history';
import { getTxDate, isPendingBookingStatus } from '../txFields';
import { createExistingFixedMatcher, matchDetectedFixedExpenses, matchDetectedIncomes } from './matching';

const DAY_MS = 1000 * 60 * 60 * 24;

/** Sant om köpet redan finns i appen (samma bank-id/tagg, eller samma belopp inom 2,5 dagar). */
function isPurchaseAlreadyInApp(
  tx: BankTransactionItem,
  absAmount: number,
  timestamp: number,
  appTxs: Transaction[]
): boolean {
  return appTxs.some((appTx) => {
    if (appTx.bankTransactionId === tx.id) return true;
    if (
      Array.isArray(appTx.tags) &&
      (appTx.tags.includes(`bank_tx:${tx.id}`) || appTx.tags.includes(`bank_key:${tx.external_key}`))
    ) {
      return true;
    }
    const sameAmount = Math.abs(Number(appTx.amount) - absAmount) < 1;
    const dayDiff = Math.abs(Number(appTx.timestamp) - timestamp) / DAY_MS;
    return sameAmount && dayDiff <= 2.5;
  });
}

/** Rörliga köp i nuvarande löneperiod, plus antal överhoppade fasta utgifter och egna överföringar. */
function collectPeriodPurchases(
  bankTransactions: BankTransactionItem[],
  core: CoreBankDetectionResult,
  isExistingFixed: (tx: BankTransactionItem) => boolean,
  availableCategories: string[],
  appTxs: Transaction[]
): Pick<ExistingBudgetBankSyncPlan, 'periodPurchases' | 'skippedFixedInPeriodCount' | 'skippedInternalTransfersCount'> {
  const periodPurchases: PeriodBankPurchaseCandidate[] = [];
  let skippedFixedInPeriodCount = 0;
  let skippedInternalTransfersCount = 0;

  for (const tx of bankTransactions) {
    // Reserverade köp påverkar inte den vanliga budgeten (v1)
    if (isPendingBookingStatus(tx.booking_status)) continue;
    const txDate = getTxDate(tx);
    if (!txDate || txDate < core.periodStartIso) continue;
    if (core.internalTransferIds.has(tx.id)) {
      skippedInternalTransfersCount++;
      continue;
    }
    const signedAmt = getNormalizedBankTxAmount(tx);
    if (signedAmt >= 0) continue; // Bara köp (pengar ut)
    if (core.fixedTransactionIds.has(tx.id) || isExistingFixed(tx)) {
      skippedFixedInPeriodCount++;
      continue;
    }
    const absAmount = Math.round(Math.abs(signedAmt) * 100) / 100;
    if (absAmount <= 0) continue;

    const categorized = categorizeBankTransactionForApp(tx, availableCategories);
    const parsedDateMs = Date.parse(`${txDate}T12:00:00`);
    const timestamp = Number.isFinite(parsedDateMs) ? parsedDateMs : Date.now();
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
      alreadyInApp: isPurchaseAlreadyInApp(tx, absAmount, timestamp, appTxs),
    });
  }
  return { periodPurchases, skippedFixedInPeriodCount, skippedInternalTransfersCount };
}

/** Tom plan när det inte finns några banktransaktioner. */
function emptySyncPlan(): ExistingBudgetBankSyncPlan {
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

/**
 * Smart sammanslagning för befintliga användare: jämför hittade fasta utgifter och inkomster
 * med budgeten och listar periodens rörliga köp (och om de redan finns i appen).
 */
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
  if (!Array.isArray(bankTransactions) || bankTransactions.length === 0) return emptySyncPlan();

  const paydayBeforeWeekend =
    config.paydayBeforeWeekend !== undefined ? config.paydayBeforeWeekend : true;
  const core = runCoreBankDetection(bankTransactions, config.payday || 25, paydayBeforeWeekend, userAccounts);
  const purchases = collectPeriodPurchases(
    bankTransactions,
    core,
    createExistingFixedMatcher(existingFixedExpenses),
    (config.categories || []).map((c) => c.name),
    existingAppTransactions
  );

  return {
    periodStartIso: core.periodStartIso,
    ...purchases,
    fixedExpenseMatches: matchDetectedFixedExpenses(core.detectedFixedExpenses, existingFixedExpenses),
    incomeMatches: matchDetectedIncomes(core.detectedIncomes, existingIncomes),
    analyzedTransactionCount: bankTransactions.length,
  };
}
