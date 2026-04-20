-- ============================================================================
-- X+1 (NoteSnap) — COMPLETE DATABASE SCHEMA
-- Generated: 2026-04-08
--
-- This file contains EVERYTHING needed to set up a fresh Supabase project.
--
-- INSTRUCTIONS FOR THE DEVELOPER:
-- ================================
-- 1. Create a new Supabase project
-- 2. Open SQL Editor
-- 3. Run THIS FILE (complete-schema.sql) — Sections 1, 4, 5, 7, 8, 9
-- 4. Run schema.sql (5,245 lines) — this is Section 2
-- 5. Run Section 3 (post-March-30 migrations) — non-CONCURRENTLY parts
-- 6. Run Section 6 indexes ONE BY ONE (not as a batch!)
-- 7. Run remaining CONCURRENTLY indexes from Section 3 ONE BY ONE
--
-- ⚠️  IMPORTANT: CREATE INDEX CONCURRENTLY cannot run inside a transaction.
--    Supabase SQL Editor runs everything in an implicit transaction.
--    You MUST run each CONCURRENTLY index as a SEPARATE statement.
--    Sections 3 and 6 are split into transaction-safe and separate parts.
--
-- ⚠️  AFTER RUNNING SQL: Configure in Supabase Dashboard:
--    - Auth > URL Configuration > Site URL: https://xplus1.ai
--    - Auth > URL Configuration > Redirect URLs:
--        https://xplus1.ai/auth/callback
--        https://xplus1.ai/reset-password
--        http://localhost:3000/auth/callback
--    - Database > Replication: Enable Realtime for the `courses` table
--    - Auth > Email Templates: Set redirect URLs to {SITE_URL}/auth/callback
--
-- INCLUDES:
--   Section 1: 15 "original" tables (pre-migration era, never tracked in SQL)
--   Section 2: All migration tables (from schema.sql — 51 tables)
--   Section 3: Post-March-30 migrations (split: safe + CONCURRENTLY)
--   Section 4: RLS policies for the 15 original tables
--   Section 5: Missing RPC functions (2 found by code cross-check)
--   Section 6: Indexes for the 15 original tables (run ONE BY ONE)
--   Section 7: Storage buckets + ALL policies (self-contained)
--   Section 8: Grants for the 15 original tables
--   Section 9: CHECK constraints for data integrity
-- ============================================================================


-- ============================================================================
-- SECTION 1: THE 15 "ORIGINAL" TABLES
-- These existed before migrations started. Order respects FK dependencies.
-- ============================================================================

-- 1. achievements (reference table, no user FK)
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  category TEXT NOT NULL
);

-- 2. courses (the central table)
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  original_image_url TEXT,
  extracted_content TEXT,
  generated_course JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  image_urls TEXT[],
  document_url TEXT,
  source_type TEXT DEFAULT 'image',
  cover_image_url TEXT,
  curriculum_alignment JSONB,
  extraction_metadata JSONB,
  generation_status TEXT DEFAULT 'complete',
  lessons_ready INTEGER DEFAULT 0,
  total_lessons INTEGER DEFAULT 0,
  document_summary TEXT,
  lesson_outline JSONB,
  intensity_mode TEXT DEFAULT 'standard',
  content_language TEXT DEFAULT 'en'
);

-- 3. user_learning_profile (one row per user)
CREATE TABLE IF NOT EXISTS public.user_learning_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_session_length INTEGER DEFAULT 15,
  preferred_time_of_day TEXT,
  avg_session_length_ms INTEGER,
  avg_cards_per_session INTEGER,
  peak_performance_hour INTEGER,
  speed_preference TEXT DEFAULT 'normal',
  hint_usage_rate DOUBLE PRECISION DEFAULT 0,
  most_active_day INTEGER,
  sessions_per_week DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT now(),
  education_level TEXT DEFAULT 'high_school',
  grade TEXT,
  study_system TEXT DEFAULT 'general',
  subjects TEXT[] DEFAULT ARRAY[]::text[],
  subject_levels JSONB DEFAULT '{}'::jsonb,
  exam_format TEXT DEFAULT 'match_real',
  language TEXT DEFAULT 'en',
  parent_email TEXT,
  reports_enabled BOOLEAN DEFAULT false,
  last_report_sent TIMESTAMPTZ,
  fsrs_params JSONB,
  last_nudge_sent_at TIMESTAMPTZ
);

