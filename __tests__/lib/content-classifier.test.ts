/**
 * Tests for lib/ai/content-classifier.ts
 */

import {
  classifyTopicType,
  inferDifficultyFromTopic,
  resolveEffectiveLanguageLevel,
} from '@/lib/ai/content-classifier'

// =============================================================================
// classifyTopicType
// =============================================================================

describe('classifyTopicType', () => {
  it('classifies arithmetic topics as computational', () => {
    expect(classifyTopicType('addition and subtraction of fractions')).toBe('computational')
  })

  it('classifies algebra topics as computational', () => {
    expect(classifyTopicType('solving linear equations with variables')).toBe('computational')
  })

  it('classifies calculus operations as computational', () => {
    expect(classifyTopicType('derivative and integral calculus')).toBe('computational')
  })

  it('classifies percent conversion as computational', () => {
    expect(classifyTopicType('Mastering Percent Conversions')).toBe('computational')
  })

  it('classifies biology as conceptual', () => {
    expect(classifyTopicType('cell biology and photosynthesis')).toBe('conceptual')
  })

  it('classifies history as conceptual', () => {
    expect(classifyTopicType('The American Revolution and democracy')).toBe('conceptual')
  })

  it('classifies literature as conceptual', () => {
    expect(classifyTopicType('poetry and reading comprehension')).toBe('conceptual')
  })

  it('classifies physics theory as conceptual', () => {
    expect(classifyTopicType("Newton's law of conservation of momentum")).toBe('conceptual')
  })

  it('classifies statistics as mixed', () => {
    expect(classifyTopicType('probability and statistics with mean and median')).toBe('mixed')
  })

  it('classifies trigonometry as mixed', () => {
    expect(classifyTopicType('trigonometry sine cosine tangent')).toBe('mixed')
  })

  it('returns mixed when computational and conceptual scores are close', () => {
    // Has both: "solve equation" (computational) + "proof theorem" (conceptual)
    expect(classifyTopicType('solve the equation using the theorem proof')).toBe('mixed')
  })

  it('uses subject fallback for math', () => {
    expect(classifyTopicType('Chapter 5', 'Mathematics')).toBe('computational')
  })

  it('uses subject fallback for history', () => {
    expect(classifyTopicType('Chapter 5', 'History')).toBe('conceptual')
  })

  it('uses subject fallback for Hebrew math', () => {
    expect(classifyTopicType('פרק 5', 'מתמטיקה')).toBe('computational')
  })

  it('returns mixed for unknown topics with no keywords', () => {
    expect(classifyTopicType('Introduction to the course')).toBe('mixed')
  })

  it('considers keyPoints in classification', () => {
    expect(classifyTopicType('Lesson 1', undefined, ['solve equations', 'calculate the derivative'])).toBe('computational')
  })
})

// =============================================================================
// inferDifficultyFromTopic
// =============================================================================

describe('inferDifficultyFromTopic', () => {
  it('returns 1 for elementary topics', () => {
    expect(inferDifficultyFromTopic('basic addition and counting')).toBe(1)
  })

  it('returns 1 for fractions', () => {
    expect(inferDifficultyFromTopic('understanding fractions and decimals')).toBe(1)
  })

  it('returns 2 for algebra and ratios', () => {
    expect(inferDifficultyFromTopic('algebra with ratios and proportion')).toBe(2)
  })

  it('returns 2 for area and perimeter', () => {
    expect(inferDifficultyFromTopic('calculating area and perimeter')).toBe(2)
  })

  it('returns 3 for quadratic and polynomial', () => {
    expect(inferDifficultyFromTopic('quadratic equations and polynomial functions')).toBe(3)
  })

  it('returns 3 for probability and statistics', () => {
    expect(inferDifficultyFromTopic('probability and statistics')).toBe(3)
  })

  it('returns 4 for calculus', () => {
    expect(inferDifficultyFromTopic('derivative and integral calculus')).toBe(4)
  })

  it('returns 4 for optimization and related rates', () => {
    expect(inferDifficultyFromTopic('optimization and related rates')).toBe(4)
  })

  it('returns 5 for differential equations and linear algebra', () => {
    // "differential equations" + "partial derivative" + "linear algebra" + "matrix" = 4 level-5 keywords
    expect(inferDifficultyFromTopic('differential equations with linear algebra and matrix eigenvalue')).toBe(5)
  })

  it('returns 5 for linear algebra', () => {
    expect(inferDifficultyFromTopic('linear algebra matrix eigenvalue')).toBe(5)
  })

  it('returns 2 (default) for unrecognized topics', () => {
    expect(inferDifficultyFromTopic('Introduction to the course')).toBe(2)
  })

  it('picks highest match count when multiple levels match', () => {
    // "calculus derivative integral limit" has 4 level-4 keywords
    // vs maybe 1 level-5 keyword — should pick level 4
    expect(inferDifficultyFromTopic('calculus derivative integral limit')).toBe(4)
  })
})

