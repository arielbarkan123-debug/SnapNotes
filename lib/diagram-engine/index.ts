import { SYSTEM_PROMPT } from './system-prompt';
import { executeCode, detectMode, type RenderMode } from './e2b-executor';
import { generateTikzDiagram } from './tikz-executor';
import { generateRecraftDiagram } from './recraft-executor';
import type { OverlayLabel } from './recraft-executor';
import { routeQuestion, getFallbackPipeline, type Pipeline } from './router';
import { postProcessDiagram } from './post-process';
import { getQAPrompt } from './qa-prompts';
import { trackDiagramEvent } from './telemetry';
import { getCachedDiagram, cacheDiagram } from './cache';
import { preCompute } from './smart-pipeline';
import Anthropic from '@anthropic-ai/sdk';
import { AI_MODEL } from '@/lib/ai/claude';

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
  stepImages?: import('@/components/homework/diagram/types').StepImage[];
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
    console.error('[QA] Vision check failed, passing by default:', err);
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
    console.warn('[Planning] Matplotlib planning failed, proceeding without plan:', err);
    return null; // Non-fatal — just skip planning
  }
}

// ─── E2B Code Generation ────────────────────────────────────────────────────

/**
 * Ask Claude to generate E2B code (LaTeX or matplotlib).
 * If qaFeedback is provided, it's folded into the prompt so the model avoids the same mistake.
 * For matplotlib (first attempt, no error/feedback), a planning step runs first.
 */
async function generateE2BCode(
  question: string,
  previousError?: string,
  qaFeedback?: string,
): Promise<string> {
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

  let code = textBlock.text.trim();
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
  return code.trim();
}

/**
 * Generate a diagram using E2B (LaTeX or matplotlib).
 * Includes compilation retries + AI QA loop.
 */
