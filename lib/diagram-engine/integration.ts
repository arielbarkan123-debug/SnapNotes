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
 */

import { generateDiagram, type Pipeline } from './index';
import { shouldUseEngine } from './tiered-router';

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
  // If no forced pipeline, check if the engine should handle this
  if (!forcePipeline && !shouldUseEngine(question)) {
    return undefined;
  }

  try {
    const result = await generateDiagram(question, forcePipeline);

    if ('error' in result) {
      console.error(`[Engine] Generation failed: ${result.error}`);
      return undefined; // Fall back to React components
    }

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
