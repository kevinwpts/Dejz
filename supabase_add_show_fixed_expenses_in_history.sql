-- SQL för att lägga till inställningar för fasta utgifter och inkomster i historik samt övriga kolumner i Supabase profiles-tabellen.
-- Kopiera och klistra in detta i din Supabase SQL Editor:

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS show_fixed_expenses_in_history BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_fixed_expenses_in_calendar BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_fixed_expenses_in_today_view BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS include_fixed_expenses_in_analysis BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS hide_empty_categories BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS theme_mode TEXT DEFAULT 'system',
ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#3B82F6';

-- Kontrollera att RLS (Row Level Security) tillåter uppdatering:
-- (Om du har standard-RLS aktiverat på profiles-tabellen kan användare uppdatera sin egen rad)
