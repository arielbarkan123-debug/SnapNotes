/**
 * Age-Adaptive Feedback System
 *
 * Generates age-appropriate feedback for learning activities.
 *
 * Research basis:
 * - Immediate positive feedback improves young learner engagement
 * - Detailed constructive feedback improves adult learning outcomes
 * - Timely explanatory feedback works best for adolescents
 * - Self-efficacy improvement with AI feedback: Cohen's d = 0.312
 */

import { type AgeGroupConfig, getAgeGroupConfig } from '@/lib/learning/age-config'

// ============================================
// TYPES
// ============================================

export type FeedbackTone = 'enthusiastic' | 'supportive' | 'professional'
export type ExplanationDepth = 'brief' | 'moderate' | 'detailed'

export interface FeedbackContent {
  message: string
  showExplanation: boolean
  explanationDepth: ExplanationDepth
  tone: FeedbackTone
  delayMs: number
  emoji?: string
  showAnimation?: boolean
  soundEffect?: boolean
}

export interface AnswerFeedback extends FeedbackContent {
  isCorrect: boolean
  encouragement?: string
  hint?: string
  detailedExplanation?: string
}

// ============================================
// CORE FEEDBACK GENERATION
// ============================================

/**
 * Generate feedback for a question answer
 *
 * @param isCorrect - Whether the answer was correct
 * @param educationLevel - User's education level
 * @param explanation - Optional explanation to include
 * @returns Feedback content object
 */
export function generateAnswerFeedback(
  isCorrect: boolean,
  educationLevel: string,
  explanation?: string
): AnswerFeedback {
  const config = getAgeGroupConfig(educationLevel)
  const baseFeedback = getBaseFeedback(isCorrect, config)

  return {
    ...baseFeedback,
    isCorrect,
    detailedExplanation:
      baseFeedback.showExplanation && explanation ? explanation : undefined,
  }
}

/**
 * Get base feedback based on age group and correctness
 */
function getBaseFeedback(
  isCorrect: boolean,
  config: AgeGroupConfig
): FeedbackContent {
  const feedbackConfig = FEEDBACK_STYLES[config.feedbackStyle]
  const feedback = isCorrect ? feedbackConfig.correct : feedbackConfig.incorrect

  const messages = feedback.messages
  const message = messages[Math.floor(Math.random() * messages.length)]

  return {
    message,
    showExplanation: feedback.showExplanation,
    explanationDepth: feedback.explanationDepth,
    tone: feedback.tone,
    delayMs: config.feedbackDelay * 1000,
    emoji: feedback.emoji,
    showAnimation: feedback.showAnimation,
    soundEffect: feedback.soundEffect,
  }
}

// ============================================
// FEEDBACK STYLE CONFIGURATIONS
// ============================================

interface FeedbackStyleConfig {
  correct: {
    messages: string[]
    showExplanation: boolean
    explanationDepth: ExplanationDepth
    tone: FeedbackTone
    emoji?: string
    showAnimation?: boolean
    soundEffect?: boolean
  }
  incorrect: {
    messages: string[]
    showExplanation: boolean
    explanationDepth: ExplanationDepth
    tone: FeedbackTone
    emoji?: string
    showAnimation?: boolean
    soundEffect?: boolean
    encouragement?: string
  }
}

const FEEDBACK_STYLES: Record<
  AgeGroupConfig['feedbackStyle'],
  FeedbackStyleConfig
> = {
  immediate_positive: {
    correct: {
      messages: [
        'Amazing job!',
        'You got it!',
        'Super star!',
        'Wow, great work!',
        'Incredible!',
        'Perfect!',
        'You are so smart!',
        'Brilliant!',
      ],
      showExplanation: false,
      explanationDepth: 'brief',
      tone: 'enthusiastic',
      emoji: '🌟⭐🎉',
      showAnimation: true,
      soundEffect: true,
    },
    incorrect: {
      messages: [
        "Good try! Let's learn together",
        "Almost! You're getting better",
        "Keep going, you can do it!",
        "That's okay! Let's see why",
        "Nice effort! Here's a hint",
      ],
      showExplanation: true,
      explanationDepth: 'brief',
      tone: 'enthusiastic',
      emoji: '💪🌱✨',
      showAnimation: true,
      soundEffect: false,
      encouragement: "You're learning so much!",
    },
  },

  timely_explanatory: {
    correct: {
      messages: [
        'Correct!',
        'Well done!',
        "That's right!",
        'Good job!',
        'Nice work!',
        'Exactly!',
      ],
      showExplanation: true,
      explanationDepth: 'moderate',
      tone: 'supportive',
      emoji: '👍✓',
      showAnimation: true,
      soundEffect: false,
    },
    incorrect: {
      messages: [
        'Not quite right.',
        "Let's review this.",
        "Here's what to focus on:",
        'Take another look.',
        'Consider this:',
      ],
      showExplanation: true,
      explanationDepth: 'moderate',
      tone: 'supportive',
      emoji: '📝',
      showAnimation: false,
      soundEffect: false,
      encouragement: 'Keep practicing!',
    },
  },

  detailed_constructive: {
    correct: {
      messages: ['Correct.', "That's right.", 'Accurate.', 'Yes.'],
      showExplanation: true,
      explanationDepth: 'detailed',
      tone: 'professional',
      showAnimation: false,
      soundEffect: false,
    },
    incorrect: {
      messages: [
        'Incorrect. Review the explanation:',
        'Not correct. Consider:',
        'Incorrect response.',
        'Review the following:',
      ],
      showExplanation: true,
      explanationDepth: 'detailed',
      tone: 'professional',
      showAnimation: false,
      soundEffect: false,
    },
  },
}

