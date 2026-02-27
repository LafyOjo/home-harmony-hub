
-- Triggers and indexes were applied in previous migration.
-- Now add remaining realtime tables (notifications already added).

DO $$
BEGIN
  -- Only add if not already members
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tenancy_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tenancy_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'maintenance_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'rent_payments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rent_payments;
  END IF;
END $$;
