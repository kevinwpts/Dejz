-- Prestanda (Supabase-granskning 2026-11-11): räkna ut inloggad användare EN gång per fråga i stället
-- för en gång per rad. Samma regler som förut – bara auth.uid() → (select auth.uid()).
do $$
declare
  p record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies where schemaname = 'public' loop
    new_qual := replace(replace(p.qual, '(select auth.uid())', '§§'), 'auth.uid()', '(select auth.uid())');
    new_qual := replace(new_qual, '§§', '(select auth.uid())');
    new_check := replace(replace(p.with_check, '(select auth.uid())', '§§'), 'auth.uid()', '(select auth.uid())');
    new_check := replace(new_check, '§§', '(select auth.uid())');
    if new_qual is distinct from p.qual or new_check is distinct from p.with_check then
      stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
      if p.qual is not null then stmt := stmt || format(' using (%s)', new_qual); end if;
      if p.with_check is not null then stmt := stmt || format(' with check (%s)', new_check); end if;
      execute stmt;
    end if;
  end loop;
end $$;
