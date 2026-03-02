/**
 * Tests for lib/student-context/directives.ts
 *
 * Validates that generateDirectives() correctly transforms StudentContext
 * into actionable per-feature directives for:
 * - Practice: ZPD targeting, weak concept prioritization
 * - Homework: explanation depth, scaffolding, misconceptions
 * - Lessons: pacing, worked examples, extra practice
 * - Dashboard: primary action prioritization, streak risk, nudges
 * - SRS: new card limit adjustment, interleave recommendation
 * - Exams: weak topic weighting, estimated scores
 */

import { generateDirectives } from '@/lib/student-context/directives'
import type { StudentContext, CourseSnapshot } from '@/lib/student-context/types'

// =============================================================================
// Test fixture builder
// =============================================================================

function makeContext(overrides: Partial<StudentContext> = {}): StudentContext {
  const defaults: StudentContext = {
    userId: 'test-user-123',
    grade: '10',
    studySystem: 'ib',
    subjects: ['mathematics', 'physics'],
    subjectLevels: { mathematics: 'HL', physics: 'SL' },
    examFormat: 'match_real',
    language: 'en',
    learningStyles: ['visual', 'practice'],
    studyGoal: 'exam_prep',
    preferredStudyTime: 'evening',
    difficultyPreference: 'moderate',
    speedPreference: 'moderate',

    rollingAccuracy: 0.72,
    rollingSpeed: 5.5,
    rollingConfidence: 0.3,
    estimatedAbility: 0.6,
    trendDirection: 'stable',
    trendStrength: 0.4,
    currentDifficultyTarget: 3,

    weakConceptIds: ['quadratic-equations', 'trigonometry', 'vectors', 'integration'],
    mistakePatterns: {},
    mistakeDataSufficient: true,

    currentStreak: 5,
    longestStreak: 14,
    currentLevel: 4,
    totalXp: 1800,
    lastActivityDate: '2026-03-01',
    streakFreezes: 1,

    avgSessionLengthMinutes: 20,
    peakStudyHour: 17,
    totalStudyTimeThisWeekMinutes: 80,
    sessionsThisWeek: 4,

    cardsDueToday: 8,
    overdueCardCount: 2,
    totalActiveCards: 50,

    activeCourses: [
      {
        courseId: 'course-math',
        title: 'IB Math HL',
        masteryScore: 0.65,
        lastActivityAt: '2026-03-01T10:00:00Z',
        lessonsCompleted: 8,
        totalLessons: 15,
        currentLesson: 8,
      },
      {
        courseId: 'course-physics',
        title: 'IB Physics SL',
        masteryScore: 0.45,
        lastActivityAt: '2026-02-28T14:00:00Z',
        lessonsCompleted: 4,
        totalLessons: 12,
        currentLesson: 4,
      },
    ],
    weakestCourseId: 'course-physics',
    strongestCourseId: 'course-math',

    contextGeneratedAt: '2026-03-02T10:00:00Z',
  }

  return { ...defaults, ...overrides }
}

