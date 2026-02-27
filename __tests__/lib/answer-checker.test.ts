import {
  normalizeText,
  levenshteinDistance,
  similarityRatio,
  parseNumericAnswer,
  numericMatch,
  fuzzyMatch,
  evaluateAnswer,
  keywordOverlapScore,
  isExplanationQuestion,
  isLongAnswerQuestion,
} from '@/lib/evaluation/answer-checker'

// =============================================================================
// normalizeText
// =============================================================================

describe('normalizeText', () => {
  it('lowercases and trims', () => {
    expect(normalizeText('  HELLO World  ')).toBe('hello world')
  })

  it('removes punctuation', () => {
    expect(normalizeText('Paris.')).toBe('paris')
    expect(normalizeText('Hello, World!')).toBe('hello world')
    expect(normalizeText("it's")).toBe('its')
  })

  it('normalizes whitespace', () => {
    expect(normalizeText('hello   world')).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(normalizeText('')).toBe('')
  })
})

// =============================================================================
// levenshteinDistance
// =============================================================================

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0)
  })

  it('returns correct distance for single edit', () => {
    expect(levenshteinDistance('hello', 'helo')).toBe(1)
    expect(levenshteinDistance('paris', 'pris')).toBe(1)
  })

  it('returns correct distance for multiple edits', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3)
  })

  it('handles empty strings', () => {
    expect(levenshteinDistance('', 'hello')).toBe(5)
    expect(levenshteinDistance('hello', '')).toBe(5)
  })
})

// =============================================================================
// similarityRatio
// =============================================================================

describe('similarityRatio', () => {
  it('returns 1 for identical normalized text', () => {
    expect(similarityRatio('Hello', 'hello')).toBe(1)
  })

  it('returns high similarity for minor typos', () => {
    const ratio = similarityRatio('Paris', 'Pris')
    expect(ratio).toBeGreaterThan(0.7)
  })

  it('returns 0 for completely different strings', () => {
    const ratio = similarityRatio('abc', 'xyz')
    expect(ratio).toBeLessThan(0.5)
  })
})

// =============================================================================
// parseNumericAnswer
// =============================================================================

describe('parseNumericAnswer', () => {
  it('parses integers', () => {
    expect(parseNumericAnswer('42')).toBe(42)
  })

  it('parses decimals', () => {
    expect(parseNumericAnswer('3.14')).toBe(3.14)
  })

  it('parses negative numbers', () => {
    expect(parseNumericAnswer('-7')).toBe(-7)
  })

  it('removes thousands separators', () => {
    expect(parseNumericAnswer('1,000')).toBe(1000)
  })

  it('removes currency symbols', () => {
    expect(parseNumericAnswer('$99')).toBe(99)
  })

  it('returns null for non-numeric text', () => {
    expect(parseNumericAnswer('hello')).toBeNull()
    expect(parseNumericAnswer('')).toBeNull()
  })
})

// =============================================================================
// numericMatch
// =============================================================================

describe('numericMatch', () => {
  it('matches equal numbers', () => {
    const result = numericMatch('42', '42')
    expect(result).not.toBeNull()
    expect(result!.matches).toBe(true)
  })

  it('matches numbers within tolerance', () => {
    const result = numericMatch('3.14', '3.141')
    expect(result).not.toBeNull()
    expect(result!.matches).toBe(true)
  })

  it('does not match different numbers', () => {
    const result = numericMatch('42', '43')
    expect(result).not.toBeNull()
    expect(result!.matches).toBe(false)
  })

  it('returns null for non-numeric user answer', () => {
    const result = numericMatch('hello', '42')
    expect(result).toBeNull()
  })

  it('checks acceptable answers', () => {
    const result = numericMatch('7', '8', ['7', '7.0'])
    expect(result).not.toBeNull()
    expect(result!.matches).toBe(true)
  })
})

// =============================================================================
// fuzzyMatch
// =============================================================================

