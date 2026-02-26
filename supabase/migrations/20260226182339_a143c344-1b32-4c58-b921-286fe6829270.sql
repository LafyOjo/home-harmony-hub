
-- Screening requests table
CREATE TABLE public.screening_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  landlord_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'goodlord',
  provider_reference_id text,
  check_types jsonb NOT NULL DEFAULT '["credit","identity","right_to_rent","employment","previous_landlord","affordability"]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  results jsonb,
  summary text,
  overall_result text, -- pass, fail, refer
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.screening_requests ENABLE ROW LEVEL SECURITY;

-- Landlords can manage screening for their listings
CREATE POLICY "Landlords manage screening" ON public.screening_requests
  FOR ALL TO authenticated
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

-- Tenants can view their own screening
CREATE POLICY "Tenants view own screening" ON public.screening_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id);

-- Update trigger
CREATE TRIGGER trg_screening_updated_at
  BEFORE UPDATE ON public.screening_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Notification on screening complete
CREATE OR REPLACE FUNCTION public.notify_screening_complete()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    PERFORM create_notification(
      NEW.landlord_id,
      'Screening complete',
      'Screening for application is ' || COALESCE(NEW.overall_result, 'complete'),
      '/dashboard/pipeline'
    );
    PERFORM create_notification(
      NEW.tenant_id,
      'Screening complete',
      'Your background screening has been completed',
      '/dashboard/applications'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_screening_complete
  AFTER UPDATE ON public.screening_requests
  FOR EACH ROW EXECUTE FUNCTION notify_screening_complete();
