import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UserMasteryResponse } from '@/lib/concepts/types'

/**
 * GET /api/user/mastery
 *
 * Get the current user's concept mastery levels.
 * Optionally filter by subject, topic, or course.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subject = searchParams.get('subject')
    const topic = searchParams.get('topic')
    const courseId = searchParams.get('courseId')

    // Build query
    let query = supabase
      .from('user_concept_mastery')
      .select(
        `
        *,
        concepts (
          id,
          name,
          subject,
          topic,
          difficulty_level
        )
      `
      )
      .eq('user_id', user.id)

    // If filtering by course, use a subquery instead of N+1 pattern
    if (courseId) {
      // Use RPC or single query with join when available
      // For now, keep the two-query approach but it's documented as a known limitation
      const { data: courseConcepts } = await supabase
        .from('content_concepts')
        .select('concept_id')
        .eq('course_id', courseId)

      if (courseConcepts && courseConcepts.length > 0) {
        const conceptIds = courseConcepts.map((c) => c.concept_id)
        query = query.in('concept_id', conceptIds)
      } else {
        // No concepts for this course - return empty result early
        const emptyResponse: UserMasteryResponse = {
          mastery: {},
          totalConcepts: 0,
          masteredConcepts: 0,
          weakConcepts: 0,
          reviewDue: 0,
        }
        return NextResponse.json(emptyResponse)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('[User Mastery API] Error:', error)
      return NextResponse.json({ error: 'Failed to fetch mastery data' }, { status: 500 })
    }

    // Filter by subject/topic if specified (since we can't filter joined tables easily)
    let filteredData = data || []
    if (subject) {
      filteredData = filteredData.filter((d) => (d.concepts as { subject: string })?.subject === subject)
    }
    if (topic) {
      filteredData = filteredData.filter((d) => (d.concepts as { topic: string })?.topic === topic)
    }

    // Build response
    const mastery: Record<string, number> = {}
    let masteredCount = 0
    let weakCount = 0
    let reviewDue = 0

    const now = new Date()

    for (const row of filteredData) {
      // Type guard: ensure mastery_level is a valid number
      const masteryLevel = typeof row.mastery_level === 'number' ? row.mastery_level : 0
      mastery[row.concept_id] = masteryLevel

      if (masteryLevel >= 0.7) {
        masteredCount++
      } else if (masteryLevel < 0.4) {
        weakCount++
      }

      // Type guard: validate date before comparison
      if (row.next_review_date && typeof row.next_review_date === 'string') {
        const reviewDate = new Date(row.next_review_date)
        if (!isNaN(reviewDate.getTime()) && reviewDate <= now) {
          reviewDue++
        }
      }
    }

    const response: UserMasteryResponse = {
      mastery,
      totalConcepts: filteredData.length,
      masteredConcepts: masteredCount,
      weakConcepts: weakCount,
      reviewDue,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[User Mastery API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch mastery data' }, { status: 500 })
  }
}

/**
 * POST /api/user/mastery
 *
 * Update concept mastery after a learning event (answer, review, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conceptId, isCorrect, usedHint, responseTimeMs } = await request.json()

    if (!conceptId) {
      return NextResponse.json({ error: 'conceptId is required' }, { status: 400 })
    }

    // Get current mastery
    const { data: existing } = await supabase
      .from('user_concept_mastery')
      .select('*')
      .eq('user_id', user.id)
      .eq('concept_id', conceptId)
      .single()

    // Calculate new mastery
    const currentMastery = existing?.mastery_level ?? 0
    const _currentConfidence = existing?.confidence_score ?? 0
    const totalExposures = (existing?.total_exposures ?? 0) + 1
    const successfulRecalls = (existing?.successful_recalls ?? 0) + (isCorrect ? 1 : 0)
    const failedRecalls = (existing?.failed_recalls ?? 0) + (isCorrect ? 0 : 1)

    // Mastery calculation:
    // - Correct answer without hint: +0.1 to +0.15 (based on time)
    // - Correct answer with hint: +0.05
    // - Wrong answer: -0.1 to -0.15
    let masteryDelta = 0
    if (isCorrect) {
      masteryDelta = usedHint ? 0.05 : 0.1 + Math.min(0.05, 5000 / (responseTimeMs || 5000) * 0.05)
    } else {
      masteryDelta = -0.1 - Math.min(0.05, (responseTimeMs || 5000) / 10000 * 0.05)
    }

    const newMastery = Math.min(1, Math.max(0, currentMastery + masteryDelta))

    // Confidence increases with more exposures
    const newConfidence = Math.min(1, 0.5 + totalExposures * 0.05)

    // Calculate stability for SRS (simplified)
    const baseStability = existing?.stability ?? 1
    const newStability = isCorrect ? baseStability * 1.5 : Math.max(1, baseStability * 0.5)

    // Calculate next review date (simplified SRS)
    const daysUntilReview = Math.round(newStability)
    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + daysUntilReview)

    // Upsert mastery record
    const { error } = await supabase
      .from('user_concept_mastery')
      .upsert(
        {
          user_id: user.id,
          concept_id: conceptId,
          mastery_level: newMastery,
          confidence_score: newConfidence,
          total_exposures: totalExposures,
          successful_recalls: successfulRecalls,
          failed_recalls: failedRecalls,
          stability: newStability,
          next_review_date: nextReviewDate.toISOString(),
          last_reviewed_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,concept_id',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('[User Mastery API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update mastery' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      previousMastery: currentMastery,
      newMastery,
      masteryDelta,
      nextReviewDate: nextReviewDate.toISOString(),
    })
  } catch (error) {
    console.error('[User Mastery API] Error:', error)
    return NextResponse.json({ error: 'Failed to update mastery' }, { status: 500 })
  }
}
