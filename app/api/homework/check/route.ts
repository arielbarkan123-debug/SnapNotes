import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeHomework } from '@/lib/homework/checker-engine'
import type { CreateCheckRequest } from '@/lib/homework/types'

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
  const startTime = Date.now()

  // Safari needs more frequent heartbeats to prevent connection drops
  const heartbeatFrequency = isSafari ? 3000 : HEARTBEAT_INTERVAL // 3s for Safari, 5s for others

  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send a JSON line
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
      }

      // Start heartbeat to keep connection alive
      // Safari gets more frequent heartbeats (3s vs 5s)
      heartbeatInterval = setInterval(() => {
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
          send({ type: 'error', error: 'Unauthorized' })
          controller.close()
          return
        }

        // Parse request
        let body: CreateCheckRequest
        try {
          body = await request.json()
        } catch {
          send({ type: 'error', error: 'Invalid request body' })
          controller.close()
          return
        }

        if (!body.taskImageUrl) {
          send({ type: 'error', error: 'At least one image is required' })
          controller.close()
          return
        }

        // Create initial check record
        const { data: check, error: insertError } = await supabase
          .from('homework_checks')
          .insert({
            user_id: user.id,
            task_image_url: body.taskImageUrl,
            answer_image_url: body.answerImageUrl || null,  // Optional
            reference_image_urls: body.referenceImageUrls || [],
            teacher_review_urls: body.teacherReviewUrls || [],
            status: 'analyzing',
          })
          .select()
          .single()

        if (insertError) {
          console.error('[Homework Check] Insert error:', insertError)
          console.error('[Homework Check] Insert data was:', {
            task_image_url: body.taskImageUrl,
            answer_image_url: body.answerImageUrl || null,
            reference_image_urls: body.referenceImageUrls || [],
            teacher_review_urls: body.teacherReviewUrls || [],
          })
          // Provide more specific error message
          const errorMsg = insertError.code === '23502' // NOT NULL violation
            ? 'Database schema error. Please contact support.'
            : 'Failed to create homework check. Please try again.'
          send({ type: 'error', error: errorMsg })
          controller.close()
          return
        }

        // Send initial status with check ID
        send({ type: 'status', status: 'created', checkId: check.id })

        // Analyze the homework
        console.log('[Homework Check] Starting analysis for check:', check.id)

        let result
        try {
          result = await analyzeHomework({
            taskImageUrl: body.taskImageUrl,
            answerImageUrl: body.answerImageUrl,
            referenceImageUrls: body.referenceImageUrls,
            teacherReviewUrls: body.teacherReviewUrls,
            // Pass extracted document text for DOCX files
            taskDocumentText: body.taskDocumentText,
            answerDocumentText: body.answerDocumentText,
          })
          console.log('[Homework Check] Analysis completed, grade:', result.feedback?.gradeEstimate)
        } catch (analysisError) {
          console.error('[Homework Check] Analysis threw error:', analysisError)

          // Update check with error status
          await supabase
            .from('homework_checks')
            .update({ status: 'error' })
            .eq('id', check.id)
            .eq('user_id', user.id)

          // Return more specific error message
          const errorMessage = analysisError instanceof Error
            ? analysisError.message
            : 'Failed to analyze homework. Please try again.'

          send({ type: 'error', error: errorMessage, checkId: check.id })
          controller.close()
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
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', check.id)
            .eq('user_id', user.id)
            .select()
            .single()

          if (updateError) {
            console.error('[Homework Check] Update error:', updateError)
            // Mark as error so it doesn't stay stuck in 'analyzing'
            await supabase
              .from('homework_checks')
              .update({ status: 'error' })
              .eq('id', check.id)
              .eq('user_id', user.id)

            send({ type: 'error', error: 'Failed to save analysis results. Please try again.', checkId: check.id })
            controller.close()
            return
          }

          console.log('[Homework Check] Successfully saved check:', check.id)

          // Send final result
          send({ type: 'result', check: updatedCheck })
          controller.close()
        } catch (saveError) {
          console.error('[Homework Check] Save threw error:', saveError)

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
          controller.close()
        }
      } catch (error) {
        console.error('Homework check error:', error)
        send({ type: 'error', error: 'An unexpected error occurred' })
        controller.close()
      } finally {
        // Clean up heartbeat interval
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
        }
      }
    },
    cancel() {
      // Clean up if client disconnects
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      console.error('Fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch homework checks' },
        { status: 500 }
      )
    }

    return NextResponse.json({ checks })
  } catch (error) {
    console.error('Get checks error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
