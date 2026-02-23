// =============================================================================
// Shared Answer Evaluation Utility
// Extracted from /api/evaluate-answer — used by both the API route and
// the practice session manager for consistent answer checking.
// =============================================================================

import Anthropic from '@anthropic-ai/sdk'
import { classifyTopicType } from '@/lib/ai/content-classifier'

// =============================================================================
// Types
// =============================================================================

export interface EvaluateAnswerParams {
  question: string
  expectedAnswer: string
  userAnswer: string
  acceptableAnswers?: string[]
  context?: string
  /** Curriculum context string for AI grading */
  curriculumContext?: string
  /** Language code for AI feedback (default: 'en') */
  language?: string
}

export interface EvaluationResult {
  isCorrect: boolean
  score: number // 0-100
  feedback: string
  evaluationMethod: 'numeric' | 'exact' | 'fuzzy' | 'ai' | 'fuzzy_fallback'
}

// =============================================================================
// Text Similarity Utilities
// =============================================================================

/**
 * Normalize text for comparison
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculate similarity ratio between two strings (0-1)
 */
export function similarityRatio(a: string, b: string): number {
  const normalizedA = normalizeText(a)
  const normalizedB = normalizeText(b)

  if (normalizedA === normalizedB) return 1
  if (!normalizedA || !normalizedB) return 0

  const maxLength = Math.max(normalizedA.length, normalizedB.length)
  if (maxLength === 0) return 1

  const distance = levenshteinDistance(normalizedA, normalizedB)
  return 1 - distance / maxLength
}

/**
 * Parse a string as a number, handling various formats
 * Returns null if the string is not a valid number
 */
export function parseNumericAnswer(text: string): number | null {
  if (!text || typeof text !== 'string') return null

  // Clean the text
  const cleaned = text.trim()
    .replace(/,/g, '') // Remove thousands separators
    .replace(/\s+/g, '') // Remove spaces
    .replace(/^[$€£¥₹]/g, '') // Remove currency symbols at start
    .replace(/[$€£¥₹]$/g, '') // Remove currency symbols at end
    .replace(/^[+-]?\s*/, match => match.trim()) // Clean up sign

  // Try to extract a number
  const numMatch = cleaned.match(/^[+-]?(\d+\.?\d*|\.\d+)$/)
  if (!numMatch) return null

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Check if two numeric answers are equal within tolerance
 */
export function numericMatch(
  userAnswer: string,
  correctAnswer: string,
  acceptableAnswers: string[] = [],
  tolerance: number = 0.001
): { matches: boolean; method: 'numeric'; userValue?: number; correctValue?: number } | null {
  const userNum = parseNumericAnswer(userAnswer)
  if (userNum === null) return null

  const correctNum = parseNumericAnswer(correctAnswer)
  if (correctNum !== null) {
    const absTolerance = Math.max(tolerance, Math.abs(correctNum) * tolerance)
    if (Math.abs(userNum - correctNum) <= absTolerance) {
      return { matches: true, method: 'numeric', userValue: userNum, correctValue: correctNum }
    }
  }

  for (const alt of acceptableAnswers) {
    const altNum = parseNumericAnswer(alt)
    if (altNum !== null) {
      const absTolerance = Math.max(tolerance, Math.abs(altNum) * tolerance)
      if (Math.abs(userNum - altNum) <= absTolerance) {
        return { matches: true, method: 'numeric', userValue: userNum, correctValue: altNum }
      }
    }
  }

  if (correctNum !== null) {
    return { matches: false, method: 'numeric', userValue: userNum, correctValue: correctNum }
  }

  return null
}

/**
 * Check if answer matches any acceptable answer with fuzzy matching
 */
export function fuzzyMatch(
  userAnswer: string,
  correctAnswer: string,
  acceptableAnswers: string[] = [],
  threshold: number = 0.85
): { matches: boolean; similarity: number; matchedAnswer?: string } {
  const allAnswers = [correctAnswer, ...acceptableAnswers].filter(Boolean)

  let bestSimilarity = 0
  let matchedAnswer: string | undefined

  for (const answer of allAnswers) {
    const similarity = similarityRatio(userAnswer, answer)
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity
      matchedAnswer = answer
    }
  }

  return {
    matches: bestSimilarity >= threshold,
    similarity: bestSimilarity,
    matchedAnswer: bestSimilarity >= threshold ? matchedAnswer : undefined
  }
}

// =============================================================================
// AI Evaluation
// =============================================================================

/**
 * Detect if a question is asking for an explanation/description (open-ended conceptual)
 */
