import { SYSTEM_PROMPT } from './system-prompt';
import { executeCode, detectMode, type RenderMode } from './e2b-executor';
import { generateTikzDiagram } from './tikz-executor';
import { generateRecraftDiagram } from './recraft-executor';
import type { OverlayLabel, RecraftStepMeta } from '@/types';
import { routeQuestionWithAI, getFallbackPipeline, type Pipeline } from './router';
import { postProcessDiagram } from './post-process';
import { getQAPrompt } from './qa-prompts';
import { trackDiagramEvent } from './telemetry';
import { getCachedDiagram, cacheDiagram } from './cache';
import { preCompute } from './smart-pipeline';
import { captureSteps } from './step-capture';
import type { StepImage } from '@/components/homework/diagram/types';
import Anthropic from '@anthropic-ai/sdk';
import { AI_MODEL } from '@/lib/ai/claude';
import { createLogger } from '@/lib/logger'

const log = createLogger('diagram-engine')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export type { Pipeline } from './router';

export interface DiagramResult {
  imageUrl: string;
  pipeline: Pipeline;
  attempts: number;
  code?: string;
  overlay?: OverlayLabel[];
  qaVerdict?: string;
  smartPipeline?: { computeUsed: boolean; computeTimeMs?: number; attempts?: number };
  /** Pre-rendered step images from step-capture pipeline */
  stepImages?: StepImage[];
  /** Step-by-step teaching explanations (used for recraft text-based walkthroughs) */
  stepMetadata?: RecraftStepMeta[];
  /** Full unprocessed AI response text — used by step-capture to extract metadata JSON */
  fullResponseText?: string;
  /** Original Recraft image URL before label compositing (for progressive step capture) */
  baseImageUrl?: string;
  /** Labels from Recraft Vision labeling (for progressive step capture) */
  labels?: OverlayLabel[];
}

export interface DiagramError {
  error: string;
  code?: string;
  pipeline?: Pipeline;
}

// ─── AI Quality Assurance ───────────────────────────────────────────────────

interface QAVerdict {
  pass: boolean;
  issues: string;
}

// QA prompts are now pipeline-specific — see qa-prompts.ts

/**
 * Send a generated diagram to Claude Vision for quality check.
 */
async function qaCheckDiagram(
  imageUrl: string,
  question: string,
  pipeline: Pipeline,
): Promise<QAVerdict> {
  try {
    let base64Image: string;
    let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/png';

    if (imageUrl.startsWith('data:image/png;base64,')) {
      // E2B returns base64 data URL
      base64Image = imageUrl.replace('data:image/png;base64,', '');
    } else {
      // TikZ and Recraft return HTTP URLs
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      base64Image = Buffer.from(buffer).toString('base64');
      const ct = response.headers.get('content-type') || 'image/png';
      if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(ct)) {
        mediaType = ct as typeof mediaType;
      }
    }

    const qaMessage = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Image },
            },
            {
              type: 'text',
              text: getQAPrompt(pipeline, question),
            },
          ],
        },
      ],
    });

    const textBlock = qaMessage.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { pass: true, issues: '' };
    }

    let jsonStr = textBlock.text.trim();
    // Extract JSON from possible markdown fences
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    // Find JSON object
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    const parsed = JSON.parse(jsonStr);
    return {
      pass: !!parsed.pass,
      issues: typeof parsed.issues === 'string' ? parsed.issues : '',
    };
  } catch (err) {
    log.error({ err }, 'Vision QA check failed — passing diagram by default (QA was skipped, not validated)');
    // If QA itself fails, don't block the user
    return { pass: true, issues: '' };
  }
}

// ─── Matplotlib Planning Step ───────────────────────────────────────────────

/**
 * Lightweight planning step for matplotlib diagrams.
 * Claude outlines the diagram layout BEFORE generating code.
 * This prevents coordinate errors, label overlap, and missing elements.
 * ~500 tokens, ~2-3 seconds — cheaper than a QA-fail-and-retry cycle.
 */
