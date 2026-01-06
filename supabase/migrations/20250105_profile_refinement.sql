-- Migration: Dynamic Profile Refinement System (RLPA-Style)
-- Based on research: "Architecting an End-to-End AI Pipeline for Personalized Educational Content Transformation"
-- Target: Self-efficacy improvement Cohen's d = 0.312

-- =============================================================================
-- Table: profile_refinement_state
-- Stores continuously updated profile metrics using Exponential Moving Average
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profile_refinement_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- ==========================================================================
    -- Tier 1: Rolling Metrics (updated frequently after each learning event)
    -- ==========================================================================

    -- Accuracy tracking (EMA alpha = 0.1)
    rolling_accuracy DECIMAL(4,3) DEFAULT 0.500,

    -- Response time tracking in milliseconds (EMA alpha = 0.1)
    rolling_response_time_ms INTEGER DEFAULT 0,

    -- Estimated ability using IRT model (1-5 scale, EMA alpha = 0.1)
    estimated_ability DECIMAL(4,2) DEFAULT 2.50,

    -- Confidence calibration: -1 (underconfident) to 1 (overconfident)
    -- Calculated from self-assessment vs actual performance
    confidence_calibration DECIMAL(4,3) DEFAULT 0.000,

    -- Current difficulty target (1-5 scale, EMA alpha = 0.1)
    current_difficulty_target DECIMAL(4,2) DEFAULT 3.00,

    -- ==========================================================================
    -- Tier 2: Session Metrics (updated per session, EMA alpha = 0.05)
    -- ==========================================================================

    -- Inferred optimal session length in minutes
    inferred_optimal_session_minutes INTEGER DEFAULT 15,

    -- Inferred peak performance hour (0-23)
    inferred_peak_hour INTEGER,

    -- Inferred speed preference: 'fast', 'moderate', 'slow'
    inferred_speed_preference TEXT DEFAULT 'moderate'
        CHECK (inferred_speed_preference IN ('fast', 'moderate', 'slow')),

    -- ==========================================================================
    -- Confidence Scores (0-1, higher = more confident in the inferred value)
    -- ==========================================================================

    accuracy_confidence DECIMAL(3,2) DEFAULT 0.00,
    session_length_confidence DECIMAL(3,2) DEFAULT 0.00,
    peak_hour_confidence DECIMAL(3,2) DEFAULT 0.00,
    difficulty_confidence DECIMAL(3,2) DEFAULT 0.00,
    speed_confidence DECIMAL(3,2) DEFAULT 0.00,

    -- ==========================================================================
    -- Data Point Counters (for confidence calculation)
    -- ==========================================================================

    total_questions_analyzed INTEGER DEFAULT 0,
    total_sessions_analyzed INTEGER DEFAULT 0,
    total_self_assessments INTEGER DEFAULT 0,

    -- ==========================================================================
    -- Update Timestamps (for rate limiting)
    -- ==========================================================================

    last_accuracy_update TIMESTAMP WITH TIME ZONE,
    last_session_update TIMESTAMP WITH TIME ZONE,
    last_periodic_update TIMESTAMP WITH TIME ZONE,

    -- ==========================================================================
    -- Metadata
    -- ==========================================================================

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    UNIQUE(user_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profile_refinement_user
ON public.profile_refinement_state(user_id);

-- =============================================================================
-- Table: profile_history
-- Stores snapshots of profile state for rollback and audit purposes
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profile_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Snapshot type
    snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('automatic', 'user_edit', 'rollback', 'milestone')),

    -- Full profile snapshot as JSON
    profile_snapshot JSONB NOT NULL,

    -- Refinement state snapshot (optional)
    refinement_state_snapshot JSONB,

    -- What triggered this snapshot
    trigger_reason TEXT,
    trigger_signal JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for history lookups
CREATE INDEX IF NOT EXISTS idx_profile_history_user_time
ON public.profile_history(user_id, created_at DESC);

-- Limit history to last 20 snapshots per user (cleanup policy)
CREATE INDEX IF NOT EXISTS idx_profile_history_cleanup
ON public.profile_history(user_id, created_at);

