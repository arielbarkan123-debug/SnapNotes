/**
 * Tests for course-validator.ts
 * Covers: valid pass-through, lesson filtering (forbidden titles),
 * question step filtering, content step filtering, edge cases.
 */

import { filterForbiddenContent } from '@/lib/ai/course-validator'
import type { GeneratedCourse, Lesson, Step } from '@/types'

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
// Helpers
// =============================================================================

function makeCourse(lessons: Lesson[]): GeneratedCourse {
  return {
    title: 'Test Course',
    overview: 'A test course',
    lessons,
  }
}

function makeLesson(title: string, steps: Step[]): Lesson {
  return { title, steps }
}

function makeStep(type: Step['type'], content: string, title?: string): Step {
  return { type, content, ...(title ? { title } : {}) }
}

// =============================================================================
// Valid pass-through
// =============================================================================

describe('filterForbiddenContent — valid pass-through', () => {
  it('returns course unchanged when no forbidden content', () => {
    const course = makeCourse([
      makeLesson('Quadratic Equations', [
        makeStep('explanation', 'Learn about the quadratic formula'),
        makeStep('question', 'What is the solution to x^2 - 4 = 0?'),
      ]),
      makeLesson('Linear Functions', [
        makeStep('explanation', 'A linear function has the form y = mx + b'),
      ]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.lessons.length).toBe(2)
    expect(result.lessons[0].steps.length).toBe(2)
  })

  it('preserves course metadata', () => {
    const course = makeCourse([
      makeLesson('Lesson 1', [makeStep('explanation', 'Content')]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.title).toBe('Test Course')
    expect(result.overview).toBe('A test course')
  })
})

// =============================================================================
// Lesson filtering — forbidden titles
// =============================================================================

describe('filterForbiddenContent — lesson title filtering', () => {
  it('removes lesson with "Exam Structure" title', () => {
    const course = makeCourse([
      makeLesson('Exam Structure Overview', [
        makeStep('explanation', 'The exam has 3 parts'),
      ]),
      makeLesson('Algebra Basics', [
        makeStep('explanation', 'Learn algebra'),
      ]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.lessons.length).toBe(1)
    expect(result.lessons[0].title).toBe('Algebra Basics')
  })

  it('removes lesson with "Point Distribution" title', () => {
    const course = makeCourse([
      makeLesson('Point Values and Distribution', [
        makeStep('explanation', 'Each question is worth 10 points'),
      ]),
      makeLesson('Geometry', [makeStep('explanation', 'Triangles')]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.lessons.length).toBe(1)
    expect(result.lessons[0].title).toBe('Geometry')
  })

  it('removes lesson with "Grading Criteria" title', () => {
    const course = makeCourse([
      makeLesson('Grading Criteria', [makeStep('explanation', 'Rubric details')]),
      makeLesson('Real Content', [makeStep('explanation', 'Actual teaching')]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.lessons.length).toBe(1)
  })

  it('removes lesson with Hebrew forbidden title', () => {
    const course = makeCourse([
      makeLesson('מבנה הבחינה', [makeStep('explanation', 'הבחינה מחולקת לחלקים')]),
      makeLesson('אלגברה', [makeStep('explanation', 'משוואות')]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.lessons.length).toBe(1)
    expect(result.lessons[0].title).toBe('אלגברה')
  })

  it('removes lesson with "What to Bring" title', () => {
    const course = makeCourse([
      makeLesson('What to Bring to the Exam', [makeStep('explanation', 'Bring a calculator')]),
      makeLesson('Trigonometry', [makeStep('explanation', 'sin cos tan')]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.lessons.length).toBe(1)
  })
})

// =============================================================================
// Question step filtering
// =============================================================================

describe('filterForbiddenContent — question step filtering', () => {
  it('removes "how many points" questions', () => {
    const course = makeCourse([
      makeLesson('Math Review', [
        makeStep('question', 'How many points is Part A worth?'),
        makeStep('question', 'What is the derivative of x^2?'),
      ]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.lessons[0].steps.length).toBe(1)
    expect(result.lessons[0].steps[0].content).toContain('derivative')
  })

  it('removes "how long is the exam" questions', () => {
    const course = makeCourse([
      makeLesson('Math', [
        makeStep('question', 'How long is the exam?'),
        makeStep('explanation', 'The quadratic formula'),
      ]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.lessons[0].steps.length).toBe(1)
  })

  it('removes "what should you bring" questions', () => {
    const course = makeCourse([
      makeLesson('Prep', [
        makeStep('question', 'What should you bring to the test?'),
        makeStep('explanation', 'Valid math content'),
      ]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.lessons[0].steps.length).toBe(1)
  })

  it('removes Hebrew forbidden questions', () => {
    const course = makeCourse([
      makeLesson('Review', [
        makeStep('question', 'כמה נקודות שווה חלק א?'),
        makeStep('question', 'What is 2+2?'),
      ]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.lessons[0].steps.length).toBe(1)
  })
})

// =============================================================================
// Content step filtering
// =============================================================================

describe('filterForbiddenContent — content step filtering', () => {
  it('removes explanation steps about exam duration and points', () => {
    const course = makeCourse([
      makeLesson('Info', [
        makeStep('explanation', 'The exam is 2 hours long. Each question is worth 10 points each.'),
        makeStep('explanation', 'Quadratic equations are solved using the formula.'),
      ]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.lessons[0].steps.length).toBe(1)
    expect(result.lessons[0].steps[0].content).toContain('Quadratic')
  })

  it('keeps explanation steps with single forbidden pattern (needs 2+ to filter)', () => {
    const course = makeCourse([
      makeLesson('Info', [
        makeStep('explanation', 'You have 2 hours for this assignment.'),
        makeStep('explanation', 'Real content here'),
      ]),
    ])

    const result = filterForbiddenContent(course)
    // Single pattern match is not enough to filter (needs matchCount >= 2)
    expect(result.lessons[0].steps.length).toBe(2)
  })

  it('does not filter question or key_point step types by content pattern', () => {
    const course = makeCourse([
      makeLesson('Math', [
        makeStep('key_point', 'The exam is 3 hours. Worth 100 points total.'),
        makeStep('explanation', 'Real content'),
      ]),
    ])

    const result = filterForbiddenContent(course)
    // key_point type is not checked by isContentForbidden (only explanation/summary)
    expect(result.lessons[0].steps.length).toBe(2)
  })
})

// =============================================================================
// Edge cases
// =============================================================================

describe('filterForbiddenContent — edge cases', () => {
  it('returns original course when all lessons would be filtered', () => {
    const course = makeCourse([
      makeLesson('Exam Structure', [makeStep('explanation', 'Exam has 3 parts')]),
      makeLesson('Grading Rubric', [makeStep('explanation', 'Rubric details')]),
    ])

    const result = filterForbiddenContent(course)
    // When all lessons filtered, returns original
    expect(result.lessons.length).toBe(2)
  })

  it('removes lessons that become empty after step filtering', () => {
    const course = makeCourse([
      makeLesson('Test Info', [
        makeStep('question', 'How many points is this worth?'),
      ]),
      makeLesson('Real Math', [
        makeStep('explanation', 'Real content here'),
      ]),
    ])

    const result = filterForbiddenContent(course)
    expect(result.lessons.length).toBe(1)
    expect(result.lessons[0].title).toBe('Real Math')
  })

  it('handles course with empty lessons array', () => {
    const course = makeCourse([])
    const result = filterForbiddenContent(course)
    expect(result.lessons.length).toBe(0)
  })

  it('filters lesson when >70% of steps are forbidden', () => {
    const course = makeCourse([
      makeLesson('Mostly Bad', [
        makeStep('question', 'How many points total?'),
        makeStep('question', 'How long is the exam?'),
        makeStep('question', 'What materials are allowed?'),
        makeStep('question', 'What is 2+2?'), // Only valid step
      ]),
      makeLesson('Good Lesson', [makeStep('explanation', 'Real content')]),
    ])

    const result = filterForbiddenContent(course)
    // 3 out of 4 steps forbidden = 75% > 70% threshold
    expect(result.lessons.length).toBe(1)
    expect(result.lessons[0].title).toBe('Good Lesson')
  })
})
