import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CourseInsert } from '@/types'
import {
  generateCourseFromImage,
  ClaudeAPIError,
  getUserFriendlyError,
} from '@/lib/ai'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
  mapClaudeAPIError,
} from '@/lib/api/errors'
import { generateCardsFromCourse } from '@/lib/srs'

// ============================================================================
// Types
// ============================================================================

interface GenerateCourseRequest {
  imageUrl: string
  title?: string
}

interface GenerateCourseSuccessResponse {
  success: true
  courseId: string
  cardsGenerated: number
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in to generate a course')
    }

    // 2. Parse request body
    let body: GenerateCourseRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid request body')
    }

    const { imageUrl, title } = body

    if (!imageUrl) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'Image URL is required')
    }

    // 3. Check if a course with this image already exists (prevent duplicates)
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('user_id', user.id)
      .eq('original_image_url', imageUrl)
      .single()

    if (existingCourse) {
      // Course already exists, return the existing one
      return NextResponse.json({
        success: true,
        courseId: existingCourse.id,
        cardsGenerated: 0,
        isDuplicate: true,
      })
    }

    // 4. Generate course from image using AI service (now step 4 due to duplicate check)
    let extractedContent: string
    let generatedCourse

    try {
      const result = await generateCourseFromImage(imageUrl, title)
      generatedCourse = result.generatedCourse
      extractedContent = result.extractionRawText
    } catch (error) {
      logError('GenerateCourse:AI', error)

      if (error instanceof ClaudeAPIError) {
        // Map ClaudeAPIError to our standardized error codes
        const errorCode = mapClaudeAPIErrorCode(error.code)
        return createErrorResponse(errorCode, getUserFriendlyError(error))
      }

      // Use our generic Claude error mapper for unknown errors
      const { code, message } = mapClaudeAPIError(error)
      return createErrorResponse(code, message)
    }

    // 5. Save to database
    const courseData: CourseInsert = {
      user_id: user.id,
      title: generatedCourse.title,
      original_image_url: imageUrl,
      extracted_content: extractedContent,
      generated_course: generatedCourse,
    }

    const { data: course, error: dbError } = await supabase
      .from('courses')
      .insert(courseData)
      .select('id')
      .single()

    if (dbError || !course) {
      logError('GenerateCourse:database', dbError)
      return createErrorResponse(
        ErrorCodes.DATABASE_ERROR,
        'Failed to save course. Please try again.'
      )
    }

    // 6. Generate review cards from course content
    let cardsGenerated = 0

    try {
      const cards = generateCardsFromCourse(generatedCourse, course.id)

      if (cards.length > 0) {
        // Add user_id to each card
        const cardsWithUser = cards.map(card => ({
          ...card,
          user_id: user.id,
        }))

        const { data: insertedCards, error: cardsError } = await supabase
          .from('review_cards')
          .insert(cardsWithUser)
          .select('id')

        if (cardsError) {
          logError('GenerateCourse:cards', cardsError)
          // Don't fail the request, just log the error
        } else {
          cardsGenerated = insertedCards?.length || 0
        }
      }
    } catch (cardError) {
      logError('GenerateCourse:cardGeneration', cardError)
      // Don't fail the request if card generation fails
    }

    // 7. Return success with course ID and card count
    const response: GenerateCourseSuccessResponse = {
      success: true,
      courseId: course.id,
      cardsGenerated,
    }

    return NextResponse.json(response)

  } catch (error) {
    logError('GenerateCourse:unhandled', error)
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred. Please try again.'
    )
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapClaudeAPIErrorCode(errorCode: string): typeof ErrorCodes[keyof typeof ErrorCodes] {
  switch (errorCode) {
    case 'RATE_LIMIT':
      return ErrorCodes.RATE_LIMITED
    case 'INVALID_IMAGE':
    case 'EMPTY_CONTENT':
      return ErrorCodes.IMAGE_UNREADABLE
    case 'CONFIG_ERROR':
      return ErrorCodes.AI_SERVICE_UNAVAILABLE
    case 'PARSE_ERROR':
    case 'API_ERROR':
      return ErrorCodes.AI_PROCESSING_FAILED
    case 'NETWORK_ERROR':
      return ErrorCodes.NETWORK_ERROR
    case 'TIMEOUT':
      return ErrorCodes.PROCESSING_TIMEOUT
    default:
      return ErrorCodes.AI_PROCESSING_FAILED
  }
}

// ============================================================================
// Other Methods
// ============================================================================

export async function GET() {
  return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Method not allowed', 405)
}