-- 4. user_gamification (one row per user)
CREATE TABLE IF NOT EXISTS public.user_gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  lessons_completed INTEGER DEFAULT 0,
  cards_reviewed INTEGER DEFAULT 0,
  perfect_lessons INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_cards_reviewed INTEGER DEFAULT 0,
  total_courses_completed INTEGER NOT NULL DEFAULT 0
);

-- 5. user_srs_settings (one row per user)
CREATE TABLE IF NOT EXISTS public.user_srs_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  target_retention DOUBLE PRECISION DEFAULT 0.9,
  max_new_cards_per_day INTEGER DEFAULT 20,
  max_reviews_per_day INTEGER DEFAULT 200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. reflections
CREATE TABLE IF NOT EXISTS public.reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection_type TEXT,
  learned TEXT,
  challenges TEXT,
  rating INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. exams (depends on courses)
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  question_count INTEGER NOT NULL DEFAULT 10,
  time_limit_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  score INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  percentage NUMERIC(5,2),
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. review_cards (depends on courses)
CREATE TABLE IF NOT EXISTS public.review_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_index INTEGER NOT NULL,
  step_index INTEGER NOT NULL,
  card_type TEXT NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  stability DOUBLE PRECISION DEFAULT 0,
  difficulty DOUBLE PRECISION DEFAULT 0.3,
  elapsed_days INTEGER DEFAULT 0,
  scheduled_days INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  state TEXT DEFAULT 'new',
  due_date TIMESTAMPTZ DEFAULT now(),
  last_review TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  concept_ids UUID[]
);

-- 9. user_progress (depends on courses)
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  current_lesson INTEGER DEFAULT 0,
  current_step INTEGER DEFAULT 0,
  completed_lessons INTEGER[] DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  questions_answered INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  self_confidence INTEGER,
  perceived_difficulty TEXT,
  goal_achieved TEXT,
  UNIQUE(user_id, course_id)
);

-- 10. step_performance (depends on courses)
CREATE TABLE IF NOT EXISTS public.step_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_index INTEGER NOT NULL,
  step_index INTEGER NOT NULL,
  step_type TEXT NOT NULL,
  time_spent_ms INTEGER NOT NULL,
  was_correct BOOLEAN,
  attempts INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. help_requests (depends on courses)
CREATE TABLE IF NOT EXISTS public.help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_index INTEGER,
  step_index INTEGER,
  question_type TEXT NOT NULL,
  user_question TEXT,
  ai_response TEXT NOT NULL,
  source_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. user_performance (depends on courses)
CREATE TABLE IF NOT EXISTS public.user_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_index INTEGER NOT NULL,
  attempts INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  average_time_ms INTEGER,
  last_attempt TIMESTAMPTZ,
  mastery_level DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id, lesson_index)
);

-- 13. user_achievements (depends on achievements)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- 14. exam_questions (depends on exams)
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  lesson_index INTEGER,
  lesson_title TEXT,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  user_answer TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  passage TEXT,
  matching_pairs JSONB,
  ordering_items JSONB,
  sub_questions JSONB,
  acceptable_answers JSONB,
  image_label_data JSONB
);

-- 15. review_logs (depends on review_cards, courses)
CREATE TABLE IF NOT EXISTS public.review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.review_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  review_duration_ms INTEGER,
  reviewed_at TIMESTAMPTZ DEFAULT now(),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  lesson_index INTEGER,
  difficulty_feedback TEXT
);


-- ============================================================================
-- SECTION 2: ALL MIGRATION TABLES (from schema.sql)
-- Run the existing schema.sql content here.
-- It contains 51 additional tables with their RLS policies, indexes,
-- functions, and triggers.
-- ============================================================================

