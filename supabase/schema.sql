-- ============================================
-- STUDYSNAP DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. COURSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    original_image_url TEXT NOT NULL,
    extracted_content TEXT,
    generated_course JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS courses_user_id_idx ON public.courses(user_id);

-- Create index for ordering by created_at
CREATE INDEX IF NOT EXISTS courses_created_at_idx ON public.courses(created_at DESC);

-- ============================================
-- 2. AUTO-UPDATE updated_at TRIGGER
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on UPDATE
DROP TRIGGER IF EXISTS courses_updated_at ON public.courses;
CREATE TRIGGER courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS) FOR COURSES
-- ============================================

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own courses
CREATE POLICY "Users can view own courses"
    ON public.courses
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can INSERT courses with their own user_id
CREATE POLICY "Users can create own courses"
    ON public.courses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE their own courses
CREATE POLICY "Users can update own courses"
    ON public.courses
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can DELETE their own courses
CREATE POLICY "Users can delete own courses"
    ON public.courses
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 4. STORAGE BUCKET FOR NOTEBOOK IMAGES
-- ============================================

-- Create the storage bucket (run this separately if it fails)
INSERT INTO storage.buckets (id, name, public)
VALUES ('notebook-images', 'notebook-images', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. STORAGE POLICIES FOR notebook-images BUCKET
-- ============================================

-- Policy: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload own images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'notebook-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can view their own images
CREATE POLICY "Users can view own images"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'notebook-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can update their own images
CREATE POLICY "Users can update own images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'notebook-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'notebook-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================
-- VERIFICATION QUERIES (optional)
-- ============================================

-- Check if table was created
-- SELECT * FROM public.courses LIMIT 1;

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'courses';

-- Check storage bucket
-- SELECT * FROM storage.buckets WHERE id = 'notebook-images';

-- Check storage policies
-- SELECT * FROM pg_policies WHERE tablename = 'objects';
