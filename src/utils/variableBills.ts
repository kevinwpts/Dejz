import type { FixedExpenseItem, TransactionItem } from '../app/models';
import { findAllMatchingFixedExpensesByMerchant } from './recurring/matching';

/**
 * Räkningar som varierar (el, telefon …): uppskatta nästa belopp från de senaste dragningarna.
 *
 * Hur dubbelräkning undviks (se reconcilePeriodRecurringMatches i recurring/periodReconcile.ts):
 * - Innan dragningen reserveras uppskattningen (fasta utgiftens belopp).
 * - När dragningen kommer kopplas den till den fasta utgiften på NAMNET – oavsett belopp –
 *   och det riktiga beloppet används. Dragningen räknas då inte som ett vanligt köp.
 * Den här filen ser bara till att uppskattningen följer verkligheten (t.ex. högre el på vintern).
 */

const VARIATION_THRESHOLD = 0.05; // mer än 5 % skillnad mellan dragningarna = rörlig räkning
const SAMPLE_SIZE = 3; // snittet av de senaste 3 dragningarna

export interface VariableBillEstimate {
  /** Avrundat snitt av de senaste dragningarna */
  estimate: number;
  /** Beloppen som snittet bygger på, nyast först */
  samples: number[];
}

function txAmount(tx: TransactionItem): number {
  return Math.round(Math.abs(Number(tx.amount) || 0));
}

/** Tidigare dragningar för en fast utgift, nyast först. En per månad (den största om flera). */
export function getBillHistory(
  exp: FixedExpenseItem,
  transactions: TransactionItem[],
  beforeDateIso?: string
): TransactionItem[] {
  const byMonth = new Map<string, TransactionItem>();
  for (const tx of transactions) {
    if (!tx || tx.isExcluded || tx.type === 'income') continue;
    if (!tx.date || (beforeDateIso && tx.date >= beforeDateIso)) continue;
    if (txAmount(tx) <= 0) continue;
    const isLinked = tx.linkedFixedExpenseId === exp.id;
    if (!isLinked) {
      if (tx.linkedFixedExpenseId) continue; // kopplad till en annan fast utgift
      const matches = findAllMatchingFixedExpensesByMerchant(tx, [exp]);
      if (!matches.some((m) => m.id === exp.id)) continue;
    }
    const month = tx.date.slice(0, 7);
    const prev = byMonth.get(month);
    if (!prev || txAmount(tx) > txAmount(prev)) byMonth.set(month, tx);
  }
  return Array.from(byMonth.values()).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Snittet av en lista belopp om de varierar, annars null (fasta belopp lämnas orörda). */
export function estimateFromAmounts(amounts: number[]): VariableBillEstimate | null {
  const samples = amounts.filter((a) => a > 0).slice(0, SAMPLE_SIZE);
  if (samples.length < 2) return null;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  if ((max - min) / (min || 1) <= VARIATION_THRESHOLD) return null;
  const estimate = Math.round(samples.reduce((s, a) => s + a, 0) / samples.length);
  return { estimate, samples };
}

/**
 * Uppskattning för en fast utgift utifrån dragningar FÖRE nuvarande löneperiod.
 * Returnerar null för räkningar med samma belopp varje gång, delade utgifter och för lite historik.
 */
export function estimateVariableBill(
  exp: FixedExpenseItem,
  transactions: TransactionItem[],
  periodStartIso: string
): VariableBillEstimate | null {
  if (exp.isShared || exp.isCancelled) return null;
  const history = getBillHistory(exp, transactions, periodStartIso);
  return estimateFromAmounts(history.map(txAmount));
}
