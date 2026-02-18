-- Add index on password_reset_tokens(token) for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token
  ON public.password_reset_tokens (token);
