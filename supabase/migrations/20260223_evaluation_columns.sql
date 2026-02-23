-- Add evaluation tracking columns to practice_session_questions
-- This allows us to persist AI evaluation results for analytics and debugging

ALTER TABLE public.practice_session_questions
  ADD COLUMN IF NOT EXISTS evaluation_score INTEGER,
  ADD COLUMN IF NOT EXISTS evaluation_feedback TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_method TEXT;

-- Add index for filtering by evaluation method (for debugging AI failures)
CREATE INDEX IF NOT EXISTS idx_practice_session_questions_eval_method
  ON public.practice_session_questions (evaluation_method)
  WHERE evaluation_method IS NOT NULL;
