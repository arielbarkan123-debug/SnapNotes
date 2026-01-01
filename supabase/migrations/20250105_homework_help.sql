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
