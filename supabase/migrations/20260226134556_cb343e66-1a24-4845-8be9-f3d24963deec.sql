
-- Renewal proposals table
CREATE TABLE public.renewal_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  proposed_by uuid NOT NULL,
  new_rent_pcm numeric NOT NULL,
  new_start_date date NOT NULL,
  new_end_date date NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.renewal_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenancy participants manage renewals" ON public.renewal_proposals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = renewal_proposals.tenancy_id AND (t.landlord_id = auth.uid() OR t.tenant_id = auth.uid()))
  ) WITH CHECK (auth.uid() = proposed_by);

CREATE POLICY "Tenancy participants update renewals" ON public.renewal_proposals
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = renewal_proposals.tenancy_id AND (t.landlord_id = auth.uid() OR t.tenant_id = auth.uid()))
  );

-- Termination notices table
CREATE TABLE public.termination_notices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  notice_type text NOT NULL DEFAULT 'section_21',
  issued_by uuid NOT NULL,
  notice_date date NOT NULL DEFAULT CURRENT_DATE,
  effective_date date NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'issued',
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.termination_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenancy participants manage notices" ON public.termination_notices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = termination_notices.tenancy_id AND (t.landlord_id = auth.uid() OR t.tenant_id = auth.uid()))
  ) WITH CHECK (auth.uid() = issued_by);

CREATE POLICY "Tenancy participants update notices" ON public.termination_notices
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = termination_notices.tenancy_id AND (t.landlord_id = auth.uid() OR t.tenant_id = auth.uid()))
  );

-- Policy consents table
CREATE TABLE public.policy_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  policy_type text NOT NULL,
  policy_version text NOT NULL DEFAULT '1.0',
  consented boolean NOT NULL DEFAULT false,
  consented_at timestamptz,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.policy_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenancy participants manage policy consents" ON public.policy_consents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.tenancies t WHERE t.id = policy_consents.tenancy_id AND (t.landlord_id = auth.uid() OR t.tenant_id = auth.uid()))
  ) WITH CHECK (auth.uid() = user_id);

-- Add signature fields to contracts table
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS tenant_signature_name text,
  ADD COLUMN IF NOT EXISTS landlord_signature_name text,
  ADD COLUMN IF NOT EXISTS tenant_signature_ip text,
  ADD COLUMN IF NOT EXISTS landlord_signature_ip text,
  ADD COLUMN IF NOT EXISTS lease_content text,
  ADD COLUMN IF NOT EXISTS is_uploaded boolean DEFAULT false;
