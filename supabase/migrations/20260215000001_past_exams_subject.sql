-- Add subject_id column to past_exam_templates
-- Enables organizing past exams by subject with per-subject limits

-- Add subject_id column (nullable for existing templates)
ALTER TABLE public.past_exam_templates
ADD COLUMN IF NOT EXISTS subject_id TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.past_exam_templates.subject_id IS
  'Subject identifier (e.g., biology-hl, math-5). NULL means unassigned/general.';

-- Index for efficient filtering by user + subject
CREATE INDEX IF NOT EXISTS idx_past_exam_templates_user_subject
ON public.past_exam_templates(user_id, subject_id);

-- Index for fetching all templates for a specific subject
CREATE INDEX IF NOT EXISTS idx_past_exam_templates_subject
ON public.past_exam_templates(subject_id) WHERE subject_id IS NOT NULL;
