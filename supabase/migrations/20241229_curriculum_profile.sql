-- Migration: Add curriculum profile fields to user_learning_profile
-- Date: 2024-12-29
-- Description: Adds subjects, subject_levels, and exam_format fields for curriculum context

-- Add subjects array column
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add subject_levels JSONB column (for IB SL/HL, etc.)
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS subject_levels JSONB DEFAULT '{}'::JSONB;

-- Add exam_format column with constraint
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS exam_format TEXT DEFAULT 'match_real';

-- Add check constraint for exam_format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_learning_profile_exam_format_check'
  ) THEN
    ALTER TABLE public.user_learning_profile
    ADD CONSTRAINT user_learning_profile_exam_format_check
    CHECK (exam_format IN ('match_real', 'inspired_by'));
  END IF;
END $$;

-- Create index on subjects for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_learning_profile_subjects
ON public.user_learning_profile USING GIN (subjects);

-- Add comments for documentation
COMMENT ON COLUMN public.user_learning_profile.subjects IS 'Array of base subject IDs the user is studying (e.g., biology, chemistry, mathematics-aa)';
COMMENT ON COLUMN public.user_learning_profile.subject_levels IS 'JSON object mapping subject IDs to levels for IB (e.g., {"biology": "HL", "chemistry": "SL"})';
COMMENT ON COLUMN public.user_learning_profile.exam_format IS 'Preferred exam format: match_real (exact exam structure) or inspired_by (flexible structure)';
