/**
 * Smart Pre-Compute Pipeline — Orchestrator
 *
 * Separates computation from rendering for math/physics diagrams.
 * Flow: Analyze → Compute (with self-debug) → Verify → Inject
 *
 * Every failure path falls back gracefully to the original question
 * (the existing pipeline handles it as before — no regressions).
 */

import { needsComputation } from './needs-computation';
import { analyzeQuestion } from './analyze';
import { computeWithRetry } from './compute';
import { verifyComputed } from './verify';
import { inject } from './inject';
import type { SmartPipelineResult } from './types';
import { createLogger } from '@/lib/logger'

const log = createLogger('diagram:smart-pipeline')

// Feature flag — disabled by default until validated in production
// Enable via: SMART_PIPELINE_ENABLED=true
const SMART_PIPELINE_ENABLED = process.env.SMART_PIPELINE_ENABLED === 'true';

// Max time for the entire pipeline before falling back (prevents blocking rendering)
const PIPELINE_TIMEOUT_MS = 15000; // 15 seconds

// Max verification re-analysis attempts (GPAI-style retry loop)
const MAX_VERIFY_RETRIES = 1;

export interface PreComputeResult {
  enrichedQuestion: string;
  result: SmartPipelineResult;
}

/**
 * Pre-compute values for a student question before sending to rendering.
 *
 * Returns:
 * - enrichedQuestion: the original question prepended with computed values
 *   (or the original question unchanged if computation was skipped/failed)
 * - result: metadata about what happened (for telemetry)
 *
 * NEVER throws — all failures return the original question unchanged.
 */
export async function preCompute(question: string): Promise<PreComputeResult> {
  // Feature flag check
  if (!SMART_PIPELINE_ENABLED) {
    return fallback(question, 'disabled via env var');
  }

  // Decision: does this question need computation?
  if (!needsComputation(question)) {
    return fallback(question, 'not a computable question');
  }

  try {
    const pipelineStart = performance.now();

    // Wrap in a timeout to prevent blocking the rendering pipeline
    const result = await Promise.race([
      runSmartPipeline(question, pipelineStart),
      timeout(PIPELINE_TIMEOUT_MS).then(() => {
        log.warn(`Timeout after ${PIPELINE_TIMEOUT_MS}ms`);
        return fallback(question, `timeout after ${PIPELINE_TIMEOUT_MS}ms`);
      }),
    ]);

    return result;
  } catch (err) {
    log.error({ err }, 'Unexpected error');
    return fallback(question, `unexpected error: ${err instanceof Error ? err.message : err}`);
  }
}

/**
 * Core pipeline logic — extracted to support timeout wrapper.
 */
async function runSmartPipeline(
  question: string,
  pipelineStart: number,
): Promise<PreComputeResult> {
  // Phase 1: ANALYZE — extract problem structure + generate SymPy code
  log.info('Analyzing question...');
  let analysis = await analyzeQuestion(question);
  if (!analysis) {
    return fallback(question, 'analysis failed (no structured output)');
  }
  log.info(`Analysis: domain=${analysis.domain}, type=${analysis.problemType}, unknowns=${analysis.unknowns.join(', ')}`);

  let totalAttempts = 0;

  // GPAI-style retry loop: if verification fails, re-analyze with feedback
  for (let verifyRetry = 0; verifyRetry <= MAX_VERIFY_RETRIES; verifyRetry++) {
    // Phase 2: COMPUTE — execute SymPy with self-debugging loop
    log.info('Computing with SymPy...');
    const { computed, attempts } = await computeWithRetry(analysis, question);
    totalAttempts += attempts;

    if (!computed) {
      return fallback(question, `computation failed after ${totalAttempts} attempts`);
    }
    log.info(`Computed ${Object.keys(computed.values).length} values in ${Math.round(computed.computeTimeMs)}ms (${attempts} attempt${attempts > 1 ? 's' : ''})`);

    // Phase 3: VERIFY — sanity checks + Sonnet cross-check
    log.info('Verifying computed values...');
    const verification = await verifyComputed(computed, analysis, question);

    if (verification.allPassed) {
      log.info('Verification passed (sanity + Sonnet cross-check)');

      // Phase 4: INJECT — prepend computed values to question
      const enrichedQuestion = inject(computed, analysis, question);

      const totalMs = Math.round(performance.now() - pipelineStart);
      log.info(`Complete in ${totalMs}ms — ${Object.keys(computed.values).length} values injected`);

      return {
        enrichedQuestion,
        result: {
          computeUsed: true,
          analysis,
          computed,
          verification,
          computeAttempts: totalAttempts,
        },
      };
    }

    // Verification failed — try re-analyzing with feedback (GPAI-style)
    if (verifyRetry < MAX_VERIFY_RETRIES) {
      log.warn(`Verification failed: ${verification.failureReason}. Re-analyzing with feedback...`);
      const feedbackQuestion = `${question}\n\nPREVIOUS ATTEMPT FEEDBACK: The computed answer was incorrect. ${verification.failureReason}. Please re-analyze and generate corrected SymPy code.`;
      analysis = await analyzeQuestion(feedbackQuestion);
      if (!analysis) {
        return fallback(question, `re-analysis failed after verification failure: ${verification.failureReason}`);
      }
    } else {
      log.warn(`Verification failed after retry: ${verification.failureReason}`);
      return fallback(question, `verification failed: ${verification.failureReason}`);
    }
  }

  return fallback(question, 'exhausted all verification retries');
}

/**
 * Simple timeout promise.
 */
function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fallback — return the original question unchanged.
 * The existing rendering pipeline handles it as before.
 */
function fallback(question: string, reason: string): PreComputeResult {
  log.info(`Skipped/fallback: ${reason}`);
  return {
    enrichedQuestion: question,
    result: {
      computeUsed: false,
      skipReason: reason,
    },
  };
}

// Re-export types for convenience
export type { SmartPipelineResult } from './types';
export { needsComputation } from './needs-computation';