function makeCourse(overrides: Partial<CourseSnapshot> = {}): CourseSnapshot {
  return {
    courseId: 'course-default',
    title: 'Default Course',
    masteryScore: 0.5,
    lastActivityAt: '2026-03-01T10:00:00Z',
    lessonsCompleted: 3,
    totalLessons: 10,
    currentLesson: 3,
    ...overrides,
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('generateDirectives', () => {
  it('returns all 6 directive sections', () => {
    const ctx = makeContext()
    const directives = generateDirectives(ctx)

    expect(directives).toHaveProperty('practice')
    expect(directives).toHaveProperty('homework')
    expect(directives).toHaveProperty('lessons')
    expect(directives).toHaveProperty('dashboard')
    expect(directives).toHaveProperty('srs')
    expect(directives).toHaveProperty('exams')
  })
})

// =============================================================================
// 1. Practice Directives
// =============================================================================

describe('buildPracticeDirectives (via generateDirectives)', () => {
  describe('ZPD targeting — 70-85% success range', () => {
    it('increases difficulty when accuracy > 85%', () => {
      const ctx = makeContext({ rollingAccuracy: 0.90, currentDifficultyTarget: 3 })
      const { practice } = generateDirectives(ctx)
      expect(practice.targetDifficulty).toBe(4)
    })

    it('decreases difficulty when accuracy < 60%', () => {
      const ctx = makeContext({ rollingAccuracy: 0.50, currentDifficultyTarget: 3 })
      const { practice } = generateDirectives(ctx)
      expect(practice.targetDifficulty).toBe(2)
    })

    it('keeps difficulty when accuracy is in the 60-85% sweet spot', () => {
      const ctx = makeContext({ rollingAccuracy: 0.72, currentDifficultyTarget: 3 })
      const { practice } = generateDirectives(ctx)
      expect(practice.targetDifficulty).toBe(3)
    })

    it('caps difficulty at 5 (max)', () => {
      const ctx = makeContext({ rollingAccuracy: 0.95, currentDifficultyTarget: 5 })
      const { practice } = generateDirectives(ctx)
      expect(practice.targetDifficulty).toBe(5)
    })

    it('floors difficulty at 1 (min)', () => {
      const ctx = makeContext({ rollingAccuracy: 0.30, currentDifficultyTarget: 1 })
      const { practice } = generateDirectives(ctx)
      expect(practice.targetDifficulty).toBe(1)
    })

    it('handles exactly 0.85 accuracy (boundary: no increase)', () => {
      const ctx = makeContext({ rollingAccuracy: 0.85, currentDifficultyTarget: 3 })
      const { practice } = generateDirectives(ctx)
      expect(practice.targetDifficulty).toBe(3)
    })

    it('handles exactly 0.60 accuracy (boundary: no decrease)', () => {
      const ctx = makeContext({ rollingAccuracy: 0.60, currentDifficultyTarget: 3 })
      const { practice } = generateDirectives(ctx)
      expect(practice.targetDifficulty).toBe(3)
    })
  })

  describe('weak concepts prioritization', () => {
    it('passes weak concepts as recommended (in order)', () => {
      const weakIds = ['concept-a', 'concept-b', 'concept-c']
      const ctx = makeContext({ weakConceptIds: weakIds })
      const { practice } = generateDirectives(ctx)
      expect(practice.recommendedConceptIds).toEqual(weakIds)
    })

    it('returns top 3 weak concepts as urgent gaps', () => {
      const weakIds = ['c1', 'c2', 'c3', 'c4', 'c5']
      const ctx = makeContext({ weakConceptIds: weakIds })
      const { practice } = generateDirectives(ctx)
      expect(practice.urgentGaps).toHaveLength(3)
      expect(practice.urgentGaps[0].conceptId).toBe('c1')
      expect(practice.urgentGaps[1].conceptId).toBe('c2')
      expect(practice.urgentGaps[2].conceptId).toBe('c3')
    })

    it('each urgent gap has a reason string', () => {
      const ctx = makeContext({ weakConceptIds: ['trig'] })
      const { practice } = generateDirectives(ctx)
      expect(practice.urgentGaps[0].reason).toBeTruthy()
      expect(typeof practice.urgentGaps[0].reason).toBe('string')
    })

    it('avoids mastered courses (mastery >= 0.9)', () => {
      const ctx = makeContext({
        activeCourses: [
          makeCourse({ courseId: 'mastered', masteryScore: 0.95 }),
          makeCourse({ courseId: 'weak', masteryScore: 0.40 }),
        ],
      })
      const { practice } = generateDirectives(ctx)
      expect(practice.avoidConceptIds).toContain('mastered')
      expect(practice.avoidConceptIds).not.toContain('weak')
    })
  })

  describe('question type weights', () => {
    it('defaults to balanced weights (0.25 each)', () => {
      const ctx = makeContext({ mistakePatterns: {} })
      const { practice } = generateDirectives(ctx)
      expect(practice.questionTypeWeights.mcq).toBe(0.25)
      expect(practice.questionTypeWeights.fill_blank).toBe(0.25)
      expect(practice.questionTypeWeights.short_answer).toBe(0.25)
      expect(practice.questionTypeWeights.matching).toBe(0.25)
    })

    it('increases fill_blank to 0.4 for algebraic mistakes > 2', () => {
      const ctx = makeContext({ mistakePatterns: { algebraic: 4 } })
      const { practice } = generateDirectives(ctx)
      expect(practice.questionTypeWeights.fill_blank).toBe(0.4)
      expect(practice.questionTypeWeights.mcq).toBe(0.15)
    })

    it('increases short_answer to 0.4 for conceptual mistakes > 2', () => {
      const ctx = makeContext({ mistakePatterns: { conceptual: 5 } })
      const { practice } = generateDirectives(ctx)
      expect(practice.questionTypeWeights.short_answer).toBe(0.4)
      expect(practice.questionTypeWeights.mcq).toBe(0.15)
    })

    it('all weights sum to 1.0', () => {
      const ctx = makeContext({ mistakePatterns: { algebraic: 10 } })
      const { practice } = generateDirectives(ctx)
      const sum = Object.values(practice.questionTypeWeights).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1.0, 5)
    })
  })

  describe('session length', () => {
    it('uses actual avgSessionLengthMinutes', () => {
      const ctx = makeContext({ avgSessionLengthMinutes: 25 })
      const { practice } = generateDirectives(ctx)
      expect(practice.recommendedSessionLength).toBe(25)
    })

    it('floors at 5 minutes', () => {
      const ctx = makeContext({ avgSessionLengthMinutes: 2 })
      const { practice } = generateDirectives(ctx)
      expect(practice.recommendedSessionLength).toBe(5)
    })

    it('caps at 45 minutes', () => {
      const ctx = makeContext({ avgSessionLengthMinutes: 90 })
      const { practice } = generateDirectives(ctx)
      expect(practice.recommendedSessionLength).toBe(45)
    })

    it('defaults to 15 when avgSessionLengthMinutes is 0', () => {
      const ctx = makeContext({ avgSessionLengthMinutes: 0 })
      const { practice } = generateDirectives(ctx)
      expect(practice.recommendedSessionLength).toBe(15)
    })
  })
})

// =============================================================================
// 2. Homework Directives
// =============================================================================

describe('buildHomeworkDirectives (via generateDirectives)', () => {
  describe('explanation depth based on accuracy', () => {
    it('returns "brief" when accuracy >= 0.85', () => {
      const ctx = makeContext({ rollingAccuracy: 0.90 })
      const { homework } = generateDirectives(ctx)
      expect(homework.explanationDepth).toBe('brief')
    })

    it('returns "detailed" when accuracy < 0.55', () => {
      const ctx = makeContext({ rollingAccuracy: 0.40 })
      const { homework } = generateDirectives(ctx)
      expect(homework.explanationDepth).toBe('detailed')
    })

    it('returns "standard" when accuracy is between 0.55 and 0.85', () => {
      const ctx = makeContext({ rollingAccuracy: 0.70 })
      const { homework } = generateDirectives(ctx)
      expect(homework.explanationDepth).toBe('standard')
    })

    it('returns "brief" at exactly 0.85 (boundary)', () => {
      const ctx = makeContext({ rollingAccuracy: 0.85 })
      const { homework } = generateDirectives(ctx)
      expect(homework.explanationDepth).toBe('brief')
    })

    it('returns "standard" at exactly 0.55 (boundary)', () => {
      const ctx = makeContext({ rollingAccuracy: 0.55 })
      const { homework } = generateDirectives(ctx)
      expect(homework.explanationDepth).toBe('standard')
    })
  })

  describe('scaffolding level', () => {
    it('is high (closer to 5) for low confidence + accuracy', () => {
      const ctx = makeContext({ rollingAccuracy: 0.2, rollingConfidence: 0.1 })
      const { homework } = generateDirectives(ctx)
      expect(homework.scaffoldingLevel).toBeGreaterThanOrEqual(4)
    })

    it('is low (closer to 1) for high confidence + accuracy', () => {
      const ctx = makeContext({ rollingAccuracy: 0.95, rollingConfidence: 0.9 })
      const { homework } = generateDirectives(ctx)
      expect(homework.scaffoldingLevel).toBeLessThanOrEqual(2)
    })

    it('is bounded 1-5', () => {
      const ctxLow = makeContext({ rollingAccuracy: 0.0, rollingConfidence: 0.0 })
      const ctxHigh = makeContext({ rollingAccuracy: 1.0, rollingConfidence: 1.0 })
      const { homework: hwLow } = generateDirectives(ctxLow)
      const { homework: hwHigh } = generateDirectives(ctxHigh)
      expect(hwLow.scaffoldingLevel).toBeLessThanOrEqual(5)
      expect(hwLow.scaffoldingLevel).toBeGreaterThanOrEqual(1)
      expect(hwHigh.scaffoldingLevel).toBeLessThanOrEqual(5)
      expect(hwHigh.scaffoldingLevel).toBeGreaterThanOrEqual(1)
    })
  })

  describe('preferred explanation style', () => {
    it('returns "visual" when learningStyles includes visual', () => {
      const ctx = makeContext({ learningStyles: ['visual', 'auditory'] })
      const { homework } = generateDirectives(ctx)
      expect(homework.preferredExplanationStyle).toBe('visual')
    })

    it('returns "step-by-step" when learningStyles includes reading', () => {
      const ctx = makeContext({ learningStyles: ['reading'] })
      const { homework } = generateDirectives(ctx)
      expect(homework.preferredExplanationStyle).toBe('step-by-step')
    })

    it('returns "step-by-step" when learningStyles includes practice', () => {
      const ctx = makeContext({ learningStyles: ['practice'] })
      const { homework } = generateDirectives(ctx)
      expect(homework.preferredExplanationStyle).toBe('step-by-step')
    })

    it('returns "mixed" when no matching styles', () => {
      const ctx = makeContext({ learningStyles: ['auditory', 'kinesthetic'] })
      const { homework } = generateDirectives(ctx)
      expect(homework.preferredExplanationStyle).toBe('mixed')
    })
  })

  describe('anticipated misconceptions', () => {
    it('generates misconception strings from mistake patterns', () => {
      const ctx = makeContext({
        mistakePatterns: { 'Sign errors': 5, 'Unit conversion': 3 },
      })
      const { homework } = generateDirectives(ctx)
      expect(homework.anticipatedMisconceptions).toHaveLength(2)
      expect(homework.anticipatedMisconceptions[0]).toContain('Sign errors')
    })

    it('returns empty array when no mistake patterns', () => {
      const ctx = makeContext({ mistakePatterns: {} })
      const { homework } = generateDirectives(ctx)
      expect(homework.anticipatedMisconceptions).toEqual([])
    })
  })

  describe('student ability summary', () => {
    it('includes grade, study system, accuracy, level', () => {
      const ctx = makeContext({
        grade: '10',
        studySystem: 'ib',
        rollingAccuracy: 0.72,
        currentLevel: 4,
      })
      const { homework } = generateDirectives(ctx)
      expect(homework.studentAbilitySummary).toContain('Grade 10')
      expect(homework.studentAbilitySummary).toContain('ib')
      expect(homework.studentAbilitySummary).toContain('72%')
      expect(homework.studentAbilitySummary).toContain('Level 4')
    })

    it('includes streak when > 0', () => {
      const ctx = makeContext({ currentStreak: 7 })
      const { homework } = generateDirectives(ctx)
      expect(homework.studentAbilitySummary).toContain('7-day streak')
    })

    it('omits streak when 0', () => {
      const ctx = makeContext({ currentStreak: 0 })
      const { homework } = generateDirectives(ctx)
      expect(homework.studentAbilitySummary).not.toContain('streak')
    })

    it('includes trend direction', () => {
      const ctxUp = makeContext({ trendDirection: 'improving' })
      const ctxDown = makeContext({ trendDirection: 'declining' })
      expect(generateDirectives(ctxUp).homework.studentAbilitySummary).toContain('improving')
      expect(generateDirectives(ctxDown).homework.studentAbilitySummary).toContain('declining')
    })
  })

  describe('known prerequisite gaps', () => {
    it('returns top 5 weak concepts', () => {
      const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
      const ctx = makeContext({ weakConceptIds: ids })
      const { homework } = generateDirectives(ctx)
      expect(homework.knownPrerequisiteGaps).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('returns all when fewer than 5', () => {
      const ids = ['x', 'y']
      const ctx = makeContext({ weakConceptIds: ids })
      const { homework } = generateDirectives(ctx)
      expect(homework.knownPrerequisiteGaps).toEqual(['x', 'y'])
    })
  })
})

// =============================================================================
// 3. Lesson Directives
// =============================================================================

describe('buildLessonDirectives (via generateDirectives)', () => {
  describe('pacing based on trend + accuracy', () => {
    it('accelerated when improving AND accuracy >= 0.80', () => {
      const ctx = makeContext({
        trendDirection: 'improving',
        rollingAccuracy: 0.85,
      })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.pacing).toBe('accelerated')
    })

    it('reinforced when declining', () => {
      const ctx = makeContext({
        trendDirection: 'declining',
        rollingAccuracy: 0.75,
      })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.pacing).toBe('reinforced')
    })

    it('reinforced when accuracy < 0.55 (regardless of trend)', () => {
      const ctx = makeContext({
        trendDirection: 'improving',
        rollingAccuracy: 0.50,
      })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.pacing).toBe('reinforced')
    })

    it('standard when stable and accuracy in middle range', () => {
      const ctx = makeContext({
        trendDirection: 'stable',
        rollingAccuracy: 0.70,
      })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.pacing).toBe('standard')
    })

    it('standard when improving but accuracy < 0.80', () => {
      const ctx = makeContext({
        trendDirection: 'improving',
        rollingAccuracy: 0.70,
      })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.pacing).toBe('standard')
    })
  })

  describe('skip worked examples', () => {
    it('true only when accuracy >= 0.90 AND improving', () => {
      const ctx = makeContext({
        trendDirection: 'improving',
        rollingAccuracy: 0.92,
      })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.skipWorkedExamples).toBe(true)
    })

    it('false when accuracy >= 0.90 but not improving', () => {
      const ctx = makeContext({
        trendDirection: 'stable',
        rollingAccuracy: 0.92,
      })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.skipWorkedExamples).toBe(false)
    })

    it('false when improving but accuracy < 0.90', () => {
      const ctx = makeContext({
        trendDirection: 'improving',
        rollingAccuracy: 0.85,
      })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.skipWorkedExamples).toBe(false)
    })
  })

  describe('extra practice steps', () => {
    it('3 when accuracy < 0.60', () => {
      const ctx = makeContext({ rollingAccuracy: 0.50 })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.extraPracticeSteps).toBe(3)
    })

    it('2 when accuracy 0.60-0.70', () => {
      const ctx = makeContext({ rollingAccuracy: 0.65 })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.extraPracticeSteps).toBe(2)
    })

    it('1 when accuracy 0.70-0.80', () => {
      const ctx = makeContext({ rollingAccuracy: 0.75 })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.extraPracticeSteps).toBe(1)
    })

    it('0 when accuracy >= 0.80', () => {
      const ctx = makeContext({ rollingAccuracy: 0.85 })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.extraPracticeSteps).toBe(0)
    })
  })

  describe('content format', () => {
    it('concise when accuracy >= 0.80 AND speedPreference is fast', () => {
      const ctx = makeContext({
        rollingAccuracy: 0.85,
        speedPreference: 'fast',
      })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.contentFormat).toBe('concise')
    })

    it('detailed when accuracy >= 0.80 but speed is not fast', () => {
      const ctx = makeContext({
        rollingAccuracy: 0.85,
        speedPreference: 'moderate',
      })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.contentFormat).toBe('detailed')
    })

    it('detailed when speed is fast but accuracy < 0.80', () => {
      const ctx = makeContext({
        rollingAccuracy: 0.70,
        speedPreference: 'fast',
      })
      const { lessons } = generateDirectives(ctx)
      expect(lessons.contentFormat).toBe('detailed')
    })
  })

  it('prerequisiteReviewNeeded is always empty array', () => {
    const ctx = makeContext()
    const { lessons } = generateDirectives(ctx)
    expect(lessons.prerequisiteReviewNeeded).toEqual([])
  })
})

