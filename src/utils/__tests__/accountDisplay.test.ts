import { describe, expect, test } from 'vitest';
import { describeAccount, formatAccountNumberShort } from '../accountDisplay';
import type { AccountItem } from '../../app/models';

const account = (accountNumber = ''): AccountItem => ({
  id: 'a1',
  name: 'Lönekonto',
  bankName: 'Swedbank',
  type: 'checking',
  balance: 0,
  accountNumber,
});

describe('describeAccount', () => {
  test('hittar aldrig på ett nummer', () => {
    expect(describeAccount('', undefined)).toEqual({ label: 'Lönekonto', fullNumber: null, maskedNumber: null });
    expect(describeAccount('', account())).toEqual({ label: 'Swedbank · Lönekonto', fullNumber: null, maskedNumber: null });
  });
  test('visar hela numret när det är känt', () => {
    expect(describeAccount('', account('8327-9 912 345 678'))).toEqual({
      label: 'Swedbank · Lönekonto',
      fullNumber: '8327-9 912 345 678',
      maskedNumber: '•••• 5678',
    });
  });
  test('med bara fyra siffror visas samma maskade form', () => {
    expect(describeAccount('', account('4821'))).toEqual({
      label: 'Swedbank · Lönekonto',
      fullNumber: '•••• 4821',
      maskedNumber: '•••• 4821',
    });
  });
});

describe('formatAccountNumberShort', () => {
  test('clearing + fyra sista', () => {
    expect(formatAccountNumberShort('83279123456789')).toBe('8327-9 ··· 6789');
    expect(formatAccountNumberShort('8327-9 912 345 678')).toBe('8327-9 ··· 5678');
    expect(formatAccountNumberShort('50001234567')).toBe('5000 ··· 4567');
  });
  test('IBAN och korta nummer visar bara slutet', () => {
    expect(formatAccountNumberShort('SE4550000000058398257466')).toBe('··· 7466');
    expect(formatAccountNumberShort('1234567')).toBe('··· 4567');
    expect(formatAccountNumberShort('12')).toBe('12');
  });
});
