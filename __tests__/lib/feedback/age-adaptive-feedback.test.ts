/**
 * Tests for lib/feedback/age-adaptive-feedback.ts
 *
 * Tests generateAnswerFeedback, generateLessonCompletionFeedback,
 * generateProgressFeedback, getHintConfig, formatHint, getFeedbackSettings
 */

import {
  generateAnswerFeedback,
  generateLessonCompletionFeedback,
  generateProgressFeedback,
  getHintConfig,
  formatHint,
  getFeedbackSettings,
} from '@/lib/feedback/age-adaptive-feedback'

// =============================================================================
// generateAnswerFeedback
// =============================================================================

describe('generateAnswerFeedback', () => {
  // Elementary = immediate_positive
  describe('elementary (immediate_positive)', () => {
    it('should return enthusiastic tone for correct answer', () => {
      const feedback = generateAnswerFeedback(true, 'elementary')
      expect(feedback.isCorrect).toBe(true)
      expect(feedback.tone).toBe('enthusiastic')
      expect(feedback.showAnimation).toBe(true)
      expect(feedback.soundEffect).toBe(true)
      expect(feedback.showExplanation).toBe(false)
    })

    it('should return enthusiastic tone for incorrect answer with explanation', () => {
      const feedback = generateAnswerFeedback(false, 'elementary', 'The answer is 5')
      expect(feedback.isCorrect).toBe(false)
      expect(feedback.tone).toBe('enthusiastic')
      expect(feedback.showExplanation).toBe(true)
      expect(feedback.explanationDepth).toBe('brief')
      expect(feedback.detailedExplanation).toBe('The answer is 5')
    })

    it('should have 0ms delay for elementary feedback', () => {
      const feedback = generateAnswerFeedback(true, 'elementary')
      expect(feedback.delayMs).toBe(0) // 0 seconds * 1000
    })
  })

  // Middle school = timely_explanatory
  describe('middle_school (timely_explanatory)', () => {
    it('should return supportive tone for correct answer', () => {
      const feedback = generateAnswerFeedback(true, 'middle_school')
      expect(feedback.tone).toBe('supportive')
      expect(feedback.showExplanation).toBe(true)
      expect(feedback.explanationDepth).toBe('moderate')
    })

    it('should return supportive tone for incorrect answer', () => {
      const feedback = generateAnswerFeedback(false, 'middle_school')
      expect(feedback.tone).toBe('supportive')
      expect(feedback.showExplanation).toBe(true)
    })

    it('should have 1s delay for middle school', () => {
      const feedback = generateAnswerFeedback(true, 'middle_school')
      expect(feedback.delayMs).toBe(1000)
    })
  })

  // High school = also timely_explanatory
  describe('high_school (timely_explanatory)', () => {
    it('should return supportive tone', () => {
      const feedback = generateAnswerFeedback(true, 'high_school')
      expect(feedback.tone).toBe('supportive')
    })

    it('should have 2s delay for high school', () => {
      const feedback = generateAnswerFeedback(true, 'high_school')
      expect(feedback.delayMs).toBe(2000)
    })
  })

  // University = detailed_constructive
  describe('university (detailed_constructive)', () => {
    it('should return professional tone for correct answer', () => {
      const feedback = generateAnswerFeedback(true, 'university')
      expect(feedback.tone).toBe('professional')
      expect(feedback.showExplanation).toBe(true)
      expect(feedback.explanationDepth).toBe('detailed')
      expect(feedback.showAnimation).toBe(false)
      expect(feedback.soundEffect).toBe(false)
    })

    it('should return professional tone for incorrect answer', () => {
      const feedback = generateAnswerFeedback(false, 'university')
      expect(feedback.tone).toBe('professional')
      expect(feedback.showExplanation).toBe(true)
    })

    it('should have 3s delay for university', () => {
      const feedback = generateAnswerFeedback(true, 'university')
      expect(feedback.delayMs).toBe(3000)
    })
  })

  // Professional = detailed_constructive
  describe('professional (detailed_constructive)', () => {
    it('should return professional tone', () => {
      const feedback = generateAnswerFeedback(true, 'professional')
      expect(feedback.tone).toBe('professional')
    })

    it('should have 5s delay for professional', () => {
      const feedback = generateAnswerFeedback(true, 'professional')
      expect(feedback.delayMs).toBe(5000)
    })
  })

  // Fallback for unknown education level
  describe('unknown education level', () => {
    it('should fallback to high_school config (timely_explanatory)', () => {
      const feedback = generateAnswerFeedback(true, 'unknown_level')
      expect(feedback.tone).toBe('supportive')
    })
  })

  it('should not include detailedExplanation when showExplanation is false', () => {
    // elementary correct answers have showExplanation: false
    const feedback = generateAnswerFeedback(true, 'elementary', 'Some explanation')
    expect(feedback.detailedExplanation).toBeUndefined()
  })
})

