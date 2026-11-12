// Karaktäriseringstester: låser exakt vad sammanslagningen för befintliga användare ger i dag.
import './setupTz';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import {
  inferCategoryAndMethodFromName,
  isSameFixedExpenseName,
  matchesKeywordSmart,
  normalizePaymentMethodName,
} from '../existingBudget';
import { FIXED_NOW } from './fixtures';

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FIXED_NOW);
});
afterAll(() => {
  vi.useRealTimers();
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
