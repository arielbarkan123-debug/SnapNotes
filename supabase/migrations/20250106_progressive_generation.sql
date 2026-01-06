-- Progressive Course Generation Migration
-- Enables generating first 2 lessons fast, then remaining lessons in background

-- Add columns for tracking progressive generation
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS generation_status TEXT DEFAULT 'complete',
ADD COLUMN IF NOT EXISTS lessons_ready INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_lessons INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS document_summary TEXT,
ADD COLUMN IF NOT EXISTS lesson_outline JSONB;

-- Backfill existing courses as complete
UPDATE public.courses
SET
  generation_status = 'complete',
  lessons_ready = COALESCE(jsonb_array_length(generated_course->'lessons'), 0),
  total_lessons = COALESCE(jsonb_array_length(generated_course->'lessons'), 0)
WHERE generation_status IS NULL;

-- Index for finding incomplete courses efficiently
CREATE INDEX IF NOT EXISTS idx_courses_generation_incomplete
ON public.courses(user_id, generation_status)
WHERE generation_status IN ('partial', 'generating', 'processing');

-- Comment for documentation
COMMENT ON COLUMN public.courses.generation_status IS 'processing|partial|generating|complete|failed';
COMMENT ON COLUMN public.courses.lessons_ready IS 'Number of lessons fully generated and ready';
COMMENT ON COLUMN public.courses.total_lessons IS 'Total expected lessons for the course';
COMMENT ON COLUMN public.courses.document_summary IS 'AI-generated summary for continuation calls';
COMMENT ON COLUMN public.courses.lesson_outline IS 'Full lesson outline for context in continuation';
