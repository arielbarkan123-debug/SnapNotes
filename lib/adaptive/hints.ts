/**
 * Adaptive Learning - Hints System
 *
 * Provides contextual hints for struggling users
 * to help them understand concepts better.
 */

import { Step, StepType } from '@/types'
import { UserPerformance, calculateMastery } from './mastery'

// ============================================
// TYPES
// ============================================

export type HintType = 'tip' | 'reminder' | 'simplification' | 'example'

export interface Hint {
  type: HintType
  content: string
  icon?: string
}

export interface HintContext {
  /** Current step being displayed */
  step: Step
  /** User's performance data */
  performance?: UserPerformance
  /** Number of consecutive wrong answers */
  consecutiveWrong?: number
  /** Time spent on current step in seconds */
  timeOnStep?: number
  /** Whether user explicitly requested a hint */
  requested?: boolean
}

export interface HintTriggerResult {
  shouldShow: boolean
  reason: 'consecutive_wrong' | 'low_mastery' | 'slow_progress' | 'requested' | null
}

// ============================================
// TRIGGER CONDITIONS
// ============================================

const TRIGGER_THRESHOLDS = {
  consecutiveWrong: 2,    // Show hint after 2 wrong answers
  masteryLevel: 0.3,      // Show hint if mastery below 30%
  slowProgressSeconds: 60, // Show hint after 60 seconds
  minAttempts: 2,         // Min attempts before showing mastery-based hints
}

/**
 * Check if hint should be triggered based on context
 */
export function shouldTriggerHint(context: HintContext): HintTriggerResult {
  // Always show if explicitly requested
  if (context.requested) {
    return { shouldShow: true, reason: 'requested' }
  }

  // Check consecutive wrong answers (for questions)
  if (
    context.step.type === 'question' &&
    context.consecutiveWrong !== undefined &&
    context.consecutiveWrong >= TRIGGER_THRESHOLDS.consecutiveWrong
  ) {
    return { shouldShow: true, reason: 'consecutive_wrong' }
  }

  // Check low mastery level
  if (context.performance) {
    const mastery = calculateMastery(context.performance)
    if (
      mastery < TRIGGER_THRESHOLDS.masteryLevel &&
      context.performance.attempts >= TRIGGER_THRESHOLDS.minAttempts
    ) {
      return { shouldShow: true, reason: 'low_mastery' }
    }
  }

  // Check slow progress
  if (
    context.timeOnStep !== undefined &&
    context.timeOnStep >= TRIGGER_THRESHOLDS.slowProgressSeconds
  ) {
    return { shouldShow: true, reason: 'slow_progress' }
  }

  return { shouldShow: false, reason: null }
}

// ============================================
// HINT GENERATION
// ============================================

/**
 * Generate an appropriate hint based on step type and context
 *
 * @param step - The current lesson step
 * @param context - Additional context for hint generation
 * @returns Hint object or null if no hint needed
 */
export function generateHint(context: HintContext): Hint | null {
  const trigger = shouldTriggerHint(context)

  if (!trigger.shouldShow) {
    return null
  }

  const { step } = context

  switch (step.type) {
    case 'question':
      return generateQuestionHint(step, trigger.reason)
    case 'formula':
      return generateFormulaHint(step)
    case 'explanation':
      return generateExplanationHint(step, trigger.reason)
    case 'key_point':
      return generateKeyPointHint(step)
    case 'example':
      return generateExampleHint(step)
    case 'diagram':
      return generateDiagramHint(step)
    case 'summary':
      return generateSummaryHint(step)
    default:
      return getGenericHint()
  }
}

// ============================================
// STEP-SPECIFIC HINTS
// ============================================

function generateQuestionHint(step: Step, reason: HintTriggerResult['reason']): Hint {
  // Extract keywords from question for context
  const content = step.content.toLowerCase()

  // Check for common question patterns
  if (content.includes('which') || content.includes('what')) {
    return {
      type: 'tip',
      content: 'Try eliminating answers you know are wrong first. This narrows down your choices.',
      icon: '💡',
    }
  }

  if (content.includes('why') || content.includes('explain')) {
    return {
      type: 'reminder',
      content: 'Think about cause and effect. What leads to what?',
      icon: '🔍',
    }
  }

  if (content.includes('calculate') || content.includes('how many') || content.includes('how much')) {
    return {
      type: 'tip',
      content: 'Break down the problem into smaller steps. What information do you have?',
      icon: '🧮',
    }
  }

  // Default question hints based on trigger reason
  if (reason === 'consecutive_wrong') {
    return {
      type: 'tip',
      content: 'Take a moment to re-read the question carefully. Sometimes key details are easy to miss.',
      icon: '👀',
    }
  }

  return {
    type: 'reminder',
    content: 'Think back to the key points from this lesson. Which one relates to this question?',
    icon: '💭',
  }
}

function generateFormulaHint(_step: Step): Hint {
  return {
    type: 'example',
    content: 'Try plugging in simple numbers first (like 1, 2, or 10) to see how the formula works. This helps build intuition.',
    icon: '🔢',
  }
}

function generateExplanationHint(step: Step, reason: HintTriggerResult['reason']): Hint {
  if (reason === 'slow_progress') {
    return {
      type: 'simplification',
      content: 'Focus on understanding the main idea first. Don\'t worry about memorizing every detail - just get the big picture.',
      icon: '🎯',
    }
  }

  return {
    type: 'tip',
    content: 'Try reading this out loud or in your own words. This helps the information stick better.',
    icon: '📖',
  }
}

