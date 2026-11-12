// Gemensamt för historikanalysens steg.
import { BankTransactionItem } from '../../../services/bank/types';
import { DetectedFixedExpenseWithEvidence } from '../types';
import { getNormalizedBankTxAmount } from '../normalization/amount';
import { getTxDate } from '../txFields';

/** En hittad fast utgift plus id:n på de banktransaktioner som bevisar den. */
export type DetectedFixedWithTxIds = DetectedFixedExpenseWithEvidence & { matchedTxIds: Set<string> };

/** Beloppet i hela kronor utan tecken, t.ex. -149.5 → 150. */
export function absRoundedAmount(tx: BankTransactionItem): number {
  return Math.round(Math.abs(getNormalizedBankTxAmount(tx)));
}

/** Alla datum som finns på transaktionerna (rader utan datum hoppas över). */
export function collectTxDates(txs: BankTransactionItem[]): string[] {
  return txs.map(getTxDate).filter(Boolean);
}

/** Antal olika månader (ÅÅÅÅ-MM) bland datumen; tomma datum räknas inte. */
export function countDistinctMonths(dates: Array<string | null | undefined>): number {
  return new Set(dates.filter(Boolean).map((d) => String(d).slice(0, 7))).size;
}
