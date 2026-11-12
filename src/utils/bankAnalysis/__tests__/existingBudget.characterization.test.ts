// Karaktäriseringstester: låser exakt vad sammanslagningen för befintliga användare ger i dag.
import './setupTz';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import {
  analyzeBankForExistingBudget,
  getAutoImportableBankTransactions,
  inferCategoryAndMethodFromName,
  isSameFixedExpenseName,
  matchesKeywordSmart,
  normalizePaymentMethodName,
} from '../existingBudget';
import {
  ELIN_ACCOUNTS,
  EXISTING_FIXED,
  EXISTING_INCOMES,
  FIXED_NOW,
  account,
  baseConfig,
  edgeDatesHistory,
  elinHistory,
  existingAppTxs,
  irregularIncomeHistory,
  subscriptionsHistory,
  transfersHistory,
  tx,
} from './fixtures';

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXED_NOW);
});
afterAll(() => {
  vi.useRealTimers();
});

const scenarios = {
  elin: elinHistory,
  irregularIncome: irregularIncomeHistory,
  subscriptions: subscriptionsHistory,
  transfers: transfersHistory,
  edgeDates: edgeDatesHistory,
};

describe('analyzeBankForExistingBudget', () => {
  for (const [name, build] of Object.entries(scenarios)) {
    test(name, () => {
      expect(
        analyzeBankForExistingBudget({
          bankTransactions: build(),
          userAccounts: ELIN_ACCOUNTS,
          existingFixedExpenses: EXISTING_FIXED,
          existingIncomes: EXISTING_INCOMES,
          existingAppTransactions: existingAppTxs(),
          config: baseConfig(),
        })
      ).toMatchSnapshot();
    });
  }

  test('utan befintlig budget, lönedag 1 utan helgjustering', () => {
    expect(
      analyzeBankForExistingBudget({
        bankTransactions: elinHistory(),
        existingFixedExpenses: [],
        existingIncomes: [{ id: 'i9', name: 'Extrajobb', amount: 3000, category: 'Sidoinkomst' }],
        existingAppTransactions: [],
        config: baseConfig({ payday: 1, paydayBeforeWeekend: false }),
      })
    ).toMatchSnapshot();
  });

  test('taggar, likadana belopp och samma inkomst', () => {
    const rows = elinHistory();
    const ica = rows.find((r) => r.description === 'ICA NARA HAGA' && r.booking_date === '2026-11-03');
    const burgers = rows.find((r) => r.description === 'MAX BURGERS' && r.booking_date === '2026-11-09');
    expect(
      analyzeBankForExistingBudget({
        bankTransactions: rows,
        userAccounts: ELIN_ACCOUNTS,
        existingFixedExpenses: EXISTING_FIXED,
        existingIncomes: [{ id: 'i1', name: 'Jobbet', amount: 26440, category: 'Lön' }],
        existingAppTransactions: [
          { id: 'x1', amount: 1, category: 'Övrigt', tags: [`bank_tx:${ica?.id}`], timestamp: 0, type: 'expense' },
          { id: 'x2', amount: 1, category: 'Övrigt', tags: [`bank_key:${burgers?.external_key}`], timestamp: 0, type: 'expense' },
          { id: 'x3', amount: 1, category: 'Övrigt', tags: [], timestamp: 0, type: 'expense', bankTransactionId: rows[rows.length - 1].id },
        ],
        config: baseConfig({ categories: [] }),
      })
    ).toMatchSnapshot();
  });

  test('tom lista', () => {
    expect(
      analyzeBankForExistingBudget({
        bankTransactions: [],
        existingFixedExpenses: EXISTING_FIXED,
        existingIncomes: EXISTING_INCOMES,
        existingAppTransactions: [],
        config: baseConfig(),
      })
    ).toMatchSnapshot();
  });
});

