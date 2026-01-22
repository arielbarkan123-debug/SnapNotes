import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  detectKnowledgeGaps,
  enrichGapsWithAI,
  storeGaps,
  getUnresolvedGaps,
  checkPrerequisitesForLesson,
  resolveGap,
} from '@/lib/concepts'
import type { UserGapsResponse } from '@/lib/concepts/types'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

/**
 * GET /api/user/gaps
 *
 * Get the current user's knowledge gaps.
 * Optionally run detection for a specific course/lesson.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const lessonIndex = searchParams.get('lessonIndex')
    const detect = searchParams.get('detect') === 'true'

    // If detect=true, run gap detection first
    if (detect && courseId) {
      // Verify user owns this course before running detection
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('user_id', user.id)
        .single()

      if (!course) {
        return createErrorResponse(ErrorCodes.COURSE_NOT_FOUND)
      }

      const lessonIdx = lessonIndex ? parseInt(lessonIndex, 10) : undefined

      let result
      if (lessonIdx !== undefined) {
        // Check prerequisites for a specific lesson
        result = await checkPrerequisitesForLesson(user.id, courseId, lessonIdx)
      } else {
        // Detect gaps for entire course
        result = await detectKnowledgeGaps({
          userId: user.id,
          courseId,
        })
      }

      // Enrich with AI explanations if there are gaps
      if (result.gaps.length > 0) {
        const enrichedGaps = await enrichGapsWithAI(result.gaps)
        await storeGaps(user.id, enrichedGaps, courseId, lessonIdx)
      }
    }

    // Get all unresolved gaps
    const gaps = await getUnresolvedGaps(user.id)

    // Get concept details for each gap
    const conceptIds = gaps.map((g) => g.concept_id)
    const { data: concepts } = await supabase
      .from('concepts')
      .select('*')
      .in('id', conceptIds)

    const conceptMap = new Map(concepts?.map((c) => [c.id, c]) || [])

    // Build response
    const gapsWithConcepts = gaps.map((gap) => ({
      ...gap,
      concept: conceptMap.get(gap.concept_id),
    }))

    const criticalGaps = gaps.filter((g) => g.severity === 'critical').length

    // Get recently resolved gaps (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentlyResolved } = await supabase
      .from('user_knowledge_gaps')
      .select('id')
      .eq('user_id', user.id)
      .eq('resolved', true)
      .gte('resolved_at', sevenDaysAgo.toISOString())

    const response: UserGapsResponse = {
      gaps: gapsWithConcepts,
      totalGaps: gaps.length,
      criticalGaps,
      resolvedRecently: recentlyResolved?.length || 0,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[User Gaps API] Error:', error)
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
  }
}

/**
 * POST /api/user/gaps
 *
 * Run gap detection with specific parameters.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { courseId, lessonIndex, targetConcepts, recentPerformance } = await request.json()

    // Run gap detection
    const result = await detectKnowledgeGaps({
      userId: user.id,
      courseId,
      lessonIndex,
      targetConcepts,
      recentPerformance,
    })

    // Enrich with AI if there are gaps
    if (result.gaps.length > 0) {
      const enrichedGaps = await enrichGapsWithAI(result.gaps)
      result.gaps = enrichedGaps

      // Store the gaps
      await storeGaps(user.id, enrichedGaps, courseId, lessonIndex)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[User Gaps API] Detection error:', error)
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN, 'Gap detection failed')
  }
}

/**
 * PATCH /api/user/gaps
 *
 * Mark a gap as resolved.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { gapId } = await request.json()

    if (!gapId) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'gapId is required')
    }

    // Verify the gap belongs to this user
    const { data: gap } = await supabase
      .from('user_knowledge_gaps')
      .select('user_id')
      .eq('id', gapId)
      .single()

    if (!gap || gap.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.RECORD_NOT_FOUND, 'Gap not found')
    }

    await resolveGap(gapId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[User Gaps API] Resolve error:', error)
    return createErrorResponse(ErrorCodes.UPDATE_FAILED, 'Failed to resolve gap')
  }
}
