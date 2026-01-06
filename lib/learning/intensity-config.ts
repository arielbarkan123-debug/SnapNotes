/**
 * Lesson Intensity Configuration
 *
 * Provides intensity-specific learning parameters that complement age-based config.
 * Users select intensity when creating a course to match their learning goals:
 * - Quick: Fast overview, minimal practice
 * - Standard: Balanced explanation and practice
 * - Deep Practice: Mastery-focused with extensive practice
 */

import type { IntensityConfig, LessonIntensityMode } from '@/types'

/**
 * Intensity mode configurations
 */
export const INTENSITY_CONFIGS: Record<LessonIntensityMode, IntensityConfig> = {
  quick: {
    id: 'quick',
    targetDurationMinutes: { min: 10, max: 15 },
    stepsPerLesson: { min: 5, max: 8 },
    practiceRatio: 0.2, // 20% practice
    workedExamplesRequired: 1,
    practiceProblemsTarget: 2,
    masteryThreshold: 0.5, // 50% accuracy to pass
    allowRetryUntilMastery: false,
  },
  standard: {
    id: 'standard',
    targetDurationMinutes: { min: 20, max: 30 },
    stepsPerLesson: { min: 8, max: 12 },
    practiceRatio: 0.4, // 40% practice
    workedExamplesRequired: 2,
    practiceProblemsTarget: 4,
    masteryThreshold: 0.7, // 70% accuracy to pass
    allowRetryUntilMastery: false,
  },
  deep_practice: {
    id: 'deep_practice',
    targetDurationMinutes: { min: 45, max: 60 },
    stepsPerLesson: { min: 15, max: 25 },
    practiceRatio: 0.7, // 70% practice
    workedExamplesRequired: 1,
    practiceProblemsTarget: 15,
    masteryThreshold: 0.85, // 85% accuracy to pass
    allowRetryUntilMastery: true,
  },
}

/**
 * Get intensity configuration by mode
 */
export function getIntensityConfig(mode: LessonIntensityMode): IntensityConfig {
  return INTENSITY_CONFIGS[mode]
}

/**
 * Get all intensity modes for UI selection
 */
export function getIntensityModes(): Array<{
  id: LessonIntensityMode
  name: string
  nameHebrew: string
  description: string
  descriptionHebrew: string
  duration: string
  durationHebrew: string
  icon: string
}> {
  return [
    {
      id: 'quick',
      name: 'Quick',
      nameHebrew: 'מהיר',
      description: 'Key concepts overview',
      descriptionHebrew: 'סקירת מושגי מפתח',
      duration: '10-15 min',
      durationHebrew: '10-15 דקות',
      icon: 'zap', // Lightning bolt
    },
    {
      id: 'standard',
      name: 'Standard',
      nameHebrew: 'רגיל',
      description: 'Balanced learning',
      descriptionHebrew: 'למידה מאוזנת',
      duration: '20-30 min',
      durationHebrew: '20-30 דקות',
      icon: 'book-open', // Book
    },
    {
      id: 'deep_practice',
      name: 'Deep Practice',
      nameHebrew: 'תרגול מעמיק',
      description: 'Mastery-focused',
      descriptionHebrew: 'מוכוון שליטה',
      duration: '45-60 min',
      durationHebrew: '45-60 דקות',
      icon: 'target', // Target/bullseye
    },
  ]
}

/**
 * Calculate practice problems count based on intensity and difficulty
 */
export function calculatePracticeProblems(
  mode: LessonIntensityMode,
  _baseDifficulty: number // 1-10, reserved for future adaptive difficulty
): { easy: number; medium: number; hard: number } {
  const config = INTENSITY_CONFIGS[mode]
  const total = config.practiceProblemsTarget

  if (mode === 'quick') {
    return { easy: 1, medium: 1, hard: 0 }
  }

  if (mode === 'standard') {
    return { easy: 1, medium: 2, hard: 1 }
  }

  // Deep practice: graduated difficulty
  // Problems 1-4: easy (30%)
  // Problems 5-10: medium (40%)
  // Problems 11-15: hard (30%)
  const easy = Math.ceil(total * 0.3)
  const medium = Math.ceil(total * 0.4)
  const hard = total - easy - medium

  return { easy, medium, hard }
}

