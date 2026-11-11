-- Inställningar per nyckel: en enhet skickar bara det den själv har ändrat, och databasen
-- slår ihop det med det som redan finns. Tidigare skrevs hela paketet över, så en telefon
-- med gammal data kunde radera det du nyss ändrat på datorn.
--
-- user_preferences._updatedAt = { nyckel: tidsstämpel } (serverns klocka – ingen klockskillnad
-- mellan enheter). Returnerar de nya tidsstämplarna för nycklarna som skrevs.
create or replace function public.merge_user_preferences(patch jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur jsonb;
  stamps jsonb;
  k text;
  v jsonb;
  stamp text := to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
  written jsonb := '{}'::jsonb;
begin
  if uid is null or patch is null or jsonb_typeof(patch) <> 'object' then
    return written;
  end if;

  select coalesce(user_preferences, '{}'::jsonb) into cur
  from profiles where id = uid
  for update;
  if not found then
    return written;
  end if;

  stamps := coalesce(cur->'_updatedAt', '{}'::jsonb);
  for k, v in select key, value from jsonb_each(patch) loop
    if k in ('_updatedAt', 'updatedAt') then
      continue;
    end if;
    cur := jsonb_set(cur, array[k], v, true);
    stamps := jsonb_set(stamps, array[k], to_jsonb(stamp), true);
    written := jsonb_set(written, array[k], to_jsonb(stamp), true);
  end loop;

  cur := jsonb_set(cur, '{_updatedAt}', stamps, true);
  cur := jsonb_set(cur, '{updatedAt}', to_jsonb(stamp), true);
  update profiles set user_preferences = cur where id = uid;
  return written;
end;
$$;

revoke all on function public.merge_user_preferences(jsonb) from public, anon;
grant execute on function public.merge_user_preferences(jsonb) to authenticated;