function isExplanationQuestion(question: string): boolean {
  const lowerQ = question.toLowerCase()
  return (
    lowerQ.startsWith('explain') ||
    lowerQ.startsWith('describe') ||
    lowerQ.startsWith('why ') ||
    lowerQ.startsWith('how does') ||
    lowerQ.startsWith('how do') ||
    lowerQ.startsWith('what is the difference') ||
    lowerQ.startsWith('compare') ||
    lowerQ.includes('explain:') ||
    lowerQ.includes('describe:') ||
    // Hebrew equivalents
    lowerQ.includes('הסבר') ||
    lowerQ.includes('תאר') ||
    lowerQ.includes('למה ') ||
    lowerQ.includes('מדוע') ||
    lowerQ.includes('כיצד') ||
    lowerQ.includes('השווה')
  )
}

/**
 * Evaluate answer using Claude AI
 */
export async function evaluateWithAI(
  question: string,
  expectedAnswer: string,
  userAnswer: string,
  context?: string,
  curriculumContext?: string,
  language: string = 'en',
  topicType?: 'computational' | 'conceptual' | 'mixed'
): Promise<{ isCorrect: boolean; score: number; feedback: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const client = new Anthropic({ apiKey })

  const isExplanation = isExplanationQuestion(question)

  const curriculumInstructions = curriculumContext
    ? `
${curriculumContext}

Use the curriculum context above to:
- Apply appropriate command terms and assessment criteria
- Grade according to the curriculum's standards
- Consider assessment objectives when evaluating depth of understanding
`
    : ''

  const hebrewInstruction = language === 'he'
    ? '\nCRITICAL: Write ALL feedback in Hebrew (עברית). The feedback field must be in Hebrew.'
    : ''

  let gradingRubric = ''
  if (isExplanation || topicType === 'conceptual') {
    gradingRubric = `
Grading Rubric (Explanation/Conceptual):
- The "Expected Answer" below is a REFERENCE answer, not the only correct answer
- The student does NOT need to match it word-for-word or cover every point
- Evaluate whether the student demonstrates genuine understanding of the core concept
- Key concepts present and used correctly = high score
- Correct reasoning with different wording = CORRECT
- Partial understanding = PARTIAL CREDIT (40-70)
- Vague but on-topic = low partial credit (20-40)
- Be generous: if the student clearly "gets it", mark correct even if brief
- Feedback should be constructive: tell the student what they got right AND what they could add`
  } else if (topicType === 'computational') {
    gradingRubric = `
Grading Rubric (Computational):
- Numeric precision: answer must match expected value (minor rounding OK)
- Correct method: partial credit if approach is right but calculation has errors
- Show-work style: credit for correct intermediate steps even if final answer is wrong
- Units matter: missing or wrong units = partial credit only`
  } else if (topicType === 'mixed') {
    gradingRubric = `
Grading Rubric (Mixed):
- Check both numerical accuracy AND conceptual understanding
- Partial credit for correct reasoning with calculation errors
- Partial credit for correct numbers without understanding shown`
  } else {
    gradingRubric = `
Grading Rubric (General):
- Same meaning with different words = CORRECT
- Key concepts present = PARTIAL CREDIT
- Minor typos/spelling = IGNORE
- Be generous with partial credit for understanding shown`
  }

  const prompt = `You are grading a student's answer.${curriculumContext ? ' Apply curriculum-specific grading criteria.' : ''}${hebrewInstruction}
${curriculumInstructions}${gradingRubric}

Question: ${question}
${isExplanation ? 'Reference Answer (one possible correct answer):' : 'Expected Answer:'} ${expectedAnswer}
Student's Answer: ${userAnswer}
${context ? `Context: ${context}` : ''}

${isExplanation
    ? `This is an explanation question. Grade based on conceptual understanding, not exact wording.
A short answer that shows understanding can still be correct.`
    : `Evaluate if the student's answer is correct. Consider:
- Same meaning with different words = CORRECT
- Key concepts present = PARTIAL CREDIT
- Minor typos/spelling = IGNORE
- Empty or completely wrong = INCORRECT`}
${curriculumContext ? '- Apply curriculum command terms and assessment objectives' : ''}

Respond with ONLY valid JSON (no markdown):
{"correct":true/false,"score":0-100,"feedback":"${isExplanation ? '1-2 sentences: what was right and what could be improved' : 'one brief sentence'}${language === 'he' ? ' in Hebrew' : ''}"}`

  // More tokens for explanation questions to allow detailed feedback
  const maxTokens = isExplanation || topicType === 'conceptual' ? 400 : 200

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })

    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI')
    }

    const text = textContent.text.trim()
    const jsonText = text.replace(/```json\s*|\s*```/g, '').trim()
    const result = JSON.parse(jsonText)

    return {
      isCorrect: result.correct === true,
      score: typeof result.score === 'number' ? Math.max(0, Math.min(100, result.score)) : (result.correct ? 100 : 0),
      feedback: result.feedback || (result.correct ? 'Correct!' : 'Not quite right.')
    }
  } catch (error) {
    console.error('[evaluateWithAI] AI evaluation failed:', {
      error: error instanceof Error ? error.message : String(error),
      question: question.substring(0, 100),
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    })
    throw error
  }
}

