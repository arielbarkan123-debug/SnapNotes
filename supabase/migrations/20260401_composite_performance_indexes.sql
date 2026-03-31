-- ============================================================================
-- Composite Performance Indexes — Batch 3
-- Run each statement separately in Supabase SQL Editor.
-- CONCURRENTLY cannot run inside a transaction.
-- All statements are idempotent (IF NOT EXISTS).
-- ============================================================================

-- -------------------------------------------------------------------------
-- review_logs: SRS stats, streak, and optimizer queries
--   Hot paths (multiple per page load):
--     .eq('user_id', id).gte('reviewed_at', todayStart)       — due route count
--     .eq('user_id', id).gte('reviewed_at', thirtyDaysAgo)    — stats ratings
--     .eq('user_id', id).gte('reviewed_at', yearAgo)          — streak calc
--     .eq('user_id', id).order('reviewed_at', asc).limit(1000) — optimizer
--   No user_id index existed on this table at all.
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_logs_user_reviewed
  ON public.review_logs(user_id, reviewed_at DESC);

-- -------------------------------------------------------------------------
-- study_sessions: close uncompleted sessions on new session start
--   .eq('user_id', id).is('ended_at', null)
--   Partial index only covers rows that match — minimal storage overhead.
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_sessions_user_open
  ON public.study_sessions(user_id, ended_at)
  WHERE ended_at IS NULL;

-- -------------------------------------------------------------------------
-- review_sessions: completed session stats
--   .eq('user_id', id).eq('status', 'completed').gte('completed_at', startDate)
--   Existing idx_review_sessions_user_active only covers status = 'active'.
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_sessions_user_completed
  ON public.review_sessions(user_id, status, completed_at DESC)
  WHERE status = 'completed';

-- -------------------------------------------------------------------------
-- homework_checks: user's check history listing
--   .eq('user_id', id).order('created_at', { ascending: false })
--   Separate indexes on user_id and created_at exist — composite replaces both.
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_homework_checks_user_created
  ON public.homework_checks(user_id, created_at DESC);

-- -------------------------------------------------------------------------
-- user_concept_mastery: decay detection for reinforcement card generation
--   .eq('user_id', id).gt('peak_mastery', 0.6).lt('mastery_level', 0.42)
--   Existing index is on (user_id, next_review_date) — doesn't help mastery filters.
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_concept_mastery_user_levels
  ON public.user_concept_mastery(user_id, mastery_level, peak_mastery);

-- -------------------------------------------------------------------------
-- analytics_events: user event timeline queries in admin dashboard
--   .eq('user_id', id).order('event_time', { ascending: false })
--   Individual indexes on user_id and event_time exist — composite is faster.
-- -------------------------------------------------------------------------
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_time
  ON public.analytics_events(user_id, event_time DESC);
