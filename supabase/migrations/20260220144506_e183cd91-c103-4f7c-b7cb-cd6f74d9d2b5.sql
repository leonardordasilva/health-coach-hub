-- Add deny-all RLS policy to password_reset_tokens for defense-in-depth
-- Edge functions use service role key which bypasses RLS
CREATE POLICY "No direct access to password reset tokens"
  ON public.password_reset_tokens
  FOR ALL
  USING (false);