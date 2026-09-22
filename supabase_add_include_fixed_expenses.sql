-- Add include_fixed_expenses_in_analysis to profiles table
ALTER TABLE public.profiles ADD COLUMN include_fixed_expenses_in_analysis BOOLEAN DEFAULT true;
