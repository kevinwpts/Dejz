/**
 * Dejz räknemotor – EN plats där "kvar till lön" och allt den bygger på räknas ut.
 *
 * Hem, Fasta och Analys ska använda de här funktionerna, så att samma siffra aldrig kan
 * visas olika på olika ställen. Funktionerna är rena (inga sidoeffekter, ingen lagring),
 * så de går att testa – se __tests__/budgetEngine.test.ts.
 *
 * Grundregler:
 * - En fast utgift/inkomst som dragits i perioden räknas med sitt RIKTIGA belopp,
 *   annars med det planerade (för rörliga räkningar = uppskattningen).
 * - En dragning som kopplats till en fast utgift räknas aldrig som ett vanligt köp.
 * - Delade räkningar: bara din andel räknas.
 */
import type { FixedExpenseItem, IncomeItem, TransactionItem } from '../app/models';
import type { PeriodInfo } from './periodEngine';
import { getDueDateInPeriod } from './periodEngine';
import { formatIsoDateStockholm } from './swedishDate';

/** Resultatet av reconcilePeriodRecurringMatches (recurring.ts) */
export interface PeriodMatches {
  claimedFixedTxIds: Set<string>;
  matchedFixedTxByExpId: Map<string, TransactionItem>;
  claimedIncomeTxIds: Set<string>;
  matchedIncomeTxByIncId: Map<string, TransactionItem>;
}

/** Transaktioner som ska hoppas över helt (manuellt borttagna, interna överföringar …) */
export type IgnoreTransaction = (t: TransactionItem) => boolean;

const abs = (n: unknown) => Math.abs(Number(n) || 0);
const isSwish = (t: TransactionItem) => t.category === 'Swish' || /swish/i.test(t.title || '');

// ---------------------------------------------------------------------------
// Fasta utgifter
// ---------------------------------------------------------------------------

/** Är en (eventuellt uppsagd) fast utgift fortfarande aktiv i perioden? */
export function isFixedExpenseActiveInPeriod(exp: FixedExpenseItem, period: PeriodInfo): boolean {
  if (!exp.isCancelled) return true;
  if (exp.hasNoMorePayments) return false;
  if (exp.lastPaymentDate && /^\d{4}-\d{2}$/.test(exp.lastPaymentDate)) {
    // endDate är ett Date-objekt (inte text) – gör om till "ÅÅÅÅ-MM" innan jämförelsen
    const end = period.endDate as unknown as Date | string | undefined;
    const periodEndYm =
      end instanceof Date && !isNaN(end.getTime())
        ? `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`
        : typeof end === 'string'
        ? end.slice(0, 7)
        : '';
    if (periodEndYm && periodEndYm > exp.lastPaymentDate) {
      return false;
    }
  }
  return true;
}

/** Din andel av en delad räkning (1 = hela beloppet är ditt) */
export function getFixedShareRatio(exp: FixedExpenseItem): number {
  return exp.isShared && exp.fullAmount && exp.fullAmount > 0 && exp.amount > 0
    ? exp.amount / exp.fullAmount
    : 1;
}

/** Vad en fast utgift kostar dig den här perioden: riktigt belopp om dragen, annars planerat. */
export function getFixedExpenseAmountInPeriod(
  exp: FixedExpenseItem,
  matchedTx: TransactionItem | undefined,
  period: PeriodInfo
): number {
  if (matchedTx) return Math.round(abs(matchedTx.amount) * getFixedShareRatio(exp));
  if (!isFixedExpenseActiveInPeriod(exp, period)) return 0;
  return Number(exp.amount) || 0;
}

export function computeTotalFixed(
  fixedExpenses: FixedExpenseItem[],
  matches: PeriodMatches,
  period: PeriodInfo
): number {
  return fixedExpenses.reduce(
    (sum, exp) =>
      sum + getFixedExpenseAmountInPeriod(exp, matches.matchedFixedTxByExpId.get(exp.id), period),
    0
  );
}

// ---------------------------------------------------------------------------
// Inkomster
// ---------------------------------------------------------------------------

/** Fasta inkomster (riktigt belopp om utbetald) + andra inkomster i perioden (inte Swish/returer). */
export function computeTotalIncome(params: {
  incomes: IncomeItem[];
  periodTransactions: TransactionItem[];
  matches: PeriodMatches;
  isIgnored: IgnoreTransaction;
}): number {
  const { incomes, periodTransactions, matches, isIgnored } = params;
  const fixedIncomesSum = incomes.reduce((sum, inc) => {
    const matchedTx = matches.matchedIncomeTxByIncId.get(inc.id);
    return sum + (matchedTx ? Math.round(abs(matchedTx.amount)) : Number(inc.amount) || 0);
  }, 0);

  let extra = 0;
  for (const t of periodTransactions) {
    if (t.type !== 'income' || t.isExcluded || isIgnored(t)) continue;
    if (typeof t.id === 'string' && t.id.startsWith('inc-')) continue;
    if (matches.claimedIncomeTxIds.has(t.id)) continue;
    if (t.category === 'Återbetalning' || isSwish(t)) continue;
    extra += Math.round(abs(t.amount));
  }
  return fixedIncomesSum + extra;
}

