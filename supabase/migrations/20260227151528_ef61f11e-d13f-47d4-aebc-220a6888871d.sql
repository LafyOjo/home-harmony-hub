
-- Create triggers for maintenance notifications if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_maintenance_created') THEN
    CREATE TRIGGER trg_maintenance_created
      AFTER INSERT ON public.maintenance_requests
      FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_created();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_maintenance_updated') THEN
    CREATE TRIGGER trg_maintenance_updated
      AFTER UPDATE ON public.maintenance_requests
      FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_updated();
  END IF;
END$$;
