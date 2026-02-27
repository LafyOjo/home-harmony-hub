
ALTER TABLE public.utilities
  ADD COLUMN IF NOT EXISTS meter_reading numeric,
  ADD COLUMN IF NOT EXISTS receipt_storage_key text;
