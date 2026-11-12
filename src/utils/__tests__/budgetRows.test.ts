import { test } from 'vitest';
import assert from 'node:assert/strict';
import { Frequency } from '../../types';
import {
  fixedExpenseFromRow,
  fixedExpenseToRow,
  incomeFromRow,
  incomeToRow,
  type FixedExpenseInput,
} from '../../services/budgetRows';

const UID = '11111111-1111-4111-8111-111111111111';
const EXP_ID = '22222222-2222-4222-8222-222222222222';

const netflix: FixedExpenseInput = {
  id: EXP_ID,
  name: 'Netflix',
  amount: 149,
  category: 'Nöje',
  paymentMethod: 'card',
  frequency: Frequency.MONTHLY,
  deductionDay: 15,
};

/** Det som databasen skulle skicka tillbaka efter en sparning. */
const saved = (exp: FixedExpenseInput) => ({ ...fixedExpenseToRow(UID, exp), id: EXP_ID }) as never;

test('fast utgift: spara → läs ger samma sak', () => {
  const back = fixedExpenseFromRow(saved({ ...netflix, originalName: 'NETFLIX.COM', isShared: true, fullAmount: 298, startMonth: 0 }));
  assert.equal(back.name, 'Netflix');
  assert.equal(back.amount, 149);
  assert.equal(back.deductionDay, 15);
  assert.equal(back.originalName, 'NETFLIX.COM');
  assert.equal(back.isShared, true);
  assert.equal(back.fullAmount, 298);
  assert.equal(back.startMonth, 0);
  assert.equal(back.isCancelled, false);
});

test('uppsägning sparas och läses tillbaka', () => {
  const back = fixedExpenseFromRow(
    saved({ ...netflix, isCancelled: true, cancellationDate: '2026-12-15', cancellationScenario: 'one_remaining' })
  );
  assert.equal(back.isCancelled, true);
  assert.equal(back.cancellationDate, '2026-12-15');
  assert.equal(back.cancellationScenario, 'one_remaining');
});

test('"Ångra uppsägning" håller även efter omladdning', () => {
  // Databasraden är uppsagd sedan tidigare …
  const cancelledRow = { ...fixedExpenseToRow(UID, { ...netflix, isCancelled: true, cancellationDate: '2026-12-15' }), id: EXP_ID };
  // … användaren ångrar, och den nya raden skrivs över den gamla (upsert)
  const undoPayload = fixedExpenseToRow(UID, { ...netflix, isCancelled: false });
  const afterReload = fixedExpenseFromRow({ ...cancelledRow, ...undoPayload, id: EXP_ID } as never);
  assert.equal(afterReload.isCancelled, false);
  assert.equal(afterReload.cancellationDate, undefined);
});

test('gamla uppsägningsuppgifter i period_overrides följer inte med när den sparas igen', () => {
  const row = fixedExpenseToRow(UID, {
    ...netflix,
    periodOverrides: { '2026-11': 129, _is_cancelled: 1 as never, _receipt_url: 'x' as never },
  });
  assert.deepEqual(row.period_overrides, { '2026-11': 129 });
});

test('id som inte är uuid skickas inte (databasen skapar ett nytt)', () => {
  assert.equal(fixedExpenseToRow(UID, { ...netflix, id: 'tmp-123' }).id, undefined);
  assert.equal(fixedExpenseToRow(UID, netflix).id, EXP_ID);
});

test('tom anteckning sparas inte, belopp som text blir tal', () => {
  assert.equal('note' in fixedExpenseToRow(UID, { ...netflix, note: '   ' }), false);
  const back = fixedExpenseFromRow({ id: EXP_ID, name: 'Hyra', amount: '8500.00' } as never);
  assert.equal(back.amount, 8500);
  assert.deepEqual(back.periodOverrides, {});
});

test('inkomst: spara → läs ger samma sak', () => {
  const row = incomeToRow(UID, {
    id: EXP_ID,
    name: 'Lön',
    amount: 28500,
    deductionDay: 25,
    originalName: 'LÖN ACME AB',
    note: '  netto ',
  });
  assert.equal(row.note, 'netto');
  const back = incomeFromRow({ ...row, id: EXP_ID } as never);
  assert.equal(back.amount, 28500);
  assert.equal(back.deductionDay, 25);
  assert.equal(back.originalName, 'LÖN ACME AB');
});