// =============================================================================
// generateLessonCompletionFeedback
// =============================================================================

describe('generateLessonCompletionFeedback', () => {
  describe('elementary (young learner)', () => {
    it('should celebrate perfect score with high celebration', () => {
      const feedback = generateLessonCompletionFeedback(100, 'elementary', 'Math Basics')
      expect(feedback.title).toContain('PERFECT')
      expect(feedback.showCelebration).toBe(true)
      expect(feedback.celebrationLevel).toBe('high')
    })

    it('should celebrate 80%+ with high celebration', () => {
      const feedback = generateLessonCompletionFeedback(85, 'elementary', 'Math Basics')
      expect(feedback.showCelebration).toBe(true)
      expect(feedback.celebrationLevel).toBe('high')
    })

    it('should give moderate celebration for 50-79%', () => {
      const feedback = generateLessonCompletionFeedback(60, 'elementary', 'Math Basics')
      expect(feedback.showCelebration).toBe(true)
      expect(feedback.celebrationLevel).toBe('moderate')
    })

    it('should still encourage for low score', () => {
      const feedback = generateLessonCompletionFeedback(30, 'elementary', 'Math Basics')
      expect(feedback.showCelebration).toBe(true)
      expect(feedback.celebrationLevel).toBe('moderate')
    })
  })

  describe('high_school (teen)', () => {
    it('should give moderate celebration for perfect score', () => {
      const feedback = generateLessonCompletionFeedback(100, 'high_school', 'Chemistry')
      expect(feedback.title).toContain('Perfect')
      expect(feedback.celebrationLevel).toBe('moderate')
    })

    it('should give minimal celebration for below 50%', () => {
      const feedback = generateLessonCompletionFeedback(40, 'high_school', 'Chemistry')
      expect(feedback.celebrationLevel).toBe('minimal')
      expect(feedback.showCelebration).toBe(false)
    })
  })

  describe('university (adult)', () => {
    it('should be minimal for perfect score', () => {
      const feedback = generateLessonCompletionFeedback(100, 'university', 'Linear Algebra')
      expect(feedback.showCelebration).toBe(false)
      expect(feedback.celebrationLevel).toBe('minimal')
    })

    it('should give review recommendation for low score', () => {
      const feedback = generateLessonCompletionFeedback(40, 'university', 'Linear Algebra')
      expect(feedback.encouragement).toBe('Review recommended.')
    })

    it('should say partial mastery for moderate score', () => {
      const feedback = generateLessonCompletionFeedback(60, 'university', 'Linear Algebra')
      expect(feedback.encouragement).toBe('Partial mastery achieved.')
    })
  })
})

// =============================================================================
// generateProgressFeedback
// =============================================================================

