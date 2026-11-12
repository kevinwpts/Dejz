import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  computeDagsbudget,
  computeKvar,
  computeKvarFromBalance,
  computeTotalFixed,
  computeTotalIncome,
  computeVariableSpent,
  getFixedExpenseAmountInPeriod,
  PeriodMatches,
} from '../budgetEngine';
import { reconcilePeriodRecurringMatches } from '../recurring';
import type { FixedExpenseItem, IncomeItem, TransactionItem } from '../../components/HomeTab';
import type { PeriodInfo } from '../periodEngine';

// Löneperiod 25 nov – 24 dec
const period = {
  startDate: new Date('2026-11-25T00:00:00'),
  endDate: new Date('2026-12-24T23:59:59'),
  nextPaydayDate: new Date('2026-12-25T00:00:00'),
  daysRemaining: 20,
} as unknown as PeriodInfo;

const none = () => false;
const fixed = (id: string, name: string, amount: number, dueDay: number, extra: Partial<FixedExpenseItem> = {}) =>
  ({ id, name, amount, dueDay, category: 'Räkningar', paymentMethod: 'Autogiro', ...extra }) as FixedExpenseItem;
const tx = (id: string, title: string, amount: number, date: string, extra: Partial<TransactionItem> = {}) =>
  ({ id, title, amount, date, category: 'Mat', type: 'expense', ...extra }) as TransactionItem;

const lon: IncomeItem = { id: 'inc-lon', name: 'Lön', amount: 28000, payday: 25, category: 'Lön' } as IncomeItem;
const hyra = fixed('fx-hyra', 'Heimstaden', 7000, 28);
const el = fixed('fx-el', 'Öresundskraft', 900, 28);
const netflix = fixed('fx-netflix', 'Netflix', 149, 3);

function matchesFor(txs: TransactionItem[], fx: FixedExpenseItem[], inc: IncomeItem[] = [lon]): PeriodMatches {
  return reconcilePeriodRecurringMatches(txs, fx, inc);
}

test('hela kedjan: kvar = inkomst − fasta (riktigt belopp om dragen) − köp', () => {
  const txs = [
    tx('t-lon', 'Lön Arbetsgivare AB', 28400, '2026-11-25', { type: 'income', category: 'Lön' }),
    tx('t-hyra', 'HEIMSTADEN AB', 7000, '2026-11-28'),
    tx('t-el', 'ÖRESUNDSKRAFT AB', 1240, '2026-11-28'), // dyrare än uppskattat
    tx('t-ica', 'ICA Maxi', 650, '2026-11-29'),
    tx('t-retur', 'Retur H&M', 200, '2026-11-30', { type: 'income', category: 'Återbetalning' }),
  ];
  const fx = [hyra, el, netflix];
  const m = matchesFor(txs, fx);
  const income = computeTotalIncome({ incomes: [lon], periodTransactions: txs, matches: m, isIgnored: none });
  const totalFixed = computeTotalFixed(fx, m, period);
  const variable = computeVariableSpent({ allTransactions: txs, periodTransactions: txs, matches: m, isIgnored: none });

  assert.equal(income, 28400, 'lönen räknas med riktigt belopp');
  assert.equal(totalFixed, 7000 + 1240 + 149, 'el med riktigt belopp, Netflix (ej dragen) med planerat');
  assert.equal(variable, 650 - 200, 'bara ICA minus returen – hyra och el räknas inte som köp');
  assert.equal(
    computeKvar({ kvarFromBalance: null, totalIncome: income, totalFixed, totalVariableSpent: variable }),
    28400 - 8389 - 450
  );
});

test('delad räkning: bara din andel räknas, även när den dragits', () => {
  const shared = fixed('fx-shared', 'Heimstaden', 4000, 28, { isShared: true, fullAmount: 8000 });
  const m = matchesFor([tx('t1', 'HEIMSTADEN AB', 8000, '2026-11-28')], [shared]);
  assert.equal(getFixedExpenseAmountInPeriod(shared, m.matchedFixedTxByExpId.get('fx-shared'), period), 4000);
});

test('uppsagt abonnemang som slutat räknas inte', () => {
  const ended = fixed('fx-old', 'Viaplay', 449, 10, { isCancelled: true, hasNoMorePayments: true });
  assert.equal(getFixedExpenseAmountInPeriod(ended, undefined, period), 0);
});

test('uppsagt men med sista dragning efter perioden räknas fortfarande', () => {
  const lastInJan = fixed('fx-x', 'Viaplay', 449, 10, { isCancelled: true, lastPaymentDate: '2027-01' });
  assert.equal(getFixedExpenseAmountInPeriod(lastInJan, undefined, period), 449);
});

test('Swish-utlägg man fått tillbaka minskar köpen, men inte om det är kopplat', () => {
  const txs = [
    tx('t-rest', 'Restaurang', 1000, '2026-11-26'),
    tx('t-swish', 'Swish från Anna', 500, '2026-11-26', { type: 'income', category: 'Swish' }),
  ];
  const m = matchesFor(txs, []);
  assert.equal(computeVariableSpent({ allTransactions: txs, periodTransactions: txs, matches: m, isIgnored: none }), 500);
});

test('överföringar mellan egna konton och borttagna köp räknas inte', () => {
  const txs = [tx('t1', 'ICA', 300, '2026-11-26'), tx('t2', 'Överföring sparkonto', 5000, '2026-11-26')];
  const m = matchesFor(txs, []);
  const isIgnored = (t: TransactionItem) => t.id === 't2';
  assert.equal(computeVariableSpent({ allTransactions: txs, periodTransactions: txs, matches: m, isIgnored }), 300);
});

test('köpen kan aldrig bli negativa av returer', () => {
  const txs = [tx('t1', 'Retur', 900, '2026-11-26', { type: 'income', category: 'Återbetalning' })];
  const m = matchesFor(txs, []);
  assert.equal(computeVariableSpent({ allTransactions: txs, periodTransactions: txs, matches: m, isIgnored: none }), 0);
});

test('utan bank: kvar från saldo drar bara räkningar som kommer efter att saldot skrevs in', () => {
  // Saldo inskrivet 1 dec: hyran (28 nov) har redan gått, Netflix (3 dec) och el (28 dec, utanför) …
  const fx = [hyra, netflix, fixed('fx-gym', 'SATS', 500, 15)];
  const txs = [tx(`tx-${new Date('2026-12-02T10:00:00').getTime()}`, 'ICA', 200, '2026-12-02')]; // manuellt köp efter saldot
  const kvar = computeKvarFromBalance({
    balance: { amount: 10000, at: '2026-12-01T12:00:00' },
    fixedExpenses: fx,
    incomes: [lon],
    period,
    targetPayday: 25,
    periodTransactions: txs,
    matches: matchesFor(txs, fx),
    isIgnored: none,
  });
  assert.equal(kvar, 10000 - 149 - 500 - 200);
});

test('dagsbudget: kvar delat på dagar kvar, aldrig negativ', () => {
  assert.equal(computeDagsbudget(2000, 20), 100);
  assert.equal(computeDagsbudget(-500, 20), 0);
  assert.equal(computeDagsbudget(2000, 0), 0);
});
