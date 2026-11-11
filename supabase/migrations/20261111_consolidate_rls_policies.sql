-- Städar dubbla säkerhetsregler (RLS). Många tabeller hade 3–8 regler som alla sa samma sak:
-- "bara dina egna rader". Postgres måste då pröva varje regel för varje rad. Resultatet blir
-- exakt samma behörighet – bara färre regler att pröva.
--
-- Behörigheten före = unionen av alla regler. Efter = samma union, i en regel per kommando.

-- fixed_expenses, income_sources, transactions: allt är "egna rader" → en ALL-regel räcker
drop policy if exists "Users can manage fixed expenses" on public.fixed_expenses;
drop policy if exists "Users can manage own fixed_expenses" on public.fixed_expenses;
drop policy if exists "Users can manage their own expenses" on public.fixed_expenses;
drop policy if exists "Users can delete own fixed_expenses" on public.fixed_expenses;
drop policy if exists "Users can insert own fixed_expenses" on public.fixed_expenses;
drop policy if exists "Users can view own fixed_expenses" on public.fixed_expenses;
drop policy if exists "Users can update own fixed_expenses" on public.fixed_expenses;
-- kvar: "Users manage own fixed_expenses" (ALL, using + with check = egen rad)

drop policy if exists "Users can manage income sources" on public.income_sources;
drop policy if exists "Users can manage own income_sources" on public.income_sources;
drop policy if exists "Users can manage their own income" on public.income_sources;
drop policy if exists "Users can delete own income_sources" on public.income_sources;
drop policy if exists "Users can insert own income_sources" on public.income_sources;
drop policy if exists "Users can view own income_sources" on public.income_sources;
drop policy if exists "Users can update own income_sources" on public.income_sources;
-- kvar: "Users manage own income_sources"

drop policy if exists "Users can manage own transactions" on public.transactions;
drop policy if exists "Users can manage their own transactions" on public.transactions;
drop policy if exists "Users can delete own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can view own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
-- kvar: "Users manage own transactions"

-- savings_goals: kvar "Users can manage savings goals" (ALL, egen rad)
drop policy if exists "Users can delete own savings_goals" on public.savings_goals;
drop policy if exists "Users can insert own savings_goals" on public.savings_goals;
drop policy if exists "Users can view own savings_goals" on public.savings_goals;
drop policy if exists "Users can update own savings_goals" on public.savings_goals;

-- bank_*: ALL-regeln (egen rad) täcker redan läsning och uppdatering
drop policy if exists "Users can view own bank accounts" on public.bank_accounts;
drop policy if exists "Users can update own bank account selection" on public.bank_accounts;
drop policy if exists "Users can view own bank connections" on public.bank_connections;
drop policy if exists "Users can view own bank transactions" on public.bank_transactions;
drop policy if exists "Users can update own bank transactions reconciliation" on public.bank_transactions;

-- feedback: "Users can insert feedback" (egen rad eller utan konto) täcker "insert own"
drop policy if exists "Users can insert own feedback" on public.feedback;

-- savings_pot_transactions: de svenska reglerna är delmängder av de engelska (som även tillåter admin)
drop policy if exists "Användare kan ta bort sina egna transaktioner" on public.savings_pot_transactions;
drop policy if exists "Användare kan lägga till sina egna transaktioner" on public.savings_pot_transactions;
drop policy if exists "Användare kan se sina egna transaktioner" on public.savings_pot_transactions;

-- accounts: två identiska ALL-regler + per-kommando-regler med admin. Ersätts av en regel per kommando.
drop policy if exists "Users can manage accounts" on public.accounts;
drop policy if exists "Users can manage own accounts" on public.accounts;
drop policy if exists "Users can delete own accounts" on public.accounts;
drop policy if exists "Users can insert own accounts" on public.accounts;
drop policy if exists "Users can view own accounts" on public.accounts;
drop policy if exists "Users can update own accounts" on public.accounts;
create policy "accounts_select_own_or_admin" on public.accounts for select
  using (((select auth.uid()) = user_id) or is_admin());
create policy "accounts_insert_own" on public.accounts for insert
  with check ((select auth.uid()) = user_id);
create policy "accounts_update_own_or_admin" on public.accounts for update
  using (((select auth.uid()) = user_id) or is_admin())
  with check (((select auth.uid()) = user_id) or is_admin());
create policy "accounts_delete_own_or_admin" on public.accounts for delete
  using (((select auth.uid()) = user_id) or is_admin());

-- Index för främmande nycklar (snabbare radering och kopplingar)
create index if not exists idx_bank_transactions_connection_id on public.bank_transactions (connection_id);
create index if not exists idx_bank_transactions_linked_transfer on public.bank_transactions (linked_transfer_bank_tx_id);
create index if not exists idx_bank_transactions_replaced_by on public.bank_transactions (replaced_by_bank_tx_id);
create index if not exists idx_feedback_user_id on public.feedback (user_id);
create index if not exists idx_incomes_user_id on public.incomes (user_id);
create index if not exists idx_monthly_savings_user_id on public.monthly_savings (user_id);
create index if not exists idx_transactions_bank_account_id on public.transactions (bank_account_id);
create index if not exists idx_transactions_bank_transaction_id on public.transactions (bank_transaction_id);
