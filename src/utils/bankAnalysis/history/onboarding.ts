// Bankanalysen i introduktionen: vad appen föreslår när användaren kopplar sin bank.
import { BankAccount, BankTransactionItem } from '../../../services/bank/types';
import { AnalyzedBankOnboardingData } from '../types';
import { getNormalizedBankTxAmount } from '../normalization/amount';
import { getTxDate } from '../txFields';
import { CoreBankDetectionResult, runCoreBankDetection } from './core';

/** Tomt resultat när det inte finns några transaktioner. */
function emptyOnboardingAnalysis(): AnalyzedBankOnboardingData {
  return {
    detectedFixedExpenses: [],
    detectedIncomes: [],
    suggestedPayday: null,
    calculatedSpentSincePayday: 0,
    analyzedTransactionCount: 0,
  };
}

/** Summan av rörliga utgifter (inte fasta) sedan senaste lönedag, i hela kronor. */
function sumSpentSincePayday(core: CoreBankDetectionResult): number {
  let spent = 0;
  for (const tx of core.outflows) {
    if (core.fixedTransactionIds.has(tx.id)) continue;
    if (getTxDate(tx) >= core.periodStartIso) spent += Math.abs(getNormalizedBankTxAmount(tx));
  }
  return Math.round(spent);
}

/** Sammanfattar en färdig kärnanalys till det introduktionen visar. */
function summarizeForOnboarding(
  core: CoreBankDetectionResult,
  transactionCount: number
): AnalyzedBankOnboardingData {
  return {
    detectedFixedExpenses: core.detectedFixedExpenses,
    detectedIncomes: core.detectedIncomes,
    suggestedPayday: core.suggestedPayday,
    calculatedSpentSincePayday: sumSpentSincePayday(core),
    analyzedTransactionCount: transactionCount,
  };
}

/**
 * Analyserar bankhistoriken för introduktionen: hittade fasta utgifter och inkomster,
 * föreslagen lönedag och hur mycket som redan gått åt sedan senaste lön.
 */
export function analyzeBankTransactionsForOnboarding(
  transactions: BankTransactionItem[],
  currentPayday = 25,
  paydayBeforeWeekend = true,
  userAccounts: BankAccount[] = []
): AnalyzedBankOnboardingData {
  return analyzeOnboardingWithCore(transactions, currentPayday, paydayBeforeWeekend, userAccounts)
    .baseAnalysis;
}

/** Som analyzeBankTransactionsForOnboarding, men ger även kärnanalysen så att den inte körs två gånger. */
export function analyzeOnboardingWithCore(
  transactions: BankTransactionItem[],
  currentPayday: number,
  paydayBeforeWeekend: boolean,
  userAccounts: BankAccount[]
): { baseAnalysis: AnalyzedBankOnboardingData; core: CoreBankDetectionResult | null } {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { baseAnalysis: emptyOnboardingAnalysis(), core: null };
  }
  const core = runCoreBankDetection(transactions, currentPayday, paydayBeforeWeekend, userAccounts);
  return { baseAnalysis: summarizeForOnboarding(core, transactions.length), core };
}
