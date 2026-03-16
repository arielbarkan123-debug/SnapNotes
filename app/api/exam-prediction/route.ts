import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'
import { predictExamTopics, type ExamAnalysis } from '@/lib/exam-prediction/predictor'
import { createLogger } from '@/lib/logger'
import { getContentLanguage } from '@/lib/ai/language'

const log = createLogger('api:exam-prediction')

export const maxDuration = 60

// POST: Generate prediction from exam template IDs
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const language = await getContentLanguage(supabase, user.id)

    const body = await request.json()
    const { examTemplateIds } = body as { examTemplateIds?: string[] }

    if (!examTemplateIds || !Array.isArray(examTemplateIds) || examTemplateIds.length < 3) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'At least 3 exam template IDs required')
    }

    // Fetch exam templates with their analysis
    const { data: templates, error } = await supabase
      .from('past_exam_templates')
      .select('id, title, subject, analysis')
      .in('id', examTemplateIds)
      .eq('user_id', user.id)

    if (error || !templates) {
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch exam templates')
    }

    if (templates.length < 3) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, `Only ${templates.length} valid templates found. Need at least 3.`)
    }

    // Convert to ExamAnalysis format
    const analyses: ExamAnalysis[] = templates.map(t => {
      const analysis = t.analysis as Record<string, unknown> | null
      return {
        id: t.id,
        title: t.title || 'Untitled Exam',
        subject: t.subject || (analysis?.subject as string) || 'General',
        topics: (analysis?.topics as string[]) || [],
        difficulty: (analysis?.difficulty as string) || 'medium',
        questionTypes: (analysis?.questionTypes as string[]) || [],
        totalPoints: (analysis?.totalPoints as number) || 100,
      }
    })

    const prediction = await predictExamTopics(analyses, language)

    return NextResponse.json({
      success: true,
      prediction,
    })
  } catch (error) {
    log.error({ err: error }, 'Error')
    const message = error instanceof Error ? error.message : 'Failed to generate prediction'
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, message)
  }
}