async function generateE2BDiagram(
  question: string,
  forcedMode?: 'latex' | 'matplotlib'
): Promise<DiagramResult | DiagramError> {
  const MAX_COMPILE_RETRIES = 3;
  const MAX_QA_RETRIES = 2;
  let lastError: string | undefined;
  let code: string = '';
  let mode: RenderMode = forcedMode || 'matplotlib';
  let qaFeedback: string | undefined;

  for (let qaRound = 0; qaRound <= MAX_QA_RETRIES; qaRound++) {
    lastError = undefined;

    for (let attempt = 1; attempt <= MAX_COMPILE_RETRIES; attempt++) {
      try {
        code = await generateE2BCode(
          question,
          lastError,
          // Keep QA feedback for all compile attempts in this round
          // (generateE2BCode prioritizes previousError when both are set)
          qaFeedback,
        );
        mode = forcedMode || detectMode(code);

        console.log(`[E2B QA:${qaRound} Attempt:${attempt}] Mode: ${mode}, Code length: ${code.length}`);

        const result = await executeCode(code, mode);

        if (result.png) {
          const imageUrl = `data:image/png;base64,${result.png}`;

          // QA check (skip on last allowed round — just return what we have)
          if (qaRound < MAX_QA_RETRIES) {
            console.log(`[QA] Checking E2B result (round ${qaRound + 1})...`);
            const verdict = await qaCheckDiagram(imageUrl, question, mode === 'latex' ? 'e2b-latex' : 'e2b-matplotlib');

            if (!verdict.pass) {
              console.log(`[QA] FAILED: ${verdict.issues}`);
              qaFeedback = verdict.issues;
              break; // break compile loop, start new QA round
            }

            console.log(`[QA] PASSED`);
            const pipelineId = mode === 'latex' ? 'e2b-latex' as Pipeline : 'e2b-matplotlib' as Pipeline;
            return {
              imageUrl: await postProcessDiagram(imageUrl, pipelineId),
              pipeline: pipelineId,
              attempts: qaRound * MAX_COMPILE_RETRIES + attempt,
              code,
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
            qaVerdict: qaRound > 0 ? 'pass-after-retry' : 'skipped',
          };
        }

        lastError = result.error;
        console.log(`[E2B Attempt ${attempt}] Failed: ${lastError?.slice(0, 200)}`);
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error';
        console.log(`[E2B Attempt ${attempt}] Error: ${lastError}`);
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
  forcePipeline?: Pipeline
): Promise<DiagramResult | DiagramError> {
  const pipeline = forcePipeline || routeQuestion(question);
  console.log(`[Router] Question: "${question.slice(0, 80)}..." → Pipeline: ${pipeline}`);

  // ── Cache check: return immediately if we have a cached result ──
  try {
    const cached = await getCachedDiagram(question, pipeline);
    if (cached) {
      console.log(`[Cache] HIT for pipeline ${pipeline} — returning cached diagram`);
      trackDiagramEvent({ type: 'cache_hit', pipeline, question, durationMs: 0, attempts: 0, cacheHit: true });
      return cached;
    }
    console.log(`[Cache] MISS for pipeline ${pipeline}`);
    trackDiagramEvent({ type: 'cache_miss', pipeline, question, durationMs: 0, attempts: 0, cacheHit: false });
  } catch {
    // Cache unavailable — not fatal, proceed with generation
  }

  const startTime = performance.now();
  trackDiagramEvent({ type: 'generation_start', pipeline, question, durationMs: 0, attempts: 0 });

  // ── Smart Pre-Compute: compute values with SymPy before rendering ──
  const { enrichedQuestion, result: smartResult } = await preCompute(question);
  if (smartResult.computeUsed) {
    console.log(`[SmartPipeline] Computed ${Object.keys(smartResult.computed!.values).length} values in ${Math.round(smartResult.computed!.computeTimeMs)}ms (${smartResult.computeAttempts} attempt${smartResult.computeAttempts !== 1 ? 's' : ''})`);
  }

  let result: DiagramResult | DiagramError = await runPipeline(pipeline, enrichedQuestion);

  // ── Cross-pipeline fallback: if primary failed and no forced pipeline ──
  if ('error' in result && !forcePipeline) {
    const fallback = getFallbackPipeline(pipeline);
    if (fallback) {
      console.log(`[Fallback] ${pipeline} failed → trying ${fallback}`);
      trackDiagramEvent({ type: 'generation_failure', pipeline, question, durationMs: performance.now() - startTime, attempts: 0, error: result.error });
      result = await runPipeline(fallback, enrichedQuestion);
      if (!('error' in result)) {
        console.log(`[Fallback] ${fallback} succeeded as fallback for ${pipeline}`);
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
    void cacheDiagram(question, result, pipeline).catch(() => {
      // Swallow — caching is best-effort
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
): Promise<DiagramResult | DiagramError> {
  switch (pipeline) {
    case 'e2b-latex':
      return generateE2BDiagram(question, 'latex');
    case 'e2b-matplotlib':
      return generateE2BDiagram(question, 'matplotlib');
    case 'tikz':
      return generateTikzWithQA(question);
    case 'recraft':
      return generateRecraftWithQA(question);
  }
}

// ─── TikZ + QA ──────────────────────────────────────────────────────────────

async function generateTikzWithQA(
  question: string,
): Promise<DiagramResult | DiagramError> {
  const MAX_QA_RETRIES = 2;

  for (let qaRound = 0; qaRound <= MAX_QA_RETRIES; qaRound++) {
    const tikzResult = await generateTikzDiagram(question);

    if ('error' in tikzResult) {
      return { error: tikzResult.error, code: tikzResult.tikzCode, pipeline: 'tikz' };
    }

    // QA check (skip on last round)
    if (qaRound < MAX_QA_RETRIES) {
      console.log(`[QA] Checking TikZ result (round ${qaRound + 1})...`);
      const verdict = await qaCheckDiagram(tikzResult.imageUrl, question, 'tikz');

      if (!verdict.pass) {
        console.log(`[QA] TikZ FAILED: ${verdict.issues}`);
        // For TikZ, we can't easily inject feedback into the template system,
        // so we append the feedback to the question for the next attempt
        question = `${question}\n\nIMPORTANT: The previous diagram had these issues that MUST be fixed: ${verdict.issues}`;
        continue;
      }

      console.log(`[QA] TikZ PASSED`);
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
): Promise<DiagramResult | DiagramError> {
  const MAX_QA_RETRIES = 2;
  console.log(`[generateRecraftWithQA] Starting for: "${question.slice(0, 80)}..."`);

  for (let qaRound = 0; qaRound <= MAX_QA_RETRIES; qaRound++) {
    console.log(`[generateRecraftWithQA] QA round ${qaRound + 1}/${MAX_QA_RETRIES + 1}`);
    const recraftResult = await generateRecraftDiagram(question);
    console.log(`[generateRecraftWithQA] Recraft result:`, 'error' in recraftResult ? recraftResult.error : 'success');

    if ('error' in recraftResult) {
      return { error: recraftResult.error, pipeline: 'recraft' };
    }

    // QA check (skip on last round)
    if (qaRound < MAX_QA_RETRIES) {
      console.log(`[QA] Checking Recraft result (round ${qaRound + 1})...`);
      const verdict = await qaCheckDiagram(recraftResult.imageUrl, question, 'recraft');

      if (!verdict.pass) {
        console.log(`[QA] Recraft FAILED: ${verdict.issues}`);
        // For Recraft, append feedback to question so the prompt rewriter avoids the issue
        question = `${question}\n\nIMPORTANT: The previous illustration had these issues that MUST be fixed: ${verdict.issues}`;
        continue;
      }

      console.log(`[QA] Recraft PASSED`);
    }

    return {
      imageUrl: await postProcessDiagram(recraftResult.imageUrl, 'recraft'),
      pipeline: 'recraft',
      attempts: qaRound + 1,
      // Note: Labels are now composited via TikZ, not returned as overlay
      qaVerdict: qaRound > 0 ? 'pass-after-retry' : 'pass',
    };
  }

  return { error: 'Recraft QA failed after retries', pipeline: 'recraft' };
}
