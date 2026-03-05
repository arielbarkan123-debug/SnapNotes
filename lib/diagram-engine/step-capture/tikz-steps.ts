/**
 * TikZ Step Capture
 *
 * Parses TikZ code with STEP markers, compiles each cumulative subset
 * via QuickLaTeX, and returns PNG buffers for each step.
 *
 * Reuses existing tikz-layer-parser for parsing. The parser only recognizes
 * LAYER markers, so we normalize STEP→LAYER before parsing. LAYER markers
 * also work as-is (backward compatible).
 */

import { parseTikzLayers, buildCumulativeStep } from '../tikz-layer-parser'
import { compileTikZ } from '../tikz-executor'

const MAX_CONCURRENT = 3

interface TikzStepResult {
  /** PNG buffers for each step (null = compilation failed) */
  buffers: (Buffer | null)[]
}

/**
 * Compile each cumulative TikZ step and return PNG buffers.
 */
export async function captureTikzSteps(tikzCode: string): Promise<TikzStepResult> {
  // Normalize STEP markers to LAYER markers for the parser
  const normalized = tikzCode.replace(
    /^(%\s*===\s*)STEP(\s+\d+)/gm,
    '$1LAYER$2',
  )

  const parsed = parseTikzLayers(normalized)

  // Filter out layer 0 (setup) — it's always included in cumulative builds
  const stepsToRender = parsed.layers.filter(l => l.layerNumber > 0)

  if (stepsToRender.length <= 0) {
    return { buffers: [] }
  }

  // Compile a single cumulative step
  const compileSingleStep = async (
    stepNumber: number,
  ): Promise<Buffer | null> => {
    const stepTikz = buildCumulativeStep(parsed, stepNumber)

    try {
      const result = await compileTikZ(stepTikz)

      if ('error' in result) {
        console.warn(`[TikzSteps] Step ${stepNumber} compile failed:`, result.error.slice(0, 200))
        return null
      }

      // Download the image from QuickLaTeX URL
      const response = await fetch(result.url)
      if (!response.ok) {
        console.warn(`[TikzSteps] Step ${stepNumber} download failed: ${response.status}`)
        return null
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (err) {
      console.error(`[TikzSteps] Step ${stepNumber} error:`, err)
      return null
    }
  }

  // Process in batches of MAX_CONCURRENT
  const buffers: (Buffer | null)[] = []

  for (let i = 0; i < stepsToRender.length; i += MAX_CONCURRENT) {
    const batch = stepsToRender.slice(i, i + MAX_CONCURRENT)
    const batchResults = await Promise.all(
      batch.map(layer => compileSingleStep(layer.layerNumber)),
    )
    buffers.push(...batchResults)
  }

  console.log(`[TikzSteps] Captured ${buffers.filter(Boolean).length}/${stepsToRender.length} steps`)
  return { buffers }
}
