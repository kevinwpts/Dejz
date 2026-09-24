-- Lägg till kolumnen 'note' i fixed_expenses-tabellen
ALTER TABLE public.fixed_expenses ADD COLUMN IF NOT EXISTS note TEXT;
