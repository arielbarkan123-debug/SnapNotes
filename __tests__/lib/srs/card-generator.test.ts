/**
 * Tests for card-generator.ts
 *
 * Tests synchronous/pure utility functions:
 * - buildConceptMapping
 * - estimateCardCount
 * - getCardTypeSummary
 * - generateQuestionFromContent (regex fallback)
 * - isQuestionQualityAcceptable (covered in srs-quality-filter.test.ts too)
 *
 * generateCardsFromCourse is async and calls AI — tested at integration level.
 */

import {
  buildConceptMapping,
  estimateCardCount,
  getCardTypeSummary,
  generateQuestionFromContent,
  isQuestionQualityAcceptable,
} from '@/lib/srs/card-generator'
import type { ContentConceptRow } from '@/lib/srs/card-generator'
// Uses TestCourse = any to avoid complex type gymnastics in test data

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestCourse = any

// =============================================================================
// buildConceptMapping
// =============================================================================

describe('buildConceptMapping', () => {
  it('returns empty map for empty rows', () => {
    const result = buildConceptMapping([])
    expect(result.size).toBe(0)
  })

  it('creates step-level mapping (lessonIndex:stepIndex)', () => {
    const rows: ContentConceptRow[] = [
      { lesson_index: 0, step_index: 2, concept_id: 'concept-a' },
    ]
    const result = buildConceptMapping(rows)
    expect(result.get('0:2')).toEqual(['concept-a'])
  })

  it('creates lesson-level mapping when step_index is null', () => {
    const rows: ContentConceptRow[] = [
      { lesson_index: 1, step_index: null, concept_id: 'concept-b' },
    ]
    const result = buildConceptMapping(rows)
    expect(result.get('1')).toEqual(['concept-b'])
  })

  it('groups multiple concepts for the same location', () => {
    const rows: ContentConceptRow[] = [
      { lesson_index: 0, step_index: 0, concept_id: 'c1' },
      { lesson_index: 0, step_index: 0, concept_id: 'c2' },
      { lesson_index: 0, step_index: 0, concept_id: 'c3' },
    ]
    const result = buildConceptMapping(rows)
    expect(result.get('0:0')).toEqual(['c1', 'c2', 'c3'])
  })

  it('deduplicates concept IDs at the same location', () => {
    const rows: ContentConceptRow[] = [
      { lesson_index: 0, step_index: 0, concept_id: 'dup' },
      { lesson_index: 0, step_index: 0, concept_id: 'dup' },
    ]
    const result = buildConceptMapping(rows)
    expect(result.get('0:0')).toEqual(['dup'])
  })

  it('handles mixed lesson-level and step-level mappings', () => {
    const rows: ContentConceptRow[] = [
      { lesson_index: 0, step_index: null, concept_id: 'lesson-concept' },
      { lesson_index: 0, step_index: 1, concept_id: 'step-concept' },
    ]
    const result = buildConceptMapping(rows)
    expect(result.get('0')).toEqual(['lesson-concept'])
    expect(result.get('0:1')).toEqual(['step-concept'])
  })

  it('handles multiple lessons and steps', () => {
    const rows: ContentConceptRow[] = [
      { lesson_index: 0, step_index: 0, concept_id: 'a' },
      { lesson_index: 0, step_index: 1, concept_id: 'b' },
      { lesson_index: 1, step_index: 0, concept_id: 'c' },
      { lesson_index: 2, step_index: null, concept_id: 'd' },
    ]
    const result = buildConceptMapping(rows)
    expect(result.size).toBe(4)
    expect(result.get('0:0')).toEqual(['a'])
    expect(result.get('0:1')).toEqual(['b'])
    expect(result.get('1:0')).toEqual(['c'])
    expect(result.get('2')).toEqual(['d'])
  })
})

// =============================================================================
// estimateCardCount
// =============================================================================

