-- Egen e-postverifiering: man kommer in direkt utan att bekräfta, och kan verifiera e-posten
-- senare från profilen. Supabase "Confirm email" är avstängt, så Supabase markerar alla som
-- bekräftade – därför håller vi koll själva här.

create table if not exists public.email_verification (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text,
  token_hash  text,
  sent_at     timestamptz,
  verified_at timestamptz
);

alter table public.email_verification enable row level security;

-- Användaren får bara läsa sin egen status. Skrivningar sker i funktionen email-verification.
drop policy if exists "Read own verification" on public.email_verification;
create policy "Read own verification" on public.email_verification
  for select using (auth.uid() = user_id);

create index if not exists email_verification_token_idx on public.email_verification (token_hash);
