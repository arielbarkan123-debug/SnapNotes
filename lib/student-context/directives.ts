/**
 * Student Directives Engine
 *
 * Transforms raw StudentContext into actionable per-feature instructions.
 * Each feature (practice, homework, lessons, dashboard, SRS, exams) gets
 * its own set of directives that tell it exactly how to personalize
 * the experience for this student.
 *
 * Pure function: no DB access, no side effects, fully testable.
 */

import type {
  StudentContext,
  StudentDirectives,
  PracticeDirectives,
  HomeworkDirectives,
  LessonDirectives,
  DashboardDirectives,
  DashboardAction,
  SrsDirectives,
  ExamDirectives,
  UrgentGap,
} from './types'

// =============================================================================
// Main entry point
// =============================================================================

export function generateDirectives(ctx: StudentContext): StudentDirectives {
  return {
    practice: buildPracticeDirectives(ctx),
    homework: buildHomeworkDirectives(ctx),
    lessons: buildLessonDirectives(ctx),
    dashboard: buildDashboardDirectives(ctx),
    srs: buildSrsDirectives(ctx),
    exams: buildExamDirectives(ctx),
  }
}

// =============================================================================
// 1. Practice Directives
// =============================================================================

export function buildPracticeDirectives(ctx: StudentContext): PracticeDirectives {
  // ZPD targeting: keep student in 70-85% success range
  let targetDifficulty = ctx.currentDifficultyTarget
  if (ctx.rollingAccuracy > 0.85) {
    targetDifficulty = Math.min(5, targetDifficulty + 1)
  } else if (ctx.rollingAccuracy < 0.60) {
    targetDifficulty = Math.max(1, targetDifficulty - 1)
  }

  // Session length: use actual average, bounded 5-45
  const recommendedSessionLength = Math.max(5, Math.min(45, ctx.avgSessionLengthMinutes || 15))

  // Question type weights: start balanced, adjust for mistake patterns
  const questionTypeWeights: Record<string, number> = {
    mcq: 0.25,
    fill_blank: 0.25,
    short_answer: 0.25,
    matching: 0.25,
  }

  const algebraicMistakes = (ctx.mistakePatterns['algebraic'] ?? 0) +
    (ctx.mistakePatterns['Sign errors'] ?? 0)
  const conceptualMistakes = (ctx.mistakePatterns['conceptual'] ?? 0) +
    (ctx.mistakePatterns['conceptual_misunderstanding'] ?? 0)

  if (algebraicMistakes > 2) {
    questionTypeWeights.fill_blank = 0.4
    questionTypeWeights.mcq = 0.15
    // Rebalance remaining
    const remaining = 1 - questionTypeWeights.fill_blank - questionTypeWeights.mcq
    questionTypeWeights.short_answer = remaining / 2
    questionTypeWeights.matching = remaining / 2
  } else if (conceptualMistakes > 2) {
    questionTypeWeights.short_answer = 0.4
    questionTypeWeights.mcq = 0.15
    const remaining = 1 - questionTypeWeights.short_answer - questionTypeWeights.mcq
    questionTypeWeights.fill_blank = remaining / 2
    questionTypeWeights.matching = remaining / 2
  }

  // Avoid concepts the student has mastered (mastery >= 0.9)
  const avoidConceptIds = ctx.activeCourses
    .filter(c => c.masteryScore >= 0.9)
    .map(c => c.courseId)

  // Urgent gaps: top 3 weak concepts with reason
  const urgentGaps: UrgentGap[] = ctx.weakConceptIds.slice(0, 3).map(conceptId => ({
    conceptId,
    reason: buildGapReason(conceptId, ctx),
  }))

  return {
    targetDifficulty,
    recommendedSessionLength,
    questionTypeWeights,
    recommendedConceptIds: [...ctx.weakConceptIds],
    avoidConceptIds,
    urgentGaps,
  }
}

function buildGapReason(conceptId: string, ctx: StudentContext): string {
  if (ctx.rollingAccuracy < 0.5) {
    return `Accuracy below 50% — needs focused review on ${conceptId}`
  }
  if (ctx.trendDirection === 'declining') {
    return `Performance declining — reinforce ${conceptId} before it worsens`
  }
  return `Identified as weak area — prioritize ${conceptId} for improvement`
}

// =============================================================================
// 2. Homework Directives
// =============================================================================

