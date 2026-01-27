-- ============================================================================
-- Fix homework_checks table to support text-only input mode
--
-- Text mode allows users to paste homework text instead of uploading images.
-- This requires task_image_url to be nullable (was NOT NULL before).
-- ============================================================================

-- Make task_image_url nullable for text mode
ALTER TABLE homework_checks
ALTER COLUMN task_image_url DROP NOT NULL;

-- Update comments to reflect the new text mode behavior
COMMENT ON COLUMN homework_checks.task_image_url IS 'URL of the task/question image. Required for image mode, NULL for text mode.';
COMMENT ON COLUMN homework_checks.task_text IS 'The task/question text. Required for text mode, or extracted from image in image mode.';
COMMENT ON COLUMN homework_checks.answer_text IS 'The student answer text. Optional for text mode, or extracted from image in image mode.';
