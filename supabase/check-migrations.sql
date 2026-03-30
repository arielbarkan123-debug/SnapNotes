-- ============================================================================
-- NoteSnap Migration Status Check
-- Run this in Supabase SQL Editor to see which tables/features are missing.
-- A result of TRUE means the table/column exists (migration was applied).
-- ============================================================================

SELECT
  -- 20260330_academic_events_and_chat.sql
  -- Study Plan v2: academic events + chat history
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'academic_events')
    AS "academic_events (Study Plan v2)",
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'study_plan_chat_messages')
    AS "study_plan_chat_messages (Study Plan v2)",

  -- 20260316_course_content_language.sql
  -- Per-course content language
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'content_language')
    AS "courses.content_language (language per course)",

  -- 20260308_walkthrough_sessions.sql
  -- Walkthrough sessions
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'walkthrough_sessions')
    AS "walkthrough_sessions (walkthrough feature)",

  -- 20260304_enable_diagrams.sql / 20260306_diagram_mode.sql
  -- Diagram mode column on homework_sessions
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework_sessions' AND column_name = 'diagram_mode')
    AS "homework_sessions.diagram_mode (diagram feature)",

  -- 20260304_homework_turns_diagram_columns.sql
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework_turns' AND column_name = 'diagram_data')
    AS "homework_turns.diagram_data (diagram in turns)",

  -- 20260302000001_implicit_data_collection.sql
  -- Engagement events
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'engagement_events')
    AS "engagement_events (implicit data collection)",

  -- 20260302000002_fsrs_user_params.sql
  -- FSRS user params
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'review_cards' AND column_name = 'desired_retention')
    AS "review_cards.desired_retention (FSRS user params)",

  -- 20260301_feature_sprint_tables.sql
  -- Cheatsheets
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cheatsheets')
    AS "cheatsheets table (cheatsheet feature)",

  -- 20260204_prepare_guides.sql
  -- Prepare guides
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prepare_guides')
    AS "prepare_guides table (Study & Prepare)",

  -- 20260223_evaluation_columns.sql
  -- Evaluation columns on practice_session_questions
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'practice_session_questions' AND column_name = 'evaluation_method')
    AS "practice_session_questions.evaluation_method",

  -- 20260127_text_mode_nullable.sql
  -- text_mode column on homework_sessions
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homework_sessions' AND column_name = 'text_mode')
    AS "homework_sessions.text_mode",

  -- 20260113_fix_missing_schema.sql
  -- past_exam_templates subject column
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'past_exam_templates' AND column_name = 'subject')
    AS "past_exam_templates.subject";
