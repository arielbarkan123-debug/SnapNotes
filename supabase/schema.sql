-- ============================================
-- STUDYSNAP DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. COURSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    original_image_url TEXT NOT NULL,
    extracted_content TEXT,
    generated_course JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS courses_user_id_idx ON public.courses(user_id);

-- Create index for ordering by created_at
CREATE INDEX IF NOT EXISTS courses_created_at_idx ON public.courses(created_at DESC);

-- ============================================
-- 2. AUTO-UPDATE updated_at TRIGGER
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on UPDATE
DROP TRIGGER IF EXISTS courses_updated_at ON public.courses;
CREATE TRIGGER courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS) FOR COURSES
-- ============================================

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own courses
CREATE POLICY "Users can view own courses"
    ON public.courses
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can INSERT courses with their own user_id
CREATE POLICY "Users can create own courses"
    ON public.courses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE their own courses
CREATE POLICY "Users can update own courses"
    ON public.courses
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can DELETE their own courses
CREATE POLICY "Users can delete own courses"
    ON public.courses
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 4. USER_PROGRESS TABLE
-- Tracks user progress through courses (Duolingo-style)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    current_lesson INTEGER NOT NULL DEFAULT 0,
    current_step INTEGER NOT NULL DEFAULT 0,
    completed_lessons INTEGER[] NOT NULL DEFAULT '{}',
    -- Cumulative question tracking for analytics
    questions_answered INTEGER NOT NULL DEFAULT 0,
    questions_correct INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure one progress record per user per course
    UNIQUE(user_id, course_id)
);

-- Migration for existing tables (run if table already exists):
-- ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS questions_answered INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS questions_correct INTEGER NOT NULL DEFAULT 0;

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS user_progress_user_id_idx ON public.user_progress(user_id);

-- Create index for faster queries by course_id
CREATE INDEX IF NOT EXISTS user_progress_course_id_idx ON public.user_progress(course_id);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS user_progress_updated_at ON public.user_progress;
CREATE TRIGGER user_progress_updated_at
    BEFORE UPDATE ON public.user_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) FOR USER_PROGRESS
-- ============================================

-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own progress
CREATE POLICY "Users can view own progress"
    ON public.user_progress
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can INSERT progress with their own user_id
CREATE POLICY "Users can create own progress"
    ON public.user_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE their own progress
CREATE POLICY "Users can update own progress"
    ON public.user_progress
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can DELETE their own progress
CREATE POLICY "Users can delete own progress"
    ON public.user_progress
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 6. STORAGE BUCKET FOR NOTEBOOK IMAGES
-- ============================================

