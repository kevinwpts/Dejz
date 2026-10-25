-- Dejz Bank & Manual Budget Unified Integration Migration
-- Preserves existing data and extends bank_accounts, bank_transactions, and transactions
-- for 1-to-1 reconciliation, per-period fixed/income/saving fulfillment, reservation tracking, and ongoing import.

-- 1. Extend bank_accounts with import settings, custom naming, and stable account identity
alter table public.bank_accounts
  add column if not exists custom_name text,
  add column if not exists include_in_budget boolean not null default true,
  add column if not exists import_start_date date,
  add column if not exists reconciliation_completed_at timestamptz,
  add column if not exists ongoing_import_enabled boolean not null default false,
  add column if not exists has_incomplete_history boolean not null default false,
  add column if not exists stable_account_key text;

create index if not exists idx_bank_accounts_stable_key
  on public.bank_accounts(user_id, stable_account_key)
  where stable_account_key is not null;

-- 2. Extend booking_status constraint on bank_transactions to support all Enable Banking statuses
alter table public.bank_transactions
  drop constraint if exists bank_transactions_booking_status_check;

alter table public.bank_transactions
  add constraint bank_transactions_booking_status_check
  check (booking_status in ('BOOK', 'PDNG', 'HOLD', 'SCHD', 'CNCL', 'RJCT', 'OTHR'));

-- 3. Extend bank_transactions with reconciliation & fulfillment links
-- Note: Original bank columns (amount, currency, credit_debit_indicator, booking_date, transaction_date,
-- value_date, description, counterparty_name, raw_json) remain strictly immutable bank source data.
alter table public.bank_transactions
  add column if not exists reconciliation_status text not null default 'unprocessed'
    check (reconciliation_status in (
      'unprocessed',
      'imported',
      'matched_manual',
      'matched_fixed',
      'matched_income',
      'matched_saving',
      'matched_transfer',
      'matched_refund',
      'reserved',
      'needs_review',
      'excluded'
    )),
  add column if not exists linked_transaction_id text,
  add column if not exists linked_fixed_expense_id text,
  add column if not exists linked_income_id text,
  add column if not exists linked_saving_id text,
  add column if not exists linked_period_key text,
  add column if not exists planned_amount_at_match numeric,
  add column if not exists linked_transfer_bank_tx_id uuid references public.bank_transactions(id) on delete set null,
  add column if not exists linked_refund_transaction_id text,
  add column if not exists replaced_by_bank_tx_id uuid references public.bank_transactions(id) on delete set null,
  add column if not exists reservation_disappeared_at timestamptz,
  add column if not exists review_reason text,
  add column if not exists user_decision_at timestamptz,
  add column if not exists previous_reconciliation_state jsonb;

-- Enforce 1-to-1 link: each Dejz transaction can be linked to at most one bank transaction
create unique index if not exists idx_bank_transactions_unique_linked_tx
  on public.bank_transactions(user_id, linked_transaction_id)
  where linked_transaction_id is not null;

-- Enforce 1-to-1 fulfillment per period occasion for fixed expenses, incomes, and savings
create index if not exists idx_bank_transactions_reconciliation_status
  on public.bank_transactions(user_id, reconciliation_status);

create index if not exists idx_bank_transactions_period_links
  on public.bank_transactions(user_id, linked_period_key)
  where linked_period_key is not null;

-- 4. Allow authenticated users to update reconciliation columns on their own bank_transactions
drop policy if exists "Users can update own bank transactions reconciliation" on public.bank_transactions;
create policy "Users can update own bank transactions reconciliation"
  on public.bank_transactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. Extend public.transactions with optional bank provenance reference (without overwriting user edits)
alter table public.transactions
  add column if not exists bank_transaction_id uuid,
  add column if not exists bank_account_id uuid,
  add column if not exists original_bank_description text,
  add column if not exists original_bank_amount numeric,
  add column if not exists original_bank_currency text,
  add column if not exists refund_of_transaction_id text;

create unique index if not exists idx_transactions_unique_bank_tx
  on public.transactions(user_id, bank_transaction_id)
  where bank_transaction_id is not null;

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
