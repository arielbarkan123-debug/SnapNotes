-- Fix: Diagram cache and telemetry RLS policies are too permissive
DROP POLICY IF EXISTS "Service role full access on diagram_cache" ON diagram_cache;
DROP POLICY IF EXISTS "Service role full access on diagram_telemetry" ON diagram_telemetry;

CREATE POLICY "Authenticated users can read diagram cache"
  ON diagram_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage diagram cache"
  ON diagram_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage diagram telemetry"
  ON diagram_telemetry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
