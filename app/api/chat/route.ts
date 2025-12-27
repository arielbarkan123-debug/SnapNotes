import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

// Validate API key exists
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[Chat API] ANTHROPIC_API_KEY is not configured')
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MAX_MESSAGE_LENGTH = 4000
const MAX_HISTORY_LENGTH = 10

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * POST /api/chat
 * AI Chat Tutor - Answer questions about course content
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId, message, history = [] } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Validate message length
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    // Validate API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Chat service not configured' }, { status: 503 })
    }

    // Get course content for context
    let courseContext = ''
    let courseName = 'your study material'

    if (courseId) {
      const { data: course } = await supabase
        .from('courses')
        .select('title, generated_course')
        .eq('id', courseId)
        .eq('user_id', user.id)
        .single()

      if (course) {
        courseName = course.title
        // Extract key content from course for context
        const courseData = course.generated_course
        if (courseData?.lessons) {
          const lessonSummaries = courseData.lessons.map((lesson: { title: string; steps?: Array<{ type: string; content?: string; text?: string }> }) => {
            const content = lesson.steps
              ?.filter((s: { type: string }) => s.type === 'explanation' || s.type === 'key_points')
              .map((s: { content?: string; text?: string }) => s.content || s.text)
              .join(' ')
            return `${lesson.title}: ${content?.slice(0, 500) || ''}`
          }).join('\n\n')
          courseContext = lessonSummaries.slice(0, 4000) // Limit context size
        }
      }
    }

    // Build conversation history for Claude - validate each message
    const conversationHistory: ChatMessage[] = (Array.isArray(history) ? history : [])
      .slice(-MAX_HISTORY_LENGTH)
      .filter((msg): msg is ChatMessage =>
        msg && typeof msg.role === 'string' && typeof msg.content === 'string' &&
        (msg.role === 'user' || msg.role === 'assistant')
      )
      .map(msg => ({
        role: msg.role,
        content: msg.content.slice(0, MAX_MESSAGE_LENGTH),
      }))

    // Create system prompt
    const systemPrompt = `You are a helpful AI tutor for NoteSnap, a study app. You're helping a student understand their study material.

${courseContext ? `The student is studying "${courseName}". Here's the course content for context:

${courseContext}

` : ''}Rules:
1. Be encouraging and supportive
2. Explain concepts clearly and simply
3. Use examples when helpful
4. If asked about something not in the course material, provide accurate information but note it's supplementary
5. Keep responses concise but thorough (2-4 paragraphs max unless more detail is requested)
6. Use bullet points or numbered lists for clarity when appropriate
7. If the student seems confused, break down the concept into smaller parts
8. Encourage the student to practice and review

Remember: You're a tutor, not just an answer machine. Help them understand, don't just give answers.`

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...conversationHistory,
        { role: 'user', content: message }
      ],
    })

    // Extract response text
    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : 'I apologize, but I was unable to generate a response.'

    return NextResponse.json({
      success: true,
      message: assistantMessage,
    })
  } catch (error) {
    console.error('[Chat API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
