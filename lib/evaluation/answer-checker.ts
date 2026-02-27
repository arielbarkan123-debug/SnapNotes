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

// Stop words for keyword extraction (EN + HE)
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'that', 'this', 'these', 'those', 'it', 'its', 'and', 'but',
  'or', 'nor', 'not', 'so', 'very', 'just', 'about', 'up', 'down',
  'each', 'every', 'all', 'any', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'also',
  'we', 'us', 'our', 'you', 'your', 'they', 'them', 'their', 'he', 'him',
  'his', 'she', 'her', 'who', 'which', 'what', 'when', 'where', 'how',
  // Hebrew stop words
  'של', 'את', 'על', 'עם', 'הוא', 'היא', 'הם', 'הן', 'אני', 'אנחנו',
  'זה', 'זו', 'אלה', 'כי', 'אם', 'גם', 'או', 'לא', 'כל', 'היה',
  'אל', 'מן', 'לו', 'כמו', 'עד', 'בין', 'אך', 'רק', 'כן', 'אחר',
])

/**
 * Calculate keyword overlap score between a student answer and expected answer.
 * Used as AI fallback for open-ended questions where Levenshtein is useless.
 *
 * Uses precision-weighted scoring:
 * - Precision: what fraction of the student's keywords are found in the expected answer
 *   (measures: "is what the student wrote relevant/correct?")
 * - Recall: what fraction of the expected answer's keywords are found in the student answer
 *   (measures: "how much of the expected content did the student cover?")
 *
 * Weighted 70% precision / 30% recall, because a concise correct answer
 * should score well even if it doesn't cover every point in a long model answer.
 */
export function keywordOverlapScore(userAnswer: string, expectedAnswer: string): number {
  const extractKeywords = (text: string): Set<string> => {
    const normalized = normalizeText(text)
    const words = normalized.split(' ').filter(w => w.length > 2 && !STOP_WORDS.has(w))
    return new Set(words)
  }

  const expectedKeywords = extractKeywords(expectedAnswer)
  const userKeywords = extractKeywords(userAnswer)

  if (expectedKeywords.size === 0 || userKeywords.size === 0) return 0

  // Count how many expected keywords appear in student answer (recall)
  let recallMatches = 0
  for (const keyword of expectedKeywords) {
    if (userKeywords.has(keyword)) recallMatches++
  }

  // Count how many student keywords appear in expected answer (precision)
  let precisionMatches = 0
  for (const keyword of userKeywords) {
    if (expectedKeywords.has(keyword)) precisionMatches++
  }

  const recall = recallMatches / expectedKeywords.size
  const precision = precisionMatches / userKeywords.size

  // Weighted score: favor precision (correctness) over recall (coverage)
  return precision * 0.7 + recall * 0.3
}

/**
 * Detect if a question expects a long-form answer based on the expected answer length
 * and the length ratio between expected and user answers.
 * When true, fuzzy matching (Levenshtein) should be skipped entirely.
 */
