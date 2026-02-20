/**
 * Content Classifier
 *
 * Lightweight keyword-based classification utilities for determining:
 * 1. Whether content is computational vs conceptual
 * 2. Approximate difficulty level from topic keywords
 * 3. Effective language complexity from content difficulty
 *
 * No AI calls — pure keyword matching for fast, synchronous classification.
 */

// =============================================================================
// Types
// =============================================================================

export type TopicType = 'computational' | 'conceptual' | 'mixed'

export interface LanguageLevelConfig {
  level: 'elementary' | 'middle_school' | 'high_school' | 'university'
  vocabularyInstructions: string
  sentenceComplexity: string
  exampleStyle: string
}

// =============================================================================
// Keyword Dictionaries
// =============================================================================

const COMPUTATIONAL_KEYWORDS = [
  // Arithmetic
  'addition', 'subtraction', 'multiplication', 'division', 'arithmetic',
  'add', 'subtract', 'multiply', 'divide', 'calculate', 'compute', 'solve',
  // Fractions/Decimals/Percents
  'fraction', 'fractions', 'decimal', 'decimals', 'percent', 'percentage',
  'numerator', 'denominator', 'mixed number', 'improper fraction',
  'convert', 'conversion', 'simplify', 'reduce',
  // Ratios/Proportions
  'ratio', 'proportion', 'rate', 'unit rate',
  // Algebra
  'algebra', 'equation', 'equations', 'variable', 'expression',
  'polynomial', 'quadratic', 'linear equation', 'inequality',
  'factoring', 'factor', 'binomial', 'trinomial',
  'slope', 'intercept', 'y = mx + b',
  // Calculus operations
  'derivative', 'integral', 'differentiate', 'integrate',
  'antiderivative', 'limit calculation',
  // Number operations
  'exponent', 'square root', 'cube root', 'absolute value',
  'order of operations', 'pemdas', 'bodmas',
  'long division', 'place value', 'rounding',
  // Measurement
  'area', 'perimeter', 'volume', 'surface area',
  'circumference', 'pythagorean',
]

const CONCEPTUAL_KEYWORDS = [
  // Geometry proofs/theory
  'proof', 'theorem', 'postulate', 'axiom', 'congruence', 'similarity',
  'geometric proof', 'deductive reasoning',
  // Physics theory
  'newton\'s law', 'conservation', 'momentum', 'energy transfer',
  'electromagnetic', 'quantum', 'relativity', 'thermodynamics',
  'wave theory', 'particle theory',
  // Biology
  'cell biology', 'genetics', 'evolution', 'ecosystem', 'photosynthesis',
  'mitosis', 'meiosis', 'dna', 'rna', 'protein synthesis',
  'classification', 'taxonomy',
  // Chemistry concepts
  'periodic table', 'chemical bonding', 'electronegativity',
  'atomic structure', 'molecular geometry', 'organic chemistry',
  // History/Social Studies
  'history', 'civilization', 'revolution', 'government', 'democracy',
  'constitution', 'geography', 'economics',
  // Language Arts
  'grammar', 'literature', 'essay', 'reading comprehension',
  'vocabulary', 'writing', 'narrative', 'poetry',
]

const MIXED_KEYWORDS = [
  // Statistics/Probability (both computation and theory)
  'probability', 'statistics', 'mean', 'median', 'mode',
  'standard deviation', 'variance', 'distribution',
  'histogram', 'scatter plot', 'correlation',
  'data analysis', 'box plot', 'frequency',
  // Trigonometry (both computation and conceptual)
  'trigonometry', 'sine', 'cosine', 'tangent',
  'unit circle', 'radian',
  // Geometry with computation
  'coordinate geometry', 'analytic geometry',
  'transformation', 'rotation', 'reflection', 'translation',
]

// Difficulty keyword mapping (topic → difficulty 1-5)
const DIFFICULTY_KEYWORDS: Array<{ keywords: string[]; difficulty: number }> = [
  {
    difficulty: 1,
    keywords: [
      'counting', 'addition', 'subtraction', 'shapes', 'patterns',
      'fractions', 'decimals', 'place value', 'telling time',
      'basic multiplication', 'basic division', 'measurement',
      'number line', 'skip counting', 'even odd',
    ],
  },
  {
    difficulty: 2,
    keywords: [
      'algebra', 'pre-algebra', 'ratio', 'proportion', 'percentage',
      'percent', 'integers', 'negative numbers', 'exponents',
      'order of operations', 'area', 'perimeter', 'volume',
      'coordinate plane', 'linear equation', 'slope',
    ],
  },
  {
    difficulty: 3,
    keywords: [
      'trigonometry', 'quadratic', 'polynomial', 'systems of equations',
      'geometry proofs', 'probability', 'statistics', 'functions',
      'logarithm', 'exponential', 'radical', 'complex numbers',
      'sequences', 'series',
    ],
  },
  {
    difficulty: 4,
    keywords: [
      'calculus', 'derivative', 'integral', 'limit', 'continuity',
      'differential', 'antiderivative', 'chain rule', 'implicit',
      'related rates', 'optimization', 'riemann sum',
      'parametric', 'polar coordinates', 'vectors',
    ],
  },
  {
    difficulty: 5,
    keywords: [
      'differential equations', 'multivariable calculus', 'partial derivative',
      'linear algebra', 'matrix', 'eigenvalue', 'vector space',
      'abstract algebra', 'real analysis', 'topology',
      'fourier', 'laplace transform', 'proof by induction',
    ],
  },
]

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Classify whether a topic is computational, conceptual, or mixed.
 * Uses keyword matching on topic string, subject, and optional key points.
 */