async function planMatplotlibDiagram(question: string): Promise<string | null> {
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Plan a matplotlib diagram for a student. Be specific with numbers.

1. DIAGRAM TYPE (line graph, scatter, bar chart, FBD, geometry, unit circle, histogram, etc.)
2. KEY ELEMENTS to draw (list each curve, point, vector, shape with exact values)
3. COORDINATE RANGES (x: [min, max], y: [min, max])
4. COLOR ASSIGNMENTS (element → hex color)
5. LABEL POSITIONS (for each annotation, specify offset direction to avoid overlap)

Question: ${question}

Reply in 5-7 lines. Numbers only, no prose.`,
      }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    return textBlock && textBlock.type === 'text' ? textBlock.text.trim() : null;
  } catch (err) {
    log.warn({ err }, 'Matplotlib planning failed, proceeding without plan');
    return null; // Non-fatal — just skip planning
  }
}

// ─── E2B Code Generation ────────────────────────────────────────────────────

/**
 * Ask Claude to generate E2B code (LaTeX or matplotlib).
 * If qaFeedback is provided, it's folded into the prompt so the model avoids the same mistake.
 * For matplotlib (first attempt, no error/feedback), a planning step runs first.
 */
interface E2BCodeResult {
  code: string;
  fullResponseText: string;
}

async function generateE2BCode(
  question: string,
  previousError?: string,
  qaFeedback?: string,
): Promise<E2BCodeResult> {
  let userMessage: string;

  if (previousError) {
    userMessage = `The previous code produced this error:\n\`\`\`\n${previousError}\n\`\`\`\n\nPlease fix the code and try again. Original question: ${question}`;
  } else if (qaFeedback) {
    userMessage = `A quality reviewer checked the previous diagram and found these issues:\n"${qaFeedback}"\n\nRegenerate the diagram fixing these problems. Original question: ${question}`;
  } else {
    // First attempt — use planning for matplotlib questions
    // Planning only runs on the first attempt (no error/feedback yet)
    const isLikelyMatplotlib = /graph|plot|sketch|chart|histogram|scatter|box plot|free body|fbd|force diagram|y\s*=|f\(x\)|parabola|sine|cosine|normal distribution|bell curve|projectile|supply and demand/i.test(question);

    if (isLikelyMatplotlib) {
      const plan = await planMatplotlibDiagram(question);
      if (plan) {
        userMessage = `DIAGRAM PLAN (follow this layout precisely):\n${plan}\n\nGenerate matplotlib code that implements this plan exactly.\n\nOriginal question: ${question}`;
      } else {
        userMessage = question;
      }
    } else {
      userMessage = question;
    }
  }

  const response = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Preserve full response for step metadata extraction
  const fullResponseText = textBlock.text;

  let code = fullResponseText.trim();
  if (code.startsWith('```python')) {
    code = code.slice('```python'.length);
  } else if (code.startsWith('```latex') || code.startsWith('```tex')) {
    code = code.slice(code.indexOf('\n') + 1);
  } else if (code.startsWith('```')) {
    code = code.slice('```'.length);
  }
  if (code.endsWith('```')) {
    code = code.slice(0, -'```'.length);
  }
  return { code: code.trim(), fullResponseText };
}

/**
 * Generate a diagram using E2B (LaTeX or matplotlib).
 * Includes compilation retries + AI QA loop.
 */