// =============================================================================
// 4. Dashboard Directives
// =============================================================================

describe('buildDashboardDirectives (via generateDirectives)', () => {
  describe('primary action prioritization', () => {
    it('priority 1: review_cards when overdueCardCount >= 5', () => {
      const ctx = makeContext({ overdueCardCount: 8, cardsDueToday: 20 })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.primaryAction.type).toBe('review_cards')
      expect(dashboard.primaryAction.count).toBe(8)
    })

    it('priority 2: review_cards when cardsDueToday >= 10 (no overdue)', () => {
      const ctx = makeContext({ overdueCardCount: 2, cardsDueToday: 15 })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.primaryAction.type).toBe('review_cards')
      expect(dashboard.primaryAction.count).toBe(15)
    })

    it('priority 3: continue_lesson for weakest course with unfinished lessons', () => {
      const ctx = makeContext({
        overdueCardCount: 0,
        cardsDueToday: 5,
        weakestCourseId: 'course-physics',
        activeCourses: [
          makeCourse({
            courseId: 'course-physics',
            title: 'Physics',
            masteryScore: 0.3,
            lessonsCompleted: 4,
            totalLessons: 12,
          }),
        ],
      })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.primaryAction.type).toBe('continue_lesson')
      expect(dashboard.primaryAction.courseId).toBe('course-physics')
    })

    it('priority 4: practice_weak when no other action applies', () => {
      const ctx = makeContext({
        overdueCardCount: 0,
        cardsDueToday: 2,
        weakestCourseId: 'course-done',
        activeCourses: [
          makeCourse({
            courseId: 'course-done',
            masteryScore: 0.5,
            lessonsCompleted: 10,
            totalLessons: 10, // all lessons completed
          }),
        ],
      })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.primaryAction.type).toBe('practice_weak')
    })

    it('practice_weak when no courses at all', () => {
      const ctx = makeContext({
        overdueCardCount: 0,
        cardsDueToday: 0,
        activeCourses: [],
        weakestCourseId: null,
      })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.primaryAction.type).toBe('practice_weak')
    })

    it('overdue cards take priority over due cards', () => {
      const ctx = makeContext({
        overdueCardCount: 6,
        cardsDueToday: 50,
      })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.primaryAction.type).toBe('review_cards')
      expect(dashboard.primaryAction.count).toBe(6) // overdue count, not due count
    })
  })

  describe('streak risk detection', () => {
    it('true when streak > 0 and last activity is not today', () => {
      const ctx = makeContext({
        currentStreak: 5,
        lastActivityDate: '2026-03-01',
        contextGeneratedAt: '2026-03-02T10:00:00Z',
      })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.streakRisk).toBe(true)
    })

    it('false when last activity is today', () => {
      const ctx = makeContext({
        currentStreak: 5,
        lastActivityDate: '2026-03-02',
        contextGeneratedAt: '2026-03-02T10:00:00Z',
      })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.streakRisk).toBe(false)
    })

    it('false when streak is 0 (nothing to lose)', () => {
      const ctx = makeContext({
        currentStreak: 0,
        lastActivityDate: '2026-02-25',
        contextGeneratedAt: '2026-03-02T10:00:00Z',
      })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.streakRisk).toBe(false)
    })

    it('false when lastActivityDate is null and streak is 0', () => {
      const ctx = makeContext({
        currentStreak: 0,
        lastActivityDate: null,
      })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.streakRisk).toBe(false)
    })
  })

  describe('course order', () => {
    it('weakest mastery first', () => {
      const ctx = makeContext({
        activeCourses: [
          makeCourse({ courseId: 'strong', masteryScore: 0.9 }),
          makeCourse({ courseId: 'weak', masteryScore: 0.3 }),
          makeCourse({ courseId: 'mid', masteryScore: 0.6 }),
        ],
      })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.courseOrder[0]).toBe('weak')
      expect(dashboard.courseOrder[1]).toBe('mid')
      expect(dashboard.courseOrder[2]).toBe('strong')
    })

    it('stalest activity first as tie-breaker', () => {
      const ctx = makeContext({
        activeCourses: [
          makeCourse({ courseId: 'recent', masteryScore: 0.5, lastActivityAt: '2026-03-02T10:00:00Z' }),
          makeCourse({ courseId: 'old', masteryScore: 0.5, lastActivityAt: '2026-02-25T10:00:00Z' }),
        ],
      })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.courseOrder[0]).toBe('old')
      expect(dashboard.courseOrder[1]).toBe('recent')
    })
  })

  describe('celebration', () => {
    it('celebration due at 7-day streak', () => {
      const ctx = makeContext({ currentStreak: 7 })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.celebrationDue).toContain('7')
    })

    it('celebration due at 14-day streak', () => {
      const ctx = makeContext({ currentStreak: 14 })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.celebrationDue).toContain('14')
    })

    it('no celebration for non-milestone streaks', () => {
      const ctx = makeContext({ currentStreak: 5 })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.celebrationDue).toBeNull()
    })

    it('no celebration when streak is 0', () => {
      const ctx = makeContext({ currentStreak: 0 })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.celebrationDue).toBeNull()
    })
  })

  describe('weekly goal progress', () => {
    it('calculates sessions / 5', () => {
      const ctx = makeContext({ sessionsThisWeek: 3 })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.weeklyGoalProgress).toBeCloseTo(0.6, 2)
    })

    it('caps at 1.0', () => {
      const ctx = makeContext({ sessionsThisWeek: 8 })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.weeklyGoalProgress).toBe(1.0)
    })

    it('returns 0 when no sessions', () => {
      const ctx = makeContext({ sessionsThisWeek: 0 })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.weeklyGoalProgress).toBe(0)
    })
  })

  describe('nudge messages', () => {
    it('positive nudge when improving', () => {
      const ctx = makeContext({ trendDirection: 'improving' })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.nudge).toBeTruthy()
      expect(dashboard.nudge).toContain('improving')
    })

    it('motivational nudge when declining', () => {
      const ctx = makeContext({ trendDirection: 'declining' })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.nudge).toBeTruthy()
    })

    it('reminder when no sessions this week and stable', () => {
      const ctx = makeContext({ trendDirection: 'stable', sessionsThisWeek: 0 })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.nudge).toBeTruthy()
      expect(dashboard.nudge).toContain('studied')
    })

    it('null when stable with sessions', () => {
      const ctx = makeContext({ trendDirection: 'stable', sessionsThisWeek: 3 })
      const { dashboard } = generateDirectives(ctx)
      expect(dashboard.nudge).toBeNull()
    })
  })
})