function importEdgeRows() {
  const rows = elinHistory();
  rows.push(tx({ id: 'book1', date: '2026-11-09', amount: -245, desc: 'HEMKÖP CITY', transactionId: 'TX-1' }));
  rows.push(tx({ id: 'pend1', date: '2026-11-09', amount: -245, desc: 'HEMKÖP CITY', status: 'PDNG', transactionId: 'TX-1' }));
  rows.push(tx({ id: 'pend2', date: '2026-11-11', amount: -99, desc: 'PRESSBYRÅN', status: 'HOLD', entryReference: 'ER-9' }));
  rows.push(tx({ id: 'pend3', date: '2026-11-11', amount: -55, desc: 'SL BILJETT', status: 'PDNG' }));
  rows.push(tx({ id: 'cncl1', date: '2026-11-08', amount: -600, desc: 'AVBRUTET KÖP', status: 'CNCL' }));
  rows.push(tx({ id: 'excl1', date: '2026-11-08', amount: -700, desc: 'UNDANTAGET', reconciliation: 'excluded' }));
  rows.push(tx({ id: 'conf1', date: '2026-11-08', amount: -800, desc: 'BEKRÄFTAD RÄKNING', reconciliation: 'confirmed_fixed_expense' }));
  rows.push(tx({ id: 'dism1', date: '2026-11-07', amount: -120, desc: 'BORTVALD' }));
  rows.push(tx({ id: 'dism2', date: '2026-11-07', amount: -130, desc: 'BORTVALD NYCKEL', externalKey: 'ext-dism' }));
  rows.push(tx({ id: 'dup1', date: '2026-11-06', amount: -140, desc: 'DUBBEL', externalKey: 'same-key' }));
  rows.push(tx({ id: 'dup2', date: '2026-11-06', amount: -141, desc: 'DUBBEL 2', externalKey: 'same-key' }));
  rows.push(tx({ id: 'cc1', date: '2026-11-05', amount: -4200, desc: 'ENTERCARD KREDITKORT' }));
  rows.push(tx({ id: 'kl1', date: '2026-11-05', amount: -1600, desc: 'KLARNA AB' }));
  rows.push(tx({ id: 'kl2', date: '2026-11-05', amount: -1600, desc: 'KLARNA AB KORT', rawJson: { card_transaction: {} } }));
  rows.push(tx({ id: 'ref1', date: '2026-11-04', amount: 199, desc: 'H&M', rawJson: { card_transaction: {} } }));
  rows.push(tx({ id: 'usd1', date: '2026-11-02', amount: -12, desc: 'STEAM GAMES', currency: 'USD' }));
  rows.push(tx({ id: 'usd2', date: '2026-11-02', amount: -9.99, desc: 'OPENAI', currency: 'USD', rawJson: { instructed_amount: { amount: '108.40', currency: 'SEK' } } }));
  rows.push(tx({ id: 'acc9', date: '2026-11-02', amount: -333, desc: 'ANNAT KONTO', account: 'acc9' }));
  rows.push(tx({ id: 'nodate', date: null, valueDate: null, transactionDate: null, amount: -77, desc: 'UTAN DATUM' }));
  rows.push(tx({ id: 'manual1', date: '2026-11-10', amount: -59, desc: 'Pressbyrån Central', counterparty: 'PRESSBYRÅN CENTRAL' }));
  return rows;
}

function importAppTxs() {
  return [
    ...existingAppTxs(),
    { id: 'm1', amount: 59, category: 'Övrigt', tags: [], merchant: 'Pressbyrån Central', timestamp: Date.parse('2026-11-10T09:00:00'), type: 'expense' as const },
    { id: 'm2', amount: 245, category: 'Övrigt', tags: ['bank_key:k_zzz'], merchant: 'X', timestamp: 0, type: 'expense' as const, bankTransactionId: 'book1' },
  ];
}

describe('getAutoImportableBankTransactions', () => {
  for (const [name, build] of Object.entries(scenarios)) {
    test(`${name} (objektform)`, () => {
      expect(
        getAutoImportableBankTransactions({
          bankTransactions: build(),
          userAccounts: ELIN_ACCOUNTS,
          existingFixedExpenses: EXISTING_FIXED,
          existingAppTransactions: existingAppTxs(),
          config: baseConfig(),
        })
      ).toMatchSnapshot();
    });
  }

  test('kantfall, objektform med bortvalda id:n som Set', () => {
    expect(
      getAutoImportableBankTransactions({
        bankTransactions: importEdgeRows(),
        userAccounts: ELIN_ACCOUNTS,
        existingFixedExpenses: EXISTING_FIXED,
        existingAppTransactions: importAppTxs(),
        config: baseConfig(),
        dismissedBankTxIds: new Set(['dism1', 'ext-dism']),
      })
    ).toMatchSnapshot();
  });

  test('kantfall, positionsform med bortvalda id:n som lista och utan konfig', () => {
    expect(
      getAutoImportableBankTransactions(
        importEdgeRows(),
        [],
        EXISTING_FIXED,
        importAppTxs(),
        null,
        ['dism1']
      )
    ).toMatchSnapshot();
  });

  test('kontofilter: bara valda konton som ingår i budgeten', () => {
    const accounts = [
      ...ELIN_ACCOUNTS.map((a) => (a.id === 'acc2' ? { ...a, include_in_budget: false } : a)),
      account({ id: 'acc9', name: 'Gemensamt', is_selected: false }),
    ];
    expect(
      getAutoImportableBankTransactions({
        bankTransactions: importEdgeRows(),
        userAccounts: accounts,
        existingFixedExpenses: [],
        existingAppTransactions: [],
        config: baseConfig({ payday: 27, paydayBeforeWeekend: false }),
      })
    ).toMatchSnapshot();
  });

  test('befintlig app-transaktion med bank-tagg hindrar import', () => {
    const rows = elinHistory();
    const ica = rows.find((r) => r.description === 'ICA NARA HAGA' && r.booking_date === '2026-11-03');
    const burgers = rows.find((r) => r.description === 'MAX BURGERS' && r.booking_date === '2026-11-09');
    expect(
      getAutoImportableBankTransactions({
        bankTransactions: rows,
        existingFixedExpenses: [],
        existingAppTransactions: [
          { id: 'x1', amount: 1, category: 'Övrigt', tags: [`bank_tx:${ica?.id}`], timestamp: 0, type: 'expense' },
          { id: 'x2', amount: 1, category: 'Övrigt', tags: [`bank_key:${burgers?.external_key}`], timestamp: 0, type: 'expense' },
        ],
      })
    ).toMatchSnapshot();
  });

  test('positionsform med bara transaktioner', () => {
    expect(getAutoImportableBankTransactions(subscriptionsHistory())).toMatchSnapshot();
  });

  test('tomma indata', () => {
    expect(getAutoImportableBankTransactions([])).toEqual([]);
    expect(
      getAutoImportableBankTransactions({
        bankTransactions: [],
        existingFixedExpenses: [],
        existingAppTransactions: [],
      })
    ).toEqual([]);
  });
});

