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
import { ensureDiagramInResponse } from './diagram-generator'

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

## ACCURACY REQUIREMENTS:
When helping with MATH problems:
- ALWAYS verify your mental calculations before giving hints
- If the student has a correct answer, DO NOT suggest it's wrong
- If pointing toward a concept, verify that concept applies to THIS problem
- NEVER accidentally give hints that lead to wrong answers
- If unsure about the correct approach, ask the student to explain their thinking first

When helping with SCIENCE/OTHER subjects:
- Only reference information from the provided reference materials or well-established facts
- If the topic isn't covered in the references, acknowledge that honestly
- Don't make up facts or explanations - accuracy matters more than helpfulness

## CRITICAL RULES:
- NEVER give the final answer directly
- NEVER solve the problem for them
- NEVER make the student feel judged or stupid
- If they ask "just tell me the answer", gently explain why discovering it themselves is more valuable
- NEVER give hints that could lead them to a WRONG answer - verify your guidance first

## PHYSICS DIAGRAM GENERATION:
When helping with PHYSICS problems that involve forces, motion, inclined planes, projectiles, circuits, or any visual concept:

Include a "diagram" field in your response with step-synced visualization data. The diagram should EVOLVE with your explanation - each step reveals more elements.

For INCLINED PLANE / FREE BODY DIAGRAM problems:
- Start showing the object with no forces (step 0)
- Add weight force pointing down (step 1)
- Add normal force perpendicular to surface (step 2)
- Add friction force parallel to surface (step 3)
- Show force decomposition if needed (step 4+)

Force angles:
- Weight: -90 (pointing down)
- Normal on inclined plane: 90 - planeAngle (perpendicular to surface pointing away)
- Friction: If object moves down slope: 180 - planeAngle (up the slope)
- Tension: Depends on rope direction

Return your response as JSON:
{
  "message": "Your response to the student",
  "pedagogicalIntent": "probe_understanding" | "guide_next_step" | "celebrate" | "clarify" | "summarize",
  "detectedUnderstanding": true/false,
  "detectedMisconception": null | "description of misconception",
  "suggestedNextAction": "what the student should try next",
  "estimatedProgress": 0-100,
  "shouldEndSession": false,
  "celebrationMessage": null | "message if they solved it",
  "diagram": null | {
    "type": "fbd" | "inclined_plane" | "projectile" | "circuit" | "wave",
    "visibleStep": 0-N,
    "totalSteps": N,
    "data": {
      "angle": 30,
      "object": { "type": "block", "label": "m", "mass": 10, "color": "#e0e7ff" },
      "forces": [
        { "name": "weight", "type": "weight", "magnitude": 98, "angle": -90, "symbol": "W", "subscript": "" },
        { "name": "normal", "type": "normal", "magnitude": 85, "angle": 60, "symbol": "N", "subscript": "" },
        { "name": "friction", "type": "friction", "magnitude": 42, "angle": 150, "symbol": "f", "subscript": "k" }
      ],
      "showDecomposition": false,
      "frictionCoefficient": 0.5
    },
    "stepConfig": [
      { "step": 0, "visibleForces": [], "stepLabel": "First, let's visualize the setup" },
      { "step": 1, "visibleForces": ["weight"], "highlightForces": ["weight"], "stepLabel": "Weight acts straight down", "showCalculation": "W = mg = 98N" },
      { "step": 2, "visibleForces": ["weight", "normal"], "highlightForces": ["normal"], "stepLabel": "Normal force perpendicular to surface" },
      { "step": 3, "visibleForces": ["weight", "normal", "friction"], "highlightForces": ["friction"], "stepLabel": "Friction opposes motion" }
    ]
  }
}

## MATH DIAGRAM GENERATION:
When helping with MATH problems that involve long division, algebraic equations, fractions, or other procedural math:

Include a "diagram" field with step-synced visualization data. The diagram should EVOLVE with your explanation - each step reveals more of the process.