// =============================================================================
// 5. SRS Directives
// =============================================================================

describe('buildSrsDirectives (via generateDirectives)', () => {
  describe('adjusted new card limit', () => {
    it('5 when cardsDue > 60 (overwhelmed)', () => {
      const ctx = makeContext({ cardsDueToday: 75 })
      const { srs } = generateDirectives(ctx)
      expect(srs.adjustedNewCardLimit).toBe(5)
    })

    it('10 when cardsDue > 40', () => {
      const ctx = makeContext({ cardsDueToday: 50 })
      const { srs } = generateDirectives(ctx)
      expect(srs.adjustedNewCardLimit).toBe(10)
    })

    it('10 when accuracy < 0.5 (struggling)', () => {
      const ctx = makeContext({ cardsDueToday: 20, rollingAccuracy: 0.40 })
      const { srs } = generateDirectives(ctx)
      expect(srs.adjustedNewCardLimit).toBe(10)
    })

    it('20 under normal conditions', () => {
      const ctx = makeContext({ cardsDueToday: 15, rollingAccuracy: 0.70 })
      const { srs } = generateDirectives(ctx)
      expect(srs.adjustedNewCardLimit).toBe(20)
    })

    it('boundary: exactly 60 due gives 10 (not 5)', () => {
      const ctx = makeContext({ cardsDueToday: 60, rollingAccuracy: 0.70 })
      const { srs } = generateDirectives(ctx)
      expect(srs.adjustedNewCardLimit).toBe(10)
    })

    it('boundary: exactly 40 due gives 20 (not 10)', () => {
      const ctx = makeContext({ cardsDueToday: 40, rollingAccuracy: 0.70 })
      const { srs } = generateDirectives(ctx)
      expect(srs.adjustedNewCardLimit).toBe(20)
    })
  })

  describe('interleave recommendation', () => {
    it('true when studying 2+ subjects', () => {
      const ctx = makeContext({ subjects: ['math', 'physics'] })
      const { srs } = generateDirectives(ctx)
      expect(srs.interleaveRecommended).toBe(true)
    })

    it('false when studying only 1 subject', () => {
      const ctx = makeContext({ subjects: ['math'] })
      const { srs } = generateDirectives(ctx)
      expect(srs.interleaveRecommended).toBe(false)
    })

    it('false when no subjects', () => {
      const ctx = makeContext({ subjects: [] })
      const { srs } = generateDirectives(ctx)
      expect(srs.interleaveRecommended).toBe(false)
    })
  })

  it('priorityCardIds and retireSuggestionIds are empty (populated later)', () => {
    const ctx = makeContext()
    const { srs } = generateDirectives(ctx)
    expect(srs.priorityCardIds).toEqual([])
    expect(srs.retireSuggestionIds).toEqual([])
  })
})

