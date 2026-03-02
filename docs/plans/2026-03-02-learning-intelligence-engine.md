# Learning Intelligence Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a centralized Student Intelligence Engine that assembles all user data into actionable per-feature directives, wire it into every feature, and add new implicit behavioral data collection — making NoteSnap feel like a private tutor who truly knows each student.

**Architecture:** A single `getStudentContext()` function queries 6-8 tables in parallel and returns a typed `StudentContext`. A `getStudentDirectives(context)` function transforms raw data into actionable instructions per feature (practice, homework, lessons, dashboard, SRS, exams). Each feature calls these at request time. New implicit data collection (fatigue, answer revisions, explanation engagement, feature affinity) feeds back into the context over time.

**Tech Stack:** Next.js 14 API routes, Supabase (PostgreSQL + RLS), TypeScript, existing RLPA refinement engine.

---

## Phase 1: Foundation — Student Context Layer

### Task 1: Define StudentContext types

**Files:**
- Create: `lib/student-context/types.ts`

**Step 1: Create the types file**

```typescript
// lib/student-context/types.ts

// ─── Raw Context (assembled from DB) ───

export interface StudentContext {
  // Identity & Preferences (from user_learning_profile)
  userId: string
  grade: string | null
  studySystem: string
  subjects: string[]
  subjectLevels: Record<string, string>
  examFormat: string | null
  language: 'en' | 'he'
  learningStyles: string[]
  studyGoal: string | null
  preferredStudyTime: string | null
  difficultyPreference: string | null
  speedPreference: string | null

  // Live Performance (from profile_refinement_state)
  rollingAccuracy: number         // 0-1
  rollingSpeed: number            // questions/minute
  rollingConfidence: number       // self-efficacy 0-1
  estimatedAbility: number        // 0-1
  trendDirection: 'improving' | 'stable' | 'declining'
  trendStrength: number           // 0-1
  currentDifficultyTarget: number // 1-5

  // Weaknesses (from profile_refinement_state + mistake_patterns)
  weakConceptIds: string[]
  mistakePatterns: Record<string, number> // { algebraic: 3, arithmetic: 1 }
  mistakeDataSufficient: boolean

  // Engagement (from user_gamification)
  currentStreak: number
  longestStreak: number
  currentLevel: number
  totalXp: number
  lastActivityDate: string | null
  streakFreezes: number

  // Activity Signals (computed from study_sessions)
  avgSessionLengthMinutes: number
  peakStudyHour: number | null       // 0-23, actual not self-reported
  totalStudyTimeThisWeekMinutes: number
  sessionsThisWeek: number

  // Review Status (from review_cards)
  cardsDueToday: number
  overdueCardCount: number           // cards overdue by 3+ days
  totalActiveCards: number

  // Course Context (from user_progress + lesson_progress + user_mastery)
  activeCourses: CourseSnapshot[]
  weakestCourseId: string | null
  strongestCourseId: string | null

  // Meta
  contextGeneratedAt: string         // ISO timestamp
}

export interface CourseSnapshot {
  courseId: string
  title: string
  masteryScore: number              // 0-1
  lastActivityAt: string | null
  lessonsCompleted: number
  totalLessons: number
  currentLesson: number
}

// ─── Directives (actionable per-feature instructions) ───

export interface StudentDirectives {
  practice: PracticeDirectives
  homework: HomeworkDirectives
  lessons: LessonDirectives
  dashboard: DashboardDirectives
  srs: SrsDirectives
  exams: ExamDirectives
}

export interface PracticeDirectives {
  recommendedConceptIds: string[]       // ordered by priority
  targetDifficulty: number              // 1-5, calibrated to ZPD
  recommendedSessionLength: number      // minutes
  questionTypeWeights: Record<string, number> // e.g. { fill_blank: 0.4, mcq: 0.3 }
  avoidConceptIds: string[]             // already mastered
  urgentGaps: UrgentGap[]              // exam-driven urgency
}

export interface UrgentGap {
  conceptId: string
  reason: string                       // "Exam in 5 days, you scored 40% on this"
}

export interface HomeworkDirectives {
  explanationDepth: 'brief' | 'standard' | 'detailed'
  anticipatedMisconceptions: string[]
  scaffoldingLevel: number              // 1-5, how much support
  preferredExplanationStyle: 'visual' | 'step-by-step' | 'analogy' | 'mixed'
  knownPrerequisiteGaps: string[]       // concept names student is weak in
  studentAbilitySummary: string         // one-liner for AI prompt
}

export interface LessonDirectives {
  pacing: 'accelerated' | 'standard' | 'reinforced'
  skipWorkedExamples: boolean
  extraPracticeSteps: number            // 0-5 additional practice steps
  prerequisiteReviewNeeded: PrerequisiteGap[]
  contentFormat: 'concise' | 'detailed'
}

export interface PrerequisiteGap {
  conceptName: string
  courseId: string | null
  lessonIndex: number | null
}

export interface DashboardDirectives {
  primaryAction: DashboardAction
  nudge: string | null                 // motivational/coaching message
  courseOrder: string[]                 // courseIds ranked by urgency
  streakRisk: boolean                  // study today or lose streak
  celebrationDue: string | null        // achievement to celebrate
  weeklyGoalProgress: number           // 0-1
}

export interface DashboardAction {
  type: 'review_cards' | 'continue_lesson' | 'practice_weak' | 'start_exam_prep' | 'take_break'
  label: string                        // human-readable
  courseId?: string
  count?: number                       // e.g. "12 cards due"
}

export interface SrsDirectives {
  priorityCardIds: string[]            // cards from weak concepts first
  adjustedNewCardLimit: number         // reduced if overwhelmed
  retireSuggestionIds: string[]        // cards aced 10+ times
  interleaveRecommended: boolean       // mix subjects?
}

export interface ExamDirectives {
  weakTopicWeights: Record<string, number>  // topic → weight multiplier
  targetDifficulty: number                  // 1-5
  focusQuestionTypes: string[]             // question types student struggles with
  estimatedScore: number                   // predicted % based on current mastery
}
```

**Step 2: Commit**

```bash
git add lib/student-context/types.ts
git commit -m "feat: define StudentContext and StudentDirectives types"
```

---

### Task 2: Build getStudentContext() function

**Files:**
- Create: `lib/student-context/index.ts`
- Reference: `lib/user-profile.ts` (existing loadUserProfile pattern)

**Step 1: Write the test**

Create `__tests__/lib/student-context.test.ts`:

```typescript
import { getStudentContext } from '@/lib/student-context'

// Mock Supabase
const mockFrom = jest.fn()
const mockSupabase = {
  from: mockFrom,
} as any

function mockQuery(data: any) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error: null }),
    single: jest.fn().mockResolvedValue({ data, error: null }),
    then: jest.fn().mockResolvedValue({ data, error: null }),
  }
}

describe('getStudentContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'user_learning_profile':
          return mockQuery({
            study_system: 'ib', grade: '11', subjects: ['math', 'physics'],
            subject_levels: { math: 'HL' }, exam_format: 'ib_standard',
            language: 'en', learning_styles: ['visual', 'practice'],
            study_goal: 'exam_prep', preferred_study_time: 'evening',
            difficulty_preference: 'challenging', speed_preference: 'moderate',
          })
        case 'profile_refinement_state':
          return mockQuery({
            rolling_accuracy: 0.72, rolling_speed: 2.5, rolling_confidence: 0.65,
            estimated_ability: 0.68, trend_direction: 'improving', trend_strength: 0.4,
            current_difficulty_target: 3, weak_concept_ids: ['concept-1', 'concept-2'],
          })
        case 'mistake_patterns':
          return mockQuery({
            patterns: { algebraic: 3, arithmetic: 1 }, insufficient_data: false,
          })
        case 'user_gamification':
          return mockQuery({
            current_streak: 7, longest_streak: 15, current_level: 5,
            total_xp: 1200, last_activity_date: '2026-03-01', streak_freezes: 2,
          })
        case 'review_cards':
          return mockQuery([]) // array for count queries
        case 'study_sessions':
          return mockQuery([])
        case 'user_mastery':
          return mockQuery([])
        case 'user_progress':
          return mockQuery([])
        case 'courses':
          return mockQuery([])
        default:
          return mockQuery(null)
      }
    })
  })

  it('assembles context from all data sources', async () => {
    const ctx = await getStudentContext(mockSupabase, 'user-123')
    expect(ctx).not.toBeNull()
    expect(ctx!.studySystem).toBe('ib')
    expect(ctx!.rollingAccuracy).toBe(0.72)
    expect(ctx!.weakConceptIds).toEqual(['concept-1', 'concept-2'])
    expect(ctx!.currentStreak).toBe(7)
    expect(ctx!.mistakePatterns).toEqual({ algebraic: 3, arithmetic: 1 })
  })

  it('returns safe defaults when optional tables are empty', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'user_learning_profile') {
        return mockQuery({
          study_system: 'general', grade: null, subjects: [],
          subject_levels: {}, exam_format: null, language: 'en',
          learning_styles: [], study_goal: null, preferred_study_time: null,
          difficulty_preference: null, speed_preference: null,
        })
      }
      return mockQuery(null) // all other tables empty
    })

    const ctx = await getStudentContext(mockSupabase, 'user-123')
    expect(ctx).not.toBeNull()
    expect(ctx!.rollingAccuracy).toBe(0.5) // safe default
    expect(ctx!.weakConceptIds).toEqual([])
    expect(ctx!.currentStreak).toBe(0)
    expect(ctx!.cardsDueToday).toBe(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/curvalux/NoteSnap && npx jest __tests__/lib/student-context.test.ts --no-cache`
