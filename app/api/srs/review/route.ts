import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { processReview, FSRS_PARAMS } from '@/lib/srs'
import type { Rating, ReviewCard, SubmitReviewResponse } from '@/types'

// =============================================================================
// Types
// =============================================================================

interface SubmitReviewRequest {
  card_id: string
  rating: Rating
  duration_ms?: number
}

// =============================================================================
// POST /api/srs/review - Submit a card review
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to submit review')
    }

    // Parse request body
    let body: SubmitReviewRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid request body')
    }

    const { card_id, rating, duration_ms } = body

    // Validate required fields
    if (!card_id) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'card_id is required')
    }

    if (!rating || ![1, 2, 3, 4].includes(rating)) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'rating must be 1, 2, 3, or 4')
    }

    // Get the card and verify ownership
    const { data: card, error: cardError } = await supabase
      .from('review_cards')
      .select('*')
      .eq('id', card_id)
      .eq('user_id', user.id)
      .single()

    if (cardError || !card) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Card not found')
    }

    // Get user's target retention setting
    const { data: settings } = await supabase
      .from('user_srs_settings')
      .select('target_retention')
      .eq('user_id', user.id)
      .single()

    const targetRetention = settings?.target_retention ?? FSRS_PARAMS.requestRetention

    // Calculate elapsed days since last review
    const now = new Date()
    const lastReview = card.last_review ? new Date(card.last_review) : now
    const elapsedDays = Math.max(0, (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24))

    // Create card object with elapsed_days for FSRS processing
    const cardForProcessing: ReviewCard = {
      ...card,
      elapsed_days: elapsedDays,
    }

    // Process with FSRS algorithm
    const fsrsOutput = processReview(cardForProcessing, rating as Rating, targetRetention)

    // Prepare update data
    const updateData = {
      stability: fsrsOutput.stability,
      difficulty: fsrsOutput.difficulty,
      due_date: fsrsOutput.due_date.toISOString(),
      scheduled_days: fsrsOutput.scheduled_days,
      state: fsrsOutput.state,
      elapsed_days: 0, // Reset after review
      reps: card.reps + 1,
      lapses: rating === 1 && card.state === 'review' ? card.lapses + 1 : card.lapses,
      last_review: now.toISOString(),
      updated_at: now.toISOString(),
    }

    // Update card in database
    const { error: updateError } = await supabase
      .from('review_cards')
      .update(updateData)
      .eq('id', card_id)
      .eq('user_id', user.id)

    if (updateError) {
      logError('SRS:review:update', updateError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to update card')
    }

    // Create review log entry
    const { error: reviewLogError } = await supabase
      .from('review_logs')
      .insert({
        card_id: card_id,
        user_id: user.id,
        rating: rating,
        review_duration_ms: duration_ms ?? null,
        reviewed_at: now.toISOString(),
      })

    if (reviewLogError) {
      // Log but don't fail - the card update was successful
      console.error('SRS:review:log', reviewLogError)
    }

    const response: SubmitReviewResponse = {
      success: true,
      next_due: fsrsOutput.due_date.toISOString(),
      scheduled_days: fsrsOutput.scheduled_days,
      new_state: fsrsOutput.state,
    }

    return NextResponse.json(response)

  } catch (error) {
    logError('SRS:review:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to submit review')
  }
}
