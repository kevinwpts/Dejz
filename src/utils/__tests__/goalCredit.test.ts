import test from 'node:test';
import assert from 'node:assert/strict';
import { creditGoalsFromBankMatches, creditGoalsWithoutBank } from '../goalCredit';

// Månadssparande till sparmål: fylls på när det dragits – aldrig två gånger.

type Goal = Parameters<typeof creditGoalsFromBankMatches>[0][number];
type Saving = Parameters<typeof creditGoalsFromBankMatches>[1][number];
type MatchedTx = Parameters<typeof creditGoalsFromBankMatches>[2] extends Map<string, infer T> ? T : never;

const goal = (extra: Partial<Goal> = {}): Goal =>
  ({ id: 'g1', name: 'Resa', targetAmount: 20000, currentAmount: 1000, activities: [], ...extra });
const saving = (extra: Partial<Saving> = {}): Saving =>
  ({ id: 'fx-save', name: 'Sparande: Resa', amount: 1500, dueDay: 25, category: 'Sparande', linkedGoalId: 'g1', ...extra });
const tx = (id: string, amount: number, date: string): MatchedTx => ({ id, title: 'Avanza', amount, date, category: 'Sparande' });

test('med bank: dragningen fyller på målet med riktigt belopp', () => {
  const { goals, mutated } = creditGoalsFromBankMatches([goal()], [saving()], new Map([['fx-save', tx('t1', 1600, '2026-11-25')]]));
  assert.equal(mutated, true);
  assert.equal(goals[0].currentAmount, 2600);
  assert.equal(goals[0].activities[0].amount, 1600);
});

test('med bank: samma dragning bokas aldrig två gånger', () => {
  const first = creditGoalsFromBankMatches([goal()], [saving()], new Map([['fx-save', tx('t1', 1600, '2026-11-25')]]));
  const second = creditGoalsFromBankMatches(first.goals, [saving()], new Map([['fx-save', tx('t1', 1600, '2026-11-25')]]));
  assert.equal(second.mutated, false);
  assert.equal(second.goals[0].currentAmount, 2600);
});

test('med bank: delat sparande räknas med din andel', () => {
  const shared = saving({ isShared: true, amount: 1000, fullAmount: 2000 });
  const { goals } = creditGoalsFromBankMatches([goal()], [shared], new Map([['fx-save', tx('t1', 2000, '2026-11-25')]]));
  assert.equal(goals[0].currentAmount, 2000);
});

test('utan bank: fylls på när dragningsdagen passerat i perioden', () => {
  const start = new Date('2026-11-25T00:00:00');
  const before = creditGoalsWithoutBank([goal()], [saving({ dueDay: 28 })], start, new Date('2026-11-27T12:00:00'));
  assert.equal(before.mutated, false, 'den 28:e har inte kommit än');
  const after = creditGoalsWithoutBank([goal()], [saving({ dueDay: 28 })], start, new Date('2026-11-28T08:00:00'));
  assert.equal(after.mutated, true);
  assert.equal(after.goals[0].currentAmount, 2500);
  assert.equal(after.goals[0].activities[0].date, '2026-11-28');
});

test('utan bank: en gång per period, men igen nästa period', () => {
  const start = new Date('2026-11-25T00:00:00');
  const once = creditGoalsWithoutBank([goal()], [saving()], start, new Date('2026-11-26T08:00:00'));
  const twice = creditGoalsWithoutBank(once.goals, [saving()], start, new Date('2026-12-10T08:00:00'));
  assert.equal(twice.mutated, false);
  const nextPeriod = creditGoalsWithoutBank(once.goals, [saving()], new Date('2026-12-25T00:00:00'), new Date('2026-12-26T08:00:00'));
  assert.equal(nextPeriod.mutated, true);
  assert.equal(nextPeriod.goals[0].currentAmount, 4000);
});

test('utan bank: dragningsdag 31 fungerar i kortare månader (sista dagen)', () => {
  const { mutated, goals } = creditGoalsWithoutBank([goal()], [saving({ dueDay: 31 })], new Date('2027-02-01T00:00:00'), new Date('2027-02-28T09:00:00'));
  assert.equal(mutated, true);
  assert.equal(goals[0].activities[0].date, '2027-02-28');
});

test('uppsagt sparande fyller inte på', () => {
  const { mutated } = creditGoalsWithoutBank([goal()], [saving({ isCancelled: true })], new Date('2026-11-25T00:00:00'), new Date('2026-11-26T08:00:00'));
  assert.equal(mutated, false);
});