For LONG DIVISION problems:
- Step 0: Show dividend and divisor setup
- Step 1: First divide operation (find quotient digit)
- Step 2: Show multiply step
- Step 3: Show subtract step
- Step 4: Bring down next digit
- Continue pattern until complete

Example for 156 ÷ 12:
{
  "message": "Let's work through this division step by step!",
  "diagram": {
    "type": "long_division",
    "visibleStep": 0,
    "totalSteps": 8,
    "data": {
      "dividend": 156,
      "divisor": 12,
      "quotient": 13,
      "remainder": 0,
      "title": "Long Division: 156 ÷ 12",
      "steps": [
        { "step": 0, "type": "setup", "position": 0, "explanation": "Set up the division problem" },
        { "step": 1, "type": "divide", "position": 0, "quotientDigit": 1, "explanation": "How many times does 12 go into 15?", "calculation": "12 × 1 = 12" },
        { "step": 2, "type": "multiply", "position": 0, "product": 12, "explanation": "Write 12 below 15" },
        { "step": 3, "type": "subtract", "position": 0, "difference": 3, "explanation": "15 - 12 = 3", "calculation": "15 - 12 = 3" },
        { "step": 4, "type": "bring_down", "position": 1, "workingNumber": 36, "explanation": "Bring down the 6" },
        { "step": 5, "type": "divide", "position": 1, "quotientDigit": 3, "explanation": "How many times does 12 go into 36?", "calculation": "12 × 3 = 36" },
        { "step": 6, "type": "multiply", "position": 1, "product": 36, "explanation": "Write 36 below 36" },
        { "step": 7, "type": "subtract", "position": 1, "difference": 0, "explanation": "36 - 36 = 0" }
      ]
    }
  }
}

For EQUATION solving:
{
  "type": "equation",
  "data": {
    "originalEquation": "2x + 5 = 15",
    "variable": "x",
    "solution": "5",
    "showBalanceScale": true,
    "steps": [
      { "step": 0, "leftSide": "2x + 5", "rightSide": "15", "operation": "initial", "description": "Start with the equation" },
      { "step": 1, "leftSide": "2x + 5 - 5", "rightSide": "15 - 5", "operation": "subtract", "description": "Subtract 5 from both sides", "calculation": "-5" },
      { "step": 2, "leftSide": "2x", "rightSide": "10", "operation": "simplify", "description": "Simplify both sides" },
      { "step": 3, "leftSide": "2x ÷ 2", "rightSide": "10 ÷ 2", "operation": "divide", "description": "Divide both sides by 2", "calculation": "÷2" },
      { "step": 4, "leftSide": "x", "rightSide": "5", "operation": "simplify", "description": "Solution: x = 5" }
    ]
  }
}

