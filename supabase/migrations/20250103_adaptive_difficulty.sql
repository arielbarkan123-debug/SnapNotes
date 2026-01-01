-- Migration: Adaptive Difficulty System
-- Date: 2025-01-03
-- Description: Adds tables for tracking question difficulty and user performance state
--              to enable real-time adaptive difficulty adjustment

-- =============================================================================
-- Question Difficulty Metadata
-- =============================================================================

-- Track difficulty for all question types (exam, lesson, practice)
CREATE TABLE IF NOT EXISTS public.question_difficulty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Question source and reference
    question_source TEXT NOT NULL CHECK (question_source IN ('exam', 'lesson', 'practice', 'srs')),
    question_id UUID NOT NULL,
    -- Difficulty metrics
    base_difficulty INTEGER DEFAULT 3 CHECK (base_difficulty BETWEEN 1 AND 5),
    empirical_difficulty DECIMAL(4,3), -- Calculated from actual performance (0-1)
    -- Concept linkage
    primary_concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
    -- Bloom's taxonomy level
    cognitive_level TEXT CHECK (cognitive_level IN (
        'remember',    -- Level 1: Recall facts
        'understand',  -- Level 2: Explain ideas
        'apply',       -- Level 3: Use in new situations
        'analyze',     -- Level 4: Draw connections
        'evaluate',    -- Level 5: Justify decisions
        'create'       -- Level 6: Produce new work
    )),
    -- Performance tracking
    times_shown INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Unique constraint
    UNIQUE(question_source, question_id)
);

-- Index for finding questions by difficulty
CREATE INDEX IF NOT EXISTS idx_question_difficulty_level
ON public.question_difficulty(base_difficulty, empirical_difficulty);

-- Index for finding questions by concept
CREATE INDEX IF NOT EXISTS idx_question_difficulty_concept
ON public.question_difficulty(primary_concept_id);

-- =============================================================================
-- User Performance State
-- =============================================================================

-- Track user's current performance state per course for adaptive selection
CREATE TABLE IF NOT EXISTS public.user_performance_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    -- Difficulty targeting
    session_difficulty_level DECIMAL(4,2) DEFAULT 2.5 CHECK (session_difficulty_level BETWEEN 1 AND 5),
    target_difficulty DECIMAL(4,2) DEFAULT 3.0,
    -- Performance metrics (rolling averages)
    rolling_accuracy DECIMAL(4,3) DEFAULT 0.5 CHECK (rolling_accuracy BETWEEN 0 AND 1),
    rolling_response_time_ms INTEGER DEFAULT 0,
    -- Ability estimation (simplified IRT)
    estimated_ability DECIMAL(4,2) DEFAULT 2.5 CHECK (estimated_ability BETWEEN 1 AND 5),
    -- Streak tracking for difficulty adjustment
    correct_streak INTEGER DEFAULT 0,
    wrong_streak INTEGER DEFAULT 0,
    -- Last cognitive level used (for variety)
    last_cognitive_level TEXT,
    -- Session stats
    questions_answered INTEGER DEFAULT 0,
    session_start TIMESTAMP WITH TIME ZONE,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Unique constraint
    UNIQUE(user_id, course_id)
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_user_performance_state_user
ON public.user_performance_state(user_id);

-- Index for course lookup
CREATE INDEX IF NOT EXISTS idx_user_performance_state_course
ON public.user_performance_state(user_id, course_id);

-- =============================================================================
-- Performance History (for analytics)
-- =============================================================================

-- Track performance over time for trend analysis
CREATE TABLE IF NOT EXISTS public.user_performance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    -- Snapshot data
    accuracy DECIMAL(4,3),
    estimated_ability DECIMAL(4,2),
    questions_answered INTEGER,
    -- Time window
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_user_performance_history_time
ON public.user_performance_history(user_id, recorded_at DESC);

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Question difficulty - readable by all authenticated, writable by system
ALTER TABLE public.question_difficulty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read question difficulty"
    ON public.question_difficulty FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "System can insert question difficulty"
    ON public.question_difficulty FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "System can update question difficulty"
    ON public.question_difficulty FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- User performance state - users can only access their own
ALTER TABLE public.user_performance_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own performance state"
    ON public.user_performance_state FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance state"
    ON public.user_performance_state FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own performance state"
    ON public.user_performance_state FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- User performance history
