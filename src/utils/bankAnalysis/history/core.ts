// Kärnan i historikanalysen – används både i introduktionen och vid synk från Inställningar.
import { BankAccount, BankTransactionItem } from '../../../services/bankService';
import { PaydayType, WeekendAdjustment } from '../../../types';
import { getPeriodBoundaries } from '../../date';
import { formatIsoDateStockholm } from '../../swedishDate';
import { DetectedFixedExpenseWithEvidence, DetectedIncomeWithEvidence } from '../types';
import { findRawBankInternalTransferIds, getNormalizedBankTxAmount } from '../normalization';
import { getTxDate, isPendingBookingStatus } from '../txFields';
import { DetectedFixedWithTxIds } from './shared';
import { detectRuleBasedFixedExpenses } from './ruleBasedFixed';
import { detectRecurringMerchantExpenses } from './recurringMerchants';
import { detectIncomes } from './incomes';

/** Resultatet av kärnanalysen. */
export interface CoreBankDetectionResult {
  outflows: BankTransactionItem[];
  inflows: BankTransactionItem[];
  internalTransferIds: Set<string>;
  fixedTransactionIds: Set<string>;
  detectedFixedExpenses: DetectedFixedExpenseWithEvidence[];
  detectedIncomes: DetectedIncomeWithEvidence[];
  suggestedPayday: number | null;
  periodStartIso: string;
}

/** Tar bort samma transaktion som kommit flera gånger (t.ex. samma konto via två bankkopplingar). */
function dedupeSameDayTransactions(transactions: BankTransactionItem[]): BankTransactionItem[] {
  const seen = new Set<string>();
  return transactions.filter((t) => {
    const amtCents = Math.round(getNormalizedBankTxAmount(t) * 100);
    const descKey = String(t.description || t.counterparty_name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    const sig = `${getTxDate(t)}|${amtCents}|${descKey}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

/** Bara bokförda transaktioner (reservationer bevisar inga avtal), utan dubbletter, nyast först. */
function prepareBookedTransactions(transactions: BankTransactionItem[]): BankTransactionItem[] {
  const booked = transactions.filter((t) => !isPendingBookingStatus(t.booking_status));
  return dedupeSameDayTransactions(booked).sort((a, b) => getTxDate(b).localeCompare(getTxDate(a)));
}

/** Delar upp i pengar ut och pengar in (bara kronor, utan egna överföringar). */
function splitSekFlows(
  sorted: BankTransactionItem[],
  internalTransferIds: Set<string>
): { outflows: BankTransactionItem[]; inflows: BankTransactionItem[] } {
  const isCountable = (t: BankTransactionItem) =>
    !internalTransferIds.has(t.id) && (t.currency || 'SEK') === 'SEK';
  return {
    outflows: sorted.filter((t) => isCountable(t) && getNormalizedBankTxAmount(t) < 0),
    inflows: sorted.filter((t) => isCountable(t) && getNormalizedBankTxAmount(t) > 0),
  };
}

/** Första dagen (ÅÅÅÅ-MM-DD) i nuvarande löneperiod. */
function computePeriodStartIso(payday: number, paydayBeforeWeekend: boolean): string {
  const paydayType =
    payday === 25 ? PaydayType.TWENTY_FIFTH : payday === 1 ? PaydayType.FIRST_DAY : PaydayType.CUSTOM;
  const adjustment = paydayBeforeWeekend ? WeekendAdjustment.BEFORE : WeekendAdjustment.NONE;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { start } = getPeriodBoundaries(today, paydayType, payday, adjustment);
  // Svenskt datum – toISOString() ger UTC, där svensk midnatt fortfarande är dagen före
  return formatIsoDateStockholm(start);
}

/**
 * Analyserar bankhistoriken: fasta utgifter (kända regler + återkommande mottagare),
 * inkomster, föreslagen lönedag och när nuvarande löneperiod började.
 */
export function runCoreBankDetection(
  transactions: BankTransactionItem[],
  currentPayday = 25,
  paydayBeforeWeekend = true,
  userAccounts: BankAccount[] = []
): CoreBankDetectionResult {
  const sorted = prepareBookedTransactions(transactions);
  const internalTransferIds = findRawBankInternalTransferIds(sorted, userAccounts);
  const { outflows, inflows } = splitSekFlows(sorted, internalTransferIds);

  const detectedFixedMap = new Map<string, DetectedFixedWithTxIds>();
  const fixedTransactionIds = new Set<string>();
  detectRuleBasedFixedExpenses(outflows, detectedFixedMap, fixedTransactionIds);
  detectRecurringMerchantExpenses(outflows, detectedFixedMap, fixedTransactionIds);

  const { detectedIncomes, suggestedPayday } = detectIncomes(inflows, userAccounts);
  const periodStartIso = computePeriodStartIso(
    suggestedPayday || currentPayday || 25,
    paydayBeforeWeekend
  );

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
