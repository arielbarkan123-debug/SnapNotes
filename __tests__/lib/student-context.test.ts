/**
 * Tests for lib/student-context
 *
 * Validates that getStudentContext():
 * - Runs all 10 parallel Supabase queries
 * - Correctly assembles a StudentContext from all data sources
 * - Provides safe defaults when tables are empty or null
 * - Handles partial data gracefully
 * - Returns null for unregistered users
 */

import { getStudentContext } from '@/lib/student-context'
import type { StudentContext } from '@/lib/student-context/types'

// =============================================================================
// Mock Supabase builder
// =============================================================================

/**
 * Creates a chainable mock that records every method call so we can
 * assert which tables were queried and with what filters.
 */
function createChainableMock(resolvedValue: unknown = { data: null, error: null, count: null }) {
  const mock: Record<string, jest.Mock> = {}
  const chain = new Proxy(mock, {
    get(_target, prop: string) {
      if (prop === 'then') {
        // Make it thenable so `await` resolves
        return (resolve: (v: unknown) => void) => resolve(resolvedValue)
      }
      if (!mock[prop]) {
        mock[prop] = jest.fn().mockReturnValue(chain)
      }
      return mock[prop]
    },
  })
  return chain
}

/**
 * Build a full mock Supabase client whose `.from(table)` returns
 * pre-configured responses per table name.
 */
function createMockSupabase(tableResponses: Record<string, unknown>) {
  // Track call order for verification
  const fromCalls: string[] = []

  return {
    from: jest.fn((table: string) => {
      fromCalls.push(table)
      const response = tableResponses[table] ?? { data: null, error: null, count: null }
      return createChainableMock(response)
    }),
    _fromCalls: fromCalls,
  }
}

// =============================================================================
// Test fixtures
// =============================================================================

const USER_ID = 'test-user-id-abc-123'

const FULL_PROFILE = {
  study_system: 'israeli_bagrut',
  grade: '11',
  subjects: ['mathematics', 'physics'],
  subject_levels: { mathematics: '5 units', physics: '5 units' },
  exam_format: 'match_real',
  language: 'he',
  learning_styles: ['visual', 'practice'],
  study_goal: 'exam_prep',
  preferred_study_time: 'evening',
  difficulty_preference: 'challenging',
  speed_preference: 'moderate',
  accuracy_trend: 'improving',
}

const FULL_REFINEMENT = {
  rolling_accuracy: 0.78,
  rolling_response_time_ms: 8500,
  confidence_calibration: 0.12,
  estimated_ability: 3.5,
  current_difficulty_target: 3.8,
  accuracy_confidence: 0.65,
}

const FULL_MISTAKE_PATTERNS = {
  patterns: [
    { patternName: 'Sign errors', frequency: 5 },
    { patternName: 'Unit conversion', frequency: 3 },
  ],
  insufficient_data: false,
}

const FULL_GAMIFICATION = {
  current_streak: 7,
  longest_streak: 14,
  current_level: 5,
  total_xp: 2350,
  last_activity_date: '2026-03-01',
  streak_freezes: 2,
}

const STUDY_SESSIONS = [
  { duration_seconds: 1200, started_at: '2026-03-01T17:00:00Z' },
  { duration_seconds: 900, started_at: '2026-03-01T17:30:00Z' },
  { duration_seconds: 1500, started_at: '2026-02-28T10:00:00Z' },
]

const MASTERY_ROWS = [
  { course_id: 'course-1', mastery_score: 0.85, last_practiced: '2026-03-01T12:00:00Z' },
  { course_id: 'course-2', mastery_score: 0.45, last_practiced: '2026-02-28T15:00:00Z' },
]

const PROGRESS_ROWS = [
  {
    course_id: 'course-1',
    current_lesson: 5,
    completed_lessons: [0, 1, 2, 3, 4],
    courses: {
      id: 'course-1',
      title: 'Calculus 101',
      generated_course: {
        lessons: [
          { title: 'L1' }, { title: 'L2' }, { title: 'L3' },
          { title: 'L4' }, { title: 'L5' }, { title: 'L6' },
          { title: 'L7' }, { title: 'L8' },
        ],
      },
    },
  },
  {
    course_id: 'course-2',
    current_lesson: 2,
    completed_lessons: [0, 1],
    courses: {
      id: 'course-2',
      title: 'Physics Mechanics',
      generated_course: {
        lessons: [
          { title: 'P1' }, { title: 'P2' }, { title: 'P3' },
          { title: 'P4' }, { title: 'P5' },
        ],
      },
    },
  },
]

