// Karaktäriseringstester: låser exakt vad bankhistorik-analysen ger i dag,
// så att omstruktureringar av koden inte ändrar beteendet.
import './setupTz';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import {
  analyzeBankTransactionsForOnboarding,
  extractOnboardingAiCandidates,
  formatDateWithWeekday,
  getBankTxCodeDescription,
  runCoreBankDetection,
} from '../history';
import {
  ELIN_ACCOUNTS,
  FIXED_NOW,
  account,
  edgeDatesHistory,
  elinHistory,
  gapFillHistory,
  irregularIncomeHistory,
  manyMerchantsHistory,
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
  manyMerchants: manyMerchantsHistory,
  gapFill: gapFillHistory,
};

const paydaySettings: Array<[number, boolean]> = [
  [25, true],
  [1, false],
  [31, true],
];

describe('runCoreBankDetection', () => {
  for (const [name, build] of Object.entries(scenarios)) {
    test(`${name} utan konton`, () => {
      expect(runCoreBankDetection(build())).toMatchSnapshot();
    });
    test(`${name} med Elins konton`, () => {
      expect(runCoreBankDetection(build(), 25, true, ELIN_ACCOUNTS)).toMatchSnapshot();
    });
  }

  test('tom lista', () => {
    expect(runCoreBankDetection([])).toMatchSnapshot();
  });
});

describe('analyzeBankTransactionsForOnboarding', () => {
  for (const [name, build] of Object.entries(scenarios)) {
    for (const [payday, before] of paydaySettings) {
      test(`${name} lönedag ${payday} ${before ? 'före helg' : 'ingen justering'}`, () => {
        expect(
          analyzeBankTransactionsForOnboarding(build(), payday, before, ELIN_ACCOUNTS)
        ).toMatchSnapshot();
      });
    }
  }

  test('tom lista och standardvärden', () => {
    expect(analyzeBankTransactionsForOnboarding([])).toMatchSnapshot();
  });

  test('bara en ensam inkomst utan lönemönster ger ingen lönedag från appen', () => {
    const rows = [tx({ date: '2026-10-25', amount: 900, desc: 'Present' })];
    expect(analyzeBankTransactionsForOnboarding(rows, 0, true)).toMatchSnapshot();
  });
});

describe('extractOnboardingAiCandidates', () => {
  for (const [name, build] of Object.entries(scenarios)) {
    test(name, () => {
      expect(extractOnboardingAiCandidates(build(), 25, true, ELIN_ACCOUNTS)).toMatchSnapshot();
    });
  }

  test('utan konton (personnamn och sparkonton kan bli kandidater)', () => {
    expect(extractOnboardingAiCandidates(irregularIncomeHistory())).toMatchSnapshot();
  });

  test('tom lista', () => {
    expect(extractOnboardingAiCandidates([])).toMatchSnapshot();
  });

  test('konto med annat namn påverkar kandidaterna', () => {
    const accounts = [account({ id: 'acc1', name: 'Kund A0 AB', product: 'Företagskonto' })];
    expect(extractOnboardingAiCandidates(manyMerchantsHistory(), 25, true, accounts)).toMatchSnapshot();
  });
});

describe('små hjälpfunktioner', () => {
  test('getBankTxCodeDescription', () => {
    const rows = [
      tx({ date: '2026-10-01', amount: -1, desc: 'a', rawJson: { bank_transaction_code: { description: '  Direct Debit ' } } }),
      tx({ date: '2026-10-01', amount: -1, desc: 'b' }),
      tx({ date: '2026-10-01', amount: -1, desc: 'c', rawJson: {} }),
    ];
    expect(rows.map(getBankTxCodeDescription)).toEqual(['direct debit', '', '']);
  });

  test('formatDateWithWeekday', () => {
    expect(
      ['2026-11-12', '2024-02-29', '2026-01-04T10:00:00Z', 'not-a-date', ''].map(formatDateWithWeekday)
    ).toMatchSnapshot();
  });
});

describe('löneperiodens startdatum', () => {
  // Fixat: datumet skrevs i UTC, där svensk midnatt är dagen före – perioden började en dag för tidigt
  // och "spenderat sedan lön" tog med köp från dagen innan lönen.
  test('lön den 25:e som infaller en söndag börjar fredagen före (23/10), inte torsdag', () => {
    expect(runCoreBankDetection([], 25, true).periodStartIso).toBe('2026-10-23');
  });
});
