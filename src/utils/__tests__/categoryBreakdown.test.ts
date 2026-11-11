import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCategoryBreakdown, incomeLabelFor } from '../categoryBreakdown';
import type { TransactionItem, IncomeItem, FixedExpenseItem } from '../../app/models';

const tx = (id: string, category: string, amount: number) =>
  ({ id, title: id, category, amount, date: '2026-11-05' }) as TransactionItem;
const income = (id: string, category: string, amount: number) =>
  ({ id, name: id, category, amount, payday: 25 }) as IncomeItem;
const fixed = (id: string, category: string, amount: number) =>
  ({ id, name: id, category, amount, dueDay: 27 }) as FixedExpenseItem;

const build = (p: Partial<Parameters<typeof buildCategoryBreakdown>[0]>) =>
  buildCategoryBreakdown({
    variableTransactions: [],
    periodFixedList: [],
    reimbursementTransactions: [],
    unlinkedManualSplitReductions: 0,
    periodIncomesList: [],
    ...p,
  });

test('inkomst och utgift i "Övrigt" blandas aldrig ihop (19 000 in + 9 000 ut ≠ +28 000)', () => {
  const rows = build({
    variableTransactions: [tx('a', 'Övrigt', 5000), tx('b', 'Övrigt', 4000)],
    periodIncomesList: [income('Överföring', 'Övrigt', 19000)],
  });
  const expense = rows.find((r) => !r.isIncomeCategory && r.category === 'Övrigt');
  const inc = rows.find((r) => r.isIncomeCategory && r.category === 'Övrigt');
  assert.equal(expense?.amount, 9000);
  assert.equal(expense?.items.length, 2);
  assert.equal(inc?.amount, 19000);
  assert.equal(inc?.items.length, 1);
  assert.equal(inc?.label, 'Övriga inkomster');
  assert.notEqual(expense?.key, inc?.key);
});

test('utgifter först (störst först), sedan inkomster', () => {
  const rows = build({
    variableTransactions: [tx('mat', 'Mat & dryck', 3000), tx('noje', 'Nöje', 800)],
    periodFixedList: [fixed('hyra', 'Boende', 8500)],
    periodIncomesList: [income('lon', 'Lön', 28500)],
  });
  assert.deepEqual(
    rows.map((r) => r.label),
    ['Boende', 'Mat & dryck', 'Nöje', 'Lön']
  );
});

test('en inkomstkategori utan krock behåller sitt namn', () => {
  assert.equal(incomeLabelFor('Lön', false), 'Lön');
  assert.equal(incomeLabelFor('Swish', true), 'Swish (inkomst)');
});

test('Swish-utlägg tillbaka minskar Swish-kategorin, inte inkomsterna', () => {
  const rows = build({
    variableTransactions: [tx('middag', 'Swish', 600)],
    reimbursementTransactions: [tx('tillbaka', 'Swish', 300)],
  });
  assert.equal(rows.find((r) => r.category === 'Swish')?.amount, 300);
  assert.equal(rows.some((r) => r.isIncomeCategory), false);
});
