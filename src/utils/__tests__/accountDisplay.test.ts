import { describe, expect, test } from 'vitest';
import { describeAccount } from '../accountDisplay';
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