export function buildHomeworkDirectives(ctx: StudentContext): HomeworkDirectives {
  // Explanation depth based on accuracy
  let explanationDepth: 'brief' | 'standard' | 'detailed'
  if (ctx.rollingAccuracy >= 0.85) {
    explanationDepth = 'brief'
  } else if (ctx.rollingAccuracy < 0.55) {
    explanationDepth = 'detailed'
  } else {
    explanationDepth = 'standard'
  }

  // Scaffolding level: 1-5, inverse of (confidence + accuracy) / 2
  const avgConfidenceAccuracy = (ctx.rollingConfidence + ctx.rollingAccuracy) / 2
  const scaffoldingLevel = Math.max(1, Math.min(5, Math.round(5 - avgConfidenceAccuracy * 4)))

  // Preferred explanation style based on learning styles
  let preferredExplanationStyle: 'visual' | 'step-by-step' | 'analogy' | 'mixed'
  if (ctx.learningStyles.includes('visual')) {
    preferredExplanationStyle = 'visual'
  } else if (ctx.learningStyles.includes('reading') || ctx.learningStyles.includes('practice')) {
    preferredExplanationStyle = 'step-by-step'
  } else {
    preferredExplanationStyle = 'mixed'
  }

  // Anticipated misconceptions from mistake patterns
  const anticipatedMisconceptions: string[] = Object.entries(ctx.mistakePatterns)
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => `Watch for ${key} errors — this student frequently makes this type of mistake`)

  // Known prerequisite gaps: top 5 weak concepts
  const knownPrerequisiteGaps = ctx.weakConceptIds.slice(0, 5)

  // Student ability summary: one-liner
  const trendLabel = ctx.trendDirection === 'improving' ? 'and improving' :
    ctx.trendDirection === 'declining' ? 'and declining' : 'and stable'
  const accuracyPct = Math.round(ctx.rollingAccuracy * 100)
  const streakStr = ctx.currentStreak > 0 ? `, ${ctx.currentStreak}-day streak` : ''
  const styleStr = preferredExplanationStyle !== 'mixed'
    ? `. Prefers ${preferredExplanationStyle} explanations`
    : ''

  const studentAbilitySummary = `Grade ${ctx.grade ?? 'unknown'} student (${ctx.studySystem}), ${accuracyPct}% accuracy ${trendLabel}. Level ${ctx.currentLevel}${streakStr}${styleStr}.`

  return {
    explanationDepth,
    scaffoldingLevel,
    preferredExplanationStyle,
    anticipatedMisconceptions,
    knownPrerequisiteGaps,
    studentAbilitySummary,
  }
}

// =============================================================================
// 3. Lesson Directives
// =============================================================================

export function buildLessonDirectives(ctx: StudentContext): LessonDirectives {
  const isImproving = ctx.trendDirection === 'improving'
  const isDeclining = ctx.trendDirection === 'declining'

  // Pacing
  let pacing: 'accelerated' | 'standard' | 'reinforced'
  if (isImproving && ctx.rollingAccuracy >= 0.80) {
    pacing = 'accelerated'
  } else if (isDeclining || ctx.rollingAccuracy < 0.55) {
    pacing = 'reinforced'
  } else {
    pacing = 'standard'
  }

  // Skip worked examples: only if very strong AND improving
  const skipWorkedExamples = ctx.rollingAccuracy >= 0.90 && isImproving

  // Extra practice steps based on accuracy
  let extraPracticeSteps: number
  if (ctx.rollingAccuracy < 0.60) {
    extraPracticeSteps = 3
  } else if (ctx.rollingAccuracy < 0.70) {
    extraPracticeSteps = 2
  } else if (ctx.rollingAccuracy < 0.80) {
    extraPracticeSteps = 1
  } else {
    extraPracticeSteps = 0
  }

  // Content format
  const contentFormat: 'concise' | 'detailed' =
    ctx.rollingAccuracy >= 0.80 && ctx.speedPreference === 'fast'
      ? 'concise'
      : 'detailed'

  return {
    pacing,
    skipWorkedExamples,
    extraPracticeSteps,
    contentFormat,
    prerequisiteReviewNeeded: [], // populated later with course-specific context
  }
}

// =============================================================================
// 4. Dashboard Directives
// =============================================================================

export function buildDashboardDirectives(ctx: StudentContext): DashboardDirectives {
  // Primary action: priority order
  const primaryAction = determinePrimaryAction(ctx)

  // Streak risk: has a streak but hasn't studied today
  const today = new Date(ctx.contextGeneratedAt).toISOString().split('T')[0]
  const streakRisk = ctx.currentStreak > 0 && ctx.lastActivityDate !== today

  // Nudge: contextual message
  const nudge = buildNudge(ctx)

  // Course order: weakest mastery first, then stalest activity
  const courseOrder = [...ctx.activeCourses]
    .sort((a, b) => {
      // First sort by mastery (ascending — weakest first)
      const masteryDiff = a.masteryScore - b.masteryScore
      if (Math.abs(masteryDiff) > 0.01) return masteryDiff
      // Tie-break: stalest activity first (null = most stale)
      const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
      const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
      return aTime - bTime
    })
    .map(c => c.courseId)

  // Celebration: streak milestones (every 7 days)
  let celebrationDue: string | null = null
  if (ctx.currentStreak > 0 && ctx.currentStreak % 7 === 0) {
    celebrationDue = `Amazing! ${ctx.currentStreak}-day streak!`
  }

  // Weekly goal progress: sessions / 5 (capped at 1.0)
  const weeklyGoalProgress = Math.min(1.0, ctx.sessionsThisWeek / 5)

  return {
    primaryAction,
    streakRisk,
    nudge,
    courseOrder,
    celebrationDue,
    weeklyGoalProgress,
  }
}