function generateKeyPointHint(_step: Step): Hint {
  return {
    type: 'reminder',
    content: 'This is an important concept to remember. Try connecting it to something you already know.',
    icon: '⭐',
  }
}

function generateExampleHint(_step: Step): Hint {
  return {
    type: 'tip',
    content: 'Pay attention to how this example applies the concept. Can you think of a similar example?',
    icon: '💡',
  }
}

function generateDiagramHint(_step: Step): Hint {
  return {
    type: 'tip',
    content: 'Look at the original image in your notes. Visual connections help reinforce understanding.',
    icon: '🖼️',
  }
}

function generateSummaryHint(_step: Step): Hint {
  return {
    type: 'reminder',
    content: 'This summary captures the key takeaways. Try reciting them from memory before moving on.',
    icon: '📝',
  }
}

function getGenericHint(): Hint {
  return {
    type: 'tip',
    content: 'Take your time. Understanding is more important than speed.',
    icon: '💡',
  }
}

// ============================================
// HINT VARIATIONS
// ============================================

/**
 * Get a variation of a hint to avoid repetition
 */
export function getHintVariation(stepType: StepType, variationIndex: number = 0): Hint {
  const hints = HINT_VARIATIONS[stepType] || HINT_VARIATIONS.default
  const index = variationIndex % hints.length
  return hints[index]
}

const HINT_VARIATIONS: Record<StepType | 'default', Hint[]> = {
  question: [
    { type: 'tip', content: 'Try eliminating obviously wrong answers first.', icon: '💡' },
    { type: 'reminder', content: 'Think about what you learned in the key points.', icon: '💭' },
    { type: 'tip', content: 'Read each option carefully before choosing.', icon: '👀' },
    { type: 'simplification', content: 'What is the question really asking?', icon: '🎯' },
  ],
  formula: [
    { type: 'example', content: 'Try plugging in simple numbers like 1, 2, or 10.', icon: '🔢' },
    { type: 'tip', content: 'Identify what each variable represents.', icon: '📐' },
    { type: 'reminder', content: 'Write out each step of the calculation.', icon: '✏️' },
  ],
  explanation: [
    { type: 'simplification', content: 'Focus on the main idea first.', icon: '🎯' },
    { type: 'tip', content: 'Try explaining this in your own words.', icon: '💬' },
    { type: 'reminder', content: 'Connect this to something you already know.', icon: '🔗' },
  ],
  key_point: [
    { type: 'reminder', content: 'This is important! Make a mental note.', icon: '⭐' },
    { type: 'tip', content: 'Create a mnemonic or association to remember this.', icon: '🧠' },
  ],
  example: [
    { type: 'tip', content: 'Notice the pattern in this example.', icon: '🔍' },
    { type: 'reminder', content: 'Think of a similar example from real life.', icon: '💭' },
  ],
  diagram: [
    { type: 'tip', content: 'Check the original image for visual reference.', icon: '🖼️' },
    { type: 'reminder', content: 'Trace the relationships shown in the diagram.', icon: '🔗' },
  ],
  summary: [
    { type: 'reminder', content: 'Try to recall these points before reading them.', icon: '📝' },
    { type: 'tip', content: 'Make sure you understand each point before moving on.', icon: '✅' },
  ],
  worked_example: [
    { type: 'tip', content: 'Follow along with each step carefully.', icon: '👀' },
    { type: 'reminder', content: 'Understand the reasoning before moving on.', icon: '🧠' },
    { type: 'tip', content: 'Try to predict the next step before reading it.', icon: '💭' },
  ],
  practice_problem: [
    { type: 'tip', content: 'Try solving this on paper first.', icon: '✏️' },
    { type: 'reminder', content: 'Apply what you learned from the worked example.', icon: '📝' },
    { type: 'simplification', content: 'Break the problem into smaller steps.', icon: '🔢' },
  ],
  default: [
    { type: 'tip', content: 'Take your time. Understanding is key.', icon: '💡' },
    { type: 'reminder', content: 'Don\'t hesitate to review previous steps.', icon: '↩️' },
  ],
}

// ============================================
// HINT TRACKING
// ============================================

export interface HintUsage {
  stepIndex: number
  stepType: StepType
  hintType: HintType
  timestamp: string
  wasHelpful?: boolean
}

/**
 * Create a hint usage record for tracking
 */
export function createHintUsage(
  stepIndex: number,
  stepType: StepType,
  hint: Hint
): HintUsage {
  return {
    stepIndex,
    stepType,
    hintType: hint.type,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Analyze hint usage patterns
 */
export function analyzeHintUsage(usages: HintUsage[]): {
  totalHints: number
  byStepType: Record<StepType, number>
  mostNeededStep: StepType | null
} {
  const byStepType: Record<string, number> = {}

  for (const usage of usages) {
    byStepType[usage.stepType] = (byStepType[usage.stepType] || 0) + 1
  }

  let mostNeededStep: StepType | null = null
  let maxCount = 0

  for (const [stepType, count] of Object.entries(byStepType)) {
    if (count > maxCount) {
      maxCount = count
      mostNeededStep = stepType as StepType
    }
  }

  return {
    totalHints: usages.length,
    byStepType: byStepType as Record<StepType, number>,
    mostNeededStep,
  }
}
