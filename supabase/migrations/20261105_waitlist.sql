-- Väntelista för Dejz
-- Kör hela filen en gång i Supabase: SQL Editor -> New query -> klistra in -> Run.

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  source      text,          -- Var personen hittade Dejz (tiktok, instagram, vän, ...)
  pain        text,          -- Vad som är svårast med ekonomin
  utm_source  text,          -- Fylls i automatiskt från länkar som dejz.se/?utm_source=tiktok
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Låst tabell: ingen kan läsa eller ändra direkt från webbläsaren.
alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;

-- Enda vägen in: den här funktionen. Den lägger till eller kompletterar en rad
-- men kan aldrig läsa ut andras e-postadresser.
create or replace function public.join_waitlist(
  p_email text,
  p_source text default null,
  p_pain text default null,
  p_utm_source text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
begin
  if v_email is null
     or length(v_email) > 254
     or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;

  insert into public.waitlist (email, source, pain, utm_source)
  values (
    v_email,
    left(nullif(trim(p_source), ''), 60),
    left(nullif(trim(p_pain), ''), 500),
    left(nullif(trim(p_utm_source), ''), 60)
  )
  on conflict (email) do update set
    source     = coalesce(excluded.source, waitlist.source),
    pain       = coalesce(excluded.pain, waitlist.pain),
    utm_source = coalesce(waitlist.utm_source, excluded.utm_source),
    updated_at = now();
end;
$$;

revoke all on function public.join_waitlist(text, text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text, text) to anon, authenticated;