-- >>> PASTE THE FULL CONTENTS OF supabase/schema.sql HERE <<<
-- >>> It is 5,245 lines. Too large to inline but already in your repo. <<<
-- >>> The developer should copy-paste it after Section 1. <<<


-- ============================================================================
-- SECTION 3: POST-MARCH-30 MIGRATIONS (not in schema.sql)
-- ============================================================================

-- --- 20260401_add_last_nudge_sent_at.sql ---
-- (Column already included in user_learning_profile above, but adding IF NOT EXISTS for safety)
ALTER TABLE user_learning_profile
  ADD COLUMN IF NOT EXISTS last_nudge_sent_at TIMESTAMPTZ;

-- --- 20260401_composite_performance_indexes.sql ---
-- ⚠️  RUN EACH OF THESE SEPARATELY (one at a time, not as a batch):
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_logs_user_reviewed
--   ON public.review_logs(user_id, reviewed_at DESC);
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_study_sessions_user_open
--   ON public.study_sessions(user_id, ended_at)
--   WHERE ended_at IS NULL;
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_sessions_user_completed
--   ON public.review_sessions(user_id, status, completed_at DESC)
--   WHERE status = 'completed';
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_homework_checks_user_created
--   ON public.homework_checks(user_id, created_at DESC);
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_concept_mastery_user_levels
--   ON public.user_concept_mastery(user_id, mastery_level, peak_mastery);
--
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_time
--   ON public.analytics_events(user_id, event_time DESC);

-- --- 20260401_nudge_candidates_rpc.sql ---
CREATE OR REPLACE FUNCTION get_nudge_candidates(
  inactivity_cutoff TIMESTAMPTZ,
  nudge_cooloff_cutoff TIMESTAMPTZ
)
RETURNS TABLE (
  user_id     UUID,
  email       TEXT,
  name        TEXT,
  days_inactive INT,
  last_course_title TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ulp.user_id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '') AS name,
    EXTRACT(DAY FROM NOW() - MAX(up.updated_at))::INT AS days_inactive,
    (
      SELECT c.generated_course->>'title'
      FROM courses c
      WHERE c.user_id = ulp.user_id
      ORDER BY c.updated_at DESC
      LIMIT 1
    ) AS last_course_title
  FROM user_learning_profile ulp
  JOIN auth.users au ON au.id = ulp.user_id
  JOIN user_progress up ON up.user_id = ulp.user_id
  WHERE EXISTS (
    SELECT 1 FROM courses c WHERE c.user_id = ulp.user_id
  )
  AND (ulp.last_nudge_sent_at IS NULL OR ulp.last_nudge_sent_at < nudge_cooloff_cutoff)
  AND au.email IS NOT NULL AND au.email <> ''
  GROUP BY ulp.user_id, au.email, au.raw_user_meta_data
  HAVING MAX(up.updated_at) < inactivity_cutoff
  ORDER BY MAX(up.updated_at) ASC
  LIMIT 500;
$$;


-- ============================================================================
-- SECTION 4: RLS POLICIES FOR THE 15 ORIGINAL TABLES
-- ============================================================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_srs_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_performance ENABLE ROW LEVEL SECURITY;

-- *** EXACT MATCH of live production RLS policies ***

-- courses (4 separate policies, matching live DB)
DROP POLICY IF EXISTS "Users can view own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can create own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can update own courses" ON public.courses;
DROP POLICY IF EXISTS "Users can delete own courses" ON public.courses;
CREATE POLICY "Users can view own courses" ON public.courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses" ON public.courses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses" ON public.courses FOR DELETE USING (auth.uid() = user_id);

-- exams (single ALL policy, matching live DB)
DROP POLICY IF EXISTS "Users can manage own exams" ON public.exams;
CREATE POLICY "Users can manage own exams" ON public.exams FOR ALL USING (auth.uid() = user_id);

