/**
 * Retry Step API
 *
 * POST /api/homework/walkthrough/[walkthroughId]/retry-step
 *
 * Retries compilation of a single failed walkthrough step.
 * Re-parses the TikZ code, rebuilds highlighted code for the step,
 * recompiles via QuickLaTeX, and returns the new image URL.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { parseTikzLayers, buildCumulativeStepWithHighlight } from '@/lib/diagram-engine/tikz-layer-parser'
import { compileTikZ } from '@/lib/diagram-engine/tikz-executor'
import type { WalkthroughSolution } from '@/types/walkthrough'

const MAX_RETRIES = 2

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ walkthroughId: string }> }
) {
  const { walkthroughId } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse request body
  let stepIndex: number
  try {
    const body = await request.json()
    stepIndex = body.stepIndex
    if (typeof stepIndex !== 'number' || stepIndex < 0) {
      return NextResponse.json({ error: 'Invalid stepIndex' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Fetch walkthrough
  const serviceClient = createServiceClient()
  const { data: walkthrough, error: fetchError } = await serviceClient
    .from('walkthrough_sessions')
    .select('id, user_id, solution, step_images, steps_rendered, total_steps')
    .eq('id', walkthroughId)
    .single()

  if (fetchError || !walkthrough) {
    return NextResponse.json({ error: 'Walkthrough not found' }, { status: 404 })
  }
  if (walkthrough.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const solution = walkthrough.solution as WalkthroughSolution
  if (!solution?.tikzCode || !solution.tikzCode.includes('\\begin{tikzpicture}')) {
    return NextResponse.json({ error: 'No TikZ code available for retry' }, { status: 400 })
  }
  if (stepIndex >= walkthrough.total_steps) {
    return NextResponse.json({ error: 'stepIndex out of range' }, { status: 400 })
  }

  // Parse TikZ layers
  const parsed = parseTikzLayers(solution.tikzCode)
  const numberedLayers = parsed.layers.filter(l => l.layerNumber > 0)

  if (stepIndex >= numberedLayers.length) {
    return NextResponse.json({ error: 'No TikZ layer for this step' }, { status: 400 })
  }

  // Build highlighted TikZ for this step
  const layerNumber = numberedLayers[stepIndex].layerNumber
  const tikzCode = buildCumulativeStepWithHighlight(parsed, layerNumber)

  // Compile with retries
  let imageUrl: string | null = null
  let lastError = ''

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await compileTikZ(tikzCode)
      if ('url' in result) {
        imageUrl = result.url
        break
      }
      lastError = result.error
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error'
    }
  }

  if (!imageUrl) {
    return NextResponse.json({ error: `Compilation failed: ${lastError.slice(0, 200)}` }, { status: 500 })
  }

  // Update DB
  const stepImages = [...(walkthrough.step_images || [])]
  while (stepImages.length <= stepIndex) stepImages.push('')
  stepImages[stepIndex] = imageUrl
  const rendered = stepImages.filter(Boolean).length

  await serviceClient
    .from('walkthrough_sessions')
    .update({
      step_images: stepImages,
      steps_rendered: rendered,
      generation_status: rendered === walkthrough.total_steps ? 'complete' : 'partial',
      updated_at: new Date().toISOString(),
    })
    .eq('id', walkthroughId)

  return NextResponse.json({ imageUrl, stepIndex })
}
