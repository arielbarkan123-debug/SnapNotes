import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractAndStoreConcepts } from '@/lib/concepts'
import { buildCurriculumContext, formatContextForPrompt } from '@/lib/curriculum/context-builder'
import type { StudySystem } from '@/lib/curriculum/types'
import type { GeneratedCourse } from '@/types'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

// Allow 2 minutes for concept extraction (involves AI processing)
export const maxDuration = 120

/**
 * POST /api/concepts/extract
 *
 * Extract concepts from a course and store them in the database.
 * This creates the knowledge graph for the course.
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

    let courseId: string
    try {
      const body = await request.json()
      courseId = body.courseId
    } catch {
      return createErrorResponse(ErrorCodes.BODY_INVALID_JSON)
    }

    if (!courseId) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'courseId is required')
    }

    // Validate API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return createErrorResponse(ErrorCodes.API_KEY_NOT_CONFIGURED)
    }

    // Get the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, generated_course')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (courseError || !course) {
      return createErrorResponse(ErrorCodes.COURSE_NOT_FOUND)
    }

    if (!course.generated_course) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Course has no generated content')
    }

    // Get user's learning profile for curriculum context
    let curriculumContext = ''
    let studySystem: string | undefined

    const { data: userProfile } = await supabase
      .from('user_learning_profile')
      .select('study_system, subjects, subject_levels, exam_format')
      .eq('user_id', user.id)
      .single()

    if (userProfile?.study_system && userProfile.study_system !== 'general' && userProfile.study_system !== 'other') {
      studySystem = userProfile.study_system

      // Get a sample of course content for subject detection
      const lessons = (course.generated_course as GeneratedCourse).lessons || []
      const contentSample = lessons
        .slice(0, 3)
        .map((l) => `${l.title}: ${l.steps?.map((s) => s.content).join(' ').slice(0, 500)}`)
        .join('\n')

      const context = await buildCurriculumContext({
        userProfile: {
          studySystem: userProfile.study_system as StudySystem,
          subjects: userProfile.subjects || [],
          subjectLevels: userProfile.subject_levels || {},
          examFormat: userProfile.exam_format as 'match_real' | 'inspired_by' | undefined,
        },
        contentSample,
        purpose: 'course',
      })

      curriculumContext = formatContextForPrompt(context)
    }

    // Extract and store concepts
    const result = await extractAndStoreConcepts(
      {
        ...(course.generated_course as GeneratedCourse),
        id: course.id,
        title: course.title,
      },
      curriculumContext,
      studySystem
    )

    return NextResponse.json({
      success: true,
      result: {
        conceptCount: result.concepts.length,
        mappingCount: result.mappings.length,
        concepts: result.concepts.map((c) => ({
          name: c.name,
          subject: c.subject,
          topic: c.topic,
          difficulty: c.difficulty,
          prerequisites: c.prerequisites,
        })),
      },
    })
  } catch (error) {
    console.error('[Concept Extraction API] Error:', error)
    return createErrorResponse(ErrorCodes.CONCEPT_EXTRACTION_FAILED)
  }
}
