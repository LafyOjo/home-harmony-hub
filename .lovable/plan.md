

## Plan: Tenant Management per Listing + Verification-Linked Properties

### What This Adds

1. **Listing-level tenant roster** -- Landlords can add/view named tenants for each property directly from the Listing Detail page, with each tenant's verification status visible.

2. **Tenant-to-property verification link** -- When a landlord adds a tenant to a listing, the system creates a connection between the tenant's identity verification and that specific registered property address. Landlords can see at a glance whether each tenant is verified.

3. **Property verification tied to listing** -- The existing `verification_requests` table already has a `listing_id` column. The Listing Detail page will show the property's verification status and allow uploading proof-of-ownership documents directly from the listing page.

### Database Changes

**New table: `listing_tenants`**
- `id` (uuid, PK)
- `listing_id` (uuid, NOT NULL)
- `tenant_name` (text, NOT NULL)
- `tenant_email` (text, nullable) -- to match against registered users
- `tenant_user_id` (uuid, nullable) -- linked once a matching user is found/confirmed
- `verification_status` (text, default 'unverified') -- mirrors the tenant's verification_request status
- `added_by` (uuid, NOT NULL) -- the landlord
- `created_at` (timestamptz, default now())

**RLS policies on `listing_tenants`:**
- Landlords who own the listing can INSERT/SELECT/UPDATE/DELETE
- Tenants can SELECT rows where `tenant_user_id = auth.uid()`

### Frontend Changes

**1. `ListingDetail.tsx` -- Major Enhancement**
Add three new sections below the existing content:

- **Property Verification Card**: Shows current verification status for this listing. Upload button to submit proof-of-ownership documents (deed, land registry, etc.) that creates a `verification_requests` row with `verification_type = 'property'` and `listing_id` set.

- **Registered Tenants Section**: A table/list showing all tenants added to this property with columns: Name, Email, Verification Status, Actions. Includes an "Add Tenant" dialog with name and email fields. Each tenant row shows a badge for their verification status (unverified / pending / verified / rejected).

- **Verification ID Connection**: When a tenant's email matches a registered user who has a verified `verification_requests` record of type `tenant_id`, the `listing_tenants.verification_status` auto-updates to "verified" and shows a green badge.

**2. `LandlordVerification.tsx` -- Minor Update**
- Add ability to select which listing a property verification is for (dropdown of landlord's listings).

**3. `TenantVerification.tsx` -- No changes needed**
Already supports tenant ID upload.

### Technical Details

- The migration creates the `listing_tenants` table with appropriate RLS using the existing listing ownership pattern (`EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_tenants.listing_id AND listings.owner_id = auth.uid())`).
- Tenant verification status display is derived by querying `verification_requests` where `user_id = listing_tenants.tenant_user_id` and `verification_type = 'tenant_id'`.
- Property verification uses the existing `verification_requests` table with `listing_id` populated.

### Files to Create/Edit

| File | Action |
|------|--------|
| New migration SQL | Create `listing_tenants` table + RLS |
| `src/pages/dashboard/ListingDetail.tsx` | Add tenant roster, property verification section |
| `src/pages/dashboard/LandlordVerification.tsx` | Add listing selector for property verifications |

