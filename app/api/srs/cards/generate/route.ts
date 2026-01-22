import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { generateCardsFromCourse } from '@/lib/srs'
import type { ReviewCardInsert } from '@/types'

// =============================================================================
// Types
// =============================================================================

interface GenerateCardsRequest {
  course_id: string
}

interface GenerateCardsResponse {
  success: boolean
  created: number
  skipped: number
  message: string
}

// =============================================================================
// POST /api/srs/cards/generate - Generate cards from a course
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to generate cards')
    }

    // Parse request body
    let body: GenerateCardsRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid request body')
    }

    const { course_id } = body

    if (!course_id) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'course_id is required')
    }

    // Get the course and verify ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, generated_course, user_id')
      .eq('id', course_id)
      .eq('user_id', user.id)
      .single()

    if (courseError || !course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    // Check if cards already exist for this course
    const { count: existingCount } = await supabase
      .from('review_cards')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', course_id)
      .eq('user_id', user.id)

    if (existingCount && existingCount > 0) {
      const response: GenerateCardsResponse = {
        success: true,
        created: 0,
        skipped: existingCount,
        message: `Cards already exist for this course (${existingCount} cards)`,
      }
      return NextResponse.json(response)
    }

    // Generate cards from course content
    const generatedCards = generateCardsFromCourse(
      course.generated_course,
      course_id
    )

    if (generatedCards.length === 0) {
      const response: GenerateCardsResponse = {
        success: true,
        created: 0,
        skipped: 0,
        message: 'No reviewable content found in this course',
      }
      return NextResponse.json(response)
    }

    // Add user_id and default FSRS values to each card
    const now = new Date().toISOString()
    const cardsToInsert = generatedCards.map((card: ReviewCardInsert) => ({
      ...card,
      user_id: user.id,
      // FSRS default values for new cards
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: 'new',
      due_date: now,
      last_review: null,
    }))

    // Insert cards into database
    const { data: insertedCards, error: insertError } = await supabase
      .from('review_cards')
      .insert(cardsToInsert)
      .select('id')

    if (insertError) {
      logError('SRS:generate:insert', insertError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to create cards')
    }

    const response: GenerateCardsResponse = {
      success: true,
      created: insertedCards?.length || 0,
      skipped: 0,
      message: `Successfully created ${insertedCards?.length || 0} review cards`,
    }

    return NextResponse.json(response)

  } catch (error) {
    logError('SRS:generate:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate cards')
  }
}