Expected: FAIL — module not found

**Step 3: Implement getStudentContext()**

Create `lib/student-context/index.ts`:

```typescript
import { SupabaseClient } from '@supabase/supabase-js'
import { StudentContext, CourseSnapshot } from './types'

export { type StudentContext, type StudentDirectives } from './types'

const SAFE_DEFAULTS: Omit<StudentContext, 'userId' | 'contextGeneratedAt'> = {
  grade: null,
  studySystem: 'general',
  subjects: [],
  subjectLevels: {},
  examFormat: null,
  language: 'en',
  learningStyles: [],
  studyGoal: null,
  preferredStudyTime: null,
  difficultyPreference: null,
  speedPreference: null,
  rollingAccuracy: 0.5,
  rollingSpeed: 1.0,
  rollingConfidence: 0.5,
  estimatedAbility: 0.5,
  trendDirection: 'stable',
  trendStrength: 0,
  currentDifficultyTarget: 3,
  weakConceptIds: [],
  mistakePatterns: {},
  mistakeDataSufficient: false,
  currentStreak: 0,
  longestStreak: 0,
  currentLevel: 1,
  totalXp: 0,
  lastActivityDate: null,
  streakFreezes: 0,
  avgSessionLengthMinutes: 15,
  peakStudyHour: null,
  totalStudyTimeThisWeekMinutes: 0,
  sessionsThisWeek: 0,
  cardsDueToday: 0,
  overdueCardCount: 0,
  totalActiveCards: 0,
  activeCourses: [],
  weakestCourseId: null,
  strongestCourseId: null,
}

export async function getStudentContext(
  supabase: SupabaseClient,
  userId: string
): Promise<StudentContext | null> {
  // Run all queries in parallel for speed
  const [
    profileResult,
    refinementResult,
    mistakeResult,
    gamificationResult,
    dueCardsResult,
    overdueCardsResult,
    totalCardsResult,
    sessionsResult,
    masteryResult,
    progressResult,
  ] = await Promise.all([
    // 1. User learning profile
    supabase
      .from('user_learning_profile')
      .select('study_system, grade, subjects, subject_levels, exam_format, language, learning_styles, study_goal, preferred_study_time, difficulty_preference, speed_preference')
      .eq('user_id', userId)
      .maybeSingle(),

    // 2. Profile refinement state (RLPA)
    supabase
      .from('profile_refinement_state')
      .select('rolling_accuracy, rolling_speed, rolling_confidence, estimated_ability, trend_direction, trend_strength, current_difficulty_target, weak_concept_ids')
      .eq('user_id', userId)
      .maybeSingle(),

    // 3. Mistake patterns
    supabase
      .from('mistake_patterns')
      .select('patterns, insufficient_data')
      .eq('user_id', userId)
      .maybeSingle(),

    // 4. Gamification
    supabase
      .from('user_gamification')
      .select('current_streak, longest_streak, current_level, total_xp, last_activity_date, streak_freezes')
      .eq('user_id', userId)
      .maybeSingle(),

    // 5. Due SRS cards (today)
    supabase
      .from('review_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due_date', new Date().toISOString())
      .in('state', ['learning', 'review', 'relearning']),

    // 6. Overdue cards (3+ days)
    supabase
      .from('review_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due_date', new Date(Date.now() - 3 * 86400000).toISOString())
      .in('state', ['learning', 'review', 'relearning']),

    // 7. Total active cards
    supabase
      .from('review_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('state', 'new'),

    // 8. Study sessions this week
    supabase
      .from('study_sessions')
      .select('duration_seconds, started_at')
      .eq('user_id', userId)
      .gte('started_at', getWeekStart()),

    // 9. Course mastery
    supabase
      .from('user_mastery')
      .select('course_id, mastery_score, last_practiced')
      .eq('user_id', userId),

    // 10. Course progress
    supabase
      .from('user_progress')
      .select('course_id, current_lesson, completed_lessons, courses(id, title, generated_course)')
      .eq('user_id', userId),
  ])

  const profile = profileResult.data
  const refinement = refinementResult.data
  const mistakes = mistakeResult.data
  const gamification = gamificationResult.data
  const sessions = sessionsResult.data || []
  const mastery = masteryResult.data || []
  const progress = progressResult.data || []

  // Compute session stats
  const totalStudySeconds = sessions.reduce(
    (sum: number, s: any) => sum + (s.duration_seconds || 0), 0
  )
  const avgSessionMinutes = sessions.length > 0
    ? totalStudySeconds / sessions.length / 60
    : SAFE_DEFAULTS.avgSessionLengthMinutes

  // Compute peak study hour from actual session data
  const hourCounts: Record<number, number> = {}
  sessions.forEach((s: any) => {
    if (s.started_at) {
      const hour = new Date(s.started_at).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    }
  })
  const peakHour = Object.entries(hourCounts).length > 0
    ? Number(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0][0])
    : null

  // Build course snapshots
  const courseSnapshots: CourseSnapshot[] = progress.map((p: any) => {
    const m = mastery.find((ms: any) => ms.course_id === p.course_id)
    const course = p.courses
    const totalLessons = course?.generated_course?.lessons?.length || 0
    return {
      courseId: p.course_id,
      title: course?.title || 'Untitled',
      masteryScore: m?.mastery_score || 0,
      lastActivityAt: m?.last_practiced || null,
      lessonsCompleted: (p.completed_lessons || []).length,
      totalLessons,
      currentLesson: p.current_lesson || 0,
    }
  })

  const sorted = [...courseSnapshots].sort((a, b) => a.masteryScore - b.masteryScore)

  return {
    userId,

    // Profile
    grade: profile?.grade ?? SAFE_DEFAULTS.grade,
    studySystem: profile?.study_system ?? SAFE_DEFAULTS.studySystem,
    subjects: profile?.subjects ?? SAFE_DEFAULTS.subjects,
    subjectLevels: profile?.subject_levels ?? SAFE_DEFAULTS.subjectLevels,
    examFormat: profile?.exam_format ?? SAFE_DEFAULTS.examFormat,
    language: (profile?.language as 'en' | 'he') ?? SAFE_DEFAULTS.language,
    learningStyles: profile?.learning_styles ?? SAFE_DEFAULTS.learningStyles,
    studyGoal: profile?.study_goal ?? SAFE_DEFAULTS.studyGoal,
    preferredStudyTime: profile?.preferred_study_time ?? SAFE_DEFAULTS.preferredStudyTime,
    difficultyPreference: profile?.difficulty_preference ?? SAFE_DEFAULTS.difficultyPreference,
    speedPreference: profile?.speed_preference ?? SAFE_DEFAULTS.speedPreference,

    // Refinement
    rollingAccuracy: refinement?.rolling_accuracy ?? SAFE_DEFAULTS.rollingAccuracy,
    rollingSpeed: refinement?.rolling_speed ?? SAFE_DEFAULTS.rollingSpeed,
    rollingConfidence: refinement?.rolling_confidence ?? SAFE_DEFAULTS.rollingConfidence,
    estimatedAbility: refinement?.estimated_ability ?? SAFE_DEFAULTS.estimatedAbility,
    trendDirection: refinement?.trend_direction ?? SAFE_DEFAULTS.trendDirection,
    trendStrength: refinement?.trend_strength ?? SAFE_DEFAULTS.trendStrength,
    currentDifficultyTarget: refinement?.current_difficulty_target ?? SAFE_DEFAULTS.currentDifficultyTarget,

    // Weaknesses
    weakConceptIds: refinement?.weak_concept_ids ?? SAFE_DEFAULTS.weakConceptIds,
    mistakePatterns: mistakes?.patterns ?? SAFE_DEFAULTS.mistakePatterns,
    mistakeDataSufficient: mistakes ? !mistakes.insufficient_data : false,

    // Gamification
    currentStreak: gamification?.current_streak ?? SAFE_DEFAULTS.currentStreak,
    longestStreak: gamification?.longest_streak ?? SAFE_DEFAULTS.longestStreak,
    currentLevel: gamification?.current_level ?? SAFE_DEFAULTS.currentLevel,
    totalXp: gamification?.total_xp ?? SAFE_DEFAULTS.totalXp,
    lastActivityDate: gamification?.last_activity_date ?? SAFE_DEFAULTS.lastActivityDate,
    streakFreezes: gamification?.streak_freezes ?? SAFE_DEFAULTS.streakFreezes,

    // Sessions
    avgSessionLengthMinutes: Math.round(avgSessionMinutes),
    peakStudyHour: peakHour,
    totalStudyTimeThisWeekMinutes: Math.round(totalStudySeconds / 60),
    sessionsThisWeek: sessions.length,

    // Cards
    cardsDueToday: dueCardsResult.count ?? SAFE_DEFAULTS.cardsDueToday,
    overdueCardCount: overdueCardsResult.count ?? SAFE_DEFAULTS.overdueCardCount,
    totalActiveCards: totalCardsResult.count ?? SAFE_DEFAULTS.totalActiveCards,

    // Courses
    activeCourses: courseSnapshots,
    weakestCourseId: sorted.length > 0 ? sorted[0].courseId : null,
    strongestCourseId: sorted.length > 0 ? sorted[sorted.length - 1].courseId : null,

    contextGeneratedAt: new Date().toISOString(),
  }
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString()
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/curvalux/NoteSnap && npx jest __tests__/lib/student-context.test.ts --no-cache`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/student-context/index.ts __tests__/lib/student-context.test.ts
git commit -m "feat: implement getStudentContext() — centralized student data assembly"
```

---

### Task 3: Build the Directives Engine

**Files:**
- Create: `lib/student-context/directives.ts`
- Reference: `lib/student-context/types.ts`

**Step 1: Write the test**

Create `__tests__/lib/student-directives.test.ts`:

```typescript
import { generateDirectives } from '@/lib/student-context/directives'
import { StudentContext } from '@/lib/student-context/types'

