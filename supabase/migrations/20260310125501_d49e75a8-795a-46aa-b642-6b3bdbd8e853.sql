
-- Viewing appointments table
CREATE TABLE public.viewing_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  landlord_id uuid NOT NULL,
  proposed_datetime timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  viewing_type text NOT NULL DEFAULT 'in_person',
  confirmed_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  cancellation_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.viewing_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants manage own viewing requests"
  ON public.viewing_appointments FOR ALL TO public
  USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Landlords manage viewing requests for own listings"
  ON public.viewing_appointments FOR ALL TO authenticated
  USING (auth.uid() = landlord_id)
  WITH CHECK (auth.uid() = landlord_id);

-- Deposit protections table (UK DPS compliance)
CREATE TABLE public.deposit_protections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  scheme_name text NOT NULL DEFAULT 'DPS',
  scheme_reference text,
  deposit_amount numeric NOT NULL,
  protected_date date,
  certificate_storage_key text,
  status text NOT NULL DEFAULT 'pending',
  prescribed_info_served_at timestamp with time zone,
  return_requested_at timestamp with time zone,
  return_amount numeric,
  return_approved_at timestamp with time zone,
  return_reason text,
  deductions jsonb DEFAULT '[]'::jsonb,
  dispute_raised boolean DEFAULT false,
  dispute_reference text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.deposit_protections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage deposit protections"
  ON public.deposit_protections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = deposit_protections.tenancy_id AND t.landlord_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = deposit_protections.tenancy_id AND t.landlord_id = auth.uid()));

CREATE POLICY "Tenants view deposit protections"
  ON public.deposit_protections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = deposit_protections.tenancy_id AND t.tenant_id = auth.uid()));

-- Notify tenant when viewing confirmed
CREATE OR REPLACE FUNCTION public.notify_viewing_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    PERFORM create_notification(
      NEW.tenant_id,
      'Viewing confirmed',
      'Your viewing has been confirmed for ' || to_char(NEW.proposed_datetime, 'DD Mon YYYY at HH24:MI'),
      '/dashboard/viewings'
    );
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    PERFORM create_notification(
      CASE WHEN auth.uid() = NEW.landlord_id THEN NEW.tenant_id ELSE NEW.landlord_id END,
      'Viewing cancelled',
      'A viewing has been cancelled',
      '/dashboard/viewings'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_viewing_update
  AFTER UPDATE ON public.viewing_appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_viewing_update();

-- Notify on new viewing request
CREATE OR REPLACE FUNCTION public.notify_viewing_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  PERFORM create_notification(
    NEW.landlord_id,
    'New viewing request',
    'A tenant has requested a property viewing',
    '/dashboard/landlord-viewings'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_viewing_created
  AFTER INSERT ON public.viewing_appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_viewing_created();

-- Indexes
CREATE INDEX idx_viewing_appointments_listing ON public.viewing_appointments(listing_id);
CREATE INDEX idx_viewing_appointments_tenant ON public.viewing_appointments(tenant_id);
CREATE INDEX idx_viewing_appointments_landlord ON public.viewing_appointments(landlord_id);
CREATE INDEX idx_viewing_appointments_status ON public.viewing_appointments(status);
CREATE INDEX idx_deposit_protections_tenancy ON public.deposit_protections(tenancy_id);
CREATE INDEX idx_deposit_protections_status ON public.deposit_protections(status);

-- Enable realtime for viewings
ALTER PUBLICATION supabase_realtime ADD TABLE public.viewing_appointments;
