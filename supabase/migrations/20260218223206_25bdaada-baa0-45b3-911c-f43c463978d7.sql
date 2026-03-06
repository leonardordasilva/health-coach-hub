-- Add weight_goal and body_fat_goal columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_goal numeric,
  ADD COLUMN IF NOT EXISTS body_fat_goal numeric;
