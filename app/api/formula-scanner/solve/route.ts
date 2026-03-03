import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'
import { solveFormula } from '@/lib/formula-scanner/solver'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Parse request body safely
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body')
    }

    // Validate inputs
    const { latex, context } = body as { latex?: unknown; context?: unknown }

    if (!latex || typeof latex !== 'string') {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'latex is required and must be a string')
    }

    if (context !== undefined && typeof context !== 'string') {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'context must be a string')
    }

    // Truncate inputs to safe limits
    const safeLatex = latex.slice(0, 500)
    const safeContext = typeof context === 'string' ? context.slice(0, 1000) : undefined

    // Solve
    const solution = await solveFormula(safeLatex, safeContext)

    return NextResponse.json({
      success: true,
      solution,
    })
  } catch (error) {
    console.error('[FormulaSolver] Error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to solve formula. Please try again.')
  }
}
