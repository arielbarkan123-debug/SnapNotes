/**
 * Tests for isQuestionQualityAcceptable in lib/srs/card-generator.ts
 */

import { isQuestionQualityAcceptable } from '@/lib/srs'

describe('isQuestionQualityAcceptable', () => {
  // =========================================================================
  // Good questions — should pass
  // =========================================================================

  describe('accepts good questions', () => {
    it('accepts a well-formed understanding question', () => {
      expect(isQuestionQualityAcceptable('What is the main function of mitochondria?')).toBe(true)
    })

    it('accepts a computational math problem', () => {
      expect(isQuestionQualityAcceptable('Solve: What is 3/4 + 1/2?')).toBe(true)
    })

    it('accepts an imperative-style question without question mark', () => {
      expect(isQuestionQualityAcceptable('Calculate: 25% of 80 equals what value')).toBe(true)
    })

    it('accepts a convert-style question', () => {
      expect(isQuestionQualityAcceptable('Convert: 0.75 to a fraction')).toBe(true)
    })

    it('accepts a simplify-style question', () => {
      expect(isQuestionQualityAcceptable('Simplify: the fraction 12/18 to lowest terms')).toBe(true)
    })

    it('accepts a "why" question', () => {
      expect(isQuestionQualityAcceptable('Why do warm fronts cause gradual weather changes?')).toBe(true)
    })

    it('accepts a "how does" question', () => {
      expect(isQuestionQualityAcceptable('How does natural selection drive evolution over time?')).toBe(true)
    })

    it('accepts a longer analytical question', () => {
      expect(isQuestionQualityAcceptable('What are the key differences between aerobic and anaerobic respiration?')).toBe(true)
    })

    it('accepts an evaluate-style question', () => {
      expect(isQuestionQualityAcceptable('Evaluate: the expression 2x + 3 when x = 5')).toBe(true)
    })

    it('accepts a find-style question', () => {
      expect(isQuestionQualityAcceptable('Find: the area of a circle with radius 7cm')).toBe(true)
    })

    it('accepts a determine-style question', () => {
      expect(isQuestionQualityAcceptable('Determine: the slope of line y = 3x + 2')).toBe(true)
    })

    it('accepts a compute-style question', () => {
      expect(isQuestionQualityAcceptable('Compute: the standard deviation of 2, 4, 6, 8')).toBe(true)
    })
  })

  // =========================================================================
  // Bad questions — should reject
  // =========================================================================

  describe('rejects garbage questions', () => {
    it('rejects "What does when comparing do?"', () => {
      expect(isQuestionQualityAcceptable('What does when comparing do?')).toBe(false)
    })

    it('rejects "What is when a fraction is..."', () => {
      expect(isQuestionQualityAcceptable('What is when a fraction is converted?')).toBe(false)
    })

    it('rejects generic single-word subject "What does comparing do?"', () => {
      expect(isQuestionQualityAcceptable('What does comparing do?')).toBe(false)
    })

    it('rejects "What is a key point about percentages?"', () => {
      expect(isQuestionQualityAcceptable('What is a key point about percentages?')).toBe(false)
    })

    it('rejects "What does do?"', () => {
      expect(isQuestionQualityAcceptable('What does do something about it?')).toBe(false)
    })

    it('rejects "What is ?"', () => {
      expect(isQuestionQualityAcceptable('What is ?')).toBe(false)
    })

    it('rejects "Explain:"', () => {
      expect(isQuestionQualityAcceptable('Explain:')).toBe(false)
    })

    it('rejects "Explain: "', () => {
      expect(isQuestionQualityAcceptable('Explain: ')).toBe(false)
    })
  })

  // =========================================================================
  // Edge cases
  // =========================================================================

  describe('edge cases', () => {
    it('rejects null', () => {
      expect(isQuestionQualityAcceptable(null as unknown as string)).toBe(false)
    })

    it('rejects undefined', () => {
      expect(isQuestionQualityAcceptable(undefined as unknown as string)).toBe(false)
    })

    it('rejects empty string', () => {
      expect(isQuestionQualityAcceptable('')).toBe(false)
    })

    it('rejects whitespace-only string', () => {
      expect(isQuestionQualityAcceptable('   ')).toBe(false)
    })

    it('rejects a question with fewer than 5 words', () => {
      expect(isQuestionQualityAcceptable('What is math?')).toBe(false)
    })

    it('rejects a non-question, non-imperative sentence without question mark', () => {
      expect(isQuestionQualityAcceptable('This is a statement about fractions and decimals')).toBe(false)
    })

    it('rejects a number type input', () => {
      expect(isQuestionQualityAcceptable(42 as unknown as string)).toBe(false)
    })

    it('accepts exactly 5 words with question mark', () => {
      expect(isQuestionQualityAcceptable('What is the area formula?')).toBe(true)
    })
  })

  // =========================================================================
  // Hebrew questions — should pass (Gap 1 fix validation)
  // =========================================================================

  describe('accepts Hebrew questions', () => {
    it('accepts a Hebrew question ending with question mark', () => {
      expect(isQuestionQualityAcceptable('מה הפונקציה העיקרית של המיטוכונדריה?')).toBe(true)
    })

    it('accepts a Hebrew computational question with פתור:', () => {
      expect(isQuestionQualityAcceptable('פתור: מה הסכום של 3/4 + 1/2?')).toBe(true)
    })

    it('accepts a Hebrew computational question with חשב:', () => {
      expect(isQuestionQualityAcceptable('חשב: 25% מ-80')).toBe(true)
    })

    it('accepts a Hebrew computational question with המר:', () => {
      expect(isQuestionQualityAcceptable('המר: 0.75 לשבר')).toBe(true)
    })

    it('accepts a Hebrew computational question with פשט:', () => {
      expect(isQuestionQualityAcceptable('פשט: את השבר 12/18')).toBe(true)
    })

    it('accepts a Hebrew understanding question', () => {
      expect(isQuestionQualityAcceptable('מדוע חזיתות חמות גורמות לשינויי מזג אוויר הדרגתיים?')).toBe(true)
    })

    it('accepts a Hebrew "how" question', () => {
      expect(isQuestionQualityAcceptable('כיצד פועל תהליך הפוטוסינתזה?')).toBe(true)
    })

    it('rejects very short Hebrew question', () => {
      // "מה זה?" = only 2 words
      expect(isQuestionQualityAcceptable('מה זה?')).toBe(false)
    })

    it('accepts Hebrew question with exactly 3 words', () => {
      // "מה זה מיטוכונדריה?" = 3 words
      expect(isQuestionQualityAcceptable('מה זה מיטוכונדריה?')).toBe(true)
    })

    it('accepts Hebrew explanation-style question with הסבר:', () => {
      expect(isQuestionQualityAcceptable('הסבר: מדוע הברירה הטבעית מניעה אבולוציה?')).toBe(true)
    })
  })
})
