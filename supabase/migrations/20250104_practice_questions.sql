-- Migration: Practice Question Bank
-- Date: 2025-01-04
-- Description: Adds tables for standalone practice mode with targeted,
--              mixed, and exam prep sessions

-- =============================================================================
-- Practice Questions Bank
-- =============================================================================

-- Store practice questions (can be generated or manually created)
CREATE TABLE IF NOT EXISTS public.practice_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Source reference
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    -- Classification
    subject TEXT,
    topic TEXT,
    subtopic TEXT,
    -- Question content
    question_type TEXT NOT NULL CHECK (question_type IN (
        'multiple_choice', 'true_false', 'fill_blank',
        'short_answer', 'matching', 'sequence'
    )),
    question_text TEXT NOT NULL,
    options JSONB, -- For multiple choice, matching, sequence
    correct_answer TEXT NOT NULL, -- Index for MC, text for fill_blank/short_answer
    explanation TEXT,
    -- Difficulty and concept linkage
    difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
    cognitive_level TEXT CHECK (cognitive_level IN (
        'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'
    )),
    primary_concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
    related_concept_ids UUID[],
    -- Performance tracking
    times_shown INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    -- Metadata
    tags TEXT[],
    source TEXT CHECK (source IN ('generated', 'manual', 'imported', 'srs')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_practice_questions_course
ON public.practice_questions(course_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_practice_questions_concept
ON public.practice_questions(primary_concept_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_practice_questions_difficulty
ON public.practice_questions(difficulty_level) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_practice_questions_subject_topic
ON public.practice_questions(subject, topic) WHERE is_active = true;

-- GIN index for related concepts
CREATE INDEX IF NOT EXISTS idx_practice_questions_related_concepts
ON public.practice_questions USING GIN (related_concept_ids) WHERE is_active = true;

-- =============================================================================
-- Practice Sessions
-- =============================================================================

-- Track practice sessions
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Session configuration
    session_type TEXT NOT NULL CHECK (session_type IN (
        'targeted',    -- Focus on specific concepts (gaps)
        'mixed',       -- Interleaved from all courses
        'exam_prep',   -- Course-specific intensive
        'quick',       -- Fast 5-10 question session
        'custom'       -- User-defined criteria
    )),
    course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    -- Targeting
    target_concept_ids UUID[],
    target_difficulty INTEGER CHECK (target_difficulty BETWEEN 1 AND 5),
    -- Session configuration
    question_count INTEGER NOT NULL DEFAULT 10,
    time_limit_minutes INTEGER,
    -- Progress
    questions_answered INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    current_question_index INTEGER DEFAULT 0,
    -- Question order (array of question IDs)
    question_order UUID[] NOT NULL DEFAULT '{}',
    -- Results
    accuracy DECIMAL(4,3),
    avg_response_time_ms INTEGER,
    gaps_identified UUID[],
    concepts_practiced UUID[],
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_time_seconds INTEGER,
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user
ON public.practice_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_status
ON public.practice_sessions(user_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_recent
ON public.practice_sessions(user_id, created_at DESC);

-- =============================================================================
-- Practice Session Questions (junction table for answers)
-- =============================================================================

-- Track individual question attempts within a session
CREATE TABLE IF NOT EXISTS public.practice_session_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.practice_questions(id) ON DELETE CASCADE,
    -- Order in session
    question_index INTEGER NOT NULL,
    -- Answer
    user_answer TEXT,
    is_correct BOOLEAN,
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    answered_at TIMESTAMP WITH TIME ZONE,
    response_time_ms INTEGER,
    -- Hints
    hint_used BOOLEAN DEFAULT false,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Unique constraint
    UNIQUE(session_id, question_index)
);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_practice_session_questions_session
ON public.practice_session_questions(session_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Practice questions - readable by all authenticated
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active practice questions"
    ON public.practice_questions FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "System can insert practice questions"
    ON public.practice_questions FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "System can update practice questions"
    ON public.practice_questions FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Practice sessions - users own their sessions
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own practice sessions"
    ON public.practice_sessions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice sessions"
    ON public.practice_sessions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice sessions"
    ON public.practice_sessions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Practice session questions
ALTER TABLE public.practice_session_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their session questions"
    ON public.practice_session_questions FOR SELECT
    TO authenticated
    USING (
        session_id IN (
            SELECT id FROM public.practice_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their session questions"
    ON public.practice_session_questions FOR INSERT
    TO authenticated
    WITH CHECK (
        session_id IN (
            SELECT id FROM public.practice_sessions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their session questions"
    ON public.practice_session_questions FOR UPDATE
    TO authenticated
    USING (
        session_id IN (
            SELECT id FROM public.practice_sessions WHERE user_id = auth.uid()
        )
    );

-- =============================================================================
-- Functions
-- =============================================================================

-- Function: Create a practice session with selected questions
CREATE OR REPLACE FUNCTION public.create_practice_session(
    p_user_id UUID,
    p_session_type TEXT,
    p_course_id UUID DEFAULT NULL,
    p_target_concept_ids UUID[] DEFAULT NULL,
    p_target_difficulty INTEGER DEFAULT NULL,
    p_question_count INTEGER DEFAULT 10,
    p_time_limit_minutes INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_question_ids UUID[];
    v_weak_concept_ids UUID[];
BEGIN
    -- Get user's weak concepts if targeting gaps
    IF p_session_type = 'targeted' AND p_target_concept_ids IS NULL THEN
        SELECT ARRAY_AGG(concept_id) INTO v_weak_concept_ids
        FROM public.user_knowledge_gaps
        WHERE user_id = p_user_id
        AND resolved = false
        AND severity IN ('critical', 'moderate');

        p_target_concept_ids := v_weak_concept_ids;
    END IF;

    -- Select questions based on criteria
    SELECT ARRAY_AGG(q.id ORDER BY RANDOM())
    INTO v_question_ids
    FROM (
        SELECT pq.id
        FROM public.practice_questions pq
        WHERE pq.is_active = true
        AND (p_course_id IS NULL OR pq.course_id = p_course_id)
        AND (p_target_difficulty IS NULL OR pq.difficulty_level = p_target_difficulty)
        AND (
            p_target_concept_ids IS NULL
            OR pq.primary_concept_id = ANY(p_target_concept_ids)
            OR pq.related_concept_ids && p_target_concept_ids
        )
        ORDER BY
            -- Prioritize questions for target concepts
            CASE WHEN pq.primary_concept_id = ANY(p_target_concept_ids) THEN 0 ELSE 1 END,
            -- Then by less shown
            pq.times_shown ASC,
            RANDOM()
        LIMIT p_question_count
    ) q;

    -- If not enough questions, fill with any available
    IF array_length(v_question_ids, 1) IS NULL OR array_length(v_question_ids, 1) < p_question_count THEN
        SELECT ARRAY_AGG(q.id ORDER BY RANDOM())
        INTO v_question_ids
        FROM (
            SELECT pq.id
            FROM public.practice_questions pq
            WHERE pq.is_active = true
            AND (p_course_id IS NULL OR pq.course_id = p_course_id)
            AND (v_question_ids IS NULL OR NOT pq.id = ANY(v_question_ids))
            ORDER BY RANDOM()
            LIMIT p_question_count - COALESCE(array_length(v_question_ids, 1), 0)
        ) q;
    END IF;

    -- Create the session
    INSERT INTO public.practice_sessions (
        user_id,
        session_type,
        course_id,
        target_concept_ids,
        target_difficulty,
        question_count,
        time_limit_minutes,
        question_order
    )
    VALUES (
        p_user_id,
        p_session_type,
        p_course_id,
        p_target_concept_ids,
        p_target_difficulty,
        COALESCE(array_length(v_question_ids, 1), 0),
        p_time_limit_minutes,
        v_question_ids
    )
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$;

-- Function: Answer a practice question
CREATE OR REPLACE FUNCTION public.answer_practice_question(
    p_session_id UUID,
    p_question_id UUID,
    p_question_index INTEGER,
    p_user_answer TEXT,
    p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS TABLE (
    is_correct BOOLEAN,
    correct_answer TEXT,
    explanation TEXT,
    session_progress JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_question public.practice_questions;
    v_is_correct BOOLEAN;
    v_session public.practice_sessions;
BEGIN
    -- Get the question
    SELECT * INTO v_question
    FROM public.practice_questions
    WHERE id = p_question_id;

    IF v_question IS NULL THEN
        RAISE EXCEPTION 'Question not found';
    END IF;

    -- Check answer
    v_is_correct := (
        CASE v_question.question_type
            WHEN 'multiple_choice' THEN p_user_answer = v_question.correct_answer
            WHEN 'true_false' THEN LOWER(p_user_answer) = LOWER(v_question.correct_answer)
            WHEN 'fill_blank' THEN LOWER(TRIM(p_user_answer)) = LOWER(TRIM(v_question.correct_answer))
            ELSE p_user_answer = v_question.correct_answer
        END
    );

    -- Record the answer
    INSERT INTO public.practice_session_questions (
        session_id,
        question_id,
        question_index,
        user_answer,
        is_correct,
        answered_at,
        response_time_ms
    )
    VALUES (
        p_session_id,
        p_question_id,
        p_question_index,
        p_user_answer,
        v_is_correct,
        now(),
        p_response_time_ms
    )
    ON CONFLICT (session_id, question_index)
    DO UPDATE SET
        user_answer = p_user_answer,
        is_correct = v_is_correct,
        answered_at = now(),
        response_time_ms = p_response_time_ms;

    -- Update session progress
    UPDATE public.practice_sessions
    SET
        questions_answered = questions_answered + 1,
        questions_correct = questions_correct + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
        current_question_index = p_question_index + 1
    WHERE id = p_session_id
    RETURNING * INTO v_session;

    -- Update question stats
    UPDATE public.practice_questions
    SET
        times_shown = times_shown + 1,
        times_correct = times_correct + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
        avg_response_time_ms = CASE
            WHEN avg_response_time_ms IS NULL THEN p_response_time_ms
            ELSE (avg_response_time_ms * times_shown + COALESCE(p_response_time_ms, 0)) / (times_shown + 1)
        END,
        updated_at = now()
    WHERE id = p_question_id;

    RETURN QUERY SELECT
        v_is_correct,
        v_question.correct_answer,
        v_question.explanation,
        jsonb_build_object(
            'questions_answered', v_session.questions_answered,
            'questions_correct', v_session.questions_correct,
            'total_questions', v_session.question_count,
            'accuracy', CASE
                WHEN v_session.questions_answered > 0
                THEN ROUND((v_session.questions_correct::DECIMAL / v_session.questions_answered) * 100, 1)
                ELSE 0
            END
        );
END;
$$;

-- Function: Complete a practice session
CREATE OR REPLACE FUNCTION public.complete_practice_session(
    p_session_id UUID
)
RETURNS public.practice_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session public.practice_sessions;
    v_concepts_practiced UUID[];
    v_gaps_identified UUID[];
    v_total_time INTEGER;
    v_avg_time INTEGER;
BEGIN
    -- Get concepts practiced
    SELECT ARRAY_AGG(DISTINCT pq.primary_concept_id)
    INTO v_concepts_practiced
    FROM public.practice_session_questions psq
    JOIN public.practice_questions pq ON pq.id = psq.question_id
    WHERE psq.session_id = p_session_id
    AND pq.primary_concept_id IS NOT NULL;

    -- Identify potential gaps (concepts with <50% accuracy in this session)
    SELECT ARRAY_AGG(concept_id)
    INTO v_gaps_identified
    FROM (
        SELECT
            pq.primary_concept_id as concept_id,
            COUNT(*) as total,
            SUM(CASE WHEN psq.is_correct THEN 1 ELSE 0 END) as correct
        FROM public.practice_session_questions psq
        JOIN public.practice_questions pq ON pq.id = psq.question_id
        WHERE psq.session_id = p_session_id
        AND pq.primary_concept_id IS NOT NULL
        GROUP BY pq.primary_concept_id
        HAVING SUM(CASE WHEN psq.is_correct THEN 1 ELSE 0 END)::DECIMAL / COUNT(*) < 0.5
    ) gaps;

    -- Calculate timing
    SELECT
        EXTRACT(EPOCH FROM (now() - ps.started_at))::INTEGER,
        AVG(psq.response_time_ms)::INTEGER
    INTO v_total_time, v_avg_time
    FROM public.practice_sessions ps
    LEFT JOIN public.practice_session_questions psq ON psq.session_id = ps.id
    WHERE ps.id = p_session_id
    GROUP BY ps.id, ps.started_at;

    -- Update session
    UPDATE public.practice_sessions
    SET
        status = 'completed',
        completed_at = now(),
        accuracy = CASE
            WHEN questions_answered > 0
            THEN questions_correct::DECIMAL / questions_answered
            ELSE 0
        END,
        avg_response_time_ms = v_avg_time,
        total_time_seconds = v_total_time,
        concepts_practiced = v_concepts_practiced,
        gaps_identified = v_gaps_identified
    WHERE id = p_session_id
    RETURNING * INTO v_session;

    RETURN v_session;
END;
$$;

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function: Update question statistics after an answer
CREATE OR REPLACE FUNCTION public.update_question_stats(
    p_question_id UUID,
    p_is_correct BOOLEAN,
    p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.practice_questions
    SET
        times_shown = times_shown + 1,
        times_correct = times_correct + (CASE WHEN p_is_correct THEN 1 ELSE 0 END),
        avg_response_time_ms = CASE
            WHEN avg_response_time_ms IS NULL THEN p_response_time_ms
            WHEN p_response_time_ms IS NULL THEN avg_response_time_ms
            ELSE (avg_response_time_ms * times_shown + p_response_time_ms) / (times_shown + 1)
        END,
        updated_at = now()
    WHERE id = p_question_id;
END;
$$;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE public.practice_questions IS 'Bank of practice questions for standalone practice mode';
COMMENT ON TABLE public.practice_sessions IS 'Practice sessions with various types (targeted, mixed, exam_prep, etc.)';
COMMENT ON TABLE public.practice_session_questions IS 'Individual question attempts within a practice session';
COMMENT ON FUNCTION public.create_practice_session IS 'Creates a new practice session with selected questions';
COMMENT ON FUNCTION public.answer_practice_question IS 'Records an answer and returns feedback';
COMMENT ON FUNCTION public.complete_practice_session IS 'Completes a session and calculates final stats';
