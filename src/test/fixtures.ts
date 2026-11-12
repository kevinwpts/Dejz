// Små, typade testdata för skärmtesterna. Varje byggare ger rimliga standardvärden –
// skicka bara in det som testet faktiskt handlar om.
import type { AccountItem, FixedExpenseItem, IncomeItem, TransactionItem } from '../app/models';
import { calculateCurrentPeriod, type PeriodInfo } from '../utils/periodEngine';

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

export function makeTx(overrides: Partial<TransactionItem> = {}): TransactionItem {
  return {
    id: nextId('tx'),
    title: 'Ica Maxi',
    amount: 250,
    category: 'Mat & dryck',
    date: '2026-11-10',
    time: '12:00',
    type: 'expense',
    paymentMethod: 'Kort',
    ...overrides,
  };
}

export function makeFixed(overrides: Partial<FixedExpenseItem> = {}): FixedExpenseItem {
  return {
    id: nextId('fixed'),
    name: 'Netflix',
    amount: 129,
    dueDay: 15,
    category: 'Nöje',
    paymentMethod: 'Kort',
    ...overrides,
  };
}

export function makeIncome(overrides: Partial<IncomeItem> = {}): IncomeItem {
  return {
    id: nextId('inc'),
    name: 'Lön',
    amount: 24800,
    payday: 25,
    category: 'Lön',
    ...overrides,
  };
}

export function makeAccount(overrides: Partial<AccountItem> = {}): AccountItem {
  return {
    id: nextId('acc'),
    name: 'Lönekonto',
    accountNumber: '8327-9 123 456 789',
    bankName: 'Swedbank',
    balance: 12000,
    type: 'checking',
    ...overrides,
  };
}

/** Löneperioden som gäller för `today` (lön den 25:e, flyttas till fredag vid helg). */
export function makePeriod(today: Date, payday = 25): PeriodInfo {
  return calculateCurrentPeriod(today, payday, 'before');
}

/** Text utan hårda mellanslag (Intl skriver 24\u00a0800) och med vanligt minustecken, så att den går att jämföra. */
export const normalizeText = (s: string | null | undefined) =>
  (s ?? '').replace(/[\u00a0\u202f]/g, ' ').replace(/\u2212/g, '-');
