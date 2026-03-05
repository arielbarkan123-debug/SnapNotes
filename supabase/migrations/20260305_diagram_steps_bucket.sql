-- Create diagram-steps bucket for pre-rendered step images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagram-steps',
  'diagram-steps',
  true,           -- Public bucket (images served directly to frontend)
  5242880,        -- 5MB max per file
  ARRAY['image/png']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload step images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'diagram-steps'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (images are served to the student)
CREATE POLICY "Public read access for step images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'diagram-steps');

-- Allow users to overwrite their own files (re-generation)
CREATE POLICY "Users can update their step images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'diagram-steps'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
