import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'
import { analyzeFormulaFromText, analyzeFormulaFromImage } from '@/lib/formula-scanner/analyzer'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Parse request
    const body = await request.json()
    const { imageUrl, latexText } = body as {
      imageUrl?: string
      latexText?: string
    }

    if (!imageUrl && !latexText) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Either imageUrl or latexText is required')
    }

    // Analyze
    let analysis

    if (latexText) {
      analysis = await analyzeFormulaFromText(latexText)
    } else if (imageUrl) {
      analysis = await analyzeFormulaFromImage(imageUrl)
    }

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error) {
    console.error('[FormulaScanner] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to analyze formula'
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, message)
  }
}
