
-- Remove role column from profiles (role is managed in user_roles table)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
