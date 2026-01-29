import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
} from '@/lib/api/errors'
import {
  generateCourseFromImage,
  generateCourseFromMultipleImagesProgressive,
  generateCourseFromText,
  generateInitialCourse,
} from '@/lib/ai'
import type { UserLearningContext } from '@/lib/ai'
import type { ExtractedDocument } from '@/lib/documents'
import type { GeneratedCourse, LessonIntensityMode } from '@/types'
import { generateCardsFromCourse } from '@/lib/srs'
import { checkRateLimit, RATE_LIMITS, getIdentifier } from '@/lib/rate-limit'

// ============================================================================
// PATCH - Add new material to an existing course
// ============================================================================

export const maxDuration = 240

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: courseId } = await params

    if (!courseId) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'Course ID is required')
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to update courses')
    }

    // Rate limit check (uses same limits as course generation)
    const rateLimitId = getIdentifier(user.id, request)
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMITS.generateCourse)
    if (!rateLimit.allowed) {
      return createErrorResponse(ErrorCodes.RATE_LIMITED, 'Too many requests. Please wait before adding more material.')
    }

    // Fetch existing course and verify ownership
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) {
      logError('AddMaterial:fetch', fetchError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch course')
    }

    if (!course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    // Parse request body
    const body = await request.json()
    const { imageUrls, textContent, supplementaryText, documentContent, title } = body as {
      imageUrls?: string[]
      textContent?: string
      supplementaryText?: string
      documentContent?: ExtractedDocument
      title?: string
      intensityMode?: LessonIntensityMode
    }

    const intensityMode = (course.intensity_mode as LessonIntensityMode) || 'standard'

    // Fetch user context for personalization
    let userContext: UserLearningContext | undefined
    try {
      const { data: profile } = await supabase
        .from('user_learning_profile')
        .select('education_level, study_system, study_goal, learning_styles, language')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile) {
        userContext = {
          educationLevel: profile.education_level || 'high_school',
          studySystem: profile.study_system || 'general',
          studyGoal: profile.study_goal || 'general_learning',
          learningStyles: profile.learning_styles || ['practice'],
          language: profile.language || 'en',
        }
      }
    } catch {
      // Continue without personalization
    }

    // Generate new content based on what was provided
    let newLessons: GeneratedCourse['lessons'] = []
    let newExtractedContent = ''

    try {
      if (textContent && typeof textContent === 'string' && textContent.trim().length > 0) {
        // Text-based addition
        const result = await generateCourseFromText(textContent, title, userContext, intensityMode)
        newLessons = result.generatedCourse.lessons || []
        newExtractedContent = textContent
      } else if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
        // Image-based addition
        const effectiveTitle = supplementaryText
          ? `${title || ''}\n\nAdditional context from student: ${supplementaryText}`.trim()
          : title

        if (imageUrls.length === 1) {
          const result = await generateCourseFromImage(imageUrls[0], effectiveTitle, userContext, intensityMode)
          newLessons = result.generatedCourse.lessons || []
          newExtractedContent = result.extractionRawText
        } else {
          const result = await generateCourseFromMultipleImagesProgressive(imageUrls, effectiveTitle, userContext, intensityMode)
          newLessons = result.generatedCourse.lessons || []
          newExtractedContent = result.extractionRawText
        }

        if (supplementaryText) {
          newExtractedContent += `\n\n--- Student Notes ---\n${supplementaryText}`
        }
      } else if (documentContent) {
        const effectiveTitle = supplementaryText
          ? `${title || ''}\n\nAdditional context from student: ${supplementaryText}`.trim()
          : title
        const result = await generateInitialCourse(documentContent, effectiveTitle, [], userContext, intensityMode)
        newLessons = result.generatedCourse.lessons || []
        newExtractedContent = documentContent.content
        if (supplementaryText) {
          newExtractedContent += `\n\n--- Student Notes ---\n${supplementaryText}`
        }
      } else {
        return createErrorResponse(ErrorCodes.MISSING_FIELD, 'No content provided. Upload images, text, or a document.')
      }
    } catch (error) {
      logError('AddMaterial:generation', error)
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate new content. Please try again.')
    }

    if (newLessons.length === 0) {
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'No new lessons were generated from the provided content.')
    }

    // Append new lessons to existing course
    const existingCourse = (course.generated_course || {}) as GeneratedCourse
    const existingLessons = existingCourse.lessons || []
    const updatedLessons = [...existingLessons, ...newLessons]
    const updatedCourse = { ...existingCourse, lessons: updatedLessons }

    // Append extracted content
    const existingExtracted = course.extracted_content || ''
    const updatedExtracted = existingExtracted
      ? `${existingExtracted}\n\n--- Additional Material ---\n${newExtractedContent}`
      : newExtractedContent

    // Update course in database
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        generated_course: updatedCourse,
        extracted_content: updatedExtracted,
        total_lessons: updatedLessons.length,
        lessons_ready: updatedLessons.length,
        generation_status: 'complete',
      })
      .eq('id', courseId)

    if (updateError) {
      logError('AddMaterial:update', updateError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to update course')
    }

    // Generate review cards for new lessons only
    let cardsGenerated = 0
    try {
      // Create a temporary course object with only new lessons for card generation
      const tempCourse = { ...updatedCourse, lessons: newLessons }
      const cards = generateCardsFromCourse(tempCourse, courseId)
      if (cards.length > 0) {
        const cardsWithUser = cards.map((card) => ({
          ...card,
          user_id: user.id,
        }))
        const { error: cardError } = await supabase
          .from('review_cards')
          .insert(cardsWithUser)

        if (!cardError) {
          cardsGenerated = cardsWithUser.length
        }
      }
    } catch (cardError) {
      logError('AddMaterial:cards', cardError)
      // Non-critical, continue
    }

    return NextResponse.json({
      success: true,
      newLessonsCount: newLessons.length,
      totalLessons: updatedLessons.length,
      cardsGenerated,
    })
  } catch (error) {
    logError('AddMaterial:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to add material to course')
  }
}

