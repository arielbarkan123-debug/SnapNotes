-- ============================================================================
-- NoteSnap Feature Sprint: Combined Migration
-- Created: 2026-03-01
-- Features: Mistake Patterns (Day 4), Cheatsheets (Day 6), Parent Reports (Day 5)
-- ============================================================================

-- ─── Mistake Patterns Table (Day 4) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mistake_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patterns JSONB NOT NULL,
  insufficient_data BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  stale_after TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mistake_patterns_user ON mistake_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_mistake_patterns_stale ON mistake_patterns(stale_after);

ALTER TABLE mistake_patterns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mistake_patterns' AND policyname = 'Users manage own patterns'
  ) THEN
    CREATE POLICY "Users manage own patterns" ON mistake_patterns
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─── Cheatsheets Table (Day 6) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cheatsheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  title_he TEXT,
  blocks JSONB NOT NULL DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  exam_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cheatsheets_user ON cheatsheets(user_id);
CREATE INDEX IF NOT EXISTS idx_cheatsheets_course ON cheatsheets(course_id);
CREATE INDEX IF NOT EXISTS idx_cheatsheets_share ON cheatsheets(share_token) WHERE share_token IS NOT NULL;

ALTER TABLE cheatsheets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cheatsheets' AND policyname = 'Users manage own cheatsheets'
  ) THEN
    CREATE POLICY "Users manage own cheatsheets" ON cheatsheets
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cheatsheets' AND policyname = 'Public cheatsheets readable'
  ) THEN
    CREATE POLICY "Public cheatsheets readable" ON cheatsheets
      FOR SELECT USING (is_public = true);
  END IF;
END $$;

-- ─── Parent Reports Columns (Day 5) ─────────────────────────────────────────

ALTER TABLE user_learning_profile ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE user_learning_profile ADD COLUMN IF NOT EXISTS reports_enabled BOOLEAN DEFAULT false;
ALTER TABLE user_learning_profile ADD COLUMN IF NOT EXISTS last_report_sent TIMESTAMPTZ;