describe('estimateCardCount', () => {
  it('returns 0 for empty course', () => {
    const course: TestCourse = { title: 'Test', overview: '', lessons: [] }
    expect(estimateCardCount(course)).toBe(0)
  })

  it('counts question steps', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          title: 'L1',
          steps: [
            { type: 'question', content: 'Q1', options: ['a', 'b'] },
            { type: 'question', content: 'Q2', options: ['a', 'b'] },
          ],
        },
      ],
    }
    expect(estimateCardCount(course)).toBe(2)
  })

  it('counts key_point steps', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          title: 'L1',
          steps: [
            { type: 'key_point', content: 'Important point here' },
          ],
        },
      ],
    }
    expect(estimateCardCount(course)).toBe(1)
  })

  it('does NOT count explanation steps (they go to AI batch)', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          title: 'L1',
          steps: [
            { type: 'explanation', content: 'This is a long explanation text' },
          ],
        },
      ],
    }
    // estimateCardCount only counts 'question' and 'key_point' type steps
    expect(estimateCardCount(course)).toBe(0)
  })

  it('counts legacy keyPoints', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          title: 'L1',
          keyPoints: ['Point 1', 'Point 2', 'Point 3'],
        },
      ],
    }
    expect(estimateCardCount(course)).toBe(3)
  })

  it('counts legacy explanation with 20+ words', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          title: 'L1',
          explanation:
            'This is a detailed explanation that contains more than twenty words to ensure it passes the minimum word count threshold for generating a card.',
        },
      ],
    }
    expect(estimateCardCount(course)).toBe(1)
  })

  it('skips legacy explanation with fewer than 20 words', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          title: 'L1',
          explanation: 'Short explanation.',
        },
      ],
    }
    expect(estimateCardCount(course)).toBe(0)
  })

  it('counts formulas', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          title: 'L1',
          formulas: [
            { formula: 'E = mc^2', explanation: 'Energy-mass equivalence' },
          ],
        },
      ],
    }
    expect(estimateCardCount(course)).toBe(1)
  })

  it('counts keyConcepts (up to 5)', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [],
      keyConcepts: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
    }
    expect(estimateCardCount(course)).toBe(5) // capped at 5
  })

  it('uses "sections" fallback if "lessons" is empty', () => {
    // When lessons is empty array, course.lessons || course.sections evaluates to
    // the empty array (truthy), so sections won't be used. We must omit lessons entirely.
    const course = {
      title: 'Test',
      overview: '',
      sections: [
        {
          title: 'S1',
          steps: [{ type: 'question', content: 'Q?', options: ['a'] }],
        },
      ],
    } as TestCourse
    expect(estimateCardCount(course)).toBe(1)
  })
})

// =============================================================================
// getCardTypeSummary
// =============================================================================

describe('getCardTypeSummary', () => {
  it('returns zeros for empty course', () => {
    const course: TestCourse = { title: 'Test', overview: '', lessons: [] }
    const result = getCardTypeSummary(course)
    expect(result.flashcard).toBe(0)
    expect(result.multiple_choice).toBe(0)
    expect(result.formula).toBe(0)
  })

  it('categorizes question steps as multiple_choice by default', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          steps: [
            { type: 'question', content: 'Q1?', options: ['a', 'b', 'c', 'd'] },
          ],
        },
      ],
    }
    const result = getCardTypeSummary(course)
    expect(result.multiple_choice).toBe(1)
  })

  it('categorizes true/false question steps', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          steps: [
            { type: 'question', content: 'True or false?', options: ['True', 'False'] },
          ],
        },
      ],
    }
    const result = getCardTypeSummary(course)
    expect(result.true_false).toBe(1)
    expect(result.multiple_choice).toBe(0)
  })

  it('categorizes key_point steps as flashcard', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          steps: [{ type: 'key_point', content: 'A key point to remember' }],
        },
      ],
    }
    const result = getCardTypeSummary(course)
    expect(result.flashcard).toBe(1)
  })

  it('categorizes explanation steps (50+ chars) as short_answer', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          steps: [
            {
              type: 'explanation',
              content:
                'This is a long enough explanation that exceeds fifty characters for testing purposes in the card type summary.',
            },
          ],
        },
      ],
    }
    const result = getCardTypeSummary(course)
    expect(result.short_answer).toBe(1)
  })

  it('counts formula sections', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          formulas: [
            { formula: 'F = ma', explanation: 'Newton second law' },
            { formula: 'E = mc^2', explanation: 'Energy mass equivalence' },
          ],
        },
      ],
    }
    const result = getCardTypeSummary(course)
    expect(result.formula).toBe(2)
  })

  it('counts legacy keyPoints as flashcard', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [
        {
          keyPoints: ['point1', 'point2'],
        },
      ],
    }
    const result = getCardTypeSummary(course)
    expect(result.flashcard).toBe(2)
  })

  it('counts keyConcepts as flashcard (up to 5)', () => {
    const course: TestCourse = {
      title: 'Test',
      overview: '',
      lessons: [],
      keyConcepts: ['a', 'b', 'c', 'd', 'e', 'f'],
    }
    const result = getCardTypeSummary(course)
    expect(result.flashcard).toBe(5) // capped at 5
  })
})

// =============================================================================
// generateQuestionFromContent (regex fallback)
// =============================================================================

describe('generateQuestionFromContent', () => {
  it('generates "What can you tell me about..." for subject-verb sentences', () => {
    const result = generateQuestionFromContent(
      'The water cycle is the continuous process of water evaporation and condensation.',
      'Science'
    )
    expect(result).toContain('water cycle')
  })

  it('generates "Explain the concept of..." for sentences starting with "In" when subject is too long', () => {
    // When subject from regex is >5 words or <2 words, it falls through
    // to the "In " check. Construct a sentence where that happens.
    const result = generateQuestionFromContent(
      'In this particular context we must understand the underlying principles.',
      'Biology'
    )
    expect(result).toBe('Explain the concept of Biology.')
  })

  it('falls back to "Explain: topic" for unrecognized patterns', () => {
    const result = generateQuestionFromContent(
      'Completely unmatched random text here no pattern',
      'Math 101'
    )
    expect(result).toBe('Explain: Math 101')
  })

  it('returns a non-empty string', () => {
    const result = generateQuestionFromContent('Some content here.', 'Topic')
    expect(result.length).toBeGreaterThan(0)
  })
})
