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
