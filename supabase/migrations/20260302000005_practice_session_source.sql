-- Add source tracking to practice sessions for homework error → practice flow
ALTER TABLE practice_sessions
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'course',
ADD COLUMN IF NOT EXISTS error_context JSONB;

COMMENT ON COLUMN practice_sessions.source_type IS 'Source: course, homework_error';
COMMENT ON COLUMN practice_sessions.error_context IS 'Context from homework error for targeted practice';
