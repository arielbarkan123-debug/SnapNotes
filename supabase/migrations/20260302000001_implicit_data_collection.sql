-- ============================================================================
-- Migration: Implicit Behavioral Data Collection
-- Created: 2026-03-02
-- Enables: fatigue tracking, answer revisions, explanation engagement,
--          feature affinity, hint effectiveness, recommendation tracking
-- ============================================================================

-- ─── 1. Extend study_sessions with fatigue tracking ─────────────────────────

ALTER TABLE study_sessions
  ADD COLUMN IF NOT EXISTS accuracy_at_session_start DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS accuracy_at_session_end DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS accuracy_per_5min JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS fatigue_detected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fatigue_detected_at_minute INT;

-- ─── 2. Extend practice_session_questions with revision behavior ────────────

ALTER TABLE practice_session_questions
  ADD COLUMN IF NOT EXISTS time_to_first_action_ms INT,
  ADD COLUMN IF NOT EXISTS answer_revision_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_answer TEXT,
  ADD COLUMN IF NOT EXISTS revision_helped BOOLEAN;

-- ─── 3. Create explanation engagement tracking ──────────────────────────────

CREATE TABLE IF NOT EXISTS explanation_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('practice', 'homework', 'exam', 'lesson')),
  source_id UUID,
  question_id UUID,
  explanation_shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_spent_reading_ms INT,
  scroll_depth_percent INT CHECK (scroll_depth_percent BETWEEN 0 AND 100),
  did_expand_details BOOLEAN DEFAULT false,
  next_similar_question_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE explanation_engagement ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'explanation_engagement'
    AND policyname = 'Users can manage own explanation engagement'
  ) THEN
    CREATE POLICY "Users can manage own explanation engagement"
      ON explanation_engagement FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_explanation_engagement_user
  ON explanation_engagement(user_id, created_at DESC);

-- ─── 4. Create feature affinity tracking ────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_affinity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  visit_count INT DEFAULT 0,
  total_time_ms BIGINT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  voluntary_usage_count INT DEFAULT 0,
  nudged_usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

ALTER TABLE feature_affinity ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feature_affinity'
    AND policyname = 'Users can manage own feature affinity'
  ) THEN
    CREATE POLICY "Users can manage own feature affinity"
      ON feature_affinity FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_feature_affinity_user ON feature_affinity(user_id);

-- ─── 5. Extend homework_sessions with timing signals ────────────────────────

ALTER TABLE homework_sessions
  ADD COLUMN IF NOT EXISTS time_to_first_student_msg_ms INT,
  ADD COLUMN IF NOT EXISTS student_message_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_student_response_time_ms INT;

-- ─── 6. Add hint effectiveness tracking to homework_sessions ────────────────

ALTER TABLE homework_sessions
  ADD COLUMN IF NOT EXISTS hint_effectiveness JSONB DEFAULT '[]';

-- ─── 7. Create recommendation tracking ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS recommendation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  recommendation_data JSONB NOT NULL,
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acted_on BOOLEAN DEFAULT false,
  acted_on_at TIMESTAMPTZ,
  time_to_action_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recommendation_tracking ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recommendation_tracking'
    AND policyname = 'Users can manage own recommendation tracking'
  ) THEN
    CREATE POLICY "Users can manage own recommendation tracking"
      ON recommendation_tracking FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recommendation_tracking_user
  ON recommendation_tracking(user_id, shown_at DESC);

-- ─── 8. RPC function for feature affinity upsert ────────────────────────────

CREATE OR REPLACE FUNCTION upsert_feature_affinity(
  p_user_id UUID,
  p_feature_name TEXT,
  p_time_spent_ms BIGINT,
  p_is_voluntary BOOLEAN
) RETURNS VOID AS $$
BEGIN
  -- Ensure the caller can only modify their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot modify another user''s data';
  END IF;

  INSERT INTO feature_affinity (user_id, feature_name, visit_count, total_time_ms, last_used_at, voluntary_usage_count, nudged_usage_count)
  VALUES (p_user_id, p_feature_name, 1, p_time_spent_ms, NOW(),
    CASE WHEN p_is_voluntary THEN 1 ELSE 0 END,
    CASE WHEN p_is_voluntary THEN 0 ELSE 1 END)
  ON CONFLICT (user_id, feature_name) DO UPDATE SET
    visit_count = feature_affinity.visit_count + 1,
    total_time_ms = feature_affinity.total_time_ms + p_time_spent_ms,
    last_used_at = NOW(),
    voluntary_usage_count = feature_affinity.voluntary_usage_count + CASE WHEN p_is_voluntary THEN 1 ELSE 0 END,
    nudged_usage_count = feature_affinity.nudged_usage_count + CASE WHEN p_is_voluntary THEN 0 ELSE 1 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
