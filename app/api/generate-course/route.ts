import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CourseInsert } from '@/types'
import {
  generateCourseFromImage,
  generateCourseFromMultipleImages,
  generateCourseFromDocument,
  ClaudeAPIError,
  getUserFriendlyError,
} from '@/lib/ai'
import type { ExtractedDocument } from '@/lib/documents'
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
  /** Single image URL (legacy, for backward compatibility) */
  imageUrl?: string
  /** Array of image URLs (new multi-image support) */
  imageUrls?: string[]
  /** Extracted document content (for PDF, PPTX, DOCX) */
  documentContent?: ExtractedDocument
  /** URL to stored document in Supabase Storage */
  documentUrl?: string
  /** Optional user-provided course title */
  title?: string
}

type SourceType = 'image' | 'pdf' | 'pptx' | 'docx'

interface GenerateCourseSuccessResponse {
  success: true
  courseId: string
  cardsGenerated: number
  /** Number of images processed */
  imagesProcessed?: number
  /** Source type of the course */
  sourceType?: SourceType
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 1. Verify authentication
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

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

    const { imageUrl, imageUrls, documentContent, documentUrl, title } = body

    // 3. Determine source type and validate input
    let sourceType: SourceType = 'image'
    let urls: string[] = []

    // Check if this is a document-based request
    if (documentContent && documentContent.type) {
      // Document content provided - skip image processing
      sourceType = documentContent.type as SourceType
    } else {
      // Image-based request - normalize to array of URLs
      if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
        urls = imageUrls.filter((url) => typeof url === 'string' && url.trim())
      } else if (imageUrl && typeof imageUrl === 'string') {
        urls = [imageUrl]
      }

      if (urls.length === 0) {
        return createErrorResponse(
          ErrorCodes.MISSING_FIELD,
          'Either imageUrl/imageUrls or documentContent is required'
        )
      }

      // Limit to 10 images max
      if (urls.length > 10) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Maximum 10 images allowed per course')
      }
    }

    // 4. Check for duplicate courses
    // For images: check by primary image URL
    // For documents: check by document URL or document title
    const duplicateCheckField = documentContent ? documentUrl : urls[0]

    if (duplicateCheckField) {
      const { data: existingCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('user_id', user.id)
        .or(`original_image_url.eq.${duplicateCheckField},document_url.eq.${duplicateCheckField}`)
        .single()

      if (existingCourse) {
        return NextResponse.json({
          success: true,
          courseId: existingCourse.id,
          cardsGenerated: 0,
          isDuplicate: true,
          imagesProcessed: 0,
          sourceType,
        })
      }
    }

    // 5. Generate course using AI service
    let extractedContent: string
    let generatedCourse

    try {
      if (documentContent) {
        // Document-based generation - skip image analysis
        const result = await generateCourseFromDocument(documentContent, title)
        generatedCourse = result.generatedCourse
        extractedContent = documentContent.content // Use the already extracted content
      } else if (urls.length === 1) {
        // Single image
        const result = await generateCourseFromImage(urls[0], title)
        generatedCourse = result.generatedCourse
        extractedContent = result.extractionRawText
      } else {
        // Multiple images
        const result = await generateCourseFromMultipleImages(urls, title)
        generatedCourse = result.generatedCourse
        extractedContent = result.extractionRawText
      }
    } catch (error) {
      logError('GenerateCourse:AI', error)

      if (error instanceof ClaudeAPIError) {
        const errorCode = mapClaudeAPIErrorCode(error.code)
        return createErrorResponse(errorCode, getUserFriendlyError(error))
      }

      const { code, message } = mapClaudeAPIError(error)
      return createErrorResponse(code, message)
    }

    // 6. Save to database
    const courseData: CourseInsert = {
      user_id: user.id,
      title: generatedCourse.title,
      extracted_content: extractedContent,
      generated_course: generatedCourse,
      source_type: sourceType,
    }

    // Set source-specific fields
    if (documentContent) {
      courseData.document_url = documentUrl || null
      courseData.original_image_url = null // No image for document-based courses
    } else {
      courseData.original_image_url = urls[0]
      courseData.image_urls = urls.length > 1 ? urls : null
    }

    const { data: course, error: dbError } = await supabase
      .from('courses')
      .insert(courseData)
      .select('id')
      .single()

    if (dbError || !course) {
      logError('GenerateCourse:database', dbError)
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to save course. Please try again.')
    }

    // 7. Generate review cards from course content
    let cardsGenerated = 0

    try {
      const cards = generateCardsFromCourse(generatedCourse, course.id)

      if (cards.length > 0) {
        const cardsWithUser = cards.map((card) => ({
          ...card,
          user_id: user.id,
        }))

        const { data: insertedCards, error: cardsError } = await supabase
          .from('review_cards')
          .insert(cardsWithUser)
          .select('id')

        if (cardsError) {
          logError('GenerateCourse:cards', cardsError)
        } else {
          cardsGenerated = insertedCards?.length || 0
        }
      }
    } catch (cardError) {
      logError('GenerateCourse:cardGeneration', cardError)
    }

    // 8. Return success
    const response: GenerateCourseSuccessResponse = {
      success: true,
      courseId: course.id,
      cardsGenerated,
      imagesProcessed: documentContent ? 0 : urls.length,
      sourceType,
    }

    return NextResponse.json(response)
  } catch (error) {
    logError('GenerateCourse:unhandled', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'An unexpected error occurred. Please try again.')
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