describe('fuzzyMatch', () => {
  it('matches exact text', () => {
    const result = fuzzyMatch('Paris', 'Paris')
    expect(result.matches).toBe(true)
    expect(result.similarity).toBe(1)
  })

  it('matches with minor typo on longer words', () => {
    // "photosynthesis" vs "photosynthesiz" — similarity 13/14 ≈ 0.93
    const result = fuzzyMatch('photosynthesiz', 'photosynthesis')
    expect(result.matches).toBe(true)
  })

  it('does not match short words with a typo (too low similarity)', () => {
    // "Pariss" vs "Paris" — similarity 5/6 ≈ 0.83, below 0.85 threshold
    const result = fuzzyMatch('Pariss', 'Paris')
    expect(result.matches).toBe(false)
  })

  it('does not match very different strings', () => {
    const result = fuzzyMatch('London', 'Paris')
    expect(result.matches).toBe(false)
  })

  it('checks acceptable answers', () => {
    const result = fuzzyMatch('colour', 'color', ['colour'])
    expect(result.matches).toBe(true)
  })
})

// =============================================================================
// evaluateAnswer (sync layers only — no AI)
// =============================================================================

describe('evaluateAnswer', () => {
  it('returns incorrect for empty answer', async () => {
    const result = await evaluateAnswer({
      question: 'What is 2+2?',
      expectedAnswer: '4',
      userAnswer: '',
    })
    expect(result.isCorrect).toBe(false)
    expect(result.score).toBe(0)
  })

  it('matches numeric answers', async () => {
    const result = await evaluateAnswer({
      question: 'What is 2+2?',
      expectedAnswer: '4',
      userAnswer: '4',
    })
    expect(result.isCorrect).toBe(true)
    expect(result.evaluationMethod).toBe('numeric')
  })

  it('matches exact text after normalization', async () => {
    const result = await evaluateAnswer({
      question: 'What is the capital of France?',
      expectedAnswer: 'Paris',
      userAnswer: 'paris',
    })
    expect(result.isCorrect).toBe(true)
    expect(result.evaluationMethod).toBe('exact')
  })

  it('matches text with trailing punctuation', async () => {
    const result = await evaluateAnswer({
      question: 'What is the capital of France?',
      expectedAnswer: 'Paris',
      userAnswer: 'Paris.',
    })
    expect(result.isCorrect).toBe(true)
    expect(result.evaluationMethod).toBe('exact')
  })

  it('matches text with minor typos via fuzzy on longer answers', async () => {
    const result = await evaluateAnswer({
      question: 'What process do plants use to make food?',
      expectedAnswer: 'photosynthesis',
      userAnswer: 'photosynthesiz',
    })
    expect(result.isCorrect).toBe(true)
    expect(result.evaluationMethod).toBe('fuzzy')
  })

  it('rejects clearly wrong numeric answers', async () => {
    const result = await evaluateAnswer({
      question: 'What is 2+2?',
      expectedAnswer: '4',
      userAnswer: '5',
    })
    expect(result.isCorrect).toBe(false)
    expect(result.evaluationMethod).toBe('numeric')
  })

  it('matches acceptable alternative answers', async () => {
    const result = await evaluateAnswer({
      question: 'What color is the sky?',
      expectedAnswer: 'blue',
      userAnswer: 'light blue',
      acceptableAnswers: ['light blue', 'azure'],
    })
    expect(result.isCorrect).toBe(true)
  })
})

// =============================================================================
// keywordOverlapScore
// =============================================================================

describe('keywordOverlapScore', () => {
  it('returns high score when student answer contains key terms (precision-weighted)', () => {
    const expected = 'A free body diagram shows all forces acting on an object including gravity normal force friction and applied forces represented as vectors from the center'
    const student = 'A free body diagram is a diagram that shows forces acting on an object'
    const score = keywordOverlapScore(student, expected)
    // Precision is high (student's keywords are mostly in expected), recall is moderate
    expect(score).toBeGreaterThan(0.5)
  })

  it('returns low score for completely irrelevant answer', () => {
    const expected = 'A free body diagram shows all forces acting on an object'
    const student = 'The weather is nice today and I like pizza'
    const score = keywordOverlapScore(student, expected)
    expect(score).toBeLessThan(0.15)
  })

  it('returns 1 when all keywords match', () => {
    const expected = 'forces acting object'
    const student = 'forces acting on an object'
    const score = keywordOverlapScore(student, expected)
    expect(score).toBe(1)
  })

  it('returns 0 for empty expected answer', () => {
    expect(keywordOverlapScore('some answer', '')).toBe(0)
  })

  it('returns 0 for empty user answer', () => {
    expect(keywordOverlapScore('', 'some expected answer')).toBe(0)
  })

  it('handles Hebrew text', () => {
    const expected = 'דיאגרמת גוף חופשי מראה כוחות הפועלים גוף כולל כבידה חיכוך'
    const student = 'דיאגרמה שמראה כוחות גוף חיכוך'
    const score = keywordOverlapScore(student, expected)
    expect(score).toBeGreaterThan(0.3)
  })

  it('gives good score for concise correct answer vs long model answer', () => {
    const expected = 'Newton second law motion states acceleration object directly proportional net force acting inversely proportional mass written mathematically force equals mass times acceleration'
    const student = 'Newton second law states force equals mass times acceleration'
    const score = keywordOverlapScore(student, expected)
    // Student's keywords are all correct (high precision), coverage is partial (low recall)
    // With 70/30 weighting, should still score well
    expect(score).toBeGreaterThan(0.5)
  })
})

