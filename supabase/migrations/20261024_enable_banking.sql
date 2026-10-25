-- Enable Banking Integration Schema & RLS Policies for Dejz
-- Keeps provider session credentials strictly server-side and isolates bank transactions from manual budget transactions.

create extension if not exists "pgcrypto";

-- 1. One-time, time-limited OAuth state tokens tied to a specific authenticated user
create table if not exists public.bank_auth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state_token text not null unique,
  aspsp_name text not null,
  aspsp_country text not null default 'SE',
  aspsp_logo text,
  environment text not null default 'production' check (environment in ('production', 'sandbox')),
  origin_context text not null default 'settings' check (origin_context in ('onboarding', 'settings')),
  return_step text,
  connection_id uuid,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_bank_auth_states_state_token on public.bank_auth_states(state_token);
create index if not exists idx_bank_auth_states_user_id on public.bank_auth_states(user_id);

-- 2. User-facing bank connections (no provider session_id exposed here)
create table if not exists public.bank_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'enable_banking',
  environment text not null default 'production' check (environment in ('production', 'sandbox')),
  aspsp_name text not null,
  aspsp_country text not null default 'SE',
  aspsp_logo text,
  status text not null default 'active' check (status in ('pending_accounts', 'active', 'expired', 'revoked', 'error')),
  valid_until timestamptz,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bank_connections_user_id on public.bank_connections(user_id);

-- 3. Server-only table storing Enable Banking session_id and raw provider tokens (NEVER accessible by client role)
create table if not exists public.bank_provider_sessions (
  connection_id uuid primary key references public.bank_connections(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_session_id text not null,
  raw_access_meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bank_provider_sessions_user_id on public.bank_provider_sessions(user_id);

-- 4. Bank accounts linked to a connection
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.bank_connections(id) on delete cascade,
  provider_account_uid text not null,
  name text not null,
  product text,
  iban text,
  bban text,
  currency text not null default 'SEK',
  is_selected boolean not null default true,
  balance_amount numeric,
  balance_currency text,
  balance_type text,
  balance_label text,
  balances_json jsonb not null default '[]'::jsonb,
  continuation_key text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, provider_account_uid)
);

create index if not exists idx_bank_accounts_user_id on public.bank_accounts(user_id);
create index if not exists idx_bank_accounts_connection_id on public.bank_accounts(connection_id);

-- 5. Fetched bank transactions (isolated from manual budget transactions)
create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.bank_connections(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  external_key text not null,
  entry_reference text,
  transaction_id text,
  booking_status text not null default 'BOOK' check (booking_status in ('BOOK', 'PDNG', 'HOLD', 'OTHR')),
  booking_date date,
  value_date date,
  transaction_date date,
  amount numeric not null,
  currency text not null default 'SEK',
  credit_debit_indicator text,
  description text not null,
  counterparty_name text,
  raw_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bank_account_id, external_key)
);

create index if not exists idx_bank_transactions_user_id on public.bank_transactions(user_id);
create index if not exists idx_bank_transactions_account_id on public.bank_transactions(bank_account_id);
create index if not exists idx_bank_transactions_dates on public.bank_transactions(bank_account_id, booking_date desc nulls last, transaction_date desc nulls last);

-- Row Level Security (RLS)
alter table public.bank_auth_states enable row level security;
alter table public.bank_connections enable row level security;
alter table public.bank_provider_sessions enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;

-- Notice: bank_auth_states and bank_provider_sessions intentionally have NO policies for 'authenticated' or 'anon'.
-- Only the Supabase Edge Function using service_role can read/write them.

drop policy if exists "Users can view own bank connections" on public.bank_connections;
create policy "Users can view own bank connections"
  on public.bank_connections for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can view own bank accounts" on public.bank_accounts;
create policy "Users can view own bank accounts"
  on public.bank_accounts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update own bank account selection" on public.bank_accounts;
create policy "Users can update own bank account selection"
  on public.bank_accounts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own bank transactions" on public.bank_transactions;
create policy "Users can view own bank transactions"
  on public.bank_transactions for select
  to authenticated
  using (auth.uid() = user_id);

-- Reload PostgREST schema cache immediately
notify pgrst, 'reload schema';