// =============================================================================
// 6. Exam Directives
// =============================================================================

describe('buildExamDirectives (via generateDirectives)', () => {
  describe('weak topic weighting', () => {
    it('1.5 weight for courses with mastery < 0.6', () => {
      const ctx = makeContext({
        activeCourses: [
          makeCourse({ courseId: 'weak', masteryScore: 0.40 }),
          makeCourse({ courseId: 'strong', masteryScore: 0.80 }),
        ],
      })
      const { exams } = generateDirectives(ctx)
      expect(exams.weakTopicWeights['weak']).toBe(1.5)
      expect(exams.weakTopicWeights['strong']).toBe(0.8)
    })

    it('0.8 weight for courses with mastery >= 0.6', () => {
      const ctx = makeContext({
        activeCourses: [
          makeCourse({ courseId: 'good', masteryScore: 0.75 }),
        ],
      })
      const { exams } = generateDirectives(ctx)
      expect(exams.weakTopicWeights['good']).toBe(0.8)
    })

    it('boundary: exactly 0.6 gets 0.8 weight', () => {
      const ctx = makeContext({
        activeCourses: [
          makeCourse({ courseId: 'borderline', masteryScore: 0.6 }),
        ],
      })
      const { exams } = generateDirectives(ctx)
      expect(exams.weakTopicWeights['borderline']).toBe(0.8)
    })

    it('empty weights when no courses', () => {
      const ctx = makeContext({ activeCourses: [] })
      const { exams } = generateDirectives(ctx)
      expect(Object.keys(exams.weakTopicWeights)).toHaveLength(0)
    })
  })

  describe('target difficulty', () => {
    it('based on estimated ability: 0.6 ability -> difficulty 3', () => {
      // round(0.6 * 4) + 1 = round(2.4) + 1 = 2 + 1 = 3
      const ctx = makeContext({ estimatedAbility: 0.6 })
      const { exams } = generateDirectives(ctx)
      expect(exams.targetDifficulty).toBe(3)
    })

    it('low ability (0.1) -> difficulty 1', () => {
      // round(0.1 * 4) + 1 = round(0.4) + 1 = 0 + 1 = 1
      const ctx = makeContext({ estimatedAbility: 0.1 })
      const { exams } = generateDirectives(ctx)
      expect(exams.targetDifficulty).toBe(1)
    })

    it('high ability (1.0) -> difficulty 5', () => {
      // round(1.0 * 4) + 1 = 4 + 1 = 5
      const ctx = makeContext({ estimatedAbility: 1.0 })
      const { exams } = generateDirectives(ctx)
      expect(exams.targetDifficulty).toBe(5)
    })

    it('bounded 1-5', () => {
      const ctxLow = makeContext({ estimatedAbility: 0 })
      const ctxHigh = makeContext({ estimatedAbility: 1.0 })
      const { exams: exLow } = generateDirectives(ctxLow)
      const { exams: exHigh } = generateDirectives(ctxHigh)
      expect(exLow.targetDifficulty).toBeGreaterThanOrEqual(1)
      expect(exHigh.targetDifficulty).toBeLessThanOrEqual(5)
    })
  })

  describe('focus question types', () => {
    it('fill_blank for algebraic mistakes', () => {
      const ctx = makeContext({ mistakePatterns: { algebraic: 3 } })
      const { exams } = generateDirectives(ctx)
      expect(exams.focusQuestionTypes).toContain('fill_blank')
    })

    it('short_answer for conceptual mistakes', () => {
      const ctx = makeContext({ mistakePatterns: { conceptual: 4 } })
      const { exams } = generateDirectives(ctx)
      expect(exams.focusQuestionTypes).toContain('short_answer')
    })

    it('matching for procedural mistakes', () => {
      const ctx = makeContext({ mistakePatterns: { procedural: 2 } })
      const { exams } = generateDirectives(ctx)
      expect(exams.focusQuestionTypes).toContain('matching')
    })

    it('defaults to balanced set when no mistake patterns', () => {
      const ctx = makeContext({ mistakePatterns: {} })
      const { exams } = generateDirectives(ctx)
      expect(exams.focusQuestionTypes).toContain('mcq')
      expect(exams.focusQuestionTypes).toContain('fill_blank')
      expect(exams.focusQuestionTypes).toContain('short_answer')
    })

    it('includes multiple types when multiple mistake categories', () => {
      const ctx = makeContext({
        mistakePatterns: { algebraic: 3, conceptual: 2, procedural: 1 },
      })
      const { exams } = generateDirectives(ctx)
      expect(exams.focusQuestionTypes).toContain('fill_blank')
      expect(exams.focusQuestionTypes).toContain('short_answer')
      expect(exams.focusQuestionTypes).toContain('matching')
    })
  })

  describe('estimated score', () => {
    it('rounds rolling accuracy * 100', () => {
      const ctx = makeContext({ rollingAccuracy: 0.723 })
      const { exams } = generateDirectives(ctx)
      expect(exams.estimatedScore).toBe(72)
    })

    it('100 when accuracy is 1.0', () => {
      const ctx = makeContext({ rollingAccuracy: 1.0 })
      const { exams } = generateDirectives(ctx)
      expect(exams.estimatedScore).toBe(100)
    })

    it('0 when accuracy is 0', () => {
      const ctx = makeContext({ rollingAccuracy: 0 })
      const { exams } = generateDirectives(ctx)
      expect(exams.estimatedScore).toBe(0)
    })
  })
})

