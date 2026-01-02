-- Migration: Language Support
-- Date: 2025-01-02
-- Description: Adds language column to user_learning_profile for i18n support

-- Add language column with default 'en' (English)
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add constraint to ensure only valid language codes
ALTER TABLE public.user_learning_profile
ADD CONSTRAINT user_learning_profile_language_check
CHECK (language IN ('en', 'he'));

-- Create index for faster lookups by language
CREATE INDEX IF NOT EXISTS idx_user_learning_profile_language
ON public.user_learning_profile(language);

-- Comment for documentation
COMMENT ON COLUMN public.user_learning_profile.language IS 'User preferred language: en (English) or he (Hebrew)';
