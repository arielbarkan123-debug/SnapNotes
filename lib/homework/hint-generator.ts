/**
 * Progressive Hint Generator
 * Implements the 4-level hint system + show answer option
 * Based on cognitive load theory and Khan Academy's approach
 */

import Anthropic from '@anthropic-ai/sdk'
import type { HintResponse, HintContext, HintLevel } from './types'

// ============================================================================
// Configuration
// ============================================================================

const AI_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 1500

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
// Language Support
// ============================================================================

/**
 * Build language-specific instruction for Hebrew support
 */
function buildLanguageInstruction(language?: 'en' | 'he'): string {
  if (language === 'he') {
    return `
CRITICAL LANGUAGE REQUIREMENT:
Generate ALL content in Hebrew (עברית).
- All hints must be in Hebrew
- All explanations must be in Hebrew
- All worked examples must be in Hebrew
- Keep mathematical notation standard (numbers, symbols, formulas)
- Use proper Hebrew educational terminology
`
  }
  return ''
}

// ============================================================================
// Hint Level Definitions
// ============================================================================

const HINT_LEVELS = {
  1: {
    name: 'Conceptual Nudge',
    description: 'Point to the relevant concept or formula without saying how to use it',
    prompt: `Generate a LEVEL 1 hint (Conceptual Nudge):
- Point the student toward the relevant concept, formula, or principle
- Ask a question like "What formula applies here?" or "What concept does this remind you of?"
- Do NOT give any steps or procedures
- Keep it to 1-2 sentences`,
  },
  2: {
    name: 'Strategic Guide',
    description: 'Suggest the first step without doing it',
    prompt: `Generate a LEVEL 2 hint (Strategic Guide):
- Suggest what the first step should be
- Ask them to identify variables, set up an equation, or recognize a pattern
- Example: "Start by identifying what a, b, and c are in this equation. Can you tell me which term is 'a'?"
- Do NOT do the step for them
- Keep it to 2-3 sentences`,
  },
  3: {
    name: 'Worked Example',
    description: 'Show a similar problem being solved',
    prompt: `Generate a LEVEL 3 hint (Worked Example):
- Create a SIMILAR but DIFFERENT problem
- Show the step-by-step solution for that similar problem
- End with: "Now try applying the same approach to your problem"
- Make the example simpler than their actual problem
- Keep it to 4-6 sentences with clear steps`,
  },
  4: {
    name: 'Step-by-Step Guide',
    description: 'Guide through their specific problem step by step',
    prompt: `Generate a LEVEL 4 hint (Step-by-Step Guide):
- Walk them through the FIRST 1-2 steps of their actual problem
- Ask them to complete each step before moving on
- Example: "Let's work through this together. First, we need to [step]. What do you get when you do that?"
- Still require them to do the work, but with heavy guidance
- Keep it to 3-4 sentences`,
  },
  5: {
    name: 'Show Answer',
    description: 'Reveal the complete solution (student chose this)',
    prompt: `The student has chosen to see the answer. Provide:
- The complete solution with all steps clearly explained
- WHY each step works (teach even while showing the answer)
- A gentle note that solving it themselves next time will be more effective for learning
- Keep it clear and educational`,
  },
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate a hint at the specified level
 */
export async function generateHint(context: HintContext): Promise<HintResponse> {
  const { requestedLevel, questionAnalysis, referenceAnalysis, previousHints, language } = context
  const client = getAnthropicClient()

  const levelConfig = HINT_LEVELS[requestedLevel]
  const languageInstruction = buildLanguageInstruction(language)

  // Build the prompt
  let prompt = `${languageInstruction}HOMEWORK QUESTION:
${questionAnalysis.questionText}

TOPIC: ${questionAnalysis.topic}
REQUIRED CONCEPTS: ${questionAnalysis.requiredConcepts.join(', ')}
SOLUTION APPROACH: ${questionAnalysis.solutionApproach}

`

  // Add reference material context if available
  if (referenceAnalysis?.keyFormulas.length) {
    prompt += `RELEVANT FORMULAS: ${referenceAnalysis.keyFormulas.join(', ')}\n\n`
  }

  // Add previous hints context
  if (previousHints.length > 0) {
    prompt += `PREVIOUS HINTS GIVEN:\n`
    for (const hint of previousHints) {
      prompt += `- Level ${hint.hintLevel}: ${hint.content.slice(0, 100)}...\n`
    }
    prompt += '\n'
  }

  // Add the hint level instruction
  prompt += `${levelConfig.prompt}

Return JSON:
{
  "content": "Your hint message",
  "relatedConcept": "The main concept this hint relates to",
  "workedExample": null | "The worked example if this is level 3"
}`

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: prompt }],
  })

  return parseHintResponse(response, requestedLevel)
}

