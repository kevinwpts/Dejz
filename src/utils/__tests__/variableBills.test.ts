import { test } from 'vitest';
import assert from 'node:assert/strict';
import { reconcilePeriodRecurringMatches } from '../recurring';
import { estimateFromAmounts, estimateVariableBill, getBillHistory } from '../variableBills';
import type { FixedExpenseItem, TransactionItem } from '../../components/HomeTab';

// Regressionstester: en räkning som varierar (el) får aldrig räknas dubbelt.

const el: FixedExpenseItem = {
  id: 'fx-el',
  name: 'Öresundskraft',
  amount: 850,
  dueDay: 28,
  category: 'Boende',
  paymentMethod: 'Autogiro',
};
const hyra: FixedExpenseItem = {
  id: 'fx-hyra',
  name: 'Hyra Heimstaden',
  amount: 7200,
  dueDay: 28,
  category: 'Boende',
  paymentMethod: 'Autogiro',
};

const tx = (id: string, title: string, amount: number, date: string): TransactionItem => ({
  id,
  title,
  amount,
  date,
  category: 'Boende',
  type: 'expense',
});

test('el som är 60 % dyrare än uppskattat kopplas ändå till räkningen', () => {
  const txs = [tx('t1', 'ÖRESUNDSKRAFT AB', 1360, '2026-11-28'), tx('t2', 'ICA Maxi', 420, '2026-11-28')];
  const res = reconcilePeriodRecurringMatches(txs, [el, hyra], []);
  assert.equal(res.matchedFixedTxByExpId.get('fx-el')?.id, 't1');
  assert.ok(res.claimedFixedTxIds.has('t1'), 'eldragningen ska inte räknas som vanligt köp');
  assert.ok(!res.claimedFixedTxIds.has('t2'), 'ICA är ett vanligt köp');
});

test('el som är mycket billigare än uppskattat kopplas ändå till räkningen', () => {
  const res = reconcilePeriodRecurringMatches([tx('t1', 'Öresundskraft', 310, '2026-11-27')], [el], []);
  assert.equal(res.matchedFixedTxByExpId.get('fx-el')?.id, 't1');
});

test('en dragning kan bara fylla en fast utgift en gång', () => {
  const txs = [
    tx('t1', 'ÖRESUNDSKRAFT AB', 900, '2026-11-28'),
    tx('t2', 'ÖRESUNDSKRAFT AB', 120, '2026-12-05'),
  ];
  const res = reconcilePeriodRecurringMatches(txs, [el], []);
  const claimed = [...res.claimedFixedTxIds];
  assert.equal(res.matchedFixedIds.size, 1);
  assert.equal(claimed.length, 1, 'bara en dragning kopplas – den andra är riktiga pengar som gått ut');
});

test('en sen dragning (långt från förfallodagen) kopplas ändå', () => {
  const res = reconcilePeriodRecurringMatches([tx('t1', 'ÖRESUNDSKRAFT AB', 980, '2026-12-09')], [el], []);
  assert.equal(res.matchedFixedTxByExpId.get('fx-el')?.id, 't1');
});

test('en dragning som kopplats manuellt till en annan räkning tas inte av elen', () => {
  const linked = { ...tx('t1', 'ÖRESUNDSKRAFT AB', 980, '2026-11-28'), linkedFixedExpenseId: 'fx-hyra' };
  const res = reconcilePeriodRecurringMatches([linked], [el, hyra], []);
  assert.equal(res.matchedFixedTxByExpId.get('fx-hyra')?.id, 't1');
  assert.ok(!res.matchedFixedTxByExpId.has('fx-el'));
});

test('uppskattning: snittet av de 3 senaste dragningarna när beloppet varierar', () => {
  const history = [
    tx('a', 'ÖRESUNDSKRAFT AB', 700, '2026-08-28'),
    tx('b', 'ÖRESUNDSKRAFT AB', 800, '2026-09-28'),
    tx('c', 'ÖRESUNDSKRAFT AB', 1000, '2026-10-28'),
    tx('d', 'ÖRESUNDSKRAFT AB', 1200, '2026-11-28'),
  ];
  const est = estimateVariableBill(el, history, '2026-12-25');
  assert.deepEqual(est, { estimate: 1000, samples: [1200, 1000, 800] });
});

