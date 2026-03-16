-- Add content_language column to courses table
-- Records what language the course content was generated in.
-- This allows downstream features (expand, help, exams, SRS) to match
-- the course language even if the user later changes their language preference.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS content_language TEXT DEFAULT 'en';

-- Backfill: detect Hebrew courses by checking if the title contains Hebrew characters
UPDATE public.courses
SET content_language = 'he'
WHERE content_language = 'en'
  AND (generated_course->>'title') ~ '[\u0590-\u05FF]';
