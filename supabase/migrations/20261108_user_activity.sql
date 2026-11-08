-- Aktivitet: "Senast aktiv", "Aktiv nu" och antal besök per användare.
-- Appen anropar touch_activity() när den öppnas och var femte minut medan den är öppen.
--
-- Se i Supabase (Table Editor):
--   user_activity   – alla användare, senast aktiv och antal besök
--   active_now      – de som har varit aktiva de senaste 5 minuterna
--   active_today    – de som har varit aktiva idag

create table if not exists public.user_activity (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  email         text,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  visit_count   integer not null default 1,
  last_platform text
);

alter table public.user_activity enable row level security;

drop policy if exists "Read own activity" on public.user_activity;
create policy "Read own activity" on public.user_activity
  for select using (auth.uid() = user_id);

-- Enda vägen att skriva: uppdaterar bara den inloggades egen rad.
create or replace function public.touch_activity(p_new_visit boolean default false, p_platform text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    return;
  end if;
  select email into v_email from auth.users where id = v_uid;

  insert into public.user_activity (user_id, email, last_platform)
  values (v_uid, v_email, left(p_platform, 40))
  on conflict (user_id) do update set
    email         = excluded.email,
    last_seen_at  = now(),
    last_platform = coalesce(left(p_platform, 40), user_activity.last_platform),
    visit_count   = user_activity.visit_count + case when p_new_visit then 1 else 0 end;
end;
$$;

revoke all on function public.touch_activity(boolean, text) from public;
grant execute on function public.touch_activity(boolean, text) to authenticated;

-- Vyer för dig. security_invoker gör att vanliga användare bara ser sin egen rad.
create or replace view public.active_now with (security_invoker = true) as
  select email, last_seen_at, last_platform
  from public.user_activity
  where last_seen_at > now() - interval '5 minutes'
  order by last_seen_at desc;

create or replace view public.active_today with (security_invoker = true) as
  select email, last_seen_at, visit_count, last_platform
  from public.user_activity
  where last_seen_at > date_trunc('day', now() at time zone 'Europe/Stockholm') at time zone 'Europe/Stockholm'
  order by last_seen_at desc;
