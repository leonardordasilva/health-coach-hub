
-- Table to store password reset confirmation tokens
CREATE TABLE public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only service role can access (edge functions use service role key)
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Index for fast token lookups
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);

-- Auto-cleanup: delete expired tokens older than 24h
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < now() - interval '24 hours';
$$;
