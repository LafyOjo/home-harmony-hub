
-- ============================================================
-- PRODUCTION-READY: Triggers + Indexes
-- ============================================================

-- Drop existing triggers to make idempotent
DROP TRIGGER IF EXISTS trg_notify_maintenance_created ON public.maintenance_requests;
DROP TRIGGER IF EXISTS trg_notify_maintenance_updated ON public.maintenance_requests;
DROP TRIGGER IF EXISTS trg_calculate_late_fee ON public.rent_payments;
DROP TRIGGER IF EXISTS trg_notify_payment_update ON public.rent_payments;
DROP TRIGGER IF EXISTS trg_notify_screening_complete ON public.screening_requests;
DROP TRIGGER IF EXISTS trg_notify_policy_change ON public.property_policies;
DROP TRIGGER IF EXISTS trg_notify_reference_completed ON public.reference_responses;
DROP TRIGGER IF EXISTS trg_notify_contract_update ON public.contracts;
DROP TRIGGER IF EXISTS trg_notify_renewal ON public.renewal_proposals;
DROP TRIGGER IF EXISTS trg_notify_termination ON public.termination_notices;
DROP TRIGGER IF EXISTS trg_notify_tenancy_message ON public.tenancy_messages;
DROP TRIGGER IF EXISTS trg_notify_verification_update ON public.verification_requests;
DROP TRIGGER IF EXISTS trg_updated_at_applications ON public.applications;
DROP TRIGGER IF EXISTS trg_updated_at_contracts ON public.contracts;
DROP TRIGGER IF EXISTS trg_updated_at_maintenance ON public.maintenance_requests;
DROP TRIGGER IF EXISTS trg_updated_at_complaints ON public.complaints;
DROP TRIGGER IF EXISTS trg_updated_at_utilities ON public.utilities;
DROP TRIGGER IF EXISTS trg_updated_at_verification ON public.verification_requests;
DROP TRIGGER IF EXISTS trg_updated_at_screening ON public.screening_requests;
DROP TRIGGER IF EXISTS trg_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS trg_updated_at_property_policies ON public.property_policies;

-- Notification triggers
CREATE TRIGGER trg_notify_maintenance_created AFTER INSERT ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_created();
CREATE TRIGGER trg_notify_maintenance_updated AFTER UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_updated();
CREATE TRIGGER trg_calculate_late_fee BEFORE UPDATE ON public.rent_payments FOR EACH ROW EXECUTE FUNCTION public.calculate_late_fee();
CREATE TRIGGER trg_notify_payment_update AFTER UPDATE ON public.rent_payments FOR EACH ROW EXECUTE FUNCTION public.notify_payment_update();
CREATE TRIGGER trg_notify_screening_complete AFTER UPDATE ON public.screening_requests FOR EACH ROW EXECUTE FUNCTION public.notify_screening_complete();
CREATE TRIGGER trg_notify_policy_change AFTER INSERT OR UPDATE ON public.property_policies FOR EACH ROW EXECUTE FUNCTION public.notify_policy_change();
CREATE TRIGGER trg_notify_reference_completed AFTER INSERT ON public.reference_responses FOR EACH ROW EXECUTE FUNCTION public.notify_reference_completed();
CREATE TRIGGER trg_notify_contract_update AFTER INSERT OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.notify_contract_update();
CREATE TRIGGER trg_notify_renewal AFTER INSERT OR UPDATE ON public.renewal_proposals FOR EACH ROW EXECUTE FUNCTION public.notify_renewal();
CREATE TRIGGER trg_notify_termination AFTER INSERT ON public.termination_notices FOR EACH ROW EXECUTE FUNCTION public.notify_termination();
CREATE TRIGGER trg_notify_tenancy_message AFTER INSERT ON public.tenancy_messages FOR EACH ROW EXECUTE FUNCTION public.notify_tenancy_message();
CREATE TRIGGER trg_notify_verification_update AFTER UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.notify_verification_update();

-- Updated_at triggers
CREATE TRIGGER trg_updated_at_applications BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_contracts BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_maintenance BEFORE UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_complaints BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_utilities BEFORE UPDATE ON public.utilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_verification BEFORE UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_screening BEFORE UPDATE ON public.screening_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_updated_at_property_policies BEFORE UPDATE ON public.property_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Performance indexes on FK columns and common filters
CREATE INDEX IF NOT EXISTS idx_applications_listing_id ON public.applications(listing_id);
CREATE INDEX IF NOT EXISTS idx_applications_tenant_id ON public.applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_tenancies_tenant_id ON public.tenancies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_landlord_id ON public.tenancies(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_listing_id ON public.tenancies(listing_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_status ON public.tenancies(status);
CREATE INDEX IF NOT EXISTS idx_rent_payments_tenancy_id ON public.rent_payments(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_rent_payments_status ON public.rent_payments(status);
CREATE INDEX IF NOT EXISTS idx_rent_payments_due_date ON public.rent_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenancy_id ON public.maintenance_requests(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_contracts_tenancy_id ON public.contracts(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_complaints_tenancy_id ON public.complaints(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_application_id ON public.messages(application_id);
CREATE INDEX IF NOT EXISTS idx_tenancy_messages_tenancy_id ON public.tenancy_messages(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON public.listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_is_active ON public.listings(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_postcode ON public.listings(postcode);
CREATE INDEX IF NOT EXISTS idx_listing_photos_listing_id ON public.listing_photos(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_apply_links_token ON public.listing_apply_links(token);
CREATE INDEX IF NOT EXISTS idx_reference_requests_user_id ON public.reference_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_reference_requests_token ON public.reference_requests(token);
CREATE INDEX IF NOT EXISTS idx_reference_responses_request_id ON public.reference_responses(request_id);
CREATE INDEX IF NOT EXISTS idx_screening_application ON public.screening_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_screening_tenant ON public.screening_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_user ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_utilities_tenancy ON public.utilities(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_renewal_tenancy ON public.renewal_proposals(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_termination_tenancy ON public.termination_notices(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_policy_consents_tenancy ON public.policy_consents(tenancy_id);
CREATE INDEX IF NOT EXISTS idx_property_policies_listing ON public.property_policies(listing_id);
CREATE INDEX IF NOT EXISTS idx_app_docs_application ON public.application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_app_refs_application ON public.application_references(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_listing_tenants_listing ON public.listing_tenants(listing_id);
CREATE INDEX IF NOT EXISTS idx_owner_notes_application ON public.owner_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_tenant_addresses_user ON public.tenant_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_employment_user ON public.tenant_employment(user_id);
CREATE INDEX IF NOT EXISTS idx_guarantors_user ON public.guarantors(user_id);
CREATE INDEX IF NOT EXISTS idx_household_user ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_consents_user ON public.consents(user_id);
