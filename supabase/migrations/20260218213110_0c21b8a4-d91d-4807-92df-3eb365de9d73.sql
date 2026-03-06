
-- Criar função de atualização de timestamp (se não existir)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabela de cache de avaliações de saúde (persiste entre sessões)
CREATE TABLE IF NOT EXISTS public.health_assessment_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('latest', 'general')),
  data_snapshot TEXT NOT NULL,
  assessment JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, assessment_type)
);

ALTER TABLE public.health_assessment_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assessment cache"
  ON public.health_assessment_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assessment cache"
  ON public.health_assessment_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessment cache"
  ON public.health_assessment_cache FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assessment cache"
  ON public.health_assessment_cache FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_health_assessment_cache_updated_at
  BEFORE UPDATE ON public.health_assessment_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
