
-- Add amenity columns to listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS bedrooms integer,
  ADD COLUMN IF NOT EXISTS bathrooms integer,
  ADD COLUMN IF NOT EXISTS furnished text,
  ADD COLUMN IF NOT EXISTS parking text,
  ADD COLUMN IF NOT EXISTS garden text,
  ADD COLUMN IF NOT EXISTS epc_rating text,
  ADD COLUMN IF NOT EXISTS floor_plan_key text;

-- Listing photos table
CREATE TABLE public.listing_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listing owners manage photos" ON public.listing_photos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.listings WHERE listings.id = listing_photos.listing_id AND listings.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.listings WHERE listings.id = listing_photos.listing_id AND listings.owner_id = auth.uid())
  );

CREATE POLICY "Anyone can view listing photos" ON public.listing_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings WHERE listings.id = listing_photos.listing_id AND listings.is_active = true)
  );

-- Application documents table
CREATE TABLE public.application_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  storage_key text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants manage own app docs" ON public.application_documents
  FOR ALL USING (auth.uid() = uploaded_by) WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Landlords view app docs" ON public.application_documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.listings l ON l.id = a.listing_id
      WHERE a.id = application_documents.application_id AND l.owner_id = auth.uid()
    )
  );

-- Application references linking table
CREATE TABLE public.application_references (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  reference_request_id uuid NOT NULL REFERENCES public.reference_requests(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.application_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants manage own app refs" ON public.application_references
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.applications WHERE applications.id = application_references.application_id AND applications.tenant_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.applications WHERE applications.id = application_references.application_id AND applications.tenant_id = auth.uid())
  );

CREATE POLICY "Landlords view app refs" ON public.application_references
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.listings l ON l.id = a.listing_id
      WHERE a.id = application_references.application_id AND l.owner_id = auth.uid()
    )
  );

-- Storage bucket for listing photos
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-photos', 'listing-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for listing-photos bucket
CREATE POLICY "Landlords upload listing photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'listing-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view listing photos storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'listing-photos');

CREATE POLICY "Landlords delete own listing photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'listing-photos' AND auth.uid() IS NOT NULL);
