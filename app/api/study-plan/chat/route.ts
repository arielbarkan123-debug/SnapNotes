/**
 * Study Plan Chat API
 *
 * AI chat assistant for managing academic events and study schedules.
 * Uses Claude tool_use to create/update/delete events and generate
 * preparation schedules based on natural language conversation.
 *
 * GET  - Fetch chat history (last 50 messages)
 * POST - Send a message and get AI response with tool actions
 * DELETE - Clear chat history
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AI_MODEL, getAnthropicClient } from '@/lib/ai/claude'
import { getContentLanguage, buildLanguageInstruction } from '@/lib/ai/language'
import { getStudentContext, generateDirectives } from '@/lib/student-context'
import { buildStudyPlanChatPrompt } from '@/lib/study-plan/chat-prompt'
import { STUDY_PLAN_CHAT_TOOLS } from '@/lib/study-plan/chat-tools'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'
import { checkRateLimit, RATE_LIMITS, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit'
import { createLogger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Anthropic from '@anthropic-ai/sdk'
import type {
  ChatAction,
  CreateEventAction,
  UpdateEventAction,
  DeleteEventAction,
  GeneratePrepScheduleAction,
  AcademicEventInsert,
  AcademicEventUpdate,
} from '@/types'

const log = createLogger('api:study-plan:chat')

export const maxDuration = 90

const MAX_MESSAGE_LENGTH = 2000
const MAX_HISTORY_MESSAGES = 20
const CHAT_HISTORY_LIMIT = 50
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ============================================================================
// GET - Fetch chat history
// ============================================================================

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { data: messages, error } = await supabase
      .from('study_plan_chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(CHAT_HISTORY_LIMIT)

    if (error) {
      log.error({ err: error }, 'Failed to fetch chat history')
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch chat history')
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
    })
  } catch (error) {
    log.error({ err: error }, 'Unhandled error in GET /api/study-plan/chat')
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch chat history')
  }
}

// ============================================================================
// POST - Send message and get AI response
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(
      getIdentifier(user.id, request),
      RATE_LIMITS.studyPlanChat
    )
    if (!rateLimitResult.allowed) {
      const response = createErrorResponse(ErrorCodes.RATE_LIMITED)
      const headers = getRateLimitHeaders(rateLimitResult)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // Parse and validate input
    const body = await request.json()
    const { message } = body as { message?: string }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Message is required')
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`)
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return createErrorResponse(ErrorCodes.AI_SERVICE_UNAVAILABLE, 'Chat service not configured')
    }

    // Load all context in parallel
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const dayOfWeek = DAYS_OF_WEEK[today.getDay()]
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const [chatHistoryResult, eventsResult, studentCtxResult, languageResult] = await Promise.allSettled([
      // Chat history (last 20 messages for context window)
      supabase
        .from('study_plan_chat_messages')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY_MESSAGES),

      // Academic events (next 30 days)
      supabase
        .from('academic_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', todayStr)
        .lte('event_date', thirtyDaysFromNow)
        .order('event_date', { ascending: true }),

      // Student context
      getStudentContext(supabase, user.id),

      // Content language
      getContentLanguage(supabase, user.id),
    ])

    // Extract results with safe fallbacks
    const chatHistory = chatHistoryResult.status === 'fulfilled' && chatHistoryResult.value.data
      ? chatHistoryResult.value.data.reverse() // Reverse because we fetched DESC
      : []

    const events = eventsResult.status === 'fulfilled' && eventsResult.value.data
      ? eventsResult.value.data
      : []

    const studentCtx = studentCtxResult.status === 'fulfilled' ? studentCtxResult.value : null

    const userLanguage = languageResult.status === 'fulfilled' ? languageResult.value : 'en'

    // Build student intelligence section
    let studentContextSection = ''
    if (studentCtx) {
      try {
        const directives = generateDirectives(studentCtx)
        const hw = directives.homework
        studentContextSection = `${hw.studentAbilitySummary}
Subjects: ${studentCtx.subjects.join(', ') || 'Not specified'}
Study goal: ${studentCtx.studyGoal || 'Not specified'}`
      } catch {
        // Continue without student intelligence
      }
    }

    // Build system prompt
    const langInstruction = buildLanguageInstruction(userLanguage)
    const systemPrompt = buildStudyPlanChatPrompt({
      languageInstruction: langInstruction,
      studentContext: studentContextSection || undefined,
      events,
      todayStr,
      dayOfWeek,
    })

    // Build messages array for Claude
    const claudeMessages: Anthropic.MessageParam[] = [
      ...chatHistory
        .filter((msg: { role: string; content: string }) =>
          msg.role === 'user' || msg.role === 'assistant'
        )
        .map((msg: { role: string; content: string }) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      { role: 'user', content: message.trim() },
    ]

    // Call Claude with tools
    const anthropic = getAnthropicClient()
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools: STUDY_PLAN_CHAT_TOOLS,
      messages: claudeMessages,
    })

    // Process response: extract text and tool calls
    const executedActions: ChatAction[] = []
    let assistantText = ''

    // Extract text from initial response
    const initialTextBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    )
    assistantText = initialTextBlocks.map(b => b.text).join('\n')

    // Process tool_use blocks if present
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    if (toolUseBlocks.length > 0) {
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        log.info({ tool: toolUse.name, input: toolUse.input }, 'Executing tool call')

        try {
          const result = await executeToolCall(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            supabase,
            user.id,
            executedActions
          )

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          })
        } catch (error) {
          log.error({ err: error, tool: toolUse.name }, 'Tool execution failed')

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: 'Tool execution failed', details: String(error) }),
            is_error: true,
          })
        }
      }

      // Get final response with tool results
      const finalResponse = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        tools: STUDY_PLAN_CHAT_TOOLS,
        messages: [
          ...claudeMessages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ],
      })

      // Extract final text
      const finalTextBlocks = finalResponse.content.filter(
        (b): b is Anthropic.TextBlock => b.type === 'text'
      )
      if (finalTextBlocks.length > 0) {
        assistantText = finalTextBlocks.map(b => b.text).join('\n')
      }

      // Handle any additional tool calls in the final response
      const finalToolUseBlocks = finalResponse.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      if (finalToolUseBlocks.length > 0) {
        const finalToolResults: Anthropic.ToolResultBlockParam[] = []

        for (const toolUse of finalToolUseBlocks) {
          log.info({ tool: toolUse.name, input: toolUse.input }, 'Executing follow-up tool call')

          try {
            const result = await executeToolCall(
              toolUse.name,
              toolUse.input as Record<string, unknown>,
              supabase,
              user.id,
              executedActions
            )

            finalToolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(result),
            })
          } catch (error) {
            log.error({ err: error, tool: toolUse.name }, 'Follow-up tool execution failed')

            finalToolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({ error: 'Tool execution failed', details: String(error) }),
              is_error: true,
            })
          }
        }

        // One more round to get text after follow-up tools
        const thirdResponse = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 1024,
          system: systemPrompt,
          tools: STUDY_PLAN_CHAT_TOOLS,
          messages: [
            ...claudeMessages,
            { role: 'assistant', content: response.content },
            { role: 'user', content: toolResults },
            { role: 'assistant', content: finalResponse.content },
            { role: 'user', content: finalToolResults },
          ],
        })

        const thirdTextBlocks = thirdResponse.content.filter(
          (b): b is Anthropic.TextBlock => b.type === 'text'
        )
        if (thirdTextBlocks.length > 0) {
          assistantText = thirdTextBlocks.map(b => b.text).join('\n')
        }
      }
    }

    // Validate we got a response
    if (!assistantText) {
      log.error('No text response from AI')
      return createErrorResponse(ErrorCodes.AI_PROCESSING_FAILED, 'No response generated')
    }

    // Save user message to DB
    const { error: userMsgError } = await supabase
      .from('study_plan_chat_messages')
      .insert({
        user_id: user.id,
        role: 'user',
        content: message.trim(),
        metadata: {},
      })

    if (userMsgError) {
      log.warn({ err: userMsgError }, 'Failed to save user message')
    }

    // Save assistant message to DB (with actions in metadata)
    const { error: assistantMsgError } = await supabase
      .from('study_plan_chat_messages')
      .insert({
        user_id: user.id,
        role: 'assistant',
        content: assistantText,
        metadata: executedActions.length > 0 ? { actions: executedActions } : {},
      })

    if (assistantMsgError) {
      log.warn({ err: assistantMsgError }, 'Failed to save assistant message')
    }

    return NextResponse.json({
      success: true,
      message: assistantText,
      actions: executedActions,
    })
  } catch (error) {
    log.error({ err: error }, 'Unhandled error in POST /api/study-plan/chat')

    // Map Claude API errors specifically
    const errMsg = error instanceof Error ? error.message : String(error)
    const errStatus = (error as { status?: number })?.status

    // Insufficient credits / billing errors
    if (errStatus === 400 && errMsg.includes('credit')) {
      return createErrorResponse(ErrorCodes.AI_SERVICE_UNAVAILABLE, 'Insufficient API credits. Please check your Anthropic billing.')
    }
    if (errStatus === 401 || errMsg.includes('authentication') || errMsg.includes('api_key')) {
      return createErrorResponse(ErrorCodes.AI_SERVICE_UNAVAILABLE, 'AI service authentication failed. Please check your API key.')
    }
    if (errStatus === 429 || errMsg.includes('rate_limit')) {
      return createErrorResponse(ErrorCodes.RATE_LIMITED, 'AI service rate limited. Please try again in a moment.')
    }
    if (errStatus === 529 || errMsg.includes('overloaded')) {
      return createErrorResponse(ErrorCodes.AI_SERVICE_UNAVAILABLE, 'AI service is temporarily overloaded. Please try again shortly.')
    }
    if (errMsg.includes('anthropic') || errMsg.includes('claude') || errMsg.includes('API')) {
      return createErrorResponse(ErrorCodes.AI_PROCESSING_FAILED, 'AI service error: ' + errMsg.slice(0, 100))
    }

    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to process chat message')
  }
}

// ============================================================================
// DELETE - Clear chat history
// ============================================================================

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { error } = await supabase
      .from('study_plan_chat_messages')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      log.error({ err: error }, 'Failed to clear chat history')
      return createErrorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to clear chat history')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error({ err: error }, 'Unhandled error in DELETE /api/study-plan/chat')
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to clear chat history')
  }
}

// ============================================================================
// Tool Execution
// ============================================================================

async function executeToolCall(
  toolName: string,
  input: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
  actions: ChatAction[]
): Promise<Record<string, unknown>> {
  switch (toolName) {
    case 'create_event':
      return executeCreateEvent(input, supabase, userId, actions)
    case 'update_event':
      return executeUpdateEvent(input, supabase, userId, actions)
    case 'delete_event':
      return executeDeleteEvent(input, supabase, userId, actions)
    case 'generate_prep_schedule':
      return executeGeneratePrepSchedule(input, actions)
    default:
      log.warn({ toolName }, 'Unknown tool called')
      return { error: `Unknown tool: ${toolName}` }
  }
}

async function executeCreateEvent(
  input: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
  actions: ChatAction[]
): Promise<Record<string, unknown>> {
  const eventInsert: AcademicEventInsert = {
    title: input.title as string,
    event_type: input.event_type as AcademicEventInsert['event_type'],
    event_date: input.event_date as string,
    event_time: input.event_time as string | undefined,
    subject: input.subject as string | undefined,
    description: input.description as string | undefined,
    topics: (input.topics as string[]) || [],
    priority: (input.priority as AcademicEventInsert['priority']) || 'medium',
    prep_strategy: (input.prep_strategy as AcademicEventInsert['prep_strategy']) || 'spread',
    prep_days: (input.prep_days as number) || 3,
    created_via: 'ai_chat',
  }

  const { data: event, error } = await supabase
    .from('academic_events')
    .insert({
      user_id: userId,
      ...eventInsert,
      materials: [],
      status: 'upcoming',
    })
    .select()
    .single()

  if (error || !event) {
    log.error({ err: error }, 'Failed to create event')
    const action: CreateEventAction = {
      type: 'create_event',
      event: eventInsert,
      status: 'rejected',
    }
    actions.push(action)
    return { error: 'Failed to create event', details: error?.message }
  }

  const action: CreateEventAction = {
    type: 'create_event',
    event: eventInsert,
    status: 'applied',
    resultId: event.id,
  }
  actions.push(action)

  log.info({ eventId: event.id, title: event.title }, 'Created event via chat')

  return {
    success: true,
    event_id: event.id,
    title: event.title,
    event_type: event.event_type,
    event_date: event.event_date,
    subject: event.subject,
  }
}

async function executeUpdateEvent(
  input: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
  actions: ChatAction[]
): Promise<Record<string, unknown>> {
  const eventId = input.event_id as string

  // Build update object — only include fields that were provided
  const updates: AcademicEventUpdate = {}
  if (input.title !== undefined) updates.title = input.title as string
  if (input.event_type !== undefined) updates.event_type = input.event_type as AcademicEventUpdate['event_type']
  if (input.event_date !== undefined) updates.event_date = input.event_date as string
  if (input.event_time !== undefined) updates.event_time = input.event_time as string
  if (input.subject !== undefined) updates.subject = input.subject as string
  if (input.description !== undefined) updates.description = input.description as string
  if (input.topics !== undefined) updates.topics = input.topics as string[]
  if (input.priority !== undefined) updates.priority = input.priority as AcademicEventUpdate['priority']
  if (input.prep_strategy !== undefined) updates.prep_strategy = input.prep_strategy as AcademicEventUpdate['prep_strategy']
  if (input.prep_days !== undefined) updates.prep_days = input.prep_days as number

  const { data: event, error } = await supabase
    .from('academic_events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .eq('user_id', userId) // RLS safety: ensure user owns the event
    .select()
    .single()

  if (error || !event) {
    log.error({ err: error, eventId }, 'Failed to update event')
    const action: UpdateEventAction = {
      type: 'update_event',
      eventId,
      updates,
      status: 'rejected',
    }
    actions.push(action)
    return { error: 'Failed to update event', details: error?.message }
  }

  const action: UpdateEventAction = {
    type: 'update_event',
    eventId,
    updates,
    status: 'applied',
  }
  actions.push(action)

  log.info({ eventId, updates: Object.keys(updates) }, 'Updated event via chat')

  return {
    success: true,
    event_id: event.id,
    title: event.title,
    event_date: event.event_date,
    updated_fields: Object.keys(updates),
  }
}

async function executeDeleteEvent(
  input: Record<string, unknown>,
  supabase: SupabaseClient,
  userId: string,
  actions: ChatAction[]
): Promise<Record<string, unknown>> {
  const eventId = input.event_id as string

  // First fetch the event to confirm it exists and belongs to user
  const { data: existing } = await supabase
    .from('academic_events')
    .select('id, title')
    .eq('id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    const action: DeleteEventAction = {
      type: 'delete_event',
      eventId,
      status: 'rejected',
    }
    actions.push(action)
    return { error: 'Event not found or does not belong to user' }
  }

  const { error } = await supabase
    .from('academic_events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', userId)

  if (error) {
    log.error({ err: error, eventId }, 'Failed to delete event')
    const action: DeleteEventAction = {
      type: 'delete_event',
      eventId,
      status: 'rejected',
    }
    actions.push(action)
    return { error: 'Failed to delete event', details: error?.message }
  }

  const action: DeleteEventAction = {
    type: 'delete_event',
    eventId,
    status: 'applied',
  }
  actions.push(action)

  log.info({ eventId, title: existing.title }, 'Deleted event via chat')

  return {
    success: true,
    event_id: eventId,
    deleted_title: existing.title,
  }
}

async function executeGeneratePrepSchedule(
  input: Record<string, unknown>,
  actions: ChatAction[]
): Promise<Record<string, unknown>> {
  const eventId = input.event_id as string
  const strategy = (input.strategy as 'cram' | 'spread') || 'spread'
  const days = (input.days as number) || 3

  // For now, mark as applied — actual schedule generation will be wired in Phase 7
  const action: GeneratePrepScheduleAction = {
    type: 'generate_prep_schedule',
    eventId,
    strategy,
    days,
    status: 'applied',
  }
  actions.push(action)

  log.info({ eventId, strategy, days }, 'Prep schedule generation requested via chat')

  return {
    success: true,
    event_id: eventId,
    strategy,
    days,
    note: 'Preparation schedule will be generated and added to your calendar.',
  }
}
