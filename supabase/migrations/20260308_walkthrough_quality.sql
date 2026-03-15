-- Quality telemetry + user feedback columns for walkthrough_sessions
-- Enables continuous improvement: track failure patterns by topic,
-- store validation errors, and collect user feedback.

ALTER TABLE walkthrough_sessions
  ADD COLUMN IF NOT EXISTS topic_classified TEXT,
  ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS compilation_failures INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS user_feedback TEXT;

-- Index for querying feedback and failures by topic
CREATE INDEX IF NOT EXISTS idx_walkthrough_quality_topic
  ON walkthrough_sessions(topic_classified)
  WHERE topic_classified IS NOT NULL;
