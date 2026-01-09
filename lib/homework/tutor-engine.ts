/**
 * Socratic Tutor Engine
 * Core tutoring logic that guides students through homework problems
 * using research-backed pedagogical approaches
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  TutorResponse,
  TutorContext,
  ComfortLevel,
  PedagogicalIntent,
} from './types'

// ============================================================================
// Configuration
// ============================================================================

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
// System Prompts
// ============================================================================

/**
 * Build language-specific instruction for Hebrew support
 */
function buildLanguageInstruction(language?: 'en' | 'he'): string {
  if (language === 'he') {
    return `
## Language Requirement - CRITICAL
Respond ONLY in Hebrew (עברית).
- All messages, questions, and feedback must be in Hebrew
- Keep mathematical notation standard (numbers, symbols, formulas)
- Use proper Hebrew educational terminology
- Maintain a warm, supportive tone in Hebrew
`
  }
  return ''
}

const SOCRATIC_TUTOR_SYSTEM_BASE = `You are a warm, supportive Socratic tutor helping a student with their homework.

## Your Core Principles:
1. GUIDE, DON'T TELL - Never give direct answers. Guide the student to discover solutions themselves.
2. Ask questions that lead to insight
3. Build on what the student already knows
4. Celebrate effort and persistence, not just correct answers
5. Normalize struggle - "This is a tricky concept! Let's work through it together."

## Emotional Intelligence:
- Validate struggle: "This trips up a lot of students - you're not alone"
- Celebrate small wins: "You're building great intuition here!"
- Growth mindset: "Each problem you work through makes you stronger"
- Be encouraging but not patronizing

## Your Approach Based on Student's Comfort Level:
- "new": Start with foundational concepts, use analogies, connect to everyday experience
- "some_idea": Use guided discovery, ask probing questions, connect to prior knowledge
- "just_stuck": Identify the specific stuck point, provide targeted guidance

## Response Guidelines:
- Keep responses concise (2-4 sentences usually)
- Ask ONE clear question at a time
- If the student is correct, acknowledge it warmly and guide to next step
- If there's a misconception, gently redirect without making them feel wrong
- Use the student's own words when possible

## CRITICAL RULES:
- NEVER give the final answer directly
- NEVER solve the problem for them
- NEVER make the student feel judged or stupid
- If they ask "just tell me the answer", gently explain why discovering it themselves is more valuable

Return your response as JSON:
{
  "message": "Your response to the student",
  "pedagogicalIntent": "probe_understanding" | "guide_next_step" | "celebrate" | "clarify" | "summarize",
  "detectedUnderstanding": true/false,
  "detectedMisconception": null | "description of misconception",
  "suggestedNextAction": "what the student should try next",
  "estimatedProgress": 0-100,
  "shouldEndSession": false,
  "celebrationMessage": null | "message if they solved it"
}`

/**
 * Build the complete system prompt with optional language instruction
 */
function buildSocraticTutorSystem(language?: 'en' | 'he'): string {
  const languageInstruction = buildLanguageInstruction(language)
  return SOCRATIC_TUTOR_SYSTEM_BASE + languageInstruction
}

const INITIAL_GREETING_PROMPT = `The student has just uploaded their homework question. Generate a warm, encouraging opening message.

QUESTION: {questionText}
TOPIC: {topic}
DIFFICULTY: {difficulty}/5
STUDENT COMFORT: {comfortLevel}
STUDENT'S INITIAL ATTEMPT: {initialAttempt}

Your opening should:
1. Acknowledge the question warmly
2. Validate that it's a good/interesting problem
3. If they shared an initial attempt, acknowledge what they tried
4. Ask about their comfort level OR ask a probing question to understand what they know
5. Set a supportive, non-judgmental tone

Keep it brief - 2-3 sentences max.`

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate the initial greeting when a session starts
 */
export async function generateInitialGreeting(context: TutorContext): Promise<TutorResponse> {
  const client = getAnthropicClient()

  const prompt = INITIAL_GREETING_PROMPT
    .replace('{questionText}', context.questionAnalysis.questionText)
    .replace('{topic}', context.questionAnalysis.topic)
    .replace('{difficulty}', String(context.questionAnalysis.difficultyEstimate))
    .replace('{comfortLevel}', context.session.comfort_level || 'unknown')
    .replace('{initialAttempt}', context.session.initial_attempt || 'none provided')

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSocraticTutorSystem(context.language),
    messages: [{ role: 'user', content: prompt }],
  })

  return parseTutorResponse(response)
}

/**
 * Generate a tutor response to a student message
 */
export async function generateTutorResponse(
  context: TutorContext,
  studentMessage: string
): Promise<TutorResponse> {
  const client = getAnthropicClient()

  // Build conversation context
  const contextPrompt = buildContextPrompt(context)

  // Build messages array from conversation history
  const messages: Anthropic.MessageParam[] = []

  // Add context as first user message
  messages.push({
    role: 'user',
    content: contextPrompt,
  })

  // Add a brief assistant acknowledgment
  messages.push({
    role: 'assistant',
    content: 'I understand. I\'m ready to help guide this student through the problem using Socratic questioning.',
  })

  // Add conversation history
  for (const msg of context.recentMessages.slice(-10)) {
    messages.push({
      role: msg.role === 'student' ? 'user' : 'assistant',
      content: msg.role === 'student'
        ? `STUDENT: ${msg.content}`
        : msg.content,
    })
  }

  // Add the new student message
  messages.push({
    role: 'user',
    content: `STUDENT: ${studentMessage}`,
  })

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSocraticTutorSystem(context.language),
    messages,
  })

  return parseTutorResponse(response)
}

