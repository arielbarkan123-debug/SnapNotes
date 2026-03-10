/**
 * Diagram generation telemetry.
 *
 * Lightweight observability for the diagram engine:
 * - Always logs to console as structured JSON (searchable in Vercel logs)
 * - Fire-and-forget Supabase insert (never blocks diagram delivery)
 *
 * This gives visibility into which pipelines fail, QA pass rates,
 * generation times, and what types of questions produce bad diagrams.
 */

import type { Pipeline } from './router';
import { createLogger } from '@/lib/logger'

const log = createLogger('diagram:telemetry')

export interface DiagramTelemetryEvent {
  type: 'generation_start' | 'generation_success' | 'generation_failure' | 'qa_pass' | 'qa_fail' | 'cache_hit' | 'cache_miss'
  pipeline: Pipeline
  question: string       // truncated to 200 chars for storage
  durationMs: number
  attempts: number
  qaVerdict?: string
  error?: string
  cacheHit?: boolean
}

/**
 * Track a diagram telemetry event.
 * - Always logs to console (structured JSON for Vercel log search)
 * - Fire-and-forget — NEVER throws, NEVER blocks the main flow
 */
export function trackDiagramEvent(event: DiagramTelemetryEvent): void {
  try {
    // Structured console log — always available, even without Supabase
    const logEntry = {
      _tag: 'diagram_telemetry',
      ...event,
      question: event.question.slice(0, 200),
      timestamp: new Date().toISOString(),
    };

    // Use appropriate log level based on event type
    if (event.type === 'generation_failure') {
      log.error(logEntry, 'Diagram telemetry event');
    } else if (event.type === 'qa_fail') {
      log.warn(logEntry, 'Diagram telemetry event');
    } else {
      log.info(logEntry, 'Diagram telemetry event');
    }

    // Fire-and-forget Supabase insert (async, never awaited)
    // Uses dynamic import to avoid breaking if Supabase is unavailable
    void insertTelemetryToSupabase(logEntry).catch(() => {
      // Swallow all errors — telemetry must never break diagram generation
    });
  } catch {
    // Swallow everything — telemetry is optional
  }
}

/**
 * Insert telemetry event to Supabase (fire-and-forget).
 * If the table doesn't exist yet, this silently fails.
 */
async function insertTelemetryToSupabase(event: {
  _tag: string
  type: string
  pipeline: string
  question: string
  durationMs: number
  attempts: number
  qaVerdict?: string
  error?: string
  cacheHit?: boolean
  timestamp: string
}): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    await supabase.from('diagram_telemetry').insert({
      event_type: event.type,
      pipeline: event.pipeline,
      question: event.question,
      duration_ms: Math.round(event.durationMs),
      attempts: event.attempts,
      qa_verdict: event.qaVerdict || null,
      error_message: event.error?.slice(0, 500) || null,
      cache_hit: event.cacheHit || false,
    });
  } catch {
    // Silently fail — Supabase telemetry is best-effort
  }
}
