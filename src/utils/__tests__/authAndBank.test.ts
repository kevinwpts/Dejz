import { test } from 'vitest';
import assert from 'node:assert/strict';
import { friendlyAuthError } from '../authErrors';
import { deduplicateTransactions } from '../transactionDedup';
import { findInternalTransferIds, isInternalTransferTransaction } from '../transferDetection';
import type { TransactionItem } from '../../app/models';

// --- Inloggning: begripliga svenska fel -------------------------------------------------------

test('fel lösenord', () => {
  assert.equal(friendlyAuthError({ message: 'Invalid login credentials' }).kind, 'invalid_credentials');
  assert.equal(friendlyAuthError({ code: 'invalid_credentials', message: 'x' }).kind, 'invalid_credentials');
});

test('obekräftad e-post', () => {
  const f = friendlyAuthError({ code: 'email_not_confirmed', message: 'Email not confirmed' });
  assert.equal(f.kind, 'email_not_confirmed');
  assert.match(f.message, /bekräftat/);
});

test('kontot finns redan', () => {
  assert.equal(friendlyAuthError({ message: 'User already registered' }).kind, 'already_registered');
});

test('för kort lösenord visar rätt antal tecken – på svenska', () => {
  const f = friendlyAuthError({ message: 'Password should be at least 8 characters.' });
  assert.equal(f.kind, 'weak_password');
  assert.equal(f.message, 'Lösenordet måste vara minst 8 tecken.');
});

test('ingen anslutning och för många försök', () => {
  assert.equal(friendlyAuthError(new TypeError('Failed to fetch')).kind, 'network');
  assert.equal(friendlyAuthError({ status: 429, message: 'Too Many Requests' }).kind, 'rate_limited');
  assert.equal(friendlyAuthError({ message: 'For security purposes, you can only request this after 30 seconds.' }).kind, 'rate_limited');
});

test('okänt fel visar aldrig engelsk text', () => {
  const f = friendlyAuthError({ message: 'Database error saving new user' });
  assert.equal(f.kind, 'unknown');
  assert.equal(f.message, 'Något gick fel. Försök igen.');
  assert.equal(friendlyAuthError(null).kind, 'unknown');
});

// --- Bank: samma köp visas bara en gång ------------------------------------------------------

const bankTx = (id: string, extra: Partial<TransactionItem> = {}): TransactionItem =>
  ({ id, title: 'ICA Maxi', amount: 249, date: '2026-11-05', type: 'expense', category: 'Mat & dryck', ...extra }) as TransactionItem;

test('samma banktransaktion från två synkningar visas en gång', () => {
  const out = deduplicateTransactions([
    bankTx('bank-1', { transactionId: 'T1' }),
    bankTx('bank-2', { transactionId: 'T1' }),
  ]);
  assert.equal(out.length, 1);
});

test('två olika köp med samma belopp samma dag behålls båda', () => {
  const out = deduplicateTransactions([
    bankTx('bank-1', { transactionId: 'T1', rawJson: { balance_after_transaction: { amount: '1000' } } }),
    bankTx('bank-2', { transactionId: 'T2', rawJson: { balance_after_transaction: { amount: '751' } } }),
  ]);
  assert.equal(out.length, 2);
});

test('samma id två gånger räknas en gång', () => {
  assert.equal(deduplicateTransactions([bankTx('bank-1'), bankTx('bank-1')]).length, 1);
});

// --- Bank: flytt mellan egna konton räknas inte som utgift ------------------------------------

test('lönen är aldrig en intern överföring', () => {
  assert.equal(
    isInternalTransferTransaction(bankTx('inc-lon', { title: 'Lön', type: 'income', amount: 28500 })),
    false
  );
});

test('flaggad överföring mellan egna konton känns igen', () => {
  assert.equal(isInternalTransferTransaction(bankTx('bank-9', { rawJson: { isInternalTransfer: true } })), true);
});

test('vanligt kortköp är inte en överföring', () => {
  assert.equal(isInternalTransferTransaction(bankTx('bank-3', { title: 'ICA Maxi', category: 'Mat & dryck' })), false);
});

test('båda benen i en flytt mellan egna konton döljs', () => {
  const out = bankTx('bank-a', { title: 'Överföring', amount: 10000, type: 'expense', date: '2026-11-05', rawJson: { isInternalTransfer: true } });
  const ids = findInternalTransferIds([out, bankTx('bank-x')]);
  assert.equal(ids.has('bank-a'), true);
  assert.equal(ids.has('bank-x'), false);
});
