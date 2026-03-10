/**
 * POST /api/diagrams/render-steps
 *
 * On-demand rendering of step-by-step diagram images.
 * Takes a StepByStepSource, parses layers, renders each cumulative step
 * via QuickLaTeX, and returns image URLs.
 *
 * Called when user clicks "Step by Step" button on a diagram.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderStepByStep, validateStepByStepSource } from '@/lib/diagram-engine/step-renderer'
import type { StepByStepSource } from '@/components/homework/diagram/types'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:render-steps')

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stepByStepSource } = body as { stepByStepSource: StepByStepSource }

    // Validate input
    if (!validateStepByStepSource(stepByStepSource)) {
      return NextResponse.json(
        { error: 'Invalid stepByStepSource structure' },
        { status: 400 },
      )
    }

    // Guard against oversized payloads (TikZ code + metadata)
    if (stepByStepSource.tikzCode.length > 50_000) {
      return NextResponse.json(
        { error: 'TikZ code exceeds maximum allowed size' },
        { status: 413 },
      )
    }

    // Guard against too many steps (plan specifies 3-6 layers; allow up to 10)
    if (stepByStepSource.steps.length > 10) {
      return NextResponse.json(
        { error: 'Too many steps (maximum 10)' },
        { status: 400 },
      )
    }

    log.info({ steps: stepByStepSource.steps.length, userId: user.id }, 'Rendering steps')

    // Render all steps
    const result = await renderStepByStep(stepByStepSource)

    log.info({ rendered: result.stepImageUrls.filter(Boolean).length, total: stepByStepSource.steps.length }, 'Rendering done')

    return NextResponse.json({
      stepImageUrls: result.stepImageUrls,
      partial: result.partial,
      errors: result.errors,
      steps: stepByStepSource.steps, // Echo back step metadata for frontend
    })
  } catch (err) {
    log.error({ err }, 'Render steps error')
    return NextResponse.json(
      { error: 'Failed to render step-by-step diagram' },
      { status: 500 },
    )
  }
}
