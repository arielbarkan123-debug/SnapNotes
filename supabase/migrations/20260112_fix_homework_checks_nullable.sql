-- ============================================================================
-- Fix homework_checks table to allow single image uploads
--
-- Commit 5a167e9 made only one image required in the client/API,
-- but the database still required both task_image_url AND answer_image_url.
-- This migration makes answer_image_url nullable to match the new behavior.
-- ============================================================================

-- Make answer_image_url nullable (was NOT NULL before)
ALTER TABLE homework_checks
ALTER COLUMN answer_image_url DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN homework_checks.answer_image_url IS 'URL of the answer image. Optional - users can submit just a task OR just an answer.';
COMMENT ON COLUMN homework_checks.task_image_url IS 'URL of the task/question image. Required if no answer_image_url provided.';