/**
 * Get hint level description for UI
 */
export function getHintLevelInfo(level: HintLevel): {
  name: string
  description: string
  icon: string
} {
  const icons = ['💡', '🧭', '📝', '🤝', '✅']

  return {
    name: HINT_LEVELS[level].name,
    description: HINT_LEVELS[level].description,
    icon: icons[level - 1],
  }
}

/**
 * Determine the recommended next hint level based on student progress
 */
export function getRecommendedHintLevel(
  hintsUsed: number,
  currentProgress: number,
  recentMessages: { showsUnderstanding?: boolean }[]
): HintLevel {
  // If they're close to solving it, suggest lower hints
  if (currentProgress >= 70) {
    return 1
  }

  // If they've shown some understanding, stay at lower levels
  const recentUnderstanding = recentMessages
    .slice(-3)
    .some((m) => m.showsUnderstanding)

  if (recentUnderstanding) {
    return Math.min(2, hintsUsed + 1) as HintLevel
  }

  // Otherwise, suggest the next level up from what they've used
  return Math.min(4, hintsUsed + 1) as HintLevel
}

/**
 * Check if student should be gently encouraged to try without hints
 */
export function shouldEncourageAttempt(
  hintsUsed: number,
  timeSinceLastHint: number // in seconds
): { shouldEncourage: boolean; message: string } {
  // If they're asking for hints very quickly, encourage them to try
  if (timeSinceLastHint < 30 && hintsUsed > 0) {
    return {
      shouldEncourage: true,
      message:
        "Take a moment to think about the last hint. Sometimes the answer comes when we give our brain a little time to process!",
    }
  }

  // If they've used 3+ hints, encourage independent thinking
  if (hintsUsed >= 3) {
    return {
      shouldEncourage: true,
      message:
        "You've got a lot of guidance now. Before asking for more, try working through what you know. You might surprise yourself!",
    }
  }

  return { shouldEncourage: false, message: '' }
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseHintResponse(
  response: Anthropic.Message,
  level: HintLevel
): HintResponse {
  const textContent = response.content.find((b) => b.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    return getDefaultHint(level)
  }

  const text = textContent.text

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        hintLevel: level,
        content: String(parsed.content || text),
        isShowAnswer: level === 5,
        relatedConcept: parsed.relatedConcept || undefined,
        workedExample: parsed.workedExample || undefined,
      }
    }
  } catch {
    // Fall through
  }

  // Return the raw text if JSON parsing fails
  return {
    hintLevel: level,
    content: text,
    isShowAnswer: level === 5,
  }
}

function getDefaultHint(level: HintLevel): HintResponse {
  const defaults: Record<HintLevel, string> = {
    1: "Think about what concept or formula might apply here. What does this problem remind you of?",
    2: "Let's start with the basics. What's the first thing you need to identify or set up?",
    3: "Let me show you a similar problem to help illustrate the approach.",
    4: "Let's work through this together, step by step.",
    5: "Here's the complete solution with explanations.",
  }

  return {
    hintLevel: level,
    content: defaults[level],
    isShowAnswer: level === 5,
  }
}