const baseContext: StudentContext = {
  userId: 'user-1',
  grade: '10', studySystem: 'ib', subjects: ['math'], subjectLevels: { math: 'HL' },
  examFormat: 'ib_standard', language: 'en', learningStyles: ['visual', 'practice'],
  studyGoal: 'exam_prep', preferredStudyTime: 'evening',
  difficultyPreference: 'challenging', speedPreference: 'moderate',
  rollingAccuracy: 0.72, rollingSpeed: 2.0, rollingConfidence: 0.65,
  estimatedAbility: 0.68, trendDirection: 'improving', trendStrength: 0.4,
  currentDifficultyTarget: 3,
  weakConceptIds: ['concept-fractions', 'concept-algebra'],
  mistakePatterns: { algebraic: 5, arithmetic: 2, conceptual: 1 },
  mistakeDataSufficient: true,
  currentStreak: 7, longestStreak: 15, currentLevel: 5, totalXp: 1200,
  lastActivityDate: '2026-03-01', streakFreezes: 2,
  avgSessionLengthMinutes: 25, peakStudyHour: 20,
  totalStudyTimeThisWeekMinutes: 120, sessionsThisWeek: 5,
  cardsDueToday: 15, overdueCardCount: 3, totalActiveCards: 80,
  activeCourses: [
    { courseId: 'c1', title: 'Algebra', masteryScore: 0.45, lastActivityAt: '2026-03-01', lessonsCompleted: 3, totalLessons: 8, currentLesson: 4 },
    { courseId: 'c2', title: 'Geometry', masteryScore: 0.85, lastActivityAt: '2026-02-28', lessonsCompleted: 6, totalLessons: 6, currentLesson: 6 },
  ],
  weakestCourseId: 'c1', strongestCourseId: 'c2',
  contextGeneratedAt: new Date().toISOString(),
}

