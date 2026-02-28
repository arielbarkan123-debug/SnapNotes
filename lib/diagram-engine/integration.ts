/**
 * Integration layer between NoteSnap's existing diagram system and the
 * new 4-pipeline diagram engine.
 *
 * The existing system uses React SVG components rendered client-side.
 * The engine generates server-side images (PNG) via E2B, TikZ, or Recraft.
 *
 * This module provides functions to:
 * 1. Check if the engine should handle a given question
 * 2. Generate an engine diagram and return it in a format the frontend can display
 * 3. Batch-generate diagrams for course steps with concurrency limiting
 */

import { generateDiagram, type Pipeline } from './index';
import { shouldUseEngine } from './tiered-router';
import type { Lesson } from '@/types';

export { shouldUseEngine, tieredRoute } from './tiered-router';

/**
 * Result from the engine in a format suitable for the NoteSnap frontend.
 * The imageUrl is either a base64 data URL (E2B) or an HTTP URL (TikZ/Recraft).
 */
export interface EngineDiagramResult {
  type: 'engine_diagram';
  imageUrl: string;
  pipeline: Pipeline;
  attempts: number;
  qaVerdict?: string;
  overlay?: Array<{
    text: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
  }>;
}

/**
 * Try to generate a diagram using the engine.
 * Returns undefined if the question doesn't need the engine,
 * or if generation fails (so the caller can fall back to React components).
 */
export async function tryEngineDiagram(
  question: string,
  forcePipeline?: Pipeline,
): Promise<EngineDiagramResult | undefined> {
  console.log(`[Engine] tryEngineDiagram called with: "${question.slice(0, 80)}..."`);

  // If no forced pipeline, check if the engine should handle this
  if (!forcePipeline && !shouldUseEngine(question)) {
    console.log('[Engine] shouldUseEngine returned false, skipping');
    return undefined;
  }

  console.log('[Engine] Calling generateDiagram...');

  try {
    const result = await generateDiagram(question, forcePipeline);

    if ('error' in result) {
      console.error(`[Engine] Generation failed: ${result.error}`, { pipeline: result.pipeline });
      return undefined; // Fall back to React components
    }

    console.log(`[Engine] Success! Pipeline: ${result.pipeline}, URL length: ${result.imageUrl?.length}`);

    return {
      type: 'engine_diagram',
      imageUrl: result.imageUrl,
      pipeline: result.pipeline,
      attempts: result.attempts,
      qaVerdict: result.qaVerdict,
      overlay: result.overlay,
    };
  } catch (err) {
    console.error('[Engine] Unexpected error:', err);
    return undefined; // Fall back to React components
  }
}

// ─── Batch Generation for Course Steps ────────────────────────────────────

/** Max concurrent diagram generations to avoid exhausting E2B sandbox limits */
const MAX_CONCURRENT_DIAGRAMS = 2;

interface DiagramTask {
  lessonIdx: number;
  stepIdx: number;
  description: string;
}

/**
 * Run an array of async functions with a concurrency limit.
 * Returns results in the same order as the input functions.
 */
async function runWithConcurrency<T>(
  fns: Array<() => Promise<T>>,
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(fns.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < fns.length) {
      const idx = nextIndex++;
      try {
        const value = await fns[idx]();
        results[idx] = { status: 'fulfilled', value };
      } catch (reason) {
        results[idx] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, fns.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Generate engine diagrams for all diagram-type steps in a set of lessons.
 * Uses concurrency limiting (max 2 at a time) to avoid exhausting E2B sandbox
 * limits and Anthropic API rate limits.
 *
 * Mutates the lesson steps in place, adding diagramData where generation succeeds.
 * Returns the count of diagrams generated vs attempted.
 */
export async function generateDiagramsForSteps(
  lessons: Lesson[],
  logPrefix = '[DiagramBatch]',
): Promise<{ generated: number; attempted: number }> {
  // Collect all diagram steps that need generation
  const tasks: DiagramTask[] = [];
  for (let li = 0; li < lessons.length; li++) {
    const lesson = lessons[li];
    if (!lesson.steps) continue;
    for (let si = 0; si < lesson.steps.length; si++) {
      const step = lesson.steps[si];
      if (step.type === 'diagram' && !step.diagramData) {
        tasks.push({ lessonIdx: li, stepIdx: si, description: step.content });
      }
    }
  }

  if (tasks.length === 0) {
    return { generated: 0, attempted: 0 };
  }

  console.log(`${logPrefix} Generating ${tasks.length} engine diagrams (max ${MAX_CONCURRENT_DIAGRAMS} concurrent)`);

  // Run with concurrency limit instead of unbounded Promise.allSettled
  const results = await runWithConcurrency(
    tasks.map(task => () => tryEngineDiagram(task.description)),
    MAX_CONCURRENT_DIAGRAMS,
  );

  let generated = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled' && result.value) {
      const { lessonIdx, stepIdx } = tasks[i];
      lessons[lessonIdx].steps[stepIdx].diagramData = {
        type: 'engine_image',
        data: {
          imageUrl: result.value.imageUrl,
          pipeline: result.value.pipeline,
        },
      };
      generated++;
    } else if (result.status === 'rejected') {
      console.error(`${logPrefix} Diagram ${i} rejected:`, result.reason);
    }
  }

  console.log(`${logPrefix} Generated ${generated}/${tasks.length} diagrams`);
  return { generated, attempted: tasks.length };
}