const NAMES = [
  '', 'a', 'Netflix', 'netflix', 'Riksbyggen', 'HSB Brf Solen', 'A-kassa', 'Unionen', 'SATS', 'ICA',
  'ica maxi', 'Systembolaget', 'Foodora', 'Circle K', 'Apotea', 'IKEA', 'Spotify', 'Tele2', 'Telia',
  'Tibber', 'Hedvig', 'Vattenfall', 'El', 'Elnät Göteborg', 'Hotell', 'Lön', 'Lön Acme', 'lon',
  'Bonus', 'Barnbidrag', 'CSN', 'Pension', 'AMF', 'Swish', 'Swish från mamma', 'SL', 'SL-kort',
  'Slussen', 'Västtrafik', 'Taxi Stockholm', 'Uber', 'Bolt', 'Gym', 'Padel', 'Frisör', 'Kry',
  'Bolån SBAB', 'Ränta', 'Försäkring', 'Folksam', 'Hemförsäkring', 'Bredband', 'Comviq', 'Tre',
  'Mobil', 'Förskola', 'Fritids', 'Fack', 'Privatlån', 'Coop', 'Mat', 'Ost', 'Restaurang', 'Pizza',
  'Bar', 'Bio', 'Konsert', 'Shopping', 'H&M', 'Zalando', 'Clas Ohlson', 'Kjell', 'Normal', 'Power',
  'DN', 'SvD', 'Apple', 'iCloud', 'ChatGPT', 'Claude', 'Steam', 'Okänd firma', 'Blomsteraffär',
  'Hyra', 'Månadsavgift', 'Kortavgift', 'Trängselskatt', 'Vy', 'Ul', 'Transfer', 'Ersättning',
  '  Spotify  ', 'Wolt', 'Max', 'Rusta', 'Hemtex', 'tandläkare', 'Lime', 'SJ', 'Pressbyrån',
];

describe('inferCategoryAndMethodFromName', () => {
  for (const kind of ['fixed', 'income', 'transaction'] as const) {
    test(`alla namn som ${kind}`, () => {
      expect(NAMES.map((n) => [n, inferCategoryAndMethodFromName(n, kind)])).toMatchSnapshot();
    });
  }
});

describe('små hjälpfunktioner', () => {
  test('normalizePaymentMethodName', () => {
    expect(
      [
        undefined, '', 'Kortbetalning', 'Bankgiro / Plusgiro', 'Plusgiro', 'Autogiro', 'autogiro månad',
        'Kort', 'E-faktura', 'efaktura', 'Faktura', 'Swish', 'Kontanter', 'Apple Pay',
      ].map((m) => [m, normalizePaymentMethodName(m)])
    ).toMatchSnapshot();
  });

  test('matchesKeywordSmart', () => {
    const cases: Array<[string, string]> = [
      ['sl biljett', 'sl'], ['slussen', 'sl'], ['ica ', 'ica '], ['ica maxi', 'ica '], ['icakort', 'ica '],
      ['tele2 ab', 'tele2'], ['hotel', 'el'], ['el och värme', 'el'], ['x', ''], ['x', '  '],
      ['a.b', 'a.b'], ['a+b', 'a+'], ['netflix.com', 'netflix'], ['dn.se', 'dn'], ['ica', 'ica '],
    ];
    expect(cases.map(([t, k]) => [t, k, matchesKeywordSmart(t, k)])).toMatchSnapshot();
  });

  test('isSameFixedExpenseName', () => {
    const cases: Array<[string | null | undefined, string | null | undefined]> = [
      ['Netflix', 'netflix'], ['Hyra (Heimstaden)', 'Heimstaden'], ['Hyra', 'Boende'], ['Fastighetsavgift', 'Hyra (X)'],
      ['Telia', 'Tele2'], [null, 'x'], ['x', undefined], ['', ''], ['  Spotify ', 'Spotify Premium'],
    ];
    expect(cases.map(([a, b]) => [a, b, isSameFixedExpenseName(a, b)])).toMatchSnapshot();
  });
});
