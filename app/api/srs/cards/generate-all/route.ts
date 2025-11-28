import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { generateCardsFromCourse } from '@/lib/srs'

// =============================================================================
// POST /api/srs/cards/generate-all - Generate cards for all courses
// =============================================================================

export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to generate cards')
    }

    // Get all courses for the user
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, generated_course')
      .eq('user_id', user.id)

    if (coursesError) {
      logError('SRS:generateAll:courses', coursesError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch courses')
    }

    if (!courses || courses.length === 0) {
      return NextResponse.json({
        success: true,
        totalCreated: 0,
        coursesProcessed: 0,
        message: 'No courses found',
      })
    }

    let totalCreated = 0
    let coursesProcessed = 0

    for (const course of courses) {
      // Check if cards already exist for this course
      const { count: existingCount } = await supabase
        .from('review_cards')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id)
        .eq('user_id', user.id)

      if (existingCount && existingCount > 0) {
        // Skip - cards already exist
        console.log(`Skipping course ${course.id} - already has ${existingCount} cards`)
        continue
      }

      // Debug: Log course structure
      const gc = course.generated_course
      console.log(`Processing course ${course.id}:`, {
        hasLessons: !!(gc?.lessons),
        hasSections: !!(gc?.sections),
        lessonsCount: gc?.lessons?.length || 0,
        sectionsCount: gc?.sections?.length || 0,
        firstSectionHasSteps: !!(gc?.sections?.[0]?.steps || gc?.lessons?.[0]?.steps),
        stepsCount: gc?.sections?.[0]?.steps?.length || gc?.lessons?.[0]?.steps?.length || 0,
      })

      // Generate cards from course content
      const generatedCards = generateCardsFromCourse(
        course.generated_course,
        course.id
      )

      console.log(`Generated ${generatedCards.length} cards for course ${course.id}`)

      if (generatedCards.length === 0) {
        continue
      }

      // Add user_id and default FSRS values to each card
      const now = new Date().toISOString()
      const cardsToInsert = generatedCards.map((card) => ({
        ...card,
        user_id: user.id,
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
        logError('SRS:generateAll:insert', insertError)
        // Continue with other courses
        continue
      }

      totalCreated += insertedCards?.length || 0
      coursesProcessed += 1
    }

    return NextResponse.json({
      success: true,
      totalCreated,
      coursesProcessed,
      message: `Created ${totalCreated} cards from ${coursesProcessed} courses`,
    })

  } catch (error) {
    logError('SRS:generateAll:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate cards')
  }
}
