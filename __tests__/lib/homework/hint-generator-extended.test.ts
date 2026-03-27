/**
 * Extended tests for hint-generator.ts
 * Covers: getRecommendedHintLevel, shouldEncourageAttempt, generateHint, getHintLevelInfo.
 */

import {
  getRecommendedHintLevel,
  shouldEncourageAttempt,
  generateHint,
  getHintLevelInfo,
} from '@/lib/homework/hint-generator'
import type { HintContext, HintLevel } from '@/lib/homework/types'

// Mock Anthropic SDK
const mockCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messages: { create: mockCreate },
  })),
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

beforeEach(() => {
  mockCreate.mockReset()
})

// =============================================================================
// getRecommendedHintLevel — extended
// =============================================================================

describe('getRecommendedHintLevel — extended', () => {
  it('returns 1 when progress >= 70', () => {
    const level = getRecommendedHintLevel(3, 75, [])
    expect(level).toBe(1)
  })

  it('returns 1 when progress is exactly 70', () => {
    const level = getRecommendedHintLevel(0, 70, [])
    expect(level).toBe(1)
  })

  it('caps at 2 when student shows recent understanding', () => {
    const level = getRecommendedHintLevel(5, 30, [
      { showsUnderstanding: true },
    ])
    expect(level).toBeLessThanOrEqual(2)
  })

  it('escalates based on hints used when no understanding shown', () => {
    const level = getRecommendedHintLevel(2, 20, [
      { showsUnderstanding: false },
    ])
    expect(level).toBe(3) // min(4, 2+1)
  })

  it('caps at level 4 maximum', () => {
    const level = getRecommendedHintLevel(10, 10, [])
    expect(level).toBe(4) // min(4, 10+1) = 4
  })

  it('returns level 1 when no hints used and low progress, no understanding', () => {
    const level = getRecommendedHintLevel(0, 0, [])
    expect(level).toBe(1) // min(4, 0+1) = 1
  })
})

// =============================================================================
// shouldEncourageAttempt — extended
// =============================================================================

describe('shouldEncourageAttempt — extended', () => {
  it('encourages when asking too quickly (< 30s)', () => {
    const result = shouldEncourageAttempt(1, 15)
    expect(result.shouldEncourage).toBe(true)
    expect(result.message).toContain('moment')
  })

  it('does not encourage on first hint even if quick', () => {
    const result = shouldEncourageAttempt(0, 5)
    expect(result.shouldEncourage).toBe(false)
  })

  it('encourages after 3+ hints used', () => {
    const result = shouldEncourageAttempt(3, 120)
    expect(result.shouldEncourage).toBe(true)
    expect(result.message).toContain('guidance')
  })

  it('does not encourage with 2 hints and enough time', () => {
    const result = shouldEncourageAttempt(2, 60)
    expect(result.shouldEncourage).toBe(false)
    expect(result.message).toBe('')
  })

  it('returns empty message when not encouraging', () => {
    const result = shouldEncourageAttempt(1, 60)
    expect(result.message).toBe('')
  })
})

// =============================================================================
// getHintLevelInfo — extended
// =============================================================================

describe('getHintLevelInfo — extended', () => {
  it('level 1 is "Conceptual Nudge"', () => {
    const info = getHintLevelInfo(1)
    expect(info.name).toBe('Conceptual Nudge')
  })

  it('level 5 is "Show Answer"', () => {
    const info = getHintLevelInfo(5)
    expect(info.name).toBe('Show Answer')
  })

  it('all levels have unique icons', () => {
    const icons = ([1, 2, 3, 4, 5] as HintLevel[]).map(l => getHintLevelInfo(l).icon)
    const unique = new Set(icons)
    expect(unique.size).toBe(5)
  })
})

// =============================================================================
// generateHint — with mocked AI
// =============================================================================

describe('generateHint — with mocked AI', () => {
  const baseContext: HintContext = {
    session: {
      id: 'test-session',
      user_id: 'test-user',
      question_image_url: '',
      question_text: 'Solve 2x + 5 = 13',
      question_type: 'equation',
      detected_subject: 'math',
      detected_topic: 'algebra',
      detected_concepts: ['linear equations'],
      hints_used: 0,
      show_answer_used: false,
      student_progress_estimate: 0,
      tutor_messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as HintContext['session'],
    questionAnalysis: {
      questionText: 'Solve 2x + 5 = 13',
      subject: 'math',
      topic: 'algebra',
      questionType: 'equation',
      difficultyEstimate: 3,
      requiredConcepts: ['linear equations', 'inverse operations'],
      commonMistakes: ['forgetting to subtract from both sides'],
      solutionApproach: 'Isolate x by subtracting 5 then dividing by 2',
      estimatedSteps: 3,
    },
    requestedLevel: 1,
    previousHints: [],
    language: 'en',
    topicType: 'computational',
  }

  it('returns a hint response from AI', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          content: 'Think about what formula applies here.',
          relatedConcept: 'linear equations',
          workedExample: null,
        }),
      }],
    })

    const result = await generateHint(baseContext)
    expect(result.hintLevel).toBe(1)
    expect(result.content).toContain('formula')
    expect(result.isShowAnswer).toBe(false)
  })

  it('returns default hint when AI response has no JSON', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: 'Here is a plain text hint without JSON',
      }],
    })

    const result = await generateHint(baseContext)
    expect(result.hintLevel).toBe(1)
    expect(result.content).toBe('Here is a plain text hint without JSON')
  })

  it('marks level 5 as isShowAnswer', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          content: 'The answer is x = 4',
          relatedConcept: 'algebra',
          workedExample: null,
        }),
      }],
    })

    const context5 = { ...baseContext, requestedLevel: 5 as HintLevel }
    const result = await generateHint(context5)
    expect(result.hintLevel).toBe(5)
    expect(result.isShowAnswer).toBe(true)
  })

  it('falls back to default when AI returns no text blocks', async () => {
    mockCreate.mockResolvedValue({
      content: [],
    })

    const result = await generateHint(baseContext)
    expect(result.hintLevel).toBe(1)
    expect(result.content).toBeTruthy()
  })
})
