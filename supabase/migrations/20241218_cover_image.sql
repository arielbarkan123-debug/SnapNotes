-- ============================================
-- ADD COVER IMAGE URL TO COURSES
-- Migration to add AI-generated cover images
-- ============================================

-- Add cover_image_url column to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.courses.cover_image_url IS 'AI-generated cover image URL from Gemini Nano Banana';

-- Create storage bucket for course images if it doesn't exist
-- Note: This needs to be done via Supabase dashboard or API, not SQL
-- The bucket should be named 'course-images' with public access
