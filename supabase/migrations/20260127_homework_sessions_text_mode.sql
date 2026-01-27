-- ============================================================================
-- Fix homework_sessions table to support text-only input mode
--
-- Text mode allows users to paste homework questions instead of uploading images.
-- This requires question_image_url to be nullable (was NOT NULL before).
-- ============================================================================

-- Make question_image_url nullable for text mode
ALTER TABLE homework_sessions
ALTER COLUMN question_image_url DROP NOT NULL;

-- Update comments to reflect the new text mode behavior
COMMENT ON COLUMN homework_sessions.question_image_url IS 'URL of the question image. Required for image mode, NULL for text mode.';
COMMENT ON COLUMN homework_sessions.question_text IS 'The question text. Required for text mode, or extracted from image via OCR in image mode.';
