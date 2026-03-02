-- Fix: Replace recursive generate_daily_session with CTE-based version
CREATE OR REPLACE FUNCTION public.generate_daily_session(
    p_user_id UUID,
    p_max_cards INTEGER DEFAULT 50,
    p_new_card_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    card_id UUID,
    card_source TEXT,
    priority INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_gap_concept_ids UUID[];
    v_decay_concept_ids UUID[];
BEGIN
    SELECT ARRAY_AGG(concept_id) INTO v_gap_concept_ids
    FROM public.user_knowledge_gaps
    WHERE user_id = p_user_id
    AND resolved = false
    AND severity IN ('critical', 'moderate');

    SELECT ARRAY_AGG(concept_id) INTO v_decay_concept_ids
    FROM public.user_concept_mastery
    WHERE user_id = p_user_id
    AND peak_mastery > 0.6
    AND mastery_level < peak_mastery * 0.7
    AND (last_reviewed_at IS NULL OR last_reviewed_at < now() - INTERVAL '7 days');

    RETURN QUERY
    WITH due_cards AS (
        SELECT rc.id, 'due'::TEXT AS source, 1 AS prio
        FROM public.review_cards rc
        WHERE rc.user_id = p_user_id
        AND rc.due_date <= now()
        ORDER BY rc.due_date ASC
        LIMIT GREATEST(p_max_cards - p_new_card_limit, 20)
    ),
    gap_cards AS (
        SELECT rc.id, 'gap'::TEXT AS source, 2 AS prio
        FROM public.review_cards rc
        WHERE rc.user_id = p_user_id
        AND v_gap_concept_ids IS NOT NULL
        AND rc.concept_ids && v_gap_concept_ids
        AND rc.due_date > now()
        AND rc.id NOT IN (SELECT d.id FROM due_cards d)
        ORDER BY rc.due_date ASC
        LIMIT LEAST(10, p_max_cards - (SELECT count(*) FROM due_cards))
    ),
    reinforcement_cards AS (
        SELECT rc.id, 'reinforcement'::TEXT AS source, 3 AS prio
        FROM public.review_cards rc
        WHERE rc.user_id = p_user_id
        AND v_decay_concept_ids IS NOT NULL
        AND rc.concept_ids && v_decay_concept_ids
        AND rc.due_date > now()
        AND rc.id NOT IN (SELECT d.id FROM due_cards d)
        AND rc.id NOT IN (SELECT g.id FROM gap_cards g)
        ORDER BY rc.due_date ASC
        LIMIT LEAST(5, p_max_cards - (SELECT count(*) FROM due_cards) - (SELECT count(*) FROM gap_cards))
    ),
    new_cards AS (
        SELECT rc.id, 'new'::TEXT AS source, 4 AS prio
        FROM public.review_cards rc
        WHERE rc.user_id = p_user_id
        AND rc.state = 'new'
        AND rc.id NOT IN (SELECT d.id FROM due_cards d)
        AND rc.id NOT IN (SELECT g.id FROM gap_cards g)
        AND rc.id NOT IN (SELECT r.id FROM reinforcement_cards r)
        ORDER BY rc.created_at ASC
        LIMIT LEAST(p_new_card_limit, p_max_cards - (SELECT count(*) FROM due_cards) - (SELECT count(*) FROM gap_cards) - (SELECT count(*) FROM reinforcement_cards))
    )
    SELECT * FROM due_cards
    UNION ALL SELECT * FROM gap_cards
    UNION ALL SELECT * FROM reinforcement_cards
    UNION ALL SELECT * FROM new_cards;
END;
$$;
