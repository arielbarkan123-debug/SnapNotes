ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'standard'
CHECK (mode IN ('standard', 'batch_worksheet', 'before_submit', 'rubric'));

ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS mode_result JSONB;

ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS rubric_image_urls TEXT[] DEFAULT '{}';

ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS additional_image_urls TEXT[] DEFAULT '{}';

ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS practiced_items JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS homework_checks_mode_idx ON homework_checks(mode);
