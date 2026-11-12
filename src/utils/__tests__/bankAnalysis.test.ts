import { test } from 'vitest';
import assert from 'node:assert/strict';
import { analyzeBankTransactionsForOnboarding } from '../bankHistoryAnalyzer';

// Bankanalysen i introduktionen: sex månaders påhittad historik för "Elin".

type BankRow = Parameters<typeof analyzeBankTransactionsForOnboarding>[0][number];
type UserAccount = NonNullable<Parameters<typeof analyzeBankTransactionsForOnboarding>[3]>[number];
// Testdata innehåller bara de fält analysen läser
const account = (
  a: Pick<UserAccount, 'id' | 'name' | 'iban' | 'currency' | 'is_selected'> & { balance?: number }
) => a as UserAccount;

const rows: BankRow[] = [];
let n = 0;
const add = (date: string, amount: number, desc: string, acc = 'acc1') =>
  rows.push({
    id: `t${n++}`, user_id: 'u', connection_id: 'c1', bank_account_id: acc, external_key: `k${n}`,
    entry_reference: null, transaction_id: null, booking_status: 'BOOK', booking_date: date, value_date: date,
    transaction_date: date, amount, currency: 'SEK', credit_debit_indicator: amount > 0 ? 'CRDT' : 'DBIT',
    description: desc, counterparty_name: desc,
  } as BankRow);
['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'].forEach((m, i) => {
  add(`${m}-25`, 26400 + i * 10, 'LÖN ACME AB');
  add(`${m}-27`, -8950, 'HEIMSTADEN AB');
  add(`${m}-28`, -[640, 710, 890, 1120, 980, 760][i], 'ÖRESUNDSKRAFT AB');
  add(`${m}-21`, -149, 'NETFLIX.COM');
  add(`${m}-14`, -129, 'APPLE.COM/BILL');
  add(`${m}-27`, -299, 'TELIA SVERIGE AB');
  add(`${m}-28`, -649, 'SATS SVERIGE AB');
  add(`${m}-03`, -432 - i, 'ICA NARA');
  add(`${m}-09`, -189, 'MAX BURGERS');
  add(`${m}-12`, -2000, 'Överföring sparkonto');
  add(`${m}-12`, 2000, 'Överföring från lönekonto', 'acc2');
  add(`${m}-18`, -250, 'Swish 0701234567');
});
const accounts: UserAccount[] = [
  account({ id: 'acc1', name: 'Lönekonto', iban: 'SE1', currency: 'SEK', balance: 8400, is_selected: true }),
  account({ id: 'acc2', name: 'Sparkonto', iban: 'SE2', currency: 'SEK', balance: 30000, is_selected: true }),
];
const result = analyzeBankTransactionsForOnboarding(rows, 25, true, accounts);
const fixed = (name: RegExp) => result.detectedFixedExpenses.find((f) => name.test(f.name));

test('lönen hittas och lönedagen blir den 25:e', () => {
  assert.equal(result.suggestedPayday, 25);
  const salary = result.detectedIncomes.find((i) => i.category === 'Lön');
  assert.ok(salary, 'lön hittad');
  assert.equal(salary!.deductionDay, 25);
});

test('fasta utgifter hittas med rätt belopp och dag', () => {
  assert.equal(fixed(/Heimstaden/)?.amount, 8950);
  assert.equal(fixed(/Heimstaden/)?.deductionDay, 27);
  assert.equal(fixed(/Netflix/)?.amount, 149);
  assert.equal(fixed(/SATS/)?.amount, 649);
  assert.ok(fixed(/Telia/));
  assert.ok(fixed(/Apple/));
});

test('elen markeras som rörlig, Telia (samma belopp varje gång) gör inte det', () => {
  assert.equal(fixed(/Öresundskraft/)?.isVariable, true);
  assert.equal(fixed(/Telia/)?.isVariable, false);
});

test('vardagsköp, Swish och överföringar till eget sparkonto blir inte fasta utgifter', () => {
  assert.equal(fixed(/ICA/), undefined);
  assert.equal(fixed(/MAX/i), undefined);
  assert.equal(fixed(/Swish|0701234567/), undefined);
  assert.equal(fixed(/Överföring/), undefined);
});

test('överföringen från lönekontot räknas inte som inkomst', () => {
  assert.equal(result.detectedIncomes.some((i) => /Överföring/.test(i.name)), false);
});