// ============================================================================
// DELETE - Delete a course and all associated data
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: courseId } = await params

    if (!courseId) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'Course ID is required')
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to delete courses')
    }

    // Verify the course belongs to the user
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('id, user_id, original_image_url')
      .eq('id', courseId)
      .maybeSingle()

    if (fetchError) {
      logError('DeleteCourse:fetch', fetchError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch course')
    }

    if (!course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    if (course.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'You do not have permission to delete this course')
    }

    // Use service client to bypass RLS for deletions
    // We already verified ownership above
    const serviceClient = await createServiceClient()

    // Delete associated data - use service client to bypass RLS
    // Wrap each in try-catch since some tables might not exist

    // Helper to safely delete from tables that might not exist
    // Logs errors in development for debugging but continues execution
    const safeDelete = async (table: string, filter: Record<string, unknown>) => {
      try {
        const query = serviceClient.from(table).delete()
        for (const [key, value] of Object.entries(filter)) {
          if (key === 'in' && Array.isArray(value) && value.length === 2) {
            query.in(value[0] as string, value[1] as unknown[])
          } else {
            query.eq(key, value)
          }
        }
        await query
      } catch (err) {
        // Log in development to help diagnose unexpected errors
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[DeleteCourse] Optional table '${table}' delete failed:`, err)
        }
      }
    }

    // 1. First get all card IDs for this course to delete their logs
    const { data: cards } = await serviceClient
      .from('review_cards')
      .select('id')
      .eq('course_id', courseId)

    // 2. Delete review logs for those cards (if any cards exist)
    if (cards && cards.length > 0) {
      const cardIds = cards.map(c => c.id)
      await safeDelete('review_logs', { in: ['card_id', cardIds] })
    }

    // 3-7. Delete associated data from tables that might not exist
    await safeDelete('review_cards', { course_id: courseId })
    await safeDelete('user_progress', { course_id: courseId })
    await safeDelete('lesson_self_assessment', { course_id: courseId })
    await safeDelete('step_performance', { course_id: courseId })
    await safeDelete('user_mastery', { course_id: courseId })

    // 8. Delete the course itself using service client
    const { error: deleteError } = await serviceClient
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (deleteError) {
      logError('DeleteCourse:course', deleteError)
      // Log detailed error for debugging but don't expose to client
      console.error('Delete course error details:', JSON.stringify(deleteError, null, 2))
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to delete course. Please try again.')
    }

    // 9. Optionally delete the image from storage
    if (course.original_image_url) {
      try {
        // Extract the storage path from the URL
        const url = new URL(course.original_image_url)
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)

        if (pathMatch) {
          const bucket = pathMatch[1]
          const filePath = pathMatch[2]

          await serviceClient.storage
            .from(bucket)
            .remove([filePath])
        }
      } catch (storageError) {
        // Log but don't fail - image deletion is not critical
        logError('DeleteCourse:storage', storageError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully',
    })
  } catch (error) {
    logError('DeleteCourse:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete course')
  }
}

// ============================================================================
// GET - Fetch a single course by ID
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: courseId } = await params

    if (!courseId) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'Course ID is required')
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to view courses')
    }

    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle()

    if (error) {
      logError('GetCourse:fetch', error)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch course')
    }

    if (!course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    // Check if user owns this course
    if (course.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'You do not have permission to view this course')
    }

    return NextResponse.json({
      success: true,
      course,
    })
  } catch (error) {
    logError('GetCourse:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch course')
  }
}
