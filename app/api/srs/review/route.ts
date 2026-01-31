import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { checkRateLimit, RATE_LIMITS, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit'
import { processReview, FSRS_PARAMS } from '@/lib/srs'
import type { Rating, ReviewCard, SubmitReviewResponse } from '@/types'

// =============================================================================
// Types
// =============================================================================

interface SubmitReviewRequest {
  card_id: string
  rating: Rating
  duration_ms?: number
  difficulty_feedback?: 'too_easy' | 'too_hard'
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

    // Rate limiting
    const rateLimitResult = checkRateLimit(
      getIdentifier(user.id, request),
      RATE_LIMITS.evaluateAnswer
    )
    if (!rateLimitResult.allowed) {
      const response = createErrorResponse(ErrorCodes.RATE_LIMITED)
      const headers = getRateLimitHeaders(rateLimitResult)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // Parse request body
    let body: SubmitReviewRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid request body')
    }

    const { card_id, rating, duration_ms } = body
    const difficulty_feedback = body.difficulty_feedback

    // Validate required fields
    if (!card_id) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'card_id is required')
    }

    if (rating && ![1, 2, 3, 4].includes(rating)) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'rating must be 1, 2, 3, or 4')
    }

    // Must have either rating or difficulty_feedback
    if (!rating && !difficulty_feedback) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'rating or difficulty_feedback is required')
    }

    // Handle feedback-only requests (no rating)
    if (!rating) {
      // Log the feedback
      const { error: reviewLogError } = await supabase
        .from('review_logs')
        .insert({
          card_id: card_id,
          user_id: user.id,
          rating: null,
          difficulty_feedback: difficulty_feedback ?? null,
          review_duration_ms: duration_ms ?? null,
          reviewed_at: new Date().toISOString(),
        })

      if (reviewLogError) {
        console.error('SRS:review:log', reviewLogError)
      }

      // Adjust difficulty based on user feedback
      if (difficulty_feedback) {
        const adjustment = difficulty_feedback === 'too_easy' ? 0.5 : -0.5
        const floorAdjustment = difficulty_feedback === 'too_easy' ? 0.25 : -0.25

        // Get current performance state
        const { data: perfState } = await supabase
          .from('user_performance_state')
          .select('target_difficulty, difficulty_floor')
          .eq('user_id', user.id)
          .maybeSingle()

        if (perfState) {
          const currentFloor = perfState.difficulty_floor || 1.0
          const newTarget = Math.max(currentFloor, Math.min(5, perfState.target_difficulty + adjustment))
          const newFloor = Math.max(1.0, Math.min(3.0, currentFloor + floorAdjustment))

          await supabase
            .from('user_performance_state')
            .update({
              target_difficulty: newTarget,
              difficulty_floor: newFloor,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
        }
      }

      return NextResponse.json({ success: true, feedback_recorded: true })
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
        difficulty_feedback: difficulty_feedback ?? null,
        review_duration_ms: duration_ms ?? null,
        reviewed_at: now.toISOString(),
      })

    if (reviewLogError) {
      // Log but don't fail - the card update was successful
      console.error('SRS:review:log', reviewLogError)
    }

    // Adjust difficulty based on user feedback
    if (difficulty_feedback) {
      const adjustment = difficulty_feedback === 'too_easy' ? 0.5 : -0.5
      const floorAdjustment = difficulty_feedback === 'too_easy' ? 0.25 : -0.25

      // Get current performance state
      const { data: perfState } = await supabase
        .from('user_performance_state')
        .select('target_difficulty, difficulty_floor')
        .eq('user_id', user.id)
        .maybeSingle()

      if (perfState) {
        const currentFloor = perfState.difficulty_floor || 1.0
        const newTarget = Math.max(currentFloor, Math.min(5, perfState.target_difficulty + adjustment))
        const newFloor = Math.max(1.0, Math.min(3.0, currentFloor + floorAdjustment))

        await supabase
          .from('user_performance_state')
          .update({
            target_difficulty: newTarget,
            difficulty_floor: newFloor,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
      }
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
 *
 * Uses optimistic locking with retry to prevent race conditions
 * when multiple reviews happen simultaneously for the same concept
 */
async function updateConceptMastery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conceptIds: string[],
  isCorrect: boolean,
  reviewedAt: Date
): Promise<void> {
  const MAX_RETRIES = 3

  try {
    // Process each concept
    for (const conceptId of conceptIds) {
      let retries = 0
      let success = false

      while (retries < MAX_RETRIES && !success) {
        // Get current mastery record
        const { data: existing } = await supabase
          .from('user_concept_mastery')
          .select('mastery_level, peak_mastery, total_exposures, successful_recalls')
          .eq('user_id', userId)
          .eq('concept_id', conceptId)
          .maybeSingle()

        if (existing) {
          // Update existing mastery with optimistic locking
          // Use total_exposures as version to detect concurrent updates
          const expectedExposures = existing.total_exposures
          const masteryChange = isCorrect ? 0.05 : -0.1
          const newMastery = Math.min(1.0, Math.max(0, existing.mastery_level + masteryChange))
          const newPeakMastery = Math.max(existing.peak_mastery || 0, newMastery)

          const { data: updateResult, error: updateError } = await supabase
            .from('user_concept_mastery')
            .update({
              mastery_level: newMastery,
              peak_mastery: newPeakMastery,
              total_exposures: expectedExposures + 1,
              successful_recalls: existing.successful_recalls + (isCorrect ? 1 : 0),
              last_reviewed_at: reviewedAt.toISOString(),
            })
            .eq('user_id', userId)
            .eq('concept_id', conceptId)
            .eq('total_exposures', expectedExposures) // Optimistic lock check
            .select('mastery_level')
            .maybeSingle()

          if (updateError) {
            retries++
            continue
          }

          // If no rows were updated, it means another request updated it first - retry
          if (!updateResult) {
            retries++
            continue
          }

          success = true

          // Check if this resolves any knowledge gaps
          if (isCorrect && updateResult.mastery_level >= 0.5) {
            await supabase
              .from('user_knowledge_gaps')
              .update({ resolved: true })
              .eq('user_id', userId)
              .eq('concept_id', conceptId)
              .eq('resolved', false)
          }
        } else {
          // Create new mastery record (use upsert to handle race on insert)
          const initialMastery = isCorrect ? 0.3 : 0.1
          const { error: insertError } = await supabase
            .from('user_concept_mastery')
            .upsert({
              user_id: userId,
              concept_id: conceptId,
              mastery_level: initialMastery,
              peak_mastery: initialMastery,
              total_exposures: 1,
              successful_recalls: isCorrect ? 1 : 0,
              last_reviewed_at: reviewedAt.toISOString(),
            }, {
              onConflict: 'user_id,concept_id',
              ignoreDuplicates: false,
            })

          if (insertError) {
            // Conflict on insert means another request created it - retry to update
            retries++
            continue
          }

          success = true
        }
      }

      if (!success) {
        console.error(`Failed to update concept mastery after ${MAX_RETRIES} retries:`, conceptId)
      }
    }
  } catch (error) {
    // Log but don't fail the review
    console.error('Failed to update concept mastery:', error)
  }
}
