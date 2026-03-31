-- Add last_nudge_sent_at to user_learning_profile for inactivity nudge emails
ALTER TABLE user_learning_profile
  ADD COLUMN IF NOT EXISTS last_nudge_sent_at TIMESTAMPTZ;