async function generateE2BDiagram(
  question: string,
  forcedMode?: 'latex' | 'matplotlib',
  skipQA?: boolean,
): Promise<DiagramResult | DiagramError> {
  const MAX_COMPILE_RETRIES = 3;
  const MAX_QA_RETRIES = skipQA ? 0 : 2;
  let lastError: string | undefined;
  let code: string = '';
  let fullResponseText: string = '';
  let mode: RenderMode = forcedMode || 'matplotlib';
  let qaFeedback: string | undefined;

  for (let qaRound = 0; qaRound <= MAX_QA_RETRIES; qaRound++) {
    lastError = undefined;

    for (let attempt = 1; attempt <= MAX_COMPILE_RETRIES; attempt++) {
      try {
        const e2bResult = await generateE2BCode(
          question,
          lastError,
          // Keep QA feedback for all compile attempts in this round
          // (generateE2BCode prioritizes previousError when both are set)
          qaFeedback,
        );
        code = e2bResult.code;
        fullResponseText = e2bResult.fullResponseText;
        mode = forcedMode || detectMode(code);

        log.info(`[E2B QA:${qaRound} Attempt:${attempt}] Mode: ${mode}, Code length: ${code.length}`);

        const result = await executeCode(code, mode);

        if (result.png) {
          const imageUrl = `data:image/png;base64,${result.png}`;

          // QA check (skip on last allowed round — just return what we have)
          if (qaRound < MAX_QA_RETRIES) {
            log.info(`Checking E2B result (round ${qaRound + 1})...`);
            const verdict = await qaCheckDiagram(imageUrl, question, mode === 'latex' ? 'e2b-latex' : 'e2b-matplotlib');

            if (!verdict.pass) {
              log.info(`FAILED: ${verdict.issues}`);
              qaFeedback = verdict.issues;
              break; // break compile loop, start new QA round
            }

            log.info(`PASSED`);
            const pipelineId = mode === 'latex' ? 'e2b-latex' as Pipeline : 'e2b-matplotlib' as Pipeline;
            return {
              imageUrl: await postProcessDiagram(imageUrl, pipelineId),
              pipeline: pipelineId,
              attempts: qaRound * MAX_COMPILE_RETRIES + attempt,
              code,
              fullResponseText,
              qaVerdict: 'pass',
            };
          }

          // Last QA round — return regardless
          const lastPipelineId = mode === 'latex' ? 'e2b-latex' as Pipeline : 'e2b-matplotlib' as Pipeline;
          return {
            imageUrl: await postProcessDiagram(imageUrl, lastPipelineId),
            pipeline: lastPipelineId,
            attempts: qaRound * MAX_COMPILE_RETRIES + attempt,
            code,
            fullResponseText,
            qaVerdict: qaRound > 0 ? 'pass-after-retry' : 'skipped',
          };
        }

        lastError = result.error;
        log.info(`[E2B Attempt ${attempt}] Failed: ${lastError?.slice(0, 200)}`);
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error';
        log.info(`[E2B Attempt ${attempt}] Error: ${lastError}`);
      }
    }

    // If we exhausted compile retries without producing an image, stop
    if (lastError) break;
  }

  return {
    error: `Failed after retries. Last error: ${lastError}`,
    code,
    pipeline: mode === 'latex' ? 'e2b-latex' : 'e2b-matplotlib',
  };
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Generate a diagram for a student question.
 * Routes to the best pipeline, generates, runs AI QA, retries if needed.
 */
export async function generateDiagram(
  question: string,
  forcePipeline?: Pipeline,
  options?: { skipStepCapture?: boolean; skipQA?: boolean; userId?: string; skipVerification?: boolean }
): Promise<DiagramResult | DiagramError> {
  const pipeline = forcePipeline || await routeQuestionWithAI(question);
  log.info(`Question: "${question.slice(0, 80)}..." → Pipeline: ${pipeline}`);

  // ── Cache check: return immediately if we have a cached result ──
  try {
    const cached = await getCachedDiagram(question, pipeline);
    if (cached) {
      log.info(`HIT for pipeline ${pipeline} — returning cached diagram`);
      trackDiagramEvent({ type: 'cache_hit', pipeline, question, durationMs: 0, attempts: 0, cacheHit: true });
      return cached;
    }
    log.info(`MISS for pipeline ${pipeline}`);
    trackDiagramEvent({ type: 'cache_miss', pipeline, question, durationMs: 0, attempts: 0, cacheHit: false });
  } catch (err) {
    log.warn({ err }, 'Cache check failed — proceeding with generation')
  }

  const startTime = performance.now();
  trackDiagramEvent({ type: 'generation_start', pipeline, question, durationMs: 0, attempts: 0 });

  // ── Smart Pre-Compute: compute values with SymPy before rendering ──
  const { enrichedQuestion, result: smartResult } = await preCompute(question);
  if (smartResult.computeUsed) {
    log.info(`Computed ${Object.keys(smartResult.computed!.values).length} values in ${Math.round(smartResult.computed!.computeTimeMs)}ms (${smartResult.computeAttempts} attempt${smartResult.computeAttempts !== 1 ? 's' : ''})`);
  }

  // ── Per-pipeline timeout for quick mode (skipQA) ──
  // When forced pipeline (quick mode = TikZ): single pipeline, 40s budget.
  // When no forced pipeline (accurate mode): AI router picks, no timeout needed.
  const PIPELINE_TIMEOUT_MS = options?.skipQA
    ? (forcePipeline ? 40_000 : 20_000)
    : undefined;

  let result: DiagramResult | DiagramError;

  if (PIPELINE_TIMEOUT_MS) {
    log.info(`Quick mode: ${PIPELINE_TIMEOUT_MS}ms per-pipeline timeout`);
    result = await Promise.race([
      runPipeline(pipeline, enrichedQuestion, options?.skipQA, options?.userId, options?.skipVerification),
      new Promise<DiagramError>((resolve) =>
        setTimeout(() => resolve({ error: `Pipeline ${pipeline} timed out after ${PIPELINE_TIMEOUT_MS}ms`, pipeline }), PIPELINE_TIMEOUT_MS)
      ),
    ]);
  } else {
    result = await runPipeline(pipeline, enrichedQuestion, options?.skipQA, options?.userId, options?.skipVerification);
  }

  // ── Cross-pipeline fallback: if primary failed and no forced pipeline ──
  if ('error' in result && !forcePipeline) {
    const fallback = getFallbackPipeline(pipeline);
    if (fallback) {
      log.info(`${pipeline} failed (${result.error?.slice(0, 100)}) → trying ${fallback}`);
      trackDiagramEvent({ type: 'generation_failure', pipeline, question, durationMs: performance.now() - startTime, attempts: 0, error: result.error });

      if (PIPELINE_TIMEOUT_MS) {
        result = await Promise.race([
          runPipeline(fallback, enrichedQuestion, options?.skipQA, options?.userId, options?.skipVerification),
          new Promise<DiagramError>((resolve) =>
            setTimeout(() => resolve({ error: `Fallback ${fallback} timed out after ${PIPELINE_TIMEOUT_MS}ms`, pipeline: fallback }), PIPELINE_TIMEOUT_MS)
          ),
        ]);
      } else {
        result = await runPipeline(fallback, enrichedQuestion, options?.skipQA, options?.userId, options?.skipVerification);
      }

      if (!('error' in result)) {
        log.info(`${fallback} succeeded as fallback for ${pipeline}`);
      }
    }
  }

  const durationMs = performance.now() - startTime;

  if ('error' in result) {
    trackDiagramEvent({
      type: 'generation_failure',
      pipeline,
      question,
      durationMs,
      attempts: 0,
      error: result.error,
    });
  } else {
    // Attach smart pipeline metadata to result
    if (smartResult.computeUsed) {
      result.smartPipeline = {
        computeUsed: true,
        computeTimeMs: smartResult.computed?.computeTimeMs,
        attempts: smartResult.computeAttempts,
      };
    }

    // ── Step capture: pre-render step images (best-effort, truly non-blocking) ──
    // Step capture compiles each TikZ layer separately + uploads to storage.
    // This can take 30-60s and MUST NOT block diagram delivery, otherwise the
    // 90s client-side timeout fires before the response is sent.
    // Strategy: race captureSteps against a 15s timeout. If capture finishes
    // within budget, attach pre-rendered images (instant walkthrough). If not,
    // the frontend falls back to the legacy on-demand path.
    // For auto-start: skip entirely — saves 15s, users get on-demand step-by-step.
    if (result.code && !options?.skipStepCapture) {
      try {
        const { createClient: createSC } = await import('@/lib/supabase/server');
        const supabase = await createSC();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        if (!userId) {
          log.warn('Step capture skipped: no authenticated user');
        } else {
          const metadataText = result.fullResponseText || result.code;

          // Race: 15s budget for step capture, then give up and return diagram without step images
          const STEP_CAPTURE_TIMEOUT_MS = 15_000;
          const capturePromise = captureSteps(
            result.code,
            result.pipeline,
            metadataText,
            userId,
            question,
          );
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), STEP_CAPTURE_TIMEOUT_MS)
          );

          const captureResult = await Promise.race([capturePromise, timeoutPromise]);

          if (captureResult && captureResult.stepImages.length > 0) {
            result.stepImages = captureResult.stepImages;
            log.info(`Step capture: ${captureResult.stepImages.length} steps in ${captureResult.captureTimeMs}ms`);
          } else if (!captureResult) {
            log.warn(`Step capture timed out after ${STEP_CAPTURE_TIMEOUT_MS}ms — returning diagram without step images`);
            // Let the capture finish in background (images will be in storage for future use)
            capturePromise.catch((err) => {
              log.warn('Background step capture failed:', err);
            });
          }
        }
      } catch (err) {
        // Step capture failure never blocks diagram delivery
        log.warn({ err }, 'Step capture failed (non-blocking)');
      }
    }

    // ── Recraft step capture: progressive label overlays (best-effort) ──
    // For Recraft diagrams, create step images by progressively revealing labels
    // on the base image. Uses a single E2B sandbox session for efficiency.
    if (result.pipeline === 'recraft' && !options?.skipStepCapture && result.baseImageUrl && result.labels && result.labels.length > 0 && !result.stepImages?.length) {
      try {
        const { createClient: createSC } = await import('@/lib/supabase/server');
        const supabase = await createSC();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        if (userId) {
          const { captureRecraftSteps } = await import('./step-capture/recraft-steps');
          const RECRAFT_STEP_CAPTURE_TIMEOUT_MS = 25_000;
          const capturePromise = captureRecraftSteps(
            result.baseImageUrl,
            result.labels,
            result.stepMetadata || [],
            userId,
            question,
          );
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), RECRAFT_STEP_CAPTURE_TIMEOUT_MS)
          );

          const captureResult = await Promise.race([capturePromise, timeoutPromise]);

          if (captureResult && captureResult.stepImages.length > 0) {
            result.stepImages = captureResult.stepImages;
            log.info(`Recraft step capture: ${captureResult.stepImages.length} steps in ${captureResult.captureTimeMs}ms`);
          } else if (!captureResult) {
            log.warn(`Recraft step capture timed out after ${RECRAFT_STEP_CAPTURE_TIMEOUT_MS}ms`);
            capturePromise.catch((err) => {
              log.warn('Background recraft step capture failed:', err);
            });
          }
        }
      } catch (err) {
        log.warn({ err }, 'Recraft step capture failed (non-blocking)');
      }
    }

    trackDiagramEvent({
      type: 'generation_success',
      pipeline,
      question,
      durationMs,
      attempts: result.attempts,
      qaVerdict: result.qaVerdict,
    });

    // ── Cache store: save successful result (fire-and-forget) ──
    // Pass the originally-routed pipeline so fallback results are cached
    // under the key that future lookups (using routeQuestion) will use.
    void cacheDiagram(question, result, pipeline).catch((err) => {
      log.warn({ err, pipeline }, 'Cache store failed (non-blocking)')
    });
  }

  return result;
}

