/**
 * Step-by-Step Renderer
 *
 * Takes a StepByStepSource (layered TikZ + step metadata),
 * parses the layers, and renders each cumulative step via QuickLaTeX.
 * Includes retry logic and graceful fallback.
 */

import { parseTikzLayers, buildCumulativeStep } from './tikz-layer-parser'
import { compileTikZ } from './tikz-executor'
import type { StepByStepSource, StepRenderResult } from '@/components/homework/diagram/types'

const MAX_RETRIES = 2
const MAX_CONCURRENT_RENDERS = 3

/**
 * Render a single cumulative step with retry logic.
 */
async function renderSingleStep(
  tikzCode: string,
  stepIndex: number,
): Promise<{ url: string | null; error?: string }> {
  let lastError = ''

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await compileTikZ(tikzCode)

      if ('url' in result) {
        return { url: result.url }
      }

      lastError = result.error
      console.warn(
        `[StepRenderer] Step ${stepIndex + 1} compile attempt ${attempt + 1} failed:`,
        result.error.slice(0, 200),
      )
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[StepRenderer] Step ${stepIndex + 1} unexpected error:`, err)
    }
  }

  return { url: null, error: lastError }
}

/**
 * Render all steps of a step-by-step diagram.
 *
 * 1. Parses layered TikZ into structured layers
 * 2. Builds cumulative TikZ code for each step
 * 3. Renders each via QuickLaTeX with retry logic
 * 4. Returns image URLs + partial flag
 */
export async function renderStepByStep(
  source: StepByStepSource,
): Promise<StepRenderResult> {
  console.log(`[StepRenderer] Rendering ${source.steps.length} steps...`)

  const parsed = parseTikzLayers(source.tikzCode)

  if (parsed.layers.length === 0) {
    console.error('[StepRenderer] No layers found in TikZ code')
    return { stepImageUrls: [], partial: true, errors: { 0: 'No layers found in TikZ code' } }
  }

  const stepTikzCodes = source.steps.map((step) =>
    buildCumulativeStep(parsed, step.layer),
  )

  const stepImageUrls: string[] = []
  const errors: Record<number, string> = {}
  let hasFailures = false

  // Process in batches of MAX_CONCURRENT_RENDERS
  for (let i = 0; i < stepTikzCodes.length; i += MAX_CONCURRENT_RENDERS) {
    const batch = stepTikzCodes.slice(i, i + MAX_CONCURRENT_RENDERS)
    const batchResults = await Promise.all(
      batch.map((tikz, batchIdx) => renderSingleStep(tikz, i + batchIdx)),
    )

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j]
      if (result.url) {
        stepImageUrls.push(result.url)
      } else {
        hasFailures = true
        stepImageUrls.push('') // Placeholder for failed step
        errors[i + j] = result.error || 'Render failed'
      }
    }
  }

  const successCount = stepImageUrls.filter(Boolean).length
  console.log(`[StepRenderer] Done: ${successCount}/${source.steps.length} steps rendered`)

  return {
    stepImageUrls,
    partial: hasFailures,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  }
}

/**
 * Validate that a StepByStepSource has valid structure.
 */
export function validateStepByStepSource(source: unknown): source is StepByStepSource {
  if (!source || typeof source !== 'object') return false
  const s = source as Record<string, unknown>
  if (typeof s.tikzCode !== 'string') return false
  if (!s.tikzCode.includes('\\begin{tikzpicture}')) return false
  if (!Array.isArray(s.steps)) return false
  if (s.steps.length === 0) return false
  for (const step of s.steps as unknown[]) {
    if (!step || typeof step !== 'object') return false
    const st = step as Record<string, unknown>
    if (typeof st.layer !== 'number') return false
    if (typeof st.label !== 'string') return false
    if (typeof st.labelHe !== 'string') return false
    if (typeof st.explanation !== 'string') return false
    if (typeof st.explanationHe !== 'string') return false
  }
  return true
}
