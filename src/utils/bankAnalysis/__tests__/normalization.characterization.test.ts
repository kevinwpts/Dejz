// Karaktäriseringstester: låser exakt hur belopp, tecken och egna överföringar tolkas i dag.
import './setupTz';
import { describe, expect, test } from 'vitest';
import {
  APPROX_FX_RATES_TO_SEK,
  findRawBankInternalTransferIds,
  getNormalizedBankTxAmount,
  isExplicitInflowTransaction,
  isInternalTransferOrMicroSavings,
  isLikelyCreditCardInvoiceBankTx,
  isLikelyMerchantRefundBankTx,
  resolveBankTxSekAmount,
} from '../normalization';
import {
  ELIN_ACCOUNTS,
  TxInput,
  account,
  edgeDatesHistory,
  elinHistory,
  irregularIncomeHistory,
  resetTxSeq,
  subscriptionsHistory,
  transfersHistory,
  tx,
} from './fixtures';

const D = '2026-10-15';

/** Ett brett urval av enskilda transaktioner som rör alla grenar i tolkningen. */
function singleRows() {
  resetTxSeq();
  const inputs: TxInput[] = [
    { date: D, amount: 0, desc: 'NOLL' },
    { date: D, amount: Number.NaN, desc: 'NAN' },
    { date: D, amount: 500, desc: 'KORTKÖP ICA', indicator: 'DBIT' },
    { date: D, amount: 500, desc: 'ICA', indicator: null },
    { date: D, amount: -500, desc: 'ICA', indicator: null },
    { date: D, amount: 500, desc: 'Reserverat belopp', indicator: 'CRDT' },
    { date: D, amount: 500, desc: 'Reserverat retur', indicator: 'CRDT' },
    { date: D, amount: 500, desc: 'X', status: 'PDNG', indicator: 'CRDT' },
    { date: D, amount: 500, desc: 'X', status: 'HOLD', indicator: null },
    { date: D, amount: 500, desc: 'X', reconciliation: 'reserved_pending', indicator: null },
    { date: D, amount: 500, desc: 'Preliminär', indicator: null },
    { date: D, amount: 25000, desc: 'LÖN', indicator: null },
    { date: D, amount: -25000, desc: 'Lon mars', indicator: null },
    { date: D, amount: -25000, desc: 'Lonely planet', indicator: null },
    { date: D, amount: 300, desc: 'Swish från Anna', indicator: null },
    { date: D, amount: 300, desc: 'Swish till Anna', indicator: null },
    { date: D, amount: 300, desc: 'Swish 1231234567', indicator: null },
    { date: D, amount: 300, desc: 'Swish 1231234567', indicator: 'CRDT' },
    { date: D, amount: 300, desc: 'Insättning', indicator: null },
    { date: D, amount: 300, desc: 'insatt kontant', indicator: null },
    { date: D, amount: 300, desc: 'Överföring från spar', indicator: null },
    { date: D, amount: 300, desc: 'Överföring till spar', indicator: null },
    { date: D, amount: 300, desc: 'Utbetalning', indicator: null },
    { date: D, amount: 300, desc: 'Skadeersättning', indicator: null },
    { date: D, amount: 300, desc: 'Försäkringskassan', indicator: null },
    { date: D, amount: 300, desc: 'Skatteverket', indicator: null },
    { date: D, amount: 300, desc: 'Utdelning', indicator: null },
    { date: D, amount: 300, desc: 'Ränteintäkt', indicator: null },
    { date: D, amount: 300, desc: 'Premie', indicator: null },
    { date: D, amount: 300, desc: 'CSN återbetalning', indicator: null },
    { date: D, amount: 300, desc: 'Bankomat uttag', indicator: null },
    { date: D, amount: 300, desc: '', counterparty: null, indicator: null },
    { date: D, amount: 300, desc: '', counterparty: null, indicator: 'CRDT' },
    { date: D, amount: -50, desc: 'TRAVEL', currency: 'EUR' },
    { date: D, amount: -50, desc: 'TRAVEL', currency: 'eur ' },
    { date: D, amount: -50, desc: 'TRAVEL', currency: 'XYZ' },
    { date: D, amount: -50, desc: 'TRAVEL', currency: 'USD', rawJson: { exchange_rate: '9.5' } },
    { date: D, amount: -50, desc: 'TRAVEL', currency: 'USD', rawJson: { currency_exchange: { exchange_rate: 0 } } },
    { date: D, amount: -50, desc: 'TRAVEL', currency: 'USD', rawJson: { exchange_rate: 'abc' } },
    { date: D, amount: -50, desc: 'TRAVEL', currency: 'GBP', rawJson: { instructed_amount: { amount: '-660.123', currency: 'sek' } } },
    { date: D, amount: -540, desc: 'TRAVEL', currency: 'SEK', rawJson: { instructed_amount: { amount: '47', currency: 'EUR' } } },
    { date: D, amount: -540, desc: 'TRAVEL', currency: 'SEK', rawJson: { currency_exchange: { source_currency: 'NOK' } } },
    { date: D, amount: -540, desc: 'TRAVEL', currency: '' },
    { date: D, amount: -900, desc: 'ENTERCARD' },
    { date: D, amount: -700, desc: 'ENTERCARD' },
    { date: D, amount: -1500, desc: 'KLARNA' },
    { date: D, amount: -1500, desc: 'KLARNA', rawJson: { card_transaction: {} } },
    { date: D, amount: -1499, desc: 'KLARNA' },
    { date: D, amount: -2000, desc: 'Walley faktura' },
    { date: D, amount: 2000, desc: 'Walley' },
    { date: D, amount: 199, desc: 'Retur H&M' },
    { date: D, amount: 199, desc: 'H&M', rawJson: { card_transaction: {} } },
    { date: D, amount: 199, desc: 'H&M', rawJson: { card_transaction: {} }, indicator: null },
    { date: D, amount: 199, desc: 'Swish retur' },
    { date: D, amount: 199, desc: 'CSN kreditering' },
  ];
  return inputs.map(tx);
}

