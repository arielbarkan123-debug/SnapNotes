-- ============================================================================
-- Study Plan v2: Academic Events + Chat Messages
-- ============================================================================

-- Academic Events table
CREATE TABLE IF NOT EXISTS academic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('test', 'quiz', 'homework', 'project', 'presentation', 'other')),
  event_date DATE NOT NULL,
  event_time TIME,
  subject TEXT,
  course_id UUID,
  description TEXT,
  topics TEXT[] DEFAULT '{}',
  materials JSONB DEFAULT '[]',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  prep_strategy TEXT DEFAULT 'spread' CHECK (prep_strategy IN ('cram', 'spread', 'custom')),
  prep_days INTEGER DEFAULT 3,
  color TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_via TEXT DEFAULT 'manual' CHECK (created_via IN ('manual', 'ai_chat')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_academic_events_user ON academic_events(user_id);
CREATE INDEX idx_academic_events_date ON academic_events(user_id, event_date);
CREATE INDEX idx_academic_events_status ON academic_events(user_id, status);

ALTER TABLE academic_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own academic events"
  ON academic_events FOR ALL USING (auth.uid() = user_id);

-- Study Plan Chat Messages table
CREATE TABLE IF NOT EXISTS study_plan_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_study_plan_chat_user ON study_plan_chat_messages(user_id, created_at);

ALTER TABLE study_plan_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own chat messages"
  ON study_plan_chat_messages FOR ALL USING (auth.uid() = user_id);

-- Add event_id to study_plan_tasks (nullable FK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'study_plan_tasks' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE study_plan_tasks
      ADD COLUMN event_id UUID REFERENCES academic_events(id) ON DELETE SET NULL;
    CREATE INDEX idx_study_plan_tasks_event ON study_plan_tasks(event_id);
  END IF;
END $$;

-- Updated_at trigger for academic_events
CREATE OR REPLACE FUNCTION update_academic_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER academic_events_updated_at
  BEFORE UPDATE ON academic_events
  FOR EACH ROW
  EXECUTE FUNCTION update_academic_events_updated_at();