// ─── Pipeline Runner ─────────────────────────────────────────────────────────

/**
 * Run a specific pipeline for a question.
 * Extracted from the switch statement to enable fallback logic.
 */
async function runPipeline(
  pipeline: Pipeline,
  question: string,
  skipQA?: boolean,
  userId?: string,
  skipVerification?: boolean,
): Promise<DiagramResult | DiagramError> {
  switch (pipeline) {
    case 'e2b-latex':
      return generateE2BDiagram(question, 'latex', skipQA);
    case 'e2b-matplotlib':
      return generateE2BDiagram(question, 'matplotlib', skipQA);
    case 'tikz':
      return generateTikzWithQA(question, skipQA);
    case 'recraft':
      return generateRecraftWithQA(question, skipQA, userId, skipVerification);
  }
}

// ─── TikZ + QA ──────────────────────────────────────────────────────────────

async function generateTikzWithQA(
  question: string,
  skipQA?: boolean,
): Promise<DiagramResult | DiagramError> {
  const MAX_QA_RETRIES = skipQA ? 0 : 2;

  for (let qaRound = 0; qaRound <= MAX_QA_RETRIES; qaRound++) {
    const tikzResult = await generateTikzDiagram(question);

    if ('error' in tikzResult) {
      return { error: tikzResult.error, code: tikzResult.tikzCode, pipeline: 'tikz' };
    }

    // QA check (skip on last round)
    if (qaRound < MAX_QA_RETRIES) {
      log.info(`Checking TikZ result (round ${qaRound + 1})...`);
      const verdict = await qaCheckDiagram(tikzResult.imageUrl, question, 'tikz');

      if (!verdict.pass) {
        log.info(`TikZ FAILED: ${verdict.issues}`);
        // For TikZ, we can't easily inject feedback into the template system,
        // so we append the feedback to the question for the next attempt
        question = `${question}\n\nIMPORTANT: The previous diagram had these issues that MUST be fixed: ${verdict.issues}`;
        continue;
      }

      log.info(`TikZ PASSED`);
    }

    return {
      imageUrl: await postProcessDiagram(tikzResult.imageUrl, 'tikz'),
      pipeline: 'tikz',
      attempts: qaRound + 1,
      code: tikzResult.tikzCode,
      qaVerdict: qaRound > 0 ? 'pass-after-retry' : 'pass',
    };
  }

  // Shouldn't reach here, but just in case
  return { error: 'TikZ QA failed after retries', pipeline: 'tikz' };
}

