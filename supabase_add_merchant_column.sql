-- SQL för att lägga till merchant-kolumnen i transactions-tabellen
-- Kopiera och klistra in detta i Supabase SQL Editor

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS merchant TEXT;

-- Uppdatera RLS-policyer om det behövs (de borde redan täcka nya kolumner)
