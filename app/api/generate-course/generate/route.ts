import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { type LessonIntensityMode } from '@/types'
import { ClaudeAPIError, getUserFriendlyError } from '@/lib/ai'
import type { UserLearningContext } from '@/lib/ai'
import {
  getContentLanguage,
  detectSourceLanguage,
  resolveOutputLanguage,
  getExplicitToggleFlag,
  clearExplicitToggleFlag,
  type ContentLanguage,
} from '@/lib/ai/language'
import { processDocument, type ExtractedDocument } from '@/lib/documents'
import { ErrorCodes, logError } from '@/lib/api/errors'
import { checkRateLimit, RATE_LIMITS, getIdentifier } from '@/lib/rate-limit'
// import { getStudentContext, generateDirectives } from '@/lib/student-context'
import { createLogger } from '@/lib/logger'
import {
  generateCourseService,
  type GenerateCourseServiceParams,
  type ProgressiveMetadata,
  type SourceType,
} from '../generate-course.service'

const log = createLogger('api:generate-course:generate')

export const maxDuration = 240

// ============================================================================
// Types
// ============================================================================

interface GenerateCourseRequest {
  imageUrl?: string
  imageUrls?: string[]
  documentContent?: ExtractedDocument
  documentUrl?: string
  documentStoragePath?: string
  documentFileName?: string
  documentFileType?: 'pdf' | 'pptx' | 'docx'
  textContent?: string
  title?: string
  intensityMode?: LessonIntensityMode
  supplementaryText?: string
}

const DOCUMENT_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

function inferDocumentMime(
  fileName?: string,
  fileType?: 'pdf' | 'pptx' | 'docx',
): { mime: string; ext: 'pdf' | 'pptx' | 'docx' } | null {
  if (fileType && DOCUMENT_MIME_BY_EXTENSION[fileType]) {
    return { mime: DOCUMENT_MIME_BY_EXTENSION[fileType], ext: fileType }
  }
  if (fileName) {
    const ext = (fileName.split('.').pop() || '').toLowerCase() as 'pdf' | 'pptx' | 'docx'
    if (DOCUMENT_MIME_BY_EXTENSION[ext]) {
      return { mime: DOCUMENT_MIME_BY_EXTENSION[ext], ext }
    }
  }
  return null
}