export function classifyTopicType(
  topic: string,
  subject?: string,
  keyPoints?: string[]
): TopicType {
  const searchText = [
    topic,
    subject || '',
    ...(keyPoints || []),
  ].join(' ').toLowerCase()

  let computationalScore = 0
  let conceptualScore = 0
  let mixedScore = 0

  for (const kw of COMPUTATIONAL_KEYWORDS) {
    if (searchText.includes(kw)) computationalScore++
  }

  for (const kw of CONCEPTUAL_KEYWORDS) {
    if (searchText.includes(kw)) conceptualScore++
  }

  for (const kw of MIXED_KEYWORDS) {
    if (searchText.includes(kw)) mixedScore++
  }

  // If mixed keywords dominate or scores are close, return mixed
  if (mixedScore > 0 && mixedScore >= Math.max(computationalScore, conceptualScore)) {
    return 'mixed'
  }

  // If both scores are close (within 2), it's mixed
  if (computationalScore > 0 && conceptualScore > 0 && Math.abs(computationalScore - conceptualScore) <= 2) {
    return 'mixed'
  }

  if (computationalScore > conceptualScore) return 'computational'
  if (conceptualScore > computationalScore) return 'conceptual'

  // Default: if no keywords matched, infer from subject
  if (subject) {
    const lowerSubject = subject.toLowerCase()
    if (['math', 'mathematics', 'מתמטיקה'].some(s => lowerSubject.includes(s))) {
      return 'computational'
    }
    if (['history', 'english', 'literature', 'biology', 'היסטוריה', 'ספרות'].some(s => lowerSubject.includes(s))) {
      return 'conceptual'
    }
  }

  return 'mixed'
}

/**
 * Infer a difficulty level (1-5) from topic keywords.
 * Returns 2 (middle) as default if no keywords match.
 */
export function inferDifficultyFromTopic(topic: string): number {
  const lowerTopic = topic.toLowerCase()
  let bestMatch = { difficulty: 2, matchCount: 0 }

  for (const level of DIFFICULTY_KEYWORDS) {
    let matchCount = 0
    for (const kw of level.keywords) {
      if (lowerTopic.includes(kw)) matchCount++
    }
    if (matchCount > bestMatch.matchCount) {
      bestMatch = { difficulty: level.difficulty, matchCount }
    }
  }

  return bestMatch.difficulty
}

/**
 * Resolve the effective language level by combining the user's profile level
 * with the content difficulty. Uses the LOWER of the two to prevent
 * using sophisticated language for young students' content.
 *
 * @param profileLevel - Education level from user profile (e.g., 'elementary', 'high_school')
 * @param contentDifficulty - Difficulty inferred from content (1-5)
 */
export function resolveEffectiveLanguageLevel(
  profileLevel: string | undefined,
  contentDifficulty: number
): LanguageLevelConfig {
  // Map profile level to a numeric value
  const profileMap: Record<string, number> = {
    elementary: 1,
    middle_school: 2,
    high_school: 3,
    university: 4,
    professional: 5,
  }

  const profileNumeric = profileLevel ? (profileMap[profileLevel] ?? 3) : 3

  // Content difficulty maps: 1-2 → elementary, 3 → middle school, 4 → high school, 5 → university
  const contentLevelMap: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4 }
  const contentNumeric = contentLevelMap[contentDifficulty] ?? 2

  // Use the LOWER of profile and content-inferred level
  const effectiveNumeric = Math.min(profileNumeric, contentNumeric)

  return LANGUAGE_LEVEL_CONFIGS[effectiveNumeric] || LANGUAGE_LEVEL_CONFIGS[2]
}

// =============================================================================
// Language Level Configurations
// =============================================================================

const LANGUAGE_LEVEL_CONFIGS: Record<number, LanguageLevelConfig> = {
  1: {
    level: 'elementary',
    vocabularyInstructions: `Use SIMPLE words a young child would know (ages 6-12).
Avoid technical jargon entirely. Use everyday words.
Example: Say "part of a whole" not "numerator over denominator".
Keep sentences SHORT — max 12 words each.`,
    sentenceComplexity: 'Simple sentences only. One idea per sentence. No subordinate clauses.',
    exampleStyle: 'Use concrete objects: pizza slices, toy blocks, candy, coins.',
  },
  2: {
    level: 'middle_school',
    vocabularyInstructions: `Use clear, accessible language appropriate for ages 11-14.
Introduce technical terms when needed but always explain them.
Keep sentences moderate length — max 20 words.`,
    sentenceComplexity: 'Clear sentences with occasional compound structure. Explain new terms inline.',
    exampleStyle: 'Use relatable scenarios: school activities, sports, everyday situations.',
  },
  3: {
    level: 'high_school',
    vocabularyInstructions: `Use age-appropriate academic vocabulary for ages 14-18.
Technical terms are acceptable with brief context.
Sentence length can be natural — up to 25 words.`,
    sentenceComplexity: 'Natural academic prose. Compound and complex sentences acceptable.',
    exampleStyle: 'Use exam-relevant examples and real-world applications.',
  },
  4: {
    level: 'university',
    vocabularyInstructions: `Use standard academic and technical terminology.
Assume familiarity with field-specific vocabulary.
No need to simplify — write at a university level.`,
    sentenceComplexity: 'Full academic prose with complex sentence structures as needed.',
    exampleStyle: 'Use theoretical frameworks, proofs, and abstract examples.',
  },
}
