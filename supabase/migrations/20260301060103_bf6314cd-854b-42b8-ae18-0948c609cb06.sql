
-- =============================================================
-- 1. Missing indexes on columns used in RLS policy evaluations
-- =============================================================

-- screening_requests: landlord_id used in "Landlords manage screening" RLS
CREATE INDEX IF NOT EXISTS idx_screening_landlord ON public.screening_requests USING btree (landlord_id);

-- listing_tenants: tenant_user_id used in "Tenants view own listing tenant rows" RLS
CREATE INDEX IF NOT EXISTS idx_listing_tenants_user ON public.listing_tenants USING btree (tenant_user_id);

-- complaints: submitted_by used in WITH CHECK of RLS
CREATE INDEX IF NOT EXISTS idx_complaints_submitted_by ON public.complaints USING btree (submitted_by);

-- maintenance_requests: submitted_by used in WITH CHECK of RLS
CREATE INDEX IF NOT EXISTS idx_maintenance_submitted_by ON public.maintenance_requests USING btree (submitted_by);

-- Composite indexes for common RLS JOIN patterns on tenancies
-- property_policies RLS joins tenancies on (listing_id, status='active', tenant_id)
CREATE INDEX IF NOT EXISTS idx_tenancies_listing_status_tenant ON public.tenancies USING btree (listing_id, status, tenant_id);

-- Many RLS policies do EXISTS(SELECT 1 FROM tenancies WHERE id=X AND tenant_id/landlord_id=auth.uid())
-- Composite covering indexes for these lookups:
CREATE INDEX IF NOT EXISTS idx_tenancies_id_tenant ON public.tenancies USING btree (id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_id_landlord ON public.tenancies USING btree (id, landlord_id);

-- application_references: reference_request_id used in landlord RLS join chain
CREATE INDEX IF NOT EXISTS idx_app_refs_request ON public.application_references USING btree (reference_request_id);

-- reference_responses: request_id used in multiple RLS policies
CREATE INDEX IF NOT EXISTS idx_ref_responses_request ON public.reference_responses USING btree (request_id);

-- policy_consents: tenancy_id used in RLS
CREATE INDEX IF NOT EXISTS idx_policy_consents_tenancy ON public.policy_consents USING btree (tenancy_id);

-- policy_consents: user_id used in WITH CHECK
CREATE INDEX IF NOT EXISTS idx_policy_consents_user ON public.policy_consents USING btree (user_id);

-- user_roles: composite for has_role() function performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles USING btree (user_id, role);

-- =============================================================
-- 2. Security definer helper: is_tenancy_participant
--    Avoids repeated EXISTS joins in RLS policies
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_tenancy_participant(_tenancy_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenancies
    WHERE id = _tenancy_id
      AND (tenant_id = _user_id OR landlord_id = _user_id)
  )
$$;

-- =============================================================
-- 3. Security definer helper: is_tenancy_landlord
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_tenancy_landlord(_tenancy_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenancies
    WHERE id = _tenancy_id
      AND landlord_id = _user_id
  )
$$;

-- =============================================================
-- 4. Security definer helper: is_listing_owner
-- =============================================================

CREATE OR REPLACE FUNCTION public.is_listing_owner(_listing_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM listings
    WHERE id = _listing_id
      AND owner_id = _user_id
  )
$$;

-- =============================================================
-- 5. Enable pg_stat_statements for query performance monitoring
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
