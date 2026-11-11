// Gemensamma typer för bankanalysen.
import { FixedExpense, Income } from '../../types';

export type DetectedFixedExpenseWithEvidence = Omit<FixedExpense, 'id'> & {
  detectedOccurrences: number;
  lastDate?: string;
  evidenceDates?: string[];
  evidenceAmounts?: number[];
  evidenceSummary?: string;
};

export type DetectedIncomeWithEvidence = Omit<Income, 'id'> & {
  detectedOccurrences?: number;
  lastDate?: string;
  evidenceDates?: string[];
  evidenceAmounts?: number[];
  evidenceSummary?: string;
};

export interface AnalyzedBankOnboardingData {
  detectedFixedExpenses: DetectedFixedExpenseWithEvidence[];
  detectedIncomes: DetectedIncomeWithEvidence[];
  suggestedPayday: number | null;
  calculatedSpentSincePayday: number;
  analyzedTransactionCount: number;
}

export interface ExistingBudgetFixedExpenseMatch {
  id: string;
  detected: DetectedFixedExpenseWithEvidence;
  status: 'new' | 'amount_changed' | 'already_exists';
  existingExpense?: FixedExpense;
}

export interface ExistingBudgetIncomeMatch {
  id: string;
  detected: DetectedIncomeWithEvidence;
  status: 'new' | 'amount_changed' | 'already_exists';
  existingIncome?: Income;
}

export interface PeriodBankPurchaseCandidate {
  bankTxId: string;
  externalKey: string;
  merchant: string;
  rawDescription: string;
  amount: number; // positive expense amount for app Transaction
  dateIso: string;
  timestamp: number;
  category: string;
  logo?: string;
  isReserved: boolean;
  alreadyInApp: boolean;
}

export interface ExistingBudgetBankSyncPlan {
  periodStartIso: string;
  periodPurchases: PeriodBankPurchaseCandidate[];
  skippedFixedInPeriodCount: number;
  skippedInternalTransfersCount: number;
  fixedExpenseMatches: ExistingBudgetFixedExpenseMatch[];
  incomeMatches: ExistingBudgetIncomeMatch[];
  analyzedTransactionCount: number;
}