// ============================================
// LESSON COMPLETION FEEDBACK
// ============================================

export interface LessonCompletionFeedback {
  title: string
  message: string
  encouragement: string
  nextSteps: string
  showCelebration: boolean
  celebrationLevel: 'high' | 'moderate' | 'minimal'
  emoji?: string
}

/**
 * Generate feedback for lesson completion
 *
 * @param accuracy - Percentage accuracy (0-100)
 * @param educationLevel - User's education level
 * @param lessonTitle - Title of the completed lesson
 * @returns Lesson completion feedback
 */
export function generateLessonCompletionFeedback(
  accuracy: number,
  educationLevel: string,
  lessonTitle: string
): LessonCompletionFeedback {
  const config = getAgeGroupConfig(educationLevel)

  switch (config.feedbackStyle) {
    case 'immediate_positive':
      return getYoungLearnerCompletionFeedback(accuracy, lessonTitle)
    case 'timely_explanatory':
      return getTeenCompletionFeedback(accuracy, lessonTitle)
    case 'detailed_constructive':
      return getAdultCompletionFeedback(accuracy, lessonTitle)
    default:
      return getTeenCompletionFeedback(accuracy, lessonTitle)
  }
}

function getYoungLearnerCompletionFeedback(
  accuracy: number,
  lessonTitle: string
): LessonCompletionFeedback {
  if (accuracy === 100) {
    return {
      title: 'PERFECT! 🏆',
      message: `You finished "${lessonTitle}" with a perfect score!`,
      encouragement: 'You are AMAZING! A true super star!',
      nextSteps: 'Ready for another adventure?',
      showCelebration: true,
      celebrationLevel: 'high',
      emoji: '🌟🎉🏆✨',
    }
  }

  if (accuracy >= 80) {
    return {
      title: 'Great Job! ⭐',
      message: `You finished "${lessonTitle}"!`,
      encouragement: `Wow! You got ${accuracy}% right! So cool!`,
      nextSteps: 'Keep learning! You are doing great!',
      showCelebration: true,
      celebrationLevel: 'high',
      emoji: '⭐🌟✨',
    }
  }

  if (accuracy >= 50) {
    return {
      title: 'Nice Work! 🌱',
      message: `You finished "${lessonTitle}"!`,
      encouragement: `You got ${accuracy}% right! You are learning!`,
      nextSteps: 'Practice makes perfect! Try again?',
      showCelebration: true,
      celebrationLevel: 'moderate',
      emoji: '🌱💪✨',
    }
  }

  return {
    title: 'Good Try! 💪',
    message: `You finished "${lessonTitle}"!`,
    encouragement: "Learning takes practice. You'll get better!",
    nextSteps: 'Try the lesson again to learn more!',
    showCelebration: true,
    celebrationLevel: 'moderate',
    emoji: '💪🌱',
  }
}

function getTeenCompletionFeedback(
  accuracy: number,
  lessonTitle: string
): LessonCompletionFeedback {
  if (accuracy === 100) {
    return {
      title: 'Perfect Score!',
      message: `Completed "${lessonTitle}" with 100% accuracy.`,
      encouragement: 'Flawless performance!',
      nextSteps: 'Move on to the next lesson.',
      showCelebration: true,
      celebrationLevel: 'moderate',
      emoji: '🎯',
    }
  }

  if (accuracy >= 80) {
    return {
      title: 'Great Job!',
      message: `Completed "${lessonTitle}" with ${accuracy}% accuracy.`,
      encouragement: 'Solid understanding!',
      nextSteps: 'Review missed questions or continue.',
      showCelebration: true,
      celebrationLevel: 'moderate',
      emoji: '👍',
    }
  }

  if (accuracy >= 50) {
    return {
      title: 'Lesson Complete',
      message: `Completed "${lessonTitle}" with ${accuracy}% accuracy.`,
      encouragement: 'Room for improvement.',
      nextSteps: 'Consider reviewing the lesson.',
      showCelebration: false,
      celebrationLevel: 'minimal',
      emoji: '📚',
    }
  }

  return {
    title: 'Lesson Complete',
    message: `Completed "${lessonTitle}" with ${accuracy}% accuracy.`,
    encouragement: 'More practice needed.',
    nextSteps: 'Review the lesson before continuing.',
    showCelebration: false,
    celebrationLevel: 'minimal',
    emoji: '📖',
  }
}

