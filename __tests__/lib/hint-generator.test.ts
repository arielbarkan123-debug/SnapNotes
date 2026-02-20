/**
 * Tests for hint-generator pure functions and topic-type awareness
 */

import {
  getHintLevelInfo,
  getRecommendedHintLevel,
  shouldEncourageAttempt,
  generateHint,
} from '@/lib/homework/hint-generator'
import type { HintContext, HintLevel, HomeworkSession, QuestionAnalysis } from '@/lib/homework/types'

// Mock Anthropic SDK
const mockCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messages: { create: mockCreate },
  })),
}))

// =============================================================================
// getHintLevelInfo
// =============================================================================

describe('getHintLevelInfo', () => {
  it.each([1, 2, 3, 4, 5] as HintLevel[])('returns name, description, icon for level %i', (level) => {
    const info = getHintLevelInfo(level)
    expect(info.name).toBeTruthy()
    expect(info.description).toBeTruthy()
    expect(info.icon).toBeTruthy()
  })

  it('returns different names for each level', () => {
    const names = ([1, 2, 3, 4, 5] as HintLevel[]).map((l) => getHintLevelInfo(l).name)
    const unique = new Set(names)
    expect(unique.size).toBe(5)
  })
})

// =============================================================================
// getRecommendedHintLevel
// =============================================================================

describe('getRecommendedHintLevel', () => {
  it('recommends level 1 when progress >= 70', () => {
    expect(getRecommendedHintLevel(0, 75, [])).toBe(1)
    expect(getRecommendedHintLevel(3, 90, [])).toBe(1)
  })

  it('stays at lower levels when student shows understanding', () => {
    const messages = [{ showsUnderstanding: true }]
    expect(getRecommendedHintLevel(0, 30, messages)).toBe(1)
    expect(getRecommendedHintLevel(1, 30, messages)).toBe(2)
  })

  it('escalates when no understanding shown', () => {
    const messages = [{ showsUnderstanding: false }]
    expect(getRecommendedHintLevel(0, 30, messages)).toBe(1)
    expect(getRecommendedHintLevel(1, 30, messages)).toBe(2)
    expect(getRecommendedHintLevel(3, 30, messages)).toBe(4)
  })

  it('caps at level 4 (never auto-recommends show-answer)', () => {
    expect(getRecommendedHintLevel(10, 30, [])).toBe(4)
  })
})

// =============================================================================
// shouldEncourageAttempt
// =============================================================================

describe('shouldEncourageAttempt', () => {
  it('encourages if requesting hints too quickly', () => {
    const result = shouldEncourageAttempt(1, 10) // 10 seconds since last hint
    expect(result.shouldEncourage).toBe(true)
    expect(result.message).toBeTruthy()
  })

  it('does not encourage on first hint regardless of speed', () => {
    const result = shouldEncourageAttempt(0, 5)
    expect(result.shouldEncourage).toBe(false)
  })

  it('encourages after 3+ hints used', () => {
    const result = shouldEncourageAttempt(3, 120)
    expect(result.shouldEncourage).toBe(true)
  })

  it('does not encourage with few hints and reasonable time', () => {
    const result = shouldEncourageAttempt(1, 60)
    expect(result.shouldEncourage).toBe(false)
  })
})

// =============================================================================
// generateHint — topic-type awareness via fallback defaults
// =============================================================================

