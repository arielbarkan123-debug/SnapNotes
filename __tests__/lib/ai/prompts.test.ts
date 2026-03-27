/**
 * Tests for prompts.ts
 * Covers: non-empty returns, no leaked template variables, language parameter,
 * isExamContent, token budget, formatExtractedContentForPrompt.
 */

import {
  isExamContent,
  validateExtractedContent,
  formatExtractedContentForPrompt,
  cleanJsonResponse,
  getImageAnalysisPrompt,
  getCourseGenerationPrompt,
  BLOOMS_TAXONOMY,
  buildPersonalizationSection,
} from '@/lib/ai/prompts'

// Mock logger
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

// =============================================================================
// Non-empty returns
// =============================================================================

describe('prompts — non-empty returns', () => {
  it('getImageAnalysisPrompt returns non-empty system and user prompts', () => {
    const result = getImageAnalysisPrompt()
    expect(result.systemPrompt).toBeTruthy()
    expect(result.systemPrompt.length).toBeGreaterThan(100)
    expect(result.userPrompt).toBeTruthy()
    expect(result.userPrompt.length).toBeGreaterThan(50)
  })

  it('BLOOMS_TAXONOMY has all 6 levels', () => {
    expect(Object.keys(BLOOMS_TAXONOMY)).toHaveLength(6)
    expect(BLOOMS_TAXONOMY.remember.level).toBe(1)
    expect(BLOOMS_TAXONOMY.create.level).toBe(6)
  })

  it('each Bloom level has verbs array', () => {
    for (const [, config] of Object.entries(BLOOMS_TAXONOMY)) {
      expect(config.verbs.length).toBeGreaterThan(0)
      expect(config.description).toBeTruthy()
    }
  })
})

// =============================================================================
// No leaked template variables
// =============================================================================

describe('prompts — no leaked template variables', () => {
  it('getImageAnalysisPrompt does not contain ${...} placeholders', () => {
    const result = getImageAnalysisPrompt()
    expect(result.systemPrompt).not.toMatch(/\$\{[^}]+\}/)
    expect(result.userPrompt).not.toMatch(/\$\{[^}]+\}/)
  })

  it('buildPersonalizationSection with no context returns empty', () => {
    const result = buildPersonalizationSection()
    expect(result).toBe('')
  })

  it('buildPersonalizationSection with context does not have unresolved variables', () => {
    const result = buildPersonalizationSection({
      educationLevel: 'high_school',
      studySystem: 'general',
      studyGoal: 'exam_prep',
      learningStyles: ['visual', 'practice'],
      language: 'en',
    })
    expect(result).not.toMatch(/\$\{[^}]+\}/)
    expect(result).toContain('high school')
  })
})

// =============================================================================
// Language parameter
// =============================================================================

describe('prompts — language parameter', () => {
  it('buildPersonalizationSection includes Hebrew instruction for he', () => {
    const result = buildPersonalizationSection({
      educationLevel: 'high_school',
      studySystem: 'israeli_bagrut',
      studyGoal: 'exam_prep',
      learningStyles: [],
      language: 'he',
    })
    // Should contain some Hebrew language instruction or bagrut reference
    expect(result.length).toBeGreaterThan(0)
    expect(result.toLowerCase()).toMatch(/hebrew|bagrut|בגרות/)
  })

  it('buildPersonalizationSection works with en language', () => {
    const result = buildPersonalizationSection({
      educationLevel: 'university',
      studySystem: 'us',
      studyGoal: 'general_learning',
      learningStyles: ['reading'],
      language: 'en',
    })
    expect(result.length).toBeGreaterThan(0)
    expect(result).toContain('reading')
  })
})

// =============================================================================
// isExamContent
// =============================================================================

