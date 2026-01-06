-- ============================================================================
-- Error Monitoring System
-- Captures client-side errors for debugging and monitoring
-- ============================================================================

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Error details
  error_type TEXT NOT NULL DEFAULT 'javascript', -- javascript, api, network, unhandled
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_name TEXT,

  -- Context
  page_path TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,

  -- Device/Browser info
  user_agent TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  os_version TEXT,
  device_type TEXT, -- mobile, tablet, desktop
  screen_resolution TEXT,

  -- Additional context (JSON)
  context JSONB DEFAULT '{}',

  -- Request info (for API errors)
  api_endpoint TEXT,
  http_method TEXT,
  http_status INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- For grouping similar errors
  error_hash TEXT GENERATED ALWAYS AS (
    md5(COALESCE(error_message, '') || COALESCE(component_name, '') || COALESCE(page_path, ''))
  ) STORED
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_page_path ON error_logs(page_path);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_hash ON error_logs(error_hash);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Only admin users can read error logs
CREATE POLICY "Admin users can read error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Anyone can insert error logs (for error reporting)
CREATE POLICY "Anyone can insert error logs"
  ON error_logs
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Admin users can delete old error logs
CREATE POLICY "Admin users can delete error logs"
  ON error_logs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Error Statistics View
-- Aggregated view for monitoring dashboard
-- ============================================================================

CREATE OR REPLACE VIEW error_stats AS
SELECT
  DATE_TRUNC('hour', created_at) AS hour,
  error_type,
  page_path,
  error_hash,
  MIN(error_message) AS error_message,
  MIN(component_name) AS component_name,
  COUNT(*) AS occurrence_count,
  COUNT(DISTINCT user_id) AS affected_users,
  COUNT(DISTINCT session_id) AS affected_sessions,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), error_type, page_path, error_hash
ORDER BY hour DESC, occurrence_count DESC;

-- ============================================================================
-- Cleanup function - remove old error logs (older than 30 days)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION cleanup_old_error_logs() TO service_role;