describe('generateProgressFeedback', () => {
  describe('elementary (young learner)', () => {
    it('should be enthusiastic for 100% milestone', () => {
      const feedback = generateProgressFeedback(100, 'elementary')
      expect(feedback.tone).toBe('enthusiastic')
      expect(feedback.showMilestone).toBe(true)
      expect(feedback.milestoneType).toBe('epic')
    })

    it('should show milestone for 25%', () => {
      const feedback = generateProgressFeedback(25, 'elementary')
      expect(feedback.showMilestone).toBe(true)
      expect(feedback.milestoneType).toBe('minor')
    })

    it('should not show milestone for non-milestone percent', () => {
      const feedback = generateProgressFeedback(33, 'elementary')
      expect(feedback.showMilestone).toBe(false)
    })
  })

  describe('university (adult)', () => {
    it('should show milestone only for 100% completion', () => {
      const feedback = generateProgressFeedback(100, 'university')
      expect(feedback.showMilestone).toBe(true)
      expect(feedback.milestoneType).toBe('epic')
    })

    it('should not show milestone for 50%', () => {
      const feedback = generateProgressFeedback(50, 'university')
      expect(feedback.showMilestone).toBe(false)
    })
  })
})

// =============================================================================
// getHintConfig
// =============================================================================

describe('getHintConfig', () => {
  it('should show hints after 1 attempt for elementary', () => {
    const config = getHintConfig('elementary')
    expect(config.showHints).toBe(true)
    expect(config.showAfterAttempts).toBe(1)
    expect(config.progressiveHints).toBe(true)
    expect(config.hintStyle).toBe('encouraging')
  })

  it('should show hints after 2 attempts for middle school', () => {
    const config = getHintConfig('middle_school')
    expect(config.showAfterAttempts).toBe(2)
    expect(config.hintStyle).toBe('neutral')
  })

  it('should use direct hints for university', () => {
    const config = getHintConfig('university')
    expect(config.showAfterAttempts).toBe(2)
    expect(config.progressiveHints).toBe(false)
    expect(config.hintStyle).toBe('direct')
  })
})

// =============================================================================
// formatHint
// =============================================================================

describe('formatHint', () => {
  it('should format encouraging hint for elementary first attempt', () => {
    const result = formatHint('Think about addition', 'elementary', 1)
    expect(result.hint).toContain("Here's a little help:")
    expect(result.hint).toContain('Think about addition')
    expect(result.tone).toBe('enthusiastic')
  })

  it('should format progressive hint for elementary later attempt', () => {
    const result = formatHint('Try again', 'elementary', 2)
    expect(result.hint).toContain("You're getting closer!")
  })

  it('should format neutral hint for middle school', () => {
    const result = formatHint('Check your formula', 'middle_school', 1)
    expect(result.hint).toBe('Hint: Check your formula')
    expect(result.tone).toBe('supportive')
  })

  it('should format direct hint for university', () => {
    const result = formatHint('Apply the chain rule', 'university', 1)
    expect(result.hint).toBe('Apply the chain rule')
    expect(result.tone).toBe('professional')
  })
})

// =============================================================================
// getFeedbackSettings
// =============================================================================

describe('getFeedbackSettings', () => {
  it('should return correct settings for elementary', () => {
    const settings = getFeedbackSettings('elementary')
    expect(settings.feedbackDelay).toBe(0)
    expect(settings.tone).toBe('enthusiastic')
    expect(settings.showAnimations).toBe(true)
    expect(settings.soundEffects).toBe(true)
    expect(settings.encouragementLevel).toBe('high')
    expect(settings.showExplanations).toBe(false)
  })

  it('should return correct settings for university', () => {
    const settings = getFeedbackSettings('university')
    expect(settings.feedbackDelay).toBe(3000)
    expect(settings.tone).toBe('professional')
    expect(settings.showAnimations).toBe(false)
    expect(settings.soundEffects).toBe(false)
    expect(settings.encouragementLevel).toBe('minimal')
    expect(settings.showExplanations).toBe(true)
  })

  it('should return correct settings for high_school', () => {
    const settings = getFeedbackSettings('high_school')
    expect(settings.feedbackDelay).toBe(2000)
    expect(settings.tone).toBe('supportive')
    expect(settings.encouragementLevel).toBe('moderate')
  })
})