export function isLongAnswerQuestion(expectedAnswer: string, userAnswer: string): boolean {
  const expectedLen = expectedAnswer.trim().length
  const userLen = userAnswer.trim().length

  // If expected answer is long (>150 chars), it's almost certainly open-ended
  if (expectedLen > 150) return true

  // If length ratio is extreme (>3:1), Levenshtein will always fail
  if (userLen > 0 && expectedLen / userLen > 3) return true

  return false
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
 * Detect if a question is asking for an explanation/description (open-ended conceptual).
 * Exported for testing.
 */
export function isExplanationQuestion(question: string): boolean {
  const lowerQ = question.toLowerCase().trim()

  // --- Exact prefix patterns (English) ---
  const startsWithPatterns = [
    'explain',
    'describe',
    'why ',
    'how does',
    'how do',
    'how is',
    'how are',
    'how can',
    'how would',
    'what is the difference',
    'what are the differences',
    'compare',
    'discuss',
    'define ',
    'summarize',
    'summarise',
    'outline ',
    'tell me about',
    'tell us about',
    'what can you tell',
    'what can you say',
    'what do you know',
    'what does it mean',
    'what is meant by',
    'in your own words',
  ]

  for (const pattern of startsWithPatterns) {
    if (lowerQ.startsWith(pattern)) return true
  }

  // --- "What is/are/was/were" questions ---
  // These are definitional/conceptual when not followed by a numeric expression
  // or a computational keyword like "answer", "value", "sum", etc.
  // e.g., "What is an inclined plane?" = explanation, "What is 2+2?" = NOT explanation
  // e.g., "What is the answer to 3+5?" = NOT explanation, "What is the value of x?" = NOT explanation
  const whatPatterns = [
    /^what (?:is|are|was|were) (?:a |an |the |)/,
    /^what does /,
    /^what did /,
  ]
  const computationalKeywords = [
    'answer', 'value', 'sum', 'product', 'result', 'total',
    'difference', 'quotient', 'remainder', 'square root',
    'area', 'perimeter', 'volume', 'length', 'width', 'height',
    'distance', 'speed', 'velocity', 'acceleration', 'mass',
    'weight', 'force', 'probability', 'percentage', 'ratio',
    'slope', 'intercept', 'derivative', 'integral', 'limit',
    'gcf', 'gcd', 'lcm', 'median', 'mean', 'mode', 'range',
  ]
  for (const regex of whatPatterns) {
    if (regex.test(lowerQ)) {
      const afterWhat = lowerQ.replace(regex, '').trim().replace(/[?!.]+$/, '')
      const looksNumeric = /^[\d\s+\-*/^().=]+$/.test(afterWhat)
      if (looksNumeric) continue
      // Check if it starts with a computational keyword (asking for a value, not an explanation)
      const looksComputational = computationalKeywords.some(kw => afterWhat.startsWith(kw))
      if (looksComputational) continue
      return true
    }
  }

  // --- Contains patterns (English) ---
  const includesPatterns = [
    'explain:',
    'describe:',
    'in your own words',
    'explain why',
    'explain how',
    'describe how',
    'describe the',
  ]
  for (const pattern of includesPatterns) {
    if (lowerQ.includes(pattern)) return true
  }

  // --- Hebrew patterns ---
  const hebrewPatterns = [
    'הסבר',        // explain
    'תאר',         // describe
    'למה ',        // why
    'מדוע',        // why (formal)
    'כיצד',        // how
    'השווה',       // compare
    'מה אתה יכול', // what can you
    'מה את יכולה', // what can you (fem)
    'ספר לי',      // tell me
    'ספרו',        // tell (plural)
    'מה זה',       // what is this
    'מהו',         // what is (masc)
    'מהי',         // what is (fem)
    'מה הם',       // what are they (masc)
    'מה הן',       // what are they (fem)
    'הגדר',        // define
    'דון ב',       // discuss
    'סכם',         // summarize
    'במילים שלך',  // in your own words
  ]
  for (const pattern of hebrewPatterns) {
    if (lowerQ.includes(pattern)) return true
  }

  return false
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

  let isExplanation = isExplanationQuestion(question)

  // Heuristic: If the expected answer is paragraph-length, it's almost certainly
  // an open-ended question regardless of how the question is phrased.
  if (!isExplanation && expectedAnswer.length > 150) {
    isExplanation = true
  }

  // Heuristic: "what" questions with multi-sentence expected answers are definitional/conceptual.
  if (!isExplanation && expectedAnswer.length > 80) {
    const lowerQ = question.toLowerCase().trim()
    if (lowerQ.startsWith('what ')) {
      isExplanation = true
    }
  }

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
- The "Expected Answer" below is a REFERENCE — the student may express the same ideas differently
- Same meaning with different words = CORRECT
- Key concepts present even if not all points covered = generous PARTIAL CREDIT (50-80)
- Minor typos/spelling = IGNORE
- Be generous: if the student demonstrates understanding of the core idea, give high partial credit
- A shorter answer that captures the main point is acceptable
- Do NOT penalize for missing numerical components unless the question explicitly asks for calculations`
  }

  const prompt = `You are grading a student's answer.${curriculumContext ? ' Apply curriculum-specific grading criteria.' : ''}${hebrewInstruction}
${curriculumInstructions}${gradingRubric}

Question: ${question}
${isExplanation ? 'Reference Answer (one possible correct answer):' : (expectedAnswer.length > 80 ? 'Reference Answer:' : 'Expected Answer:')} ${expectedAnswer}
Student's Answer: ${userAnswer}
${context ? `Context: ${context}` : ''}

${isExplanation
    ? `This is an explanation question. Grade based on conceptual understanding, not exact wording.
A short answer that shows understanding can still be correct.`
    : `Evaluate if the student's answer is correct. Consider:
- Same meaning with different words = CORRECT
- Key concepts present = generous PARTIAL CREDIT
- A correct core idea expressed differently than the reference = HIGH PARTIAL CREDIT (70+)
- Minor typos/spelling = IGNORE
- Empty or completely wrong = INCORRECT`}
${curriculumContext ? '- Apply curriculum command terms and assessment objectives' : ''}

Respond with ONLY valid JSON (no markdown):
{"correct":true/false,"score":0-100,"feedback":"${isExplanation ? '1-2 sentences: what was right and what could be improved' : 'one brief sentence'}${language === 'he' ? ' in Hebrew' : ''}"}`

  // More tokens for explanation questions to allow detailed feedback
  const maxTokens = isExplanation || topicType === 'conceptual' ? 400 : 200

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
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

  // Detect long-answer / open-ended questions
  const longAnswer = isLongAnswerQuestion(expectedAnswer, userAnswer)
  const explanationQ = isExplanationQuestion(question)

  // Layer 2: Fuzzy match — SKIP for long-answer questions (Levenshtein is useless
  // when expected answer is much longer than student answer)
  let fuzzyResult: { matches: boolean; similarity: number; matchedAnswer?: string } | null = null

  if (!longAnswer && !explanationQ) {
    fuzzyResult = fuzzyMatch(userAnswer, expectedAnswer, acceptableAnswers, 0.85)

    if (fuzzyResult.matches) {
      const fuzzyScore = Math.round(fuzzyResult.similarity * 100)
      return {
        isCorrect: true,
        score: fuzzyScore,
        feedback: 'Correct! (minor spelling differences accepted)',
        evaluationMethod: 'fuzzy',
      }
    }
  }

  // Layer 3: AI evaluation
  let topicType = classifyTopicType(context || question)

  // Override topic type for clearly open-ended questions to prevent the wrong
  // rubric (e.g., "mixed" asking for numerical accuracy on a conceptual question).
  if (topicType === 'mixed' || topicType === 'computational') {
    const looksOpenEnded =
      isExplanationQuestion(question) ||
      expectedAnswer.length > 150 ||
      (expectedAnswer.length > 80 && question.toLowerCase().trim().startsWith('what '))
    if (looksOpenEnded) {
      // Don't override if the expected answer is clearly numeric
      const expectedIsNumeric = parseNumericAnswer(expectedAnswer) !== null
      if (!expectedIsNumeric) {
        topicType = 'conceptual'
      }
    }
  }

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
    console.error('[evaluateAnswer] AI evaluation failed, falling back:', {
      error: error instanceof Error ? error.message : String(error),
      question: question.substring(0, 80),
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
      isLongAnswer: longAnswer,
      isExplanation: explanationQ,
    })

    // For long-answer / explanation questions: use keyword overlap instead of Levenshtein
    if (longAnswer || explanationQ) {
      const overlap = keywordOverlapScore(userAnswer, expectedAnswer)
      const overlapPercent = Math.round(overlap * 100)

      if (overlap >= 0.6) {
        return {
          isCorrect: true,
          score: Math.max(60, overlapPercent),
          feedback: 'Your answer covers the key concepts. AI grading was unavailable.',
          evaluationMethod: 'fuzzy_fallback',
        }
      }
      if (overlap >= 0.3) {
        return {
          isCorrect: false,
          score: Math.max(25, overlapPercent),
          feedback: 'Partially correct. Some key concepts are present. Compare with the model answer.',
          evaluationMethod: 'fuzzy_fallback',
        }
      }
      return {
        isCorrect: false,
        score: Math.max(5, overlapPercent),
        feedback: 'Review the model answer for key concepts you may have missed.',
        evaluationMethod: 'fuzzy_fallback',
      }
    }

    // For short-answer questions: use Levenshtein fuzzy result (still valid for short strings)
    const fuzzy = fuzzyResult || fuzzyMatch(userAnswer, expectedAnswer, acceptableAnswers, 0.85)
    const partialScore = Math.round(fuzzy.similarity * 100)

    if (fuzzy.similarity >= 0.85) {
      return {
        isCorrect: true,
        score: partialScore,
        feedback: 'Correct! (minor spelling differences accepted)',
        evaluationMethod: 'fuzzy_fallback',
      }
    }

    if (fuzzy.similarity >= 0.6) {
      return {
        isCorrect: false,
        score: partialScore,
        feedback: 'Partially correct. Review the expected answer.',
        evaluationMethod: 'fuzzy_fallback',
      }
    }

    return {
      isCorrect: false,
      score: partialScore, // Fixed: was `similarity * 50` (halved), now `similarity * 100`
      feedback: 'Not quite. Compare with the correct answer.',
      evaluationMethod: 'fuzzy_fallback',
    }
  }
}
