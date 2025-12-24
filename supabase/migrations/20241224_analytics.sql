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