/**
 * Check if user has achieved mastery
 */
export function hasMasteredConcept(
  mode: LessonIntensityMode,
  correctCount: number,
  totalAttempts: number,
  minimumCorrect: number = 5
): boolean {
  if (totalAttempts === 0) return false

  const config = INTENSITY_CONFIGS[mode]
  const accuracy = correctCount / totalAttempts

  // For deep practice, need both accuracy threshold AND minimum correct
  if (mode === 'deep_practice') {
    return accuracy >= config.masteryThreshold && correctCount >= minimumCorrect
  }

  // For other modes, just check accuracy
  return accuracy >= config.masteryThreshold
}

/**
 * Calculate mastery level (0-1)
 */
export function calculateMasteryLevel(
  correctCount: number,
  totalAttempts: number,
  currentDifficulty: number,
  streakLength: number
): number {
  if (totalAttempts === 0) return 0

  // Base accuracy (50% weight)
  const accuracy = correctCount / totalAttempts
  const accuracyComponent = accuracy * 0.5

  // Difficulty bonus (30% weight) - higher difficulty = more mastery
  const difficultyNormalized = Math.min(currentDifficulty / 5, 1)
  const difficultyComponent = difficultyNormalized * 0.3

  // Streak bonus (20% weight) - consistent performance matters
  const streakNormalized = Math.min(streakLength / 5, 1)
  const streakComponent = streakNormalized * 0.2

  return Math.min(1, accuracyComponent + difficultyComponent + streakComponent)
}

/**
 * Determine next difficulty level based on performance
 */
export function getNextDifficulty(
  currentDifficulty: number,
  correctStreak: number,
  wrongStreak: number
): number {
  const minDifficulty = 1
  const maxDifficulty = 5

  // Increase difficulty after 3 correct in a row
  if (correctStreak >= 3) {
    return Math.min(maxDifficulty, currentDifficulty + 1)
  }

  // Decrease difficulty after 2 wrong in a row
  if (wrongStreak >= 2) {
    return Math.max(minDifficulty, currentDifficulty - 1)
  }

  return currentDifficulty
}

/**
 * Get feedback action based on performance
 */
export function getFeedbackAction(
  attemptsOnProblem: number,
  hintsUsed: number
): 'continue' | 'show_hint' | 'show_solution' | 'review_example' {
  // After 3 wrong attempts, show full solution
  if (attemptsOnProblem >= 3) {
    return 'show_solution'
  }

  // After 2 wrong attempts, strongly suggest hint
  if (attemptsOnProblem >= 2 && hintsUsed < 3) {
    return 'show_hint'
  }

  // If used all hints and still wrong, go back to example
  if (hintsUsed >= 3 && attemptsOnProblem >= 2) {
    return 'review_example'
  }

  return 'continue'
}

/**
 * Get prompt instructions for a specific intensity mode
 */
export function getIntensityPromptInstructions(mode: LessonIntensityMode): string {
  switch (mode) {
    case 'quick':
      return `Create a QUICK OVERVIEW lesson:
- Focus on the 2-3 most important concepts only
- Brief explanations (50-80 words each)
- 1 simple example
- 2 quick review questions
- Skip detailed derivations and edge cases
- Target duration: 10-15 minutes`

    case 'standard':
      return `Create a BALANCED lesson:
- Cover all key concepts with clear explanations
- 2 worked examples
- 4 practice questions distributed throughout
- Include key formulas with brief explanations
- Target duration: 20-30 minutes`

    case 'deep_practice':
      return `Create a MASTERY-FOCUSED lesson:
- Focus on ONE concept only - go deep, not wide
- 1 detailed worked example with step-by-step breakdown
- 15 practice problems with graduated difficulty:
  - Problems 1-4: Direct application (difficulty 1-2)
  - Problems 5-10: Variations (difficulty 2-3)
  - Problems 11-15: Challenging (difficulty 4-5)
- Each problem must include:
  - 3 progressive hints (general → specific → almost-answer)
  - Full worked solution
  - Common mistake explanation
- Concept summary at the end
- Target duration: 45-60 minutes of active practice`

    default:
      return ''
  }
}
