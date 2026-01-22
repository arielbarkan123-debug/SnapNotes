import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import type { ReviewCard } from '@/types'

// =============================================================================
// Types
// =============================================================================

interface CourseCardsResponse {
  total: number
  due: number
  mastered: number
  learning: number
  new: number
  cards: ReviewCard[]
}

// =============================================================================
// GET /api/srs/course/[id] - Get all cards for a specific course
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: courseId } = await params
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view cards')
    }

    // Verify user owns this course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (courseError || !course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    // Get all cards for this course
    const { data: cards, error: cardsError } = await supabase
      .from('review_cards')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .order('lesson_index', { ascending: true })
      .order('step_index', { ascending: true })

    if (cardsError) {
      logError('SRS:course:cards', cardsError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch cards')
    }

    const allCards = cards || []
    const now = new Date().toISOString()

    // Calculate statistics
    const stats = {
      total: allCards.length,
      due: 0,
      mastered: 0,
      learning: 0,
      new: 0,
    }

    for (const card of allCards) {
      switch (card.state) {
        case 'new':
          stats.new++
          break
        case 'learning':
        case 'relearning':
          stats.learning++
          if (card.due_date <= now) stats.due++
          break
        case 'review':
          // Consider "mastered" if stability > 21 days (3 weeks)
          if (card.stability > 21) {
            stats.mastered++
          }
          if (card.due_date <= now) stats.due++
          break
      }
    }

    const response: CourseCardsResponse = {
      ...stats,
      cards: allCards,
    }

    return NextResponse.json(response)

  } catch (error) {
    logError('SRS:course:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch course cards')
  }
}