// ─── Recraft + QA ───────────────────────────────────────────────────────────

async function generateRecraftWithQA(
  question: string,
  skipQA?: boolean,
  userId?: string,
  skipVerification?: boolean,
): Promise<DiagramResult | DiagramError> {
  const MAX_QA_RETRIES = skipQA ? 0 : 2;
  log.info(`Starting for: "${question.slice(0, 80)}..."`);

  for (let qaRound = 0; qaRound <= MAX_QA_RETRIES; qaRound++) {
    log.info(`QA round ${qaRound + 1}/${MAX_QA_RETRIES + 1}`);
    const recraftResult = await generateRecraftDiagram(question, userId, skipVerification);
    log.info({ result: 'error' in recraftResult ? recraftResult.error : 'success' }, 'Recraft result');

    if ('error' in recraftResult) {
      return { error: recraftResult.error, pipeline: 'recraft' };
    }

    // QA check (skip on last round)
    if (qaRound < MAX_QA_RETRIES) {
      log.info(`Checking Recraft result (round ${qaRound + 1})...`);
      const verdict = await qaCheckDiagram(recraftResult.imageUrl, question, 'recraft');

      if (!verdict.pass) {
        log.info(`Recraft FAILED: ${verdict.issues}`);
        // For Recraft, append feedback to question so the prompt rewriter avoids the issue
        question = `${question}\n\nIMPORTANT: The previous illustration had these issues that MUST be fixed: ${verdict.issues}`;
        continue;
      }

      log.info(`Recraft PASSED`);
    }

    return {
      imageUrl: await postProcessDiagram(recraftResult.imageUrl, 'recraft'),
      pipeline: 'recraft',
      attempts: qaRound + 1,
      qaVerdict: qaRound > 0 ? 'pass-after-retry' : 'pass',
      stepMetadata: recraftResult.stepMetadata,
      baseImageUrl: recraftResult.baseImageUrl,
      labels: recraftResult.labels,
      overlay: recraftResult.labels,
    };
  }

  return { error: 'Recraft QA failed after retries', pipeline: 'recraft' };
}