// ---------------------------------------------------------------------------
// Rörliga utgifter (vanliga köp)
// ---------------------------------------------------------------------------

/**
 * Köp i perioden, minus returer och Swish du fått tillbaka för utlägg.
 * Dragningar som kopplats till en fast utgift räknas INTE här (annars dubbelt).
 */
export function computeVariableSpent(params: {
  allTransactions: TransactionItem[];
  periodTransactions: TransactionItem[];
  matches: PeriodMatches;
  isIgnored: IgnoreTransaction;
}): number {
  const { allTransactions, periodTransactions, matches, isIgnored } = params;
  let grossSpent = 0;
  let storeRefunds = 0;
  let unlinkedSwishReimbursements = 0;
  let unlinkedManualSplitReductions = 0;

  const alreadyLinkedSwishIds = new Set<string>();
  for (const tx of [...allTransactions, ...periodTransactions]) {
    if (tx.linkedSwishTxId) alreadyLinkedSwishIds.add(tx.linkedSwishTxId);
  }

  for (const t of periodTransactions) {
    if (t.isExcluded || isIgnored(t)) continue;

    if (t.type === 'income') {
      if (t.category === 'Återbetalning') {
        storeRefunds += abs(t.amount);
      } else if (
        isSwish(t) &&
        !matches.claimedIncomeTxIds.has(t.id) &&
        !alreadyLinkedSwishIds.has(t.id)
      ) {
        unlinkedSwishReimbursements += abs(t.amount);
      }
      continue;
    }

    if (matches.claimedFixedTxIds.has(t.id)) continue;

    if (
      !t.linkedSwishTxId &&
      typeof t.originalAmount === 'number' &&
      t.originalAmount > (Number(t.amount) || 0)
    ) {
      unlinkedManualSplitReductions += Math.max(0, t.originalAmount - (Number(t.amount) || 0));
    }

    grossSpent += Number(t.amount) || 0;
  }

  const effectiveSwishDeduction = Math.max(0, unlinkedSwishReimbursements - unlinkedManualSplitReductions);
  return Math.max(0, grossSpent - storeRefunds - effectiveSwishDeduction);
}

// ---------------------------------------------------------------------------
// Kvar till lön
// ---------------------------------------------------------------------------

/**
 * Utan bank, när man skrivit in sitt saldo:
 * kvar = saldo − räkningar som dras efter att saldot skrevs in + inkomster före lön − köp sedan dess.
 */
export function computeKvarFromBalance(params: {
  balance: { amount: number; at: string | number };
  fixedExpenses: FixedExpenseItem[];
  incomes: IncomeItem[];
  period: PeriodInfo;
  targetPayday: number;
  periodTransactions: TransactionItem[];
  matches: PeriodMatches;
  isIgnored: IgnoreTransaction;
}): number {
  const { balance, fixedExpenses, incomes, period, targetPayday, periodTransactions, matches, isIgnored } =
    params;
  const atMs = new Date(balance.at).getTime();
  const atDay = formatIsoDateStockholm(new Date(atMs));
  const dayOf = (d: Date) => formatIsoDateStockholm(d);

  let upcomingFixed = 0;
  for (const exp of fixedExpenses) {
    if (!isFixedExpenseActiveInPeriod(exp, period)) continue;
    const due = getDueDateInPeriod(exp.dueDay || 27, period);
    if (dayOf(due) <= atDay) continue;
    const paid = matches.matchedFixedTxByExpId.get(exp.id);
    if (paid && (paid.date || '') <= atDay) continue;
    upcomingFixed += Number(exp.amount) || 0;
  }

  let upcomingIncome = 0;
  for (const inc of incomes) {
    const payDate = getDueDateInPeriod(inc.payday || targetPayday || 25, period);
    if (dayOf(payDate) <= atDay) continue;
    upcomingIncome += Number(inc.amount) || 0;
  }

  // Köp som lagts in efter saldot (manuella köp har id "tx-<tidpunkt>")
  let spentSince = 0;
  for (const t of periodTransactions) {
    if (t.isExcluded || isIgnored(t)) continue;
    if (matches.claimedFixedTxIds.has(t.id)) continue;
    const idMs = /^tx-(\d{12,})$/.exec(String(t.id))?.[1];
    const isAfter = idMs ? Number(idMs) > atMs : (t.date || '') > atDay;
    if (!isAfter) continue;
    if (t.type === 'income') {
      if (typeof t.id === 'string' && t.id.startsWith('inc-')) continue;
      spentSince -= abs(t.amount);
    } else {
      spentSince += abs(t.amount);
    }
  }

  return Math.round(balance.amount - upcomingFixed + upcomingIncome - spentSince);
}

/** Kvar att spendera i perioden (kan bli negativt om man gått över). */
export function computeKvar(params: {
  kvarFromBalance: number | null;
  totalIncome: number;
  totalFixed: number;
  totalVariableSpent: number;
}): number {
  if (params.kvarFromBalance !== null) return params.kvarFromBalance;
  return params.totalIncome - params.totalFixed - params.totalVariableSpent;
}

export function computeDagsbudget(kvar: number, daysRemaining: number): number {
  if (daysRemaining <= 0 || kvar <= 0) return 0;
  return Math.round(kvar / daysRemaining);
}
