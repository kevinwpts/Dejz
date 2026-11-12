// Kopplar periodens transaktioner 1-till-1 mot fasta utgifter och fasta inkomster.
import type { TransactionItem, FixedExpenseItem, IncomeItem } from '../../app/models';
import { foldForMatching, isHybridSubscriptionAndOneOffMerchant } from './text';
import {
  findAllMatchingFixedExpensesByMerchant,
  findMatchingFixedExpense,
  findMatchingIncome,
  getFixedExpenseAmountDistance,
  isFixedExpenseAmountMatch,
} from './matching';
import { checkIsRecurringTransaction } from './checkRecurring';
import { getGenericBillProviders } from './billProviders';

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
      if (tx.linkedFixedExpenseId && tx.linkedFixedExpenseId !== exp.id) continue;
      const isExplicitlyLinked = tx.linkedFixedExpenseId === exp.id;
      const candidatesForTx = findAllMatchingFixedExpensesByMerchant(tx, [exp]);
      const fallbackMatch =
        candidatesForTx.length === 0 ? findMatchingFixedExpense(tx, [exp]) : candidatesForTx[0];
      if (!isExplicitlyLinked && (!fallbackMatch || fallbackMatch.id !== exp.id)) continue;

      const txAmt = Math.round(Math.abs(Number(tx.amount) || 0));
      const exactAmtMatch = isFixedExpenseAmountMatch(exp, txAmt);
      if (!isExplicitlyLinked && !exactAmtMatch && isHybridSubscriptionAndOneOffMerchant(tx)) {
        continue;
      }

      const amtDist = isExplicitlyLinked ? -1 : getFixedExpenseAmountDistance(exp, txAmt);
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

  // 1b. Räkningar med allmänna namn ("El", "Hyra", "Telefon" …) – vanligt när man fyllt i själv.
  // Banken skriver bolagets namn (Öresundskraft, Heimstaden, Telia …), så namnen matchar aldrig och
  // dragningen skulle annars räknas dubbelt: både som fast utgift och som vanligt köp.
  for (const exp of fixedExpenses) {
    if (matchedFixedTxByExpId.has(exp.id)) continue;
    const providers = getGenericBillProviders(exp.name);
    if (!providers) continue;
    const dueDay = Number(exp.dueDay) || 27;
    let best: { tx: TransactionItem; dayDist: number } | null = null;
    for (const tx of expenseTxs) {
      if (claimedFixedTxIds.has(tx.id)) continue;
      if (tx.linkedFixedExpenseId && tx.linkedFixedExpenseId !== exp.id) continue;
      const text = foldForMatching(
        [tx.title, tx.rawDescription, tx.counterpartyName].filter(Boolean).join(' ')
      );
      if (!providers.some((p) => p.test(text))) continue;
      const txDay = parseInt((tx.date || '').slice(8, 10), 10) || 27;
      const rawDayDiff = Math.abs(txDay - dueDay);
      const dayDist = Math.min(rawDayDiff, 31 - rawDayDiff);
      if (!best || dayDist < best.dayDist) best = { tx, dayDist };
    }
    if (best) {
      matchedFixedTxByExpId.set(exp.id, best.tx);
      matchedFixedIds.add(exp.id);
      claimedFixedTxIds.add(best.tx.id);
    }
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
