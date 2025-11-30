-- ============================================
-- PROGRESS TRACKING MIGRATION
-- Adds study_sessions and lesson_progress tables
-- ============================================

-- ============================================
-- 1. STUDY_SESSIONS TABLE
-- Tracks study session boundaries for accurate time tracking
-- ============================================

CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('lesson', 'practice', 'review', 'exam')),
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    lesson_index INTEGER,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER GENERATED ALWAYS AS (
        CASE
            WHEN ended_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER
            ELSE NULL
        END
    ) STORED,
    -- Activity metrics
    cards_reviewed INTEGER NOT NULL DEFAULT 0,
    questions_answered INTEGER NOT NULL DEFAULT 0,
    questions_correct INTEGER NOT NULL DEFAULT 0,
    -- Status
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for study_sessions
CREATE INDEX IF NOT EXISTS study_sessions_user_id_idx ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS study_sessions_started_at_idx ON public.study_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS study_sessions_user_started_idx ON public.study_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS study_sessions_session_type_idx ON public.study_sessions(session_type);

-- Enable RLS
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for study_sessions
CREATE POLICY "Users can view own study sessions"
    ON public.study_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study sessions"
    ON public.study_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions"
    ON public.study_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions"
    ON public.study_sessions
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 2. LESSON_PROGRESS TABLE
-- Tracks per-lesson mastery and completion
-- ============================================

CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_index INTEGER NOT NULL,
    lesson_title TEXT,
    -- Progress tracking
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    -- Performance metrics
    mastery_level DECIMAL(4,3) NOT NULL DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 1),
    total_attempts INTEGER NOT NULL DEFAULT 0,
    total_correct INTEGER NOT NULL DEFAULT 0,
    -- Time tracking
    total_time_seconds INTEGER NOT NULL DEFAULT 0,
    last_studied_at TIMESTAMP WITH TIME ZONE,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure one progress record per user per course per lesson
    UNIQUE(user_id, course_id, lesson_index)
);

-- Indexes for lesson_progress
CREATE INDEX IF NOT EXISTS lesson_progress_user_id_idx ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS lesson_progress_course_id_idx ON public.lesson_progress(course_id);
CREATE INDEX IF NOT EXISTS lesson_progress_user_course_idx ON public.lesson_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS lesson_progress_mastery_idx ON public.lesson_progress(mastery_level);
CREATE INDEX IF NOT EXISTS lesson_progress_completed_idx ON public.lesson_progress(completed);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS lesson_progress_updated_at ON public.lesson_progress;
CREATE TRIGGER lesson_progress_updated_at
    BEFORE UPDATE ON public.lesson_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lesson_progress
CREATE POLICY "Users can view own lesson progress"
    ON public.lesson_progress
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own lesson progress"
    ON public.lesson_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson progress"
    ON public.lesson_progress
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lesson progress"
    ON public.lesson_progress
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 3. ADD course_id TO review_logs for better tracking
-- (This is a non-breaking addition)
-- ============================================

-- Add course_id to review_logs if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'review_logs'
        AND column_name = 'course_id'
    ) THEN
        ALTER TABLE public.review_logs ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add lesson_index to review_logs if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'review_logs'
        AND column_name = 'lesson_index'
    ) THEN
        ALTER TABLE public.review_logs ADD COLUMN lesson_index INTEGER;
    END IF;
END $$;

-- Create index for the new columns
CREATE INDEX IF NOT EXISTS review_logs_course_id_idx ON public.review_logs(course_id);

-- ============================================
-- 4. HELPER FUNCTION: Calculate lesson mastery
-- ============================================

CREATE OR REPLACE FUNCTION public.calculate_lesson_mastery(
    p_user_id UUID,
    p_course_id UUID,
    p_lesson_index INTEGER
) RETURNS DECIMAL(4,3) AS $$
DECLARE
    v_total_questions INTEGER;
    v_correct_questions INTEGER;
    v_recent_accuracy DECIMAL(4,3);
    v_recency_weight DECIMAL(4,3);
    v_mastery DECIMAL(4,3);
BEGIN
    -- Get performance from step_performance
    SELECT
        COUNT(*) FILTER (WHERE was_correct IS NOT NULL),
        COUNT(*) FILTER (WHERE was_correct = true)
    INTO v_total_questions, v_correct_questions
    FROM public.step_performance
    WHERE user_id = p_user_id
    AND course_id = p_course_id
    AND lesson_index = p_lesson_index
    AND step_type IN ('multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'matching', 'sequence', 'question');

    -- Calculate base accuracy
    IF v_total_questions > 0 THEN
        v_recent_accuracy := v_correct_questions::DECIMAL / v_total_questions;
    ELSE
        v_recent_accuracy := 0;
    END IF;

    -- Apply recency weight (more recent = higher weight)
    SELECT
        CASE
            WHEN MAX(created_at) > now() - INTERVAL '1 day' THEN 1.0
            WHEN MAX(created_at) > now() - INTERVAL '3 days' THEN 0.9
            WHEN MAX(created_at) > now() - INTERVAL '7 days' THEN 0.8
            WHEN MAX(created_at) > now() - INTERVAL '14 days' THEN 0.7
            ELSE 0.6
        END
    INTO v_recency_weight
    FROM public.step_performance
    WHERE user_id = p_user_id
    AND course_id = p_course_id
    AND lesson_index = p_lesson_index;

    -- Final mastery = accuracy * recency weight
    v_mastery := COALESCE(v_recent_accuracy * COALESCE(v_recency_weight, 0.5), 0);

    RETURN LEAST(v_mastery, 1.0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. FUNCTION: Update lesson progress after activity
-- ============================================

CREATE OR REPLACE FUNCTION public.update_lesson_progress(
    p_user_id UUID,
    p_course_id UUID,
    p_lesson_index INTEGER,
    p_lesson_title TEXT,
    p_questions_answered INTEGER DEFAULT 0,
    p_questions_correct INTEGER DEFAULT 0,
    p_time_seconds INTEGER DEFAULT 0,
    p_completed BOOLEAN DEFAULT false
) RETURNS public.lesson_progress AS $$
DECLARE
    v_result public.lesson_progress;
    v_mastery DECIMAL(4,3);
BEGIN
    -- Calculate new mastery
    v_mastery := public.calculate_lesson_mastery(p_user_id, p_course_id, p_lesson_index);

    -- Upsert lesson progress
    INSERT INTO public.lesson_progress (
        user_id, course_id, lesson_index, lesson_title,
        completed, completed_at,
        mastery_level, total_attempts, total_correct,
        total_time_seconds, last_studied_at
    ) VALUES (
        p_user_id, p_course_id, p_lesson_index, p_lesson_title,
        p_completed, CASE WHEN p_completed THEN now() ELSE NULL END,
        v_mastery, p_questions_answered, p_questions_correct,
        p_time_seconds, now()
    )
    ON CONFLICT (user_id, course_id, lesson_index)
    DO UPDATE SET
        lesson_title = COALESCE(EXCLUDED.lesson_title, lesson_progress.lesson_title),
        completed = lesson_progress.completed OR EXCLUDED.completed,
        completed_at = COALESCE(lesson_progress.completed_at, EXCLUDED.completed_at),
        mastery_level = EXCLUDED.mastery_level,
        total_attempts = lesson_progress.total_attempts + EXCLUDED.total_attempts,
        total_correct = lesson_progress.total_correct + EXCLUDED.total_correct,
        total_time_seconds = lesson_progress.total_time_seconds + EXCLUDED.total_time_seconds,
        last_studied_at = now()
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
