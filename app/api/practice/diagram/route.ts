import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tryEngineDiagram, shouldUseEngine } from '@/lib/diagram-engine/integration'

/**
 * Lightweight endpoint to generate a single diagram for a practice question.
 * Called on-demand as each question is displayed (not batch).
 *
 * POST /api/practice/diagram
 * Body: { question: string }
 * Returns: { imageUrl: string, pipeline: string } or { error: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { question } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'question is required' },
        { status: 400 }
      )
    }

    // Quick check: does the engine think this question needs a diagram?
    if (!shouldUseEngine(question)) {
      return NextResponse.json({ skip: true, reason: 'not_visual' })
    }

    const result = await tryEngineDiagram(question)

    if (!result) {
      return NextResponse.json({ skip: true, reason: 'generation_failed' })
    }

    return NextResponse.json({
      imageUrl: result.imageUrl,
      pipeline: result.pipeline,
    })
  } catch (error) {
    console.error('[Practice Diagram] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