-- Create the storage bucket (run this separately if it fails)
INSERT INTO storage.buckets (id, name, public)
VALUES ('notebook-images', 'notebook-images', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. STORAGE POLICIES FOR notebook-images BUCKET
-- ============================================

-- Policy: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload own images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'notebook-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can view their own images
CREATE POLICY "Users can view own images"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'notebook-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can update their own images
CREATE POLICY "Users can update own images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'notebook-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'notebook-images'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================
-- 8. STEP_PERFORMANCE TABLE
-- Tracks detailed step-by-step performance for adaptive learning
-- ============================================

CREATE TABLE IF NOT EXISTS public.step_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_index INTEGER NOT NULL,
    step_index INTEGER NOT NULL,
    step_type TEXT NOT NULL,
    time_ms INTEGER NOT NULL,
    was_correct BOOLEAN,
    used_hint BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS step_performance_user_course_idx
    ON public.step_performance(user_id, course_id);
CREATE INDEX IF NOT EXISTS step_performance_created_at_idx
    ON public.step_performance(created_at DESC);
CREATE INDEX IF NOT EXISTS step_performance_step_type_idx
    ON public.step_performance(step_type);

-- Enable RLS
ALTER TABLE public.step_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for step_performance
CREATE POLICY "Users can view own step performance"
    ON public.step_performance
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own step performance"
    ON public.step_performance
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own step performance"
    ON public.step_performance
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 9. USER_MASTERY TABLE
-- Stores calculated mastery scores per course for adaptive learning
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    mastery_score DECIMAL(4,3) NOT NULL DEFAULT 0,
    total_attempts INTEGER NOT NULL DEFAULT 0,
    total_correct INTEGER NOT NULL DEFAULT 0,
    last_practiced TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure one mastery record per user per course
    UNIQUE(user_id, course_id)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS user_mastery_user_id_idx ON public.user_mastery(user_id);
CREATE INDEX IF NOT EXISTS user_mastery_course_id_idx ON public.user_mastery(course_id);
CREATE INDEX IF NOT EXISTS user_mastery_score_idx ON public.user_mastery(mastery_score);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS user_mastery_updated_at ON public.user_mastery;
CREATE TRIGGER user_mastery_updated_at
    BEFORE UPDATE ON public.user_mastery
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.user_mastery ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_mastery
CREATE POLICY "Users can view own mastery"
    ON public.user_mastery
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own mastery"
    ON public.user_mastery
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mastery"
    ON public.user_mastery
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mastery"
    ON public.user_mastery
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 10. PRACTICE_LOGS TABLE
-- Logs mixed practice session attempts
-- ============================================

CREATE TABLE IF NOT EXISTS public.practice_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL,
    was_correct BOOLEAN NOT NULL,
    duration_ms INTEGER,
    practice_type TEXT NOT NULL DEFAULT 'mixed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS practice_logs_user_id_idx ON public.practice_logs(user_id);
CREATE INDEX IF NOT EXISTS practice_logs_created_at_idx ON public.practice_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.practice_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for practice_logs
CREATE POLICY "Users can view own practice logs"
    ON public.practice_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own practice logs"
    ON public.practice_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own practice logs"
    ON public.practice_logs
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 11. USER_SRS_SETTINGS TABLE
-- User preferences for spaced repetition system
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_srs_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_retention DECIMAL(3,2) NOT NULL DEFAULT 0.90,
    max_new_cards_per_day INTEGER NOT NULL DEFAULT 20,
    max_reviews_per_day INTEGER NOT NULL DEFAULT 100,
    interleave_reviews BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Migration for existing tables (run if table already exists):
-- ALTER TABLE public.user_srs_settings ADD COLUMN IF NOT EXISTS interleave_reviews BOOLEAN NOT NULL DEFAULT true;

-- Indexes
CREATE INDEX IF NOT EXISTS user_srs_settings_user_id_idx ON public.user_srs_settings(user_id);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS user_srs_settings_updated_at ON public.user_srs_settings;
CREATE TRIGGER user_srs_settings_updated_at
    BEFORE UPDATE ON public.user_srs_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.user_srs_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_srs_settings
CREATE POLICY "Users can view own srs settings"
    ON public.user_srs_settings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own srs settings"
    ON public.user_srs_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own srs settings"
    ON public.user_srs_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own srs settings"
    ON public.user_srs_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 12. USER_GAMIFICATION TABLE
-- Stores XP, level, and streak data for gamification
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_gamification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- XP & Level
    total_xp INTEGER NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 1,
    -- Streak tracking
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    streak_freezes INTEGER NOT NULL DEFAULT 0,
    last_freeze_used DATE,
    -- Learning stats
    total_lessons_completed INTEGER NOT NULL DEFAULT 0,
    total_courses_completed INTEGER NOT NULL DEFAULT 0,
    total_cards_reviewed INTEGER NOT NULL DEFAULT 0,
    perfect_lessons INTEGER NOT NULL DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_gamification_user_id_idx ON public.user_gamification(user_id);
CREATE INDEX IF NOT EXISTS user_gamification_level_idx ON public.user_gamification(current_level);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS user_gamification_updated_at ON public.user_gamification;
CREATE TRIGGER user_gamification_updated_at
    BEFORE UPDATE ON public.user_gamification
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own gamification"
    ON public.user_gamification
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own gamification"
    ON public.user_gamification
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification"
    ON public.user_gamification
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 13. USER_ACHIEVEMENTS TABLE
-- Stores earned achievements for each user
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_code TEXT NOT NULL,
    xp_awarded INTEGER NOT NULL DEFAULT 0,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure one achievement per user per code
    UNIQUE(user_id, achievement_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS user_achievements_code_idx ON public.user_achievements(achievement_code);
CREATE INDEX IF NOT EXISTS user_achievements_earned_at_idx ON public.user_achievements(earned_at DESC);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own achievements"
    ON public.user_achievements
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own achievements"
    ON public.user_achievements
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Note: No UPDATE or DELETE policies - achievements are permanent once earned

-- ============================================
-- 14. USER_LEARNING_PROFILE TABLE
-- Stores analyzed learning patterns and preferences
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_learning_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Onboarding preferences
    study_goal TEXT NOT NULL DEFAULT 'general_learning' CHECK (study_goal IN ('exam_prep', 'general_learning', 'skill_improvement')),
    preferred_study_time TEXT NOT NULL DEFAULT 'varies' CHECK (preferred_study_time IN ('morning', 'afternoon', 'evening', 'varies')),
    learning_styles TEXT[] NOT NULL DEFAULT ARRAY['practice']::TEXT[],
    -- Session preferences
    avg_session_length INTEGER NOT NULL DEFAULT 15,
    optimal_session_length INTEGER NOT NULL DEFAULT 15,
    peak_performance_hour INTEGER, -- 0-23
    -- Speed preferences
    speed_preference TEXT NOT NULL DEFAULT 'moderate' CHECK (speed_preference IN ('fast', 'moderate', 'slow')),
    avg_response_time INTEGER NOT NULL DEFAULT 0,
    -- Performance metrics
    overall_accuracy DECIMAL(4,3) NOT NULL DEFAULT 0,
    accuracy_trend TEXT NOT NULL DEFAULT 'stable' CHECK (accuracy_trend IN ('improving', 'stable', 'declining')),
    -- Difficulty preferences
    difficulty_preference TEXT NOT NULL DEFAULT 'moderate' CHECK (difficulty_preference IN ('easy', 'moderate', 'challenging')),
    -- Subject analysis
    strong_subjects TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    weak_subjects TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    -- Timestamps
    last_analyzed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_learning_profile_user_id_idx ON public.user_learning_profile(user_id);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS user_learning_profile_updated_at ON public.user_learning_profile;
CREATE TRIGGER user_learning_profile_updated_at
    BEFORE UPDATE ON public.user_learning_profile
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.user_learning_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own learning profile"
    ON public.user_learning_profile
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own learning profile"
    ON public.user_learning_profile
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning profile"
    ON public.user_learning_profile
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 15. LESSON_SELF_ASSESSMENT TABLE
-- Stores user self-assessment data after completing lessons
-- ============================================

CREATE TABLE IF NOT EXISTS public.lesson_self_assessment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_index INTEGER NOT NULL,
    -- Self-assessment data
    self_confidence INTEGER NOT NULL CHECK (self_confidence BETWEEN 1 AND 4),
    -- 1 = Not confident, 2 = Somewhat, 3 = Confident, 4 = Very confident
    perceived_difficulty TEXT NOT NULL CHECK (perceived_difficulty IN ('too_easy', 'just_right', 'too_hard')),
    goal_achieved TEXT CHECK (goal_achieved IN ('yes', 'partially', 'no')),
    confusion_note TEXT, -- Optional note when goal_achieved = 'no'
    -- Performance data for correlation
    actual_accuracy INTEGER NOT NULL DEFAULT 0, -- 0-100
    questions_total INTEGER NOT NULL DEFAULT 0,
    questions_correct INTEGER NOT NULL DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Allow multiple assessments per lesson (for retakes)
    -- but typically we'll use the most recent one
    UNIQUE(user_id, course_id, lesson_index, created_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS lesson_self_assessment_user_id_idx ON public.lesson_self_assessment(user_id);
CREATE INDEX IF NOT EXISTS lesson_self_assessment_course_id_idx ON public.lesson_self_assessment(course_id);
CREATE INDEX IF NOT EXISTS lesson_self_assessment_user_course_idx ON public.lesson_self_assessment(user_id, course_id);

-- Enable RLS
ALTER TABLE public.lesson_self_assessment ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own self-assessments"
    ON public.lesson_self_assessment
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own self-assessments"
    ON public.lesson_self_assessment
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 16. REFLECTIONS TABLE
-- Stores user reflection data after sessions and weekly check-ins
-- ============================================

CREATE TABLE IF NOT EXISTS public.reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reflection_type TEXT NOT NULL CHECK (reflection_type IN ('session', 'weekly')),
    -- Session reflection fields
    learned TEXT,
    challenges TEXT,
    -- Weekly reflection fields
    rating INTEGER CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
    went_well TEXT,
    could_be_better TEXT,
    -- Session context
    session_type TEXT, -- 'review', 'lessons', 'practice'
    cards_reviewed INTEGER DEFAULT 0,
    lessons_completed INTEGER DEFAULT 0,
    time_spent_ms BIGINT DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    week_of DATE -- For weekly reflections, stores the Monday of the week
);

-- Indexes
CREATE INDEX IF NOT EXISTS reflections_user_id_idx ON public.reflections(user_id);
CREATE INDEX IF NOT EXISTS reflections_type_idx ON public.reflections(reflection_type);
CREATE INDEX IF NOT EXISTS reflections_created_at_idx ON public.reflections(created_at);
CREATE INDEX IF NOT EXISTS reflections_week_of_idx ON public.reflections(week_of);

-- Enable RLS
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own reflections"
    ON public.reflections
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reflections"
    ON public.reflections
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 15. REVIEW_CARDS TABLE (SRS Flashcards)
-- ============================================

CREATE TABLE IF NOT EXISTS public.review_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_index INTEGER NOT NULL DEFAULT 0,
    step_index INTEGER NOT NULL DEFAULT 0,
    card_type TEXT NOT NULL CHECK (card_type IN ('flashcard', 'multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'matching', 'sequence', 'key_point', 'formula', 'question', 'explanation')),
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    -- FSRS algorithm parameters
    stability FLOAT NOT NULL DEFAULT 0,
    difficulty FLOAT NOT NULL DEFAULT 0,
    elapsed_days INTEGER NOT NULL DEFAULT 0,
    scheduled_days INTEGER NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    state TEXT NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review', 'relearning')),
    -- Scheduling
    due_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_review TIMESTAMP WITH TIME ZONE,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for review_cards
CREATE INDEX IF NOT EXISTS review_cards_user_id_idx ON public.review_cards(user_id);
CREATE INDEX IF NOT EXISTS review_cards_course_id_idx ON public.review_cards(course_id);
CREATE INDEX IF NOT EXISTS review_cards_due_date_idx ON public.review_cards(due_date);
CREATE INDEX IF NOT EXISTS review_cards_state_idx ON public.review_cards(state);
CREATE INDEX IF NOT EXISTS review_cards_user_due_idx ON public.review_cards(user_id, due_date);

-- Enable RLS
ALTER TABLE public.review_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_cards
CREATE POLICY "Users can view own review cards"
    ON public.review_cards
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own review cards"
    ON public.review_cards
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own review cards"
    ON public.review_cards
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own review cards"
    ON public.review_cards
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS review_cards_updated_at ON public.review_cards;
CREATE TRIGGER review_cards_updated_at
    BEFORE UPDATE ON public.review_cards
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 16. REVIEW_LOGS TABLE (SRS Review History)
-- ============================================

CREATE TABLE IF NOT EXISTS public.review_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.review_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
    review_duration_ms INTEGER,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for review_logs
CREATE INDEX IF NOT EXISTS review_logs_card_id_idx ON public.review_logs(card_id);
CREATE INDEX IF NOT EXISTS review_logs_user_id_idx ON public.review_logs(user_id);
CREATE INDEX IF NOT EXISTS review_logs_reviewed_at_idx ON public.review_logs(reviewed_at);
CREATE INDEX IF NOT EXISTS review_logs_user_reviewed_idx ON public.review_logs(user_id, reviewed_at);

-- Enable RLS
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_logs
CREATE POLICY "Users can view own review logs"
    ON public.review_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own review logs"
    ON public.review_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- VERIFICATION QUERIES (optional)
-- ============================================

-- Check if table was created
-- SELECT * FROM public.courses LIMIT 1;

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'courses';

-- Check storage bucket
-- SELECT * FROM storage.buckets WHERE id = 'notebook-images';

-- Check storage policies
-- SELECT * FROM pg_policies WHERE tablename = 'objects';

-- Check step performance table
-- SELECT * FROM public.step_performance LIMIT 1;

-- Check user mastery table
-- SELECT * FROM public.user_mastery LIMIT 1;
