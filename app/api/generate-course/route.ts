import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CourseInsert, LessonIntensityMode } from '@/types'
import {
  generateCourseFromImage,
  generateCourseFromMultipleImagesProgressive,
  generateCourseFromDocument as _generateCourseFromDocument,
  generateCourseFromText,
  generateInitialCourse,
  ClaudeAPIError,
  getUserFriendlyError,
} from '@/lib/ai'
import type { UserLearningContext } from '@/lib/ai'
import type { ExtractedDocument } from '@/lib/documents'
import {
  ErrorCodes,
  logError,
} from '@/lib/api/errors'
import { generateCardsFromCourse } from '@/lib/srs'
import { uploadExtractedImages, searchEducationalImages } from '@/lib/images'
import { generateCourseImage } from '@/lib/ai/image-generation'
import { extractAndStoreConcepts } from '@/lib/concepts'
import { buildCurriculumContext, formatContextForPrompt } from '@/lib/curriculum/context-builder'
import type { StudySystem } from '@/lib/curriculum/types'
import { checkRateLimit, RATE_LIMITS, getIdentifier } from '@/lib/rate-limit'
import { validateLearningObjectives, type LearningObjective } from '@/lib/curriculum/learning-objectives'
import { scoreExtraction, type ExtractionConfidence } from '@/lib/extraction/confidence-scorer'

// ============================================================================
// Route Configuration
// ============================================================================

// Extend timeout for course generation (Vercel Pro allows up to 300s)
// Document processing (PPTX, PDF) + AI generation needs more time
export const maxDuration = 240

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
  /** Lesson intensity mode: quick (10-15 min), standard (20-30 min), deep_practice (45-60 min) */
  intensityMode?: LessonIntensityMode
}

type SourceType = 'image' | 'pdf' | 'pptx' | 'docx' | 'text'

// Streaming message types
type StreamMessage =
  | { type: 'heartbeat'; timestamp: number }
  | { type: 'progress'; stage: string; percent: number }
  | { type: 'success'; courseId: string; cardsGenerated: number; imagesProcessed: number; sourceType: SourceType; generationStatus?: 'complete' | 'partial'; lessonsReady?: number; totalLessons?: number }
  | { type: 'error'; error: string; code: string; retryable: boolean }

// ============================================================================
// Route Handler - Streaming Version
// ============================================================================

