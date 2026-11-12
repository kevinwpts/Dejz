import { test } from 'vitest';
import assert from 'node:assert/strict';
import { emptyMeta, findDirtyKeys, hashValue, planHydrate, type PrefSyncMeta } from '../cache/prefsMerge';

const KEYS = ['savingsGoals', 'categoryBudgets', 'merchantAliasesV3'];
const goal = (name: string) => ({ id: name, name, targetAmount: 10000, currentAmount: 0 });

/** Simulerar en enhet: lokala värden + synkminne. */
function device(local: Record<string, unknown>, meta: PrefSyncMeta = emptyMeta('u1')) {
  return { local, meta };
}

test('första gången: serverns värden vinner över en gammal enhet', () => {
  const phone = device({ savingsGoals: [goal('Gammal')], categoryBudgets: {} });
  const remote = { savingsGoals: [goal('Resa'), goal('Buffert')] };
  const plan = planHydrate(KEYS, phone.local, remote, {}, '2026-11-10T10:00:00Z', phone.meta);
  assert.deepEqual(plan.apply, ['savingsGoals']);
  assert.equal(plan.meta.initialized, true);
});

test('en ny enhet skickar inget förrän den jämfört med servern', () => {
  const fresh = device({ savingsGoals: [goal('X')] });
  assert.deepEqual(findDirtyKeys(fresh.local, fresh.meta), []);
});

test('ändring på datorn syns i telefonen som inte har ändrat något', () => {
  const synced = { savingsGoals: [goal('Resa')] };
  const meta: PrefSyncMeta = { uid: 'u1', initialized: true, seen: { savingsGoals: 't1' }, hash: { savingsGoals: hashValue(synced.savingsGoals) } };
  const phone = device({ ...synced }, meta);
  const remote = { savingsGoals: [goal('Resa'), goal('Ny bil')] }; // datorn la till ett mål
  const plan = planHydrate(KEYS, phone.local, remote, { savingsGoals: 't2' }, '', phone.meta);
  assert.deepEqual(plan.apply, ['savingsGoals']);
  assert.equal(plan.meta.seen.savingsGoals, 't2');
});

test('telefonens egen osparade ändring skrivs inte över – den skickas i stället', () => {
  const synced = [goal('Resa')];
  const meta: PrefSyncMeta = { uid: 'u1', initialized: true, seen: { savingsGoals: 't1' }, hash: { savingsGoals: hashValue(synced) } };
  const phone = device({ savingsGoals: [goal('Resa'), goal('Från telefonen')] }, meta);
  const plan = planHydrate(KEYS, phone.local, { savingsGoals: [goal('Resa'), goal('Från datorn')] }, { savingsGoals: 't2' }, '', phone.meta);
  assert.deepEqual(plan.apply, []);
  assert.deepEqual(plan.keepLocal, ['savingsGoals']);
  assert.deepEqual(findDirtyKeys(phone.local, plan.meta), ['savingsGoals']);
});

test('bara ändrade nycklar skickas – en gammal enhet raderar inte andras ändringar', () => {
  const values = { savingsGoals: [goal('Resa')], categoryBudgets: { Mat: 4000 } };
  const meta: PrefSyncMeta = {
    uid: 'u1',
    initialized: true,
    seen: {},
    hash: { savingsGoals: hashValue(values.savingsGoals), categoryBudgets: hashValue(values.categoryBudgets) },
  };
  const local = { ...values, categoryBudgets: { Mat: 4500 } }; // bara budgeten ändrad här
  assert.deepEqual(findDirtyKeys(local, meta), ['categoryBudgets']);
});

test('samma serverversion igen gör ingenting', () => {
  const v = { Mat: 4000 };
  const meta: PrefSyncMeta = { uid: 'u1', initialized: true, seen: { categoryBudgets: 't5' }, hash: { categoryBudgets: hashValue(v) } };
  const plan = planHydrate(KEYS, { categoryBudgets: v }, { categoryBudgets: { Mat: 1 } }, { categoryBudgets: 't5' }, '', meta);
  assert.deepEqual(plan.apply, []);
});

test('fingeravtrycket bryr sig inte om ordningen på fält', () => {
  assert.equal(hashValue({ a: 1, b: [1, 2] }), hashValue({ b: [1, 2], a: 1 }));
  assert.notEqual(hashValue([1, 2]), hashValue([2, 1]));
});

test('en tom lokal lista räknas aldrig som en ändring som slår serverns', () => {
  const meta: PrefSyncMeta = { uid: 'u1', initialized: true, seen: { savingsGoals: 't1' }, hash: { savingsGoals: hashValue([goal('A')]) } };
  const plan = planHydrate(KEYS, { savingsGoals: [] }, { savingsGoals: [goal('A'), goal('B')] }, { savingsGoals: 't2' }, '', meta);
  assert.deepEqual(plan.apply, ['savingsGoals']);
});
