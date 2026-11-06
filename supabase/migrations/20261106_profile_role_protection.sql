-- Stänger ett säkerhetshål innan registreringen öppnar:
-- inloggade användare kunde sätta profiles.role = 'admin' på sin egen profil och därmed
-- passera is_admin()-reglerna (t.ex. läsa andras konton). Den gamla protect_pro_fields
-- var aldrig kopplad och pekade på kolumner som inte finns.

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Gäller bara anrop från appen (anon/authenticated). Servern och Supabase själv påverkas inte.
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.role := 'user';
      new.stripe_customer_id := null;
    else
      new.role := old.role;
      new.stripe_customer_id := old.stripe_customer_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before insert or update on public.profiles
  for each row execute function public.protect_profile_role();

drop function if exists public.protect_pro_fields();

-- Fast search_path på funktioner (Supabase-varning "Function Search Path Mutable")
alter function public.update_updated_at_column() set search_path = public;
alter function public.is_admin() set search_path = public;
alter function public.handle_new_user() set search_path = public;

-- Interna funktioner ska inte gå att anropa direkt via API:t
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