export async function POST(request: NextRequest): Promise<Response> {
  // Create a TransformStream to send data to client
  const encoder = new TextEncoder()
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null

  // Helper to send a message to the stream
  const sendMessage = (msg: StreamMessage) => {
    if (streamController) {
      try {
        streamController.enqueue(encoder.encode(JSON.stringify(msg) + '\n'))
      } catch {
        // Stream might be closed
      }
    }
  }

  // Helper to close the stream
  const closeStream = () => {
    if (streamController) {
      try {
        streamController.close()
      } catch {
        // Stream might already be closed
      }
    }
  }

  // Start heartbeat interval to keep connection alive
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  const startHeartbeat = () => {
    heartbeatInterval = setInterval(() => {
      sendMessage({ type: 'heartbeat', timestamp: Date.now() })
    }, 10000) // Send heartbeat every 10 seconds
  }

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  // Create the readable stream
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller
    },
    cancel() {
      stopHeartbeat()
    }
  })

  // Process the request asynchronously
  ;(async () => {
    try {
      // Start heartbeat immediately
      startHeartbeat()
      sendMessage({ type: 'progress', stage: 'Starting', percent: 5 })

      // 1. Verify authentication
      const supabase = await createClient()
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        sendMessage({ type: 'error', error: 'Please log in to generate a course', code: ErrorCodes.UNAUTHORIZED, retryable: false })
        stopHeartbeat()
        closeStream()
        return
      }

      // 1.5. Check rate limit
      const rateLimitId = getIdentifier(user.id, request)
      const rateLimit = checkRateLimit(rateLimitId, RATE_LIMITS.generateCourse)

      if (!rateLimit.allowed) {
        sendMessage({ type: 'error', error: 'Too many requests. Please wait before generating another course.', code: 'RATE_LIMITED', retryable: true })
        stopHeartbeat()
        closeStream()
        return
      }

      sendMessage({ type: 'progress', stage: 'Authenticated', percent: 10 })

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
        sendMessage({ type: 'error', error: 'Invalid request body', code: ErrorCodes.INVALID_INPUT, retryable: false })
        stopHeartbeat()
        closeStream()
        return
      }

      const { imageUrl, imageUrls, documentContent, documentUrl, textContent, title, intensityMode } = body

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
          sendMessage({ type: 'error', error: 'Either imageUrl/imageUrls, documentContent, or textContent is required', code: ErrorCodes.MISSING_FIELD, retryable: false })
          stopHeartbeat()
          closeStream()
          return
        }

        // Limit to 10 images max
        if (urls.length > 10) {
          sendMessage({ type: 'error', error: 'Maximum 10 images allowed per course', code: ErrorCodes.VALIDATION_ERROR, retryable: false })
          stopHeartbeat()
          closeStream()
          return
        }
      }

      sendMessage({ type: 'progress', stage: 'Validating input', percent: 15 })

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
            sendMessage({
              type: 'success',
              courseId: existingCourse.id,
              cardsGenerated: 0,
              imagesProcessed: 0,
              sourceType
            })
            stopHeartbeat()
            closeStream()
            return
          }
        }
      }

      // 5. Generate a temporary course ID for image uploads
      const tempCourseId = crypto.randomUUID()

      sendMessage({ type: 'progress', stage: 'Generating course with AI', percent: 25 })

      // 6. Generate course using AI service
      let extractedContent: string
      let generatedCourse
      // Image URLs are embedded in the course steps via normalizeGeneratedCourse
      let _courseImageUrls: string[] = []

      try {
        if (sourceType === 'text' && textContent) {
          // Text-based generation - use text directly
          sendMessage({ type: 'progress', stage: 'Analyzing your text', percent: 30 })
          const result = await generateCourseFromText(textContent, title, userContext, intensityMode)
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
          // Document-based generation - use PROGRESSIVE generation for fast response
          let imageUrls: string[] = []

          sendMessage({ type: 'progress', stage: 'Processing document', percent: 30 })

          // If document has extracted images, upload them to storage
          if (documentContent.images && documentContent.images.length > 0) {
            try {
              sendMessage({ type: 'progress', stage: 'Uploading images', percent: 35 })
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

          sendMessage({ type: 'progress', stage: 'Generating course content (fast mode)', percent: 45 })

          // Use PROGRESSIVE generation - first 2 lessons + outline (fast ~30s)
          // Remaining lessons will be generated in background by /api/generate-course/continue
          const result = await generateInitialCourse(documentContent, title, imageUrls, userContext, intensityMode)
          generatedCourse = result.generatedCourse
          extractedContent = documentContent.content

          // Store progressive generation metadata for continuation
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(generatedCourse as any)._progressiveMetadata = {
            lessonOutline: result.lessonOutline,
            documentSummary: result.documentSummary,
            totalLessons: result.totalLessons,
            lessonsReady: result.generatedCourse.lessons.length,
          }
        } else if (urls.length === 1) {
          // Single image - the uploaded image itself can be referenced
          _courseImageUrls = urls
          sendMessage({ type: 'progress', stage: 'Analyzing your image', percent: 35 })
          const result = await generateCourseFromImage(urls[0], title, userContext, intensityMode)
          generatedCourse = result.generatedCourse
          extractedContent = result.extractionRawText
        } else {
          // Multiple images - use PROGRESSIVE generation (like documents)
          // First 2 lessons + outline fast, rest generated in background
          _courseImageUrls = urls
          sendMessage({ type: 'progress', stage: 'Analyzing your images (fast mode)', percent: 35 })
          const result = await generateCourseFromMultipleImagesProgressive(urls, title, userContext, intensityMode)
          generatedCourse = result.generatedCourse
          extractedContent = result.extractionRawText

          // Store progressive generation metadata for continuation
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(generatedCourse as any)._progressiveMetadata = {
            lessonOutline: result.lessonOutline,
            documentSummary: result.documentSummary,
            totalLessons: result.totalLessons,
            lessonsReady: result.generatedCourse.lessons.length,
          }
        }
      } catch (error) {
        logError('GenerateCourse:AI', error)

        let errorMessage = 'Failed to generate course. Please try again.'
        let errorCode: string = ErrorCodes.AI_PROCESSING_FAILED

        if (error instanceof ClaudeAPIError) {
          errorCode = mapClaudeAPIErrorCode(error.code)
          errorMessage = getUserFriendlyError(error)
        }

        sendMessage({ type: 'error', error: errorMessage, code: errorCode, retryable: true })
        stopHeartbeat()
        closeStream()
        return
      }

      sendMessage({ type: 'progress', stage: 'Processing results', percent: 75 })

      // 6a. Parse and validate learning objectives from AI response
      let learningObjectives: LearningObjective[] = []
      if (generatedCourse.learningObjectives && Array.isArray(generatedCourse.learningObjectives)) {
        const validationResult = validateLearningObjectives(generatedCourse.learningObjectives)
        // Filter to only valid objectives
        learningObjectives = generatedCourse.learningObjectives.filter(lo =>
          validationResult.results[lo.id]?.isValid === true
        )
        // Log validation summary for debugging
        if (validationResult.summary.errorCount > 0) {
          console.warn('Learning objectives validation:', validationResult.summary)
        }
      }

      // 6b. Score extraction confidence
      const hasFormulas = /\$.*\$|\\[.*\\]|\d+\s*[+\-*/÷×=]\s*\d+/i.test(extractedContent)
      const hasDiagrams = /diagram|figure|chart|graph|image|\[.*\]/i.test(extractedContent)
      const extractionStartTime = Date.now()

      const extractionConfidence: ExtractionConfidence = scoreExtraction(extractedContent, {
        hasFormulas,
        hasDiagrams,
        extractionMethod: documentContent ? 'pdf_parse' : sourceType === 'text' ? 'ocr' : 'vision',
        processingTimeMs: extractionStartTime - Date.now(),
        pageCount: documentContent?.metadata?.pageCount,
      })

      sendMessage({ type: 'progress', stage: 'Saving course', percent: 80 })

      // Log extraction confidence for monitoring
      console.log('[GenerateCourse] Extraction confidence:', extractionConfidence.overall)
      console.log('[GenerateCourse] Learning objectives:', learningObjectives.length)

      // 6c. Save to database
      // Check for progressive generation metadata
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const progressiveMetadata = (generatedCourse as any)._progressiveMetadata
      const isProgressiveGeneration = !!progressiveMetadata

      const courseData: CourseInsert = {
        user_id: user.id,
        title: generatedCourse.title,
        extracted_content: extractedContent,
        generated_course: generatedCourse,
        source_type: sourceType,
        // Intensity mode for lesson structure
        intensity_mode: intensityMode || 'standard',
        // Progressive generation fields
        generation_status: isProgressiveGeneration ? 'partial' : 'complete',
        lessons_ready: isProgressiveGeneration ? progressiveMetadata.lessonsReady : generatedCourse.lessons?.length || 0,
        total_lessons: isProgressiveGeneration ? progressiveMetadata.totalLessons : generatedCourse.lessons?.length || 0,
        document_summary: isProgressiveGeneration ? progressiveMetadata.documentSummary : null,
        lesson_outline: isProgressiveGeneration ? progressiveMetadata.lessonOutline : null,
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
        sendMessage({ type: 'error', error: 'Failed to save course. Please try again.', code: ErrorCodes.DATABASE_ERROR, retryable: true })
        stopHeartbeat()
        closeStream()
        return
      }

      sendMessage({ type: 'progress', stage: 'Creating flashcards', percent: 85 })

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

      sendMessage({ type: 'progress', stage: 'Finishing up', percent: 95 })

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

      // 10. Send success message and close stream
      sendMessage({
        type: 'success',
        courseId: course.id,
        cardsGenerated,
        imagesProcessed: documentContent ? 0 : urls.length,
        sourceType,
        // Progressive generation info - client will trigger /api/generate-course/continue if partial
        generationStatus: isProgressiveGeneration ? 'partial' : 'complete',
        lessonsReady: isProgressiveGeneration ? progressiveMetadata.lessonsReady : undefined,
        totalLessons: isProgressiveGeneration ? progressiveMetadata.totalLessons : undefined,
      })
      stopHeartbeat()
      closeStream()

    } catch (error) {
      logError('GenerateCourse:unhandled', error)
      sendMessage({ type: 'error', error: 'An unexpected error occurred. Please try again.', code: ErrorCodes.INTERNAL_ERROR, retryable: true })
      stopHeartbeat()
      closeStream()
    }
  })()

  // Return the stream immediately
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
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
  return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  })
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