-- =============================================================================
-- Add columns to user_learning_profile for user override tracking
-- =============================================================================

DO $$
BEGIN
    -- Add column to track which attributes user has explicitly locked
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_learning_profile'
        AND column_name = 'user_locked_attributes'
    ) THEN
        ALTER TABLE public.user_learning_profile
        ADD COLUMN user_locked_attributes TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    -- Add column to track source of each attribute value (user vs system)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_learning_profile'
        AND column_name = 'attribute_sources'
    ) THEN
        ALTER TABLE public.user_learning_profile
        ADD COLUMN attribute_sources JSONB DEFAULT '{}'::JSONB;
    END IF;
END $$;

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

ALTER TABLE public.profile_refinement_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_history ENABLE ROW LEVEL SECURITY;

-- Profile refinement state policies
CREATE POLICY "Users can view own refinement state"
ON public.profile_refinement_state FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own refinement state"
ON public.profile_refinement_state FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own refinement state"
ON public.profile_refinement_state FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Profile history policies
CREATE POLICY "Users can view own profile history"
ON public.profile_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile history"
ON public.profile_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- Function: Initialize refinement state for new users
-- =============================================================================

CREATE OR REPLACE FUNCTION public.initialize_refinement_state()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profile_refinement_state (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create refinement state when learning profile is created
DROP TRIGGER IF EXISTS trigger_initialize_refinement ON public.user_learning_profile;
CREATE TRIGGER trigger_initialize_refinement
AFTER INSERT ON public.user_learning_profile
FOR EACH ROW
EXECUTE FUNCTION public.initialize_refinement_state();

-- =============================================================================
-- Function: Update refinement state with EMA
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_refinement_ema(
    p_user_id UUID,
    p_metric TEXT,
    p_observed_value DECIMAL,
    p_alpha DECIMAL DEFAULT 0.1
)
RETURNS DECIMAL AS $$
DECLARE
    v_current_value DECIMAL;
    v_new_value DECIMAL;
BEGIN
    -- Get current value
    EXECUTE format('SELECT %I FROM public.profile_refinement_state WHERE user_id = $1', p_metric)
    INTO v_current_value
    USING p_user_id;

    -- If no current value, use observed value
    IF v_current_value IS NULL THEN
        v_new_value := p_observed_value;
    ELSE
        -- Apply EMA: new = alpha * observed + (1 - alpha) * current
        v_new_value := p_alpha * p_observed_value + (1 - p_alpha) * v_current_value;
    END IF;

    -- Update the value
    EXECUTE format('UPDATE public.profile_refinement_state SET %I = $1, updated_at = now() WHERE user_id = $2', p_metric)
    USING v_new_value, p_user_id;

    RETURN v_new_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Function: Cleanup old profile history (keep last 20 per user)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_profile_history()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.profile_history
    WHERE user_id = NEW.user_id
    AND id NOT IN (
        SELECT id FROM public.profile_history
        WHERE user_id = NEW.user_id
        ORDER BY created_at DESC
        LIMIT 20
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cleanup_history ON public.profile_history;
CREATE TRIGGER trigger_cleanup_history
AFTER INSERT ON public.profile_history
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_profile_history();

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON TABLE public.profile_refinement_state IS
'Stores continuously refined user profile metrics using RLPA-style Exponential Moving Average.
Research target: Self-efficacy improvement Cohen''s d = 0.312';

COMMENT ON COLUMN public.profile_refinement_state.rolling_accuracy IS
'EMA-smoothed accuracy (alpha=0.1). Updated after each question answered.';

COMMENT ON COLUMN public.profile_refinement_state.confidence_calibration IS
'Difference between self-reported confidence and actual performance.
Negative = underconfident, Positive = overconfident.';

COMMENT ON COLUMN public.profile_refinement_state.inferred_peak_hour IS
'Hour of day (0-23) when user performs best, inferred from performance patterns.';

COMMENT ON TABLE public.profile_history IS
'Audit trail of profile changes for rollback capability. Limited to 20 snapshots per user.';
