-- Säkerhet (Supabase-granskning 2026-11-11)
-- touch_activity: bara inloggade (den gör ändå inget utan inloggning)
revoke execute on function public.touch_activity(boolean, text) from anon;

-- join_waitlist: väntelistan används inte längre (registreringen är öppen) – stäng så att ingen kan spamma den.
-- Öppna igen med: grant execute on function public.join_waitlist(text, text, text, text, text, integer) to anon, authenticated;
revoke execute on function public.join_waitlist(text, text, text, text, text, integer) from anon, authenticated, public;