// =============================================================================
// Main Evaluation Function
// =============================================================================

/**
 * Evaluate a student's answer through multiple layers:
 * 1. Numeric match (most reliable for math)
 * 2. Exact text match (fast for text)
 * 3. Fuzzy match (catches typos)
 * 4. AI evaluation (semantic matching)
 *
 * Use this from both API routes and server-side code (e.g., session-manager).
 */
export async function evaluateAnswer(params: EvaluateAnswerParams): Promise<EvaluationResult> {
  const {
    question,
    expectedAnswer,
    userAnswer,
    acceptableAnswers = [],
    context,
    curriculumContext,
    language = 'en',
  } = params

  // Handle empty user answer
  if (!userAnswer || !userAnswer.trim()) {
    return {
      isCorrect: false,
      score: 0,
      feedback: 'No answer provided.',
      evaluationMethod: 'exact',
    }
  }

  // Layer 0: Numeric match
  const numericResult = numericMatch(userAnswer, expectedAnswer, acceptableAnswers)
  if (numericResult !== null) {
    if (numericResult.matches) {
      return {
        isCorrect: true,
        score: 100,
        feedback: 'Correct!',
        evaluationMethod: 'numeric',
      }
    } else {
      return {
        isCorrect: false,
        score: 0,
        feedback: `Incorrect. Your answer was ${numericResult.userValue}, but the correct answer is ${numericResult.correctValue}.`,
        evaluationMethod: 'numeric',
      }
    }
  }

  // Layer 1: Exact match
  const normalizedUser = normalizeText(userAnswer)
  const normalizedExpected = normalizeText(expectedAnswer)

  if (normalizedUser === normalizedExpected) {
    return {
      isCorrect: true,
      score: 100,
      feedback: 'Correct!',
      evaluationMethod: 'exact',
    }
  }

  for (const alt of acceptableAnswers) {
    if (normalizeText(alt) === normalizedUser) {
      return {
        isCorrect: true,
        score: 100,
        feedback: 'Correct!',
        evaluationMethod: 'exact',
      }
    }
  }

  // Layer 2: Fuzzy match
  const fuzzyResult = fuzzyMatch(userAnswer, expectedAnswer, acceptableAnswers, 0.85)

  if (fuzzyResult.matches) {
    const fuzzyScore = Math.round(fuzzyResult.similarity * 100)
    return {
      isCorrect: true,
      score: fuzzyScore,
      feedback: 'Correct! (minor spelling differences accepted)',
      evaluationMethod: 'fuzzy',
    }
  }

  // Layer 3: AI evaluation
  const topicType = classifyTopicType(context || question)

  try {
    const aiResult = await evaluateWithAI(
      question,
      expectedAnswer,
      userAnswer,
      context,
      curriculumContext,
      language,
      topicType
    )

    return {
      isCorrect: aiResult.isCorrect,
      score: aiResult.score,
      feedback: aiResult.feedback,
      evaluationMethod: 'ai',
    }
  } catch (error) {
    // Log the failure so we can diagnose in Vercel logs
    console.error('[evaluateAnswer] AI evaluation failed, falling back to fuzzy:', {
      error: error instanceof Error ? error.message : String(error),
      question: question.substring(0, 80),
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    })

    // Fall back to fuzzy result with distinct method tag
    // Respect the same 85% threshold as normal fuzzy matching
    const partialScore = Math.round(fuzzyResult.similarity * 100)

    if (fuzzyResult.similarity >= 0.85) {
      return {
        isCorrect: true,
        score: partialScore,
        feedback: 'Correct! (minor spelling differences accepted)',
        evaluationMethod: 'fuzzy_fallback',
      }
    }

    if (fuzzyResult.similarity >= 0.6) {
      return {
        isCorrect: false,
        score: partialScore,
        feedback: 'Partially correct. Review the expected answer.',
        evaluationMethod: 'fuzzy_fallback',
      }
    }

    return {
      isCorrect: false,
      score: Math.round(fuzzyResult.similarity * 50),
      feedback: 'Not quite. Compare with the correct answer.',
      evaluationMethod: 'fuzzy_fallback',
    }
  }
}