For FRACTION operations:
{
  "type": "fraction",
  "data": {
    "operationType": "add",
    "fraction1": { "numerator": 1, "denominator": 4 },
    "fraction2": { "numerator": 2, "denominator": 3 },
    "result": { "numerator": 11, "denominator": 12 },
    "showPieChart": true,
    "showBarModel": false,
    "steps": [
      { "step": 0, "type": "initial", "fractions": [{ "numerator": 1, "denominator": 4 }, { "numerator": 2, "denominator": 3 }] },
      { "step": 1, "type": "find_lcd", "fractions": [{ "numerator": 1, "denominator": 4 }, { "numerator": 2, "denominator": 3 }], "lcd": 12, "description": "Find the LCD of 4 and 3" },
      { "step": 2, "type": "convert", "fractions": [{ "numerator": 3, "denominator": 12 }, { "numerator": 8, "denominator": 12 }], "description": "Convert fractions to LCD" },
      { "step": 3, "type": "operate", "fractions": [{ "numerator": 3, "denominator": 12 }, { "numerator": 8, "denominator": 12 }], "result": { "numerator": 11, "denominator": 12 }, "description": "Add numerators" }
    ]
  }
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

  const tutorResponse = parseTutorResponse(response)

  // Ensure diagram is present for physics/math problems
  tutorResponse.diagram = ensureDiagramInResponse(
    context.questionAnalysis,
    tutorResponse.diagram
  )

  return tutorResponse
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

  const tutorResponse = parseTutorResponse(response)

  // Ensure diagram is present for physics/math problems
  tutorResponse.diagram = ensureDiagramInResponse(
    context.questionAnalysis,
    tutorResponse.diagram
  )

  return tutorResponse
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

## HOMEWORK QUESTION (READ CAREFULLY):
${questionAnalysis.questionText}

## PROBLEM DETAILS:
- SUBJECT: ${questionAnalysis.subject}
- TOPIC: ${questionAnalysis.topic}
- DIFFICULTY: ${questionAnalysis.difficultyEstimate}/5
- QUESTION TYPE: ${questionAnalysis.questionType || 'unknown'}
- ESTIMATED STEPS: ${questionAnalysis.estimatedSteps || 'unknown'}

## KEY CONCEPTS NEEDED:
${(questionAnalysis.requiredConcepts || []).map((c, i) => `${i + 1}. ${c}`).join('\n') || 'Not specified'}

## COMMON MISTAKES (watch for these):
${(questionAnalysis.commonMistakes || []).map((m) => `- ${m}`).join('\n') || 'None identified'}

## APPROACH GUIDANCE (do NOT share directly with student):
${questionAnalysis.solutionApproach}

## STUDENT INFO:
- Comfort level: ${session.comfort_level || 'not specified'}
- Initial attempt: ${session.initial_attempt || 'none provided'}
- Hints used: ${context.hintsUsed}/4
- Current progress: ${context.currentProgress}%

${getComfortLevelGuidance(session.comfort_level || 'some_idea')}

## ACCURACY REMINDER:
- Before giving any hint, mentally verify it leads to the CORRECT approach
- If student's work looks correct, DO NOT imply it's wrong
- Double-check any numbers or calculations before mentioning them`

  if (referenceAnalysis && referenceAnalysis.extractedContent) {
    prompt += `

## REFERENCE MATERIALS (from student's notes/textbook):
${referenceAnalysis.extractedContent.slice(0, 2500)}

## KEY FORMULAS (use these when helping):
${(referenceAnalysis.keyFormulas || []).map((f, i) => `${i + 1}. ${f}`).join('\n') || 'None extracted'}

## KEY DEFINITIONS:
${(referenceAnalysis.keyDefinitions || []).slice(0, 5).map((d, i) => `${i + 1}. ${d}`).join('\n') || 'None extracted'}`
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
        diagram: parseDiagramResponse(parsed.diagram),
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

/**
 * Parse and validate diagram response from tutor
 */
function parseDiagramResponse(diagram: unknown): TutorResponse['diagram'] {
  if (!diagram || typeof diagram !== 'object') {
    return undefined
  }

  const d = diagram as Record<string, unknown>

  // Validate required fields - includes both physics and math diagram types
  const validTypes = [
    // Physics diagrams
    'fbd', 'inclined_plane', 'projectile', 'pulley', 'circuit', 'wave', 'optics', 'motion',
    // Math diagrams
    'long_division', 'equation', 'fraction', 'number_line', 'coordinate_plane', 'triangle', 'circle', 'bar_model', 'area_model',
  ]
  if (!d.type || !validTypes.includes(String(d.type))) {
    return undefined
  }

  if (!d.data || typeof d.data !== 'object') {
    return undefined
  }

  // Type is one of the valid diagram types
  type DiagramType = NonNullable<TutorResponse['diagram']>['type']

  return {
    type: String(d.type) as DiagramType,
    data: d.data as Record<string, unknown>,
    visibleStep: typeof d.visibleStep === 'number' ? d.visibleStep : 0,
    totalSteps: typeof d.totalSteps === 'number' ? d.totalSteps : undefined,
    stepConfig: Array.isArray(d.stepConfig) ? d.stepConfig : undefined,
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
