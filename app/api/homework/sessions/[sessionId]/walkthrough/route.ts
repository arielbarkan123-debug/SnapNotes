/**
 * Walkthrough Streaming API
 *
 * POST /api/homework/sessions/[sessionId]/walkthrough
 *
 * 1. Generates a structured step-by-step solution via Claude
 * 2. Streams the solution text immediately
 * 3. Compiles TikZ step images with red highlighting (progressive)
 * 4. Uploads images to Supabase Storage and streams URLs
 */

import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateWalkthroughSolution } from '@/lib/homework/walkthrough-generator'
import { renderWalkthroughSteps } from '@/lib/diagram-engine/step-renderer'
import type { WalkthroughStreamEvent, WalkthroughGenerationStatus } from '@/types/walkthrough'

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
        // ─── Step 1: Generate solution via Claude ─────────────────────
        console.log(`[Walkthrough] Generating solution for session ${sessionId}...`)

        const solution = await generateWalkthroughSolution(
          session.question_text || '',
          session.question_image_url ? [session.question_image_url] : undefined,
        )

        console.log(`[Walkthrough] Solution generated: ${solution.steps.length} steps`)

        // ─── Step 2: Create walkthrough session in DB ─────────────────
        const { data: wSession, error: insertError } = await serviceClient
          .from('walkthrough_sessions')
          .insert({
            homework_session_id: sessionId,
            user_id: user.id,
            question_text: session.question_text || '',
            solution,
            generation_status: 'compiling' as WalkthroughGenerationStatus,
            total_steps: solution.steps.length,
            steps_rendered: 0,
            step_images: [],
          })
          .select('id')
          .single()

        if (insertError || !wSession) {
          throw new Error(`Failed to create walkthrough session: ${insertError?.message}`)
        }

        walkthroughId = wSession.id
        send({ type: 'session_created', walkthroughId: walkthroughId! })
        send({ type: 'solution_ready', solution, totalSteps: solution.steps.length })

        // ─── Step 3: Compile TikZ step images with highlighting ───────
        console.log(`[Walkthrough] Compiling ${solution.steps.length} step images...`)

        const stepImages: string[] = new Array(solution.steps.length).fill('')

        const onStepRendered = (stepIndex: number, imageUrl: string) => {
          stepImages[stepIndex] = imageUrl
          const rendered = stepImages.filter(Boolean).length
          send({ type: 'step_image', stepIndex, imageUrl })
          send({ type: 'compilation_progress', stepsRendered: rendered, totalSteps: solution.steps.length })

          // Update DB progressively
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

        await renderWalkthroughSteps(solution.tikzCode, solution.steps.length, onStepRendered)

        // ─── Step 4: Finalize ─────────────────────────────────────────
        const finalRendered = stepImages.filter(Boolean).length
        const finalStatus: WalkthroughGenerationStatus =
          finalRendered === solution.steps.length ? 'complete' : 'partial'

        await serviceClient
          .from('walkthrough_sessions')
          .update({
            generation_status: finalStatus,
            step_images: stepImages,
            steps_rendered: finalRendered,
            updated_at: new Date().toISOString(),
          })
          .eq('id', walkthroughId)

        send({
          type: 'complete',
          stepsRendered: finalRendered,
          totalSteps: solution.steps.length,
        })

        console.log(`[Walkthrough] Complete: ${finalRendered}/${solution.steps.length} steps rendered`)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Walkthrough] Error:', errMsg)

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
