import { type NextRequest, NextResponse } from 'next/server'
import { generateDiagram, type Pipeline } from '@/lib/diagram-engine'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:diagram-generate')

export const maxDuration = 120 // E2B sandboxes + QA can take time

export async function POST(request: NextRequest) {
  try {
    // Authenticate — this endpoint uses E2B sandboxes + Recraft AI (costs money)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const body = await request.json()
    const { question, pipeline } = body as {
      question?: string
      pipeline?: Pipeline
    }

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "question" field' },
        { status: 400 }
      )
    }

    const validPipelines: Pipeline[] = ['e2b-latex', 'e2b-matplotlib', 'tikz', 'recraft']
    if (pipeline && !validPipelines.includes(pipeline)) {
      return NextResponse.json(
        { error: `Invalid pipeline. Must be one of: ${validPipelines.join(', ')}` },
        { status: 400 }
      )
    }

    const result = await generateDiagram(question.trim(), pipeline)

    if ('error' in result) {
      return NextResponse.json(
        {
          error: result.error,
          pipeline: result.pipeline,
          code: result.code,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      imageUrl: result.imageUrl,
      pipeline: result.pipeline,
      attempts: result.attempts,
      qaVerdict: result.qaVerdict,
      overlay: result.overlay,
    })
  } catch (err) {
    log.error({ err: err }, 'Unexpected error')
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
