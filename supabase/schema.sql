-- ============================================
-- NOTESNAP DATABASE SCHEMA
-- Auto-generated from migration files
-- Generated: 2026-03-30
-- Source: supabase/migrations/*.sql
-- ============================================

-- Run this file in Supabase SQL Editor to recreate the schema from scratch.
-- Alternatively, apply migrations individually in chronological order.

-- ============================================================
-- Migration: 20241129_progress_tracking.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20241217_education_level.sql
-- ============================================================

-- ============================================
-- ADD EDUCATION LEVEL AND STUDY SYSTEM
-- Migration to add education personalization fields
-- ============================================

-- Add education_level column
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS education_level TEXT DEFAULT 'high_school';

-- Add constraint for education_level (drop if exists first to make idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_learning_profile_education_level_check'
  ) THEN
    ALTER TABLE public.user_learning_profile
    ADD CONSTRAINT user_learning_profile_education_level_check
    CHECK (education_level IN ('elementary', 'middle_school', 'high_school', 'university', 'graduate', 'professional'));
  END IF;
END $$;

-- Add grade column (optional, stores specific grade like "10th grade" or "freshman")
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS grade TEXT;

-- Add study_system column (educational system/curriculum)
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS study_system TEXT DEFAULT 'general';

-- Add constraint for study_system
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_learning_profile_study_system_check'
  ) THEN
    ALTER TABLE public.user_learning_profile
    ADD CONSTRAINT user_learning_profile_study_system_check
    CHECK (study_system IN ('general', 'us', 'uk', 'israeli_bagrut', 'ib', 'ap', 'other'));
  END IF;
END $$;

-- Add index for education_level for potential filtering
CREATE INDEX IF NOT EXISTS user_learning_profile_education_level_idx
ON public.user_learning_profile(education_level);

-- Comment for documentation
COMMENT ON COLUMN public.user_learning_profile.education_level IS 'User education level: elementary, middle_school, high_school, university, graduate, professional';
COMMENT ON COLUMN public.user_learning_profile.grade IS 'Optional specific grade level (e.g., 10th grade, sophomore)';
COMMENT ON COLUMN public.user_learning_profile.study_system IS 'Educational system/curriculum: general, us, uk, israeli_bagrut, ib, ap, other';


-- ============================================================
-- Migration: 20241218_cover_image.sql
-- ============================================================

-- ============================================
-- ADD COVER IMAGE URL TO COURSES
-- Migration to add AI-generated cover images
-- ============================================

-- Add cover_image_url column to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.courses.cover_image_url IS 'AI-generated cover image URL from Gemini Nano Banana';

-- Create storage bucket for course images if it doesn't exist
-- Note: This needs to be done via Supabase dashboard or API, not SQL
-- The bucket should be named 'course-images' with public access


-- ============================================================
-- Migration: 20241224_analytics.sql
-- ============================================================

-- ============================================================================
-- NoteSnap Analytics System
-- Migration: 20241224_analytics.sql
-- Description: Creates tables for comprehensive user behavior tracking
-- ============================================================================

-- ============================================================================
-- 1. ADMIN USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);

-- ============================================================================
-- 2. ANALYTICS SESSIONS TABLE
-- Tracks user sessions with device/browser information
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    page_count INTEGER DEFAULT 0,
    is_bounce BOOLEAN DEFAULT false,
    -- Device info
    device_type TEXT CHECK (device_type IN ('desktop', 'tablet', 'mobile')),
    browser TEXT,
    browser_version TEXT,
    os TEXT,
    os_version TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    -- Location (derived from timezone)
    timezone TEXT,
    locale TEXT,
    -- Attribution
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    -- Entry info
    landing_page TEXT,
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_analytics_sessions_user_id ON public.analytics_sessions(user_id);
CREATE INDEX idx_analytics_sessions_started_at ON public.analytics_sessions(started_at DESC);
CREATE INDEX idx_analytics_sessions_device_type ON public.analytics_sessions(device_type);

-- ============================================================================
-- 3. ANALYTICS PAGE VIEWS TABLE
-- Tracks individual page view events with timing
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.analytics_sessions(id) ON DELETE SET NULL,
    page_path TEXT NOT NULL,
    page_title TEXT,
    referrer_path TEXT,
    -- Page timing
    view_start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    view_end_at TIMESTAMP WITH TIME ZONE,
    time_on_page_ms INTEGER,
    -- Engagement
    scroll_depth_percent INTEGER DEFAULT 0,
    -- Navigation context
    is_entry_page BOOLEAN DEFAULT false,
    is_exit_page BOOLEAN DEFAULT false,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_analytics_page_views_user_id ON public.analytics_page_views(user_id);
CREATE INDEX idx_analytics_page_views_session_id ON public.analytics_page_views(session_id);
CREATE INDEX idx_analytics_page_views_page_path ON public.analytics_page_views(page_path);
CREATE INDEX idx_analytics_page_views_created_at ON public.analytics_page_views(created_at DESC);

-- ============================================================================
-- 4. ANALYTICS EVENTS TABLE
-- Tracks custom events (clicks, feature usage, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.analytics_sessions(id) ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    event_category TEXT NOT NULL,
    page_path TEXT,
    -- Event properties (flexible JSON)
    properties JSONB DEFAULT '{}',
    -- Click position (for heatmap data)
    click_x INTEGER,
    click_y INTEGER,
    element_id TEXT,
    element_class TEXT,
    element_text TEXT,
    -- Timing
    event_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_category ON public.analytics_events(event_category);
CREATE INDEX idx_analytics_events_time ON public.analytics_events(event_time DESC);
CREATE INDEX idx_analytics_events_properties ON public.analytics_events USING GIN(properties);

-- ============================================================================
-- 5. ANALYTICS ERRORS TABLE
-- Tracks JavaScript and API errors
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.analytics_sessions(id) ON DELETE SET NULL,
    error_type TEXT NOT NULL CHECK (error_type IN ('javascript', 'api', 'network', 'unhandled')),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    page_path TEXT,
    component_name TEXT,
    -- API-specific
    api_endpoint TEXT,
    http_status INTEGER,
    http_method TEXT,
    -- Context
    user_agent TEXT,
    additional_context JSONB DEFAULT '{}',
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_analytics_errors_user_id ON public.analytics_errors(user_id);
CREATE INDEX idx_analytics_errors_type ON public.analytics_errors(error_type);
CREATE INDEX idx_analytics_errors_occurred_at ON public.analytics_errors(occurred_at DESC);
CREATE INDEX idx_analytics_errors_message ON public.analytics_errors(error_message);
CREATE INDEX idx_analytics_errors_page ON public.analytics_errors(page_path);

-- ============================================================================
-- 6. ANALYTICS FUNNELS TABLE
-- Tracks funnel step completions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.analytics_sessions(id) ON DELETE SET NULL,
    funnel_name TEXT NOT NULL,
    step_name TEXT NOT NULL,
    step_order INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    time_from_previous_step_ms INTEGER,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_analytics_funnels_user_id ON public.analytics_funnels(user_id);
CREATE INDEX idx_analytics_funnels_funnel_name ON public.analytics_funnels(funnel_name);
CREATE INDEX idx_analytics_funnels_completed_at ON public.analytics_funnels(completed_at DESC);
CREATE UNIQUE INDEX idx_analytics_funnels_unique_step ON public.analytics_funnels(user_id, funnel_name, step_name);

-- ============================================================================
-- 7. ANALYTICS DAILY METRICS TABLE
-- Pre-aggregated daily metrics for fast dashboard queries
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    -- Active users
    daily_active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    returning_users INTEGER DEFAULT 0,
    -- Sessions
    total_sessions INTEGER DEFAULT 0,
    avg_session_duration_ms INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    -- Page views
    total_page_views INTEGER DEFAULT 0,
    unique_page_views INTEGER DEFAULT 0,
    avg_pages_per_session DECIMAL(5,2) DEFAULT 0,
    -- Engagement
    total_events INTEGER DEFAULT 0,
    -- Errors
    total_errors INTEGER DEFAULT 0,
    -- Device breakdown
    desktop_sessions INTEGER DEFAULT 0,
    mobile_sessions INTEGER DEFAULT 0,
    tablet_sessions INTEGER DEFAULT 0,
    -- Timestamp
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(date)
);

CREATE INDEX idx_analytics_daily_metrics_date ON public.analytics_daily_metrics(date DESC);

-- ============================================================================
-- 8. ANALYTICS PAGE METRICS TABLE
-- Per-page aggregated metrics
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_page_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    page_path TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_time_on_page_ms INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    entry_count INTEGER DEFAULT 0,
    exit_count INTEGER DEFAULT 0,
    avg_scroll_depth INTEGER DEFAULT 0,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(date, page_path)
);

CREATE INDEX idx_analytics_page_metrics_date ON public.analytics_page_metrics(date DESC);
CREATE INDEX idx_analytics_page_metrics_path ON public.analytics_page_metrics(page_path);

-- ============================================================================
-- 9. ANALYTICS HOURLY PATTERNS TABLE
-- Hour-of-day usage patterns for heatmap visualization
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_hourly_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    session_count INTEGER DEFAULT 0,
    page_view_count INTEGER DEFAULT 0,
    event_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(date, hour)
);

CREATE INDEX idx_analytics_hourly_date ON public.analytics_hourly_patterns(date DESC);
CREATE INDEX idx_analytics_hourly_hour ON public.analytics_hourly_patterns(hour);
CREATE INDEX idx_analytics_hourly_dow ON public.analytics_hourly_patterns(day_of_week);

-- ============================================================================
-- 10. ANALYTICS FEATURE USAGE TABLE
-- Track feature adoption and usage frequency
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analytics_feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    feature_name TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    avg_duration_ms INTEGER DEFAULT 0,
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(date, feature_name)
);

CREATE INDEX idx_analytics_feature_date ON public.analytics_feature_usage(date DESC);
CREATE INDEX idx_analytics_feature_name ON public.analytics_feature_usage(feature_name);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all analytics tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_hourly_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_feature_usage ENABLE ROW LEVEL SECURITY;

-- Admin users policies
CREATE POLICY "Only super admins can manage admin users"
    ON public.admin_users FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users WHERE role = 'super_admin'));

-- Users can insert their own analytics data
CREATE POLICY "Users can insert own sessions"
    ON public.analytics_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own sessions"
    ON public.analytics_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own page views"
    ON public.analytics_page_views FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own page views"
    ON public.analytics_page_views FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
    ON public.analytics_events FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert errors"
    ON public.analytics_errors FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert funnel steps"
    ON public.analytics_funnels FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admin read access to all analytics data
CREATE POLICY "Admins can read all sessions"
    ON public.analytics_sessions FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can read all page views"
    ON public.analytics_page_views FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can read all events"
    ON public.analytics_events FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can read all errors"
    ON public.analytics_errors FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can read all funnels"
    ON public.analytics_funnels FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can read daily metrics"
    ON public.analytics_daily_metrics FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can manage daily metrics"
    ON public.analytics_daily_metrics FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can read page metrics"
    ON public.analytics_page_metrics FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can manage page metrics"
    ON public.analytics_page_metrics FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can read hourly patterns"
    ON public.analytics_hourly_patterns FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can manage hourly patterns"
    ON public.analytics_hourly_patterns FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can read feature usage"
    ON public.analytics_feature_usage FOR SELECT
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

CREATE POLICY "Admins can manage feature usage"
    ON public.analytics_feature_usage FOR ALL
    USING (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = check_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate daily metrics
CREATE OR REPLACE FUNCTION public.aggregate_daily_metrics(target_date DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO public.analytics_daily_metrics (
        date,
        daily_active_users,
        new_users,
        returning_users,
        total_sessions,
        avg_session_duration_ms,
        bounce_rate,
        total_page_views,
        unique_page_views,
        avg_pages_per_session,
        total_events,
        total_errors,
        desktop_sessions,
        mobile_sessions,
        tablet_sessions,
        computed_at
    )
    SELECT
        target_date,
        -- Daily active users
        (SELECT COUNT(DISTINCT user_id) FROM public.analytics_sessions WHERE DATE(started_at) = target_date AND user_id IS NOT NULL),
        -- New users (first session ever)
        (SELECT COUNT(DISTINCT s1.user_id) FROM public.analytics_sessions s1
         WHERE DATE(s1.started_at) = target_date
         AND s1.user_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM public.analytics_sessions s2 WHERE s2.user_id = s1.user_id AND s2.started_at < s1.started_at)),
        -- Returning users
        (SELECT COUNT(DISTINCT s1.user_id) FROM public.analytics_sessions s1
         WHERE DATE(s1.started_at) = target_date
         AND s1.user_id IS NOT NULL
         AND EXISTS (SELECT 1 FROM public.analytics_sessions s2 WHERE s2.user_id = s1.user_id AND s2.started_at < s1.started_at)),
        -- Total sessions
        (SELECT COUNT(*) FROM public.analytics_sessions WHERE DATE(started_at) = target_date),
        -- Avg session duration
        (SELECT COALESCE(AVG(duration_ms), 0)::INTEGER FROM public.analytics_sessions WHERE DATE(started_at) = target_date AND duration_ms IS NOT NULL),
        -- Bounce rate
        (SELECT COALESCE(
            (COUNT(*) FILTER (WHERE is_bounce = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
            0
        ) FROM public.analytics_sessions WHERE DATE(started_at) = target_date),
        -- Total page views
        (SELECT COUNT(*) FROM public.analytics_page_views WHERE DATE(created_at) = target_date),
        -- Unique page views
        (SELECT COUNT(DISTINCT (user_id, page_path)) FROM public.analytics_page_views WHERE DATE(created_at) = target_date),
        -- Avg pages per session
        (SELECT COALESCE(AVG(page_count), 0) FROM public.analytics_sessions WHERE DATE(started_at) = target_date),
        -- Total events
        (SELECT COUNT(*) FROM public.analytics_events WHERE DATE(event_time) = target_date),
        -- Total errors
        (SELECT COUNT(*) FROM public.analytics_errors WHERE DATE(occurred_at) = target_date),
        -- Desktop sessions
        (SELECT COUNT(*) FROM public.analytics_sessions WHERE DATE(started_at) = target_date AND device_type = 'desktop'),
        -- Mobile sessions
        (SELECT COUNT(*) FROM public.analytics_sessions WHERE DATE(started_at) = target_date AND device_type = 'mobile'),
        -- Tablet sessions
        (SELECT COUNT(*) FROM public.analytics_sessions WHERE DATE(started_at) = target_date AND device_type = 'tablet'),
        now()
    ON CONFLICT (date) DO UPDATE SET
        daily_active_users = EXCLUDED.daily_active_users,
        new_users = EXCLUDED.new_users,
        returning_users = EXCLUDED.returning_users,
        total_sessions = EXCLUDED.total_sessions,
        avg_session_duration_ms = EXCLUDED.avg_session_duration_ms,
        bounce_rate = EXCLUDED.bounce_rate,
        total_page_views = EXCLUDED.total_page_views,
        unique_page_views = EXCLUDED.unique_page_views,
        avg_pages_per_session = EXCLUDED.avg_pages_per_session,
        total_events = EXCLUDED.total_events,
        total_errors = EXCLUDED.total_errors,
        desktop_sessions = EXCLUDED.desktop_sessions,
        mobile_sessions = EXCLUDED.mobile_sessions,
        tablet_sessions = EXCLUDED.tablet_sessions,
        computed_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to aggregate hourly patterns
CREATE OR REPLACE FUNCTION public.aggregate_hourly_patterns(target_date DATE)
RETURNS void AS $$
BEGIN
    -- For each hour of the day
    FOR hour_val IN 0..23 LOOP
        INSERT INTO public.analytics_hourly_patterns (
            date,
            hour,
            day_of_week,
            session_count,
            page_view_count,
            event_count,
            unique_users,
            computed_at
        )
        SELECT
            target_date,
            hour_val,
            EXTRACT(DOW FROM target_date)::INTEGER,
            (SELECT COUNT(*) FROM public.analytics_sessions WHERE DATE(started_at) = target_date AND EXTRACT(HOUR FROM started_at) = hour_val),
            (SELECT COUNT(*) FROM public.analytics_page_views WHERE DATE(created_at) = target_date AND EXTRACT(HOUR FROM created_at) = hour_val),
            (SELECT COUNT(*) FROM public.analytics_events WHERE DATE(event_time) = target_date AND EXTRACT(HOUR FROM event_time) = hour_val),
            (SELECT COUNT(DISTINCT user_id) FROM public.analytics_sessions WHERE DATE(started_at) = target_date AND EXTRACT(HOUR FROM started_at) = hour_val AND user_id IS NOT NULL),
            now()
        ON CONFLICT (date, hour) DO UPDATE SET
            session_count = EXCLUDED.session_count,
            page_view_count = EXCLUDED.page_view_count,
            event_count = EXCLUDED.event_count,
            unique_users = EXCLUDED.unique_users,
            computed_at = now();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER TO AUTO-UPDATE SESSION DURATION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
        NEW.duration_ms := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER * 1000;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_duration
    BEFORE UPDATE ON public.analytics_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_session_duration();

-- ============================================================================
-- GRANT SERVICE ROLE ACCESS FOR API ROUTES
-- ============================================================================
-- Note: These grants allow the service role to bypass RLS for admin operations
GRANT ALL ON public.admin_users TO service_role;
GRANT ALL ON public.analytics_sessions TO service_role;
GRANT ALL ON public.analytics_page_views TO service_role;
GRANT ALL ON public.analytics_events TO service_role;
GRANT ALL ON public.analytics_errors TO service_role;
GRANT ALL ON public.analytics_funnels TO service_role;
GRANT ALL ON public.analytics_daily_metrics TO service_role;
GRANT ALL ON public.analytics_page_metrics TO service_role;
GRANT ALL ON public.analytics_hourly_patterns TO service_role;
GRANT ALL ON public.analytics_feature_usage TO service_role;


-- ============================================================
-- Migration: 20241229_curriculum_profile.sql
-- ============================================================

-- Migration: Add curriculum profile fields to user_learning_profile
-- Date: 2024-12-29
-- Description: Adds subjects, subject_levels, and exam_format fields for curriculum context

-- Add subjects array column
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add subject_levels JSONB column (for IB SL/HL, etc.)
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS subject_levels JSONB DEFAULT '{}'::JSONB;

-- Add exam_format column with constraint
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS exam_format TEXT DEFAULT 'match_real';

-- Add check constraint for exam_format
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_learning_profile_exam_format_check'
  ) THEN
    ALTER TABLE public.user_learning_profile
    ADD CONSTRAINT user_learning_profile_exam_format_check
    CHECK (exam_format IN ('match_real', 'inspired_by'));
  END IF;
END $$;

-- Create index on subjects for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_learning_profile_subjects
ON public.user_learning_profile USING GIN (subjects);

-- Add comments for documentation
COMMENT ON COLUMN public.user_learning_profile.subjects IS 'Array of base subject IDs the user is studying (e.g., biology, chemistry, mathematics-aa)';
COMMENT ON COLUMN public.user_learning_profile.subject_levels IS 'JSON object mapping subject IDs to levels for IB (e.g., {"biology": "HL", "chemistry": "SL"})';
COMMENT ON COLUMN public.user_learning_profile.exam_format IS 'Preferred exam format: match_real (exact exam structure) or inspired_by (flexible structure)';


-- ============================================================
-- Migration: 20241231_srs_concepts.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20250101_concepts.sql
-- ============================================================

-- Migration: Concept-based Learning System
-- Date: 2025-01-01
-- Description: Adds tables for concept tracking, prerequisites, mastery, and knowledge gaps

-- =============================================================================
-- Core concept definition
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    -- Hierarchical categorization
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT,
    -- Curriculum alignment
    study_system TEXT,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure unique concepts within subject/topic hierarchy
    UNIQUE(subject, topic, subtopic, name)
);

-- Index for faster lookups by subject and topic
CREATE INDEX IF NOT EXISTS idx_concepts_subject ON public.concepts(subject);
CREATE INDEX IF NOT EXISTS idx_concepts_subject_topic ON public.concepts(subject, topic);
CREATE INDEX IF NOT EXISTS idx_concepts_study_system ON public.concepts(study_system);

-- =============================================================================
-- Prerequisite relationships between concepts
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.concept_prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
    prerequisite_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
    -- Strength of dependency: 1=helpful, 2=important, 3=essential
    dependency_strength INTEGER DEFAULT 2 CHECK (dependency_strength BETWEEN 1 AND 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Prevent duplicate relationships and self-references
    UNIQUE(concept_id, prerequisite_id),
    CHECK (concept_id != prerequisite_id)
);

-- Index for graph traversal
CREATE INDEX IF NOT EXISTS idx_concept_prerequisites_concept ON public.concept_prerequisites(concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_prerequisites_prereq ON public.concept_prerequisites(prerequisite_id);

-- =============================================================================
-- Link concepts to course content
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.content_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_index INTEGER NOT NULL,
    step_index INTEGER,
    concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
    -- How strongly this content relates to the concept (0-1)
    relevance_score DECIMAL(3,2) DEFAULT 0.8 CHECK (relevance_score BETWEEN 0 AND 1),
    -- Whether content teaches (introduces) or requires (assumes) the concept
    relationship_type TEXT DEFAULT 'teaches' CHECK (relationship_type IN ('teaches', 'requires', 'reinforces')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- One relationship per content-concept pair
    UNIQUE(course_id, lesson_index, step_index, concept_id)
);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS idx_content_concepts_course ON public.content_concepts(course_id);
CREATE INDEX IF NOT EXISTS idx_content_concepts_concept ON public.content_concepts(concept_id);
CREATE INDEX IF NOT EXISTS idx_content_concepts_course_lesson ON public.content_concepts(course_id, lesson_index);

-- =============================================================================
-- User mastery per concept
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_concept_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
    -- Mastery metrics (0-1 scale)
    mastery_level DECIMAL(4,3) DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 1),
    confidence_score DECIMAL(4,3) DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 1),
    -- Peak mastery for decay detection
    peak_mastery DECIMAL(4,3) DEFAULT 0 CHECK (peak_mastery BETWEEN 0 AND 1),
    -- Evidence counts
    total_exposures INTEGER DEFAULT 0,
    successful_recalls INTEGER DEFAULT 0,
    failed_recalls INTEGER DEFAULT 0,
    -- SRS-like scheduling for concept review
    stability DECIMAL(8,2) DEFAULT 1.0,
    next_review_date TIMESTAMP WITH TIME ZONE,
    -- Timestamps
    first_encountered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- One record per user per concept
    UNIQUE(user_id, concept_id)
);

-- Indexes for user mastery lookups
CREATE INDEX IF NOT EXISTS idx_user_concept_mastery_user ON public.user_concept_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_user_concept_mastery_concept ON public.user_concept_mastery(concept_id);
CREATE INDEX IF NOT EXISTS idx_user_concept_mastery_review ON public.user_concept_mastery(user_id, next_review_date);

-- =============================================================================
-- Knowledge gap records
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
    -- Gap analysis
    gap_type TEXT NOT NULL CHECK (gap_type IN ('missing_prerequisite', 'weak_foundation', 'decay', 'never_learned')),
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'moderate', 'minor')),
    confidence DECIMAL(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    -- Context of detection
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    detected_from_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
    detected_from_lesson_index INTEGER,
    -- AI analysis
    ai_explanation TEXT,
    suggested_remediation TEXT,
    -- Related concepts that are blocked by this gap
    blocked_concepts UUID[],
    -- Resolution tracking
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    -- One active gap per user per concept per type
    UNIQUE(user_id, concept_id, gap_type)
);

-- Indexes for gap lookups
CREATE INDEX IF NOT EXISTS idx_user_knowledge_gaps_user ON public.user_knowledge_gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_knowledge_gaps_user_unresolved ON public.user_knowledge_gaps(user_id) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_user_knowledge_gaps_concept ON public.user_knowledge_gaps(concept_id);
CREATE INDEX IF NOT EXISTS idx_user_knowledge_gaps_severity ON public.user_knowledge_gaps(user_id, severity) WHERE NOT resolved;

-- =============================================================================
-- Row Level Security
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_concept_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_knowledge_gaps ENABLE ROW LEVEL SECURITY;

-- Concepts: Public read, authenticated write (concepts are shared across users)
-- Note: Concepts are deduplicated by name/subject/topic so users can share them
CREATE POLICY "Concepts are viewable by authenticated users"
    ON public.concepts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert concepts"
    ON public.concepts FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update concepts"
    ON public.concepts FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Concept prerequisites: Public read, authenticated write
CREATE POLICY "Concept prerequisites are viewable by authenticated users"
    ON public.concept_prerequisites FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert concept prerequisites"
    ON public.concept_prerequisites FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update concept prerequisites"
    ON public.concept_prerequisites FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Content concepts: Users can view for their own courses
CREATE POLICY "Users can view content concepts for their courses"
    ON public.content_concepts FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = content_concepts.course_id
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert content concepts for their courses"
    ON public.content_concepts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = content_concepts.course_id
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update content concepts for their courses"
    ON public.content_concepts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = content_concepts.course_id
            AND courses.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = content_concepts.course_id
            AND courses.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete content concepts for their courses"
    ON public.content_concepts FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses
            WHERE courses.id = content_concepts.course_id
            AND courses.user_id = auth.uid()
        )
    );

-- User concept mastery: Users can only access their own data
CREATE POLICY "Users can view their own concept mastery"
    ON public.user_concept_mastery FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own concept mastery"
    ON public.user_concept_mastery FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concept mastery"
    ON public.user_concept_mastery FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- User knowledge gaps: Users can only access their own data
CREATE POLICY "Users can view their own knowledge gaps"
    ON public.user_knowledge_gaps FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knowledge gaps"
    ON public.user_knowledge_gaps FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge gaps"
    ON public.user_knowledge_gaps FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge gaps"
    ON public.user_knowledge_gaps FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =============================================================================
-- Triggers for updated_at
-- =============================================================================

-- Function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for concepts
DROP TRIGGER IF EXISTS update_concepts_updated_at ON public.concepts;
CREATE TRIGGER update_concepts_updated_at
    BEFORE UPDATE ON public.concepts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for user_concept_mastery
DROP TRIGGER IF EXISTS update_user_concept_mastery_updated_at ON public.user_concept_mastery;
CREATE TRIGGER update_user_concept_mastery_updated_at
    BEFORE UPDATE ON public.user_concept_mastery
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Helper function: Update peak mastery
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_peak_mastery()
RETURNS TRIGGER AS $$
BEGIN
    -- Update peak_mastery if current mastery exceeds it
    IF NEW.mastery_level > COALESCE(NEW.peak_mastery, 0) THEN
        NEW.peak_mastery = NEW.mastery_level;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_peak_mastery_trigger ON public.user_concept_mastery;
CREATE TRIGGER update_peak_mastery_trigger
    BEFORE UPDATE ON public.user_concept_mastery
    FOR EACH ROW
    EXECUTE FUNCTION public.update_peak_mastery();

-- =============================================================================
-- Comments for documentation
-- =============================================================================

COMMENT ON TABLE public.concepts IS 'Atomic units of knowledge that can be taught, tested, and mastered';
COMMENT ON COLUMN public.concepts.name IS 'Canonical name of the concept (e.g., "derivative", "photosynthesis")';
COMMENT ON COLUMN public.concepts.difficulty_level IS '1-5 scale: 1=recall, 2=understand, 3=apply, 4=analyze, 5=evaluate/create';

COMMENT ON TABLE public.concept_prerequisites IS 'Directed graph of prerequisite relationships between concepts';
COMMENT ON COLUMN public.concept_prerequisites.dependency_strength IS '1=helpful, 2=important, 3=essential';

COMMENT ON TABLE public.content_concepts IS 'Maps course content to concepts it teaches, requires, or reinforces';
COMMENT ON COLUMN public.content_concepts.relationship_type IS 'teaches=introduces, requires=assumes prior knowledge, reinforces=practices';

COMMENT ON TABLE public.user_concept_mastery IS 'Tracks individual user mastery level for each concept';
COMMENT ON COLUMN public.user_concept_mastery.mastery_level IS 'Current mastery 0-1, decays over time without review';
COMMENT ON COLUMN public.user_concept_mastery.peak_mastery IS 'Highest mastery ever achieved, for decay detection';
COMMENT ON COLUMN public.user_concept_mastery.stability IS 'SRS stability parameter for scheduling reviews';

COMMENT ON TABLE public.user_knowledge_gaps IS 'Detected knowledge gaps that need remediation';
COMMENT ON COLUMN public.user_knowledge_gaps.gap_type IS 'missing_prerequisite, weak_foundation, decay, or never_learned';
COMMENT ON COLUMN public.user_knowledge_gaps.severity IS 'critical (blocks progress), moderate, or minor';
COMMENT ON COLUMN public.user_knowledge_gaps.blocked_concepts IS 'Array of concept IDs that cannot be learned until this gap is resolved';


-- ============================================================
-- Migration: 20250102_language_support.sql
-- ============================================================

-- Migration: Language Support
-- Date: 2025-01-02
-- Description: Adds language column to user_learning_profile for i18n support

-- Add language column with default 'en' (English)
ALTER TABLE public.user_learning_profile
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add constraint to ensure only valid language codes
ALTER TABLE public.user_learning_profile
ADD CONSTRAINT user_learning_profile_language_check
CHECK (language IN ('en', 'he'));

-- Create index for faster lookups by language
CREATE INDEX IF NOT EXISTS idx_user_learning_profile_language
ON public.user_learning_profile(language);

-- Comment for documentation
COMMENT ON COLUMN public.user_learning_profile.language IS 'User preferred language: en (English) or he (Hebrew)';


-- ============================================================
-- Migration: 20250103_adaptive_difficulty.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20250104_practice_questions.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20250105_homework_help.sql
-- ============================================================

-- Homework Help Feature
-- Allows students to upload questions and get Socratic tutoring assistance

-- Homework help sessions
CREATE TABLE homework_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Question data
  question_image_url TEXT NOT NULL,
  question_text TEXT, -- OCR/AI extracted
  question_type TEXT, -- 'math', 'science', 'history', 'language', 'other'
  detected_subject TEXT,
  detected_topic TEXT,
  detected_concepts TEXT[], -- Array of concept names
  difficulty_estimate INTEGER, -- 1-5

  -- Reference material (up to 10 images)
  reference_image_urls TEXT[],
  reference_extracted_content TEXT,
  reference_relevant_sections JSONB, -- AI-identified relevant parts

  -- Student context
  initial_attempt TEXT, -- What they tried before asking for help
  comfort_level TEXT, -- 'new', 'some_idea', 'just_stuck'

  -- Session state
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  current_step INTEGER DEFAULT 0,
  total_estimated_steps INTEGER,

  -- Tutoring data
  conversation JSONB DEFAULT '[]', -- Full conversation history
  hints_used INTEGER DEFAULT 0,
  hints_available INTEGER DEFAULT 4,
  used_show_answer BOOLEAN DEFAULT FALSE, -- Track if student revealed answer

  -- Outcomes
  completed_at TIMESTAMPTZ,
  solution_reached BOOLEAN DEFAULT FALSE,
  student_final_answer TEXT,
  time_spent_seconds INTEGER,
  breakthrough_moment TEXT, -- When student "got it"

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual conversation turns for detailed tracking
CREATE TABLE homework_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES homework_sessions(id) ON DELETE CASCADE,

  turn_number INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('tutor', 'student')),
  content TEXT NOT NULL,

  -- For tutor messages
  hint_level INTEGER CHECK (hint_level IS NULL OR hint_level BETWEEN 1 AND 5), -- 1-4 hints, 5 = show answer
  pedagogical_intent TEXT, -- 'probe_understanding', 'give_hint', 'celebrate', 'clarify', 'guide_next_step'
  referenced_concept TEXT,

  -- For student messages
  shows_understanding BOOLEAN,
  misconception_detected TEXT,

  -- Timing
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_homework_sessions_user ON homework_sessions(user_id);
CREATE INDEX idx_homework_sessions_status ON homework_sessions(status);
CREATE INDEX idx_homework_sessions_created ON homework_sessions(created_at DESC);
CREATE INDEX idx_homework_turns_session ON homework_turns(session_id);
CREATE INDEX idx_homework_turns_order ON homework_turns(session_id, turn_number);

-- Row Level Security
ALTER TABLE homework_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_turns ENABLE ROW LEVEL SECURITY;

-- Users can only see their own homework sessions
CREATE POLICY "Users can view own homework sessions"
  ON homework_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own homework sessions"
  ON homework_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own homework sessions"
  ON homework_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own homework sessions"
  ON homework_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Users can only see turns from their own sessions
CREATE POLICY "Users can view turns from own sessions"
  ON homework_turns FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM homework_sessions
    WHERE homework_sessions.id = homework_turns.session_id
    AND homework_sessions.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert turns to own sessions"
  ON homework_turns FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM homework_sessions
    WHERE homework_sessions.id = homework_turns.session_id
    AND homework_sessions.user_id = auth.uid()
  ));

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_homework_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER homework_sessions_updated_at
  BEFORE UPDATE ON homework_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_homework_sessions_updated_at();


-- ============================================================
-- Migration: 20250105_profile_refinement.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20250105_research_enhancements.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20250106_error_monitoring.sql
-- ============================================================

-- ============================================================================
-- Error Monitoring System
-- Captures client-side errors for debugging and monitoring
-- ============================================================================

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Error details
  error_type TEXT NOT NULL DEFAULT 'javascript', -- javascript, api, network, unhandled
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_name TEXT,

  -- Context
  page_path TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,

  -- Device/Browser info
  user_agent TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  os_version TEXT,
  device_type TEXT, -- mobile, tablet, desktop
  screen_resolution TEXT,

  -- Additional context (JSON)
  context JSONB DEFAULT '{}',

  -- Request info (for API errors)
  api_endpoint TEXT,
  http_method TEXT,
  http_status INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- For grouping similar errors
  error_hash TEXT GENERATED ALWAYS AS (
    md5(COALESCE(error_message, '') || COALESCE(component_name, '') || COALESCE(page_path, ''))
  ) STORED
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_page_path ON error_logs(page_path);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_hash ON error_logs(error_hash);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Only admin users can read error logs
CREATE POLICY "Admin users can read error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Anyone can insert error logs (for error reporting)
CREATE POLICY "Anyone can insert error logs"
  ON error_logs
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Admin users can delete old error logs
CREATE POLICY "Admin users can delete error logs"
  ON error_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Error Statistics View
-- Aggregated view for monitoring dashboard
-- ============================================================================

CREATE OR REPLACE VIEW error_stats AS
SELECT
  DATE_TRUNC('hour', created_at) AS hour,
  error_type,
  page_path,
  error_hash,
  MIN(error_message) AS error_message,
  MIN(component_name) AS component_name,
  COUNT(*) AS occurrence_count,
  COUNT(DISTINCT user_id) AS affected_users,
  COUNT(DISTINCT session_id) AS affected_sessions,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), error_type, page_path, error_hash
ORDER BY hour DESC, occurrence_count DESC;

-- ============================================================================
-- Cleanup function - remove old error logs (older than 30 days)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION cleanup_old_error_logs() TO service_role;


-- ============================================================
-- Migration: 20250106_homework_checks.sql
-- ============================================================

-- ============================================================================
-- Homework Checks Table
-- Stores homework check requests and AI feedback results
-- ============================================================================

-- Create homework_checks table
CREATE TABLE IF NOT EXISTS homework_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Uploaded content
  task_image_url TEXT NOT NULL,
  task_text TEXT,
  answer_image_url TEXT NOT NULL,
  answer_text TEXT,
  reference_image_urls TEXT[] DEFAULT '{}',
  teacher_review_urls TEXT[] DEFAULT '{}',
  teacher_review_text TEXT,

  -- Analysis results
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'error')),
  subject TEXT,
  topic TEXT,

  -- Feedback (stored as JSONB)
  feedback JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS homework_checks_user_id_idx ON homework_checks(user_id);
CREATE INDEX IF NOT EXISTS homework_checks_status_idx ON homework_checks(status);
CREATE INDEX IF NOT EXISTS homework_checks_created_at_idx ON homework_checks(created_at DESC);

-- Enable RLS
ALTER TABLE homework_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own homework checks
CREATE POLICY "Users can view own homework checks"
  ON homework_checks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own homework checks"
  ON homework_checks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own homework checks"
  ON homework_checks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own homework checks"
  ON homework_checks FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE homework_checks IS 'Stores homework check requests with AI-generated feedback';


-- ============================================================
-- Migration: 20250106_progressive_generation.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20250107_past_exam_templates.sql
-- ============================================================

-- Past Exam Templates table for storing user-uploaded past exams
-- These are used as style references for AI-generated exams

-- Create the past_exam_templates table
CREATE TABLE IF NOT EXISTS public.past_exam_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'pdf', 'pptx', 'docx')),
    original_filename TEXT NOT NULL,
    file_size_bytes INTEGER,
    analysis_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (analysis_status IN ('pending', 'analyzing', 'completed', 'failed')),
    analysis_error TEXT,
    analyzed_at TIMESTAMPTZ,
    extracted_analysis JSONB,
    extracted_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_past_exam_templates_user_id
    ON public.past_exam_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_past_exam_templates_analysis_status
    ON public.past_exam_templates(analysis_status);
CREATE INDEX IF NOT EXISTS idx_past_exam_templates_created_at
    ON public.past_exam_templates(created_at DESC);

-- Enable RLS
ALTER TABLE public.past_exam_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own templates
CREATE POLICY "Users can view their own past exam templates"
    ON public.past_exam_templates
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own past exam templates"
    ON public.past_exam_templates
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own past exam templates"
    ON public.past_exam_templates
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own past exam templates"
    ON public.past_exam_templates
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_past_exam_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_past_exam_templates_updated_at
    BEFORE UPDATE ON public.past_exam_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_past_exam_templates_updated_at();

-- Storage bucket for past exam files
-- Note: This needs to be created via Supabase dashboard or SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('past-exams', 'past-exams', false);

-- Storage policies for the past-exams bucket
-- Users can upload to their own folder (user_id/filename)
CREATE POLICY "Users can upload their own past exam files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'past-exams'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can view their own files
CREATE POLICY "Users can view their own past exam files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'past-exams'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Users can delete their own files
CREATE POLICY "Users can delete their own past exam files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'past-exams'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Grant necessary permissions
GRANT ALL ON public.past_exam_templates TO authenticated;
GRANT ALL ON public.past_exam_templates TO service_role;


-- ============================================================
-- Migration: 20250108_add_image_label_data.sql
-- ============================================================

-- Add image_label_data column to exam_questions table
-- This column stores data for image labeling questions

ALTER TABLE exam_questions
ADD COLUMN IF NOT EXISTS image_label_data JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN exam_questions.image_label_data IS 'JSON data for image_label question type: image_url, labels with positions, interaction_mode (drag/type/both)';

-- Create index for faster queries on questions with image data
CREATE INDEX IF NOT EXISTS idx_exam_questions_image_label
ON exam_questions ((image_label_data IS NOT NULL))
WHERE image_label_data IS NOT NULL;


-- ============================================================
-- Migration: 20250109_lesson_intensity.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20250131000001_study_plans.sql
-- ============================================================

-- Study plans
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  exam_date DATE NOT NULL,
  course_ids UUID[] NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily study tasks
CREATE TABLE IF NOT EXISTS study_plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES study_plans ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('learn_lesson', 'review_lesson', 'practice_test', 'review_weak', 'light_review', 'mock_exam')),
  course_id UUID,
  lesson_index INTEGER,
  lesson_title TEXT,
  description TEXT,
  estimated_minutes INTEGER DEFAULT 15,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_study_plans_user ON study_plans(user_id);
CREATE INDEX idx_study_plan_tasks_plan ON study_plan_tasks(plan_id);
CREATE INDEX idx_study_plan_tasks_date ON study_plan_tasks(scheduled_date);

-- RLS
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own study plans" ON study_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage tasks of their plans" ON study_plan_tasks FOR ALL USING (
  plan_id IN (SELECT id FROM study_plans WHERE user_id = auth.uid())
);


-- ============================================================
-- Migration: 20250131000002_annotations.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS user_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  course_id UUID NOT NULL,
  lesson_index INTEGER NOT NULL,
  step_index INTEGER,
  note_text TEXT,
  flag_type TEXT CHECK (flag_type IN ('confusing', 'important')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id, lesson_index, step_index)
);

ALTER TABLE user_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own annotations" ON user_annotations FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_annotations_user_course ON user_annotations(user_id, course_id);


-- ============================================================
-- Migration: 20260112_fix_homework_checks_nullable.sql
-- ============================================================

-- ============================================================================
-- Fix homework_checks table to allow single image uploads
--
-- Commit 5a167e9 made only one image required in the client/API,
-- but the database still required both task_image_url AND answer_image_url.
-- This migration makes answer_image_url nullable to match the new behavior.
-- ============================================================================

-- Make answer_image_url nullable (was NOT NULL before)
ALTER TABLE homework_checks
ALTER COLUMN answer_image_url DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN homework_checks.answer_image_url IS 'URL of the answer image. Optional - users can submit just a task OR just an answer.';
COMMENT ON COLUMN homework_checks.task_image_url IS 'URL of the task/question image. Required if no answer_image_url provided.';


-- ============================================================
-- Migration: 20260113_fix_missing_schema.sql
-- ============================================================

-- Migration: Fix Missing Schema Elements
-- Date: 2026-01-13
-- Description: Creates missing tables and columns discovered in Vercel logs:
--   1. deep_practice_progress table (from lesson intensity feature)
--   2. total_courses_completed column in user_gamification
--   3. course-images storage bucket with RLS policies

-- =============================================================================
-- 1. DEEP PRACTICE PROGRESS TABLE
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

-- Enable RLS on deep_practice_progress
ALTER TABLE public.deep_practice_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own deep practice progress" ON public.deep_practice_progress;
DROP POLICY IF EXISTS "Users can insert their own deep practice progress" ON public.deep_practice_progress;
DROP POLICY IF EXISTS "Users can update their own deep practice progress" ON public.deep_practice_progress;
DROP POLICY IF EXISTS "Users can delete their own deep practice progress" ON public.deep_practice_progress;

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

-- Updated_at trigger for deep_practice_progress
CREATE OR REPLACE FUNCTION update_deep_practice_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deep_practice_progress_updated_at ON public.deep_practice_progress;
CREATE TRIGGER deep_practice_progress_updated_at
    BEFORE UPDATE ON public.deep_practice_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_deep_practice_progress_updated_at();

-- =============================================================================
-- 2. DEEP PRACTICE ATTEMPTS TABLE
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

-- Enable RLS on deep_practice_attempts
ALTER TABLE public.deep_practice_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own attempts" ON public.deep_practice_attempts;
DROP POLICY IF EXISTS "Users can insert their own attempts" ON public.deep_practice_attempts;

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
-- 3. USER_GAMIFICATION COLUMN FIX
-- =============================================================================

-- Add total_courses_completed column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_gamification'
        AND column_name = 'total_courses_completed'
    ) THEN
        ALTER TABLE public.user_gamification
        ADD COLUMN total_courses_completed INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- =============================================================================
-- 4. INTENSITY_MODE COLUMN FOR COURSES
-- =============================================================================

-- Add intensity_mode column to courses if not exists
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS intensity_mode TEXT DEFAULT 'standard'
  CHECK (intensity_mode IN ('quick', 'standard', 'deep_practice'));

-- Index for filtering by intensity mode
CREATE INDEX IF NOT EXISTS idx_courses_intensity_mode
ON public.courses(intensity_mode);

-- =============================================================================
-- 5. COURSE-IMAGES STORAGE BUCKET
-- =============================================================================

-- Create the storage bucket for course cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- =============================================================================
-- 6. STORAGE POLICIES FOR course-images BUCKET
-- =============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view course images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update course images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete course images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view course images" ON storage.objects;

-- Policy: Authenticated users can upload to their own folder in course-images
CREATE POLICY "Users can upload course images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'course-images'
        AND (storage.foldername(name))[1] = 'covers'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- Policy: Anyone can view course images (public bucket)
CREATE POLICY "Public can view course images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'course-images');

-- Policy: Users can update their own course images
CREATE POLICY "Users can update course images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'course-images'
        AND (storage.foldername(name))[1] = 'covers'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- Policy: Users can delete their own course images
CREATE POLICY "Users can delete course images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'course-images'
        AND (storage.foldername(name))[1] = 'covers'
        AND (storage.foldername(name))[2] = auth.uid()::text
    );

-- =============================================================================
-- VERIFICATION (run manually to verify)
-- =============================================================================

-- Check deep_practice_progress table:
-- SELECT * FROM public.deep_practice_progress LIMIT 1;

-- Check total_courses_completed column:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'user_gamification' AND column_name = 'total_courses_completed';

-- Check course-images bucket:
-- SELECT * FROM storage.buckets WHERE id = 'course-images';

-- Check storage policies:
-- SELECT * FROM pg_policies WHERE policyname LIKE '%course images%';


-- ============================================================
-- Migration: 20260127_homework_sessions_text_mode.sql
-- ============================================================

-- ============================================================================
-- Fix homework_sessions table to support text-only input mode
--
-- Text mode allows users to paste homework questions instead of uploading images.
-- This requires question_image_url to be nullable (was NOT NULL before).
-- ============================================================================

-- Make question_image_url nullable for text mode
ALTER TABLE homework_sessions
ALTER COLUMN question_image_url DROP NOT NULL;

-- Update comments to reflect the new text mode behavior
COMMENT ON COLUMN homework_sessions.question_image_url IS 'URL of the question image. Required for image mode, NULL for text mode.';
COMMENT ON COLUMN homework_sessions.question_text IS 'The question text. Required for text mode, or extracted from image via OCR in image mode.';


-- ============================================================
-- Migration: 20260127_text_mode_nullable.sql
-- ============================================================

-- ============================================================================
-- Fix homework_checks table to support text-only input mode
--
-- Text mode allows users to paste homework text instead of uploading images.
-- This requires task_image_url to be nullable (was NOT NULL before).
-- ============================================================================

-- Make task_image_url nullable for text mode
ALTER TABLE homework_checks
ALTER COLUMN task_image_url DROP NOT NULL;

-- Update comments to reflect the new text mode behavior
COMMENT ON COLUMN homework_checks.task_image_url IS 'URL of the task/question image. Required for image mode, NULL for text mode.';
COMMENT ON COLUMN homework_checks.task_text IS 'The task/question text. Required for text mode, or extracted from image in image mode.';
COMMENT ON COLUMN homework_checks.answer_text IS 'The student answer text. Optional for text mode, or extracted from image in image mode.';


-- ============================================================
-- Migration: 20260204_prepare_guides.sql
-- ============================================================

-- Prepare guides (study guide generator)
CREATE TABLE IF NOT EXISTS prepare_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  subject TEXT,
  image_urls TEXT[],
  document_url TEXT,
  extracted_content TEXT,
  source_type TEXT CHECK (source_type IN ('image', 'pdf', 'pptx', 'docx', 'text')),
  generated_guide JSONB NOT NULL DEFAULT '{}',
  generation_status TEXT DEFAULT 'processing' CHECK (generation_status IN ('processing', 'generating', 'complete', 'failed')),
  youtube_videos JSONB,
  share_token TEXT UNIQUE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages for prepare guides
CREATE TABLE IF NOT EXISTS prepare_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES prepare_guides ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  section_ref TEXT,
  diagram JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prepare_guides_user ON prepare_guides(user_id);
CREATE INDEX idx_prepare_guides_share ON prepare_guides(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_prepare_guides_created ON prepare_guides(created_at DESC);
CREATE INDEX idx_prepare_chat_guide ON prepare_chat_messages(guide_id);
CREATE INDEX idx_prepare_chat_created ON prepare_chat_messages(created_at);

-- RLS
ALTER TABLE prepare_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE prepare_chat_messages ENABLE ROW LEVEL SECURITY;

-- Guide policies: owner can do everything, public guides viewable via share_token
CREATE POLICY "Users can manage their own guides" ON prepare_guides FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public guides viewable by anyone" ON prepare_guides FOR SELECT USING (is_public = true AND share_token IS NOT NULL);

-- Chat policies: owner can manage their chat messages
CREATE POLICY "Users can manage their own chat messages" ON prepare_chat_messages FOR ALL USING (
  user_id = auth.uid()
);


-- ============================================================
-- Migration: 20260215000001_past_exams_subject.sql
-- ============================================================

-- Add subject_id column to past_exam_templates
-- Enables organizing past exams by subject with per-subject limits

-- Add subject_id column (nullable for existing templates)
ALTER TABLE public.past_exam_templates
ADD COLUMN IF NOT EXISTS subject_id TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.past_exam_templates.subject_id IS
  'Subject identifier (e.g., biology-hl, math-5). NULL means unassigned/general.';

-- Index for efficient filtering by user + subject
CREATE INDEX IF NOT EXISTS idx_past_exam_templates_user_subject
ON public.past_exam_templates(user_id, subject_id);

-- Index for fetching all templates for a specific subject
CREATE INDEX IF NOT EXISTS idx_past_exam_templates_subject
ON public.past_exam_templates(subject_id) WHERE subject_id IS NOT NULL;


-- ============================================================
-- Migration: 20260223_evaluation_columns.sql
-- ============================================================

-- Add evaluation tracking columns to practice_session_questions
-- This allows us to persist AI evaluation results for analytics and debugging

ALTER TABLE public.practice_session_questions
  ADD COLUMN IF NOT EXISTS evaluation_score INTEGER,
  ADD COLUMN IF NOT EXISTS evaluation_feedback TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_method TEXT;

-- Add index for filtering by evaluation method (for debugging AI failures)
CREATE INDEX IF NOT EXISTS idx_practice_session_questions_eval_method
  ON public.practice_session_questions (evaluation_method)
  WHERE evaluation_method IS NOT NULL;


-- ============================================================
-- Migration: 20260301_diagram_engine_tables.sql
-- ============================================================

-- Diagram Engine: Cache + Telemetry tables
-- These support the diagram quality improvements (cache for perf, telemetry for observability)

-- ─── diagram_cache ─────────────────────────────────────────────────────────
-- Stores successfully generated diagrams for instant re-use.
-- Only QA-passed diagrams are cached.
-- Key: SHA-256 hash of normalized question text + pipeline.

CREATE TABLE IF NOT EXISTS diagram_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_hash TEXT NOT NULL UNIQUE,
  question_text TEXT NOT NULL,           -- original question (truncated to 500 chars)
  pipeline TEXT NOT NULL,                -- e.g. 'e2b-latex', 'e2b-matplotlib', 'tikz', 'recraft'
  image_data TEXT NOT NULL,              -- base64 data URL or HTTP URL
  qa_verdict TEXT DEFAULT 'pass',        -- 'pass' or 'pass-after-retry'
  hit_count INTEGER DEFAULT 0,           -- how many times this cached result was served
  last_hit_at TIMESTAMPTZ,              -- last time this cache entry was hit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by hash
CREATE INDEX IF NOT EXISTS idx_diagram_cache_hash ON diagram_cache (question_hash);

-- ─── diagram_telemetry ─────────────────────────────────────────────────────
-- Tracks diagram generation events for observability.
-- Fire-and-forget inserts — never blocks diagram delivery.

CREATE TABLE IF NOT EXISTS diagram_telemetry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,              -- generation_start, generation_success, generation_failure, etc.
  pipeline TEXT NOT NULL,                -- which pipeline was used
  question TEXT NOT NULL,                -- truncated to 200 chars
  duration_ms INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  qa_verdict TEXT,                       -- pass, pass-after-retry, skipped, failed
  error_message TEXT,                    -- error details (truncated to 500 chars)
  cache_hit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying events by type and time
CREATE INDEX IF NOT EXISTS idx_diagram_telemetry_type ON diagram_telemetry (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagram_telemetry_pipeline ON diagram_telemetry (pipeline, created_at DESC);

-- Enable RLS (required by Supabase)
ALTER TABLE diagram_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_telemetry ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (these tables are only accessed server-side)
CREATE POLICY "Service role full access on diagram_cache"
  ON diagram_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on diagram_telemetry"
  ON diagram_telemetry
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- Migration: 20260301_feature_sprint_tables.sql
-- ============================================================

-- ============================================================================
-- NoteSnap Feature Sprint: Combined Migration
-- Created: 2026-03-01
-- Features: Mistake Patterns (Day 4), Cheatsheets (Day 6), Parent Reports (Day 5)
-- ============================================================================

-- ─── Mistake Patterns Table (Day 4) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mistake_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patterns JSONB NOT NULL,
  insufficient_data BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  stale_after TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mistake_patterns_user ON mistake_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_mistake_patterns_stale ON mistake_patterns(stale_after);

ALTER TABLE mistake_patterns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mistake_patterns' AND policyname = 'Users manage own patterns'
  ) THEN
    CREATE POLICY "Users manage own patterns" ON mistake_patterns
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─── Cheatsheets Table (Day 6) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cheatsheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  title_he TEXT,
  blocks JSONB NOT NULL DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  exam_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cheatsheets_user ON cheatsheets(user_id);
CREATE INDEX IF NOT EXISTS idx_cheatsheets_course ON cheatsheets(course_id);
CREATE INDEX IF NOT EXISTS idx_cheatsheets_share ON cheatsheets(share_token) WHERE share_token IS NOT NULL;

ALTER TABLE cheatsheets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cheatsheets' AND policyname = 'Users manage own cheatsheets'
  ) THEN
    CREATE POLICY "Users manage own cheatsheets" ON cheatsheets
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cheatsheets' AND policyname = 'Public cheatsheets readable'
  ) THEN
    CREATE POLICY "Public cheatsheets readable" ON cheatsheets
      FOR SELECT USING (is_public = true);
  END IF;
END $$;

-- ─── Parent Reports Columns (Day 5) ─────────────────────────────────────────

ALTER TABLE user_learning_profile ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE user_learning_profile ADD COLUMN IF NOT EXISTS reports_enabled BOOLEAN DEFAULT false;
ALTER TABLE user_learning_profile ADD COLUMN IF NOT EXISTS last_report_sent TIMESTAMPTZ;


-- ============================================================
-- Migration: 20260302000001_implicit_data_collection.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260302000002_fsrs_user_params.sql
-- ============================================================

-- Add FSRS personalized parameters column
ALTER TABLE user_learning_profile
ADD COLUMN IF NOT EXISTS fsrs_params JSONB DEFAULT NULL;

COMMENT ON COLUMN user_learning_profile.fsrs_params IS 'Personalized FSRS algorithm weights, optimized from review history';


-- ============================================================
-- Migration: 20260302000003_fix_srs_session_recursion.sql
-- ============================================================

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


-- ============================================================
-- Migration: 20260302000004_fix_diagram_cache_rls.sql
-- ============================================================

-- Fix: Diagram cache and telemetry RLS policies are too permissive
DROP POLICY IF EXISTS "Service role full access on diagram_cache" ON diagram_cache;
DROP POLICY IF EXISTS "Service role full access on diagram_telemetry" ON diagram_telemetry;

CREATE POLICY "Authenticated users can read diagram cache"
  ON diagram_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage diagram cache"
  ON diagram_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage diagram telemetry"
  ON diagram_telemetry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- Migration: 20260302000005_practice_session_source.sql
-- ============================================================

-- Add source tracking to practice sessions for homework error → practice flow
ALTER TABLE practice_sessions
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'course',
ADD COLUMN IF NOT EXISTS error_context JSONB;

COMMENT ON COLUMN practice_sessions.source_type IS 'Source: course, homework_error';
COMMENT ON COLUMN practice_sessions.error_context IS 'Context from homework error for targeted practice';


-- ============================================================
-- Migration: 20260302_homework_check_modes.sql
-- ============================================================

ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'standard'
CHECK (mode IN ('standard', 'batch_worksheet', 'before_submit', 'rubric'));

ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS mode_result JSONB;

ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS rubric_image_urls TEXT[] DEFAULT '{}';

ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS additional_image_urls TEXT[] DEFAULT '{}';

ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS practiced_items JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS homework_checks_mode_idx ON homework_checks(mode);


-- ============================================================
-- Migration: 20260304_enable_diagrams.sql
-- ============================================================

-- Add enable_diagrams column to homework_sessions
-- Tracks whether the student opted into visual diagrams for this session
ALTER TABLE homework_sessions ADD COLUMN IF NOT EXISTS enable_diagrams boolean DEFAULT true;


-- ============================================================
-- Migration: 20260304_homework_turns_diagram_columns.sql
-- ============================================================

-- Add diagram and visual_update columns to homework_turns
-- These store diagram state (engine_image PNG data, step sequences)
-- and visual updates generated by the tutor engine
ALTER TABLE homework_turns
  ADD COLUMN IF NOT EXISTS diagram JSONB,
  ADD COLUMN IF NOT EXISTS visual_update JSONB;

-- Add comment for documentation
COMMENT ON COLUMN homework_turns.diagram IS 'Diagram state (engine_image or step_sequence) generated by tutor engine';
COMMENT ON COLUMN homework_turns.visual_update IS 'Visual solving panel update generated by tutor engine';


-- ============================================================
-- Migration: 20260305_diagram_steps_bucket.sql
-- ============================================================

-- Create diagram-steps bucket for pre-rendered step images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagram-steps',
  'diagram-steps',
  true,           -- Public bucket (images served directly to frontend)
  5242880,        -- 5MB max per file
  ARRAY['image/png']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload step images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'diagram-steps'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (images are served to the student)
CREATE POLICY "Public read access for step images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'diagram-steps');

-- Allow users to overwrite their own files (re-generation)
CREATE POLICY "Users can update their step images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'diagram-steps'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own step images (cleanup)
CREATE POLICY "Users can delete their step images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'diagram-steps'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================
-- Migration: 20260306_diagram_mode.sql
-- ============================================================

-- Add diagram_mode column to homework_sessions
-- Replaces the binary enable_diagrams flag with a 3-way mode: off / quick / accurate
-- Quick = force TikZ pipeline (fast ~8s), Accurate = full routing with QA (15-45s)
ALTER TABLE homework_sessions ADD COLUMN IF NOT EXISTS diagram_mode text DEFAULT 'quick';

-- Backfill: set diagram_mode based on existing enable_diagrams flag
UPDATE homework_sessions
SET diagram_mode = CASE
  WHEN enable_diagrams = false THEN 'off'
  ELSE 'quick'
END
WHERE diagram_mode IS NULL OR diagram_mode = 'quick';


-- ============================================================
-- Migration: 20260308_walkthrough_quality.sql
-- ============================================================

-- Quality telemetry + user feedback columns for walkthrough_sessions
-- Enables continuous improvement: track failure patterns by topic,
-- store validation errors, and collect user feedback.

ALTER TABLE walkthrough_sessions
  ADD COLUMN IF NOT EXISTS topic_classified TEXT,
  ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS compilation_failures INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS user_feedback TEXT;

-- Index for querying feedback and failures by topic
CREATE INDEX IF NOT EXISTS idx_walkthrough_quality_topic
  ON walkthrough_sessions(topic_classified)
  WHERE topic_classified IS NOT NULL;


-- ============================================================
-- Migration: 20260308_walkthrough_sessions.sql
-- ============================================================

-- Interactive Step-by-Step Walkthrough tables
-- Stores walkthrough sessions (AI solution + compiled step images)
-- and per-step scoped chat threads

-- ============================================================================
-- walkthrough_sessions: stores the AI-generated solution and compiled images
-- ============================================================================

CREATE TABLE IF NOT EXISTS walkthrough_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_session_id UUID REFERENCES homework_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  -- AI-generated solution JSON: { steps[], tikzCode, finalAnswer, finalAnswerHe }
  solution JSONB NOT NULL DEFAULT '{}',
  -- Pipeline status: generating → compiling → partial|complete|failed
  generation_status TEXT NOT NULL DEFAULT 'generating',
  -- Number of step images successfully compiled
  steps_rendered INTEGER NOT NULL DEFAULT 0,
  -- Total number of steps in the solution
  total_steps INTEGER NOT NULL DEFAULT 0,
  -- Array of image URLs for each step (index-aligned with solution.steps)
  step_images JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only access their own walkthrough sessions
ALTER TABLE walkthrough_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own walkthrough sessions"
  ON walkthrough_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own walkthrough sessions"
  ON walkthrough_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own walkthrough sessions"
  ON walkthrough_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypass for API routes that use createServiceClient
CREATE POLICY "Service role full access on walkthrough_sessions"
  ON walkthrough_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_walkthrough_sessions_homework
  ON walkthrough_sessions(homework_session_id);

CREATE INDEX IF NOT EXISTS idx_walkthrough_sessions_user
  ON walkthrough_sessions(user_id);

-- ============================================================================
-- walkthrough_step_chats: per-step scoped chat messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS walkthrough_step_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  walkthrough_id UUID REFERENCES walkthrough_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Which step this message belongs to (0-based index)
  step_index INTEGER NOT NULL,
  -- Message role: student or tutor
  role TEXT NOT NULL CHECK (role IN ('student', 'tutor')),
  -- Message content (may contain LaTeX math)
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only access their own chat messages
ALTER TABLE walkthrough_step_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own step chats"
  ON walkthrough_step_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own step chats"
  ON walkthrough_step_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass for API routes
CREATE POLICY "Service role full access on walkthrough_step_chats"
  ON walkthrough_step_chats FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes for efficient per-step queries
CREATE INDEX IF NOT EXISTS idx_walkthrough_step_chats_walkthrough_step
  ON walkthrough_step_chats(walkthrough_id, step_index);

CREATE INDEX IF NOT EXISTS idx_walkthrough_step_chats_user
  ON walkthrough_step_chats(user_id);


-- ============================================================
-- Migration: 20260316_course_content_language.sql
-- ============================================================

-- Add content_language column to courses table
-- Records what language the course content was generated in.
-- This allows downstream features (expand, help, exams, SRS) to match
-- the course language even if the user later changes their language preference.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS content_language TEXT DEFAULT 'en';

-- Backfill: detect Hebrew courses by checking if the title contains Hebrew characters
UPDATE public.courses
SET content_language = 'he'
WHERE content_language = 'en'
  AND (generated_course->>'title') ~ '[\u0590-\u05FF]';


-- ============================================================
-- Migration: 20260330_academic_events_and_chat.sql
-- ============================================================

-- ============================================================================
-- Study Plan v2: Academic Events + Chat Messages
-- ============================================================================

-- Academic Events table
CREATE TABLE IF NOT EXISTS academic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('test', 'quiz', 'homework', 'project', 'presentation', 'other')),
  event_date DATE NOT NULL,
  event_time TIME,
  subject TEXT,
  course_id UUID,
  description TEXT,
  topics TEXT[] DEFAULT '{}',
  materials JSONB DEFAULT '[]',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  prep_strategy TEXT DEFAULT 'spread' CHECK (prep_strategy IN ('cram', 'spread', 'custom')),
  prep_days INTEGER DEFAULT 3,
  color TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_via TEXT DEFAULT 'manual' CHECK (created_via IN ('manual', 'ai_chat')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_academic_events_user ON academic_events(user_id);
CREATE INDEX idx_academic_events_date ON academic_events(user_id, event_date);
CREATE INDEX idx_academic_events_status ON academic_events(user_id, status);

ALTER TABLE academic_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own academic events"
  ON academic_events FOR ALL USING (auth.uid() = user_id);

-- Study Plan Chat Messages table
CREATE TABLE IF NOT EXISTS study_plan_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_plan_chat_user ON study_plan_chat_messages(user_id, created_at);

ALTER TABLE study_plan_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own chat messages"
  ON study_plan_chat_messages FOR ALL USING (auth.uid() = user_id);

-- Add event_id to study_plan_tasks (nullable FK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_plan_tasks' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE study_plan_tasks
      ADD COLUMN event_id UUID REFERENCES academic_events(id) ON DELETE SET NULL;
    CREATE INDEX idx_study_plan_tasks_event ON study_plan_tasks(event_id);
  END IF;
END $$;

-- Updated_at trigger for academic_events
CREATE OR REPLACE FUNCTION update_academic_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER academic_events_updated_at
  BEFORE UPDATE ON academic_events
  FOR EACH ROW
  EXECUTE FUNCTION update_academic_events_updated_at();


-- ============================================================
-- Migration: 20260330_preserve_learning_history.sql
-- ============================================================

-- =============================================================================
-- Preserve Learning History on Course Delete (C5)
-- =============================================================================
-- Change ON DELETE CASCADE → ON DELETE SET NULL for all tables that store
-- user learning history. When a user deletes a course, their progress,
-- performance data, and cheatsheets are retained with course_id = NULL.
-- Only derived/mapping data (content_concepts) retains CASCADE.
-- =============================================================================

-- Helper: drop a FK constraint by table+column and re-add with SET NULL
-- We use a DO block per table because constraint names are auto-generated.

-- -------------------------------------------------------------------------
-- 1. lesson_progress (course_id NOT NULL → nullable + SET NULL)
-- -------------------------------------------------------------------------
DO $$
DECLARE v_constraint TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'lesson_progress'
    AND kcu.column_name = 'course_id'
    AND tc.constraint_type = 'FOREIGN KEY';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.lesson_progress DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

ALTER TABLE public.lesson_progress
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.lesson_progress
  ADD CONSTRAINT lesson_progress_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;

-- -------------------------------------------------------------------------
-- 2. deep_practice_progress (course_id NOT NULL → nullable + SET NULL)
-- -------------------------------------------------------------------------
DO $$
DECLARE v_constraint TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'deep_practice_progress'
    AND kcu.column_name = 'course_id'
    AND tc.constraint_type = 'FOREIGN KEY';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.deep_practice_progress DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

ALTER TABLE public.deep_practice_progress
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.deep_practice_progress
  ADD CONSTRAINT deep_practice_progress_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;

-- -------------------------------------------------------------------------
-- 3. user_performance_state (course_id already nullable → just SET NULL)
-- -------------------------------------------------------------------------
DO $$
DECLARE v_constraint TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'user_performance_state'
    AND kcu.column_name = 'course_id'
    AND tc.constraint_type = 'FOREIGN KEY';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.user_performance_state DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

ALTER TABLE public.user_performance_state
  ADD CONSTRAINT user_performance_state_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;

-- -------------------------------------------------------------------------
-- 4. user_performance_history (course_id already nullable → just SET NULL)
-- -------------------------------------------------------------------------
DO $$
DECLARE v_constraint TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'user_performance_history'
    AND kcu.column_name = 'course_id'
    AND tc.constraint_type = 'FOREIGN KEY';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.user_performance_history DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

ALTER TABLE public.user_performance_history
  ADD CONSTRAINT user_performance_history_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;

-- -------------------------------------------------------------------------
-- 5. cheatsheets (course_id NOT NULL → nullable + SET NULL)
-- -------------------------------------------------------------------------
DO $$
DECLARE v_constraint TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'cheatsheets'
    AND kcu.column_name = 'course_id'
    AND tc.constraint_type = 'FOREIGN KEY';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.cheatsheets DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

ALTER TABLE public.cheatsheets
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.cheatsheets
  ADD CONSTRAINT cheatsheets_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;

-- -------------------------------------------------------------------------
-- 6. extraction_feedback (course_id NOT NULL → nullable + SET NULL)
-- -------------------------------------------------------------------------
DO $$
DECLARE v_constraint TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'extraction_feedback'
    AND kcu.column_name = 'course_id'
    AND tc.constraint_type = 'FOREIGN KEY';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.extraction_feedback DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

ALTER TABLE public.extraction_feedback
  ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.extraction_feedback
  ADD CONSTRAINT extraction_feedback_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;

-- NOTE: content_concepts retains ON DELETE CASCADE (pure course↔concept mapping;
-- meaningless without the course and no user-facing history to preserve).


-- ============================================================
-- Migration: 20260331_performance_indexes.sql
-- ============================================================

-- ============================================================================
-- Performance Indexes: Composite indexes for hot query paths
-- Run this in Supabase SQL Editor (not via a transaction-wrapped runner).
-- Uses CONCURRENTLY to avoid write-blocking locks on the live production DB.
-- CONCURRENTLY cannot run inside a transaction — Supabase SQL Editor is fine.
-- All statements are idempotent (IF NOT EXISTS).
--
-- Intentionally omitted (already exist):
--   idx_courses_generation_incomplete  — already in 20250106_progressive_generation.sql
--   idx_user_progress_user_course      — covered by UNIQUE(user_id, course_id) constraint
-- ============================================================================

-- -------------------------------------------------------------------------
-- courses: dashboard list query
--   .eq('user_id', id).order('created_at', { ascending: false })
--   Replaces two separate scans (user_id idx + sort) with one index scan.
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_user_created
  ON public.courses(user_id, created_at DESC);

-- -------------------------------------------------------------------------
-- review_cards: new cards query (SRS due route)
--   .eq('user_id', id).eq('state', 'new').order('created_at', asc)
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_cards_user_state_created
  ON public.review_cards(user_id, state, created_at ASC);

-- -------------------------------------------------------------------------
-- review_cards: due cards query (SRS due route)
--   .eq('user_id', id).neq('state', 'new').lte('due_date', now).order('due_date', asc)
--   Covers state filter + due_date range + sort in one index.
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_cards_user_state_due
  ON public.review_cards(user_id, state, due_date ASC);

-- -------------------------------------------------------------------------
-- prepare_guides: guide list query
--   .eq('user_id', id).order('created_at', { ascending: false })
--   Supersedes the existing idx_prepare_guides_user single-column index.
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prepare_guides_user_created
  ON public.prepare_guides(user_id, created_at DESC);

-- -------------------------------------------------------------------------
-- prepare_guides: status filter (stuck 'generating' record cleanup)
--   .eq('user_id', id).eq('generation_status', 'generating')
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prepare_guides_user_status
  ON public.prepare_guides(user_id, generation_status)
  WHERE generation_status IN ('generating', 'processing');

-- -------------------------------------------------------------------------
-- review_cards: practice page card load by course
--   .eq('user_id', id).eq('course_id', cid) — used in srs/course/[id]/route.ts
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_cards_user_course_state
  ON public.review_cards(user_id, course_id, state);


