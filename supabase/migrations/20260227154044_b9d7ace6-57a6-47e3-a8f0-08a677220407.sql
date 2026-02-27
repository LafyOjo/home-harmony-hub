
-- Add notification preference and avatar columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_storage_key text,
  ADD COLUMN IF NOT EXISTS notification_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_sms boolean NOT NULL DEFAULT false;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for avatars bucket: users can manage their own files
CREATE POLICY "Users manage own avatars"
ON storage.objects FOR ALL
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
