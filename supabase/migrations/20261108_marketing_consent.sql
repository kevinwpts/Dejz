-- Samtycke till nyhetsbrev och tips via mejl (opt-in).
-- En rad per användare. consented = true betyder att personen själv kryssat i rutan.
-- Lista vilka du får skicka nyhetsbrev till:
--   select email, consented_at from public.marketing_consent where consented order by consented_at;

create table if not exists public.marketing_consent (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        text,
  consented    boolean not null default false,
  consented_at timestamptz,
  source       text,          -- var svaret gavs: registrering, introduktion, profil
  updated_at   timestamptz not null default now()
);

alter table public.marketing_consent enable row level security;

drop policy if exists "Read own consent" on public.marketing_consent;
create policy "Read own consent" on public.marketing_consent
  for select using (auth.uid() = user_id);

drop policy if exists "Insert own consent" on public.marketing_consent;
create policy "Insert own consent" on public.marketing_consent
  for insert with check (auth.uid() = user_id);

drop policy if exists "Update own consent" on public.marketing_consent;
create policy "Update own consent" on public.marketing_consent
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
