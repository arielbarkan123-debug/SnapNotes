-- =============================================================================
-- Research-Based Enhancements Migration
-- Based on: "Evidence-Based Best Practices for AI-Automated Learning Platforms"
-- and "Architecting an End-to-End AI Pipeline for Personalized Educational Content"
-- =============================================================================

-- =============================================================================
-- PHASE 2: Learning Objectives & Curriculum Alignment
-- =============================================================================

-- Add learning objectives to courses (AI-generated with Bloom's Taxonomy)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_objectives JSONB DEFAULT '[]';
-- Structure: [{id, objective, bloomLevel, actionVerb, curriculumStandard}]

-- Add curriculum alignment metadata
ALTER TABLE courses ADD COLUMN IF NOT EXISTS curriculum_alignment JSONB;
-- Structure: {system, subject, topics, assessmentObjectives, standards[]}

-- =============================================================================
-- PHASE 3: Multi-Metric Learning Effectiveness
-- Target: Post-assessment 68.4 → 82.7, Self-efficacy Cohen's d = 0.312
-- =============================================================================

-- Self-efficacy surveys (validated scale for measuring learner confidence)
CREATE TABLE IF NOT EXISTS self_efficacy_surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,

    -- Survey timing
    survey_type TEXT NOT NULL CHECK (survey_type IN ('pre_course', 'post_lesson', 'post_course', 'weekly', 'periodic')),
    trigger_context TEXT, -- e.g., "lesson_5_complete", "weekly_check"

    -- Self-efficacy items (1-5 Likert scale)
    -- Based on validated Academic Self-Efficacy Scale
    understand_main_concepts INTEGER CHECK (understand_main_concepts BETWEEN 1 AND 5),
    complete_challenging_problems INTEGER CHECK (complete_challenging_problems BETWEEN 1 AND 5),
    explain_to_others INTEGER CHECK (explain_to_others BETWEEN 1 AND 5),
    apply_to_new_situations INTEGER CHECK (apply_to_new_situations BETWEEN 1 AND 5),

    -- Computed score (average of items)
    self_efficacy_score DECIMAL(3,2),

    -- Additional context
    perceived_difficulty TEXT CHECK (perceived_difficulty IN ('too_easy', 'just_right', 'too_hard')),
    confidence_level TEXT CHECK (confidence_level IN ('very_low', 'low', 'moderate', 'high', 'very_high')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS self_efficacy_user_idx ON self_efficacy_surveys(user_id);
CREATE INDEX IF NOT EXISTS self_efficacy_course_idx ON self_efficacy_surveys(course_id);
CREATE INDEX IF NOT EXISTS self_efficacy_type_idx ON self_efficacy_surveys(survey_type);

-- Learning effectiveness metrics (aggregated per user per period)
CREATE TABLE IF NOT EXISTS learning_effectiveness_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Self-Efficacy Tracking (target: Cohen's d = 0.312)
    self_efficacy_score DECIMAL(3,2), -- 1-5 scale average
    self_efficacy_change DECIMAL(4,3), -- Change from previous period
    self_efficacy_trend TEXT CHECK (self_efficacy_trend IN ('improving', 'stable', 'declining')),

    -- Engagement Metrics
    avg_session_completion_rate DECIMAL(3,2), -- 0-1
    avg_time_on_task_seconds INTEGER,
    voluntary_practice_rate DECIMAL(3,2), -- Practice beyond required
    lessons_started INTEGER DEFAULT 0,
    lessons_completed INTEGER DEFAULT 0,

    -- Knowledge Retention (SRS-based)
    retention_rate_7day DECIMAL(3,2), -- Recall after 7 days
    retention_rate_30day DECIMAL(3,2), -- Recall after 30 days
    cards_due_completed_rate DECIMAL(3,2), -- SRS completion rate

    -- Learning Velocity
    concepts_mastered_this_period INTEGER DEFAULT 0,
    avg_time_to_mastery_minutes DECIMAL(6,1),
    questions_to_mastery_avg DECIMAL(4,1), -- Questions needed to reach 80%

    -- Post-Assessment Performance (target: 68.4 → 82.7)
    pre_assessment_score DECIMAL(4,1),
    post_assessment_score DECIMAL(4,1),
    assessment_improvement DECIMAL(4,1),

    -- Period definition
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type TEXT DEFAULT 'weekly' CHECK (period_type IN ('daily', 'weekly', 'monthly')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT unique_user_period UNIQUE (user_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS effectiveness_user_idx ON learning_effectiveness_metrics(user_id);
CREATE INDEX IF NOT EXISTS effectiveness_period_idx ON learning_effectiveness_metrics(period_start, period_end);

-- Engagement events (granular tracking for analytics)
CREATE TABLE IF NOT EXISTS engagement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,

    -- Event type
    event_type TEXT NOT NULL CHECK (event_type IN (
        'session_start', 'session_end', 'lesson_start', 'lesson_complete',
        'question_answered', 'hint_used', 'retry_attempt', 'voluntary_practice',
        'review_started', 'srs_review', 'exam_practice', 'content_revisit'
    )),

    -- Event details
    lesson_index INTEGER,
    step_index INTEGER,
    duration_seconds INTEGER,
    was_successful BOOLEAN,

    -- Context
    session_id TEXT, -- Groups events in same session
    device_type TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS engagement_user_idx ON engagement_events(user_id);
CREATE INDEX IF NOT EXISTS engagement_event_type_idx ON engagement_events(event_type);
CREATE INDEX IF NOT EXISTS engagement_created_idx ON engagement_events(created_at DESC);

-- =============================================================================
-- PHASE 4: Extraction Confidence Scoring
-- Target: Address 24.8% extraction accuracy challenge
-- =============================================================================

-- Add extraction confidence to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS extraction_confidence DECIMAL(3,2);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS extraction_metadata JSONB;
-- Structure: {
--   textConfidence: 0.95,
--   structureConfidence: 0.85,
--   formulaConfidence: 0.70,
--   diagramConfidence: 0.80,
--   lowConfidenceAreas: [{section, reason, suggestion}],
--   extractionMethod: 'ocr' | 'pdf_parse' | 'vision',
--   processingTimeMs: 1234
-- }

-- User feedback on extraction quality
CREATE TABLE IF NOT EXISTS extraction_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Location of issue
    section_index INTEGER,
    step_index INTEGER,
    content_type TEXT CHECK (content_type IN ('text', 'formula', 'diagram', 'structure', 'other')),

    -- Feedback details
    feedback_type TEXT NOT NULL CHECK (feedback_type IN (
        'incorrect', 'unclear', 'missing', 'garbled', 'wrong_order', 'other'
    )),
    original_content TEXT, -- What the system extracted
    user_correction TEXT, -- User's correction
    additional_notes TEXT,

    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'applied', 'dismissed')),
    reviewed_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_course_idx ON extraction_feedback(course_id);
CREATE INDEX IF NOT EXISTS feedback_user_idx ON extraction_feedback(user_id);
CREATE INDEX IF NOT EXISTS feedback_status_idx ON extraction_feedback(status);

-- =============================================================================
-- Row Level Security Policies
-- =============================================================================

-- Self-efficacy surveys RLS
ALTER TABLE self_efficacy_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own surveys"
    ON self_efficacy_surveys FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own surveys"
    ON self_efficacy_surveys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Learning effectiveness metrics RLS
ALTER TABLE learning_effectiveness_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics"
    ON learning_effectiveness_metrics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own metrics"
    ON learning_effectiveness_metrics FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
    ON learning_effectiveness_metrics FOR UPDATE
    USING (auth.uid() = user_id);

-- Engagement events RLS
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own events"
    ON engagement_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events"
    ON engagement_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Extraction feedback RLS
ALTER TABLE extraction_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
    ON extraction_feedback FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own feedback"
    ON extraction_feedback FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
    ON extraction_feedback FOR UPDATE
    USING (auth.uid() = user_id);

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Calculate self-efficacy score from survey items
CREATE OR REPLACE FUNCTION calculate_self_efficacy_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.self_efficacy_score := (
        COALESCE(NEW.understand_main_concepts, 0) +
        COALESCE(NEW.complete_challenging_problems, 0) +
        COALESCE(NEW.explain_to_others, 0) +
        COALESCE(NEW.apply_to_new_situations, 0)
    )::DECIMAL / NULLIF(
        (CASE WHEN NEW.understand_main_concepts IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN NEW.complete_challenging_problems IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN NEW.explain_to_others IS NOT NULL THEN 1 ELSE 0 END) +
        (CASE WHEN NEW.apply_to_new_situations IS NOT NULL THEN 1 ELSE 0 END),
        0
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_self_efficacy_trigger
    BEFORE INSERT OR UPDATE ON self_efficacy_surveys
    FOR EACH ROW
    EXECUTE FUNCTION calculate_self_efficacy_score();

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON TABLE self_efficacy_surveys IS 'Validated self-efficacy measurement surveys for tracking learner confidence (target: Cohen''s d = 0.312)';
COMMENT ON TABLE learning_effectiveness_metrics IS 'Aggregated learning metrics per period for tracking post-assessment improvement (target: 68.4 → 82.7)';
COMMENT ON TABLE engagement_events IS 'Granular engagement event tracking for computing voluntary practice rate and session completion';
COMMENT ON TABLE extraction_feedback IS 'User feedback on extraction quality to address 24.8% extraction accuracy challenge';
COMMENT ON COLUMN courses.learning_objectives IS 'AI-generated learning objectives with Bloom''s Taxonomy alignment';
COMMENT ON COLUMN courses.curriculum_alignment IS 'Curriculum standard alignment metadata';
COMMENT ON COLUMN courses.extraction_confidence IS 'Overall confidence score (0-1) for content extraction quality';
COMMENT ON COLUMN courses.extraction_metadata IS 'Detailed extraction quality metrics by content type';
