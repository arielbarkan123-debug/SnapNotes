import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

interface LessonMastery {
  lessonIndex: number
  conceptCount: number
  masteredCount: number
  averageMastery: number
  hasGaps: boolean
  criticalGaps: number
}

interface CourseMasteryResponse {
  courseId: string
  overallMastery: number
  lessonMastery: LessonMastery[]
  totalConcepts: number
  masteredConcepts: number
}

/**
 * GET /api/courses/[id]/mastery
 *
 * Get concept mastery data for a course, broken down by lesson.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Verify course belongs to user
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (courseError || !course) {
      return createErrorResponse(ErrorCodes.COURSE_NOT_FOUND)
    }

    // Get content-concept mappings for this course
    const { data: contentConcepts } = await supabase
      .from('content_concepts')
      .select('lesson_index, concept_id')
      .eq('course_id', courseId)

    if (!contentConcepts || contentConcepts.length === 0) {
      // No concepts mapped yet
      return NextResponse.json<CourseMasteryResponse>({
        courseId,
        overallMastery: 0,
        lessonMastery: [],
        totalConcepts: 0,
        masteredConcepts: 0,
      })
    }

    // Get unique concept IDs
    const conceptIds = [...new Set(contentConcepts.map(cc => cc.concept_id))]

    // Get user mastery for these concepts
    const { data: userMastery } = await supabase
      .from('user_concept_mastery')
      .select('concept_id, mastery_level')
      .eq('user_id', user.id)
      .in('concept_id', conceptIds)

    // Build mastery lookup
    const masteryMap = new Map<string, number>()
    for (const m of userMastery || []) {
      masteryMap.set(m.concept_id, m.mastery_level)
    }

    // Get gaps for these concepts
    const { data: gaps } = await supabase
      .from('user_knowledge_gaps')
      .select('concept_id, severity')
      .eq('user_id', user.id)
      .eq('resolved', false)
      .in('concept_id', conceptIds)

    // Build gaps lookup
    const gapsMap = new Map<string, string>()
    for (const g of gaps || []) {
      gapsMap.set(g.concept_id, g.severity)
    }

    // Group concepts by lesson
    const lessonConceptsMap = new Map<number, string[]>()
    for (const cc of contentConcepts) {
      if (!lessonConceptsMap.has(cc.lesson_index)) {
        lessonConceptsMap.set(cc.lesson_index, [])
      }
      lessonConceptsMap.get(cc.lesson_index)!.push(cc.concept_id)
    }

    // Calculate per-lesson mastery
    const lessonMastery: LessonMastery[] = []
    let totalMastery = 0
    let masteredCount = 0

    for (const [lessonIndex, lessonConceptIds] of lessonConceptsMap) {
      const uniqueConcepts = [...new Set(lessonConceptIds)]
      let lessonMasterySum = 0
      let lessonMasteredCount = 0
      let lessonCriticalGaps = 0
      let lessonHasGaps = false

      for (const conceptId of uniqueConcepts) {
        const mastery = masteryMap.get(conceptId) ?? 0
        lessonMasterySum += mastery

        if (mastery >= 0.7) {
          lessonMasteredCount++
        }

        // Check for gaps
        const gapSeverity = gapsMap.get(conceptId)
        if (gapSeverity) {
          lessonHasGaps = true
          if (gapSeverity === 'critical') {
            lessonCriticalGaps++
          }
        }
      }

      const avgMastery = uniqueConcepts.length > 0
        ? lessonMasterySum / uniqueConcepts.length
        : 0

      lessonMastery.push({
        lessonIndex,
        conceptCount: uniqueConcepts.length,
        masteredCount: lessonMasteredCount,
        averageMastery: Math.round(avgMastery * 100) / 100,
        hasGaps: lessonHasGaps,
        criticalGaps: lessonCriticalGaps,
      })

      totalMastery += avgMastery
      masteredCount += lessonMasteredCount
    }

    // Sort by lesson index
    lessonMastery.sort((a, b) => a.lessonIndex - b.lessonIndex)

    // Calculate overall mastery
    const overallMastery = lessonMastery.length > 0
      ? Math.round((totalMastery / lessonMastery.length) * 100) / 100
      : 0

    return NextResponse.json<CourseMasteryResponse>({
      courseId,
      overallMastery,
      lessonMastery,
      totalConcepts: conceptIds.length,
      masteredConcepts: masteredCount,
    })
  } catch (error) {
    console.error('[Course Mastery API] Error:', error)
    return createErrorResponse(ErrorCodes.MASTERY_FETCH_FAILED)
  }
}
