import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CourseInsert } from '@/types'
import {
  generateCourseFromImage,
  generateCourseFromMultipleImages,
  generateCourseFromDocument,
  generateCourseFromText,
  ClaudeAPIError,
  getUserFriendlyError,
} from '@/lib/ai'
import type { UserLearningContext } from '@/lib/ai'
import type { ExtractedDocument } from '@/lib/documents'
import {
  ErrorCodes,
  createErrorResponse,
  logError,
  mapClaudeAPIError,
} from '@/lib/api/errors'
import { generateCardsFromCourse } from '@/lib/srs'
import { uploadExtractedImages, searchEducationalImages } from '@/lib/images'
import { generateCourseImage } from '@/lib/ai/image-generation'
import { extractAndStoreConcepts } from '@/lib/concepts'
import { buildCurriculumContext, formatContextForPrompt } from '@/lib/curriculum/context-builder'
import type { StudySystem } from '@/lib/curriculum/types'
import { checkRateLimit, RATE_LIMITS, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit'

// ============================================================================
// Route Configuration
// ============================================================================

// Extend timeout for course generation (Vercel Pro allows up to 300s)
// Course generation with comprehensive prompts needs more time
export const maxDuration = 120

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
  /** Plain text content for text-based course generation */
  textContent?: string
  /** Optional user-provided course title */
  title?: string
}

