import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Transaction } from '../../types';
import {
  buildTransactionTags,
  transactionFromRow,
  transactionToRow,
} from '../../services/transactionRows';

const base: Omit<Transaction, 'id'> = {
  amount: 129,
  category: 'Mat & dryck',
  tags: ['middag'],
  merchant: 'ICA Maxi',
  note: 'Fredagsmys',
  timestamp: 1_762_860_000_000,
  type: 'expense',
};

test('köp → rad → köp ger samma köp tillbaka', () => {
  const tx: Omit<Transaction, 'id'> = {
    ...base,
    isStarred: true,
    bankTransactionId: 'bt-1',
    bankAccountId: 'acc-9',
    originalBankAmount: -129,
    receiptUrls: ['https://x/kvitto1.jpg', 'https://x/kvitto2.jpg'],
    splits: [{ amount: 64.5, category: 'Mat & dryck' } as never],
  };
  const row = { id: 'id-1', ...transactionToRow(tx, 'insert') };
  const back = transactionFromRow(row as never);
  assert.equal(back.amount, 129);
  assert.equal(back.merchant, 'ICA Maxi');
  assert.equal(back.isStarred, true);
  assert.equal(back.bankTransactionId, 'bt-1');
  assert.equal(back.bankAccountId, 'acc-9');
  assert.equal(back.originalBankAmount, -129);
  assert.deepEqual(back.receiptUrls, ['https://x/kvitto1.jpg', 'https://x/kvitto2.jpg']);
  assert.equal(back.splits?.length, 1);
});

test('taggar: inga dubbletter och gamla systemtaggar byts ut', () => {
  const tags = buildTransactionTags({
    ...base,
    tags: ['middag', 'middag', 'starred', 'bank_tx:gammal'],
    isStarred: false,
    bankTransactionId: 'ny',
  });
  assert.deepEqual(tags, ['middag', 'bank_tx:ny']);
});

test('äldre rader: bank-id och återbetalning läses från taggar', () => {
  const tx = transactionFromRow({
    id: 'r1',
    amount: 50,
    category: 'Övrigt',
    timestamp: 1,
    type: 'expense',
    tags: ['starred', 'bank_tx:abc', 'refund_of:orig-1'],
  });
  assert.equal(tx.isStarred, true);
  assert.equal(tx.bankTransactionId, 'abc');
  assert.equal(tx.refundOfTransactionId, 'orig-1');
});

test('belopp och datum som text från databasen blir tal', () => {
  const tx = transactionFromRow({
    id: 'r2',
    amount: '199.50' as never,
    category: 'Nöje',
    timestamp: '1762860000000' as never,
    type: 'expense',
  });
  assert.equal(tx.amount, 199.5);
  assert.equal(tx.timestamp, 1762860000000);
});

test('trasig split-text kraschar inte', () => {
  const tx = transactionFromRow({ id: 'r3', amount: 1, category: 'x', timestamp: 1, type: 'expense', splits: '{trasig' });
  assert.deepEqual(tx.splits, []);
});

test('ändra: borttaget bank-id nollställs, orört fält skickas inte', () => {
  const row = transactionToRow({ ...base, bankTransactionId: '' }, 'update');
  assert.equal(row.bank_transaction_id, null);
  assert.equal('bank_account_id' in row, false);
});

test('lägga till: tomma bankfält skickas inte (äldre databaser saknar kolumnerna)', () => {
  const row = transactionToRow(base, 'insert');
  assert.equal('bank_transaction_id' in row, false);
  assert.equal('original_bank_amount' in row, false);
});

test('om databasen saknar en kolumn används det vi skickade', () => {
  const sent = { ...base, bankAccountId: 'acc-1', isStarred: true };
  const tx = transactionFromRow({ id: 'r4', amount: 129, category: 'Mat & dryck', timestamp: 1, type: 'expense' }, sent);
  assert.equal(tx.bankAccountId, 'acc-1');
  assert.equal(tx.isStarred, true);
  assert.deepEqual(tx.tags, ['middag', 'starred', 'bank_acc:acc-1']);
});
