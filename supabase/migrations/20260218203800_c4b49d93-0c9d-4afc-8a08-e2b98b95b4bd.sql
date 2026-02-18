
-- Add encrypted_data column to health_records
ALTER TABLE public.health_records
  ADD COLUMN IF NOT EXISTS encrypted_data TEXT;
