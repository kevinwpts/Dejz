import type { FixedExpense, Income } from '../types';
import type { Database, Json } from '../types/database';

/**
 * Översättning mellan fasta utgifter/inkomster i appen och raderna i databasen.
 * Fält som saknar egen kolumn (t.ex. sista betalning, delad utgift) sparas i `period_overrides` med _-prefix.
 */
type Tables = Database['public']['Tables'];
export type FixedExpenseRow = Tables['fixed_expenses']['Row'];
export type FixedExpenseInsert = Tables['fixed_expenses']['Insert'];
export type IncomeSourceRow = Tables['income_sources']['Row'];
export type IncomeSourceInsert = Tables['income_sources']['Insert'];

type Overrides = { [key: string]: Json | undefined };

/**
 * Appens objekt (kategorier, sparmål, splits …) sparas i JSON-kolumner.
 * De är vanlig JSON, men TypeScript kan inte koppla ihop ett `interface` med `Json`
 * (interface saknar indexsignatur) – åt något håll. Därför de här två avsiktliga typomvandlingarna,
 * samlade på ett ställe i stället för utspridda `as unknown as`.
 */
export function toJson(value: unknown): Json {
  return value as Json;
}

/** Läser en JSON-kolumn som appens typ. Ingen kontroll görs – datan är den appen själv har sparat. */
export function fromJson<T>(value: Json | null | undefined): T {
  return value as unknown as T;
}

const isUuid = (id?: string) =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

const present = (v: unknown) => v !== undefined && v !== null;

/** Fält som bara sparas i period_overrides och därför rensas innan de skrivs på nytt. */
const FIXED_META_KEYS = [
  '_is_cancelled',
  '_cancellation_date',
  '_cancelled_at',
  '_last_payment_date',
  '_has_no_more_payments',
  '_cancellation_scenario',
  '_is_shared',
  '_full_amount',
  '_receipt_url',
  '_receipt_name',
];

export type FixedExpenseInput = FixedExpense & {
  originalName?: string;
  isShared?: boolean;
  fullAmount?: number;
  receiptUrl?: string;
  receiptName?: string;
};

export type FixedExpenseRecord = FixedExpenseInput & {
  periodOverrides: Record<string, number>;
};

export function fixedExpenseToRow(userId: string, expense: FixedExpenseInput): FixedExpenseInsert {
  const base: Overrides = { ...(expense.periodOverrides || {}) };
  for (const key of FIXED_META_KEYS) delete base[key];

  const cancelled = Boolean(expense.isCancelled);
  const periodOverrides: Overrides = {
    ...base,
    ...(expense.originalName ? { _original_name: expense.originalName } : {}),
    ...(expense.isShared ? { _is_shared: true } : {}),
    ...(present(expense.fullAmount) ? { _full_amount: expense.fullAmount } : {}),
    ...(expense.receiptUrl ? { _receipt_url: expense.receiptUrl } : {}),
    ...(expense.receiptName ? { _receipt_name: expense.receiptName } : {}),
    ...(present(expense.startMonth) ? { _start_month: expense.startMonth } : {}),
    ...(cancelled
      ? {
          _is_cancelled: true,
          ...(expense.cancellationDate ? { _cancellation_date: expense.cancellationDate } : {}),
          ...(expense.cancelledAt ? { _cancelled_at: expense.cancelledAt } : {}),
          ...(expense.lastPaymentDate ? { _last_payment_date: expense.lastPaymentDate } : {}),
          _has_no_more_payments: Boolean(expense.hasNoMorePayments),
          ...(expense.cancellationScenario ? { _cancellation_scenario: expense.cancellationScenario } : {}),
        }
      : {}),
  };

  return {
    id: isUuid(expense.id) ? expense.id : undefined,
    user_id: userId,
    name: expense.name,
    amount: expense.amount,
    payment_method: expense.paymentMethod,
    frequency: expense.frequency,
    ...(expense.icon ? { icon: expense.icon } : {}),
    category: expense.category,
    logo: expense.logo,
    deduction_day: expense.deductionDay,
    ...(expense.startMonth !== undefined ? { start_month: expense.startMonth } : {}),
    ...(expense.isVariable !== undefined ? { is_variable: expense.isVariable } : {}),
    period_overrides: periodOverrides,
    ...(expense.note && expense.note.trim() ? { note: expense.note.trim() } : {}),
    ...(cancelled
      ? {
          is_cancelled: true,
          ...(expense.cancellationDate ? { cancellation_date: expense.cancellationDate } : {}),
          ...(expense.cancelledAt ? { cancelled_at: expense.cancelledAt } : {}),
        }
      : // "Ångra uppsägning" måste nollställa kolumnerna, annars är den uppsagd igen efter omladdning
        { is_cancelled: false, cancellation_date: null, cancelled_at: null }),
  };
}

