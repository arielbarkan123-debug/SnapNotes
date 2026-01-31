CREATE TABLE IF NOT EXISTS user_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  course_id UUID NOT NULL,
  lesson_index INTEGER NOT NULL,
  step_index INTEGER,
  note_text TEXT,
  flag_type TEXT CHECK (flag_type IN ('confusing', 'important')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id, lesson_index, step_index)
);

ALTER TABLE user_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own annotations" ON user_annotations FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_annotations_user_course ON user_annotations(user_id, course_id);
