/**
 * Tests for checker-engine.ts exported utility functions.
 * Covers: getGradeLevelColor, getGradeLevelLabel, getGradeLevelEmoji.
 * Also tests analyzeHomework input validation with mocked dependencies.
 */

import {
  getGradeLevelColor,
  getGradeLevelLabel,
  getGradeLevelEmoji,
  analyzeHomework,
} from '@/lib/homework/checker-engine'
import type { GradeLevel } from '@/lib/homework/types'

// Mock Anthropic SDK
const mockCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => {
  class MockAPIError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
      this.name = 'APIError'
    }
  }
  return {
    __esModule: true,
    default: jest.fn(() => ({
      messages: { create: mockCreate },
    })),
    APIError: MockAPIError,
  }
})

// Mock logger
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

// Mock student-work-reader
jest.mock('@/lib/homework/student-work-reader', () => ({
  readStudentWork: jest.fn(),
}))

// Mock feedback-quality
jest.mock('@/lib/homework/feedback-quality', () => ({
  validateFeedbackQuality: jest.fn(() => ({ isValid: true, issues: [] })),
  regenerateWeakFeedback: jest.fn(),
}))

// Mock smart-solver
jest.mock('@/lib/homework/smart-solver', () => ({
  smartExtractAndSolve: jest.fn(),
}))

// Mock math-verifier
jest.mock('@/lib/homework/math-verifier', () => ({
  verifyAnswer: jest.fn(() => ({ verified: false, status: 'unverifiable' })),
  answersMatch: jest.fn(() => false),
}))

// Mock answer-checker exports used by checker-engine
jest.mock('@/lib/evaluation/answer-checker', () => ({
  normalizeText: jest.fn((t: string) => t.toLowerCase().trim()),
  similarityRatio: jest.fn(() => 0.5),
}))

beforeEach(() => {
  mockCreate.mockReset()
})

// =============================================================================
// getGradeLevelColor
// =============================================================================

describe('getGradeLevelColor', () => {
  it('returns "green" for excellent', () => {
    expect(getGradeLevelColor('excellent')).toBe('green')
  })

  it('returns "blue" for good', () => {
    expect(getGradeLevelColor('good')).toBe('blue')
  })

  it('returns "amber" for needs_improvement', () => {
    expect(getGradeLevelColor('needs_improvement')).toBe('amber')
  })

  it('returns "red" for incomplete', () => {
    expect(getGradeLevelColor('incomplete')).toBe('red')
  })

  it('returns "gray" for unknown value', () => {
    expect(getGradeLevelColor('unknown' as GradeLevel)).toBe('gray')
  })
})

// =============================================================================
// getGradeLevelLabel
// =============================================================================

describe('getGradeLevelLabel', () => {
  it('returns "Excellent" for excellent', () => {
    expect(getGradeLevelLabel('excellent')).toBe('Excellent')
  })

  it('returns "Good" for good', () => {
    expect(getGradeLevelLabel('good')).toBe('Good')
  })

  it('returns "Needs Improvement" for needs_improvement', () => {
    expect(getGradeLevelLabel('needs_improvement')).toBe('Needs Improvement')
  })

  it('returns "Incomplete" for incomplete', () => {
    expect(getGradeLevelLabel('incomplete')).toBe('Incomplete')
  })

  it('returns "Unknown" for unknown value', () => {
    expect(getGradeLevelLabel('unknown' as GradeLevel)).toBe('Unknown')
  })
})

// =============================================================================
// getGradeLevelEmoji
// =============================================================================

describe('getGradeLevelEmoji', () => {
  it('returns star emoji for excellent', () => {
    expect(getGradeLevelEmoji('excellent')).toContain('\u{1F31F}')
  })

  it('returns thumbs up emoji for good', () => {
    expect(getGradeLevelEmoji('good')).toContain('\u{1F44D}')
  })

  it('returns pencil emoji for needs_improvement', () => {
    expect(getGradeLevelEmoji('needs_improvement')).toContain('\u{1F4DD}')
  })

  it('returns warning emoji for incomplete', () => {
    expect(getGradeLevelEmoji('incomplete')).toContain('\u{26A0}')
  })

  it('returns question mark emoji for unknown value', () => {
    expect(getGradeLevelEmoji('unknown' as GradeLevel)).toContain('\u{2753}')
  })
})

// =============================================================================
// analyzeHomework — input validation
// =============================================================================

describe('analyzeHomework — input validation', () => {
  it('requires taskImageUrl in image mode', async () => {
    await expect(analyzeHomework({
      inputMode: 'image',
      // No taskImageUrl
    })).rejects.toThrow()
  })

  it('requires taskText in text mode', async () => {
    await expect(analyzeHomework({
      inputMode: 'text',
      // No taskText
    })).rejects.toThrow()
  })

  it('handles text mode with taskText and answerText', async () => {
    // This will get past validation but fail at the AI call
    mockCreate.mockRejectedValue(new Error('Mock API error'))

    await expect(analyzeHomework({
      inputMode: 'text',
      taskText: 'Solve 2+2',
      answerText: '4',
    })).rejects.toThrow()
  })
})

// =============================================================================
// Grade level functions — all levels exhaustive
// =============================================================================

describe('grade level functions — exhaustive', () => {
  const levels: GradeLevel[] = ['excellent', 'good', 'needs_improvement', 'incomplete']

  it.each(levels)('all three functions return non-empty for %s', (level) => {
    expect(getGradeLevelColor(level)).toBeTruthy()
    expect(getGradeLevelLabel(level)).toBeTruthy()
    expect(getGradeLevelEmoji(level)).toBeTruthy()
  })

  it('all levels produce unique colors', () => {
    const colors = levels.map(l => getGradeLevelColor(l))
    expect(new Set(colors).size).toBe(4)
  })

  it('all levels produce unique labels', () => {
    const labels = levels.map(l => getGradeLevelLabel(l))
    expect(new Set(labels).size).toBe(4)
  })
})
