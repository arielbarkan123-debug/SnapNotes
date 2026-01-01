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

    // Update concept mastery if card has linked concepts
    if (card.concept_ids && card.concept_ids.length > 0) {
      const isCorrect = rating >= 3 // Good or Easy
      await updateConceptMastery(supabase, user.id, card.concept_ids, isCorrect, now)
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

// =============================================================================
// Concept Mastery Update Helper
// =============================================================================

/**
 * Update concept mastery based on card review result
 *
 * Mastery calculation:
 * - Correct (rating >= 3): +0.05 mastery, capped at 1.0
 * - Incorrect (rating < 3): -0.1 mastery, floored at 0
 *
 * Also tracks peak mastery for decay detection
 */
async function updateConceptMastery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conceptIds: string[],
  isCorrect: boolean,
  reviewedAt: Date
): Promise<void> {
  try {
    // Process each concept
    for (const conceptId of conceptIds) {
      // Get current mastery record
      const { data: existing } = await supabase
        .from('user_concept_mastery')
        .select('mastery_level, peak_mastery, total_exposures, successful_recalls')
        .eq('user_id', userId)
        .eq('concept_id', conceptId)
        .single()

      if (existing) {
        // Update existing mastery
        const masteryChange = isCorrect ? 0.05 : -0.1
        const newMastery = Math.min(1.0, Math.max(0, existing.mastery_level + masteryChange))
        const newPeakMastery = Math.max(existing.peak_mastery || 0, newMastery)

        await supabase
          .from('user_concept_mastery')
          .update({
            mastery_level: newMastery,
            peak_mastery: newPeakMastery,
            total_exposures: existing.total_exposures + 1,
            successful_recalls: existing.successful_recalls + (isCorrect ? 1 : 0),
            last_reviewed_at: reviewedAt.toISOString(),
          })
          .eq('user_id', userId)
          .eq('concept_id', conceptId)
      } else {
        // Create new mastery record
        const initialMastery = isCorrect ? 0.3 : 0.1
        await supabase
          .from('user_concept_mastery')
          .insert({
            user_id: userId,
            concept_id: conceptId,
            mastery_level: initialMastery,
            peak_mastery: initialMastery,
            total_exposures: 1,
            successful_recalls: isCorrect ? 1 : 0,
            last_reviewed_at: reviewedAt.toISOString(),
          })
      }

      // Check if this resolves any knowledge gaps
      if (isCorrect) {
        // Get current mastery after update
        const { data: updatedMastery } = await supabase
          .from('user_concept_mastery')
          .select('mastery_level')
          .eq('user_id', userId)
          .eq('concept_id', conceptId)
          .single()

        // If mastery is now above 0.5, mark related gaps as resolved
        if (updatedMastery && updatedMastery.mastery_level >= 0.5) {
          await supabase
            .from('user_knowledge_gaps')
            .update({ resolved: true })
            .eq('user_id', userId)
            .eq('concept_id', conceptId)
            .eq('resolved', false)
        }
      }
    }
  } catch (error) {
    // Log but don't fail the review
    console.error('Failed to update concept mastery:', error)
  }
}
