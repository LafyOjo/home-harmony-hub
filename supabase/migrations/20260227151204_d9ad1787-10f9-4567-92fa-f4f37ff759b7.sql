
-- Create a public bucket for complaint photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-photos', 'complaint-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload complaint photos
CREATE POLICY "Authenticated users upload complaint photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'complaint-photos');

-- Allow public read of complaint photos
CREATE POLICY "Public read complaint photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'complaint-photos');

-- Allow users to delete their own complaint photos
CREATE POLICY "Users delete own complaint photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'complaint-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
