import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { ErrorCodes, createErrorResponse } from '@/lib/api/errors'

export const maxDuration = 60

const AI_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 4096

let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

interface ChatRequest {
  message: string
  sectionRef?: string
  action?: 'quiz' | 'practice' | 'explain' | 'diagram'
  language?: 'en' | 'he'
}

function buildSystemPrompt(guideContent: string, language: 'en' | 'he'): string {
  const langInstruction = language === 'he'
    ? `\n## Language: Respond ONLY in Hebrew (עברית). Keep math notation standard.\n`
    : ''

  return `${langInstruction}You are a warm, supportive Socratic study tutor helping a student with their study guide.

## Your Role
- Help the student understand the material in their study guide
- Answer questions about specific sections
- Generate practice questions when asked
- Quiz the student on key concepts
- Explain difficult concepts in simpler terms

## Study Guide Content
${guideContent.slice(0, 15000)}

## Response Guidelines
- Keep responses concise (2-5 sentences usually)
- When quizzing, ask ONE question at a time and wait for the answer
- Use markdown formatting for clarity
- Reference specific sections of the guide when relevant
- Be encouraging and supportive
- Use LaTeX ($...$) for math formulas

## Quick Actions
- "Quiz Me": Generate a multiple choice or short answer question from the guide
- "Practice Qs": Generate 3-5 practice questions from a random topic
- "Explain More": Explain the referenced section in simpler terms with an analogy
- "Draw Diagram": Generate a visual diagram. You MUST use one of these exact schemas:

### Diagram Schema: coordinate_plane
{"type":"coordinate_plane","visibleStep":0,"totalSteps":3,"data":{"xMin":-5,"xMax":5,"yMin":-5,"yMax":10,"showGrid":true,"title":"y = x² - 2x - 3","curves":[{"id":"f","expression":"x^2 - 2*x - 3","color":"#6366f1"}],"points":[{"id":"v","x":1,"y":-4,"label":"Vertex (1,-4)","color":"#ef4444"}],"lines":[{"id":"sym","points":[{"x":1,"y":-100},{"x":1,"y":100}],"color":"#9ca3af","dashed":true,"type":"line"}]}}
Expressions support: x^2, sin(x), cos(x), sqrt(x), abs(x), exp(x), log(x).

### Diagram Schema: number_line
{"type":"number_line","visibleStep":0,"totalSteps":1,"data":{"min":-5,"max":10,"title":"-2 ≤ x < 5","points":[{"value":-2,"label":"-2","style":"filled","color":"#3b82f6"},{"value":5,"label":"5","style":"hollow","color":"#3b82f6"}],"intervals":[{"start":-2,"end":5,"startInclusive":true,"endInclusive":false,"color":"#3b82f6"}]}}
style: "filled" for ≤/≥, "hollow" for </>.

### Diagram Schema: fbd (Free Body Diagram)
{"type":"fbd","visibleStep":0,"totalSteps":3,"data":{"object":{"type":"block","position":{"x":150,"y":150},"mass":5,"label":"m","color":"#e0e7ff"},"forces":[{"name":"weight","type":"weight","magnitude":50,"angle":-90,"symbol":"W","color":"#22c55e"},{"name":"normal","type":"normal","magnitude":50,"angle":90,"symbol":"N","color":"#3b82f6"},{"name":"friction","type":"friction","magnitude":15,"angle":180,"symbol":"f","subscript":"k","color":"#ef4444"}],"title":"Forces on block","showForceMagnitudes":true},"stepConfig":[{"step":0,"visibleForces":[],"stepLabel":"Object"},{"step":1,"visibleForces":["weight"],"highlightForces":["weight"],"stepLabel":"Weight = 50N"},{"step":2,"visibleForces":["weight","normal","friction"],"stepLabel":"All forces"}]}
Object types: block, sphere, wedge, particle, car, person. Force angles: 0=right, 90=up, -90=down, 180=left.

## Response Format
Return ONLY valid JSON:
{"message": "Your markdown explanation", "diagram": null}

For diagram action, "diagram" MUST be a complete diagram object following one of the schemas above. Pick the most appropriate diagram type for the topic. Return ONLY valid JSON, nothing else.`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guideId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    let body: ChatRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid request body')
    }

    const { message, sectionRef, action, language = 'en' } = body

    if (!message && !action) {
      return createErrorResponse(ErrorCodes.MISSING_FIELD, 'Message or action is required')
    }

    // Fetch guide
    const { data: guide, error: guideError } = await supabase
      .from('prepare_guides')
      .select('generated_guide')
      .eq('id', guideId)
      .eq('user_id', user.id)
      .single()

    if (guideError || !guide) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Guide not found')
    }

    // Build guide content summary for context
    const guideData = guide.generated_guide
    let guideContent = `# ${guideData.title}\n${guideData.subtitle || ''}\n\n`

    for (const topic of guideData.topics || []) {
      guideContent += `## ${topic.title}\n`
      for (const section of topic.sections || []) {
        guideContent += `### ${section.title}\n${section.content}\n\n`
      }
    }

    // Fetch recent chat history
    const { data: recentMessages } = await supabase
      .from('prepare_chat_messages')
      .select('role, content')
      .eq('guide_id', guideId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(20)

    // Build messages
    const messages: Anthropic.MessageParam[] = []

    // Add chat history
    if (recentMessages?.length) {
      for (const msg of recentMessages) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })
      }
    }

    // Build the current message
    let userMessage = message || ''
    if (action === 'quiz') {
      userMessage = sectionRef
        ? `Quiz me on the section: ${sectionRef}`
        : 'Quiz me on a random topic from this guide'
    } else if (action === 'practice') {
      userMessage = sectionRef
        ? `Give me practice questions about: ${sectionRef}`
        : 'Give me 3-5 practice questions from this guide'
    } else if (action === 'explain') {
      userMessage = sectionRef
        ? `Explain this section in simpler terms: ${sectionRef}`
        : 'Explain the most important concept from this guide in simpler terms'
    } else if (action === 'diagram') {
      userMessage = sectionRef
        ? `Draw a visual diagram to help explain: ${sectionRef}`
        : 'Draw a visual diagram for the most important concept in this guide'
    }

    if (sectionRef && !action) {
      userMessage = `[Asking about section: ${sectionRef}] ${userMessage}`
    }

    messages.push({ role: 'user', content: userMessage })

    // Call AI
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(guideContent, language),
      messages,
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    let assistantMessage: string
    let diagram = null

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        assistantMessage = parsed.message || content.text
        diagram = parsed.diagram || null
      } else {
        assistantMessage = content.text
      }
    } catch {
      assistantMessage = content.text
    }

    // Save both messages to DB
    await supabase.from('prepare_chat_messages').insert([
      {
        guide_id: guideId,
        user_id: user.id,
        role: 'user',
        content: userMessage,
        section_ref: sectionRef || null,
      },
      {
        guide_id: guideId,
        user_id: user.id,
        role: 'assistant',
        content: assistantMessage,
        section_ref: sectionRef || null,
        diagram,
      },
    ])

    return NextResponse.json({
      success: true,
      response: {
        message: assistantMessage,
        diagram,
      },
    })
  } catch (error) {
    console.error('[PrepareChat] Error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate response')
  }
}