function getAdultCompletionFeedback(
  accuracy: number,
  lessonTitle: string
): LessonCompletionFeedback {
  if (accuracy === 100) {
    return {
      title: 'Lesson Complete',
      message: `"${lessonTitle}" completed with 100% accuracy.`,
      encouragement: 'Material mastered.',
      nextSteps: 'Proceed to next topic.',
      showCelebration: false,
      celebrationLevel: 'minimal',
    }
  }

  if (accuracy >= 80) {
    return {
      title: 'Lesson Complete',
      message: `"${lessonTitle}" completed. Accuracy: ${accuracy}%`,
      encouragement: 'Strong grasp of material.',
      nextSteps: 'Review flagged items or continue.',
      showCelebration: false,
      celebrationLevel: 'minimal',
    }
  }

  return {
    title: 'Lesson Complete',
    message: `"${lessonTitle}" completed. Accuracy: ${accuracy}%`,
    encouragement: accuracy >= 50 ? 'Partial mastery achieved.' : 'Review recommended.',
    nextSteps: 'Review missed concepts before proceeding.',
    showCelebration: false,
    celebrationLevel: 'minimal',
  }
}

// ============================================
// PROGRESS FEEDBACK
// ============================================

export interface ProgressFeedback {
  message: string
  tone: FeedbackTone
  showMilestone: boolean
  milestoneType?: 'minor' | 'major' | 'epic'
  emoji?: string
}

/**
 * Generate feedback for course progress milestones
 *
 * @param percentComplete - Percentage of course completed
 * @param educationLevel - User's education level
 * @returns Progress feedback
 */
export function generateProgressFeedback(
  percentComplete: number,
  educationLevel: string
): ProgressFeedback {
  const config = getAgeGroupConfig(educationLevel)

  // Determine milestone
  const milestone = getMilestone(percentComplete)

  switch (config.feedbackStyle) {
    case 'immediate_positive':
      return getYoungLearnerProgress(percentComplete, milestone)
    case 'timely_explanatory':
      return getTeenProgress(percentComplete, milestone)
    case 'detailed_constructive':
      return getAdultProgress(percentComplete, milestone)
    default:
      return getTeenProgress(percentComplete, milestone)
  }
}

function getMilestone(
  percent: number
): { type: 'minor' | 'major' | 'epic'; reached: boolean } | null {
  if (percent === 100)
    return { type: 'epic', reached: true }
  if (percent === 75)
    return { type: 'major', reached: true }
  if (percent === 50)
    return { type: 'major', reached: true }
  if (percent === 25)
    return { type: 'minor', reached: true }
  return null
}

function getYoungLearnerProgress(
  percent: number,
  milestone: { type: 'minor' | 'major' | 'epic'; reached: boolean } | null
): ProgressFeedback {
  if (!milestone) {
    return {
      message: `${percent}% done! Keep going!`,
      tone: 'enthusiastic',
      showMilestone: false,
      emoji: '🚀',
    }
  }

  if (milestone.type === 'epic') {
    return {
      message: 'WOW! You finished the WHOLE COURSE! You are INCREDIBLE!',
      tone: 'enthusiastic',
      showMilestone: true,
      milestoneType: 'epic',
      emoji: '🏆🎉🌟👑',
    }
  }

  if (milestone.type === 'major') {
    return {
      message: `${percent}% done! You are doing SO GREAT!`,
      tone: 'enthusiastic',
      showMilestone: true,
      milestoneType: 'major',
      emoji: '⭐🎉',
    }
  }

  return {
    message: `${percent}% done! Awesome start!`,
    tone: 'enthusiastic',
    showMilestone: true,
    milestoneType: 'minor',
    emoji: '🌟',
  }
}

