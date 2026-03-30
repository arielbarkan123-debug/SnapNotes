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