// =============================================================================
// isExplanationQuestion (expanded)
// =============================================================================

describe('isExplanationQuestion', () => {
  // Original patterns still work
  it('detects "Explain..." questions', () => {
    expect(isExplanationQuestion('Explain how photosynthesis works')).toBe(true)
  })

  it('detects "Describe..." questions', () => {
    expect(isExplanationQuestion('Describe the process of mitosis')).toBe(true)
  })

  it('detects "Why..." questions', () => {
    expect(isExplanationQuestion('Why does ice float on water?')).toBe(true)
  })

  // NEW patterns — these were the bug!
  it('detects "What can you tell me about..." (the exact screenshot question)', () => {
    expect(isExplanationQuestion('What can you tell me about a free body diagram?')).toBe(true)
  })

  it('detects "What is a..." questions', () => {
    expect(isExplanationQuestion('What is a free body diagram?')).toBe(true)
  })

  it('detects "What are..." questions', () => {
    expect(isExplanationQuestion('What are the laws of thermodynamics?')).toBe(true)
  })

  it('detects "Define..." questions', () => {
    expect(isExplanationQuestion('Define acceleration in physics')).toBe(true)
  })

  it('detects "Discuss..." questions', () => {
    expect(isExplanationQuestion('Discuss the causes of World War I')).toBe(true)
  })

  it('detects "Tell me about..." questions', () => {
    expect(isExplanationQuestion('Tell me about the water cycle')).toBe(true)
  })

  it('detects "Summarize..." questions', () => {
    expect(isExplanationQuestion('Summarize the main themes of the novel')).toBe(true)
  })

  it('detects "In your own words..." questions', () => {
    expect(isExplanationQuestion('In your own words, explain gravity')).toBe(true)
  })

  // Negative cases — should NOT match computational questions
  it('does NOT match "What is the answer to..."', () => {
    expect(isExplanationQuestion('What is the answer to 3+5?')).toBe(false)
  })

  it('does NOT match "What is the value of x?"', () => {
    expect(isExplanationQuestion('What is the value of x?')).toBe(false)
  })

  it('does NOT match "What is the sum of..."', () => {
    expect(isExplanationQuestion('What is the sum of 10 and 20?')).toBe(false)
  })

  // Hebrew patterns
  it('detects Hebrew "מה זה" questions', () => {
    expect(isExplanationQuestion('מה זה דיאגרמת גוף חופשי?')).toBe(true)
  })

  it('detects Hebrew "הסבר" questions', () => {
    expect(isExplanationQuestion('הסבר מהו כוח הכבידה')).toBe(true)
  })

  it('detects Hebrew "מה" at start of question', () => {
    expect(isExplanationQuestion('מה אתה יכול לספר לי על דיאגרמת גוף חופשי?')).toBe(true)
  })
})

// =============================================================================
// isLongAnswerQuestion
// =============================================================================

describe('isLongAnswerQuestion', () => {
  it('returns true for expected answers >150 chars', () => {
    const longAnswer = 'A free body diagram is a simplified drawing that shows all the forces acting on a single object, represented as arrows pointing away from the object center. This is important for physics.'
    expect(isLongAnswerQuestion(longAnswer, 'short answer')).toBe(true)
  })

  it('returns true when length ratio >3:1', () => {
    expect(isLongAnswerQuestion('This is a medium length answer text', 'short')).toBe(true)
  })

  it('returns false for short expected answers with similar length user answers', () => {
    expect(isLongAnswerQuestion('Paris', 'Pariss')).toBe(false)
  })

  it('returns false for short equal-length answers', () => {
    expect(isLongAnswerQuestion('42', '43')).toBe(false)
  })
})