type StreamMessage =
  | { type: 'heartbeat'; timestamp: number }
  | { type: 'progress'; stage: string; percent: number }
  | {
      type: 'success'
      generatedCourse: object
      extractedContent: string
      sourceType: SourceType
      courseImageUrls: string[]
      progressiveMetadata?: ProgressiveMetadata
    }
  | { type: 'error'; error: string; code: string; retryable: boolean }

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<Response> {
  // ── Phase 1: cookie-dependent work ────────────────────────────────────────
  // cookies() from next/headers is only valid while the request scope is
  // active — i.e. before we return a Response. Do all cookie reads here.

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { type: 'error', error: 'Please log in to generate a course', code: ErrorCodes.UNAUTHORIZED, retryable: false },
      { status: 401 },
    )
  }

  // Read language cookies now — they can't be read after the Response is returned
  const wasExplicit = await getExplicitToggleFlag()
  if (wasExplicit) {
    await clearExplicitToggleFlag()
  }

  // Resolve user language preference (also reads cookies internally, must be here)
  let initialLanguage: ContentLanguage = 'en'
  try {
    const { data: profile } = await supabase
      .from('user_learning_profile')
      .select('language')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profile?.language === 'he' || profile?.language === 'en') {
      initialLanguage = profile.language
    } else {
      initialLanguage = await getContentLanguage(supabase, user.id)
    }
  } catch {
    initialLanguage = await getContentLanguage(supabase, user.id)
  }

  // ── Phase 2: stream setup ──────────────────────────────────────────────────

  const userAgent = request.headers.get('user-agent') || ''
  const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome') && !userAgent.includes('Chromium')
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
  const needsAggressiveHeartbeat = isSafari || isIOS

  if (needsAggressiveHeartbeat) {
    log.debug('Detected Safari/iOS - using aggressive heartbeat')
  }

  const encoder = new TextEncoder()
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null
  let streamClosed = false

  const sendMessage = (msg: StreamMessage) => {
    if (streamController && !streamClosed) {
      try {
        streamController.enqueue(encoder.encode(JSON.stringify(msg) + '\n'))
      } catch (e) {
        streamClosed = true
        log.warn({ e }, 'Stream write failed')
      }
    }
  }

  const closeStream = () => {
    if (streamController && !streamClosed) {
      try {
        streamController.close()
        streamClosed = true
      } catch {
        streamClosed = true
      }
    }
  }

  let heartbeatInterval: ReturnType<typeof setInterval> | null = null
  const heartbeatFrequency = needsAggressiveHeartbeat ? 3000 : 10000

  const startHeartbeat = () => {
    heartbeatInterval = setInterval(() => {
      if (!streamClosed) {
        sendMessage({ type: 'heartbeat', timestamp: Date.now() })
      }
    }, heartbeatFrequency)
  }

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller
    },
    cancel() {
      stopHeartbeat()
    },
  })

  // ── Phase 3: async IIFE — no cookies() calls allowed past this point ───────
  ;(async () => {
    try {
      startHeartbeat()
      sendMessage({ type: 'progress', stage: 'Starting', percent: 5 })

      // 1. Rate limit
      const rateLimitId = getIdentifier(user.id, request)
      const rateLimit = await checkRateLimit(rateLimitId, RATE_LIMITS.generateCourse)

      if (!rateLimit.allowed) {
        sendMessage({ type: 'error', error: 'Too many requests. Please wait before generating another course.', code: 'RATE_LIMITED', retryable: true })
        stopHeartbeat()
        closeStream()
        return
      }

      sendMessage({ type: 'progress', stage: 'Authenticated', percent: 10 })

      // 2. Full user learning profile
      let userContext: UserLearningContext | undefined
      try {
        const { data: profile } = await supabase
          .from('user_learning_profile')
          .select('education_level, study_system, study_goal, learning_styles, language, grade')
          .eq('user_id', user.id)
          .single()

        if (profile) {
          userContext = {
            educationLevel: profile.education_level || 'high_school',
            studySystem: profile.study_system || 'general',
            studyGoal: profile.study_goal || 'general_learning',
            learningStyles: profile.learning_styles || ['practice'],
            language: profile.language || initialLanguage,
            grade: profile.grade || undefined,
          }
        }
      } catch {
        // Continue without personalization
      }

      if (!userContext) {
        userContext = {
          educationLevel: 'high_school',
          studySystem: 'general',
          studyGoal: 'general_learning',
          learningStyles: ['practice'],
          language: initialLanguage,
        }
      }

      // 3. Student intelligence for adaptive pacing
      // try {
      //   const studentCtx = await getStudentContext(supabase, user.id)
      //   if (studentCtx && userContext) {
      //     const directives = generateDirectives(studentCtx)
      //     userContext.lessonPacing = {
      //       pacing: directives.lessons.pacing,
      //       skipWorkedExamples: directives.lessons.skipWorkedExamples,
      //       extraPracticeSteps: directives.lessons.extraPracticeSteps,
      //       contentFormat: directives.lessons.contentFormat,
      //     }
      //   }
      // } catch {
      //   // Non-critical
      // }

      // 4. Parse body
      let body: GenerateCourseRequest
      try {
        body = await request.json()
      } catch {
        sendMessage({ type: 'error', error: 'Invalid request body', code: ErrorCodes.INVALID_INPUT, retryable: false })
        stopHeartbeat()
        closeStream()
        return
      }

      const { imageUrl, imageUrls, documentStoragePath, documentFileName, documentFileType, textContent, supplementaryText, title, intensityMode } = body
      let documentContent = body.documentContent

      // 5. Re-extract document from storage if client passed a path instead of inline content
      if (!documentContent && documentStoragePath) {
        const mimeInfo = inferDocumentMime(documentFileName, documentFileType)
        if (!mimeInfo) {
          sendMessage({ type: 'error', error: 'Could not determine document type. Please re-upload your file.', code: ErrorCodes.INVALID_INPUT, retryable: false })
          stopHeartbeat()
          closeStream()
          return
        }

        if (!documentStoragePath.startsWith(`${user.id}/`)) {
          sendMessage({ type: 'error', error: 'Access denied to this document', code: ErrorCodes.FORBIDDEN, retryable: false })
          stopHeartbeat()
          closeStream()
          return
        }

        try {
          sendMessage({ type: 'progress', stage: 'Fetching document', percent: 20 })
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(documentStoragePath)

          if (downloadError || !fileData) {
            throw downloadError || new Error('File not found in storage')
          }

          const buffer = Buffer.from(await fileData.arrayBuffer())
          sendMessage({ type: 'progress', stage: 'Extracting document', percent: 25 })
          documentContent = await processDocument(buffer, mimeInfo.mime, documentFileName)
        } catch (extractError) {
          log.error({ err: extractError }, 'Server-side document re-extraction failed')
          sendMessage({ type: 'error', error: 'Could not read your document. Please re-upload and try again.', code: ErrorCodes.AI_PROCESSING_FAILED, retryable: true })
          stopHeartbeat()
          closeStream()
          return
        }
      }

      // 6. Language detection and resolution (wasExplicit captured before stream)
      const preExtractionText = textContent || documentContent?.content || ''
      const sourceLanguage = detectSourceLanguage(preExtractionText)
      const outputLanguage = resolveOutputLanguage(
        (userContext?.language || 'en') as 'en' | 'he',
        sourceLanguage,
        wasExplicit,
      )
      if (userContext) {
        userContext.language = outputLanguage
      }

      sendMessage({ type: 'progress', stage: 'Generating course', percent: 30 })

      // 7. Delegate all AI generation to the service
      const serviceParams: GenerateCourseServiceParams = {
        imageUrl,
        imageUrls,
        documentContent,
        documentFileName,
        documentFileType,
        textContent,
        title,
        intensityMode,
        supplementaryText,
        userId: user.id,
      }

      let result
      try {
        result = await generateCourseService(serviceParams, userContext)
      } catch (error) {
        logError('GenerateCourseGenerate:AI', error)

        let errorMessage = 'Failed to generate course. Please try again.'
        let errorCode: string = ErrorCodes.AI_PROCESSING_FAILED

        if (error instanceof ClaudeAPIError) {
          errorCode = error.code
          errorMessage = getUserFriendlyError(error)
        }

        sendMessage({ type: 'error', error: errorMessage, code: errorCode, retryable: true })
        stopHeartbeat()
        closeStream()
        return
      }

      // 8. Post-extraction language re-detection for image-based courses
      if (!sourceLanguage && result.extractedContent) {
        const postExtractionLang = detectSourceLanguage(result.extractedContent)
        if (postExtractionLang && userContext) {
          const postOutputLang = resolveOutputLanguage(
            (userContext.language || 'en') as 'en' | 'he',
            postExtractionLang,
            wasExplicit,
          )
          userContext.language = postOutputLang
        }
      }

      sendMessage({
        type: 'success',
        generatedCourse: result.generatedCourse,
        extractedContent: result.extractedContent,
        sourceType: result.sourceType,
        courseImageUrls: result.courseImageUrls,
        progressiveMetadata: result.progressiveMetadata,
      })
      stopHeartbeat()
      closeStream()
    } catch (error) {
      logError('GenerateCourseGenerate:unhandled', error)
      sendMessage({ type: 'error', error: 'An unexpected error occurred. Please try again.', code: ErrorCodes.INTERNAL_ERROR, retryable: true })
      stopHeartbeat()
      closeStream()
    }
  })()

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
