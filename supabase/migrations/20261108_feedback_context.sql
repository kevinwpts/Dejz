-- Feedback och felrapporter från appen
-- Lägger till typ (idé/fel/beröm/krasch), sammanhang (sida, enhet, felmeddelande) och e-post,
-- och tillåter rapporter från personer som inte är inloggade (t.ex. en krasch på startsidan).

alter table public.feedback add column if not exists type text;
alter table public.feedback add column if not exists user_email text;
alter table public.feedback add column if not exists context jsonb;
alter table public.feedback alter column user_id drop not null;
alter table public.feedback alter column created_at set default now();