function fullTableResponses() {
  return {
    user_learning_profile: { data: FULL_PROFILE, error: null },
    profile_refinement_state: { data: FULL_REFINEMENT, error: null },
    mistake_patterns: { data: FULL_MISTAKE_PATTERNS, error: null },
    user_gamification: { data: FULL_GAMIFICATION, error: null },
    review_cards: { data: null, error: null, count: 12 },
    study_sessions: { data: STUDY_SESSIONS, error: null },
    user_mastery: { data: MASTERY_ROWS, error: null },
    user_progress: { data: PROGRESS_ROWS, error: null },
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('getStudentContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ─── Core assembly ───────────────────────────────────────────────────────

  it('returns null when user has no learning profile', async () => {
    const supabase = createMockSupabase({
      user_learning_profile: { data: null, error: null },
    })

    const result = await getStudentContext(supabase as any, USER_ID)
    expect(result).toBeNull()
  })

  it('assembles full context from all data sources', async () => {
    const responses = fullTableResponses()
    const supabase = createMockSupabase(responses)

    const ctx = await getStudentContext(supabase as any, USER_ID)
    expect(ctx).not.toBeNull()
    const c = ctx as StudentContext

    // Identity & Preferences
    expect(c.userId).toBe(USER_ID)
    expect(c.grade).toBe('11')
    expect(c.studySystem).toBe('israeli_bagrut')
    expect(c.subjects).toEqual(['mathematics', 'physics'])
    expect(c.subjectLevels).toEqual({ mathematics: '5 units', physics: '5 units' })
    expect(c.examFormat).toBe('match_real')
    expect(c.language).toBe('he')
    expect(c.learningStyles).toEqual(['visual', 'practice'])
    expect(c.studyGoal).toBe('exam_prep')
    expect(c.preferredStudyTime).toBe('evening')
    expect(c.difficultyPreference).toBe('challenging')
    expect(c.speedPreference).toBe('moderate')

    // Live Performance
    expect(c.rollingAccuracy).toBe(0.78)
    expect(c.rollingSpeed).toBeCloseTo(60000 / 8500, 1) // ~7.06 q/min
    expect(c.rollingConfidence).toBe(0.12)
    expect(c.estimatedAbility).toBe(0.63) // (3.5 - 1) / 4 = 0.625 -> 0.63
    expect(c.trendDirection).toBe('improving')
    expect(c.trendStrength).toBe(0.65)
    expect(c.currentDifficultyTarget).toBe(3.8)
  })

  it('populates mistake patterns correctly', async () => {
    const responses = fullTableResponses()
    const supabase = createMockSupabase(responses)

    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.mistakePatterns).toEqual({
      'Sign errors': 5,
      'Unit conversion': 3,
    })
    expect(ctx.mistakeDataSufficient).toBe(true)
  })

  it('populates engagement metrics from gamification', async () => {
    const responses = fullTableResponses()
    const supabase = createMockSupabase(responses)

    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.currentStreak).toBe(7)
    expect(ctx.longestStreak).toBe(14)
    expect(ctx.currentLevel).toBe(5)
    expect(ctx.totalXp).toBe(2350)
    expect(ctx.lastActivityDate).toBe('2026-03-01')
    expect(ctx.streakFreezes).toBe(2)
  })

  it('computes activity signals from study sessions', async () => {
    const responses = fullTableResponses()
    const supabase = createMockSupabase(responses)

    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.sessionsThisWeek).toBe(3)
    // Total: 1200 + 900 + 1500 = 3600 seconds = 60 minutes
    expect(ctx.totalStudyTimeThisWeekMinutes).toBe(60)
    // Average: 60 / 3 = 20 minutes
    expect(ctx.avgSessionLengthMinutes).toBe(20)
    // Peak: hours 17 (2 sessions) vs 10 (1 session) -> 17
    expect(ctx.peakStudyHour).toBe(17)
  })

  it('builds course snapshots with mastery data', async () => {
    const responses = fullTableResponses()
    const supabase = createMockSupabase(responses)

    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.activeCourses).toHaveLength(2)

    const calc = ctx.activeCourses.find(c => c.courseId === 'course-1')!
    expect(calc.title).toBe('Calculus 101')
    expect(calc.masteryScore).toBe(0.85)
    expect(calc.lessonsCompleted).toBe(5)
    expect(calc.totalLessons).toBe(8)
    expect(calc.currentLesson).toBe(5)

    const phys = ctx.activeCourses.find(c => c.courseId === 'course-2')!
    expect(phys.title).toBe('Physics Mechanics')
    expect(phys.masteryScore).toBe(0.45)
    expect(phys.lessonsCompleted).toBe(2)
    expect(phys.totalLessons).toBe(5)
    expect(phys.currentLesson).toBe(2)
  })

  it('identifies weakest and strongest courses', async () => {
    const responses = fullTableResponses()
    const supabase = createMockSupabase(responses)

    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.weakestCourseId).toBe('course-2')  // mastery 0.45
    expect(ctx.strongestCourseId).toBe('course-1') // mastery 0.85
  })

  it('includes contextGeneratedAt ISO timestamp', async () => {
    const responses = fullTableResponses()
    const supabase = createMockSupabase(responses)

    const before = new Date().toISOString()
    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    const after = new Date().toISOString()

    expect(ctx.contextGeneratedAt).toBeDefined()
    expect(ctx.contextGeneratedAt >= before).toBe(true)
    expect(ctx.contextGeneratedAt <= after).toBe(true)
  })

  // ─── Safe defaults ───────────────────────────────────────────────────────

  it('provides safe defaults when only profile exists (all other tables empty)', async () => {
    const supabase = createMockSupabase({
      user_learning_profile: { data: { study_system: 'general', language: 'en' }, error: null },
    })

    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx).not.toBeNull()

    // Identity defaults
    expect(ctx.studySystem).toBe('general')
    expect(ctx.grade).toBeNull()
    expect(ctx.subjects).toEqual([])
    expect(ctx.subjectLevels).toEqual({})
    expect(ctx.examFormat).toBeNull()
    expect(ctx.language).toBe('en')
    expect(ctx.learningStyles).toEqual(['practice'])
    expect(ctx.studyGoal).toBeNull()
    expect(ctx.preferredStudyTime).toBeNull()
    expect(ctx.difficultyPreference).toBeNull()
    expect(ctx.speedPreference).toBeNull()

    // Live Performance defaults
    expect(ctx.rollingAccuracy).toBe(0.5)
    expect(ctx.rollingSpeed).toBe(0)
    expect(ctx.rollingConfidence).toBe(0)
    expect(ctx.estimatedAbility).toBe(0.38) // (2.5 - 1) / 4 = 0.375 -> 0.38
    expect(ctx.trendDirection).toBe('stable')
    expect(ctx.trendStrength).toBe(0)
    expect(ctx.currentDifficultyTarget).toBe(3)

    // Weakness defaults
    expect(ctx.weakConceptIds).toEqual([])
    expect(ctx.mistakePatterns).toEqual({})
    expect(ctx.mistakeDataSufficient).toBe(false)

    // Engagement defaults
    expect(ctx.currentStreak).toBe(0)
    expect(ctx.longestStreak).toBe(0)
    expect(ctx.currentLevel).toBe(1)
    expect(ctx.totalXp).toBe(0)
    expect(ctx.lastActivityDate).toBeNull()
    expect(ctx.streakFreezes).toBe(0)

    // Activity defaults
    expect(ctx.avgSessionLengthMinutes).toBe(0)
    expect(ctx.peakStudyHour).toBeNull()
    expect(ctx.totalStudyTimeThisWeekMinutes).toBe(0)
    expect(ctx.sessionsThisWeek).toBe(0)

    // Review defaults
    expect(ctx.cardsDueToday).toBe(0)
    expect(ctx.overdueCardCount).toBe(0)
    expect(ctx.totalActiveCards).toBe(0)

    // Course defaults
    expect(ctx.activeCourses).toEqual([])
    expect(ctx.weakestCourseId).toBeNull()
    expect(ctx.strongestCourseId).toBeNull()
  })

  it('handles English language correctly', async () => {
    const supabase = createMockSupabase({
      user_learning_profile: { data: { study_system: 'us', language: 'en' }, error: null },
    })
    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.language).toBe('en')
  })

  it('defaults language to en for unknown values', async () => {
    const supabase = createMockSupabase({
      user_learning_profile: { data: { study_system: 'general', language: 'fr' }, error: null },
    })
    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.language).toBe('en')
  })

  it('handles insufficient mistake data', async () => {
    const supabase = createMockSupabase({
      user_learning_profile: { data: { study_system: 'general' }, error: null },
      mistake_patterns: {
        data: { patterns: [], insufficient_data: true },
        error: null,
      },
    })
    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.mistakePatterns).toEqual({})
    expect(ctx.mistakeDataSufficient).toBe(false)
  })

  it('handles declining trend', async () => {
    const supabase = createMockSupabase({
      user_learning_profile: {
        data: { study_system: 'general', accuracy_trend: 'declining' },
        error: null,
      },
    })
    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.trendDirection).toBe('declining')
  })

  // ─── Edge cases ──────────────────────────────────────────────────────────

  it('normalizes ability score from 1-5 to 0-1 range', async () => {
    // Ability of 1 -> 0.0, Ability of 5 -> 1.0
    const supabase = createMockSupabase({
      user_learning_profile: { data: { study_system: 'general' }, error: null },
      profile_refinement_state: {
        data: { ...FULL_REFINEMENT, estimated_ability: 1.0 },
        error: null,
      },
    })
    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.estimatedAbility).toBe(0)

    // Max ability
    const supabase2 = createMockSupabase({
      user_learning_profile: { data: { study_system: 'general' }, error: null },
      profile_refinement_state: {
        data: { ...FULL_REFINEMENT, estimated_ability: 5.0 },
        error: null,
      },
    })
    const ctx2 = (await getStudentContext(supabase2 as any, USER_ID))!
    expect(ctx2.estimatedAbility).toBe(1)
  })

  it('handles empty study sessions gracefully', async () => {
    const supabase = createMockSupabase({
      user_learning_profile: { data: { study_system: 'general' }, error: null },
      study_sessions: { data: [], error: null },
    })
    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.avgSessionLengthMinutes).toBe(0)
    expect(ctx.peakStudyHour).toBeNull()
    expect(ctx.totalStudyTimeThisWeekMinutes).toBe(0)
    expect(ctx.sessionsThisWeek).toBe(0)
  })

  it('handles single course correctly for weakest/strongest', async () => {
    const supabase = createMockSupabase({
      user_learning_profile: { data: { study_system: 'general' }, error: null },
      user_mastery: {
        data: [{ course_id: 'single-course', mastery_score: 0.7, last_practiced: null }],
        error: null,
      },
      user_progress: {
        data: [{
          course_id: 'single-course',
          current_lesson: 1,
          completed_lessons: [0],
          courses: {
            id: 'single-course',
            title: 'Only Course',
            generated_course: { lessons: [{ title: 'L1' }, { title: 'L2' }] },
          },
        }],
        error: null,
      },
    })

    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.activeCourses).toHaveLength(1)
    expect(ctx.weakestCourseId).toBe('single-course')
    expect(ctx.strongestCourseId).toBe('single-course')
  })

  it('queries all expected tables', async () => {
    const responses = fullTableResponses()
    const supabase = createMockSupabase(responses)

    await getStudentContext(supabase as any, USER_ID)

    const tables = (supabase.from as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(tables).toContain('user_learning_profile')
    expect(tables).toContain('profile_refinement_state')
    expect(tables).toContain('mistake_patterns')
    expect(tables).toContain('user_gamification')
    expect(tables).toContain('review_cards')
    expect(tables).toContain('study_sessions')
    expect(tables).toContain('user_mastery')
    expect(tables).toContain('user_progress')
  })

  it('handles rejected promises gracefully (returns defaults)', async () => {
    // Simulate some queries failing (e.g. tables don't exist)
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'user_learning_profile') {
          return createChainableMock({ data: { study_system: 'general' }, error: null })
        }
        // All other tables throw
        return createChainableMock(
          Promise.reject(new Error(`Table ${table} does not exist`))
        )
      }),
    }

    // Should not throw, should return context with defaults
    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx).not.toBeNull()
    expect(ctx.studySystem).toBe('general')
    expect(ctx.currentStreak).toBe(0)
    expect(ctx.activeCourses).toEqual([])
  })

  it('handles null duration_seconds in study sessions', async () => {
    const supabase = createMockSupabase({
      user_learning_profile: { data: { study_system: 'general' }, error: null },
      study_sessions: {
        data: [
          { duration_seconds: null, started_at: '2026-03-01T10:00:00Z' },
          { duration_seconds: 600, started_at: '2026-03-01T14:00:00Z' },
        ],
        error: null,
      },
    })

    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.sessionsThisWeek).toBe(2)
    // Total: 0 + 600 = 600 seconds = 10 minutes
    expect(ctx.totalStudyTimeThisWeekMinutes).toBe(10)
    // Avg: 10 / 2 = 5
    expect(ctx.avgSessionLengthMinutes).toBe(5)
  })

  it('course snapshots work with sections instead of lessons', async () => {
    const supabase = createMockSupabase({
      user_learning_profile: { data: { study_system: 'general' }, error: null },
      user_mastery: { data: [], error: null },
      user_progress: {
        data: [{
          course_id: 'c3',
          current_lesson: 0,
          completed_lessons: [],
          courses: {
            id: 'c3',
            title: 'Sections Course',
            generated_course: {
              sections: [{ title: 'S1' }, { title: 'S2' }, { title: 'S3' }],
            },
          },
        }],
        error: null,
      },
    })

    const ctx = (await getStudentContext(supabase as any, USER_ID))!
    expect(ctx.activeCourses[0].totalLessons).toBe(3)
    expect(ctx.activeCourses[0].masteryScore).toBe(0)
  })
})
