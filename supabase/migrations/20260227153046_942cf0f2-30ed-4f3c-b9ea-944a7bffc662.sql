
-- Create property_policies table
CREATE TABLE public.property_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  policy_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  is_mandatory boolean NOT NULL DEFAULT true,
  version text NOT NULL DEFAULT '1.0',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.property_policies ENABLE ROW LEVEL SECURITY;

-- Landlords manage their own policies
CREATE POLICY "Landlords manage own policies"
  ON public.property_policies FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Tenants can view policies for properties they have a tenancy on
CREATE POLICY "Tenants view policies for their tenancies"
  ON public.property_policies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenancies t
      WHERE t.listing_id = property_policies.listing_id
        AND t.tenant_id = auth.uid()
        AND t.status = 'active'
    )
  );

-- Updated_at trigger
CREATE TRIGGER property_policies_updated_at
  BEFORE UPDATE ON public.property_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Notification trigger when policy is created or updated
CREATE OR REPLACE FUNCTION public.notify_policy_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
DECLARE
  _tenant RECORD;
BEGIN
  FOR _tenant IN
    SELECT t.tenant_id FROM tenancies t
    WHERE t.listing_id = NEW.listing_id AND t.status = 'active'
  LOOP
    PERFORM create_notification(
      _tenant.tenant_id,
      CASE WHEN TG_OP = 'INSERT' THEN 'New policy published' ELSE 'Policy updated' END,
      NEW.title || CASE WHEN NEW.is_mandatory THEN ' (mandatory — acceptance required)' ELSE '' END,
      '/dashboard/policies'
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_policy_change
  AFTER INSERT OR UPDATE ON public.property_policies
  FOR EACH ROW EXECUTE FUNCTION notify_policy_change();
