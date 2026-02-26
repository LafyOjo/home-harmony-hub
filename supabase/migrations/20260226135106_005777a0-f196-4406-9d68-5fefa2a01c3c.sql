-- Create storage bucket for maintenance photos
INSERT INTO storage.buckets (id, name, public) VALUES ('maintenance-photos', 'maintenance-photos', true);

-- RLS: Authenticated users can upload to maintenance-photos
CREATE POLICY "Authenticated users upload maintenance photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'maintenance-photos');

-- RLS: Anyone can view maintenance photos (public bucket)
CREATE POLICY "Public read maintenance photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'maintenance-photos');

-- RLS: Users can delete their own maintenance photos
CREATE POLICY "Users delete own maintenance photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'maintenance-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Add preferred_time_slots column to maintenance_requests
ALTER TABLE public.maintenance_requests ADD COLUMN IF NOT EXISTS preferred_time_slots jsonb DEFAULT '[]'::jsonb;