-- Add image_label_data column to exam_questions table
-- This column stores data for image labeling questions

ALTER TABLE exam_questions
ADD COLUMN IF NOT EXISTS image_label_data JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN exam_questions.image_label_data IS 'JSON data for image_label question type: image_url, labels with positions, interaction_mode (drag/type/both)';

-- Create index for faster queries on questions with image data
CREATE INDEX IF NOT EXISTS idx_exam_questions_image_label
ON exam_questions ((image_label_data IS NOT NULL))
WHERE image_label_data IS NOT NULL;
