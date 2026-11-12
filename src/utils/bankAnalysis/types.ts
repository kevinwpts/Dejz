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