describe('generateHint topic-type awareness', () => {
  const baseSession: HomeworkSession = {
    id: 'test-session',
    user_id: 'user-1',
    question_image_url: '',
    question_text: 'Test question',
    question_type: null,
    detected_subject: 'math',
    detected_topic: 'algebra',
    detected_concepts: [],
    difficulty_estimate: 3,
    reference_image_urls: [],
    reference_extracted_content: null,
    reference_relevant_sections: null,
    initial_attempt: null,
    comfort_level: 'some_idea',
    status: 'active',
    current_step: 1,
    total_estimated_steps: 5,
    conversation: [],
    hints_used: 0,
    hints_available: 4,
    used_show_answer: false,
    completed_at: null,
    solution_reached: false,
    student_final_answer: null,
    time_spent_seconds: null,
    breakthrough_moment: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const baseAnalysis: QuestionAnalysis = {
    questionText: 'Solve 2x + 5 = 11',
    subject: 'math',
    topic: 'algebra',
    questionType: 'equation',
    difficultyEstimate: 3,
    requiredConcepts: ['linear equations'],
    commonMistakes: [],
    solutionApproach: 'Isolate x',
    estimatedSteps: 3,
  }

  function makeContext(topicType?: 'computational' | 'conceptual' | 'mixed'): HintContext {
    return {
      session: baseSession,
      questionAnalysis: baseAnalysis,
      requestedLevel: 1 as HintLevel,
      previousHints: [],
      language: 'en',
      topicType,
    }
  }

  it('returns computational-specific hint when AI returns no text content', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'image', source: { type: 'base64', data: '' } }], // no text block
    })

    const result = await generateHint(makeContext('computational'))
    expect(result.content).toContain('formula')
    expect(result.content).toContain('operation')
    expect(result.hintLevel).toBe(1)
  })

  it('returns conceptual-specific hint when AI returns no text', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [], // empty content
    })

    const result = await generateHint(makeContext('conceptual'))
    expect(result.content).toContain('concept')
    expect(result.content).toContain('principle')
  })

  it('returns general hint when topicType is undefined', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [],
    })

    const result = await generateHint(makeContext(undefined))
    expect(result.content).toContain('concept or formula')
    expect(result.content).toContain('remind you of')
  })

  it('returns mixed hint when topicType is mixed', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [],
    })

    const result = await generateHint(makeContext('mixed'))
    // Mixed uses the general defaults
    expect(result.content).toBeTruthy()
    expect(result.hintLevel).toBe(1)
  })

  it('passes topicType in prompt to AI', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"content":"Test hint","relatedConcept":"algebra"}' }],
    })

    await generateHint(makeContext('computational'))

    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1]
    const calledPrompt = lastCall[0].messages[0].content
    expect(calledPrompt).toContain('COMPUTATIONAL')
    expect(calledPrompt).toContain('calculation steps')
  })

  it('includes conceptual style in prompt for conceptual topics', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"content":"Think about why","relatedConcept":"biology"}' }],
    })

    await generateHint(makeContext('conceptual'))

    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1]
    const calledPrompt = lastCall[0].messages[0].content
    expect(calledPrompt).toContain('CONCEPTUAL')
    expect(calledPrompt).toContain('understanding')
  })

  it('includes language instruction for Hebrew', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{"content":"רמז","relatedConcept":"אלגברה"}' }],
    })

    const context = makeContext('computational')
    context.language = 'he'

    await generateHint(context)

    const lastCall = mockCreate.mock.calls[mockCreate.mock.calls.length - 1]
    const calledPrompt = lastCall[0].messages[0].content
    expect(calledPrompt).toContain('Hebrew')
    expect(calledPrompt).toContain('עברית')
  })

  it('returns different defaults for each level with computational topic', async () => {
    const results: string[] = []

    for (const level of [1, 2, 3, 4, 5] as HintLevel[]) {
      mockCreate.mockResolvedValueOnce({ content: [] })

      const context = makeContext('computational')
      context.requestedLevel = level

      const result = await generateHint(context)
      results.push(result.content)
    }

    // All should be unique
    const unique = new Set(results)
    expect(unique.size).toBe(5)
  })

  it('marks level 5 as isShowAnswer', async () => {
    mockCreate.mockResolvedValueOnce({ content: [] })

    const context = makeContext('computational')
    context.requestedLevel = 5 as HintLevel

    const result = await generateHint(context)
    expect(result.isShowAnswer).toBe(true)
  })

  it('does not mark levels 1-4 as isShowAnswer', async () => {
    for (const level of [1, 2, 3, 4] as HintLevel[]) {
      mockCreate.mockResolvedValueOnce({ content: [] })

      const context = makeContext('computational')
      context.requestedLevel = level

      const result = await generateHint(context)
      expect(result.isShowAnswer).toBe(false)
    }
  })
})