export function fixedExpenseFromRow(e: Partial<FixedExpenseRow> & { id: string }): FixedExpenseRecord {
  const po = (e.period_overrides as Overrides | null) || {};
  return {
    id: e.id,
    name: e.name as string,
    originalName: (po._original_name as string) || undefined,
    amount: Number(e.amount),
    isShared: Boolean(po._is_shared),
    fullAmount: present(po._full_amount) ? Number(po._full_amount) : undefined,
    receiptUrl: (po._receipt_url as string) || undefined,
    receiptName: (po._receipt_name as string) || undefined,
    paymentMethod: e.payment_method as string,
    frequency: e.frequency as FixedExpense['frequency'],
    icon: e.icon as string | undefined,
    category: e.category as string,
    logo: e.logo as string | undefined,
    deductionDay: e.deduction_day as number | undefined,
    startMonth: present(e.start_month)
      ? (e.start_month as number)
      : present(po._start_month)
      ? Number(po._start_month)
      : undefined,
    isVariable: e.is_variable as boolean | undefined,
    periodOverrides: po as Record<string, number>,
    note: (e.note as string) || undefined,
    isCancelled: Boolean(e.is_cancelled || po._is_cancelled),
    cancellationDate: (e.cancellation_date || po._cancellation_date || undefined) as string | undefined,
    cancelledAt: (e.cancelled_at || po._cancelled_at || undefined) as number | undefined,
    lastPaymentDate: (po._last_payment_date || undefined) as string | undefined,
    hasNoMorePayments: Boolean(po._has_no_more_payments ?? false),
    cancellationScenario: (po._cancellation_scenario || undefined) as
      | FixedExpense['cancellationScenario']
      | undefined,
  };
}

export type IncomeInput = Income & { originalName?: string };

export function incomeToRow(userId: string, income: IncomeInput): IncomeSourceInsert {
  return {
    id: isUuid(income.id) ? income.id : undefined,
    user_id: userId,
    name: income.name,
    amount: income.amount,
    category: income.category,
    icon: income.icon,
    logo: income.logo,
    deduction_day: income.deductionDay,
    is_variable: income.isVariable,
    period_overrides: {
      ...(income.periodOverrides || {}),
      ...(income.originalName ? { _original_name: income.originalName } : {}),
    },
    note: income.note && income.note.trim() ? income.note.trim() : null,
  };
}

export function incomeFromRow(
  i: Partial<IncomeSourceRow> & { id: string }
): IncomeInput & { periodOverrides: Record<string, number> } {
  const po = (i.period_overrides as Overrides | null) || {};
  return {
    id: i.id,
    name: i.name as string,
    originalName: (po._original_name as string) || undefined,
    amount: Number(i.amount),
    category: i.category as string | undefined,
    icon: i.icon as string | undefined,
    logo: i.logo as string | undefined,
    deductionDay: i.deduction_day as number | undefined,
    isVariable: i.is_variable as boolean | undefined,
    periodOverrides: po as Record<string, number>,
    note: (i.note as string) || undefined,
  };
}
