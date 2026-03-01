-- Diagram Engine: Cache + Telemetry tables
-- These support the diagram quality improvements (cache for perf, telemetry for observability)

-- ─── diagram_cache ─────────────────────────────────────────────────────────
-- Stores successfully generated diagrams for instant re-use.
-- Only QA-passed diagrams are cached.
-- Key: SHA-256 hash of normalized question text + pipeline.

CREATE TABLE IF NOT EXISTS diagram_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_hash TEXT NOT NULL UNIQUE,
  question_text TEXT NOT NULL,           -- original question (truncated to 500 chars)
  pipeline TEXT NOT NULL,                -- e.g. 'e2b-latex', 'e2b-matplotlib', 'tikz', 'recraft'
  image_data TEXT NOT NULL,              -- base64 data URL or HTTP URL
  qa_verdict TEXT DEFAULT 'pass',        -- 'pass' or 'pass-after-retry'
  hit_count INTEGER DEFAULT 0,           -- how many times this cached result was served
  last_hit_at TIMESTAMPTZ,              -- last time this cache entry was hit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by hash
CREATE INDEX IF NOT EXISTS idx_diagram_cache_hash ON diagram_cache (question_hash);

-- ─── diagram_telemetry ─────────────────────────────────────────────────────
-- Tracks diagram generation events for observability.
-- Fire-and-forget inserts — never blocks diagram delivery.

CREATE TABLE IF NOT EXISTS diagram_telemetry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,              -- generation_start, generation_success, generation_failure, etc.
  pipeline TEXT NOT NULL,                -- which pipeline was used
  question TEXT NOT NULL,                -- truncated to 200 chars
  duration_ms INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  qa_verdict TEXT,                       -- pass, pass-after-retry, skipped, failed
  error_message TEXT,                    -- error details (truncated to 500 chars)
  cache_hit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying events by type and time
CREATE INDEX IF NOT EXISTS idx_diagram_telemetry_type ON diagram_telemetry (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagram_telemetry_pipeline ON diagram_telemetry (pipeline, created_at DESC);

-- Enable RLS (required by Supabase)
ALTER TABLE diagram_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_telemetry ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (these tables are only accessed server-side)
CREATE POLICY "Service role full access on diagram_cache"
  ON diagram_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on diagram_telemetry"
  ON diagram_telemetry
  FOR ALL
  USING (true)
  WITH CHECK (true);
