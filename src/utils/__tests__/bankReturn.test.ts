import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Enkel localStorage för testerna (finns inte i Node)
const store = new Map<string, string>();
(globalThis as { localStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> }).localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
};

const { BANK_RETURN_MARKER_KEY, BANK_RETURN_MAX_AGE_MS, hasFreshBankReturnMarker, clearBankReturnMarker } =
  await import('../../components/onboarding/onboardingConfig');

beforeEach(() => store.clear());

test('tillbaka från banken inom 30 min: introduktionen fortsätter där den var', () => {
  store.set(BANK_RETURN_MARKER_KEY, String(Date.now() - 60_000));
  assert.equal(hasFreshBankReturnMarker(), true);
});

test('gammal markering räknas inte och städas bort', () => {
  store.set(BANK_RETURN_MARKER_KEY, String(Date.now() - BANK_RETURN_MAX_AGE_MS - 1));
  assert.equal(hasFreshBankReturnMarker(), false);
  assert.equal(store.has(BANK_RETURN_MARKER_KEY), false);
});

test('ingen markering = vanlig start', () => {
  assert.equal(hasFreshBankReturnMarker(), false);
  store.set(BANK_RETURN_MARKER_KEY, String(Date.now()));
  clearBankReturnMarker();
  assert.equal(hasFreshBankReturnMarker(), false);
});
