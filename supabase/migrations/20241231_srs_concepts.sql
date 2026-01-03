-- Migration: SRS Concept Integration
-- Date: 2025-01-02
-- Description: Adds concept_ids to review_cards for linking SRS with knowledge graph

-- =============================================================================
-- Add concept_ids column to review_cards
-- =============================================================================

-- Add concept_ids array column to track which concepts a card tests
ALTER TABLE public.review_cards
ADD COLUMN IF NOT EXISTS concept_ids UUID[] DEFAULT NULL;

-- Create index for finding cards by concept
CREATE INDEX IF NOT EXISTS idx_review_cards_concept_ids
ON public.review_cards USING GIN (concept_ids);

-- =============================================================================
-- Daily review session tracking
-- =============================================================================

-- Track daily review sessions with gap-awareness
CREATE TABLE IF NOT EXISTS public.review_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('daily', 'targeted', 'gap_fix', 'custom')),
    -- Session composition
    total_cards INTEGER DEFAULT 0,
    review_cards INTEGER DEFAULT 0,
    new_cards INTEGER DEFAULT 0,
    gap_cards INTEGER DEFAULT 0,
    reinforcement_cards INTEGER DEFAULT 0,
    -- Target concepts (for targeted/gap_fix sessions)
    target_concept_ids UUID[],
    -- Progress
    cards_completed INTEGER DEFAULT 0,
    cards_correct INTEGER DEFAULT 0,
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    total_time_seconds INTEGER,
    -- Session state
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    -- Stats
    average_rating DECIMAL(3,2),
    gaps_addressed UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for user sessions
CREATE INDEX IF NOT EXISTS idx_review_sessions_user ON public.review_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_review_sessions_user_active ON public.review_sessions(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_review_sessions_user_date ON public.review_sessions(user_id, started_at DESC);

-- =============================================================================
-- Row Level Security for review_sessions
-- =============================================================================

ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own review sessions"
    ON public.review_sessions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own review sessions"
    ON public.review_sessions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review sessions"
    ON public.review_sessions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- Function: Get cards targeting specific concepts
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_cards_for_concepts(
    p_user_id UUID,
    p_concept_ids UUID[],
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    course_id UUID,
    front TEXT,
    back TEXT,
    card_type TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    state TEXT,
    concept_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rc.id,
        rc.course_id,
        rc.front,
        rc.back,
        rc.card_type,
        rc.due_date,
        rc.state,
        rc.concept_ids
    FROM public.review_cards rc
    WHERE rc.user_id = p_user_id
    AND rc.concept_ids && p_concept_ids  -- Has overlap with target concepts
    ORDER BY
        -- Prioritize cards that are due
        CASE WHEN rc.due_date <= now() THEN 0 ELSE 1 END,
        -- Then by how overdue they are
        rc.due_date ASC
    LIMIT p_limit;
END;
$$;

-- =============================================================================
-- Function: Generate daily session with gap awareness
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_daily_session(
    p_user_id UUID,
    p_max_cards INTEGER DEFAULT 50,
    p_new_card_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    card_id UUID,
    card_source TEXT,  -- 'due', 'gap', 'reinforcement', 'new'
    priority INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_gap_concept_ids UUID[];
    v_decay_concept_ids UUID[];
    v_cards_added INTEGER := 0;
    v_row_count INTEGER := 0;
BEGIN
    -- 1. Get concepts with active gaps
    SELECT ARRAY_AGG(concept_id) INTO v_gap_concept_ids
    FROM public.user_knowledge_gaps
    WHERE user_id = p_user_id
    AND resolved = false
    AND severity IN ('critical', 'moderate');

    -- 2. Get concepts showing decay
    SELECT ARRAY_AGG(concept_id) INTO v_decay_concept_ids
    FROM public.user_concept_mastery
    WHERE user_id = p_user_id
    AND peak_mastery > 0.6
    AND mastery_level < peak_mastery * 0.7
    AND (last_reviewed_at IS NULL OR last_reviewed_at < now() - INTERVAL '7 days');

    -- 3. Return due cards first (priority 1)
    RETURN QUERY
    SELECT rc.id, 'due'::TEXT, 1
    FROM public.review_cards rc
    WHERE rc.user_id = p_user_id
    AND rc.due_date <= now()
    ORDER BY rc.due_date ASC
    LIMIT GREATEST(p_max_cards - p_new_card_limit, 20);

    GET DIAGNOSTICS v_cards_added = ROW_COUNT;

    -- 4. Add gap-targeted cards (priority 2) if we have gaps
    IF v_gap_concept_ids IS NOT NULL AND array_length(v_gap_concept_ids, 1) > 0 THEN
        RETURN QUERY
        SELECT rc.id, 'gap'::TEXT, 2
        FROM public.review_cards rc
        WHERE rc.user_id = p_user_id
        AND rc.concept_ids && v_gap_concept_ids
        AND rc.due_date > now()  -- Not already due
        ORDER BY rc.due_date ASC
        LIMIT LEAST(10, p_max_cards - v_cards_added);

        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        v_cards_added := v_cards_added + v_row_count;
    END IF;

    -- 5. Add reinforcement cards for decaying concepts (priority 3)
    IF v_decay_concept_ids IS NOT NULL AND array_length(v_decay_concept_ids, 1) > 0 THEN
        RETURN QUERY
        SELECT rc.id, 'reinforcement'::TEXT, 3
        FROM public.review_cards rc
        WHERE rc.user_id = p_user_id
        AND rc.concept_ids && v_decay_concept_ids
        AND rc.due_date > now()
        AND rc.id NOT IN (
            SELECT gs.card_id FROM generate_daily_session(p_user_id, p_max_cards, p_new_card_limit) gs
            WHERE gs.card_source IN ('due', 'gap')
        )
        ORDER BY rc.due_date ASC
        LIMIT LEAST(5, p_max_cards - v_cards_added);

        GET DIAGNOSTICS v_row_count = ROW_COUNT;
        v_cards_added := v_cards_added + v_row_count;
    END IF;

    -- 6. Fill remaining with new cards (priority 4)
    IF v_cards_added < p_max_cards THEN
        RETURN QUERY
        SELECT rc.id, 'new'::TEXT, 4
        FROM public.review_cards rc
        WHERE rc.user_id = p_user_id
        AND rc.state = 'new'
        ORDER BY rc.created_at ASC
        LIMIT LEAST(p_new_card_limit, p_max_cards - v_cards_added);
    END IF;
END;
$$;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON COLUMN public.review_cards.concept_ids IS 'Array of concept UUIDs this card tests - links to knowledge graph';
COMMENT ON TABLE public.review_sessions IS 'Tracks daily review sessions with gap-awareness and concept targeting';
COMMENT ON FUNCTION public.get_cards_for_concepts IS 'Returns cards that test specific concepts, prioritizing due cards';
COMMENT ON FUNCTION public.generate_daily_session IS 'Generates a gap-aware daily session mixing due, gap, reinforcement, and new cards';
