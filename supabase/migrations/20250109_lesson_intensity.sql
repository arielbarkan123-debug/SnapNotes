-- Migration: Lesson Intensity Modes
-- Date: 2025-01-09
-- Description: Adds intensity_mode to courses and deep_practice_progress table
--              for mastery-based learning with adaptive practice

-- =============================================================================
-- Add intensity_mode column to courses
-- =============================================================================

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS intensity_mode TEXT DEFAULT 'standard'
  CHECK (intensity_mode IN ('quick', 'standard', 'deep_practice'));

-- Index for filtering by intensity mode
CREATE INDEX IF NOT EXISTS idx_courses_intensity_mode
ON public.courses(intensity_mode);

-- =============================================================================
-- Deep Practice Progress Tracking
-- =============================================================================

-- Track mastery progress for deep practice lessons
CREATE TABLE IF NOT EXISTS public.deep_practice_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_index INTEGER NOT NULL,
    concept_id TEXT NOT NULL,

    -- Mastery tracking
    current_mastery DECIMAL(4,3) DEFAULT 0 CHECK (current_mastery >= 0 AND current_mastery <= 1),
    mastery_history JSONB DEFAULT '[]',

    -- Problem tracking
    problems_attempted INTEGER DEFAULT 0,
    problems_correct INTEGER DEFAULT 0,
    problems_with_hints INTEGER DEFAULT 0,
    correct_streak INTEGER DEFAULT 0,

    -- Difficulty tracking
    start_difficulty INTEGER DEFAULT 2 CHECK (start_difficulty BETWEEN 1 AND 5),
    current_difficulty INTEGER DEFAULT 2 CHECK (current_difficulty BETWEEN 1 AND 5),
    peak_difficulty INTEGER DEFAULT 2 CHECK (peak_difficulty BETWEEN 1 AND 5),

    -- Time tracking
    total_time_seconds INTEGER DEFAULT 0,

    -- Status
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    final_mastery DECIMAL(4,3) CHECK (final_mastery >= 0 AND final_mastery <= 1),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    UNIQUE(user_id, course_id, lesson_index)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_deep_practice_progress_user
ON public.deep_practice_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_deep_practice_progress_course
ON public.deep_practice_progress(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_deep_practice_progress_incomplete
ON public.deep_practice_progress(user_id, completed) WHERE completed = false;

-- =============================================================================
-- Deep Practice Attempts
-- =============================================================================

-- Track individual problem attempts for detailed analytics
CREATE TABLE IF NOT EXISTS public.deep_practice_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    progress_id UUID NOT NULL REFERENCES public.deep_practice_progress(id) ON DELETE CASCADE,
    problem_index INTEGER NOT NULL,

    -- Attempt details
    attempt_number INTEGER NOT NULL,
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    used_hint BOOLEAN DEFAULT false,
    hint_level INTEGER DEFAULT 0 CHECK (hint_level BETWEEN 0 AND 3),
    response_time_ms INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for querying attempts by progress
CREATE INDEX IF NOT EXISTS idx_deep_practice_attempts_progress
ON public.deep_practice_attempts(progress_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE public.deep_practice_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deep_practice_attempts ENABLE ROW LEVEL SECURITY;

-- Deep practice progress policies
CREATE POLICY "Users can view their own deep practice progress"
    ON public.deep_practice_progress FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deep practice progress"
    ON public.deep_practice_progress FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deep practice progress"
    ON public.deep_practice_progress FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own deep practice progress"
    ON public.deep_practice_progress FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Deep practice attempts policies (via progress_id join)
CREATE POLICY "Users can view their own attempts"
    ON public.deep_practice_attempts FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.deep_practice_progress
            WHERE id = progress_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own attempts"
    ON public.deep_practice_attempts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.deep_practice_progress
            WHERE id = progress_id AND user_id = auth.uid()
        )
    );

-- =============================================================================
-- Updated_at trigger
-- =============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deep_practice_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deep_practice_progress_updated_at
    BEFORE UPDATE ON public.deep_practice_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_deep_practice_progress_updated_at();
