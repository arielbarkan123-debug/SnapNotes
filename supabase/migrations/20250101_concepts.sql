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
