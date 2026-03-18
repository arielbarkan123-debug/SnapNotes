/**
 * Walkthrough Streaming API
 *
 * POST /api/homework/sessions/[sessionId]/walkthrough
 *
 * 1. Generates a structured step-by-step solution via Claude
 * 2. Streams the solution text immediately
 * 3. Compiles TikZ step images with red highlighting (progressive)
 *    — OR skips compilation for text-only walkthroughs
 * 4. Uploads images to Supabase Storage and streams URLs
 */

import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateWalkthroughSolution, classifyWalkthroughTopic } from '@/lib/homework/walkthrough-generator'
import {
  getContentLanguage,
  detectSourceLanguage,
  resolveOutputLanguage,
  getExplicitToggleFlag,
  clearExplicitToggleFlag,
} from '@/lib/ai/language'
import { renderWalkthroughSteps } from '@/lib/diagram-engine/step-renderer'
import { parseTikzLayers, validateLayerStepAlignment, estimateCumulativeSize } from '@/lib/diagram-engine/tikz-layer-parser'
import type { WalkthroughStreamEvent, WalkthroughGenerationStatus } from '@/types/walkthrough'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:walkthrough')

// Allow up to 4 minutes for full pipeline (AI + compile all steps)
export const maxDuration = 240

// ============================================================================
// POST — Generate walkthrough
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Verify session belongs to user
  const { data: session, error: sessionError } = await supabase
    .from('homework_sessions')
    .select('id, question_text, question_image_url, user_id')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404 })
  }
  if (session.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  // Check for existing walkthrough (resume if one exists)
  const serviceClient = createServiceClient()
  const { data: existing } = await serviceClient
    .from('walkthrough_sessions')
    .select('id, generation_status, solution, step_images, steps_rendered, total_steps')
    .eq('homework_session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (existing && (existing.generation_status === 'complete' || existing.generation_status === 'partial')) {
    // Check if this is a diagram-capable walkthrough with no images (broken cache).
    // If the solution has tikzCode but no step images were rendered, delete the cached
    // record and regenerate — this handles cases where compilation failed or the topic
    // classifier was too aggressive in setting text-only mode.
    const hasTikz = existing.solution?.tikzCode && existing.solution.tikzCode.includes('\\begin{tikzpicture}')
    const hasImages = Array.isArray(existing.step_images) && existing.step_images.some((img: string) => !!img)
    const isTextOnly = existing.solution?.mode === 'text-only'

    if (!hasImages && !isTextOnly) {
      // Cached walkthrough with no rendered images — either:
      // 1. TikZ compilation failed (hasTikz=true but no images)
      // 2. Text-only result for a diagram-worthy question (hasTikz=false)
      // Delete the stale record and regenerate with the updated prompt/budgets.
      log.info({ walkthroughId: existing.id, hasTikz }, 'Deleting stale walkthrough (no images) to allow regeneration')
      await serviceClient
        .from('walkthrough_sessions')
        .delete()
        .eq('id', existing.id)
    } else {
      // Return existing walkthrough data
      return new Response(JSON.stringify({
        type: 'existing',
        walkthroughId: existing.id,
        solution: existing.solution,
        stepImages: existing.step_images,
        generationStatus: existing.generation_status,
        stepsRendered: existing.steps_rendered,
        totalSteps: existing.total_steps,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // Stream response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: WalkthroughStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        } catch {
          // Controller may be closed
        }
      }

      // Heartbeat to prevent timeout
      const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', timestamp: Date.now() })
      }, 2000)

      let walkthroughId: string | null = null

      try {
        // ─── Step 1: Route question to best pipeline ─────────────────
        const questionText = session.question_text || ''

        // The walkthrough always uses TikZ for its layered step-by-step diagrams.
        // The AI router is for inline chat diagrams (Recraft "Detailed diagram" mode).
        // Only 'text-only' topics (pure algebra, proofs) skip diagrams entirely.
        const walkthroughTopic = classifyWalkthroughTopic(questionText)
        log.info({ walkthroughTopic }, 'Walkthrough topic classified (always uses TikZ)')

        // Resolve language for the walkthrough content
        const userLanguage = await getContentLanguage(supabase, user.id)
        const sourceLanguage = detectSourceLanguage(questionText)
        const wasExplicit = await getExplicitToggleFlag()
        const language = resolveOutputLanguage(userLanguage, sourceLanguage, wasExplicit)
        if (sourceLanguage) {
          await clearExplicitToggleFlag()
        }

        // ─── Step 2: Generate solution with TikZ ──────────
        const { solution, topicClassified, validationErrors } = await generateWalkthroughSolution(
          questionText,
          session.question_image_url ? [session.question_image_url] : undefined,
          language,
        )
        log.info({ steps: solution.steps.length, mode: solution.mode || 'diagram', topic: topicClassified }, 'Solution generated')

        // ─── Step 3: Create walkthrough session in DB ─────────────────
        const isTextOnly = solution.mode === 'text-only' || !solution.tikzCode || !solution.tikzCode.includes('\\begin{tikzpicture}')

        const { data: wSession, error: insertError } = await serviceClient
          .from('walkthrough_sessions')
          .insert({
            homework_session_id: sessionId,
            user_id: user.id,
            question_text: questionText,
            solution,
            generation_status: (isTextOnly ? 'complete' : 'compiling') as WalkthroughGenerationStatus,
            total_steps: solution.steps.length,
            steps_rendered: isTextOnly ? solution.steps.length : 0,
            step_images: [],
            topic_classified: topicClassified,
            validation_errors: validationErrors,
          })
          .select('id')
          .single()

        if (insertError || !wSession) {
          throw new Error(`Failed to create walkthrough session: ${insertError?.message}`)
        }

        walkthroughId = wSession.id
        send({ type: 'session_created', walkthroughId: walkthroughId! })
        send({ type: 'solution_ready', solution, totalSteps: solution.steps.length })

        // ─── Step 4: Compile TikZ step images ────────────────────────
        if (!isTextOnly) {
          log.info({ steps: solution.steps.length }, 'Compiling TikZ step images')

          const parsed = parseTikzLayers(solution.tikzCode)
          const alignment = validateLayerStepAlignment(parsed, solution.steps.length)
          if (!alignment.valid) {
            log.warn({ message: alignment.message }, 'Layer mismatch')
          }

          const sizes = estimateCumulativeSize(parsed)
          const oversizedIdx = sizes.findIndex(s => s > 3500)
          if (oversizedIdx >= 0) {
            log.warn({ stepIndex: oversizedIdx + 1, chars: sizes[oversizedIdx] }, 'Step may exceed QuickLaTeX limit')
          }

          const stepImages: string[] = new Array(solution.steps.length).fill('')

          const onStepRendered = (stepIndex: number, imageUrl: string) => {
            stepImages[stepIndex] = imageUrl
            const rendered = stepImages.filter(Boolean).length
            send({ type: 'step_image', stepIndex, imageUrl })
            send({ type: 'compilation_progress', stepsRendered: rendered, totalSteps: solution.steps.length })

            serviceClient
              .from('walkthrough_sessions')
              .update({
                step_images: stepImages,
                steps_rendered: rendered,
                updated_at: new Date().toISOString(),
              })
              .eq('id', walkthroughId!)
              .then(() => {})
          }

          const onStepFailed = (stepIndex: number, error: string) => {
            send({ type: 'step_failed', stepIndex, error })
          }

          await renderWalkthroughSteps(solution.tikzCode, solution.steps.length, onStepRendered, onStepFailed)

          const finalRendered = stepImages.filter(Boolean).length
          const finalStatus: WalkthroughGenerationStatus =
            finalRendered === solution.steps.length ? 'complete' : 'partial'

          await serviceClient
            .from('walkthrough_sessions')
            .update({
              generation_status: finalStatus,
              step_images: stepImages,
              steps_rendered: finalRendered,
              compilation_failures: solution.steps.length - finalRendered,
              updated_at: new Date().toISOString(),
            })
            .eq('id', walkthroughId)

          send({
            type: 'complete',
            stepsRendered: finalRendered,
            totalSteps: solution.steps.length,
          })

          log.info({ rendered: finalRendered, total: solution.steps.length }, 'TikZ walkthrough complete')
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        log.error({ err: error }, 'Walkthrough error')

        // Update DB status to failed
        if (walkthroughId) {
          await serviceClient
            .from('walkthrough_sessions')
            .update({
              generation_status: 'failed' as WalkthroughGenerationStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', walkthroughId)
        }

        send({ type: 'error', error: errMsg })
      } finally {
        clearInterval(heartbeat)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}

// ============================================================================
// GET — Fetch existing walkthrough for a session
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { data: walkthrough, error } = await supabase
    .from('walkthrough_sessions')
    .select('*')
    .eq('homework_session_id', sessionId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !walkthrough) {
    return new Response(JSON.stringify({ error: 'No walkthrough found' }), { status: 404 })
  }

  return new Response(JSON.stringify(walkthrough), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ============================================================================
// PATCH — Submit user feedback on walkthrough quality
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await request.json()
  const { walkthroughId, user_rating, user_feedback } = body as {
    walkthroughId: string
    user_rating?: number       // 1 (thumbs down) or 5 (thumbs up)
    user_feedback?: string     // optional text
  }

  if (!walkthroughId) {
    return new Response(JSON.stringify({ error: 'walkthroughId is required' }), { status: 400 })
  }

  // Validate rating
  if (user_rating !== undefined && user_rating !== 1 && user_rating !== 5) {
    return new Response(JSON.stringify({ error: 'user_rating must be 1 or 5' }), { status: 400 })
  }

  // Verify ownership — use service client to bypass RLS issues on update
  const serviceClient = createServiceClient()
  const { data: walkthrough } = await serviceClient
    .from('walkthrough_sessions')
    .select('id, user_id')
    .eq('id', walkthroughId)
    .eq('homework_session_id', sessionId)
    .single()

  if (!walkthrough || walkthrough.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Walkthrough not found' }), { status: 404 })
  }

  // Update feedback
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (user_rating !== undefined) updateData.user_rating = user_rating
  if (user_feedback !== undefined) updateData.user_feedback = user_feedback

  const { error: updateError } = await serviceClient
    .from('walkthrough_sessions')
    .update(updateData)
    .eq('id', walkthroughId)

  if (updateError) {
    return new Response(JSON.stringify({ error: 'Failed to save feedback' }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
