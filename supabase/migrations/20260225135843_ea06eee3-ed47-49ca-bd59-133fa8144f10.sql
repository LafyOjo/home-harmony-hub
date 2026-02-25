
CREATE TABLE public.listing_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  tenant_name text NOT NULL,
  tenant_email text,
  tenant_user_id uuid,
  verification_status text NOT NULL DEFAULT 'unverified',
  added_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.listing_tenants ENABLE ROW LEVEL SECURITY;

-- Landlords who own the listing can do everything
CREATE POLICY "Landlords manage listing tenants"
ON public.listing_tenants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_tenants.listing_id
      AND listings.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = listing_tenants.listing_id
      AND listings.owner_id = auth.uid()
  )
);

-- Tenants can view rows where they are the linked tenant
CREATE POLICY "Tenants view own listing tenant rows"
ON public.listing_tenants
FOR SELECT
TO authenticated
USING (tenant_user_id = auth.uid());