// =============================================================================
// resolveEffectiveLanguageLevel
// =============================================================================

describe('resolveEffectiveLanguageLevel', () => {
  it('returns elementary for elementary profile + easy content', () => {
    const result = resolveEffectiveLanguageLevel('elementary', 1)
    expect(result.level).toBe('elementary')
  })

  it('returns elementary for high_school profile + easy content', () => {
    // Content difficulty 1 → maps to elementary (numeric 1)
    // Profile high_school → numeric 3
    // min(3, 1) = 1 → elementary
    const result = resolveEffectiveLanguageLevel('high_school', 1)
    expect(result.level).toBe('elementary')
  })

  it('returns elementary for elementary profile + hard content', () => {
    // Content difficulty 4 → maps to high_school (numeric 3)
    // Profile elementary → numeric 1
    // min(1, 3) = 1 → elementary
    const result = resolveEffectiveLanguageLevel('elementary', 4)
    expect(result.level).toBe('elementary')
  })

  it('returns middle_school for middle_school profile + medium content', () => {
    // Content difficulty 3 → maps to middle_school (numeric 2)
    // Profile middle_school → numeric 2
    // min(2, 2) = 2 → middle_school
    const result = resolveEffectiveLanguageLevel('middle_school', 3)
    expect(result.level).toBe('middle_school')
  })

  it('returns high_school for university profile + hard content', () => {
    // Content difficulty 4 → maps to high_school (numeric 3)
    // Profile university → numeric 4
    // min(4, 3) = 3 → high_school
    const result = resolveEffectiveLanguageLevel('university', 4)
    expect(result.level).toBe('high_school')
  })

  it('returns university for university profile + very hard content', () => {
    // Content difficulty 5 → maps to university (numeric 4)
    // Profile university → numeric 4
    // min(4, 4) = 4 → university
    const result = resolveEffectiveLanguageLevel('university', 5)
    expect(result.level).toBe('university')
  })

  it('defaults to high_school (numeric 3) when profile is undefined', () => {
    // Profile undefined → defaults to numeric 3
    // Content difficulty 5 → maps to university (numeric 4)
    // min(3, 4) = 3 → high_school
    const result = resolveEffectiveLanguageLevel(undefined, 5)
    expect(result.level).toBe('high_school')
  })

  it('defaults to high_school (numeric 3) for unknown profile levels', () => {
    const result = resolveEffectiveLanguageLevel('unknown_level', 5)
    expect(result.level).toBe('high_school')
  })

  it('includes vocabularyInstructions in the config', () => {
    const result = resolveEffectiveLanguageLevel('elementary', 1)
    expect(result.vocabularyInstructions).toBeDefined()
    expect(result.vocabularyInstructions.length).toBeGreaterThan(0)
  })

  it('includes sentenceComplexity in the config', () => {
    const result = resolveEffectiveLanguageLevel('high_school', 3)
    expect(result.sentenceComplexity).toBeDefined()
  })

  it('includes exampleStyle in the config', () => {
    const result = resolveEffectiveLanguageLevel('university', 5)
    expect(result.exampleStyle).toBeDefined()
  })
})
