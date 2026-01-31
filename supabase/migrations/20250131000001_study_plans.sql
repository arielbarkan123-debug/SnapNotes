-- Study plans
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  exam_date DATE NOT NULL,
  course_ids UUID[] NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily study tasks
CREATE TABLE IF NOT EXISTS study_plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES study_plans ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  task_type TEXT NOT NULL CHECK (task_type IN ('learn_lesson', 'review_lesson', 'practice_test', 'review_weak', 'light_review', 'mock_exam')),
  course_id UUID,
  lesson_index INTEGER,
  lesson_title TEXT,
  description TEXT,
  estimated_minutes INTEGER DEFAULT 15,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_study_plans_user ON study_plans(user_id);
CREATE INDEX idx_study_plan_tasks_plan ON study_plan_tasks(plan_id);
CREATE INDEX idx_study_plan_tasks_date ON study_plan_tasks(scheduled_date);

-- RLS
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own study plans" ON study_plans FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage tasks of their plans" ON study_plan_tasks FOR ALL USING (
  plan_id IN (SELECT id FROM study_plans WHERE user_id = auth.uid())
);
