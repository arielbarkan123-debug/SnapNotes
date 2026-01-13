-- Migration: Fix Missing Schema Elements
-- Date: 2026-01-13
-- Description: Creates missing tables and columns discovered in Vercel logs:
--   1. deep_practice_progress table (from lesson intensity feature)
--   2. total_courses_completed column in user_gamification
--   3. course-images storage bucket with RLS policies

-- =============================================================================
-- 1. DEEP PRACTICE PROGRESS TABLE
-- =============================================================================

-- Track mastery progress for deep practice lessons
CREATE TABLE IF NOT EXISTS public.deep_practice_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_index INTEGER NOT NULL,
    concept_id TEXT NOT NULL,

    -- Mastery tracking
    current_mastery DECIMAL(4,3) DEFAULT 0 CHECK (current_mastery >= 0 AND current_mastery <= 1),
    mastery_history JSONB DEFAULT '[]',

    -- Problem tracking
    problems_attempted INTEGER DEFAULT 0,
    problems_correct INTEGER DEFAULT 0,
    problems_with_hints INTEGER DEFAULT 0,
    correct_streak INTEGER DEFAULT 0,

    -- Difficulty tracking
    start_difficulty INTEGER DEFAULT 2 CHECK (start_difficulty BETWEEN 1 AND 5),
    current_difficulty INTEGER DEFAULT 2 CHECK (current_difficulty BETWEEN 1 AND 5),
    peak_difficulty INTEGER DEFAULT 2 CHECK (peak_difficulty BETWEEN 1 AND 5),

    -- Time tracking
    total_time_seconds INTEGER DEFAULT 0,

    -- Status
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    final_mastery DECIMAL(4,3) CHECK (final_mastery >= 0 AND final_mastery <= 1),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    UNIQUE(user_id, course_id, lesson_index)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_deep_practice_progress_user
ON public.deep_practice_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_deep_practice_progress_course
ON public.deep_practice_progress(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_deep_practice_progress_incomplete
ON public.deep_practice_progress(user_id, completed) WHERE completed = false;

-- Enable RLS on deep_practice_progress
ALTER TABLE public.deep_practice_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own deep practice progress" ON public.deep_practice_progress;
DROP POLICY IF EXISTS "Users can insert their own deep practice progress" ON public.deep_practice_progress;
DROP POLICY IF EXISTS "Users can update their own deep practice progress" ON public.deep_practice_progress;
DROP POLICY IF EXISTS "Users can delete their own deep practice progress" ON public.deep_practice_progress;

-- Deep practice progress policies
CREATE POLICY "Users can view their own deep practice progress"
    ON public.deep_practice_progress FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deep practice progress"
    ON public.deep_practice_progress FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deep practice progress"
    ON public.deep_practice_progress FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deep practice progress"
    ON public.deep_practice_progress FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Updated_at trigger for deep_practice_progress
CREATE OR REPLACE FUNCTION update_deep_practice_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deep_practice_progress_updated_at ON public.deep_practice_progress;
CREATE TRIGGER deep_practice_progress_updated_at
    BEFORE UPDATE ON public.deep_practice_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_deep_practice_progress_updated_at();

-- =============================================================================
-- 2. DEEP PRACTICE ATTEMPTS TABLE
-- =============================================================================

-- Track individual problem attempts for detailed analytics
CREATE TABLE IF NOT EXISTS public.deep_practice_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    progress_id UUID NOT NULL REFERENCES public.deep_practice_progress(id) ON DELETE CASCADE,
    problem_index INTEGER NOT NULL,

    -- Attempt details
    attempt_number INTEGER NOT NULL,
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    used_hint BOOLEAN DEFAULT false,
    hint_level INTEGER DEFAULT 0 CHECK (hint_level BETWEEN 0 AND 3),
    response_time_ms INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for querying attempts by progress
CREATE INDEX IF NOT EXISTS idx_deep_practice_attempts_progress
ON public.deep_practice_attempts(progress_id);

-- Enable RLS on deep_practice_attempts
ALTER TABLE public.deep_practice_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.deep_practice_attempts;
DROP POLICY IF EXISTS "Users can insert their own attempts" ON public.deep_practice_attempts;

-- Deep practice attempts policies (via progress_id join)
CREATE POLICY "Users can view their own attempts"
    ON public.deep_practice_attempts FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.deep_practice_progress
            WHERE id = progress_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own attempts"
    ON public.deep_practice_attempts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.deep_practice_progress
            WHERE id = progress_id AND user_id = auth.uid()
        )
    );

-- =============================================================================
-- 3. USER_GAMIFICATION COLUMN FIX
-- =============================================================================

-- Add total_courses_completed column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_gamification'
        AND column_name = 'total_courses_completed'
    ) THEN
        ALTER TABLE public.user_gamification
        ADD COLUMN total_courses_completed INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- =============================================================================
-- 4. INTENSITY_MODE COLUMN FOR COURSES
-- =============================================================================

-- Add intensity_mode column to courses if not exists
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS intensity_mode TEXT DEFAULT 'standard'
  CHECK (intensity_mode IN ('quick', 'standard', 'deep_practice'));

-- Index for filtering by intensity mode
CREATE INDEX IF NOT EXISTS idx_courses_intensity_mode
ON public.courses(intensity_mode);

-- =============================================================================
-- 5. COURSE-IMAGES STORAGE BUCKET
-- =============================================================================

-- Create the storage bucket for course cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- =============================================================================
-- 6. STORAGE POLICIES FOR course-images BUCKET
-- =============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view course images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update course images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete course images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view course images" ON storage.objects;

-- Policy: Authenticated users can upload to their own folder in course-images
CREATE POLICY "Users can upload course images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'course-images'
        AND (storage.foldername(name))[1] = 'covers'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- Policy: Anyone can view course images (public bucket)
CREATE POLICY "Public can view course images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'course-images');

-- Policy: Users can update their own course images
CREATE POLICY "Users can update course images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'course-images'
        AND (storage.foldername(name))[1] = 'covers'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- Policy: Users can delete their own course images
CREATE POLICY "Users can delete course images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'course-images'
        AND (storage.foldername(name))[1] = 'covers'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- =============================================================================
-- VERIFICATION (run manually to verify)
-- =============================================================================

-- Check deep_practice_progress table:
-- SELECT * FROM public.deep_practice_progress LIMIT 1;

-- Check total_courses_completed column:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'user_gamification' AND column_name = 'total_courses_completed';

-- Check course-images bucket:
-- SELECT * FROM storage.buckets WHERE id = 'course-images';

-- Check storage policies:
-- SELECT * FROM pg_policies WHERE policyname LIKE '%course images%';
