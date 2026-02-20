import { validateFeedbackQuality } from '@/lib/homework/feedback-quality'
import type { FeedbackPoint } from '@/lib/homework/types'

// =============================================================================
// validateFeedbackQuality
// =============================================================================

describe('validateFeedbackQuality', () => {
  describe('passing feedback', () => {
    it('passes when all points meet quality standards', () => {
      const correct: FeedbackPoint[] = [
        {
          title: 'Problem 1 — Correct',
          description: 'The student correctly applied the distributive property to expand the expression and arrived at the correct answer of 42.',
        },
      ]
      const improvement: FeedbackPoint[] = [
        {
          title: 'Problem 2 — Calculation Error',
          description: 'The correct answer is 56. The student wrote 54. This appears to be a multiplication error: 7 × 8 = 56, not 54. To avoid this, review the multiplication table for 7s.',
          severity: 'major',
        },
      ]

      const result = validateFeedbackQuality(correct, improvement)
      expect(result.passed).toBe(true)
      expect(result.failingCorrectIndices).toHaveLength(0)
      expect(result.failingImprovementIndices).toHaveLength(0)
    })

    it('passes with empty arrays', () => {
      const result = validateFeedbackQuality([], [])
      expect(result.passed).toBe(true)
    })
  })

  describe('failing improvement points', () => {
    it('fails when improvement description is too short', () => {
      const improvement: FeedbackPoint[] = [
        {
          title: 'Problem 1',
          description: 'Wrong answer.',
          severity: 'major',
        },
      ]

      const result = validateFeedbackQuality([], improvement)
      expect(result.passed).toBe(false)
      expect(result.failingImprovementIndices).toContain(0)
      expect(result.reasons.some(r => r.includes('Too short'))).toBe(true)
    })

    it('fails when improvement is just a generic phrase', () => {
      const improvement: FeedbackPoint[] = [
        {
          title: 'Problem 1',
          description: 'try again',
          severity: 'major',
        },
      ]

      const result = validateFeedbackQuality([], improvement)
      expect(result.passed).toBe(false)
      expect(result.failingImprovementIndices).toContain(0)
    })

    it('fails when improvement is just "incorrect"', () => {
      const improvement: FeedbackPoint[] = [
        {
          title: 'Problem 1',
          description: 'incorrect',
          severity: 'major',
        },
      ]

      const result = validateFeedbackQuality([], improvement)
      expect(result.passed).toBe(false)
    })

    it('does NOT fail when "incorrect" is part of a longer explanation', () => {
      const improvement: FeedbackPoint[] = [
        {
          title: 'Problem 1',
          description: 'The answer is incorrect because the student added instead of multiplied. The correct answer is 40, calculated as 5 × 8 = 40 square centimeters.',
          severity: 'major',
        },
      ]

      const result = validateFeedbackQuality([], improvement)
      expect(result.passed).toBe(true)
    })

    it('fails when correct answer is not mentioned', () => {
      const improvement: FeedbackPoint[] = [
        {
          title: 'Problem 1',
          description: 'The student made an error in this problem. They need to review the topic more carefully and practice additional problems to improve their understanding of the concept.',
          severity: 'major',
        },
      ]

      const result = validateFeedbackQuality([], improvement)
      expect(result.passed).toBe(false)
      expect(result.reasons.some(r => r.includes('Missing correct answer'))).toBe(true)
    })

    it('passes when correct answer is referenced with "= X" pattern', () => {
      const improvement: FeedbackPoint[] = [
        {
          title: 'Problem 1',
          description: 'The student wrote 54, but the calculation shows = 56 which is the product of 7 and 8. The error likely comes from confusing 4 and 6 in multiplication.',
          severity: 'major',
        },
      ]

      const result = validateFeedbackQuality([], improvement)
      expect(result.passed).toBe(true)
    })

    it('passes when correct answer referenced with "should be"', () => {
      const improvement: FeedbackPoint[] = [
        {
          title: 'Problem 1',
          description: 'The area of the rectangle should be calculated using length times width, not addition. The result should be 40 square centimeters, not 13.',
          severity: 'major',
        },
      ]

      const result = validateFeedbackQuality([], improvement)
      expect(result.passed).toBe(true)
    })
  })

  describe('failing correct points', () => {
    it('fails when correct description is too short', () => {
      const correct: FeedbackPoint[] = [
        {
          title: 'Problem 1',
          description: 'Correct!',
        },
      ]

      const result = validateFeedbackQuality(correct, [])
      expect(result.passed).toBe(false)
      expect(result.failingCorrectIndices).toContain(0)
      expect(result.reasons.some(r => r.includes('Too short'))).toBe(true)
    })

    it('passes when correct description meets minimum length', () => {
      const correct: FeedbackPoint[] = [
        {
          title: 'Problem 1',
          description: 'The student correctly identified the area formula and applied multiplication to get 40 square centimeters.',
        },
      ]

      const result = validateFeedbackQuality(correct, [])
      expect(result.passed).toBe(true)
    })
  })

  describe('mixed correct and improvement points', () => {
    it('identifies failing items from both arrays', () => {
      const correct: FeedbackPoint[] = [
        { title: 'P1', description: 'Good.' },  // too short
        { title: 'P2', description: 'The student used the correct formula for area and got the right answer of 40 square cm.' },
      ]
      const improvement: FeedbackPoint[] = [
        { title: 'P3', description: 'needs work', severity: 'major' },  // generic + short
        {
          title: 'P4',
          description: 'The correct answer is 56. Student wrote 54. This is a multiplication error with 7 times 8 that resulted in an off-by-two mistake.',
          severity: 'major',
        },
      ]

      const result = validateFeedbackQuality(correct, improvement)
      expect(result.passed).toBe(false)
      expect(result.failingCorrectIndices).toEqual([0])
      expect(result.failingImprovementIndices).toEqual([0])
      expect(result.reasons).toHaveLength(2)
    })
  })

  describe('Hebrew feedback', () => {
    it('recognizes Hebrew answer pattern "התשובה הנכונה היא"', () => {
      const improvement: FeedbackPoint[] = [
        {
          title: 'שאלה 1',
          description: 'התשובה הנכונה היא 42. התלמיד כתב 43, כנראה בגלל טעות חישוב בחיבור של המספרים בשלב השני. יש לבדוק שוב את כל השלבים ולוודא שהחיבור נעשה נכון.',
          severity: 'major',
        },
      ]

      const result = validateFeedbackQuality([], improvement)
      expect(result.passed).toBe(true)
    })

    it('recognizes Hebrew pattern "צריך להיות"', () => {
      const improvement: FeedbackPoint[] = [
        {
          title: 'שאלה 2',
          description: 'התוצאה צריך להיות 56 ולא 54. התלמיד טעה בכפל של 7 כפול 8 שנותן 56 ולא 54. כדאי לתרגל את לוח הכפל של 7 כדי להימנע מטעויות דומות בעתיד.',
          severity: 'major',
        },
      ]

      const result = validateFeedbackQuality([], improvement)
      expect(result.passed).toBe(true)
    })
  })
})
