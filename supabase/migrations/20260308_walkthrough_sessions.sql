-- Interactive Step-by-Step Walkthrough tables
-- Stores walkthrough sessions (AI solution + compiled step images)
-- and per-step scoped chat threads

-- ============================================================================
-- walkthrough_sessions: stores the AI-generated solution and compiled images
-- ============================================================================

CREATE TABLE IF NOT EXISTS walkthrough_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_session_id UUID REFERENCES homework_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  -- AI-generated solution JSON: { steps[], tikzCode, finalAnswer, finalAnswerHe }
  solution JSONB NOT NULL DEFAULT '{}',
  -- Pipeline status: generating → compiling → partial|complete|failed
  generation_status TEXT NOT NULL DEFAULT 'generating',
  -- Number of step images successfully compiled
  steps_rendered INTEGER NOT NULL DEFAULT 0,
  -- Total number of steps in the solution
  total_steps INTEGER NOT NULL DEFAULT 0,
  -- Array of image URLs for each step (index-aligned with solution.steps)
  step_images JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only access their own walkthrough sessions
ALTER TABLE walkthrough_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own walkthrough sessions"
  ON walkthrough_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own walkthrough sessions"
  ON walkthrough_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own walkthrough sessions"
  ON walkthrough_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypass for API routes that use createServiceClient
CREATE POLICY "Service role full access on walkthrough_sessions"
  ON walkthrough_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_walkthrough_sessions_homework
  ON walkthrough_sessions(homework_session_id);

CREATE INDEX IF NOT EXISTS idx_walkthrough_sessions_user
  ON walkthrough_sessions(user_id);

-- ============================================================================
-- walkthrough_step_chats: per-step scoped chat messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS walkthrough_step_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  walkthrough_id UUID REFERENCES walkthrough_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Which step this message belongs to (0-based index)
  step_index INTEGER NOT NULL,
  -- Message role: student or tutor
  role TEXT NOT NULL CHECK (role IN ('student', 'tutor')),
  -- Message content (may contain LaTeX math)
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only access their own chat messages
ALTER TABLE walkthrough_step_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own step chats"
  ON walkthrough_step_chats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own step chats"
  ON walkthrough_step_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass for API routes
CREATE POLICY "Service role full access on walkthrough_step_chats"
  ON walkthrough_step_chats FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes for efficient per-step queries
CREATE INDEX IF NOT EXISTS idx_walkthrough_step_chats_walkthrough_step
  ON walkthrough_step_chats(walkthrough_id, step_index);

CREATE INDEX IF NOT EXISTS idx_walkthrough_step_chats_user
  ON walkthrough_step_chats(user_id);