test('uppskattning: dragningar i nuvarande period räknas inte med', () => {
  const history = [
    tx('a', 'ÖRESUNDSKRAFT AB', 700, '2026-09-28'),
    tx('b', 'ÖRESUNDSKRAFT AB', 900, '2026-10-28'),
    tx('c', 'ÖRESUNDSKRAFT AB', 5000, '2026-11-28'),
  ];
  assert.equal(estimateVariableBill(el, history, '2026-11-25')?.estimate, 800);
});

test('uppskattning: samma belopp varje gång lämnas orört', () => {
  assert.equal(estimateFromAmounts([7200, 7200, 7200]), null);
  assert.equal(estimateFromAmounts([139, 139]), null);
});

test('uppskattning: för lite historik ger ingen ändring', () => {
  assert.equal(estimateFromAmounts([900]), null);
});

test('uppskattning: delade räkningar ändras inte automatiskt', () => {
  const shared = { ...el, isShared: true, fullAmount: 1700 };
  const history = [tx('a', 'ÖRESUNDSKRAFT AB', 700, '2026-09-28'), tx('b', 'ÖRESUNDSKRAFT AB', 1100, '2026-10-28')];
  assert.equal(estimateVariableBill(shared, history, '2026-11-25'), null);
});

test('historik: två dragningar samma månad räknas som en (den största)', () => {
  const history = [
    tx('a', 'ÖRESUNDSKRAFT AB', 120, '2026-10-02'),
    tx('b', 'ÖRESUNDSKRAFT AB', 900, '2026-10-28'),
    tx('c', 'ICA Maxi', 300, '2026-10-28'),
  ];
  assert.deepEqual(
    getBillHistory(el, history).map((t) => t.id),
    ['b']
  );
});

// Räkningar med allmänna namn (när man fyllt i själv) och bankens stavning utan å/ä/ö

const named = (name: string, dueDay = 28): FixedExpenseItem => ({
  id: `fx-${name}`,
  name,
  amount: 850,
  dueDay,
  category: 'Räkningar',
  paymentMethod: 'Autogiro',
});

for (const [name, bankText] of [
  ['El', 'ÖRESUNDSKRAFT AB'],
  ['Elräkning', 'Vattenfall Försäljning'],
  ['Ström', 'TIBBER AB'],
  ['Hyra', 'HEIMSTADEN AB'],
  ['Telefon', 'Telia Sverige AB'],
  ['Mobil', 'TELE2 SVERIGE'],
  ['Internet', 'Bahnhof AB'],
  ['Öresundskraft', 'ORESUNDSKRAFT'],
]) {
  test(`"${name}" kopplas till "${bankText}" och räknas inte dubbelt`, () => {
    const exp = named(name);
    const res = reconcilePeriodRecurringMatches([tx('t1', bankText, 1240, '2026-11-27')], [exp], []);
    assert.equal(res.matchedFixedTxByExpId.get(exp.id)?.id, 't1');
    assert.ok(res.claimedFixedTxIds.has('t1'));
  });
}

test('"El" tar inte ett vanligt köp som råkar innehålla bokstäverna el', () => {
  const exp = named('El');
  const txs = [tx('t1', 'Elgiganten', 3990, '2026-11-27'), tx('t2', 'Hotel Belle', 1200, '2026-11-28')];
  const res = reconcilePeriodRecurringMatches(txs, [exp], []);
  assert.equal(res.matchedFixedIds.size, 0);
});

test('"Telefon" och "Internet" hos samma bolag tar varsin dragning', () => {
  const phone = named('Telefon', 15);
  const net = named('Internet', 28);
  const txs = [tx('t1', 'Telia Sverige AB', 299, '2026-11-15'), tx('t2', 'Telia Sverige AB', 449, '2026-11-28')];
  const res = reconcilePeriodRecurringMatches(txs, [phone, net], []);
  assert.equal(res.matchedFixedTxByExpId.get(phone.id)?.id, 't1');
  assert.equal(res.matchedFixedTxByExpId.get(net.id)?.id, 't2');
});

test('en räkning med riktigt namn tas inte av en med allmänt namn', () => {
  const real = { ...named('Öresundskraft'), id: 'fx-real' };
  const generic = named('El');
  const res = reconcilePeriodRecurringMatches([tx('t1', 'ÖRESUNDSKRAFT AB', 900, '2026-11-28')], [generic, real], []);
  assert.equal(res.matchedFixedTxByExpId.get('fx-real')?.id, 't1');
  assert.ok(!res.matchedFixedTxByExpId.has(generic.id));
});