-- exam_questions (single ALL policy via parent exams, matching live DB)
DROP POLICY IF EXISTS "Users can manage own exam questions" ON public.exam_questions;
CREATE POLICY "Users can manage own exam questions" ON public.exam_questions FOR ALL
  USING (exam_id IN (SELECT exams.id FROM exams WHERE exams.user_id = auth.uid()));

-- review_cards (ALL + 4 specific policies, matching live DB exactly)
DROP POLICY IF EXISTS "Users can manage own review cards" ON public.review_cards;
DROP POLICY IF EXISTS "Users can view own review cards" ON public.review_cards;
DROP POLICY IF EXISTS "Users can create own review cards" ON public.review_cards;
DROP POLICY IF EXISTS "Users can update own review cards" ON public.review_cards;
DROP POLICY IF EXISTS "Users can delete own review cards" ON public.review_cards;
CREATE POLICY "Users can manage own review cards" ON public.review_cards FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own review cards" ON public.review_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own review cards" ON public.review_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own review cards" ON public.review_cards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own review cards" ON public.review_cards FOR DELETE USING (auth.uid() = user_id);

-- review_logs (ALL + SELECT + INSERT, matching live DB — INSERT has NO with_check)
DROP POLICY IF EXISTS "Users can manage own review logs" ON public.review_logs;
DROP POLICY IF EXISTS "Users can view own review logs" ON public.review_logs;
DROP POLICY IF EXISTS "Users can create own review logs" ON public.review_logs;
CREATE POLICY "Users can manage own review logs" ON public.review_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own review logs" ON public.review_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own review logs" ON public.review_logs FOR INSERT WITH CHECK (true);

-- user_progress (3 separate policies, matching live DB)
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id);

-- user_learning_profile (single ALL policy, matching live DB)
DROP POLICY IF EXISTS "Users own their profile" ON public.user_learning_profile;
CREATE POLICY "Users own their profile" ON public.user_learning_profile FOR ALL USING (auth.uid() = user_id);

-- user_gamification (single ALL policy, matching live DB)
DROP POLICY IF EXISTS "Users own gamification data" ON public.user_gamification;
CREATE POLICY "Users own gamification data" ON public.user_gamification FOR ALL USING (auth.uid() = user_id);

-- user_achievements (single ALL policy, matching live DB)
DROP POLICY IF EXISTS "Users see own achievements" ON public.user_achievements;
CREATE POLICY "Users see own achievements" ON public.user_achievements FOR ALL USING (auth.uid() = user_id);

-- step_performance (single ALL policy, matching live DB)
DROP POLICY IF EXISTS "Users own their step data" ON public.step_performance;
CREATE POLICY "Users own their step data" ON public.step_performance FOR ALL USING (auth.uid() = user_id);

-- user_srs_settings (single ALL policy, matching live DB)
DROP POLICY IF EXISTS "Users can manage own SRS settings" ON public.user_srs_settings;
CREATE POLICY "Users can manage own SRS settings" ON public.user_srs_settings FOR ALL USING (auth.uid() = user_id);

-- reflections (single ALL policy, matching live DB)
DROP POLICY IF EXISTS "Users can manage own reflections" ON public.reflections;
CREATE POLICY "Users can manage own reflections" ON public.reflections FOR ALL USING (auth.uid() = user_id);

-- help_requests (SELECT + INSERT, matching live DB)
DROP POLICY IF EXISTS "Users can view own help requests" ON public.help_requests;
DROP POLICY IF EXISTS "Users can insert own help requests" ON public.help_requests;
CREATE POLICY "Users can view own help requests" ON public.help_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own help requests" ON public.help_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- achievements (read-only, role: public, matching live DB)
DROP POLICY IF EXISTS "Anyone can read achievements list" ON public.achievements;
CREATE POLICY "Anyone can read achievements list" ON public.achievements FOR SELECT USING (true);

-- user_performance (single ALL policy, matching live DB)
DROP POLICY IF EXISTS "Users own their performance data" ON public.user_performance;
CREATE POLICY "Users own their performance data" ON public.user_performance FOR ALL USING (auth.uid() = user_id);