describe('enskilda transaktioner', () => {
  test('getNormalizedBankTxAmount, resolveBankTxSekAmount, kreditkortsfaktura, butiksretur', () => {
    expect(
      singleRows().map((r) => ({
        desc: r.description,
        amount: r.amount,
        currency: r.currency,
        normalized: getNormalizedBankTxAmount(r),
        sek: resolveBankTxSekAmount(r),
        creditCardInvoice: isLikelyCreditCardInvoiceBankTx(r),
        merchantRefund: isLikelyMerchantRefundBankTx(r),
        internal: isInternalTransferOrMicroSavings(r),
        internalWithAccounts: isInternalTransferOrMicroSavings(r, ELIN_ACCOUNTS),
      }))
    ).toMatchSnapshot();
  });

  test('isExplicitInflowTransaction', () => {
    const cases: Array<[string | null, string | null, string | null | undefined, string | null | undefined]> = [
      ['Lön', null, 'DBIT', null],
      ['Lön', null, null, 'pdng'],
      ['Retur', null, null, ' hold '],
      [null, null, null, null],
      ['', '', 'CRDT', null],
      ['Faktura', null, 'CRDT', null],
      ['Okänt', null, 'CRDT', 'PDNG'],
      ['Okänt', null, null, null],
      ['salary', 'ACME', undefined, undefined],
      ['swish inb', null, null, null],
      ['Återbäring', null, null, null],
      ['Aktieutdelning', null, null, null],
      ['Studiemedel', null, null, null],
    ];
    expect(cases.map((c) => [...c, isExplicitInflowTransaction(c[0], c[1], c[2], c[3])])).toMatchSnapshot();
  });

  test('växelkurser', () => {
    expect(APPROX_FX_RATES_TO_SEK).toMatchSnapshot();
  });
});

function transferRows() {
  resetTxSeq();
  const inputs: TxInput[] = [
    { date: D, amount: -100, desc: 'ENKLA VARDAG', status: 'PDNG' },
    { date: D, amount: -100, desc: 'Kortköp', status: 'PDNG' },
    { date: D, amount: -100, desc: 'Överföring', status: 'HOLD' },
    { date: D, amount: -100, desc: 'X', rawJson: { card_transaction: {}, bank_transaction_code: { description: 'Transfer' } } },
    { date: D, amount: -100, desc: 'X', rawJson: { bank_transaction_code: { description: 'Card purchase' } } },
    { date: D, amount: -100, desc: 'X', rawJson: { bank_transaction_code: { description: 'Transfer' } } },
    { date: D, amount: -100, desc: 'X', rawJson: { bank_transaction_code: { description: 'InternalTransfer' } } },
    { date: D, amount: -100, desc: '0701234567', counterparty: null },
    { date: D, amount: -100, desc: 'Text', rawJson: { remittance_information: ['Swish 0701234567'] } },
    { date: D, amount: -100, desc: 'Text', rawJson: { remittance_information: [{ unstructured: 'mellan egna konton' }] } },
    { date: D, amount: -100, desc: 'Text', rawJson: { remittance_information: 'Sparkonto' } },
    { date: D, amount: -100, desc: 'Överf. hyra', counterparty: null },
    { date: D, amount: -100, desc: 'insättning', counterparty: null },
    { date: D, amount: -100, desc: 'Till 5196 0050 7532 2553 2192', counterparty: null },
    { date: D, amount: -100, desc: '5196 0050 753', counterparty: null },
    { date: D, amount: -100, desc: 'Betalning', counterparty: null, rawJson: { creditor_account: { other: { identification: '8103-4 000 978 324-2' } } } },
    { date: D, amount: -100, desc: 'Betalning', counterparty: null, account: 'acc2', rawJson: { creditor_account: { other: { identification: '81034000978324' } } } },
    { date: D, amount: 100, desc: 'Betalning in', counterparty: null, rawJson: { debtor_account: { iban: 'se72 8000 0810 3400 0978 3242' } } },
    { date: D, amount: -100, desc: 'Ref 9783242 hyra', counterparty: null },
    { date: D, amount: -100, desc: 'SE3550000000054910000003', counterparty: null },
    { date: D, amount: -100, desc: 'ELIN ANDERSSON', counterparty: null },
    { date: D, amount: -100, desc: 'ELIN ANDERS', counterparty: null },
    { date: D, amount: -100, desc: 'ELIN ANDERSSON BERG', counterparty: null },
    { date: D, amount: -100, desc: 'Elin', counterparty: null },
    { date: D, amount: -100, desc: 'Till buffert resor', counterparty: null },
    { date: D, amount: -100, desc: 'Privatkonto', counterparty: null },
    { date: D, amount: -100, desc: 'Enkla sparkontot', counterparty: null },
    { date: D, amount: -100, desc: 'Hyra', counterparty: 'Fastighets AB' },
  ];
  return inputs.map(tx);
}

