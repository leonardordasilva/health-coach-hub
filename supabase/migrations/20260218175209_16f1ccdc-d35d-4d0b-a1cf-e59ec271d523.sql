
-- Remove the overly permissive policy — service_role bypasses RLS automatically
DROP POLICY IF EXISTS "Service role can manage user_roles" ON public.user_roles;