function getTeenProgress(
  percent: number,
  milestone: { type: 'minor' | 'major' | 'epic'; reached: boolean } | null
): ProgressFeedback {
  if (!milestone) {
    return {
      message: `${percent}% complete`,
      tone: 'supportive',
      showMilestone: false,
    }
  }

  if (milestone.type === 'epic') {
    return {
      message: 'Course completed!',
      tone: 'supportive',
      showMilestone: true,
      milestoneType: 'epic',
      emoji: '🏆',
    }
  }

  if (milestone.type === 'major') {
    return {
      message: `${percent}% complete - ${milestone.type === 'major' ? 'Milestone reached!' : ''}`,
      tone: 'supportive',
      showMilestone: true,
      milestoneType: 'major',
      emoji: '🎯',
    }
  }

  return {
    message: `${percent}% complete`,
    tone: 'supportive',
    showMilestone: true,
    milestoneType: 'minor',
  }
}

function getAdultProgress(
  percent: number,
  milestone: { type: 'minor' | 'major' | 'epic'; reached: boolean } | null
): ProgressFeedback {
  if (milestone?.type === 'epic') {
    return {
      message: 'Course complete.',
      tone: 'professional',
      showMilestone: true,
      milestoneType: 'epic',
    }
  }

  return {
    message: `${percent}%`,
    tone: 'professional',
    showMilestone: false,
  }
}

// ============================================
// HINT GENERATION
// ============================================

export interface HintContent {
  hint: string
  tone: FeedbackTone
  showAfterAttempts: number
  progressiveHints: boolean
}

/**
 * Get hint configuration for age group
 *
 * @param educationLevel - User's education level
 * @returns Hint configuration
 */
export function getHintConfig(educationLevel: string): {
  showHints: boolean
  showAfterAttempts: number
  progressiveHints: boolean
  hintStyle: 'encouraging' | 'neutral' | 'direct'
} {
  const config = getAgeGroupConfig(educationLevel)

  switch (config.feedbackStyle) {
    case 'immediate_positive':
      return {
        showHints: true,
        showAfterAttempts: 1, // Show hints quickly for young learners
        progressiveHints: true,
        hintStyle: 'encouraging',
      }

    case 'timely_explanatory':
      return {
        showHints: true,
        showAfterAttempts: 2,
        progressiveHints: true,
        hintStyle: 'neutral',
      }

    case 'detailed_constructive':
      return {
        showHints: true,
        showAfterAttempts: 2,
        progressiveHints: false, // Adults get direct hints
        hintStyle: 'direct',
      }

    default:
      return {
        showHints: true,
        showAfterAttempts: 2,
        progressiveHints: true,
        hintStyle: 'neutral',
      }
  }
}

/**
 * Format a hint based on age group
 *
 * @param hint - The hint content
 * @param educationLevel - User's education level
 * @param attemptNumber - Which attempt this is
 * @returns Formatted hint content
 */
export function formatHint(
  hint: string,
  educationLevel: string,
  attemptNumber: number
): HintContent {
  const config = getAgeGroupConfig(educationLevel)
  const hintConfig = getHintConfig(educationLevel)

  let formattedHint = hint

  switch (hintConfig.hintStyle) {
    case 'encouraging':
      formattedHint =
        attemptNumber === 1
          ? `Here's a little help: ${hint}`
          : `You're getting closer! Try thinking about: ${hint}`
      break
    case 'neutral':
      formattedHint = `Hint: ${hint}`
      break
    case 'direct':
      formattedHint = hint
      break
  }

  return {
    hint: formattedHint,
    tone: FEEDBACK_STYLES[config.feedbackStyle].correct.tone,
    showAfterAttempts: hintConfig.showAfterAttempts,
    progressiveHints: hintConfig.progressiveHints,
  }
}

// ============================================
// EXPORT HELPER
// ============================================

/**
 * Get all feedback settings for an education level
 *
 * @param educationLevel - User's education level
 * @returns Complete feedback configuration
 */
export function getFeedbackSettings(educationLevel: string): {
  feedbackDelay: number
  showExplanations: boolean
  explanationDepth: ExplanationDepth
  tone: FeedbackTone
  showAnimations: boolean
  soundEffects: boolean
  encouragementLevel: 'high' | 'moderate' | 'minimal'
} {
  const config = getAgeGroupConfig(educationLevel)

  return {
    feedbackDelay: config.feedbackDelay * 1000,
    showExplanations: config.showDetailedExplanations,
    explanationDepth:
      FEEDBACK_STYLES[config.feedbackStyle].correct.explanationDepth,
    tone: FEEDBACK_STYLES[config.feedbackStyle].correct.tone,
    showAnimations:
      FEEDBACK_STYLES[config.feedbackStyle].correct.showAnimation ?? false,
    soundEffects:
      FEEDBACK_STYLES[config.feedbackStyle].correct.soundEffect ?? false,
    encouragementLevel: config.encouragementLevel,
  }
}
