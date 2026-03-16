import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeHomework } from '@/lib/homework/checker-engine'
import type { CreateCheckRequest } from '@/lib/homework/types'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import {
  getContentLanguage,
  detectSourceLanguage,
  resolveOutputLanguage,
  getExplicitToggleFlag,
  clearExplicitToggleFlag,
} from '@/lib/ai/language'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:homework-check')

// ============================================================================
// Error Codes for Homework Check API
// ============================================================================

const API_ERROR_CODES = {
  // Auth errors
  API_CHK_AUTH_001: 'API_CHK_AUTH_001', // Unauthorized

  // Validation errors
  API_CHK_VAL_001: 'API_CHK_VAL_001', // Invalid request body
  API_CHK_VAL_002: 'API_CHK_VAL_002', // Task text required (text mode)
  API_CHK_VAL_003: 'API_CHK_VAL_003', // Task image required (image mode)

  // Database errors
  API_CHK_DB_001: 'API_CHK_DB_001', // Failed to create check record
  API_CHK_DB_002: 'API_CHK_DB_002', // Failed to update check record

  // Analysis errors
  API_CHK_AI_001: 'API_CHK_AI_001', // Analysis failed
} as const

/**
 * Format error message with code for debugging
 */
function formatApiError(code: string, message: string, details?: string): string {
  const detailSuffix = details ? ` (${details})` : ''
  return `[${code}] ${message}${detailSuffix}`
}

// Allow 3 minutes for homework analysis (vision AI + analysis)
// Increased to handle slower mobile network connections
export const maxDuration = 180

// Heartbeat interval in milliseconds (5 seconds)
// This keeps mobile connections alive by sending data regularly
const HEARTBEAT_INTERVAL = 5000

// ============================================================================
// Streaming Response Types (JSON Lines format)
// ============================================================================
// Each line is a JSON object:
// {"type":"heartbeat","status":"analyzing","elapsed":5}
// {"type":"result","check":{...}}
// {"type":"error","error":"..."}

// ============================================================================
// POST - Create and analyze homework check (STREAMING)
// ============================================================================

