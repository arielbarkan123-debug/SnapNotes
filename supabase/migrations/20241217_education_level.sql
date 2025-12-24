-- ============================================
-- ADD EDUCATION LEVEL AND STUDY SYSTEM
-- Migration to add education personalization fields
-- ============================================

-- Add education_level column
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS education_level TEXT DEFAULT 'high_school';

-- Add constraint for education_level (drop if exists first to make idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_learning_profile_education_level_check'
  ) THEN
    ALTER TABLE public.user_learning_profile
    ADD CONSTRAINT user_learning_profile_education_level_check
    CHECK (education_level IN ('elementary', 'middle_school', 'high_school', 'university', 'graduate', 'professional'));
  END IF;
END $$;

-- Add grade column (optional, stores specific grade like "10th grade" or "freshman")
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS grade TEXT;

-- Add study_system column (educational system/curriculum)
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS study_system TEXT DEFAULT 'general';

-- Add constraint for study_system
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_learning_profile_study_system_check'
  ) THEN
    ALTER TABLE public.user_learning_profile
    ADD CONSTRAINT user_learning_profile_study_system_check
    CHECK (study_system IN ('general', 'us', 'uk', 'israeli_bagrut', 'ib', 'ap', 'other'));
  END IF;
END $$;

-- Add index for education_level for potential filtering
CREATE INDEX IF NOT EXISTS user_learning_profile_education_level_idx
ON public.user_learning_profile(education_level);

-- Comment for documentation
COMMENT ON COLUMN public.user_learning_profile.education_level IS 'User education level: elementary, middle_school, high_school, university, graduate, professional';
COMMENT ON COLUMN public.user_learning_profile.grade IS 'Optional specific grade level (e.g., 10th grade, sophomore)';
COMMENT ON COLUMN public.user_learning_profile.study_system IS 'Educational system/curriculum: general, us, uk, israeli_bagrut, ib, ap, other';