describe('generateDirectives', () => {
  it('targets ZPD for practice difficulty (70-85% success range)', () => {
    const d = generateDirectives(baseContext)
    // Student at 72% accuracy → difficulty should stay around current level
    expect(d.practice.targetDifficulty).toBeGreaterThanOrEqual(2)
    expect(d.practice.targetDifficulty).toBeLessThanOrEqual(4)
  })

  it('prioritizes weak concepts for practice', () => {
    const d = generateDirectives(baseContext)
    expect(d.practice.recommendedConceptIds).toContain('concept-fractions')
    expect(d.practice.recommendedConceptIds).toContain('concept-algebra')
  })

  it('adjusts explanation depth based on accuracy', () => {
    const d = generateDirectives(baseContext)
    // 72% accuracy → standard depth
    expect(d.homework.explanationDepth).toBe('standard')

    const lowAccuracy = { ...baseContext, rollingAccuracy: 0.4 }
    const d2 = generateDirectives(lowAccuracy)
    expect(d2.homework.explanationDepth).toBe('detailed')

    const highAccuracy = { ...baseContext, rollingAccuracy: 0.92 }
    const d3 = generateDirectives(highAccuracy)
    expect(d3.homework.explanationDepth).toBe('brief')
  })

  it('detects streak risk', () => {
    const d = generateDirectives(baseContext)
    // lastActivityDate is yesterday → streakRisk depends on today's activity
    expect(typeof d.dashboard.streakRisk).toBe('boolean')
  })

  it('sets dashboard primary action to review when cards are overdue', () => {
    const overdueCtx = { ...baseContext, overdueCardCount: 10, cardsDueToday: 25 }
    const d = generateDirectives(overdueCtx)
    expect(d.dashboard.primaryAction.type).toBe('review_cards')
  })

  it('recommends lesson pacing based on trend', () => {
    const improving = { ...baseContext, trendDirection: 'improving' as const, rollingAccuracy: 0.88 }
    const d = generateDirectives(improving)
    expect(d.lessons.pacing).toBe('accelerated')

    const declining = { ...baseContext, trendDirection: 'declining' as const, rollingAccuracy: 0.45 }
    const d2 = generateDirectives(declining)
    expect(d2.lessons.pacing).toBe('reinforced')
  })

  it('adjusts SRS new card limit when student is overwhelmed', () => {
    const overwhelmed = { ...baseContext, cardsDueToday: 80, rollingAccuracy: 0.5 }
    const d = generateDirectives(overwhelmed)
    expect(d.srs.adjustedNewCardLimit).toBeLessThan(20)
  })

  it('weights exam topics toward weak areas', () => {
    const d = generateDirectives(baseContext)
    // Weakest course topics should get higher weights
    expect(Object.keys(d.exams.weakTopicWeights).length).toBeGreaterThan(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/curvalux/NoteSnap && npx jest __tests__/lib/student-directives.test.ts --no-cache`
Expected: FAIL

**Step 3: Implement the directives engine**

Create `lib/student-context/directives.ts`:

```typescript
import {
  StudentContext,
  StudentDirectives,
  PracticeDirectives,
  HomeworkDirectives,
  LessonDirectives,
  DashboardDirectives,
  DashboardAction,
  SrsDirectives,
  ExamDirectives,
} from './types'

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

// ─── Practice ───

function buildPracticeDirectives(ctx: StudentContext): PracticeDirectives {
  // ZPD targeting: adjust difficulty to keep student in 70-85% success range
  let targetDifficulty = ctx.currentDifficultyTarget
  if (ctx.rollingAccuracy > 0.85) targetDifficulty = Math.min(5, targetDifficulty + 1)
  else if (ctx.rollingAccuracy < 0.60) targetDifficulty = Math.max(1, targetDifficulty - 1)

  // Session length: use actual avg, bounded
  const sessionLength = Math.max(5, Math.min(45, ctx.avgSessionLengthMinutes))

  // Question type weighting: emphasize types that correlate with mistake patterns
  const questionTypeWeights: Record<string, number> = {
    multiple_choice: 0.25,
    fill_blank: 0.25,
    short_answer: 0.25,
    true_false: 0.15,
    matching: 0.10,
  }
  // If student has algebraic errors, increase fill_blank (requires constructing answers)
  if ((ctx.mistakePatterns.algebraic || 0) > 2) {
    questionTypeWeights.fill_blank = 0.4
    questionTypeWeights.multiple_choice = 0.15
  }
  // If student has conceptual errors, increase short_answer
  if ((ctx.mistakePatterns.conceptual || 0) > 2) {
    questionTypeWeights.short_answer = 0.4
    questionTypeWeights.multiple_choice = 0.15
  }

  // Mastered concepts to avoid
  const masteredThreshold = 0.9
  const avoidConceptIds = ctx.activeCourses
    .filter(c => c.masteryScore >= masteredThreshold)
    .map(c => c.courseId) // concept-level would be better, course is proxy

  // Urgent gaps (exam-driven)
  const urgentGaps = ctx.weakConceptIds.slice(0, 3).map(id => ({
    conceptId: id,
    reason: ctx.studyGoal === 'exam_prep'
      ? `Weak area — focus before exam`
      : `Below mastery threshold`,
  }))

  return {
    recommendedConceptIds: ctx.weakConceptIds,
    targetDifficulty,
    recommendedSessionLength: sessionLength,
    questionTypeWeights,
    avoidConceptIds,
    urgentGaps,
  }
}

// ─── Homework ───

function buildHomeworkDirectives(ctx: StudentContext): HomeworkDirectives {
  // Explanation depth based on accuracy
  let explanationDepth: 'brief' | 'standard' | 'detailed' = 'standard'
  if (ctx.rollingAccuracy >= 0.85) explanationDepth = 'brief'
  else if (ctx.rollingAccuracy < 0.55) explanationDepth = 'detailed'

  // Scaffolding level: inverse of confidence and accuracy
  const scaffoldingLevel = Math.round(
    5 - (ctx.rollingConfidence + ctx.rollingAccuracy) / 2 * 4
  )

  // Preferred explanation style based on learning styles
  let preferredStyle: 'visual' | 'step-by-step' | 'analogy' | 'mixed' = 'mixed'
  if (ctx.learningStyles.includes('visual')) preferredStyle = 'visual'
  else if (ctx.learningStyles.includes('reading')) preferredStyle = 'step-by-step'
  else if (ctx.learningStyles.includes('practice')) preferredStyle = 'step-by-step'

  // Anticipated misconceptions from mistake patterns
  const anticipatedMisconceptions: string[] = []
  if ((ctx.mistakePatterns.algebraic || 0) > 1) {
    anticipatedMisconceptions.push('algebraic manipulation errors (sign errors, distribution)')
  }
  if ((ctx.mistakePatterns.arithmetic || 0) > 1) {
    anticipatedMisconceptions.push('arithmetic calculation mistakes')
  }
  if ((ctx.mistakePatterns.procedural || 0) > 1) {
    anticipatedMisconceptions.push('skipping steps or wrong order of operations')
  }
  if ((ctx.mistakePatterns.conceptual || 0) > 1) {
    anticipatedMisconceptions.push('fundamental concept misunderstanding')
  }

  // Student ability summary for AI prompt
  const trendWord = ctx.trendDirection === 'improving' ? 'improving' :
    ctx.trendDirection === 'declining' ? 'struggling recently' : 'stable'
  const accuracyPct = Math.round(ctx.rollingAccuracy * 100)
  const studentAbilitySummary = `Grade ${ctx.grade || 'unknown'} student (${ctx.studySystem}), ${accuracyPct}% accuracy and ${trendWord}. Level ${ctx.currentLevel}, ${ctx.currentStreak}-day streak. Prefers ${preferredStyle} explanations.`

  return {
    explanationDepth,
    anticipatedMisconceptions,
    scaffoldingLevel: Math.max(1, Math.min(5, scaffoldingLevel)),
    preferredExplanationStyle: preferredStyle,
    knownPrerequisiteGaps: ctx.weakConceptIds.slice(0, 5),
    studentAbilitySummary,
  }
}

// ─── Lessons ───

function buildLessonDirectives(ctx: StudentContext): LessonDirectives {
  // Pacing: accelerate if improving+accurate, reinforce if declining+inaccurate
  let pacing: 'accelerated' | 'standard' | 'reinforced' = 'standard'
  if (ctx.trendDirection === 'improving' && ctx.rollingAccuracy >= 0.80) {
    pacing = 'accelerated'
  } else if (ctx.trendDirection === 'declining' || ctx.rollingAccuracy < 0.55) {
    pacing = 'reinforced'
  }

  // Skip worked examples if student is clearly capable
  const skipWorkedExamples = ctx.rollingAccuracy >= 0.90 && ctx.trendDirection === 'improving'

  // Extra practice when struggling
  let extraPracticeSteps = 0
  if (ctx.rollingAccuracy < 0.60) extraPracticeSteps = 3
  else if (ctx.rollingAccuracy < 0.70) extraPracticeSteps = 2
  else if (ctx.rollingAccuracy < 0.80) extraPracticeSteps = 1

  // Content format: concise for fast learners, detailed for struggling
  const contentFormat = ctx.rollingAccuracy >= 0.80 && ctx.speedPreference === 'fast'
    ? 'concise' as const
    : 'detailed' as const

  return {
    pacing,
    skipWorkedExamples,
    extraPracticeSteps,
    prerequisiteReviewNeeded: [], // populated when specific course context is available
    contentFormat,
  }
}

// ─── Dashboard ───

function buildDashboardDirectives(ctx: StudentContext): DashboardDirectives {
  // Primary action priority: overdue cards > due cards > continue lesson > practice weak
  let primaryAction: DashboardAction

  if (ctx.overdueCardCount >= 5) {
    primaryAction = {
      type: 'review_cards',
      label: `${ctx.cardsDueToday} cards due (${ctx.overdueCardCount} overdue!)`,
      count: ctx.cardsDueToday,
    }
  } else if (ctx.cardsDueToday >= 10) {
    primaryAction = {
      type: 'review_cards',
      label: `Review ${ctx.cardsDueToday} cards due today`,
      count: ctx.cardsDueToday,
    }
  } else if (ctx.weakestCourseId) {
    const weakCourse = ctx.activeCourses.find(c => c.courseId === ctx.weakestCourseId)
    if (weakCourse && weakCourse.currentLesson < weakCourse.totalLessons) {
      primaryAction = {
        type: 'continue_lesson',
        label: `Continue ${weakCourse.title} — Lesson ${weakCourse.currentLesson + 1}`,
        courseId: weakCourse.courseId,
      }
    } else {
      primaryAction = {
        type: 'practice_weak',
        label: 'Practice your weak areas',
      }
    }
  } else {
    primaryAction = {
      type: 'practice_weak',
      label: 'Start a practice session',
    }
  }

  // Streak risk: they haven't studied today and have an active streak
  const today = new Date().toISOString().split('T')[0]
  const streakRisk = ctx.currentStreak > 0 && ctx.lastActivityDate !== today

  // Nudge: contextual coaching message
  let nudge: string | null = null
  if (ctx.trendDirection === 'declining' && ctx.trendStrength > 0.3) {
    nudge = `Your accuracy dipped to ${Math.round(ctx.rollingAccuracy * 100)}% this week. Try targeted practice on your weak areas to turn it around.`
  } else if (ctx.trendDirection === 'improving' && ctx.trendStrength > 0.3) {
    nudge = `You're on a roll — accuracy up to ${Math.round(ctx.rollingAccuracy * 100)}%! Keep the momentum going.`
  } else if (ctx.sessionsThisWeek === 0) {
    nudge = `No study sessions this week yet. Even 10 minutes makes a difference!`
  }

  // Course order: weakest first (most urgent), then by last activity (stale first)
  const courseOrder = [...ctx.activeCourses]
    .sort((a, b) => {
      // Weakest mastery first
      if (Math.abs(a.masteryScore - b.masteryScore) > 0.1) {
        return a.masteryScore - b.masteryScore
      }
      // Then oldest activity first
      const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0
      const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0
      return aTime - bTime
    })
    .map(c => c.courseId)

  // Celebration: streak milestones or level ups
  let celebrationDue: string | null = null
  if (ctx.currentStreak > 0 && ctx.currentStreak % 7 === 0) {
    celebrationDue = `${ctx.currentStreak}-day streak! Amazing consistency!`
  }

  // Weekly goal (rough: 5 sessions/week = 100%)
  const weeklyGoalTarget = 5
  const weeklyGoalProgress = Math.min(1, ctx.sessionsThisWeek / weeklyGoalTarget)

  return {
    primaryAction,
    nudge,
    courseOrder,
    streakRisk,
    celebrationDue,
    weeklyGoalProgress,
  }
}

// ─── SRS ───

function buildSrsDirectives(ctx: StudentContext): SrsDirectives {
  // Reduce new card limit when overwhelmed
  let adjustedNewCardLimit = 20
  if (ctx.cardsDueToday > 60) adjustedNewCardLimit = 5
  else if (ctx.cardsDueToday > 40) adjustedNewCardLimit = 10
  else if (ctx.rollingAccuracy < 0.5) adjustedNewCardLimit = 10

  // Interleave recommended when student has 2+ subjects
  const interleaveRecommended = ctx.subjects.length >= 2

  return {
    priorityCardIds: [], // populated at query time with weak concept cards
    adjustedNewCardLimit,
    retireSuggestionIds: [], // populated at query time
    interleaveRecommended,
  }
}

// ─── Exams ───

function buildExamDirectives(ctx: StudentContext): ExamDirectives {
  // Weight topics toward weak areas: 60% weak, 40% balanced
  const weakTopicWeights: Record<string, number> = {}
  ctx.activeCourses.forEach(c => {
    weakTopicWeights[c.title] = c.masteryScore < 0.6 ? 1.5 : 0.8
  })

  // Target difficulty based on ability
  const targetDifficulty = Math.round(ctx.estimatedAbility * 4) + 1 // 1-5

  // Focus on question types that correlate with mistakes
  const focusQuestionTypes: string[] = []
  if ((ctx.mistakePatterns.algebraic || 0) > 1) focusQuestionTypes.push('fill_blank')
  if ((ctx.mistakePatterns.conceptual || 0) > 1) focusQuestionTypes.push('short_answer')
  if ((ctx.mistakePatterns.procedural || 0) > 1) focusQuestionTypes.push('matching')

  // Estimated score based on current accuracy
  const estimatedScore = Math.round(ctx.rollingAccuracy * 100)

  return {
    weakTopicWeights,
    targetDifficulty: Math.max(1, Math.min(5, targetDifficulty)),
    focusQuestionTypes,
    estimatedScore,
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/curvalux/NoteSnap && npx jest __tests__/lib/student-directives.test.ts --no-cache`
Expected: PASS

**Step 5: Re-export from index**

Add to `lib/student-context/index.ts`:

```typescript
export { generateDirectives } from './directives'
```

**Step 6: Commit**

```bash
git add lib/student-context/directives.ts __tests__/lib/student-directives.test.ts lib/student-context/index.ts
git commit -m "feat: implement StudentDirectives engine — per-feature intelligence"
```

---

## Phase 2: Wire Intelligence Into Features

### Task 4: Wire context into Practice Mode

**Files:**
- Modify: `lib/practice/session-manager.ts` (createPracticeSession function)
- Modify: `app/api/practice/session/route.ts`

**Step 1: Modify session-manager.ts to accept StudentContext**

In `lib/practice/session-manager.ts`, find the `createPracticeSession` function. Add a parameter for `StudentDirectives` and use it to:

1. **Set target difficulty** from `directives.practice.targetDifficulty` when the user doesn't specify one
2. **Pre-fill `targetConceptIds`** from `directives.practice.recommendedConceptIds` for `mixed` sessions
3. **Set question count** based on `directives.practice.recommendedSessionLength` (roughly 2 questions per minute)
4. **Apply question type weighting** from `directives.practice.questionTypeWeights`

```typescript
// In createPracticeSession, after line ~32:
import { getStudentContext, generateDirectives } from '@/lib/student-context'

// If no target difficulty specified, use intelligence-driven target
if (!request.targetDifficulty) {
  const ctx = await getStudentContext(supabase, userId)
  if (ctx) {
    const directives = generateDirectives(ctx)
    request.targetDifficulty = directives.practice.targetDifficulty as DifficultyLevel

    // For mixed sessions without specific concepts, use recommended weak concepts
    if (request.sessionType === 'mixed' && !request.targetConceptIds?.length) {
      request.targetConceptIds = directives.practice.recommendedConceptIds.slice(0, 5)
    }

    // Auto-set question count from session length if not specified
    if (!request.questionCount) {
      request.questionCount = Math.round(directives.practice.recommendedSessionLength * 2)
    }
  }
}
```

**Step 2: Modify question selection to use weights**

In `selectExistingQuestions`, after the random sort, apply question type weighting:

```typescript
// Replace pure random sort with weighted selection
// After filtering questions by basic criteria, weight by type
if (directives?.practice.questionTypeWeights) {
  const weights = directives.practice.questionTypeWeights
  questions.sort((a, b) => {
    const wA = weights[a.question_type] || 0.1
    const wB = weights[b.question_type] || 0.1
    return (Math.random() * wB) - (Math.random() * wA)
  })
}
```

**Step 3: Run existing practice tests**

Run: `cd /Users/curvalux/NoteSnap && npx jest --testPathPattern="practice" --no-cache`
Expected: All existing tests still PASS

**Step 4: Commit**

```bash
git add lib/practice/session-manager.ts app/api/practice/session/route.ts
git commit -m "feat: wire StudentDirectives into practice mode — personalized difficulty and concept targeting"
```

---

### Task 5: Wire context into Homework Tutor

**Files:**
- Modify: `app/api/homework/sessions/[sessionId]/chat/route.ts`
- Modify: `app/api/chat/route.ts` (practice tutor chat)

**Step 1: Add student intelligence to homework tutor context**

In `app/api/homework/sessions/[sessionId]/chat/route.ts`, after loading the user profile (around line 105-114), also load directives:

```typescript
import { getStudentContext, generateDirectives } from '@/lib/student-context'

// After existing profile load:
const studentCtx = await getStudentContext(supabase, user.id)
const directives = studentCtx ? generateDirectives(studentCtx) : null

// Extend the TutorContext with intelligence:
const context: TutorContext = {
  session: sessionAfterStudentMsg,
  questionAnalysis,
  referenceAnalysis,
  recentMessages: getRecentMessages(sessionAfterStudentMsg, 10),
  hintsUsed: sessionAfterStudentMsg.hints_used || 0,
  currentProgress: calculateProgress(sessionAfterStudentMsg),
  language: userLanguage,
  grade: userGrade,
  studySystem: userStudySystem,
  // NEW: Student intelligence
  studentIntelligence: directives?.homework ? {
    explanationDepth: directives.homework.explanationDepth,
    anticipatedMisconceptions: directives.homework.anticipatedMisconceptions,
    scaffoldingLevel: directives.homework.scaffoldingLevel,
    preferredExplanationStyle: directives.homework.preferredExplanationStyle,
    knownPrerequisiteGaps: directives.homework.knownPrerequisiteGaps,
    studentAbilitySummary: directives.homework.studentAbilitySummary,
  } : undefined,
}
```

**Step 2: Inject intelligence into the AI system prompt**

Find where the system prompt is assembled for the tutor. Add a section:

```typescript
// Add to the system prompt:
const intelligenceSection = context.studentIntelligence
  ? `\n\n## About This Student
${context.studentIntelligence.studentAbilitySummary}

Explanation depth: ${context.studentIntelligence.explanationDepth}
Preferred explanation style: ${context.studentIntelligence.preferredExplanationStyle}
Scaffolding level: ${context.studentIntelligence.scaffoldingLevel}/5 (higher = more support needed)
${context.studentIntelligence.anticipatedMisconceptions.length > 0
  ? `\nCommon mistake patterns for this student:\n${context.studentIntelligence.anticipatedMisconceptions.map(m => `- ${m}`).join('\n')}`
  : ''}
${context.studentIntelligence.knownPrerequisiteGaps.length > 0
  ? `\nKnown weak areas (may need prerequisite review):\n${context.studentIntelligence.knownPrerequisiteGaps.map(g => `- ${g}`).join('\n')}`
  : ''}`
  : ''
```

**Step 3: Apply same pattern to the practice tutor chat route**

Repeat in `app/api/chat/route.ts` — add student intelligence to the course-based tutor.

**Step 4: Test manually**

Verify: Start a homework session, check that the AI system prompt now includes student context.

**Step 5: Commit**

```bash
git add app/api/homework/sessions/*/chat/route.ts app/api/chat/route.ts
git commit -m "feat: wire StudentDirectives into homework tutor — personalized explanations and scaffolding"
```

---

### Task 6: Wire context into Dashboard

**Files:**
- Modify: `app/(main)/dashboard/page.tsx`
- Modify: `app/(main)/dashboard/DashboardContent.tsx` (or equivalent client component)
- Create: `app/api/dashboard/intelligence/route.ts`

**Step 1: Create dashboard intelligence API route**

```typescript
// app/api/dashboard/intelligence/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStudentContext, generateDirectives } from '@/lib/student-context'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ctx = await getStudentContext(supabase, user.id)
  if (!ctx) {
    return NextResponse.json({ error: 'No profile found' }, { status: 404 })
  }

  const directives = generateDirectives(ctx)

  return NextResponse.json({
    primaryAction: directives.dashboard.primaryAction,
    nudge: directives.dashboard.nudge,
    courseOrder: directives.dashboard.courseOrder,
    streakRisk: directives.dashboard.streakRisk,
    celebrationDue: directives.dashboard.celebrationDue,
    weeklyGoalProgress: directives.dashboard.weeklyGoalProgress,
    // Context for display
    cardsDueToday: ctx.cardsDueToday,
    currentStreak: ctx.currentStreak,
    rollingAccuracy: ctx.rollingAccuracy,
    trendDirection: ctx.trendDirection,
    totalStudyTimeThisWeekMinutes: ctx.totalStudyTimeThisWeekMinutes,
    sessionsThisWeek: ctx.sessionsThisWeek,
  })
}
```

**Step 2: Update DashboardContent to fetch and display intelligence**

Add a `useEffect` call to `/api/dashboard/intelligence` and render:
- Primary action as a prominent CTA button
- Nudge as a contextual banner
- Streak risk warning
- Course list reordered by `courseOrder`
- Celebration toast if `celebrationDue` is set
- Weekly goal progress bar

**Step 3: Commit**

```bash
git add app/api/dashboard/intelligence/route.ts app/(main)/dashboard/
git commit -m "feat: wire StudentDirectives into dashboard — intelligent primary actions, nudges, course ordering"
```

---

### Task 7: Wire context into Lesson Generation

**Files:**
- Modify: `app/api/generate-course/route.ts`
- Modify: `lib/ai/prompts.ts` (course generation prompt)

**Step 1: Load directives in course generation**

In `app/api/generate-course/route.ts`, after loading the user profile:

```typescript
import { getStudentContext, generateDirectives } from '@/lib/student-context'

const studentCtx = await getStudentContext(supabase, user.id)
const directives = studentCtx ? generateDirectives(studentCtx) : null

// Pass lesson directives to the AI prompt builder
const lessonConfig = directives?.lessons ? {
  pacing: directives.lessons.pacing,
  skipWorkedExamples: directives.lessons.skipWorkedExamples,
  extraPracticeSteps: directives.lessons.extraPracticeSteps,
  contentFormat: directives.lessons.contentFormat,
} : undefined
```

**Step 2: Modify AI prompt to include pacing directives**

In `lib/ai/prompts.ts`, add a section to the course generation prompt:

```typescript
// Add to system prompt:
const pacingSection = lessonConfig
  ? `\n\nAdapt content to this student's level:
- Pacing: ${lessonConfig.pacing} (${lessonConfig.pacing === 'accelerated' ? 'student is performing well, move faster' : lessonConfig.pacing === 'reinforced' ? 'student is struggling, add more explanation and practice' : 'normal pace'})
- ${lessonConfig.skipWorkedExamples ? 'Skip worked examples — student understands the basics' : 'Include worked examples before practice problems'}
- Add ${lessonConfig.extraPracticeSteps} extra practice problems per lesson
- Content detail: ${lessonConfig.contentFormat}`
  : ''
```

**Step 3: Commit**

```bash
git add app/api/generate-course/route.ts lib/ai/prompts.ts
git commit -m "feat: wire StudentDirectives into lesson generation — adaptive pacing and content depth"
```

---

### Task 8: Wire context into SRS & Exam Generation

**Files:**
- Modify: `lib/srs/card-generator.ts`
- Modify: `app/api/exams/route.ts` (or exam generation route)

**Step 1: Prioritize SRS cards from weak concepts**

In the SRS review queue logic, sort due cards so weak-concept cards come first:

```typescript
import { getStudentContext, generateDirectives } from '@/lib/student-context'

// When building the daily review queue:
const studentCtx = await getStudentContext(supabase, userId)
const directives = studentCtx ? generateDirectives(studentCtx) : null

// Sort due cards: weak concept cards first
if (directives && studentCtx.weakConceptIds.length > 0) {
  dueCards.sort((a, b) => {
    const aWeak = a.concept_ids?.some((id: string) => studentCtx.weakConceptIds.includes(id)) ? 0 : 1
    const bWeak = b.concept_ids?.some((id: string) => studentCtx.weakConceptIds.includes(id)) ? 0 : 1
    return aWeak - bWeak
  })
}

// Apply adjusted new card limit
const maxNewCards = directives?.srs.adjustedNewCardLimit ?? 20
```

**Step 2: Add weak topic weighting to exam generation**

In the exam API route, modify the AI prompt to weight topics:

```typescript
const studentCtx = await getStudentContext(supabase, user.id)
const directives = studentCtx ? generateDirectives(studentCtx) : null

// Add to exam generation prompt:
const topicWeightingPrompt = directives?.exams.weakTopicWeights
  ? `\n\nIMPORTANT: Weight question topics based on student weakness:
${Object.entries(directives.exams.weakTopicWeights)
  .map(([topic, weight]) => `- ${topic}: ${weight > 1 ? 'MORE questions (weak area)' : 'fewer questions (strong area)'}`)
  .join('\n')}
Target difficulty: ${directives.exams.targetDifficulty}/5
Focus on these question types: ${directives.exams.focusQuestionTypes.join(', ') || 'balanced mix'}`
  : ''
```

**Step 3: Commit**

```bash
git add lib/srs/ app/api/exams/
git commit -m "feat: wire StudentDirectives into SRS and exam generation — weak concept prioritization"
```

---

## Phase 3: New Implicit Data Collection

### Task 9: Database migration for new implicit signals

**Files:**
- Create: `supabase/migrations/20260302000001_implicit_data_collection.sql`

**Step 1: Write the migration**

```sql
-- Migration: Add implicit behavioral data collection fields
-- These enable fatigue tracking, answer revision detection,
-- explanation engagement measurement, and feature affinity tracking.

-- 1. Extend study_sessions with fatigue tracking
ALTER TABLE study_sessions
  ADD COLUMN IF NOT EXISTS accuracy_at_session_start DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS accuracy_at_session_end DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS accuracy_per_5min JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS fatigue_detected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fatigue_detected_at_minute INT;

-- 2. Extend practice answer tracking with revision behavior
ALTER TABLE practice_session_questions
  ADD COLUMN IF NOT EXISTS time_to_first_action_ms INT,
  ADD COLUMN IF NOT EXISTS answer_revision_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_answer TEXT,
  ADD COLUMN IF NOT EXISTS revision_helped BOOLEAN;

-- 3. Create explanation engagement tracking table
CREATE TABLE IF NOT EXISTS explanation_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('practice', 'homework', 'exam', 'lesson')),
  source_id UUID,
  question_id UUID,
  explanation_shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_spent_reading_ms INT,
  scroll_depth_percent INT CHECK (scroll_depth_percent BETWEEN 0 AND 100),
  did_expand_details BOOLEAN DEFAULT false,
  next_similar_question_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE explanation_engagement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own explanation engagement"
  ON explanation_engagement FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_explanation_engagement_user
  ON explanation_engagement(user_id, created_at DESC);

-- 4. Create feature affinity tracking table
CREATE TABLE IF NOT EXISTS feature_affinity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  visit_count INT DEFAULT 0,
  total_time_ms BIGINT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  voluntary_usage_count INT DEFAULT 0,
  nudged_usage_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

ALTER TABLE feature_affinity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own feature affinity"
  ON feature_affinity FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_feature_affinity_user
  ON feature_affinity(user_id);

-- 5. Extend homework_sessions with timing signals
ALTER TABLE homework_sessions
  ADD COLUMN IF NOT EXISTS time_to_first_student_msg_ms INT,
  ADD COLUMN IF NOT EXISTS student_message_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_student_response_time_ms INT;

-- 6. Add hint effectiveness tracking
ALTER TABLE homework_sessions
  ADD COLUMN IF NOT EXISTS hint_effectiveness JSONB DEFAULT '[]';
  -- Format: [{hintLevel: 1, solvedAfter: true, timeToSolveMs: 12000}, ...]

-- 7. Track recommendation acceptance
CREATE TABLE IF NOT EXISTS recommendation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  recommendation_data JSONB NOT NULL,
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acted_on BOOLEAN DEFAULT false,
  acted_on_at TIMESTAMPTZ,
  time_to_action_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recommendation_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own recommendation tracking"
  ON recommendation_tracking FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_recommendation_tracking_user
  ON recommendation_tracking(user_id, shown_at DESC);
```

**Step 2: Apply migration**

Run: `cd /Users/curvalux/NoteSnap && npx supabase db push` (or apply via Supabase dashboard)

**Step 3: Commit**

```bash
git add supabase/migrations/20260302000001_implicit_data_collection.sql
git commit -m "feat: database migration for implicit behavioral data collection"
```

---

### Task 10: Session fatigue detection

**Files:**
- Create: `lib/student-context/fatigue-detector.ts`
- Modify: `app/api/study-sessions/route.ts`

**Step 1: Write the fatigue detector**

```typescript
// lib/student-context/fatigue-detector.ts

export interface FatigueSignal {
  fatigueDetected: boolean
  fatigueDetectedAtMinute: number | null
  accuracyDrop: number // percentage points dropped
  recommendation: 'continue' | 'take_break' | 'stop_session'
}

/**
 * Detect fatigue by analyzing accuracy over time within a session.
 * Uses a sliding window of 5-minute intervals.
 * Fatigue = accuracy drops 15%+ from session start.
 */
export function detectSessionFatigue(
  accuracyPerInterval: { minuteMark: number; accuracy: number }[]
): FatigueSignal {
  if (accuracyPerInterval.length < 2) {
    return { fatigueDetected: false, fatigueDetectedAtMinute: null, accuracyDrop: 0, recommendation: 'continue' }
  }

  const startAccuracy = accuracyPerInterval[0].accuracy
  let fatiguePoint: typeof accuracyPerInterval[0] | null = null

  for (const interval of accuracyPerInterval) {
    const drop = startAccuracy - interval.accuracy
    if (drop >= 0.15) {
      fatiguePoint = interval
      break
    }
  }

  if (!fatiguePoint) {
    return { fatigueDetected: false, fatigueDetectedAtMinute: null, accuracyDrop: 0, recommendation: 'continue' }
  }

  const drop = startAccuracy - fatiguePoint.accuracy
  return {
    fatigueDetected: true,
    fatigueDetectedAtMinute: fatiguePoint.minuteMark,
    accuracyDrop: Math.round(drop * 100),
    recommendation: drop >= 0.25 ? 'stop_session' : 'take_break',
  }
}
```

**Step 2: Wire into study session PATCH endpoint**

In `app/api/study-sessions/route.ts`, when ending a session, compute fatigue and store it:

```typescript
import { detectSessionFatigue } from '@/lib/student-context/fatigue-detector'

// In the PATCH handler, before updating the session:
// Compute accuracy per 5-minute window from step_performance data
const { data: stepPerf } = await supabase
  .from('step_performance')
  .select('was_correct, created_at')
  .eq('user_id', user.id)
  .gte('created_at', session.started_at)
  .order('created_at', { ascending: true })

if (stepPerf && stepPerf.length > 5) {
  const intervals = computeAccuracyIntervals(stepPerf, session.started_at)
  const fatigue = detectSessionFatigue(intervals)

  // Store fatigue data
  updateData.accuracy_at_session_start = intervals[0]?.accuracy ?? null
  updateData.accuracy_at_session_end = intervals[intervals.length - 1]?.accuracy ?? null
  updateData.accuracy_per_5min = intervals
  updateData.fatigue_detected = fatigue.fatigueDetected
  updateData.fatigue_detected_at_minute = fatigue.fatigueDetectedAtMinute
}
```

**Step 3: Commit**

```bash
git add lib/student-context/fatigue-detector.ts app/api/study-sessions/route.ts
git commit -m "feat: session fatigue detection — accuracy degradation tracking within sessions"
```

---

### Task 11: Answer revision and time-to-first-action tracking

**Files:**
- Modify: `lib/practice/session-manager.ts` (recordAnswer function)
- Modify: `app/api/practice/session/[sessionId]/answer/route.ts`

**Step 1: Add fields to answer recording**

In the answer submission route, capture:
- `time_to_first_action_ms`: difference between question shown time and first interaction
- `answer_revision_count`: if this is a re-submission, increment
- `original_answer`: store the first answer before revision
- `revision_helped`: did changing the answer make it correct?

```typescript
// In the answer route POST handler, before recording:
const questionShownAt = sessionQuestion.started_at
const firstActionMs = questionShownAt
  ? Date.now() - new Date(questionShownAt).getTime()
  : null

// Check if this is a revision
const isRevision = sessionQuestion.user_answer !== null
const originalAnswer = isRevision ? sessionQuestion.user_answer : userAnswer
const revisionCount = (sessionQuestion.answer_revision_count || 0) + (isRevision ? 1 : 0)
const revisionHelped = isRevision ? (isCorrect && !sessionQuestion.is_correct) : null

// Include in the update:
{
  time_to_first_action_ms: firstActionMs,
  answer_revision_count: revisionCount,
  original_answer: isRevision ? sessionQuestion.original_answer || originalAnswer : null,
  revision_helped: revisionHelped,
}
```

**Step 2: Commit**

```bash
git add lib/practice/session-manager.ts app/api/practice/session/*/answer/route.ts
git commit -m "feat: track answer revisions and time-to-first-action for learning intelligence"
```

---

### Task 12: Explanation engagement tracking

**Files:**
- Create: `lib/student-context/explanation-tracker.ts`
- Create: `app/api/tracking/explanation-engagement/route.ts`

**Step 1: Create the API route**

```typescript
// app/api/tracking/explanation-engagement/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    sourceType,       // 'practice' | 'homework' | 'exam' | 'lesson'
    sourceId,         // session/exam ID
    questionId,       // question UUID
    timeSpentReadingMs,
    scrollDepthPercent,
    didExpandDetails,
  } = body

  const { error } = await supabase.from('explanation_engagement').insert({
    user_id: user.id,
    source_type: sourceType,
    source_id: sourceId,
    question_id: questionId,
    time_spent_reading_ms: timeSpentReadingMs,
    scroll_depth_percent: scrollDepthPercent,
    did_expand_details: didExpandDetails,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Step 2: Create client-side tracking hook**

```typescript
// lib/student-context/explanation-tracker.ts
'use client'

import { useCallback, useRef } from 'react'

export function useExplanationTracker(sourceType: string, sourceId?: string) {
  const startTime = useRef<number | null>(null)
  const maxScroll = useRef(0)
  const expanded = useRef(false)

  const startTracking = useCallback(() => {
    startTime.current = Date.now()
    maxScroll.current = 0
    expanded.current = false
  }, [])

  const onScroll = useCallback((scrollPercent: number) => {
    maxScroll.current = Math.max(maxScroll.current, scrollPercent)
  }, [])

  const onExpand = useCallback(() => {
    expanded.current = true
  }, [])

  const stopTracking = useCallback(async (questionId?: string) => {
    if (!startTime.current) return

    const timeSpent = Date.now() - startTime.current
    startTime.current = null

    // Only track if they spent at least 1 second
    if (timeSpent < 1000) return

    try {
      await fetch('/api/tracking/explanation-engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          sourceId,
          questionId,
          timeSpentReadingMs: timeSpent,
          scrollDepthPercent: Math.round(maxScroll.current),
          didExpandDetails: expanded.current,
        }),
      })
    } catch {
      // Silent fail — tracking should never break the app
    }
  }, [sourceType, sourceId])

  return { startTracking, stopTracking, onScroll, onExpand }
}
```

**Step 3: Commit**

```bash
git add app/api/tracking/explanation-engagement/route.ts lib/student-context/explanation-tracker.ts
git commit -m "feat: explanation engagement tracking — measure if explanations actually help"
```

---

### Task 13: Feature affinity tracking

**Files:**
- Create: `app/api/tracking/feature-affinity/route.ts`
- Create: `lib/student-context/feature-tracker.ts`

**Step 1: Create feature affinity API route**

```typescript
// app/api/tracking/feature-affinity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { featureName, timeSpentMs, isVoluntary } = await request.json()

  // Upsert: increment visit count and total time
  const { error } = await supabase.rpc('upsert_feature_affinity', {
    p_user_id: user.id,
    p_feature_name: featureName,
    p_time_spent_ms: timeSpentMs || 0,
    p_is_voluntary: isVoluntary !== false, // default true
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**Step 2: Create the database function**

Add to migration `20260302000001_implicit_data_collection.sql`:

```sql
-- RPC for atomic feature affinity upsert
CREATE OR REPLACE FUNCTION upsert_feature_affinity(
  p_user_id UUID,
  p_feature_name TEXT,
  p_time_spent_ms BIGINT,
  p_is_voluntary BOOLEAN
) RETURNS VOID AS $$
BEGIN
  INSERT INTO feature_affinity (user_id, feature_name, visit_count, total_time_ms, last_used_at, voluntary_usage_count, nudged_usage_count)
  VALUES (p_user_id, p_feature_name, 1, p_time_spent_ms, NOW(),
    CASE WHEN p_is_voluntary THEN 1 ELSE 0 END,
    CASE WHEN p_is_voluntary THEN 0 ELSE 1 END)
  ON CONFLICT (user_id, feature_name) DO UPDATE SET
    visit_count = feature_affinity.visit_count + 1,
    total_time_ms = feature_affinity.total_time_ms + p_time_spent_ms,
    last_used_at = NOW(),
    voluntary_usage_count = feature_affinity.voluntary_usage_count + CASE WHEN p_is_voluntary THEN 1 ELSE 0 END,
    nudged_usage_count = feature_affinity.nudged_usage_count + CASE WHEN p_is_voluntary THEN 0 ELSE 1 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Step 3: Create client-side tracking hook**

```typescript
// lib/student-context/feature-tracker.ts
'use client'

import { useEffect, useRef, useCallback } from 'react'

export function useFeatureTracker(featureName: string) {
  const enterTime = useRef<number>(Date.now())

  useEffect(() => {
    enterTime.current = Date.now()
    return () => {
      const timeSpent = Date.now() - enterTime.current
      if (timeSpent > 2000) { // Only track if > 2 seconds
        navigator.sendBeacon('/api/tracking/feature-affinity', JSON.stringify({
          featureName,
          timeSpentMs: timeSpent,
          isVoluntary: true,
        }))
      }
    }
  }, [featureName])
}
```

**Step 4: Commit**

```bash
git add app/api/tracking/feature-affinity/route.ts lib/student-context/feature-tracker.ts supabase/migrations/
git commit -m "feat: feature affinity tracking — understand which features students actually use"
```

---

### Task 14: Recommendation acceptance tracking

**Files:**
- Modify: `app/api/recommendations/route.ts`
- Create: `app/api/tracking/recommendation/route.ts`

**Step 1: Tag recommendations with IDs when served**

In the recommendations GET route, assign each recommendation a UUID and log it:

```typescript
import { randomUUID } from 'crypto'

// When building recommendations:
const recommendationId = randomUUID()

// Store in recommendation_tracking
await supabase.from('recommendation_tracking').insert({
  user_id: user.id,
  recommendation_type: recommendation.type, // e.g. 'practice_weak', 'review_cards'
  recommendation_data: recommendation,
  shown_at: new Date().toISOString(),
})

// Include ID in response so client can report acceptance
response.recommendationId = recommendationId
```

**Step 2: Create acceptance tracking endpoint**

```typescript
// app/api/tracking/recommendation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recommendationId } = await request.json()

  await supabase
    .from('recommendation_tracking')
    .update({
      acted_on: true,
      acted_on_at: new Date().toISOString(),
    })
    .eq('id', recommendationId)
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
```

**Step 3: Commit**

```bash
git add app/api/recommendations/route.ts app/api/tracking/recommendation/route.ts
git commit -m "feat: track recommendation acceptance — learn what advice students follow"
```

---

## Phase 4: Integration & Enrichment

### Task 15: Feed new implicit data back into StudentContext

**Files:**
- Modify: `lib/student-context/index.ts`
- Modify: `lib/student-context/types.ts`

**Step 1: Extend StudentContext types**

Add to `types.ts`:

```typescript
// Add to StudentContext interface:

  // Fatigue Signals (from study_sessions)
  avgFatigueOnsetMinute: number | null    // when fatigue typically kicks in
  lastSessionFatigued: boolean

  // Explanation Engagement (from explanation_engagement)
  avgExplanationReadTimeMs: number
  explanationEffectiveness: number        // 0-1, correlates reading → next question correct

  // Feature Affinity (from feature_affinity)
  preferredFeatures: string[]             // top 3 most-used features
  underusedFeatures: string[]             // features that could help but aren't used

  // Answer Behavior (from practice_session_questions)
  revisionRate: number                    // % of answers revised
  revisionHelpsRate: number               // % of revisions that improved the answer
  avgTimeToFirstActionMs: number          // thinking time before answering
```

**Step 2: Add queries for new data**

In `getStudentContext()`, add parallel queries for:
- `study_sessions` with `fatigue_detected` field
- `explanation_engagement` aggregation
- `feature_affinity` top features
- `practice_session_questions` revision stats

**Step 3: Update directives to use new signals**

In `directives.ts`:
- Use `avgFatigueOnsetMinute` to cap `recommendedSessionLength`
- Use `explanationEffectiveness` to adjust `explanationDepth` (if explanations aren't helping, try shorter ones or different style)
- Use `preferredFeatures` to customize dashboard layout
- Use `revisionRate` + `revisionHelpsRate` to adjust scaffolding (high revision + low help rate = confidence problem, add more scaffolding)

**Step 4: Commit**

```bash
git add lib/student-context/
git commit -m "feat: feed implicit behavioral signals back into intelligence engine"
```

---

### Task 16: Integration hooks — add tracking to UI components

**Files:**
- Modify: Practice question answer component (add explanation tracker)
- Modify: Main layout or page components (add feature tracker)
- Modify: Dashboard component (add recommendation tracking)

**Step 1: Add `useExplanationTracker` to practice answer feedback**

In the component that shows answer feedback/explanations after a practice question:

```typescript
import { useExplanationTracker } from '@/lib/student-context/explanation-tracker'

const { startTracking, stopTracking, onScroll, onExpand } = useExplanationTracker('practice', sessionId)

// When explanation appears:
useEffect(() => {
  if (showExplanation) startTracking()
  return () => { if (showExplanation) stopTracking(questionId) }
}, [showExplanation])
```

**Step 2: Add `useFeatureTracker` to main feature pages**

In each major feature page component:

```typescript
import { useFeatureTracker } from '@/lib/student-context/feature-tracker'

// In the component:
useFeatureTracker('practice')  // or 'homework', 'lessons', 'review', 'exams', 'cheatsheets'
```

**Step 3: Add recommendation click tracking to dashboard**

When user clicks a recommended action on the dashboard:

```typescript
const handleRecommendationClick = async (recommendationId: string) => {
  await fetch('/api/tracking/recommendation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recommendationId }),
  })
  // Navigate to recommended action
  router.push(targetUrl)
}
```

**Step 4: Commit**

```bash
git add app/ components/
git commit -m "feat: integrate tracking hooks into UI components — explanations, features, recommendations"
```

---

## Phase 5: Final Verification

### Task 17: End-to-end verification

**Step 1: Run all tests**

Run: `cd /Users/curvalux/NoteSnap && npx jest --no-cache`
Expected: All tests PASS

**Step 2: Build check**

Run: `cd /Users/curvalux/NoteSnap && npm run build`
Expected: Build succeeds with no type errors

**Step 3: Manual verification checklist**

1. [ ] Create a test user, go through onboarding
2. [ ] Complete a few practice sessions — verify difficulty adapts
3. [ ] Start a homework session — verify AI prompt includes student context
4. [ ] Check dashboard — verify it shows personalized primary action, not just recent courses
5. [ ] Review SRS cards — verify weak concept cards appear first
6. [ ] Generate an exam — verify questions weight toward weak topics
7. [ ] Check explanation engagement — verify reading time is tracked
8. [ ] Check feature affinity — verify page visits are logged
9. [ ] Verify all of the above in Hebrew (RTL) mode

**Step 4: Deploy**

Run: `cd /Users/curvalux/NoteSnap && vercel --prod` (or deploy via Vercel dashboard)

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Learning Intelligence Engine — complete integration and verification"
```

---

## Summary

| Phase | Tasks | What it achieves |
|-------|-------|-----------------|
| **1: Foundation** | Tasks 1-3 | StudentContext + Directives engine — the brain |
| **2: Feature Wiring** | Tasks 4-8 | Every feature becomes personalized |
| **3: New Data** | Tasks 9-14 | Fatigue, revisions, explanations, affinity, recommendations |
| **4: Feedback Loop** | Tasks 15-16 | New data feeds back into intelligence |
| **5: Verification** | Task 17 | Everything works end-to-end |

**Total: 17 tasks, ~40-60 atomic steps**

The engine makes NoteSnap feel like a private tutor who:
- Knows what you're weak at and practices those areas
- Adjusts explanation depth based on your ability
- Detects when you're tired and suggests breaks
- Tells you exactly what to study next and why
- Learns from whether its advice works and adapts
- Gets smarter the more you use it