ALTER TABLE public.user_performance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own performance history"
    ON public.user_performance_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance history"
    ON public.user_performance_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- Functions
-- =============================================================================

-- Function: Update question difficulty based on performance
CREATE OR REPLACE FUNCTION public.update_question_difficulty(
    p_question_source TEXT,
    p_question_id UUID,
    p_is_correct BOOLEAN,
    p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_times_shown INTEGER;
    v_times_correct INTEGER;
    v_avg_time INTEGER;
BEGIN
    -- Get or create difficulty record
    INSERT INTO public.question_difficulty (question_source, question_id)
    VALUES (p_question_source, p_question_id)
    ON CONFLICT (question_source, question_id) DO NOTHING;

    -- Update stats
    UPDATE public.question_difficulty
    SET
        times_shown = times_shown + 1,
        times_correct = times_correct + (CASE WHEN p_is_correct THEN 1 ELSE 0 END),
        avg_response_time_ms = CASE
            WHEN p_response_time_ms IS NOT NULL THEN
                COALESCE(
                    (avg_response_time_ms * times_shown + p_response_time_ms) / (times_shown + 1),
                    p_response_time_ms
                )
            ELSE avg_response_time_ms
        END,
        -- Recalculate empirical difficulty (inverse of success rate)
        empirical_difficulty = CASE
            WHEN times_shown > 0 THEN
                1.0 - (times_correct::DECIMAL / times_shown::DECIMAL)
            ELSE NULL
        END,
        updated_at = now()
    WHERE question_source = p_question_source
    AND question_id = p_question_id;
END;
$$;

-- Function: Get or create user performance state
CREATE OR REPLACE FUNCTION public.get_or_create_performance_state(
    p_user_id UUID,
    p_course_id UUID DEFAULT NULL
)
RETURNS public.user_performance_state
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_state public.user_performance_state;
BEGIN
    -- Try to get existing state
    SELECT * INTO v_state
    FROM public.user_performance_state
    WHERE user_id = p_user_id
    AND (course_id = p_course_id OR (course_id IS NULL AND p_course_id IS NULL));

    -- Create if not exists
    IF v_state IS NULL THEN
        INSERT INTO public.user_performance_state (user_id, course_id, session_start)
        VALUES (p_user_id, p_course_id, now())
        RETURNING * INTO v_state;
    END IF;

    RETURN v_state;
END;
$$;

-- Function: Update user performance after answering a question
CREATE OR REPLACE FUNCTION public.update_user_performance(
    p_user_id UUID,
    p_course_id UUID,
    p_is_correct BOOLEAN,
    p_question_difficulty DECIMAL DEFAULT 3.0,
    p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS public.user_performance_state
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_state public.user_performance_state;
    v_alpha DECIMAL := 0.1;  -- Learning rate for rolling average
    v_ability_lr DECIMAL := 0.3;  -- Learning rate for ability estimation
    v_new_accuracy DECIMAL;
    v_new_ability DECIMAL;
    v_expected_prob DECIMAL;
    v_surprise DECIMAL;
BEGIN
    -- Get or create performance state
    SELECT * INTO v_state
    FROM public.get_or_create_performance_state(p_user_id, p_course_id);

    -- Calculate new rolling accuracy
    v_new_accuracy := v_state.rolling_accuracy * (1 - v_alpha) +
                      (CASE WHEN p_is_correct THEN 1 ELSE 0 END) * v_alpha;

    -- Update ability estimate using simplified IRT
    -- P(correct) = 1 / (1 + exp(-(ability - difficulty)))
    v_expected_prob := 1.0 / (1.0 + exp(-(v_state.estimated_ability - p_question_difficulty)));
    v_surprise := (CASE WHEN p_is_correct THEN 1 ELSE 0 END) - v_expected_prob;
    v_new_ability := v_state.estimated_ability + v_ability_lr * v_surprise;
    v_new_ability := GREATEST(1.0, LEAST(5.0, v_new_ability));

    -- Update state
    UPDATE public.user_performance_state
    SET
        rolling_accuracy = v_new_accuracy,
        estimated_ability = v_new_ability,
        correct_streak = CASE WHEN p_is_correct THEN correct_streak + 1 ELSE 0 END,
        wrong_streak = CASE WHEN p_is_correct THEN 0 ELSE wrong_streak + 1 END,
        questions_answered = questions_answered + 1,
        rolling_response_time_ms = CASE
            WHEN p_response_time_ms IS NOT NULL THEN
                COALESCE(
                    rolling_response_time_ms * 0.9 + p_response_time_ms * 0.1,
                    p_response_time_ms
                )::INTEGER
            ELSE rolling_response_time_ms
        END,
        -- Adjust target difficulty based on performance
        target_difficulty = CASE
            WHEN v_new_accuracy > 0.85 THEN LEAST(5.0, target_difficulty + 0.3)
            WHEN v_new_accuracy < 0.65 THEN GREATEST(1.0, target_difficulty - 0.3)
            ELSE target_difficulty
        END,
        session_difficulty_level = CASE
            WHEN correct_streak >= 3 AND p_is_correct THEN LEAST(5.0, session_difficulty_level + 0.2)
            WHEN wrong_streak >= 3 AND NOT p_is_correct THEN GREATEST(1.0, session_difficulty_level - 0.2)
            ELSE session_difficulty_level
        END,
        updated_at = now()
    WHERE id = v_state.id
    RETURNING * INTO v_state;

    RETURN v_state;
END;
$$;

-- Function: Select next question with adaptive difficulty
CREATE OR REPLACE FUNCTION public.select_adaptive_question(
    p_user_id UUID,
    p_course_id UUID,
    p_available_question_ids UUID[],
    p_weak_concept_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
    question_id UUID,
    score DECIMAL,
    difficulty_match DECIMAL,
    concept_priority DECIMAL,
    variety_bonus DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_state public.user_performance_state;
    v_target_difficulty DECIMAL;
BEGIN
    -- Get user's current performance state
    SELECT * INTO v_state
    FROM public.get_or_create_performance_state(p_user_id, p_course_id);

    v_target_difficulty := v_state.target_difficulty;

    RETURN QUERY
    SELECT
        qd.question_id,
        -- Total score (sum of all factors)
        (
            -- Difficulty match (0-50 points): closer to target = higher score
            (1 - ABS(COALESCE(qd.base_difficulty, 3) - v_target_difficulty) / 4) * 50 +
            -- Concept priority (0-30 points): weak concepts get bonus
            CASE
                WHEN p_weak_concept_ids IS NOT NULL AND qd.primary_concept_id = ANY(p_weak_concept_ids)
                THEN 30
                ELSE 0
            END +
            -- Variety bonus (0-10 points): different cognitive level
            CASE
                WHEN qd.cognitive_level IS DISTINCT FROM v_state.last_cognitive_level
                THEN 10
                ELSE 0
            END +
            -- Freshness (0-10 points): less shown = higher score
            CASE
                WHEN qd.times_shown IS NULL OR qd.times_shown = 0 THEN 10
                ELSE GREATEST(0, 10 - qd.times_shown)
            END
        )::DECIMAL as score,
        -- Component breakdowns for debugging
        ((1 - ABS(COALESCE(qd.base_difficulty, 3) - v_target_difficulty) / 4) * 50)::DECIMAL as difficulty_match,
        (CASE
            WHEN p_weak_concept_ids IS NOT NULL AND qd.primary_concept_id = ANY(p_weak_concept_ids)
            THEN 30
            ELSE 0
        END)::DECIMAL as concept_priority,
        (CASE
            WHEN qd.cognitive_level IS DISTINCT FROM v_state.last_cognitive_level
            THEN 10
            ELSE 0
        END)::DECIMAL as variety_bonus
    FROM public.question_difficulty qd
    WHERE qd.question_id = ANY(p_available_question_ids)
    ORDER BY score DESC;
END;
$$;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE public.question_difficulty IS 'Tracks difficulty metrics for all question types';
COMMENT ON TABLE public.user_performance_state IS 'Current performance state for adaptive difficulty';
COMMENT ON TABLE public.user_performance_history IS 'Historical performance snapshots for trend analysis';
COMMENT ON FUNCTION public.update_question_difficulty IS 'Updates question difficulty based on student performance';
COMMENT ON FUNCTION public.update_user_performance IS 'Updates user performance state after answering a question';
COMMENT ON FUNCTION public.select_adaptive_question IS 'Selects the best next question based on adaptive difficulty';
