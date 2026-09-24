-- SUPABASE DATABASE SETUP SCRIPT (ROBUST)
-- Copy and paste this into the Supabase SQL Editor

-- 0. Cleanup existing objects (Reset)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Drop Tables
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.savings_goals CASCADE;
DROP TABLE IF EXISTS public.fixed_expenses CASCADE;
DROP TABLE IF EXISTS public.income_sources CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create PROFILES table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    
    -- Settings
    currency TEXT DEFAULT 'kr',
    language TEXT DEFAULT 'sv',
    payday INTEGER DEFAULT 25,
    payday_type TEXT DEFAULT 'TWENTY_FIFTH',
    payday_before_weekend BOOLEAN DEFAULT true,
    categories JSONB DEFAULT '[
        {"name": "Boende", "icon": "🏠"},
        {"name": "Mat", "icon": "🍔"},
        {"name": "Transport", "icon": "🚗"},
        {"name": "Shopping", "icon": "🛍️"},
        {"name": "Nöje", "icon": "🎬"},
        {"name": "Räkningar", "icon": "🧾"},
        {"name": "Hälsa", "icon": "❤️"},
        {"name": "Resor", "icon": "✈️"},
        {"name": "Familj / barn", "icon": "👶"},
        {"name": "Övrigt", "icon": "📦"}
    ]'::jsonb,
    income_categories JSONB DEFAULT '[
        {"name": "Lön", "icon": "💰"},
        {"name": "Företag / frilans", "icon": "💻"},
        {"name": "Investeringar", "icon": "📈"},
        {"name": "Bidrag", "icon": "🎁"},
        {"name": "Swish", "icon": "📱"},
        {"name": "Övrigt", "icon": "💵"}
    ]'::jsonb,
    initial_spent NUMERIC DEFAULT 0,
    notifications JSONB DEFAULT '{"dailySpend": true, "overLimit": true}'::jsonb,
    security_lock BOOLEAN DEFAULT false,
    dark_mode BOOLEAN DEFAULT true,
    quick_choices JSONB DEFAULT '[{"id": "qc-1", "category": "Mat", "icon": "🍔", "note": ""}, {"id": "qc-2", "category": "Transport", "icon": "🚗", "note": ""}]'::jsonb,
    app_icon_theme TEXT DEFAULT 'emerald',
    
    -- Stripe Integration
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'free',
    subscription_price_id TEXT,
    trial_end TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 4. Create TRANSACTIONS table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    note TEXT,
    timestamp BIGINT NOT NULL,
    type TEXT CHECK (type IN ('expense', 'income')) NOT NULL,
    is_backdated BOOLEAN DEFAULT false,
    logo TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create INCOME_SOURCES table
CREATE TABLE public.income_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT,
    icon TEXT,
    logo TEXT,
    deduction_day INTEGER,
    is_variable BOOLEAN DEFAULT FALSE,
    period_overrides JSONB DEFAULT '{}'::jsonb,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create FIXED_EXPENSES table
CREATE TABLE public.fixed_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT,
    frequency TEXT,
    icon TEXT,
    category TEXT,
    logo TEXT,
    deduction_day INTEGER,
    is_variable BOOLEAN DEFAULT FALSE,
    period_overrides JSONB DEFAULT '{}'::jsonb,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create SAVINGS_GOALS table
CREATE TABLE public.savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    icon TEXT,
    logo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create FEEDBACK table
CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 10. Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_admin());
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR is_admin());
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can view own income_sources" ON public.income_sources;
CREATE POLICY "Users can view own income_sources" ON public.income_sources FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can insert own income_sources" ON public.income_sources;
CREATE POLICY "Users can insert own income_sources" ON public.income_sources FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own income_sources" ON public.income_sources;
CREATE POLICY "Users can update own income_sources" ON public.income_sources FOR UPDATE USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can delete own income_sources" ON public.income_sources;
CREATE POLICY "Users can delete own income_sources" ON public.income_sources FOR DELETE USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can view own fixed_expenses" ON public.fixed_expenses;
CREATE POLICY "Users can view own fixed_expenses" ON public.fixed_expenses FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can insert own fixed_expenses" ON public.fixed_expenses;
CREATE POLICY "Users can insert own fixed_expenses" ON public.fixed_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own fixed_expenses" ON public.fixed_expenses;
CREATE POLICY "Users can update own fixed_expenses" ON public.fixed_expenses FOR UPDATE USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can delete own fixed_expenses" ON public.fixed_expenses;
CREATE POLICY "Users can delete own fixed_expenses" ON public.fixed_expenses FOR DELETE USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can view own savings_goals" ON public.savings_goals;
CREATE POLICY "Users can view own savings_goals" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can insert own savings_goals" ON public.savings_goals;
CREATE POLICY "Users can insert own savings_goals" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own savings_goals" ON public.savings_goals;
CREATE POLICY "Users can update own savings_goals" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "Users can delete own savings_goals" ON public.savings_goals;
CREATE POLICY "Users can delete own savings_goals" ON public.savings_goals FOR DELETE USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can insert own feedback" ON public.feedback;
CREATE POLICY "Users can insert own feedback" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view feedback" ON public.feedback;
CREATE POLICY "Admins can view feedback" ON public.feedback FOR SELECT USING (is_admin());

-- 12. Create a trigger to automatically create a profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    is_first_admin BOOLEAN;
BEGIN
    is_first_admin := (NEW.email = 'kevinwpts@gmail.com');

    INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'avatar_url',
        CASE WHEN is_first_admin THEN 'admin' ELSE 'user' END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Storage Setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

-- 14. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON public.transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_income_sources_user_id ON public.income_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user_id ON public.fixed_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON public.savings_goals(user_id);
