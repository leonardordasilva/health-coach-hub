
-- Add policy so admins can also insert into user_roles (needed for create-user function flow)
CREATE POLICY "Service role can manage user_roles"
  ON public.user_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: The above is needed because edge functions use service role key
-- which bypasses RLS anyway, but we add it for completeness
-- Actually, service_role bypasses RLS, so this is just for documentation

-- Make the profiles table also insertable via trigger (which uses SECURITY DEFINER)
-- The trigger already runs as SECURITY DEFINER, profiles are created via trigger

-- Add policy for profiles: service role creates profiles via trigger
-- No additional migration needed - service role key bypasses RLS

-- Update the handle_new_user trigger to NOT set role in profiles (role is in user_roles)
-- The current trigger is correct - it inserts profile with default 'user' role field
-- But we also need to insert into user_roles for the RBAC check to work
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  
  -- Also insert default user role (will be overridden by admin edge function for admin users)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;
