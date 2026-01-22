import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

interface WeakArea {
  courseId: string
  courseTitle: string
  lessonIndex: number
  lessonTitle: string
  masteryLevel: number
  totalAttempts: number
  totalCorrect: number
  accuracy: number
  lastStudied: string | null
  daysSinceStudy: number
  priority: 'high' | 'medium' | 'low'
  reason: string
}

/**
 * GET /api/weak-areas
 * Identifies weak areas based on lesson performance and time decay
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Build query for lesson progress
    let query = supabase
      .from('lesson_progress')
      .select(`
        id,
        course_id,
        lesson_index,
        lesson_title,
        mastery_level,
        total_attempts,
        total_correct,
        last_studied_at,
        completed
      `)
      .eq('user_id', user.id)
      .eq('completed', true)

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data: lessonProgress, error } = await query

    if (error) {
      // Don't log error if table doesn't exist - feature is optional
      if (error.code !== 'PGRST205') {
        console.error('Failed to fetch lesson progress:', error)
      }
      // Return empty data if table doesn't exist
      return NextResponse.json({ weakAreas: [], summary: null })
    }

    if (!lessonProgress || lessonProgress.length === 0) {
      return NextResponse.json({ weakAreas: [], summary: null })
    }

    // Get course titles
    const courseIds = [...new Set(lessonProgress.map(lp => lp.course_id))]
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title')
      .in('id', courseIds)

    const courseTitleMap = new Map(courses?.map(c => [c.id, c.title]) || [])

    // Calculate weak areas with priority scoring
    const now = new Date()
    const weakAreas: WeakArea[] = lessonProgress
      .map(lp => {
        const accuracy = lp.total_attempts > 0
          ? (lp.total_correct / lp.total_attempts)
          : 0

        const lastStudied = lp.last_studied_at ? new Date(lp.last_studied_at) : null
        const daysSinceStudy = lastStudied
          ? Math.floor((now.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24))
          : 999

        // Calculate priority score (higher = more urgent)
        let priorityScore = 0
        const reasons: string[] = []

        // Low mastery is a major factor
        if (lp.mastery_level < 0.4) {
          priorityScore += 3
          reasons.push('low mastery')
        } else if (lp.mastery_level < 0.6) {
          priorityScore += 2
          reasons.push('below average mastery')
        } else if (lp.mastery_level < 0.75) {
          priorityScore += 1
          reasons.push('needs reinforcement')
        }

        // Low accuracy adds urgency
        if (accuracy < 0.5 && lp.total_attempts >= 3) {
          priorityScore += 2
          reasons.push('low accuracy')
        } else if (accuracy < 0.7 && lp.total_attempts >= 5) {
          priorityScore += 1
          reasons.push('accuracy could improve')
        }

        // Time decay - lessons not reviewed recently need attention
        if (daysSinceStudy > 14) {
          priorityScore += 2
          reasons.push('not studied recently')
        } else if (daysSinceStudy > 7) {
          priorityScore += 1
          reasons.push('due for review')
        }

        // Not enough practice
        if (lp.total_attempts < 3 && lp.mastery_level < 0.7) {
          priorityScore += 1
          reasons.push('needs more practice')
        }

        const priority: 'high' | 'medium' | 'low' =
          priorityScore >= 4 ? 'high' : priorityScore >= 2 ? 'medium' : 'low'

        return {
          courseId: lp.course_id,
          courseTitle: courseTitleMap.get(lp.course_id) || 'Unknown Course',
          lessonIndex: lp.lesson_index,
          lessonTitle: lp.lesson_title || `Lesson ${lp.lesson_index + 1}`,
          masteryLevel: lp.mastery_level,
          totalAttempts: lp.total_attempts,
          totalCorrect: lp.total_correct,
          accuracy,
          lastStudied: lp.last_studied_at,
          daysSinceStudy,
          priority,
          reason: reasons.length > 0 ? reasons.join(', ') : 'review recommended',
          _priorityScore: priorityScore,
        }
      })
      .filter(wa => wa._priorityScore > 0) // Only include areas that need work
      .sort((a, b) => b._priorityScore - a._priorityScore)
      .slice(0, limit)
      .map(({ _priorityScore, ...wa }) => wa) // Remove internal score from output

    // Calculate summary stats
    const summary = {
      totalWeakAreas: weakAreas.length,
      highPriority: weakAreas.filter(wa => wa.priority === 'high').length,
      mediumPriority: weakAreas.filter(wa => wa.priority === 'medium').length,
      lowPriority: weakAreas.filter(wa => wa.priority === 'low').length,
      averageMastery: lessonProgress.length > 0
        ? lessonProgress.reduce((sum, lp) => sum + lp.mastery_level, 0) / lessonProgress.length
        : 0,
      lessonsNeedingReview: weakAreas.filter(wa => wa.daysSinceStudy > 7).length,
    }

    return NextResponse.json({ weakAreas, summary })
  } catch (error) {
    console.error('[Weak Areas API] Error:', error)
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
  }
}