/**
 * Check if the student's response indicates they've solved the problem
 */
export async function checkForSolution(
  context: TutorContext,
  studentAnswer: string
): Promise<{ solved: boolean; feedback: string }> {
  const client = getAnthropicClient()

  const prompt = `The student is working on this problem:
QUESTION: ${context.questionAnalysis.questionText}
TOPIC: ${context.questionAnalysis.topic}

They've provided this answer/response: "${studentAnswer}"

Has the student correctly solved the problem or arrived at the right understanding?

Return JSON: {"solved": true/false, "feedback": "brief feedback on their answer"}`

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const textContent = response.content.find((b) => b.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    return { solved: false, feedback: 'Could not evaluate response' }
  }

  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        solved: Boolean(parsed.solved),
        feedback: String(parsed.feedback || ''),
      }
    }
  } catch {
    // Fall through
  }

  return { solved: false, feedback: '' }
}

// ============================================================================
// Comfort Level Specific Responses
// ============================================================================

/**
 * Generate response tailored to comfort level
 */
export function getComfortLevelGuidance(comfortLevel: ComfortLevel): string {
  switch (comfortLevel) {
    case 'new':
      return `The student is new to this topic. Use:
- Simple language and everyday analogies
- Build from very basic concepts
- More worked examples and scaffolding
- Extra encouragement and patience`

    case 'some_idea':
      return `The student has some familiarity. Use:
- Guided discovery questions
- Connect to what they might already know
- Medium level of scaffolding
- Balance between guidance and independence`

    case 'just_stuck':
      return `The student understands but is stuck on something specific. Use:
- Targeted questions to identify the stuck point
- Minimal scaffolding - they're close
- Help them see what they might be missing
- Encourage them to trust their knowledge`

    default:
      return 'Adjust your approach based on the student\'s responses.'
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildContextPrompt(context: TutorContext): string {
  const { questionAnalysis, referenceAnalysis, session } = context

  let prompt = `TUTORING SESSION CONTEXT

HOMEWORK QUESTION:
${questionAnalysis.questionText}

SUBJECT: ${questionAnalysis.subject}
TOPIC: ${questionAnalysis.topic}
DIFFICULTY: ${questionAnalysis.difficultyEstimate}/5
REQUIRED CONCEPTS: ${questionAnalysis.requiredConcepts.join(', ')}
COMMON MISTAKES TO WATCH FOR: ${questionAnalysis.commonMistakes.join(', ')}
APPROACH: ${questionAnalysis.solutionApproach}

STUDENT INFO:
- Comfort level: ${session.comfort_level || 'not specified'}
- Initial attempt: ${session.initial_attempt || 'none provided'}
- Hints used: ${context.hintsUsed}/4
- Current progress: ${context.currentProgress}%

${getComfortLevelGuidance(session.comfort_level || 'some_idea')}`

  if (referenceAnalysis && referenceAnalysis.extractedContent) {
    prompt += `

REFERENCE MATERIALS PROVIDED:
${referenceAnalysis.extractedContent.slice(0, 2000)}

KEY FORMULAS: ${referenceAnalysis.keyFormulas.join(', ')}
KEY DEFINITIONS: ${referenceAnalysis.keyDefinitions.slice(0, 5).join('; ')}`
  }

  return prompt
}

function parseTutorResponse(response: Anthropic.Message): TutorResponse {
  const textContent = response.content.find((b) => b.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    return getDefaultResponse()
  }

  const text = textContent.text

  // Try to parse JSON response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        message: String(parsed.message || text),
        pedagogicalIntent: validateIntent(parsed.pedagogicalIntent),
        detectedUnderstanding: Boolean(parsed.detectedUnderstanding),
        detectedMisconception: parsed.detectedMisconception || null,
        suggestedNextAction: String(parsed.suggestedNextAction || ''),
        estimatedProgress: Math.min(100, Math.max(0, Number(parsed.estimatedProgress) || 0)),
        shouldEndSession: Boolean(parsed.shouldEndSession),
        celebrationMessage: parsed.celebrationMessage || undefined,
      }
    }
  } catch {
    // Fall through to plain text handling
  }

  // If no JSON, use the text as-is
  return {
    message: text,
    pedagogicalIntent: 'guide_next_step',
    detectedUnderstanding: false,
    detectedMisconception: null,
    suggestedNextAction: '',
    estimatedProgress: 0,
    shouldEndSession: false,
  }
}

function validateIntent(intent: unknown): PedagogicalIntent {
  const valid: PedagogicalIntent[] = [
    'probe_understanding',
    'give_hint',
    'celebrate',
    'clarify',
    'guide_next_step',
    'show_answer',
    'summarize',
  ]
  if (typeof intent === 'string' && valid.includes(intent as PedagogicalIntent)) {
    return intent as PedagogicalIntent
  }
  return 'guide_next_step'
}

function getDefaultResponse(): TutorResponse {
  return {
    message: "I'm here to help! Could you tell me more about what you're thinking?",
    pedagogicalIntent: 'probe_understanding',
    detectedUnderstanding: false,
    detectedMisconception: null,
    suggestedNextAction: 'Share your current thinking',
    estimatedProgress: 0,
    shouldEndSession: false,
  }
}
