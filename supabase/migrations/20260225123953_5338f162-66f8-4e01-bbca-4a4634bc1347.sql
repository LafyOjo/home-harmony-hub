
-- Verification requests for tenants, landlords, and properties
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  verification_type text NOT NULL CHECK (verification_type IN ('tenant_id', 'landlord_id', 'property')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'requires_more_info')),
  notes text,
  listing_id uuid,
  document_ids jsonb DEFAULT '[]'::jsonb,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own verifications" ON public.verification_requests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all verifications" ON public.verification_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Tenancies (active tenancy after application accepted)
CREATE TABLE public.tenancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid,
  listing_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  landlord_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  rent_pcm numeric NOT NULL,
  deposit numeric,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'terminated', 'renewed')),
  contract_storage_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.tenancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants view own tenancies" ON public.tenancies FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id);
CREATE POLICY "Landlords view own tenancies" ON public.tenancies FOR SELECT TO authenticated
  USING (auth.uid() = landlord_id);
CREATE POLICY "Landlords manage tenancies" ON public.tenancies FOR ALL TO authenticated
  USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);

-- Rent payments
CREATE TABLE public.rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  due_date date NOT NULL,
  paid_date date,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'paid', 'overdue', 'partial')),
  paid_amount numeric DEFAULT 0,
  payment_method text,
  reference text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenancy participants view payments" ON public.rent_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = rent_payments.tenancy_id AND (t.tenant_id = auth.uid() OR t.landlord_id = auth.uid())));
CREATE POLICY "Landlords manage payments" ON public.rent_payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = rent_payments.tenancy_id AND t.landlord_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = rent_payments.tenancy_id AND t.landlord_id = auth.uid()));

-- Utilities
CREATE TABLE public.utilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  utility_type text NOT NULL CHECK (utility_type IN ('electricity', 'gas', 'water', 'internet', 'council_tax', 'service_charge', 'other')),
  provider_name text,
  responsibility text NOT NULL DEFAULT 'tenant' CHECK (responsibility IN ('tenant', 'landlord', 'shared')),
  amount numeric,
  due_date date,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'paid', 'overdue')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.utilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenancy participants view utilities" ON public.utilities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = utilities.tenancy_id AND (t.tenant_id = auth.uid() OR t.landlord_id = auth.uid())));
CREATE POLICY "Landlords manage utilities" ON public.utilities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = utilities.tenancy_id AND t.landlord_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = utilities.tenancy_id AND t.landlord_id = auth.uid()));

-- Complaints
CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('noise', 'maintenance', 'neighbour', 'safety', 'billing', 'other')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated', 'closed')),
  attachments jsonb DEFAULT '[]'::jsonb,
  response text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenancy participants manage complaints" ON public.complaints FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = complaints.tenancy_id AND (t.tenant_id = auth.uid() OR t.landlord_id = auth.uid())))
  WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Landlords update complaints" ON public.complaints FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = complaints.tenancy_id AND t.landlord_id = auth.uid()));

-- Maintenance workers / handymen
CREATE TABLE public.maintenance_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  email text,
  specialty text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.maintenance_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords manage own workers" ON public.maintenance_workers FOR ALL TO authenticated
  USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);

-- Maintenance requests
CREATE TABLE public.maintenance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('plumbing', 'electrical', 'heating', 'structural', 'appliance', 'general', 'other')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
  status text NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'acknowledged', 'assigned', 'scheduled', 'in_progress', 'completed', 'closed')),
  photos jsonb DEFAULT '[]'::jsonb,
  assigned_worker_id uuid REFERENCES public.maintenance_workers(id),
  scheduled_date date,
  scheduled_time_window text,
  completion_notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenancy participants manage maintenance" ON public.maintenance_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = maintenance_requests.tenancy_id AND (t.tenant_id = auth.uid() OR t.landlord_id = auth.uid())))
  WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Landlords update maintenance" ON public.maintenance_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = maintenance_requests.tenancy_id AND t.landlord_id = auth.uid()));

-- Contracts
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  title text NOT NULL,
  contract_type text NOT NULL DEFAULT 'initial' CHECK (contract_type IN ('initial', 'renewal', 'amendment', 'termination')),
  storage_key text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'tenant_signed', 'landlord_signed', 'fully_signed', 'expired', 'cancelled')),
  valid_from date,
  valid_to date,
  tenant_signed_at timestamptz,
  landlord_signed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenancy participants view contracts" ON public.contracts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = contracts.tenancy_id AND (t.tenant_id = auth.uid() OR t.landlord_id = auth.uid())));
CREATE POLICY "Landlords manage contracts" ON public.contracts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = contracts.tenancy_id AND t.landlord_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = contracts.tenancy_id AND t.landlord_id = auth.uid()));
CREATE POLICY "Tenants update contract signature" ON public.contracts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM tenancies t WHERE t.id = contracts.tenancy_id AND t.tenant_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_verification BEFORE UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_tenancies BEFORE UPDATE ON public.tenancies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_utilities BEFORE UPDATE ON public.utilities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_complaints BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_maintenance BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_contracts BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
