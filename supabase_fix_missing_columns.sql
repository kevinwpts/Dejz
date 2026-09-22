-- SQL för att lägga till saknade kolumner i profiles-tabellen
-- Kopiera och klistra in detta i Supabase SQL Editor

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS savings_pot NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS savings_goals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_saved_lifetime NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS surplus_income NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_savings NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_savings_items JSONB DEFAULT '[]'::jsonb;

-- Säkerställ att RLS-policyer tillåter uppdatering av dessa kolumner (de borde redan göra det om du har standardprofil-policyn)
-- Men för säkerhets skull, här är policyn igen:
-- CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
