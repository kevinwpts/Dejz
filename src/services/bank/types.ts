// Datatyper för bankkopplingen (banker, kopplingar, konton och banktransaktioner).
import type { BankRawJson } from '../../app/models';
import type { Json } from '../../types/database';

export type BankEnvironment = 'production' | 'sandbox';

type BankReconciliationStatus =
  | 'unprocessed'
  | 'imported_as_purchase'
  | 'matched_manual_tx'
  | 'confirmed_fixed_expense'
  | 'confirmed_income'
  | 'confirmed_saving'
  | 'internal_transfer'
  | 'refund_linked'
  | 'needs_review'
  | 'excluded'
  | 'reserved'
  | 'reserved_pending'
  | 'reserved_replaced';

export interface BankAspsp {
  name: string;
  country: string;
  logo: string | null;
  bic: string | null;
  maximumConsentValidity?: number;
}

export interface BankConnection {
  id: string;
  user_id: string;
  aspsp_name: string;
  aspsp_country: string;
  aspsp_logo: string | null;
  environment: BankEnvironment;
  status: 'active' | 'expired' | 'revoked' | 'error';
  valid_until: string | null;
  days_until_expiry?: number | null;
  expiring_soon?: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  bankName?: string;
  connection_id: string;
  user_id: string;
  provider_account_uid: string;
  name: string;
  custom_name?: string | null;
  product: string | null;
  iban: string | null;
  bban: string | null;
  currency: string;
  is_selected: boolean;
  include_in_budget?: boolean;
  import_start_date?: string | null;
  reconciliation_completed_at?: string | null;
  ongoing_import_enabled?: boolean;
  has_incomplete_history?: boolean;
  stable_account_key?: string | null;
  balance_amount: number | null;
  balance_currency: string | null;
  balance_type: string | null;
  balance_label: string | null;
  balances_json: unknown[];
  continuation_key: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankTransactionItem {
  id: string;
  user_id: string;
  connection_id: string;
  bank_account_id: string;
  external_key: string;
  entry_reference: string | null;
  transaction_id: string | null;
  booking_status: 'BOOK' | 'PDNG' | 'HOLD' | 'SCHD' | 'CNCL' | 'RJCT' | 'OTHR';
  booking_date: string | null;
  value_date: string | null;
  transaction_date: string | null;
  amount: number;
  currency: string;
  credit_debit_indicator: 'CRDT' | 'DBIT' | null;
  description: string;
  counterparty_name: string | null;
  raw_json?: BankRawJson;
  reconciliation_status?: BankReconciliationStatus;
  linked_transaction_id?: string | null;
  linked_fixed_expense_id?: string | null;
  linked_income_id?: string | null;
  linked_saving_id?: string | null;
  linked_period_key?: string | null;
  planned_amount_at_match?: number | null;
  linked_transfer_bank_tx_id?: string | null;
  linked_refund_transaction_id?: string | null;
  replaced_by_bank_tx_id?: string | null;
  reservation_disappeared_at?: string | null;
  review_reason?: string | null;
  user_decision_at?: string | null;
  previous_reconciliation_state?: { [key: string]: Json | undefined } | null;
  created_at: string;
  updated_at: string;
}
