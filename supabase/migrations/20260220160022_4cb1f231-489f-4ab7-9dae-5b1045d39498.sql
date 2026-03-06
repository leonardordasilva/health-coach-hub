
-- Table to store historical "latest" assessments before they get overwritten
CREATE TABLE IF NOT EXISTS public.health_assessment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assessment_type TEXT NOT NULL DEFAULT 'latest',
  record_date DATE NOT NULL,
  data_snapshot TEXT NOT NULL,
  assessment JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX idx_health_assessment_history_user_type 
  ON public.health_assessment_history (user_id, assessment_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.health_assessment_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own history
CREATE POLICY "Users can view their own assessment history"
  ON public.health_assessment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assessment history"
  ON public.health_assessment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assessment history"
  ON public.health_assessment_history FOR DELETE
  USING (auth.uid() = user_id);