describe('isExamContent', () => {
  it('detects strong indicator: "bagrut"', () => {
    expect(isExamContent('This is a bagrut exam from 2024')).toBe(true)
  })

  it('detects strong indicator: Hebrew "בגרות"', () => {
    expect(isExamContent('בחינת בגרות במתמטיקה')).toBe(true)
  })

  it('detects multiple regular indicators (3+ needed)', () => {
    expect(isExamContent('exam with 50 points, answer the question, solve each part')).toBe(true)
  })

  it('does not flag content with fewer than 3 regular indicators', () => {
    expect(isExamContent('answer this question about photosynthesis')).toBe(false)
  })

  it('does not flag normal educational content', () => {
    expect(isExamContent('Photosynthesis is the process by which plants convert light to energy')).toBe(false)
  })

  it('detects Hebrew exam content', () => {
    expect(isExamContent('מבחן מתמטיקה, שאלה 1, חשב את הסכום, סעיף א')).toBe(true)
  })

  it('handles empty string', () => {
    expect(isExamContent('')).toBe(false)
  })

  it('is case insensitive', () => {
    expect(isExamContent('BAGRUT EXAM')).toBe(true)
  })
})

// =============================================================================
// Token budget / prompt size checks
// =============================================================================

describe('prompts — token budget', () => {
  it('getImageAnalysisPrompt system prompt is under 10000 chars', () => {
    const result = getImageAnalysisPrompt()
    expect(result.systemPrompt.length).toBeLessThan(10000)
  })

  it('buildPersonalizationSection is reasonable size', () => {
    const result = buildPersonalizationSection({
      educationLevel: 'high_school',
      studySystem: 'israeli_bagrut',
      studyGoal: 'exam_prep',
      learningStyles: ['visual', 'practice', 'reading'],
      language: 'he',
      grade: '11',
    })
    // Should be comprehensive but not enormous
    expect(result.length).toBeGreaterThan(100)
    expect(result.length).toBeLessThan(10000)
  })
})

// =============================================================================
// validateExtractedContent (from prompts.ts)
// =============================================================================

describe('validateExtractedContent — from prompts', () => {
  it('validates correct structure', () => {
    expect(validateExtractedContent({
      subject: 'Math',
      mainTopics: ['Algebra'],
      content: [{ type: 'paragraph', content: 'text' }],
      structure: 'notes',
    })).toBe(true)
  })

  it('rejects missing fields', () => {
    expect(validateExtractedContent({ subject: 'Math' })).toBe(false)
  })

  it('rejects non-object', () => {
    expect(validateExtractedContent(42)).toBe(false)
  })

  it('rejects null', () => {
    expect(validateExtractedContent(null)).toBe(false)
  })
})

// =============================================================================
// formatExtractedContentForPrompt
// =============================================================================

describe('formatExtractedContentForPrompt — from prompts', () => {
  it('returns a non-empty string', () => {
    const result = formatExtractedContentForPrompt({
      subject: 'Physics',
      mainTopics: ['Mechanics'],
      content: [{ type: 'paragraph' as const, content: 'Force equals mass times acceleration' }],
      diagrams: [],
      formulas: [{ formula: 'F = ma', context: 'Newton second law' }],
      structure: 'textbook',
    })
    expect(result).toContain('Physics')
    expect(result).toContain('F = ma')
    expect(result).toContain('Mechanics')
  })

  it('handles numbered items with prefix', () => {
    const result = formatExtractedContentForPrompt({
      subject: 'History',
      mainTopics: ['World War II'],
      content: [{ type: 'numbered_item' as const, content: 'First event' }],
      diagrams: [],
      formulas: [],
      structure: 'notes',
    })
    expect(result).toContain('First event')
  })

  it('handles subheading type', () => {
    const result = formatExtractedContentForPrompt({
      subject: 'Math',
      mainTopics: ['Algebra'],
      content: [{ type: 'subheading' as const, content: 'Section Two' }],
      diagrams: [],
      formulas: [],
      structure: 'notes',
    })
    expect(result).toContain('## Section Two')
  })
})

// =============================================================================
// cleanJsonResponse (from prompts.ts)
// =============================================================================

describe('cleanJsonResponse — from prompts', () => {
  it('strips code fences', () => {
    expect(cleanJsonResponse('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('trims whitespace', () => {
    expect(cleanJsonResponse('  {"a":1}  ')).toBe('{"a":1}')
  })

  it('handles bare fences', () => {
    expect(cleanJsonResponse('```\n{"a":1}\n```')).toBe('{"a":1}')
  })
})
