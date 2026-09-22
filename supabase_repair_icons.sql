-- REPAIR SCRIPT FOR ICONS AND LOGOS
-- Copy and paste this into the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Ensure profiles table has quick_choices
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS quick_choices JSONB DEFAULT '[]'::jsonb;

-- 2. Ensure transactions table has logo, icon, and merchant
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS merchant TEXT;

-- 3. Ensure fixed_expenses table has logo and icon
ALTER TABLE public.fixed_expenses 
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT;

-- 4. Ensure income_sources table has logo and icon
ALTER TABLE public.income_sources 
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT;

-- 5. Ensure savings_goals table has logo and icon
ALTER TABLE public.savings_goals 
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS icon TEXT;

-- 6. Ensure RLS policies are correct (standard policies usually cover all columns)
-- These are just to be sure
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
