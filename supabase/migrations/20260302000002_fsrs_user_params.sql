-- Add FSRS personalized parameters column
ALTER TABLE user_learning_profile
ADD COLUMN IF NOT EXISTS fsrs_params JSONB DEFAULT NULL;

COMMENT ON COLUMN user_learning_profile.fsrs_params IS 'Personalized FSRS algorithm weights, optimized from review history';