describe('egna överföringar', () => {
  const accountsVariants = {
    inga: [],
    elin: ELIN_ACCOUNTS,
    kortaNummer: [
      account({ id: 'acc5', name: 'Kalle', bban: '12345', iban: 'SE12', product: 'Lönekonto', custom_name: 'konto' }),
      account({ id: 'acc6', name: 'Elin Anders', bban: '1234567890123', product: 'Elin Andersson' }),
    ],
  };

  for (const [name, accounts] of Object.entries(accountsVariants)) {
    test(`isInternalTransferOrMicroSavings med konton: ${name}`, () => {
      expect(
        transferRows().map((r) => [r.description, isInternalTransferOrMicroSavings(r, accounts)])
      ).toMatchSnapshot();
    });
  }

  const histories = { elinHistory, irregularIncomeHistory, subscriptionsHistory, transfersHistory, edgeDatesHistory };
  for (const [name, build] of Object.entries(histories)) {
    test(`findRawBankInternalTransferIds: ${name}`, () => {
      expect([...findRawBankInternalTransferIds(build(), ELIN_ACCOUNTS)].sort()).toMatchSnapshot();
      expect([...findRawBankInternalTransferIds(build())].sort()).toMatchSnapshot();
    });
  }

  test('findRawBankInternalTransferIds: precis 3 dagar paras, 4 dagar gör det inte', () => {
    resetTxSeq();
    const rows = [
      tx({ id: 'o3', date: '2026-10-10', amount: -500, desc: 'Flytt', counterparty: null }),
      tx({ id: 'i3', date: '2026-10-13', amount: 500, desc: 'Inkommande', counterparty: null, account: 'acc2' }),
      tx({ id: 'o4', date: '2026-10-20', amount: -700, desc: 'Flytt', counterparty: null }),
      tx({ id: 'i4', date: '2026-10-24', amount: 700, desc: 'Inkommande', counterparty: null, account: 'acc2' }),
    ];
    expect([...findRawBankInternalTransferIds(rows)].sort()).toEqual(['i3', 'o3']);
  });

  test('findRawBankInternalTransferIds: tomt och parning med bästa poäng', () => {
    expect(findRawBankInternalTransferIds([])).toEqual(new Set());
    resetTxSeq();
    const rows = [
      tx({ date: '2026-10-01', amount: -500, desc: 'Flytt', counterparty: null }),
      tx({ date: '2026-10-04', amount: 500, desc: 'Inkommande', counterparty: null, account: 'acc2' }),
      tx({ date: '2026-10-02', amount: 500, desc: 'Inkommande', counterparty: null, account: 'acc3' }),
      tx({ date: '2026-10-01', amount: 500, desc: 'Inkommande', counterparty: null, account: 'acc1' }),
      tx({ date: '2026-10-01', amount: -250, desc: 'Flytt', counterparty: null, account: '' }),
      tx({ date: '2026-10-05', amount: 250, desc: 'Inkommande', counterparty: null, account: '' }),
      tx({ date: null, valueDate: null, transactionDate: null, amount: -75, desc: 'A', counterparty: null }),
      tx({ date: null, valueDate: null, transactionDate: null, amount: 75, desc: 'B', counterparty: null, account: 'acc2' }),
      tx({ date: '2026-10-01', amount: -60, desc: 'C', counterparty: null, reconciliation: 'excluded' }),
      tx({ date: '2026-10-01', amount: 60, desc: 'D', counterparty: null, account: 'acc2' }),
    ];
    expect([...findRawBankInternalTransferIds(rows)].sort()).toMatchSnapshot();
  });
});