type SourceType = 'image' | 'pdf' | 'pptx' | 'docx' | 'text'

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

    // 1.5. Check rate limit
    const rateLimitId = getIdentifier(user.id, request)
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMITS.generateCourse)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please wait before generating another course.',
          code: 'RATE_LIMITED',
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      )
    }

    // 1.6. Fetch user learning profile for personalization
    let userContext: UserLearningContext | undefined
    try {
      const { data: profile } = await supabase
        .from('user_learning_profile')
        .select('education_level, study_system, study_goal, learning_styles, language')
        .eq('user_id', user.id)
        .single()

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
      // Continue without personalization if profile fetch fails
    }

    // 2. Parse request body
    let body: GenerateCourseRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Invalid request body')
    }

    const { imageUrl, imageUrls, documentContent, documentUrl, textContent, title } = body

    // 3. Determine source type and validate input
    let sourceType: SourceType = 'image'
    let urls: string[] = []

    // Check if this is a text-based request
    if (textContent && typeof textContent === 'string' && textContent.trim().length > 0) {
      sourceType = 'text'
    }
    // Check if this is a document-based request
    else if (documentContent && documentContent.type) {
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
          'Either imageUrl/imageUrls, documentContent, or textContent is required'
        )
      }

      // Limit to 10 images max
      if (urls.length > 10) {
        return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Maximum 10 images allowed per course')
      }
    }

    // 4. Check for duplicate courses (skip for text-based - text content is unique each time)
    // For images: check by primary image URL
    // For documents: check by document URL or document title
    if (sourceType !== 'text') {
      const duplicateCheckField = documentContent ? documentUrl : urls[0]

      if (duplicateCheckField) {
        // Use maybeSingle() instead of single() to handle 0 results gracefully
        const { data: existingCourse } = await supabase
          .from('courses')
          .select('id')
          .eq('user_id', user.id)
          .or(`original_image_url.eq.${duplicateCheckField},document_url.eq.${duplicateCheckField}`)
          .maybeSingle()

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
    }

    // 5. Generate a temporary course ID for image uploads
    const tempCourseId = crypto.randomUUID()

    // 6. Generate course using AI service
    let extractedContent: string
    let generatedCourse
    // Image URLs are embedded in the course steps via normalizeGeneratedCourse
    let _courseImageUrls: string[] = []

    try {
      if (sourceType === 'text' && textContent) {
        // Text-based generation - use text directly
        // For text courses, we can optionally search for web images later
        const result = await generateCourseFromText(textContent, title, userContext)
        generatedCourse = result.generatedCourse
        extractedContent = textContent // Use the user's text as extracted content

        // Try to fetch web images based on course title/topics
        try {
          const webImages = await searchEducationalImages(generatedCourse.title)
          if (webImages.length > 0) {
            _courseImageUrls = webImages.map((img) => img.url)
          }
        } catch {
          // Web image search failed, continue without images
        }
      } else if (documentContent) {
        // Document-based generation - check for extracted images
        let imageUrls: string[] = []


        // If document has extracted images, upload them to storage
        if (documentContent.images && documentContent.images.length > 0) {
          try {
            const uploadResults = await uploadExtractedImages(
              documentContent.images,
              user.id,
              tempCourseId
            )
            // Filter successful uploads and get URLs
            imageUrls = uploadResults
              .filter((r) => r.success)
              .map((r) => (r as { url: string }).url)
            _courseImageUrls = imageUrls
          } catch (uploadError) {
            logError('GenerateCourse:imageUpload', uploadError)
            // Continue without images if upload fails
          }
        }

        // Generate course with image information
        const result = await generateCourseFromDocument(documentContent, title, imageUrls, userContext)
        generatedCourse = result.generatedCourse
        extractedContent = documentContent.content // Use the already extracted content
      } else if (urls.length === 1) {
        // Single image - the uploaded image itself can be referenced
        _courseImageUrls = urls
        const result = await generateCourseFromImage(urls[0], title, userContext)
        generatedCourse = result.generatedCourse
        extractedContent = result.extractionRawText
      } else {
        // Multiple images - all uploaded images can be referenced
        _courseImageUrls = urls
        const result = await generateCourseFromMultipleImages(urls, title, userContext)
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
    if (sourceType === 'text') {
      // Text-based courses don't have image or document URLs
      courseData.original_image_url = null
      courseData.document_url = null
    } else if (documentContent) {
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

    // 8. Generate cover image (non-blocking - fire and forget)
    // This runs in the background and updates the course when done
    generateCoverImage(supabase, user.id, course.id, generatedCourse.title).catch((err) => {
      logError('GenerateCourse:coverImage', err)
    })

    // 9. Extract concepts for knowledge graph (non-blocking)
    // This builds the concept map for gap detection and adaptive learning
    extractConcepts(user.id, course.id, generatedCourse.title, generatedCourse, userContext).catch((err) => {
      logError('GenerateCourse:conceptExtraction', err)
    })

    // 10. Return success
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
// Cover Image Generation Helper
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateCoverImage(supabase: any, userId: string, courseId: string, title: string) {
  try {
    // Generate the cover image using Gemini Nano Banana
    const result = await generateCourseImage(title)

    if (!result.success) {
      return
    }

    let coverUrl: string

    // If we got base64 image data, upload to Supabase storage
    if (result.imageBase64) {
      const imageBuffer = Buffer.from(result.imageBase64, 'base64')
      const fileName = `covers/${userId}/${courseId}-cover.png`

      const { error: uploadError } = await supabase.storage
        .from('course-images')
        .upload(fileName, imageBuffer, {
          contentType: result.mimeType || 'image/png',
          upsert: true,
        })

      if (uploadError) {
        // Use data URL as fallback
        coverUrl = `data:${result.mimeType || 'image/png'};base64,${result.imageBase64}`
      } else {
        // Get public URL from storage
        const { data: { publicUrl } } = supabase.storage
          .from('course-images')
          .getPublicUrl(fileName)
        coverUrl = publicUrl
      }
    } else if (result.imageUrl) {
      // Direct URL (from fallback services)
      coverUrl = result.imageUrl
    } else {
      return
    }

    // Update course with cover image URL
    const { error: updateError } = await supabase
      .from('courses')
      .update({ cover_image_url: coverUrl })
      .eq('id', courseId)
      .eq('user_id', userId)

    if (updateError) {
      logError('GenerateCourse:coverUpdate', updateError)
    }
  } catch (error) {
    logError('GenerateCourse:coverGeneration', error)
  }
}

// ============================================================================
// Other Methods
// ============================================================================

export async function GET() {
  return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Method not allowed', 405)
}

// ============================================================================
// Concept Extraction Helper
// ============================================================================

async function extractConcepts(
  userId: string,
  courseId: string,
  courseTitle: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generatedCourse: any,
  userContext?: UserLearningContext
) {
  try {
    // Skip if API key not configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return
    }

    // Build curriculum context if user has a study system
    let curriculumContext = ''
    let studySystem: string | undefined

    if (userContext?.studySystem && userContext.studySystem !== 'general') {
      studySystem = userContext.studySystem

      // Get a sample of content for subject detection
      const lessons = generatedCourse.lessons || []
      const contentSample = lessons
        .slice(0, 3)
        .map((l: { title: string; steps?: { content?: string }[] }) =>
          `${l.title}: ${l.steps?.map((s) => s.content || '').join(' ').slice(0, 500)}`
        )
        .join('\n')

      const context = await buildCurriculumContext({
        userProfile: {
          studySystem: userContext.studySystem as StudySystem,
          subjects: [],
          subjectLevels: {},
        },
        contentSample,
        purpose: 'course',
      })

      curriculumContext = formatContextForPrompt(context)
    }

    // Extract and store concepts
    await extractAndStoreConcepts(
      {
        ...generatedCourse,
        id: courseId,
        title: courseTitle,
      },
      curriculumContext,
      studySystem
    )
  } catch (error) {
    logError('GenerateCourse:conceptExtraction', error)
    // Don't throw - this is a background task
  }
}
