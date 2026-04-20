-- RPC: get_nudge_candidates
--
-- Returns users who:
--   1. Have at least one course
--   2. Haven't had any study activity (user_progress updated_at) in >= inactivity_cutoff days
--   3. Haven't been nudged since nudge_cooloff_cutoff
--   4. Have a valid email address in auth.users
--
-- Called by /api/cron/send-nudge-emails

CREATE OR REPLACE FUNCTION get_nudge_candidates(
  inactivity_cutoff TIMESTAMPTZ,
  nudge_cooloff_cutoff TIMESTAMPTZ
)
RETURNS TABLE (
  user_id     UUID,
  email       TEXT,
  name        TEXT,
  days_inactive INT,
  last_course_title TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ulp.user_id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '') AS name,
    EXTRACT(DAY FROM NOW() - MAX(up.updated_at))::INT AS days_inactive,
    (
      SELECT c.generated_course->>'title'
      FROM courses c
      WHERE c.user_id = ulp.user_id
      ORDER BY c.updated_at DESC
      LIMIT 1
    ) AS last_course_title
  FROM user_learning_profile ulp
  JOIN auth.users au ON au.id = ulp.user_id
  -- JOIN user_progress so we can aggregate updated_at in SELECT/HAVING
  JOIN user_progress up ON up.user_id = ulp.user_id
  -- Must have at least one course
  WHERE EXISTS (
    SELECT 1 FROM courses c WHERE c.user_id = ulp.user_id
  )
  -- Not nudged recently
  AND (ulp.last_nudge_sent_at IS NULL OR ulp.last_nudge_sent_at < nudge_cooloff_cutoff)
  -- Has a valid email
  AND au.email IS NOT NULL AND au.email <> ''
  GROUP BY ulp.user_id, au.email, au.raw_user_meta_data
  -- Only users who haven't been active since the cutoff
  HAVING MAX(up.updated_at) < inactivity_cutoff
  ORDER BY MAX(up.updated_at) ASC
  LIMIT 500;
$$;
