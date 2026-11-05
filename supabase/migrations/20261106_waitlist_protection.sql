-- Väntelista: spamskydd, köplats och tackmejl
-- Kör hela filen en gång i Supabase: SQL Editor -> New query -> klistra in -> Run.
-- Kräver att 20261105_waitlist.sql redan är körd.

create extension if not exists pgcrypto with schema extensions;

-- När tackmejlet skickades (null = inte skickat än)
alter table public.waitlist add column if not exists welcome_sent_at timestamptz;

-- Kortlivad logg för att begränsa hur många nya adresser en och samma
-- uppkoppling kan skriva upp per timme. Bara en envägskrypterad kod av
-- IP-adressen sparas, och raderna rensas efter 24 timmar.
create table if not exists public.waitlist_attempts (
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index if not exists waitlist_attempts_ip_time on public.waitlist_attempts (ip_hash, created_at);
alter table public.waitlist_attempts enable row level security;
revoke all on public.waitlist_attempts from anon, authenticated;

-- Den gamla versionen returnerade ingenting – ersätt den
drop function if exists public.join_waitlist(text, text, text, text);

-- Returnerar personens plats i kön (1, 2, 3 ...). 0 betyder att anropet
-- stoppades av spamskyddet (boten får ingen ledtråd om varför).
create or replace function public.join_waitlist(
  p_email      text,
  p_source     text default null,
  p_pain       text default null,
  p_utm_source text default null,
  p_website    text default null,   -- dolt fält: människor lämnar det tomt, botar fyller i
  p_elapsed_ms integer default null -- hur länge formuläret var öppet innan det skickades
) returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email     text := lower(trim(p_email));
  v_headers   json;
  v_ip        text := '';
  v_ip_hash   text;
  v_recent    integer;
  v_inserted  boolean;
  v_created   timestamptz;
  v_position  integer;
begin
  -- 1. Dolt fält ifyllt eller orimligt snabbt ifyllt formulär = bot
  if coalesce(trim(p_website), '') <> '' then
    return 0;
  end if;
  if p_elapsed_ms is not null and p_elapsed_ms < 1200 then
    return 0;
  end if;

  if v_email is null
     or length(v_email) > 254
     or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' then
    raise exception 'invalid_email';
  end if;

  -- 2. Begränsa antal nya adresser per uppkoppling
  begin
    v_headers := current_setting('request.headers', true)::json;
    v_ip := trim(split_part(coalesce(v_headers->>'x-forwarded-for', v_headers->>'cf-connecting-ip', ''), ',', 1));
  exception when others then
    v_ip := '';
  end;

  delete from public.waitlist_attempts where created_at < now() - interval '24 hours';

  if v_ip <> '' then
    v_ip_hash := encode(extensions.digest('dejz-waitlist:' || v_ip, 'sha256'), 'hex');

    if not exists (select 1 from public.waitlist where email = v_email) then
      select count(*) into v_recent
      from public.waitlist_attempts
      where ip_hash = v_ip_hash and created_at > now() - interval '1 hour';

      if v_recent >= 8 then
        raise exception 'rate_limited';
      end if;
    end if;
  end if;

  -- 3. Lägg till eller komplettera
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
    updated_at = now()
  returning (xmax = 0), created_at into v_inserted, v_created;

  if v_inserted and v_ip_hash is not null then
    insert into public.waitlist_attempts (ip_hash) values (v_ip_hash);
  end if;

  select count(*) into v_position from public.waitlist where created_at <= v_created;
  return v_position;
end;
$$;

revoke all on function public.join_waitlist(text, text, text, text, text, integer) from public;
grant execute on function public.join_waitlist(text, text, text, text, text, integer) to anon, authenticated;