-- ============================================================================
-- SECTION 5: MISSING RPC FUNCTIONS (called in code but never defined in SQL)
-- ============================================================================

-- Function 1: update_concept_mastery_from_review
-- Called by: lib/practice/session-manager.ts:643
CREATE OR REPLACE FUNCTION public.update_concept_mastery_from_review(
  p_user_id UUID,
  p_concept_id UUID,
  p_is_correct BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_mastery DECIMAL(4,3);
  v_total_exposures INTEGER;
  v_successful INTEGER;
  v_failed INTEGER;
  v_new_mastery DECIMAL(4,3);
  v_new_stability DECIMAL(8,2);
BEGIN
  INSERT INTO user_concept_mastery (user_id, concept_id, mastery_level, total_exposures, successful_recalls, failed_recalls, last_reviewed_at)
  VALUES (p_user_id, p_concept_id, 0, 0, 0, 0, NOW())
  ON CONFLICT (user_id, concept_id) DO NOTHING;

  SELECT mastery_level, total_exposures, successful_recalls, failed_recalls, COALESCE(stability, 1.0)
  INTO v_current_mastery, v_total_exposures, v_successful, v_failed, v_new_stability
  FROM user_concept_mastery
  WHERE user_id = p_user_id AND concept_id = p_concept_id;

  v_total_exposures := v_total_exposures + 1;
  IF p_is_correct THEN
    v_successful := v_successful + 1;
    v_new_mastery := LEAST(1.0, v_current_mastery + (1.0 - v_current_mastery) * 0.15);
    v_new_stability := LEAST(365.0, v_new_stability * 1.3);
  ELSE
    v_failed := v_failed + 1;
    v_new_mastery := GREATEST(0.0, v_current_mastery - v_current_mastery * 0.20);
    v_new_stability := GREATEST(0.5, v_new_stability * 0.6);
  END IF;

  UPDATE user_concept_mastery
  SET
    mastery_level = v_new_mastery,
    total_exposures = v_total_exposures,
    successful_recalls = v_successful,
    failed_recalls = v_failed,
    stability = v_new_stability,
    last_reviewed_at = NOW(),
    next_review_date = NOW() + (v_new_stability || ' hours')::INTERVAL,
    updated_at = NOW()
  WHERE user_id = p_user_id AND concept_id = p_concept_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_concept_mastery_from_review(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_concept_mastery_from_review(UUID, UUID, BOOLEAN) TO service_role;

-- Function 2: get_grouped_errors
-- Called by: app/api/monitoring/errors/route.ts:134
-- Has fallback in code so lower severity
CREATE OR REPLACE FUNCTION public.get_grouped_errors(
  time_range TEXT DEFAULT '24 hours',
  error_type_filter TEXT DEFAULT NULL,
  page_path_filter TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  error_hash TEXT,
  error_message TEXT,
  error_type TEXT,
  component_name TEXT,
  page_path TEXT,
  occurrence_count BIGINT,
  first_seen TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  affected_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.error_hash,
    (ARRAY_AGG(el.error_message ORDER BY el.created_at DESC))[1],
    (ARRAY_AGG(el.error_type ORDER BY el.created_at DESC))[1],
    (ARRAY_AGG(el.component_name ORDER BY el.created_at DESC))[1],
    (ARRAY_AGG(el.page_path ORDER BY el.created_at DESC))[1],
    COUNT(*)::BIGINT,
    MIN(el.created_at),
    MAX(el.created_at),
    COUNT(DISTINCT el.user_id)::BIGINT
  FROM error_logs el
  WHERE el.created_at >= NOW() - time_range::INTERVAL
    AND (error_type_filter IS NULL OR el.error_type = error_type_filter)
    AND (page_path_filter IS NULL OR el.page_path LIKE page_path_filter || '%')
  GROUP BY el.error_hash
  ORDER BY COUNT(*) DESC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_grouped_errors(TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_grouped_errors(TEXT, TEXT, TEXT, INTEGER) TO service_role;


-- ============================================================================
-- SECTION 6: INDEXES FOR THE 15 ORIGINAL TABLES
-- Exact match of live production indexes (excluding PKEYs which are automatic).
-- ============================================================================

-- courses
CREATE INDEX IF NOT EXISTS courses_created_at_idx ON public.courses USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS courses_user_id_idx ON public.courses USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_courses_generation_incomplete ON public.courses USING btree (user_id, generation_status) WHERE (generation_status = ANY (ARRAY['partial', 'generating', 'processing']));
CREATE INDEX IF NOT EXISTS idx_courses_intensity_mode ON public.courses USING btree (intensity_mode);
CREATE INDEX IF NOT EXISTS idx_courses_user_created ON public.courses USING btree (user_id, created_at DESC);

-- exam_questions
CREATE UNIQUE INDEX IF NOT EXISTS exam_questions_exam_id_question_index_key ON public.exam_questions USING btree (exam_id, question_index);
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON public.exam_questions USING btree (exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_image_label ON public.exam_questions USING btree (((image_label_data IS NOT NULL))) WHERE (image_label_data IS NOT NULL);

-- exams
CREATE INDEX IF NOT EXISTS idx_exams_course ON public.exams USING btree (course_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.exams USING btree (status);
CREATE INDEX IF NOT EXISTS idx_exams_user ON public.exams USING btree (user_id);

-- help_requests
CREATE INDEX IF NOT EXISTS idx_help_requests_user_course ON public.help_requests USING btree (user_id, course_id);

-- review_cards
CREATE INDEX IF NOT EXISTS idx_review_cards_concept_ids ON public.review_cards USING gin (concept_ids);
CREATE INDEX IF NOT EXISTS idx_review_cards_course ON public.review_cards USING btree (course_id);
CREATE INDEX IF NOT EXISTS idx_review_cards_user_course_state ON public.review_cards USING btree (user_id, course_id, state);
CREATE INDEX IF NOT EXISTS idx_review_cards_user_due ON public.review_cards USING btree (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_review_cards_user_state_created ON public.review_cards USING btree (user_id, state, created_at);
CREATE INDEX IF NOT EXISTS idx_review_cards_user_state_due ON public.review_cards USING btree (user_id, state, due_date);
CREATE UNIQUE INDEX IF NOT EXISTS review_cards_user_id_course_id_lesson_index_step_index_key ON public.review_cards USING btree (user_id, course_id, lesson_index, step_index);

-- review_logs
CREATE INDEX IF NOT EXISTS idx_review_logs_card ON public.review_logs USING btree (card_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_reviewed ON public.review_logs USING btree (user_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS review_logs_course_id_idx ON public.review_logs USING btree (course_id);

-- step_performance
CREATE INDEX IF NOT EXISTS idx_step_performance_user ON public.step_performance USING btree (user_id);

-- user_learning_profile
CREATE INDEX IF NOT EXISTS idx_user_learning_profile_language ON public.user_learning_profile USING btree (language);
CREATE INDEX IF NOT EXISTS idx_user_learning_profile_subjects ON public.user_learning_profile USING gin (subjects);
CREATE INDEX IF NOT EXISTS user_learning_profile_education_level_idx ON public.user_learning_profile USING btree (education_level);

-- user_performance
CREATE INDEX IF NOT EXISTS idx_user_performance_user ON public.user_performance USING btree (user_id);


-- ============================================================================
-- SECTION 7: STORAGE BUCKETS + POLICIES
-- ============================================================================

-- Bucket 1: notebook-images (private — signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('notebook-images', 'notebook-images', false, 52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']::text[])
ON CONFLICT (id) DO NOTHING;

-- Bucket 2: documents (private — signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 104857600,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO NOTHING;

-- Bucket 3: uploads (public — formula scanner)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('uploads', 'uploads', true, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[])
ON CONFLICT (id) DO NOTHING;

-- Bucket 4: course-images (public — cover images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket 5: past-exams (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('past-exams', 'past-exams', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket 6: diagram-steps (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('diagram-steps', 'diagram-steps', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for notebook-images
CREATE POLICY "Users can upload notebook images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notebook-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own notebook images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notebook-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own notebook images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'notebook-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own notebook images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notebook-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Service role full access notebook images" ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'notebook-images') WITH CHECK (bucket_id = 'notebook-images');

-- Storage policies for documents
CREATE POLICY "Users can upload documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Service role full access documents" ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');

-- Storage policies for uploads
CREATE POLICY "Users can upload to uploads bucket" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads');
CREATE POLICY "Public can view uploads" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'uploads');

-- Storage policies for course-images
DROP POLICY IF EXISTS "Users can upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view course images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update course images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete course images" ON storage.objects;
CREATE POLICY "Users can upload course images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-images' AND (storage.foldername(name))[1] = 'covers' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Public can view course images" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'course-images');
CREATE POLICY "Users can update course images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-images' AND (storage.foldername(name))[1] = 'covers' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Users can delete course images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-images' AND (storage.foldername(name))[1] = 'covers' AND (storage.foldername(name))[2] = auth.uid()::text);

-- Storage policies for past-exams
DROP POLICY IF EXISTS "Users can upload their own past exam files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own past exam files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own past exam files" ON storage.objects;
CREATE POLICY "Users can upload their own past exam files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'past-exams' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view their own past exam files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'past-exams' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their own past exam files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'past-exams' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage policies for diagram-steps
DROP POLICY IF EXISTS "Users can upload step images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for step images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their step images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their step images" ON storage.objects;
CREATE POLICY "Users can upload step images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'diagram-steps' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public read access for step images" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'diagram-steps');
CREATE POLICY "Users can update their step images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'diagram-steps' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete their step images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'diagram-steps' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================================
-- SECTION 8: GRANTS FOR THE 15 ORIGINAL TABLES
-- ============================================================================

GRANT ALL ON public.courses TO authenticated, service_role;
GRANT ALL ON public.exams TO authenticated, service_role;
GRANT ALL ON public.exam_questions TO authenticated, service_role;
GRANT ALL ON public.review_cards TO authenticated, service_role;
GRANT ALL ON public.review_logs TO authenticated, service_role;
GRANT ALL ON public.user_progress TO authenticated, service_role;
GRANT ALL ON public.user_learning_profile TO authenticated, service_role;
GRANT ALL ON public.user_gamification TO authenticated, service_role;
GRANT ALL ON public.user_achievements TO authenticated, service_role;
GRANT ALL ON public.step_performance TO authenticated, service_role;
GRANT ALL ON public.user_srs_settings TO authenticated, service_role;
GRANT ALL ON public.reflections TO authenticated, service_role;
GRANT ALL ON public.help_requests TO authenticated, service_role;
GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
GRANT ALL ON public.user_performance TO authenticated, service_role;


-- ============================================================================
-- SECTION 9a: TRIGGERS FOR ORIGINAL TABLES
-- ============================================================================

-- handle_updated_at() — auto-updates updated_at on row changes
-- (This may also be created by schema.sql as update_updated_at_column — both names coexist)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS courses_updated_at ON public.courses;
CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ============================================================================
-- SECTION 9b: CHECK CONSTRAINTS FOR DATA INTEGRITY
-- Exact match of live production constraints.
-- ============================================================================

-- courses
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_intensity_mode_check') THEN
    ALTER TABLE public.courses ADD CONSTRAINT courses_intensity_mode_check
      CHECK (intensity_mode IN ('quick', 'standard', 'deep_practice'));
  END IF;
END $$;

-- exams
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exams_status_check') THEN
    ALTER TABLE public.exams ADD CONSTRAINT exams_status_check
      CHECK (status = ANY (ARRAY['pending', 'in_progress', 'completed', 'expired']));
  END IF;
END $$;

-- exam_questions
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exam_questions_question_type_check') THEN
    ALTER TABLE public.exam_questions ADD CONSTRAINT exam_questions_question_type_check
      CHECK (question_type = ANY (ARRAY['multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'matching', 'ordering', 'passage_based']));
  END IF;
END $$;

-- review_cards
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_cards_card_type_check') THEN
    ALTER TABLE public.review_cards ADD CONSTRAINT review_cards_card_type_check
      CHECK (card_type = ANY (ARRAY['flashcard', 'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'matching', 'sequence', 'key_point', 'formula', 'question', 'explanation']));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_cards_state_check') THEN
    ALTER TABLE public.review_cards ADD CONSTRAINT review_cards_state_check
      CHECK (state = ANY (ARRAY['new', 'learning', 'review', 'relearning']));
  END IF;
END $$;

-- review_logs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_logs_rating_check') THEN
    ALTER TABLE public.review_logs ADD CONSTRAINT review_logs_rating_check
      CHECK (rating >= 1 AND rating <= 4);
  END IF;
END $$;

-- help_requests
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'help_requests_question_type_check') THEN
    ALTER TABLE public.help_requests ADD CONSTRAINT help_requests_question_type_check
      CHECK (question_type = ANY (ARRAY['explain', 'example', 'hint', 'custom']));
  END IF;
END $$;

-- user_learning_profile
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_learning_profile_language_check') THEN
    ALTER TABLE public.user_learning_profile ADD CONSTRAINT user_learning_profile_language_check
      CHECK (language = ANY (ARRAY['en', 'he']));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_learning_profile_education_level_check') THEN
    ALTER TABLE public.user_learning_profile ADD CONSTRAINT user_learning_profile_education_level_check
      CHECK (education_level = ANY (ARRAY['elementary', 'middle_school', 'high_school', 'university', 'graduate', 'professional']));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_learning_profile_study_system_check') THEN
    ALTER TABLE public.user_learning_profile ADD CONSTRAINT user_learning_profile_study_system_check
      CHECK (study_system = ANY (ARRAY['general', 'us', 'uk', 'israeli_bagrut', 'ib', 'ap', 'other']));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_learning_profile_exam_format_check') THEN
    ALTER TABLE public.user_learning_profile ADD CONSTRAINT user_learning_profile_exam_format_check
      CHECK (exam_format = ANY (ARRAY['match_real', 'inspired_by']));
  END IF;
END $$;

-- user_srs_settings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_srs_settings_target_retention_check') THEN
    ALTER TABLE public.user_srs_settings ADD CONSTRAINT user_srs_settings_target_retention_check
      CHECK (target_retention >= 0.7 AND target_retention <= 0.97);
  END IF;
END $$;


-- ============================================================================
-- DONE!
--
-- Developer setup order:
-- ================================
-- STEP 1: Run this file (Sections 1, 4, 5, 6, 7, 8, 9) in Supabase SQL Editor
-- STEP 2: Run schema.sql (5,245 lines) in Supabase SQL Editor
--         NOTE: Remove the last ~60 lines (20260331_performance_indexes migration)
--         that contain CREATE INDEX CONCURRENTLY — they'll abort the transaction.
-- STEP 3: Run the ALTER TABLE + CREATE FUNCTION from Section 3 above
-- STEP 4: Run each CONCURRENTLY index from Section 3 ONE BY ONE:
--         (copy-paste each CREATE INDEX CONCURRENTLY statement individually)
-- STEP 5: Run the CONCURRENTLY indexes from the bottom of schema.sql ONE BY ONE
--
-- AFTER SQL: Configure in Supabase Dashboard:
-- - Auth > URL Configuration > Site URL: https://xplus1.ai
-- - Auth > URL Configuration > Redirect URLs:
--     https://xplus1.ai/auth/callback
--     https://xplus1.ai/reset-password
--     http://localhost:3000/auth/callback
-- - Database > Replication: Enable Realtime for the `courses` table
--
-- KNOWN BUGS FOUND DURING AUDIT (fix in code, not SQL):
-- - step_performance: code selects 'time_ms' but column is 'time_spent_ms'
-- - 11 dead table references in code (tables that don't exist in DB)
-- ============================================================================
