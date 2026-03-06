-- Add diagram_mode column to homework_sessions
-- Replaces the binary enable_diagrams flag with a 3-way mode: off / quick / accurate
-- Quick = force TikZ pipeline (fast ~8s), Accurate = full routing with QA (15-45s)
ALTER TABLE homework_sessions ADD COLUMN IF NOT EXISTS diagram_mode text DEFAULT 'quick';

-- Backfill: set diagram_mode based on existing enable_diagrams flag
UPDATE homework_sessions
SET diagram_mode = CASE
  WHEN enable_diagrams = false THEN 'off'
  ELSE 'quick'
END
WHERE diagram_mode IS NULL OR diagram_mode = 'quick';