function determinePrimaryAction(ctx: StudentContext): DashboardAction {
  // Priority 1: Many overdue cards
  if (ctx.overdueCardCount >= 5) {
    return {
      type: 'review_cards',
      label: `Review ${ctx.overdueCardCount} overdue cards`,
      count: ctx.overdueCardCount,
    }
  }

  // Priority 2: Many cards due today
  if (ctx.cardsDueToday >= 10) {
    return {
      type: 'review_cards',
      label: `Review ${ctx.cardsDueToday} cards due today`,
      count: ctx.cardsDueToday,
    }
  }

  // Priority 3: Continue weakest course if it has unfinished lessons
  if (ctx.weakestCourseId) {
    const weakestCourse = ctx.activeCourses.find(c => c.courseId === ctx.weakestCourseId)
    if (weakestCourse && weakestCourse.lessonsCompleted < weakestCourse.totalLessons) {
      return {
        type: 'continue_lesson',
        label: `Continue ${weakestCourse.title}`,
        courseId: weakestCourse.courseId,
      }
    }
  }

  // Priority 4: Practice weak concepts
  return {
    type: 'practice_weak',
    label: 'Practice weak areas',
  }
}

function buildNudge(ctx: StudentContext): string | null {
  if (ctx.trendDirection === 'improving') {
    if (ctx.sessionsThisWeek >= 5) {
      return "You're on fire! Great progress this week."
    }
    return "You're improving! Keep up the momentum."
  }

  if (ctx.trendDirection === 'declining') {
    if (ctx.sessionsThisWeek < 2) {
      return 'Your performance dipped recently. A short practice session can help.'
    }
    return "Scores dipped a bit — that's normal. Focus on your weak areas."
  }

  // stable
  if (ctx.sessionsThisWeek === 0) {
    return "You haven't studied this week yet. Even 10 minutes helps!"
  }

  return null
}

// =============================================================================
// 5. SRS Directives
// =============================================================================

export function buildSrsDirectives(ctx: StudentContext): SrsDirectives {
  // Adjusted new card limit: reduce when overwhelmed
  let adjustedNewCardLimit: number
  if (ctx.cardsDueToday > 60) {
    adjustedNewCardLimit = 5
  } else if (ctx.cardsDueToday > 40 || ctx.rollingAccuracy < 0.5) {
    adjustedNewCardLimit = 10
  } else {
    adjustedNewCardLimit = 20
  }

  // Interleave: recommended when studying 2+ subjects
  const interleaveRecommended = ctx.subjects.length >= 2

  return {
    adjustedNewCardLimit,
    interleaveRecommended,
    priorityCardIds: [],   // populated at query time
    retireSuggestionIds: [], // populated at query time
  }
}

// =============================================================================
// 6. Exam Directives
// =============================================================================

export function buildExamDirectives(ctx: StudentContext): ExamDirectives {
  // Weak topic weights: 1.5 for courses with mastery < 0.6, 0.8 for others
  const weakTopicWeights: Record<string, number> = {}
  for (const course of ctx.activeCourses) {
    weakTopicWeights[course.courseId] = course.masteryScore < 0.6 ? 1.5 : 0.8
  }

  // Target difficulty: based on estimated ability (0-1 scale)
  const rawDifficulty = Math.round(ctx.estimatedAbility * 4) + 1
  const targetDifficulty = Math.max(1, Math.min(5, rawDifficulty))

  // Focus question types: based on mistake patterns
  const focusQuestionTypes: string[] = []
  const algebraicMistakes = (ctx.mistakePatterns['algebraic'] ?? 0) +
    (ctx.mistakePatterns['Sign errors'] ?? 0)
  const conceptualMistakes = (ctx.mistakePatterns['conceptual'] ?? 0) +
    (ctx.mistakePatterns['conceptual_misunderstanding'] ?? 0)
  const proceduralMistakes = (ctx.mistakePatterns['procedural'] ?? 0) +
    (ctx.mistakePatterns['computational'] ?? 0)

  if (algebraicMistakes > 0) focusQuestionTypes.push('fill_blank')
  if (conceptualMistakes > 0) focusQuestionTypes.push('short_answer')
  if (proceduralMistakes > 0) focusQuestionTypes.push('matching')

  // If no mistake-driven types, default to balanced set
  if (focusQuestionTypes.length === 0) {
    focusQuestionTypes.push('mcq', 'fill_blank', 'short_answer')
  }

  // Estimated score
  const estimatedScore = Math.round(ctx.rollingAccuracy * 100)

  return {
    weakTopicWeights,
    targetDifficulty,
    focusQuestionTypes,
    estimatedScore,
  }
}