// =============================================================================
// Integration / edge cases
// =============================================================================

describe('generateDirectives — integration edge cases', () => {
  it('handles brand-new student with all defaults', () => {
    const ctx = makeContext({
      rollingAccuracy: 0.5,
      rollingConfidence: 0,
      estimatedAbility: 0.38,
      trendDirection: 'stable',
      currentDifficultyTarget: 3,
      weakConceptIds: [],
      mistakePatterns: {},
      currentStreak: 0,
      currentLevel: 1,
      avgSessionLengthMinutes: 0,
      sessionsThisWeek: 0,
      cardsDueToday: 0,
      overdueCardCount: 0,
      activeCourses: [],
      weakestCourseId: null,
      strongestCourseId: null,
      subjects: [],
    })

    const d = generateDirectives(ctx)

    // Should not throw, all sections should exist
    // accuracy 0.5 < 0.60 triggers difficulty decrease: 3 -> 2
    expect(d.practice.targetDifficulty).toBe(2)
    // accuracy 0.5 < 0.55 triggers detailed explanation
    expect(d.homework.explanationDepth).toBe('detailed')
    // accuracy 0.5 < 0.55 triggers reinforced pacing
    expect(d.lessons.pacing).toBe('reinforced')
    expect(d.dashboard.primaryAction.type).toBe('practice_weak')
    // accuracy exactly 0.5 does NOT trigger throttle (condition is < 0.5), cards due is 0 -> normal limit
    expect(d.srs.adjustedNewCardLimit).toBe(20)
    expect(d.exams.estimatedScore).toBe(50)
  })

  it('handles top-performing student', () => {
    const ctx = makeContext({
      rollingAccuracy: 0.95,
      rollingConfidence: 0.85,
      estimatedAbility: 0.95,
      trendDirection: 'improving',
      currentDifficultyTarget: 4,
      weakConceptIds: [],
      currentStreak: 21,
      sessionsThisWeek: 6,
      speedPreference: 'fast',
    })

    const d = generateDirectives(ctx)
    expect(d.practice.targetDifficulty).toBe(5) // pushed up
    expect(d.homework.explanationDepth).toBe('brief')
    expect(d.lessons.pacing).toBe('accelerated')
    expect(d.lessons.skipWorkedExamples).toBe(true)
    expect(d.lessons.contentFormat).toBe('concise')
    expect(d.dashboard.celebrationDue).toContain('21')
    expect(d.exams.targetDifficulty).toBe(5) // round(0.95*4)+1=5
  })

  it('handles struggling student', () => {
    const ctx = makeContext({
      rollingAccuracy: 0.30,
      rollingConfidence: 0.1,
      estimatedAbility: 0.15,
      trendDirection: 'declining',
      currentDifficultyTarget: 3,
      mistakePatterns: { algebraic: 8, conceptual: 5 },
      currentStreak: 0,
      sessionsThisWeek: 1,
      cardsDueToday: 80,
    })

    const d = generateDirectives(ctx)
    expect(d.practice.targetDifficulty).toBe(2) // pushed down
    expect(d.homework.explanationDepth).toBe('detailed')
    expect(d.homework.scaffoldingLevel).toBeGreaterThanOrEqual(4) // high scaffolding
    expect(d.lessons.pacing).toBe('reinforced')
    expect(d.lessons.extraPracticeSteps).toBe(3)
    expect(d.srs.adjustedNewCardLimit).toBe(5) // overwhelmed
    expect(d.exams.estimatedScore).toBe(30)
  })
})
