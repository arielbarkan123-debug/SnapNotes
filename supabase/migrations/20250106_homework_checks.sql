-- ============================================================================
-- Homework Checks Table
-- Stores homework check requests and AI feedback results
-- ============================================================================

-- Create homework_checks table
CREATE TABLE IF NOT EXISTS homework_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Uploaded content
  task_image_url TEXT NOT NULL,
  task_text TEXT,
  answer_image_url TEXT NOT NULL,
  answer_text TEXT,
  reference_image_urls TEXT[] DEFAULT '{}',
  teacher_review_urls TEXT[] DEFAULT '{}',
  teacher_review_text TEXT,

  -- Analysis results
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'error')),
  subject TEXT,
  topic TEXT,

  -- Feedback (stored as JSONB)
  feedback JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS homework_checks_user_id_idx ON homework_checks(user_id);
CREATE INDEX IF NOT EXISTS homework_checks_status_idx ON homework_checks(status);
CREATE INDEX IF NOT EXISTS homework_checks_created_at_idx ON homework_checks(created_at DESC);

-- Enable RLS
ALTER TABLE homework_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own homework checks
CREATE POLICY "Users can view own homework checks"
  ON homework_checks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own homework checks"
  ON homework_checks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own homework checks"
  ON homework_checks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own homework checks"
  ON homework_checks FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE homework_checks IS 'Stores homework check requests with AI-generated feedback';
