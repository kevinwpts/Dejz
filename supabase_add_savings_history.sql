-- Add savings_pot_transactions table
CREATE TABLE public.savings_pot_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL,
    timestamp BIGINT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.savings_pot_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings_pot_transactions" ON public.savings_pot_transactions FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert own savings_pot_transactions" ON public.savings_pot_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own savings_pot_transactions" ON public.savings_pot_transactions FOR DELETE USING (auth.uid() = user_id OR is_admin());

CREATE INDEX IF NOT EXISTS idx_savings_pot_transactions_user_id ON public.savings_pot_transactions(user_id);
