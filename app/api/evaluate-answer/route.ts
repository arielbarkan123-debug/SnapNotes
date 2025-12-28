import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// =============================================================================
// Types
// =============================================================================

interface EvaluateAnswerRequest {
  question: string
  expectedAnswer: string
  userAnswer: string
  acceptableAnswers?: string[]
  context?: string // Optional lesson/topic context for better evaluation
}

interface EvaluationResult {
  isCorrect: boolean
  score: number // 0-100
  feedback: string
  evaluationMethod: 'exact' | 'fuzzy' | 'ai'
}

// =============================================================================
// Text Similarity Utilities
// =============================================================================

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
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
function similarityRatio(a: string, b: string): number {
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
 * Check if answer matches any acceptable answer with fuzzy matching
 */
function fuzzyMatch(
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
 * Evaluate answer using Claude AI
 */
async function evaluateWithAI(
  question: string,
  expectedAnswer: string,
  userAnswer: string,
  context?: string
): Promise<{ isCorrect: boolean; score: number; feedback: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const client = new Anthropic({ apiKey })

  // Minimal prompt for speed
  const prompt = `You are grading a student's answer. Be generous with partial credit.

Question: ${question}
Expected Answer: ${expectedAnswer}
Student's Answer: ${userAnswer}
${context ? `Context: ${context}` : ''}

Evaluate if the student's answer is correct. Consider:
- Same meaning with different words = CORRECT
- Key concepts present = PARTIAL CREDIT
- Minor typos/spelling = IGNORE
- Empty or completely wrong = INCORRECT

Respond with ONLY valid JSON (no markdown):
{"correct":true/false,"score":0-100,"feedback":"one brief sentence"}`

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-latest', // Fastest model
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }]
    })

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from AI')
    }

    // Parse JSON response
    const text = textContent.text.trim()
    // Remove any markdown code blocks if present
    const jsonText = text.replace(/```json\s*|\s*```/g, '').trim()
    const result = JSON.parse(jsonText)

    return {
      isCorrect: result.correct === true,
      score: typeof result.score === 'number' ? Math.max(0, Math.min(100, result.score)) : (result.correct ? 100 : 0),
      feedback: result.feedback || (result.correct ? 'Correct!' : 'Not quite right.')
    }
  } catch (error) {
    console.error('[EvaluateAnswer] AI evaluation failed:', error)
    // Fallback to fuzzy matching if AI fails
    throw error
  }
}

// =============================================================================
// Main Handler
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()

  try {
    const body: EvaluateAnswerRequest = await request.json()
    const { question, expectedAnswer, userAnswer, acceptableAnswers = [], context } = body

    // Validate input
    if (!question || !expectedAnswer) {
      return NextResponse.json(
        { error: 'Question and expected answer are required' },
        { status: 400 }
      )
    }

    // Handle empty user answer
    if (!userAnswer || !userAnswer.trim()) {
      return NextResponse.json({
        isCorrect: false,
        score: 0,
        feedback: 'No answer provided.',
        evaluationMethod: 'exact',
        evaluationTimeMs: Date.now() - startTime
      })
    }

    // Layer 1: Exact match (fastest)
    const normalizedUser = normalizeText(userAnswer)
    const normalizedExpected = normalizeText(expectedAnswer)

    if (normalizedUser === normalizedExpected) {
      return NextResponse.json({
        isCorrect: true,
        score: 100,
        feedback: 'Correct!',
        evaluationMethod: 'exact',
        evaluationTimeMs: Date.now() - startTime
      })
    }

    // Check acceptable answers for exact match
    for (const alt of acceptableAnswers) {
      if (normalizeText(alt) === normalizedUser) {
        return NextResponse.json({
          isCorrect: true,
          score: 100,
          feedback: 'Correct!',
          evaluationMethod: 'exact',
          evaluationTimeMs: Date.now() - startTime
        })
      }
    }

    // Layer 2: Fuzzy match (catches typos)
    const fuzzyResult = fuzzyMatch(userAnswer, expectedAnswer, acceptableAnswers, 0.85)

    if (fuzzyResult.matches) {
      return NextResponse.json({
        isCorrect: true,
        score: Math.round(fuzzyResult.similarity * 100),
        feedback: 'Correct! (minor spelling differences accepted)',
        evaluationMethod: 'fuzzy',
        evaluationTimeMs: Date.now() - startTime
      })
    }

    // Layer 3: AI evaluation for semantic matching
    try {
      const aiResult = await evaluateWithAI(question, expectedAnswer, userAnswer, context)

      return NextResponse.json({
        isCorrect: aiResult.isCorrect,
        score: aiResult.score,
        feedback: aiResult.feedback,
        evaluationMethod: 'ai',
        evaluationTimeMs: Date.now() - startTime
      })
    } catch (aiError) {
      // If AI fails, fall back to fuzzy result
      console.error('[EvaluateAnswer] AI failed, using fuzzy fallback:', aiError)

      // Use a lower threshold for "partial" credit
      if (fuzzyResult.similarity >= 0.6) {
        return NextResponse.json({
          isCorrect: false,
          score: Math.round(fuzzyResult.similarity * 100),
          feedback: 'Partially correct. Review the expected answer.',
          evaluationMethod: 'fuzzy',
          evaluationTimeMs: Date.now() - startTime
        })
      }

      return NextResponse.json({
        isCorrect: false,
        score: Math.round(fuzzyResult.similarity * 50), // Lower score for low similarity
        feedback: 'Not quite. Compare with the correct answer.',
        evaluationMethod: 'fuzzy',
        evaluationTimeMs: Date.now() - startTime
      })
    }
  } catch (error) {
    console.error('[EvaluateAnswer] Error:', error)
    return NextResponse.json(
      { error: 'Failed to evaluate answer' },
      { status: 500 }
    )
  }
}
