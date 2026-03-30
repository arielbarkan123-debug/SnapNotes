-- ============================================================================
-- Additional Performance Indexes (C3/C4)
-- Run each statement separately in Supabase SQL Editor (CONCURRENTLY restriction).
-- ============================================================================

-- study_plans: list by user sorted by updated_at (most recent first)
--   .eq('user_id', id).order('updated_at', { ascending: false })
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_plans_user_updated
  ON public.study_plans(user_id, updated_at DESC);

-- homework_sessions: list by user sorted by created_at (most recent first)
--   .eq('user_id', id).order('created_at', { ascending: false })
--   Supersedes the separate idx_homework_sessions_user and idx_homework_sessions_created.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_homework_sessions_user_created
  ON public.homework_sessions(user_id, created_at DESC);
