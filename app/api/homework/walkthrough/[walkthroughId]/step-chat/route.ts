/**
 * Per-Step Chat API
 *
 * GET  /api/homework/walkthrough/[walkthroughId]/step-chat?stepIndex=N
 *   → Returns all messages for a specific step
 *
 * POST /api/homework/walkthrough/[walkthroughId]/step-chat
 *   → Send a question about a specific step, get AI tutor response
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { AI_MODEL, getAnthropicClient } from '@/lib/ai/claude'
import type { WalkthroughSolution } from '@/types/walkthrough'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:step-chat')

export const maxDuration = 60

// ============================================================================
// GET — Fetch messages for a specific step
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walkthroughId: string }> }
) {
  const { walkthroughId } = await params
  const stepIndex = parseInt(request.nextUrl.searchParams.get('stepIndex') || '0', 10)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: messages, error } = await supabase
    .from('walkthrough_step_chats')
    .select('*')
    .eq('walkthrough_id', walkthroughId)
    .eq('step_index', stepIndex)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: messages || [] })
}

// ============================================================================
// POST — Send a question about a specific step
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ walkthroughId: string }> }
) {
  const { walkthroughId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { stepIndex, message } = body as { stepIndex: number; message: string }

  if (typeof stepIndex !== 'number' || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Fetch walkthrough session
  const serviceClient = createServiceClient()
  const { data: walkthrough, error: wError } = await serviceClient
    .from('walkthrough_sessions')
    .select('id, user_id, question_text, solution')
    .eq('id', walkthroughId)
    .single()

  if (wError || !walkthrough) {
    return NextResponse.json({ error: 'Walkthrough not found' }, { status: 404 })
  }
  if (walkthrough.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const solution = walkthrough.solution as WalkthroughSolution
  const step = solution.steps[stepIndex]
  if (!step) {
    return NextResponse.json({ error: 'Invalid step index' }, { status: 400 })
  }

  // Save student message
  await serviceClient
    .from('walkthrough_step_chats')
    .insert({
      walkthrough_id: walkthroughId,
      user_id: user.id,
      step_index: stepIndex,
      role: 'student',
      content: message.trim(),
    })

  // Fetch conversation history for this step
  const { data: history } = await serviceClient
    .from('walkthrough_step_chats')
    .select('role, content')
    .eq('walkthrough_id', walkthroughId)
    .eq('step_index', stepIndex)
    .order('created_at', { ascending: true })

  // Generate AI response with step-specific context
  const anthropic = getAnthropicClient()

  const systemPrompt = `You are a helpful math and science tutor. The student is working through a step-by-step solution and has a question about a specific step.

PROBLEM: ${walkthrough.question_text}

CURRENT STEP (Step ${stepIndex + 1}): ${step.title}
Step explanation: ${step.explanation}
${step.equation ? `Key equation: ${step.equation}` : ''}

FULL SOLUTION CONTEXT:
${solution.steps.map((s, i) => `Step ${i + 1}: ${s.title} — ${s.explanation}`).join('\n')}
Final answer: ${solution.finalAnswer}

RULES:
- Answer the student's question about THIS specific step
- Use inline LaTeX math ($...$) for all formulas and equations
- Be concise but clear (2-4 sentences)
- If the student is confused, try a different explanation angle
- Stay focused on this step, don't jump ahead unless necessary`

  const messages = (history || []).map(m => ({
    role: m.role === 'student' ? 'user' as const : 'assistant' as const,
    content: m.content,
  }))

  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const textBlock = response.content.find(b => b.type === 'text')
    const tutorResponse = textBlock?.type === 'text' ? textBlock.text : 'Sorry, I could not generate a response.'

    // Save tutor response
    await serviceClient
      .from('walkthrough_step_chats')
      .insert({
        walkthrough_id: walkthroughId,
        user_id: user.id,
        step_index: stepIndex,
        role: 'tutor',
        content: tutorResponse,
      })

    // Return both the student message and tutor response
    const { data: allMessages } = await serviceClient
      .from('walkthrough_step_chats')
      .select('*')
      .eq('walkthrough_id', walkthroughId)
      .eq('step_index', stepIndex)
      .order('created_at', { ascending: true })

    return NextResponse.json({ messages: allMessages || [] })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'AI error'
    log.error({ err: error }, 'Step chat error')
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
