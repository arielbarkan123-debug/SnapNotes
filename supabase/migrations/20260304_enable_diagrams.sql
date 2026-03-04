-- Add enable_diagrams column to homework_sessions
-- Tracks whether the student opted into visual diagrams for this session
ALTER TABLE homework_sessions ADD COLUMN IF NOT EXISTS enable_diagrams boolean DEFAULT true;
