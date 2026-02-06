import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import type { TutorDiagramState, PedagogicalIntent, HintLevel } from '@/lib/homework/types'
import { generateDiagramFromTutorMessage } from '@/lib/homework/diagram-generator'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { getFilteredDiagramSchemaPrompt, DIAGRAM_SCHEMAS } from '@/lib/diagram-schemas'

// Allow 60 seconds for response generation
export const maxDuration = 60

const AI_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 2048

let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

// ============================================================================
// Request Types
// ============================================================================

interface PracticeTutorRequest {
  sessionId: string
  message?: string
  hintLevel?: HintLevel
  question: string
  correctAnswer: string
  explanation?: string
  userAnswer?: string
  wasCorrect?: boolean
  conversation: Array<{ role: string; content: string }>
  language?: 'en' | 'he'
  /** Subject context for diagram schema filtering (e.g. 'math', 'physics', 'geometry') */
  subject?: string
  /** Grade level for diagram schema filtering (e.g. 5, 8, 11) */
  grade?: number
}

interface TutorResponseData {
  message: string
  pedagogicalIntent: PedagogicalIntent
  diagram?: TutorDiagramState
}

// ============================================================================
// System Prompt
// ============================================================================

function buildSystemPrompt(language: 'en' | 'he', subject?: string, grade?: number): string {
  const languageInstruction = language === 'he'
    ? `
## Language Requirement - CRITICAL
Respond ONLY in Hebrew (עברית).
- All messages, questions, and feedback must be in Hebrew
- Keep mathematical notation standard (numbers, symbols, formulas)
- Use proper Hebrew educational terminology
- Maintain a warm, supportive tone in Hebrew
`
    : ''

  return `${languageInstruction}You are a warm, supportive Socratic tutor helping a student understand a practice question they got wrong or need help with.

## Your Goal
Help the student understand WHY the correct answer is what it is, without just telling them directly.

## Your Approach
1. Start by understanding what the student was thinking
2. Guide them step-by-step toward the correct understanding
3. Use analogies and examples to clarify concepts
4. If they ask directly for the answer, give progressively more specific hints
5. Celebrate when they show understanding

## Hint Levels (when requested)
- Level 1 (Concept): Explain the underlying concept
- Level 2 (Strategy): Suggest how to approach the problem
- Level 3 (Example): Give a similar worked example
- Level 4 (Guide): Walk through the specific steps
- Level 5 (Answer): Reveal the answer with full explanation

## Visual Diagrams
When a visual diagram would help the student understand, include a "diagram" field in your response.
Available diagram types (${Object.keys(DIAGRAM_SCHEMAS).length} total): ${Object.keys(DIAGRAM_SCHEMAS).join(', ')}.

For any diagram, use this format:
{
  "type": "<diagram_type>",
  "visibleStep": 0,
  "totalSteps": <number_of_steps>,
  "data": { /* type-specific data - see schemas below */ },
  "stepConfig": [
    { "step": 0, "stepLabel": "Step description" },
    ...
  ]
}

${subject ? `Relevant diagram schemas for ${subject}${grade ? ` grade ${grade}` : ''}:` : 'Available diagram types by subject:'}
${getFilteredDiagramSchemaPrompt(subject, grade)}

## Response Format
Return JSON:
{
  "message": "Your response to the student",
  "pedagogicalIntent": "probe_understanding" | "guide_next_step" | "celebrate" | "clarify" | "give_hint" | "show_answer",
  "diagram": null | { /* diagram object as described above */ }
}

## Rules
- Keep responses concise (2-4 sentences usually)
- Be encouraging but not patronizing
- If showing the answer (hint level 5), explain WHY it's correct
- Always return valid JSON`
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Parse request
    let body: PracticeTutorRequest
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(ErrorCodes.BODY_INVALID_JSON)
    }

    const {
      message,
      hintLevel,
      question,
      correctAnswer,
      explanation,
      userAnswer,
      wasCorrect,
      conversation,
      language = 'en',
      subject,
      grade,
    } = body

    if (!question || !correctAnswer) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Question and correct answer are required')
    }

    if (!message && !hintLevel) {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Either message or hintLevel is required')
    }

    // Build conversation for AI
    const systemPrompt = buildSystemPrompt(language, subject, grade)

    const contextMessage = language === 'he'
      ? `## הקשר
**שאלה:** ${question}
**התשובה הנכונה:** ${correctAnswer}
${explanation ? `**הסבר:** ${explanation}` : ''}
${userAnswer ? `**התשובה של התלמיד:** ${userAnswer}` : ''}
${wasCorrect === false ? '**התלמיד ענה לא נכון ומבקש עזרה להבין.**' : ''}`
      : `## Context
**Question:** ${question}
**Correct Answer:** ${correctAnswer}
${explanation ? `**Explanation:** ${explanation}` : ''}
${userAnswer ? `**Student's Answer:** ${userAnswer}` : ''}
${wasCorrect === false ? '**The student answered incorrectly and is asking for help to understand.**' : ''}`

    // Build messages array
    const messages: Anthropic.MessageParam[] = []

    // Add context as first user message
    messages.push({
      role: 'user',
      content: contextMessage,
    })

    // Add previous conversation
    for (const msg of conversation) {
      messages.push({
        role: msg.role === 'student' ? 'user' : 'assistant',
        content: msg.content,
      })
    }

    // Add current message or hint request
    if (hintLevel) {
      const hintRequest = language === 'he'
        ? `בבקשה תן לי רמז ברמה ${hintLevel} (${getHintLevelNameHe(hintLevel)})`
        : `Please give me a level ${hintLevel} hint (${getHintLevelName(hintLevel)})`
      messages.push({
        role: 'user',
        content: hintRequest,
      })
    } else if (message) {
      messages.push({
        role: 'user',
        content: message,
      })
    }

    // Call AI
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    })

    // Parse response
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    let tutorResponse: TutorResponseData
    try {
      // Try to parse as JSON
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        tutorResponse = JSON.parse(jsonMatch[0])
      } else {
        // If not JSON, wrap the text
        tutorResponse = {
          message: content.text,
          pedagogicalIntent: 'guide_next_step',
        }
      }
    } catch {
      // If parsing fails, use the raw text
      tutorResponse = {
        message: content.text,
        pedagogicalIntent: 'guide_next_step',
      }
    }

    // Try to generate diagram if none was returned
    if (!tutorResponse.diagram) {
      try {
        const generatedDiagram = generateDiagramFromTutorMessage(tutorResponse.message)
        if (generatedDiagram) {
          tutorResponse.diagram = generatedDiagram
        }
      } catch (error) {
        console.warn('[PracticeTutor] Diagram generation failed:', error)
      }
    }

    return NextResponse.json({
      success: true,
      response: tutorResponse,
    })
  } catch (error) {
    console.error('[PracticeTutor] Error:', error)
    return createErrorResponse(ErrorCodes.CHAT_FAILED, 'Failed to generate tutor response')
  }
}

// ============================================================================
// Helpers
// ============================================================================

function getHintLevelName(level: HintLevel): string {
  const names: Record<HintLevel, string> = {
    1: 'Concept',
    2: 'Strategy',
    3: 'Example',
    4: 'Guided Steps',
    5: 'Full Answer',
  }
  return names[level]
}

function getHintLevelNameHe(level: HintLevel): string {
  const names: Record<HintLevel, string> = {
    1: 'רעיון',
    2: 'אסטרטגיה',
    3: 'דוגמה',
    4: 'הדרכה צעד אחר צעד',
    5: 'התשובה המלאה',
  }
  return names[level]
}