export async function POST(request: NextRequest) {
  // Detect Safari for more aggressive heartbeat interval
  const userAgent = request.headers.get('user-agent') || ''
  const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome') && !userAgent.includes('Chromium')

  // Create a streaming response to keep mobile connections alive
  const encoder = new TextEncoder()
  let heartbeatInterval: NodeJS.Timeout | null = null
  let streamClosed = false
  const startTime = Date.now()

  // Safari needs more frequent heartbeats to prevent connection drops
  const heartbeatFrequency = isSafari ? 3000 : HEARTBEAT_INTERVAL // 3s for Safari, 5s for others

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send a JSON line (with closed stream protection)
      const send = (data: Record<string, unknown>) => {
        if (streamClosed) return // Prevent sending to closed stream
        try {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
        } catch {
          // Stream may have been closed by client disconnect
          streamClosed = true
        }
      }

      // Helper to safely close the stream
      const closeStream = () => {
        if (streamClosed) return
        streamClosed = true
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }
        try {
          controller.close()
        } catch {
          // Stream may already be closed
        }
      }

      // Start heartbeat to keep connection alive
      // Safari gets more frequent heartbeats (3s vs 5s)
      heartbeatInterval = setInterval(() => {
        if (streamClosed) return // Don't send heartbeat if stream is closed
        const elapsed = Math.round((Date.now() - startTime) / 1000)
        send({ type: 'heartbeat', status: 'analyzing', elapsed })
      }, heartbeatFrequency)

      try {
        const supabase = await createClient()

        // Get user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          send({ type: 'error', error: formatApiError(API_ERROR_CODES.API_CHK_AUTH_001, 'Unauthorized', 'API/HomeworkCheck/Auth') })
          closeStream()
          return
        }

        // Parse request
        let body: CreateCheckRequest
        try {
          body = await request.json()
        } catch {
          send({ type: 'error', error: formatApiError(API_ERROR_CODES.API_CHK_VAL_001, 'Invalid request body', 'API/HomeworkCheck/ParseBody') })
          closeStream()
          return
        }

        // Parse mode (default to standard)
        const mode = body.mode || 'standard'
        const validModes = ['standard', 'batch_worksheet', 'before_submit', 'rubric']
        if (!validModes.includes(mode)) {
          send({ type: 'error', error: formatApiError('API_CHK_VAL_004', `Invalid mode: ${mode}`) })
          closeStream()
          return
        }

        // Validate based on input mode
        const inputMode = body.inputMode || 'image'

        if (inputMode === 'text') {
          // Text mode: require taskText
          if (!body.taskText || body.taskText.trim().length < 10) {
            send({ type: 'error', error: formatApiError(API_ERROR_CODES.API_CHK_VAL_002, 'Task text is required (minimum 10 characters)', 'API/HomeworkCheck/TextMode/Validation') })
            closeStream()
            return
          }
        } else {
          // Image mode: require taskImageUrl
          if (!body.taskImageUrl) {
            send({ type: 'error', error: formatApiError(API_ERROR_CODES.API_CHK_VAL_003, 'At least one image is required', 'API/HomeworkCheck/ImageMode/Validation') })
            closeStream()
            return
          }
        }

        // Create initial check record
        const { data: check, error: insertError } = await supabase
          .from('homework_checks')
          .insert({
            user_id: user.id,
            // For text mode, we store the text directly and leave image URLs null
            task_image_url: inputMode === 'image' ? body.taskImageUrl : null,
            task_text: inputMode === 'text' ? body.taskText : null,
            answer_image_url: inputMode === 'image' ? (body.answerImageUrl || null) : null,
            answer_text: inputMode === 'text' ? (body.answerText || null) : null,
            reference_image_urls: body.referenceImageUrls || [],
            teacher_review_urls: body.teacherReviewUrls || [],
            status: 'analyzing',
            mode: mode,
            rubric_image_urls: body.rubricImageUrls || [],
            additional_image_urls: body.additionalImageUrls || [],
          })
          .select()
          .single()

        if (insertError) {
          log.error({ err: insertError, inputMode, taskImageUrl: body.taskImageUrl, taskText: inputMode === 'text' ? body.taskText?.substring(0, 50) : null }, 'Insert error')
          // Provide more specific error message
          const errorMsg = insertError.code === '23502' // NOT NULL violation
            ? formatApiError(API_ERROR_CODES.API_CHK_DB_001, 'Database schema error. Please contact support.', `API/HomeworkCheck/DB/Insert/Code:${insertError.code}`)
            : formatApiError(API_ERROR_CODES.API_CHK_DB_001, 'Failed to create homework check. Please try again.', `API/HomeworkCheck/DB/Insert/Code:${insertError.code}`)
          send({ type: 'error', error: errorMsg })
          closeStream()
          return
        }

        // Send initial status with check ID
        send({ type: 'status', status: 'created', checkId: check.id })

        // Resolve user's preferred content language
        const userLanguage = await getContentLanguage(supabase, user.id)

        // Detect source material language and resolve output language
        const sourceText = body.taskText || body.taskDocumentText || ''
        const sourceLanguage = detectSourceLanguage(sourceText)
        const wasExplicit = await getExplicitToggleFlag()
        const outputLanguage = resolveOutputLanguage(userLanguage, sourceLanguage, wasExplicit)
        if (sourceLanguage) {
          await clearExplicitToggleFlag()
        }

        // Analyze the homework
        log.info({ checkId: check.id }, 'Starting analysis')

        let result
        try {
          result = await analyzeHomework({
            inputMode,
            // Image-based fields
            taskImageUrl: inputMode === 'image' ? body.taskImageUrl : undefined,
            answerImageUrl: inputMode === 'image' ? body.answerImageUrl : undefined,
            referenceImageUrls: body.referenceImageUrls,
            teacherReviewUrls: body.teacherReviewUrls,
            // Text-based fields
            taskText: inputMode === 'text' ? body.taskText : undefined,
            answerText: inputMode === 'text' ? body.answerText : undefined,
            // Pass extracted document text for DOCX files
            taskDocumentText: body.taskDocumentText,
            answerDocumentText: body.answerDocumentText,
            // Mode-specific
            mode,
            additionalImageUrls: body.additionalImageUrls,
            rubricImageUrls: body.rubricImageUrls,
            // Language preference (resolved from user pref + source detection)
            language: outputLanguage,
          })
          log.info({ grade: result.feedback?.gradeEstimate }, 'Analysis completed')
        } catch (analysisError) {
          log.error({ err: analysisError }, 'Analysis threw error')

          // Update check with error status
          await supabase
            .from('homework_checks')
            .update({ status: 'error' })
            .eq('id', check.id)
            .eq('user_id', user.id)

          // Return more specific error message
          const rawError = analysisError instanceof Error
            ? analysisError.message
            : 'Failed to analyze homework. Please try again.'

          // If error already has a code, use it directly; otherwise, wrap it
          const errorMessage = rawError.startsWith('[')
            ? rawError
            : formatApiError(API_ERROR_CODES.API_CHK_AI_001, rawError, `API/HomeworkCheck/Analysis/${inputMode}Mode`)

          send({ type: 'error', error: errorMessage, checkId: check.id })
          closeStream()
          return
        }

        // Update check with results
        try {
          const { data: updatedCheck, error: updateError } = await supabase
            .from('homework_checks')
            .update({
              task_text: result.taskText,
              answer_text: result.answerText,
              subject: result.subject,
              topic: result.topic,
              feedback: result.feedback,
              mode_result: result.modeResult || null,
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', check.id)
            .eq('user_id', user.id)
            .select()
            .single()

          if (updateError) {
            log.error({ err: updateError }, 'Update error')
            // Mark as error so it doesn't stay stuck in 'analyzing'
            await supabase
              .from('homework_checks')
              .update({ status: 'error' })
              .eq('id', check.id)
              .eq('user_id', user.id)

            send({ type: 'error', error: formatApiError(API_ERROR_CODES.API_CHK_DB_002, 'Failed to save analysis results. Please try again.', `API/HomeworkCheck/DB/Update/Code:${updateError.code}`), checkId: check.id })
            closeStream()
            return
          }

          log.info({ checkId: check.id }, 'Successfully saved check')

          // Send final result
          send({ type: 'result', check: updatedCheck })
          closeStream()
        } catch (saveError) {
          log.error({ err: saveError }, 'Save threw error')

          // Try to mark as error (ignore if this also fails)
          try {
            await supabase
              .from('homework_checks')
              .update({ status: 'error' })
              .eq('id', check.id)
              .eq('user_id', user.id)
          } catch {
            // Ignore secondary failure
          }

          send({ type: 'error', error: 'Failed to save results. Please try again.' })
          closeStream()
        }
      } catch (error) {
        log.error({ err: error }, 'Homework check error')
        send({ type: 'error', error: 'An unexpected error occurred' })
        closeStream()
      } finally {
        // Ensure cleanup on any exit path
        closeStream()
      }
    },
    cancel() {
      // Clean up if client disconnects
      streamClosed = true
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
        heartbeatInterval = null
      }
    }
  })

  // Return stream with Safari-optimized headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      // Prevent buffering by proxies/CDNs for faster streaming
      'X-Accel-Buffering': 'no',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

// ============================================================================
// GET - Get user's homework checks
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: checks, error } = await supabase
      .from('homework_checks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      log.error({ err: error }, 'Fetch checks error')
      return createErrorResponse(ErrorCodes.QUERY_FAILED, 'Failed to fetch homework checks')
    }

    return NextResponse.json({ checks })
  } catch (error) {
    log.error({ err: error }, 'Get checks error')
    return createErrorResponse(ErrorCodes.HOMEWORK_UNKNOWN)
  }
}
