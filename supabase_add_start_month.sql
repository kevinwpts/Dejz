-- SQL för att lägga till kolumnen start_month i fixed_expenses-tabellen
-- Kopiera och klistra in detta i din Supabase SQL Editor om du vill ha den dedikerade kolumnen i databasen

ALTER TABLE public.fixed_expenses 
ADD COLUMN IF NOT EXISTS start_month INTEGER;

-- Ladda om PostgREST schemacache
NOTIFY pgrst, 'reload schema';
