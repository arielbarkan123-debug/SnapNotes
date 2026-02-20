import {
  normalizeText,
  levenshteinDistance,
  similarityRatio,
  parseNumericAnswer,
  numericMatch,
  fuzzyMatch,
  evaluateAnswer,
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
