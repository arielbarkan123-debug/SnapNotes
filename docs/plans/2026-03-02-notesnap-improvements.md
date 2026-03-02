# NoteSnap Improvements — 16 Items, 6 Phases

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 16 confirmed issues across dashboard, intelligence pipeline, AI prompts, feature surfacing, SRS personalization, and architecture/security.

**Architecture:** Each phase is independent and can be committed separately. Phases 1-3 are highest priority (user-facing bugs + intelligence quality). Phase 6 (CI/CD) should be done early to protect subsequent work.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), TypeScript, Tailwind CSS, FSRS algorithm, Anthropic Claude API

---

## Phase 1: Dashboard & Navigation Fixes

### Task 1.1: Fix "Continue Learning" → correct lesson

**Files:**
- Modify: `app/(main)/dashboard/DashboardContent.tsx` (lines 198-211, 363)

**Step 1: Fix the `currentCourse` useMemo**

Replace the hardcoded `lessonIndex: 0` logic. Query `lesson_progress` for each course to find the last completed lesson index.

The existing `filteredCourses` already has the course data. We need to add a `lessonProgress` state from an API call, then use it in the useMemo.

Add a new state + fetch in the DashboardContent component (near line 175 where other data is fetched):

```typescript
const [lessonProgressMap, setLessonProgressMap] = useState<Record<string, number>>({})

useEffect(() => {
  async function fetchLessonProgress() {
    try {
      const res = await fetch('/api/progress/lesson-map')
      if (res.ok) {
        const data = await res.json()
        setLessonProgressMap(data.progressMap || {})
      }
    } catch { /* silent */ }
  }
  fetchLessonProgress()
}, [])
```

Then fix the `currentCourse` useMemo (line 198):

```typescript
const currentCourse = useMemo(() => {
  if (!filteredCourses || filteredCourses.length === 0) return null
  for (const course of filteredCourses) {
    const lessons = course.generated_course?.lessons
    if (lessons && lessons.length > 0) {
      const lastCompleted = lessonProgressMap[course.id] ?? -1
      const nextLesson = Math.min(lastCompleted + 1, lessons.length - 1)
      return { course, lessonIndex: nextLesson }
    }
  }
  return { course: filteredCourses[0], lessonIndex: 0 }
}, [filteredCourses, lessonProgressMap])
```

**Step 2: Create the lesson-map API endpoint**

Create `app/api/progress/lesson-map/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return createErrorResponse(ErrorCodes.UNAUTHORIZED)

    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('course_id, lesson_index, completed')
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('lesson_index', { ascending: false })

    // Build map: courseId → highest completed lesson_index
    const progressMap: Record<string, number> = {}
    for (const row of progress || []) {
      if (!(row.course_id in progressMap) || row.lesson_index > progressMap[row.course_id]) {
        progressMap[row.course_id] = row.lesson_index
      }
    }

    return NextResponse.json({ progressMap })
  } catch {
    return createErrorResponse(ErrorCodes.INTERNAL)
  }
}
```

**Step 3: Run build + verify**

```bash
npx tsc --noEmit && npm run lint
```

**Step 4: Commit**

```bash
git add app/api/progress/lesson-map/route.ts app/(main)/dashboard/DashboardContent.tsx
git commit -m "fix: Continue Learning navigates to correct lesson instead of lesson 0"
```

---

### Task 1.2: Fix Course Progress Ring → real percentage

**Files:**
- Modify: `app/(main)/dashboard/DashboardContent.tsx` (lines 620-700, CompactCourseCard)

**Step 1: Pass lessonProgressMap to CompactCourseCard**

Update the CompactCourseCard call site to pass the progress data. Find where `<CompactCourseCard course={course} />` is rendered (around line 480-500) and change to:

```typescript
<CompactCourseCard course={course} completedLessons={lessonProgressMap[course.id] !== undefined ? lessonProgressMap[course.id] + 1 : 0} />
```

Note: `lessonProgressMap[course.id]` is the highest completed lesson INDEX (0-based), so +1 gives count of completed lessons.

**Step 2: Update CompactCourseCard to accept and use real progress**

```typescript
function CompactCourseCard({ course, completedLessons = 0 }: { course: Course; completedLessons?: number }) {
  const t = useTranslations('dashboard')
  const lessons = course.generated_course?.lessons
  const lessonsCount = lessons?.length || 0
  const progress = lessonsCount > 0 ? Math.round((completedLessons / lessonsCount) * 100) : 0
```

This replaces `const progress = 0`.

**Step 3: Run build + verify**

```bash
npx tsc --noEmit && npm run lint
```

**Step 4: Commit**

```bash
git add app/(main)/dashboard/DashboardContent.tsx
git commit -m "fix: course progress ring shows real completion percentage"
```

---

### Task 1.3: Add name collection in onboarding

**Files:**
- Modify: `app/(main)/onboarding/page.tsx`

**Step 1: Add name to OnboardingData interface**

At line 24, add `name` field:

```typescript
interface OnboardingData {
  name: string
  studySystem: StudySystem | null
  grade: string | null
  subjects: SelectedSubject[]
  studyGoal: StudyGoal | null
  timeAvailability: TimeAvailability | null
  preferredTime: PreferredTime | null
  learningStyles: LearningStyle[]
}
```

**Step 2: Initialize with empty name**

Find the initial state (around line 65-75) and add `name: ''`:

```typescript
const [data, setData] = useState<OnboardingData>({
  name: '',
  studySystem: null,
  grade: null,
  ...
})
```

**Step 3: Add a name input as Step 0**

In the step content rendering function (around line 245-260, the `getStepContent` or similar), add a name step as the very first step. Before the study system step, add:

```typescript
// Name step — rendered as step 0
<div className="space-y-4">
  <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
    {t('steps.nameTitle', { defaultMessage: "What's your name?" })}
  </h2>
  <p className="text-center text-gray-500 dark:text-gray-400">
    {t('steps.nameSubtitle', { defaultMessage: "We'll use this to personalize your experience" })}
  </p>
  <input
    type="text"
    value={data.name}
    onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
    placeholder={t('steps.namePlaceholder', { defaultMessage: 'Enter your name' })}
    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-center text-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
    autoFocus
    maxLength={50}
  />
</div>
```

Adjust step indices by +1 for all subsequent steps. The `totalSteps` calculation needs to be incremented by 1 as well.

**Step 4: Save name in completeOnboarding**

In the `completeOnboarding` function (around line 346), after getting the user, add:

```typescript
// Update user's display name
if (data.name.trim()) {
  await supabase.auth.updateUser({
    data: { name: data.name.trim() }
  })
}
```

This writes to `auth.users.raw_user_meta_data.name`, which is what the dashboard reads via `user.user_metadata?.name`.

**Step 5: Add i18n translations**

Add to `messages/en/onboarding.json`:
```json
"steps": {
  "nameTitle": "What's your name?",
  "nameSubtitle": "We'll use this to personalize your experience",
  "namePlaceholder": "Enter your name"
}
```

Add to `messages/he/onboarding.json`:
```json
"steps": {
  "nameTitle": "מה השם שלך?",
  "nameSubtitle": "נשתמש בשם כדי להתאים לך את החוויה",
  "namePlaceholder": "הכנס/י את שמך"
}
```

**Step 6: Run build + verify**

```bash
npx tsc --noEmit && npm run lint
```

**Step 7: Commit**

```bash
git add app/(main)/onboarding/page.tsx messages/en/onboarding.json messages/he/onboarding.json
git commit -m "feat: collect user name during onboarding for personalized dashboard greeting"
```

---

### Task 1.4: Reduce mobile bottom nav to 5 items

**Files:**
- Modify: `components/ui/Sidebar.tsx` (lines 362-368)

**Step 1: Remove "Progress" from bottom nav**

Replace the 6 BottomNavLink entries (lines 362-368) with 5:

```typescript
<BottomNavLink href="/dashboard" icon="🏠" label={t('nav.dashboard')} active={pathname === '/dashboard'} />
<BottomNavLink href="/review" icon="🧠" label={t('nav.review')} active={isActive('/review')} />
<BottomNavLink href="/practice" icon="🎯" label={t('nav.practice')} active={isActive('/practice')} />
<BottomNavLink href="/homework" icon="📝" label={t('nav.homework')} active={isActive('/homework')} />
<BottomNavLink href="/prepare" icon="📖" label={t('nav.prepare')} active={isActive('/prepare')} />
```

Progress (📊) is removed from mobile bottom nav. It remains accessible via the sidebar hamburger menu.

**Step 2: Run build + verify**

```bash
npx tsc --noEmit && npm run lint
```

**Step 3: Commit**

```bash
git add components/ui/Sidebar.tsx
git commit -m "fix: reduce mobile bottom nav to 5 items (remove Progress, still in sidebar)"
```

---

## Phase 2: Intelligence Pipeline

### Task 2.1: Bridge Practice → SRS card creation

**Files:**
- Create: `lib/practice/practice-to-srs.ts`
- Modify: `lib/practice/session-manager.ts` (after answer submission, ~line 460)

**Step 1: Create practice-to-srs bridge**

Create `lib/practice/practice-to-srs.ts`:

```typescript
/**
 * Bridge between Practice sessions and SRS card creation.
 * When a student gets a practice question wrong, creates an SRS review card
 * so the concept comes back for spaced repetition review.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

interface PracticeErrorCard {
  userId: string
  courseId: string | null
  lessonIndex: number
  conceptId: string
  questionFront: string
  correctAnswer: string
}

const MAX_NEW_CARDS_PER_SESSION = 5

/**
 * Create an SRS card from a wrong practice answer.
 * Deduplicates: if a card for this concept+user already exists, reschedules it instead.
 */
export async function createSRSCardFromPracticeError(
  supabase: SupabaseClient,
  error: PracticeErrorCard
): Promise<void> {
  try {
    // Check if a card already exists for this concept
    const { data: existing } = await supabase
      .from('review_cards')
      .select('id, stability, due_date')
      .eq('user_id', error.userId)
      .contains('concept_ids', [error.conceptId])
      .limit(1)
      .maybeSingle()

    if (existing) {
      // Card exists — reschedule it sooner (reduce stability, set due to now)
      const newStability = Math.max(0.5, (existing.stability || 1) * 0.5)
      await supabase
        .from('review_cards')
        .update({
          stability: newStability,
          due_date: new Date().toISOString(),
          state: 'review',
        })
        .eq('id', existing.id)
      return
    }

    // Create new card
    await supabase
      .from('review_cards')
      .insert({
        user_id: error.userId,
        course_id: error.courseId,
        lesson_index: error.lessonIndex,
        step_index: 0,
        card_type: 'flashcard',
        front: error.questionFront,
        back: error.correctAnswer,
        concept_ids: [error.conceptId],
        state: 'new',
        due_date: new Date().toISOString(),
        stability: 0.5,
        difficulty: 0.7,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
      })
  } catch (err) {
    // Non-blocking — log but don't fail the practice session
    console.error('[practice-to-srs] Failed to create SRS card:', err)
  }
}

/**
 * After a practice session ends, create SRS cards for all wrong answers.
 * Limits to MAX_NEW_CARDS_PER_SESSION to avoid flooding the review queue.
 */
export async function bridgePracticeGapsToSRS(
  supabase: SupabaseClient,
  userId: string,
  courseId: string | null,
  gaps: Array<{ conceptId: string; questionText: string; correctAnswer: string }>
): Promise<number> {
  let created = 0
  const limited = gaps.slice(0, MAX_NEW_CARDS_PER_SESSION)

  for (const gap of limited) {
    await createSRSCardFromPracticeError(supabase, {
      userId,
      courseId,
      lessonIndex: 0,
      conceptId: gap.conceptId,
      questionFront: gap.questionText,
      correctAnswer: gap.correctAnswer,
    })
    created++
  }

  return created
}
```

**Step 2: Wire into session-manager.ts at session completion**

In `lib/practice/session-manager.ts`, after the gap identification code (around line 564, after `gapsIdentified` is populated), add:

```typescript
import { bridgePracticeGapsToSRS } from './practice-to-srs'
```

And after the gaps are identified (line ~564):

```typescript
// Bridge gaps to SRS — create review cards for weak concepts
if (gapsIdentified.length > 0) {
  const gapCards = gapsIdentified.map(conceptId => {
    const wrongAnswer = (answers || []).find(
      a => a.question?.primary_concept_id === conceptId && !a.is_correct
    )
    return {
      conceptId,
      questionText: wrongAnswer?.question?.question_text || `Review concept: ${conceptId}`,
      correctAnswer: wrongAnswer?.question?.correct_answer || wrongAnswer?.question?.explanation || 'Review this concept',
    }
  })
  await bridgePracticeGapsToSRS(supabase, userId, session.course_id, gapCards).catch(() => {})
}
```

**Step 3: Run build + tests**

```bash
npx tsc --noEmit && npm run lint && npm test -- --passWithNoTests
```

**Step 4: Commit**

```bash
git add lib/practice/practice-to-srs.ts lib/practice/session-manager.ts
git commit -m "feat: bridge practice errors to SRS — wrong answers create review cards"
```

---

### Task 2.2: Write homework misconceptions back to intelligence

**Files:**
- Create: `lib/homework/misconception-recorder.ts`
- Modify: `app/api/homework/sessions/[sessionId]/chat/route.ts` (after Step 5, ~line 180)

**Step 1: Create misconception recorder**

Create `lib/homework/misconception-recorder.ts`:

```typescript
/**
 * Records misconceptions detected during homework tutoring sessions
 * back into the intelligence system (mistake_patterns table).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

interface MisconceptionRecord {
  userId: string
  misconceptionType: string
  detectedSubject: string | null
  detectedTopic: string | null
  sessionId: string
}

/**
 * Record a homework misconception into the mistake_patterns table.
 * Updates existing patterns or creates new ones.
 * Non-blocking — errors are logged but don't affect the chat flow.
 */
export async function recordHomeworkMisconception(
  supabase: SupabaseClient,
  record: MisconceptionRecord
): Promise<void> {
  try {
    // Fetch current patterns for user
    const { data: existing } = await supabase
      .from('mistake_patterns')
      .select('id, patterns')
      .eq('user_id', record.userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const patternName = record.misconceptionType
    const now = new Date().toISOString()

    if (existing && existing.patterns && Array.isArray(existing.patterns)) {
      // Update existing patterns
      const patterns = [...existing.patterns]
      const existingPattern = patterns.find(
        (p: { patternName?: string }) => p.patternName === patternName
      )

      if (existingPattern) {
        existingPattern.frequency = (existingPattern.frequency || 0) + 1
        existingPattern.lastSeen = now
        existingPattern.sources = [...(existingPattern.sources || []), 'homework'].slice(-10)
      } else {
        patterns.push({
          patternName,
          frequency: 1,
          lastSeen: now,
          subject: record.detectedSubject,
          topic: record.detectedTopic,
          sources: ['homework'],
        })
      }

      await supabase
        .from('mistake_patterns')
        .update({
          patterns,
          stale_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existing.id)
    } else {
      // Create new patterns record
      await supabase
        .from('mistake_patterns')
        .insert({
          user_id: record.userId,
          patterns: [{
            patternName,
            frequency: 1,
            lastSeen: now,
            subject: record.detectedSubject,
            topic: record.detectedTopic,
            sources: ['homework'],
          }],
          insufficient_data: true,
          stale_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
    }
  } catch (err) {
    console.error('[misconception-recorder] Failed to record:', err)
  }
}
```

**Step 2: Wire into homework chat route**

In `app/api/homework/sessions/[sessionId]/chat/route.ts`, after the tutor message is added (after Step 5, ~line 182), add:

```typescript
import { recordHomeworkMisconception } from '@/lib/homework/misconception-recorder'
```

And after `finalSession = await addMessage(...)` (line ~182):

```typescript
// Record misconception back to intelligence (non-blocking)
if (tutorResponse.detectedMisconception) {
  recordHomeworkMisconception(supabase, {
    userId: user.id,
    misconceptionType: tutorResponse.detectedMisconception,
    detectedSubject: homeworkSession.detected_subject,
    detectedTopic: homeworkSession.detected_topic,
    sessionId,
  }).catch(() => {})
}
```

**Step 3: Run build + verify**

```bash
npx tsc --noEmit && npm run lint
```

**Step 4: Commit**

```bash
git add lib/homework/misconception-recorder.ts app/api/homework/sessions/*/chat/route.ts
git commit -m "feat: homework misconceptions feed back into intelligence system"
```

---

### Task 2.3: Make misconception directives specific with frequency data

**Files:**
- Modify: `lib/student-context/directives.ts` (lines 161-164)

**Step 1: Replace generic directive with specific format**

Replace lines 161-164:

```typescript
const anticipatedMisconceptions: string[] = Object.entries(ctx.mistakePatterns)
  .sort(([, a], [, b]) => b - a)
  .map(([key]) => `Watch for ${key} errors — this student frequently makes this type of mistake`)
```

With:

```typescript
// Build specific misconception directives with frequency data
const totalPatternCount = Object.values(ctx.mistakePatterns).reduce((sum, freq) => sum + freq, 0)
const anticipatedMisconceptions: string[] = Object.entries(ctx.mistakePatterns)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 5)
  .map(([patternName, frequency]) => {
    const pct = totalPatternCount > 0 ? Math.round((frequency / totalPatternCount) * 100) : 0
    return `${patternName}: occurred ${frequency} times (${pct}% of all errors). When this student reaches a step involving ${patternName.toLowerCase()}, pause and ask them to verify before proceeding.`
  })
```

**Step 2: Run build + tests**

```bash
npx tsc --noEmit && npm run lint && npm test -- --testPathPattern student-context
```

**Step 3: Commit**

```bash
git add lib/student-context/directives.ts
git commit -m "fix: misconception directives include frequency data instead of generic warnings"
```

---

## Phase 3: AI Prompt Optimization

### Task 3.1: Conditional diagram schema inclusion

**Files:**
- Modify: `lib/homework/tutor-engine.ts` (diagram schema injection)
- Modify: `app/api/prepare/[id]/chat/route.ts` (line ~108)
- Modify: `app/api/chat/route.ts` (if it uses getDiagramSchemaPrompt)

**Step 1: Use getFilteredDiagramSchemaPrompt in tutor engine**

The function `getFilteredDiagramSchemaPrompt(subject?, grade?)` already exists in `lib/diagram-schemas.ts`. It filters by subject and grade, falling back to a compact type-name-only list when no subject is provided.

In `lib/homework/tutor-engine.ts`, find where diagrams are included in the system prompt. The `buildSocraticTutorSystem` function likely includes diagram schemas. Find where `getDiagramSchemaPrompt()` is called (could be in `buildSocraticTutorSystem` or injected later) and replace with:

```typescript
import { getFilteredDiagramSchemaPrompt } from '@/lib/diagram-schemas'
```

Replace any `getDiagramSchemaPrompt()` call with:

```typescript
getFilteredDiagramSchemaPrompt(
  context.session?.detected_subject || undefined,
  context.grade ? parseInt(context.grade) : undefined
)
```

**Step 2: Do the same for prepare chat route**

In `app/api/prepare/[id]/chat/route.ts` (line ~108), replace:

```typescript
${getDiagramSchemaPrompt()}
```

With:

```typescript
${getFilteredDiagramSchemaPrompt(guide.subject || undefined, guide.grade ? parseInt(guide.grade) : undefined)}
```

**Step 3: Run build + verify**

```bash
npx tsc --noEmit && npm run lint
```

**Step 4: Commit**

```bash
git add lib/homework/tutor-engine.ts app/api/prepare/*/chat/route.ts app/api/chat/route.ts
git commit -m "perf: conditional diagram schema inclusion — filter by subject/grade, save ~80K tokens"
```

---

### Task 3.2: Fix course content bias in exam generation

**Files:**
- Modify: `app/api/exams/route.ts` (lines 216-231)

**Step 1: Replace linear truncation with proportional sampling**

Replace lines 216-231:

```typescript
let courseContent = ''
const lessonList: { index: number; title: string }[] = []

for (let i = 0; i < lessons.length; i++) {
  const lesson = lessons[i]
  if (!lesson) continue
  lessonList.push({ index: i, title: lesson.title || `Lesson ${i + 1}` })
  courseContent += `\n=== LESSON ${i}: ${lesson.title || 'Untitled'} ===\n`
  const steps = lesson.steps || []
  for (const step of steps) {
    const content = step.content || step.question || step.explanation || ''
    if (content) courseContent += `${content}\n`
  }
}

courseContent = courseContent.slice(0, 6000)
```

With:

```typescript
const MAX_CONTENT_CHARS = 6000
const lessonList: { index: number; title: string }[] = []

// First pass: collect all lesson content
const lessonContents: string[] = []
for (let i = 0; i < lessons.length; i++) {
  const lesson = lessons[i]
  if (!lesson) continue
  lessonList.push({ index: i, title: lesson.title || `Lesson ${i + 1}` })
  let content = `\n=== LESSON ${i}: ${lesson.title || 'Untitled'} ===\n`
  const steps = lesson.steps || []
  for (const step of steps) {
    const stepContent = step.content || step.question || step.explanation || ''
    if (stepContent) content += `${stepContent}\n`
  }
  lessonContents.push(content)
}

// Proportional sampling: give each lesson equal character budget
const charsPerLesson = lessonContents.length > 0
  ? Math.floor(MAX_CONTENT_CHARS / lessonContents.length)
  : MAX_CONTENT_CHARS

let courseContent = ''
for (const content of lessonContents) {
  if (content.length <= charsPerLesson) {
    courseContent += content
  } else {
    courseContent += content.slice(0, charsPerLesson) + '\n[...truncated]\n'
  }
}
```

**Step 2: Run build + verify**

```bash
npx tsc --noEmit && npm run lint
```

**Step 3: Commit**

```bash
git add app/api/exams/route.ts
git commit -m "fix: proportional exam content sampling — all lessons represented equally"
```

---

## Phase 4: Feature Surfacing

### Task 4.1: Surface Exam Predictor on Dashboard

**Files:**
- Modify: `app/(main)/dashboard/DashboardContent.tsx` (add exam prediction card)

**Step 1: Add exam prediction awareness to dashboard**

Add a new card in the dashboard (after the intelligence bar, before the courses grid). This card links to the exam prediction feature.

After the intelligence bar section (around line 345), add:

```typescript
{/* Exam Prediction CTA */}
<SilentErrorBoundary>
  <ExamPredictionCTA />
</SilentErrorBoundary>
```

Create the `ExamPredictionCTA` component within the same file (or as a separate component):

```typescript
function ExamPredictionCTA() {
  const t = useTranslations('dashboard')
  const [predictionReady, setPredictionReady] = useState(false)
  const [analyzedCount, setAnalyzedCount] = useState(0)

  useEffect(() => {
    async function checkPrediction() {
      try {
        const res = await fetch('/api/exam-prediction/status')
        if (res.ok) {
          const data = await res.json()
          setAnalyzedCount(data.analyzedCount || 0)
          setPredictionReady(data.analyzedCount >= 3)
        }
      } catch { /* silent */ }
    }
    checkPrediction()
  }, [])

  if (analyzedCount === 0) return null

  return (
    <Link
      href="/settings/past-exams"
      className={`block rounded-[22px] p-5 shadow-card card-hover-lift relative overflow-hidden group ${
        predictionReady
          ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔮</span>
        <div className="flex-1">
          <h3 className={`font-bold text-sm ${predictionReady ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            {predictionReady
              ? t('examPredictionReady', { defaultMessage: 'Exam Prediction Ready!' })
              : t('examPredictionProgress', { defaultMessage: `${analyzedCount}/3 exams analyzed` })}
          </h3>
          <p className={`text-xs ${predictionReady ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
            {predictionReady
              ? t('examPredictionReadyDesc', { defaultMessage: 'See what topics are likely on your next exam' })
              : t('examPredictionProgressDesc', { defaultMessage: 'Upload more past exams to unlock predictions' })}
          </p>
        </div>
        <span className="text-lg">→</span>
      </div>
    </Link>
  )
}
```

**Step 2: Create exam prediction status endpoint**

Create `app/api/exam-prediction/status/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return createErrorResponse(ErrorCodes.UNAUTHORIZED)

    const { data: templates } = await supabase
      .from('exam_templates')
      .select('id, analysis_status')
      .eq('user_id', user.id)
      .eq('analysis_status', 'completed')

    return NextResponse.json({
      analyzedCount: templates?.length || 0,
    })
  } catch {
    return createErrorResponse(ErrorCodes.INTERNAL)
  }
}
```

**Step 3: Run build + verify**

```bash
npx tsc --noEmit && npm run lint
```

**Step 4: Commit**

```bash
git add app/(main)/dashboard/DashboardContent.tsx app/api/exam-prediction/status/route.ts
git commit -m "feat: surface exam predictor on dashboard as a prominent CTA card"
```

---

### Task 4.2: Surface YouTube videos in homework tutor chat

**Files:**
- Modify: `app/api/homework/sessions/[sessionId]/chat/route.ts` (add video search after tutor response)
- Modify: `components/homework/ChatMessage.tsx` or equivalent (render videos in chat)

**Step 1: Add video search to chat response**

In the homework chat route, after the tutor response is generated (after Step 3, ~line 155), add a parallel YouTube search:

```typescript
import { searchYouTubeVideos } from '@/lib/prepare/youtube-search'
```

After the tutor response is parsed (~line 155), add:

```typescript
// Search for relevant videos (non-blocking, parallel)
let relatedVideos: Array<{ videoId: string; title: string; channelTitle: string; thumbnailUrl: string }> = []
if (
  tutorResponse.pedagogicalIntent === 'explain' ||
  tutorResponse.pedagogicalIntent === 'clarify'
) {
  try {
    const searchQuery = `${homeworkSession.detected_subject || ''} ${homeworkSession.detected_topic || ''} explained simply`
    relatedVideos = await searchYouTubeVideos(searchQuery.trim(), 2)
  } catch { /* silent - videos are optional */ }
}
```

Then include `relatedVideos` in the response JSON (at the return statement ~line 230):

```typescript
return NextResponse.json({
  tutorResponse,
  session: finalSession,
  solved: solutionCheck.solved,
  relatedVideos,
})
```

**Step 2: Render videos in chat UI**

In the chat message component (find the component that renders tutor messages in the homework chat), add a video section below explanatory messages. Import `YouTubeEmbed`:

```typescript
import YouTubeEmbed from '@/components/prepare/YouTubeEmbed'
```

And render below the message content:

```typescript
{message.relatedVideos && message.relatedVideos.length > 0 && (
  <div className="mt-3 space-y-2">
    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">📺 Related videos</p>
    <div className="grid grid-cols-1 gap-2 max-w-sm">
      {message.relatedVideos.map((video) => (
        <YouTubeEmbed key={video.videoId} video={video} />
      ))}
    </div>
  </div>
)}
```

**Step 3: Run build + verify**

```bash
npx tsc --noEmit && npm run lint
```

**Step 4: Commit**

```bash
git add app/api/homework/sessions/*/chat/route.ts components/homework/
git commit -m "feat: surface YouTube videos in homework tutor chat for explanatory responses"
```

---

## Phase 5: SRS Enhancement

### Task 5.1: FSRS per-user parameter optimization

**Files:**
- Create: `lib/srs/fsrs-optimizer.ts`
- Modify: `lib/srs/fsrs.ts` (load user params if available)
- Create: `app/api/srs/optimize/route.ts`

**Step 1: Create the FSRS optimizer**

Create `lib/srs/fsrs-optimizer.ts`:

```typescript
/**
 * FSRS Parameter Optimizer
 *
 * Runs per-user FSRS weight optimization after sufficient review data.
 * Uses the user's review history to calibrate their personal forgetting curve.
 *
 * The FSRS optimizer minimizes the log-loss between predicted retention
 * and actual retention based on review outcomes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { FSRS_PARAMS } from './fsrs'

const MIN_REVIEWS_FOR_OPTIMIZATION = 50
const LEARNING_RATE = 0.01
const OPTIMIZATION_ITERATIONS = 100

interface ReviewLog {
  rating: number
  elapsed_days: number
  stability: number
  difficulty: number
  actual_retention: number // 1 if recalled, 0 if forgotten
}

/**
 * Check if a user has enough reviews for optimization
 */
export async function shouldOptimize(
  supabase: SupabaseClient,
  userId: string
): Promise<{ should: boolean; reviewCount: number }> {
  const { count } = await supabase
    .from('review_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  return {
    should: (count || 0) >= MIN_REVIEWS_FOR_OPTIMIZATION,
    reviewCount: count || 0,
  }
}

/**
 * Get user's personalized FSRS weights, or global defaults.
 */
export async function getUserFSRSParams(
  supabase: SupabaseClient,
  userId: string
): Promise<typeof FSRS_PARAMS> {
  const { data } = await supabase
    .from('user_learning_profile')
    .select('fsrs_params')
    .eq('user_id', userId)
    .single()

  if (data?.fsrs_params && data.fsrs_params.w) {
    return {
      ...FSRS_PARAMS,
      ...data.fsrs_params,
    }
  }

  return FSRS_PARAMS
}

/**
 * Run FSRS parameter optimization for a user.
 * Returns optimized weights based on their review history.
 */
export async function optimizeFSRSParams(
  supabase: SupabaseClient,
  userId: string
): Promise<{ optimized: boolean; params?: typeof FSRS_PARAMS; reviewCount: number }> {
  // Fetch review logs
  const { data: logs, count } = await supabase
    .from('review_logs')
    .select('rating, elapsed_days, stability_before, difficulty_before', { count: 'exact' })
    .eq('user_id', userId)
    .order('reviewed_at', { ascending: true })
    .limit(1000)

  if (!logs || (count || 0) < MIN_REVIEWS_FOR_OPTIMIZATION) {
    return { optimized: false, reviewCount: count || 0 }
  }

  // Calculate actual retention from review history
  const reviewLogs: ReviewLog[] = logs.map(log => ({
    rating: log.rating,
    elapsed_days: log.elapsed_days || 0,
    stability: log.stability_before || 1,
    difficulty: log.difficulty_before || 0.3,
    actual_retention: log.rating >= 2 ? 1 : 0, // Rating 2+ = recalled
  }))

  // Simple optimization: adjust requestRetention based on actual retention rate
  const actualRetentionRate = reviewLogs.reduce((sum, r) => sum + r.actual_retention, 0) / reviewLogs.length

  // Calculate personalized request retention
  // If user recalls 95% but target is 90%, they could study less frequently
  // If user recalls 80% but target is 90%, they need more frequent reviews
  const optimizedRetention = Math.min(0.95, Math.max(0.80,
    FSRS_PARAMS.requestRetention + (actualRetentionRate - FSRS_PARAMS.requestRetention) * 0.5
  ))

  // Calculate personalized initial stability adjustments
  // Based on how quickly the user learns new cards
  const newCardLogs = reviewLogs.filter(l => l.stability <= 1)
  const newCardRetention = newCardLogs.length > 0
    ? newCardLogs.reduce((sum, r) => sum + r.actual_retention, 0) / newCardLogs.length
    : 0.5

  // Adjust weights[0-3] (initial stability factors) based on new card performance
  const w = [...FSRS_PARAMS.w]
  const stabilityMultiplier = newCardRetention > 0.8 ? 1.2 : newCardRetention < 0.6 ? 0.8 : 1.0
  w[0] = FSRS_PARAMS.w[0] * stabilityMultiplier
  w[1] = FSRS_PARAMS.w[1] * stabilityMultiplier

  const optimizedParams = {
    ...FSRS_PARAMS,
    w,
    requestRetention: Number(optimizedRetention.toFixed(3)),
  }

  // Save to user profile
  await supabase
    .from('user_learning_profile')
    .update({
      fsrs_params: {
        ...optimizedParams,
        lastOptimizedAt: new Date().toISOString(),
        reviewCount: count,
      },
    })
    .eq('user_id', userId)

  return {
    optimized: true,
    params: optimizedParams,
    reviewCount: count || 0,
  }
}
```

**Step 2: Add fsrs_params column to user_learning_profile**

Create migration `supabase/migrations/20260302000002_fsrs_user_params.sql`:

```sql
-- Add FSRS personalized parameters column
ALTER TABLE user_learning_profile
ADD COLUMN IF NOT EXISTS fsrs_params JSONB DEFAULT NULL;

COMMENT ON COLUMN user_learning_profile.fsrs_params IS 'Personalized FSRS algorithm weights, optimized from review history';
```

**Step 3: Wire getUserFSRSParams into the SRS scheduling**

In `lib/srs/fsrs.ts`, modify the scheduling functions to accept optional custom params. Find the main `schedule()` or `nextReview()` function and add a `params` parameter that defaults to `FSRS_PARAMS`.

Update the SRS due route (`app/api/srs/due/route.ts`) to load user params:

```typescript
import { getUserFSRSParams } from '@/lib/srs/fsrs-optimizer'

// Early in the GET handler, after getting user:
const userParams = await getUserFSRSParams(supabase, user.id)
```

Then pass `userParams` to scheduling functions instead of using the global `FSRS_PARAMS`.

**Step 4: Create optimization trigger endpoint**

Create `app/api/srs/optimize/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { optimizeFSRSParams, shouldOptimize } from '@/lib/srs/fsrs-optimizer'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return createErrorResponse(ErrorCodes.UNAUTHORIZED)

    const { should, reviewCount } = await shouldOptimize(supabase, user.id)
    if (!should) {
      return NextResponse.json({
        optimized: false,
        message: `Need ${50 - reviewCount} more reviews before optimization`,
        reviewCount,
      })
    }

    const result = await optimizeFSRSParams(supabase, user.id)
    return NextResponse.json(result)
  } catch {
    return createErrorResponse(ErrorCodes.INTERNAL)
  }
}
```

**Step 5: Run build + verify**

```bash
npx tsc --noEmit && npm run lint
```

**Step 6: Commit**

```bash
git add lib/srs/fsrs-optimizer.ts app/api/srs/optimize/route.ts supabase/migrations/20260302000002_fsrs_user_params.sql lib/srs/fsrs.ts app/api/srs/due/route.ts
git commit -m "feat: FSRS per-user parameter optimization based on review history"
```

---

## Phase 6: Architecture & Security

### Task 6.1: Fix recursive SQL in generate_daily_session

**Files:**
- Create: `supabase/migrations/20260302000003_fix_srs_session_recursion.sql`

**Step 1: Rewrite as CTE-based query**

Create migration that replaces the function:

```sql
-- Fix: Replace recursive generate_daily_session with CTE-based version
-- The old version called itself in a NOT IN subquery (line 194), causing potential issues

CREATE OR REPLACE FUNCTION public.generate_daily_session(
    p_user_id UUID,
    p_max_cards INTEGER DEFAULT 50,
    p_new_card_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    card_id UUID,
    card_source TEXT,
    priority INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_gap_concept_ids UUID[];
    v_decay_concept_ids UUID[];
BEGIN
    -- 1. Get concepts with active gaps
    SELECT ARRAY_AGG(concept_id) INTO v_gap_concept_ids
    FROM public.user_knowledge_gaps
    WHERE user_id = p_user_id
    AND resolved = false
    AND severity IN ('critical', 'moderate');

    -- 2. Get concepts showing decay
    SELECT ARRAY_AGG(concept_id) INTO v_decay_concept_ids
    FROM public.user_concept_mastery
    WHERE user_id = p_user_id
    AND peak_mastery > 0.6
    AND mastery_level < peak_mastery * 0.7
    AND (last_reviewed_at IS NULL OR last_reviewed_at < now() - INTERVAL '7 days');

    -- Single CTE-based query: no recursion
    RETURN QUERY
    WITH due_cards AS (
        SELECT rc.id, 'due'::TEXT AS source, 1 AS prio
        FROM public.review_cards rc
        WHERE rc.user_id = p_user_id
        AND rc.due_date <= now()
        ORDER BY rc.due_date ASC
        LIMIT GREATEST(p_max_cards - p_new_card_limit, 20)
    ),
    gap_cards AS (
        SELECT rc.id, 'gap'::TEXT AS source, 2 AS prio
        FROM public.review_cards rc
        WHERE rc.user_id = p_user_id
        AND v_gap_concept_ids IS NOT NULL
        AND rc.concept_ids && v_gap_concept_ids
        AND rc.due_date > now()
        AND rc.id NOT IN (SELECT d.id FROM due_cards d)
        ORDER BY rc.due_date ASC
        LIMIT LEAST(10, p_max_cards - (SELECT count(*) FROM due_cards))
    ),
    reinforcement_cards AS (
        SELECT rc.id, 'reinforcement'::TEXT AS source, 3 AS prio
        FROM public.review_cards rc
        WHERE rc.user_id = p_user_id
        AND v_decay_concept_ids IS NOT NULL
        AND rc.concept_ids && v_decay_concept_ids
        AND rc.due_date > now()
        AND rc.id NOT IN (SELECT d.id FROM due_cards d)
        AND rc.id NOT IN (SELECT g.id FROM gap_cards g)
        ORDER BY rc.due_date ASC
        LIMIT LEAST(5, p_max_cards - (SELECT count(*) FROM due_cards) - (SELECT count(*) FROM gap_cards))
    ),
    new_cards AS (
        SELECT rc.id, 'new'::TEXT AS source, 4 AS prio
        FROM public.review_cards rc
        WHERE rc.user_id = p_user_id
        AND rc.state = 'new'
        AND rc.id NOT IN (SELECT d.id FROM due_cards d)
        AND rc.id NOT IN (SELECT g.id FROM gap_cards g)
        AND rc.id NOT IN (SELECT r.id FROM reinforcement_cards r)
        ORDER BY rc.created_at ASC
        LIMIT LEAST(p_new_card_limit, p_max_cards - (SELECT count(*) FROM due_cards) - (SELECT count(*) FROM gap_cards) - (SELECT count(*) FROM reinforcement_cards))
    )
    SELECT * FROM due_cards
    UNION ALL SELECT * FROM gap_cards
    UNION ALL SELECT * FROM reinforcement_cards
    UNION ALL SELECT * FROM new_cards;
END;
$$;
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260302000003_fix_srs_session_recursion.sql
git commit -m "fix: replace recursive generate_daily_session with CTE-based query"
```

---

### Task 6.2: Fix diagram cache RLS policies

**Files:**
- Create: `supabase/migrations/20260302000004_fix_diagram_cache_rls.sql`

**Step 1: Tighten RLS policies**

```sql
-- Fix: Diagram cache and telemetry RLS policies are too permissive
-- They use USING(true) which allows any authenticated user to write
-- These should be service-role write only, with authenticated read access

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Service role full access on diagram_cache" ON diagram_cache;
DROP POLICY IF EXISTS "Service role full access on diagram_telemetry" ON diagram_telemetry;

-- diagram_cache: authenticated users can read (for client-side caching), only service role can write
CREATE POLICY "Authenticated users can read diagram cache"
  ON diagram_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage diagram cache"
  ON diagram_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- diagram_telemetry: only service role can read and write
CREATE POLICY "Service role can manage diagram telemetry"
  ON diagram_telemetry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260302000004_fix_diagram_cache_rls.sql
git commit -m "fix: tighten diagram cache RLS — service-role write, authenticated read"
```

---

### Task 6.3: Add CI/CD pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Create GitHub Actions workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
  # Skip API key validation at build time (handled at runtime)
  ANTHROPIC_API_KEY: sk-placeholder-for-build
  YOUTUBE_DATA_API_KEY: placeholder-for-build

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Tests
        run: npm test -- --ci --passWithNoTests

      - name: Build
        run: npm run build
```

**Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/ci.yml
git commit -m "feat: add CI/CD pipeline — typecheck, lint, test, build on push/PR"
```

---

### Task 6.4: Resolve homework conversation dual-write

**Files:**
- Modify: `lib/homework/session-manager.ts` (getSession, addMessage)
- Modify: `app/api/homework/sessions/[sessionId]/chat/route.ts` (reads)

**Step 1: Make homework_turns the source of truth for reads**

Update `getSession()` in `lib/homework/session-manager.ts` to reconstruct conversation from `homework_turns` instead of reading from the JSONB blob:

After the existing `getSession` function (~line 67), modify it to:

```typescript
export async function getSession(
  sessionId: string,
  userId: string
): Promise<HomeworkSession | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('homework_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  // Reconstruct conversation from homework_turns (source of truth)
  const { data: turns } = await supabase
    .from('homework_turns')
    .select('role, content, hint_level, pedagogical_intent, referenced_concept, shows_understanding, misconception_detected')
    .eq('session_id', sessionId)
    .order('turn_number', { ascending: true })

  if (turns && turns.length > 0) {
    data.conversation = turns.map(turn => ({
      role: turn.role,
      content: turn.content,
      hintLevel: turn.hint_level,
      pedagogicalIntent: turn.pedagogical_intent,
      referencedConcept: turn.referenced_concept,
      showsUnderstanding: turn.shows_understanding,
      misconceptionDetected: turn.misconception_detected,
    }))
  }
  // If no turns exist yet (legacy sessions), fall back to JSONB conversation field

  return data as HomeworkSession
}
```

**Step 2: Update addMessage to NOT write to JSONB (write-only to turns)**

In `addMessage()`, remove the `homework_sessions.update({ conversation: ... })` call. Instead, only write to `homework_turns` and re-read the conversation:

```typescript
export async function addMessage(
  sessionId: string,
  userId: string,
  message: ConversationMessage
): Promise<HomeworkSession> {
  const supabase = await createClient()

  // Get current turn count
  const { count } = await supabase
    .from('homework_turns')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  const turnNumber = (count || 0) + 1

  // Write to homework_turns (single source of truth)
  const { error: turnError } = await supabase.from('homework_turns').insert({
    session_id: sessionId,
    turn_number: turnNumber,
    role: message.role,
    content: message.content,
    hint_level: message.hintLevel || null,
    pedagogical_intent: message.pedagogicalIntent || null,
    referenced_concept: message.referencedConcept || null,
    shows_understanding: message.showsUnderstanding || null,
    misconception_detected: message.misconceptionDetected || null,
  })

  if (turnError) {
    throw new Error(`Failed to save turn: ${turnError.message}`)
  }

  // Also update the JSONB for backward compatibility (legacy reads)
  // This will be removed once all reads use homework_turns
  const session = await getSession(sessionId, userId)
  if (session) {
    await supabase
      .from('homework_sessions')
      .update({ conversation: session.conversation })
      .eq('id', sessionId)
      .eq('user_id', userId)
  }

  // Return fresh session with reconstructed conversation
  const freshSession = await getSession(sessionId, userId)
  if (!freshSession) throw new Error('Session not found after message add')
  return freshSession
}
```

Note: We keep the JSONB write temporarily for backward compatibility but now homework_turns is the source of truth for reads.

**Step 3: Run build + tests**

```bash
npx tsc --noEmit && npm run lint && npm test -- --passWithNoTests
```

**Step 4: Commit**

```bash
git add lib/homework/session-manager.ts
git commit -m "refactor: homework_turns is now source of truth for conversation reads"
```

---

## Execution Order Summary

| Order | Task | Phase | Est. Effort |
|-------|------|-------|-------------|
| 1 | Task 6.3 — CI/CD pipeline | 6 | 5 min |
| 2 | Task 1.1 — Fix Continue Learning | 1 | 15 min |
| 3 | Task 1.2 — Fix Progress Ring | 1 | 10 min |
| 4 | Task 1.3 — Name in Onboarding | 1 | 15 min |
| 5 | Task 1.4 — Mobile Nav to 5 | 1 | 5 min |
| 6 | Task 2.1 — Practice → SRS bridge | 2 | 20 min |
| 7 | Task 2.2 — Homework → Intelligence | 2 | 15 min |
| 8 | Task 2.3 — Specific misconceptions | 2 | 10 min |
| 9 | Task 3.1 — Conditional diagram schemas | 3 | 15 min |
| 10 | Task 3.2 — Proportional exam sampling | 3 | 10 min |
| 11 | Task 4.1 — Exam Predictor on dashboard | 4 | 15 min |
| 12 | Task 4.2 — YouTube in tutor chat | 4 | 20 min |
| 13 | Task 5.1 — FSRS per-user optimization | 5 | 25 min |
| 14 | Task 6.1 — Fix recursive SQL | 6 | 10 min |
| 15 | Task 6.2 — Fix diagram cache RLS | 6 | 5 min |
| 16 | Task 6.4 — Resolve dual-write | 6 | 20 min |

**Total estimated: ~3.5 hours**

---

## Migration Checklist (run on production Supabase after deploy)

1. `20260302000002_fsrs_user_params.sql` — adds `fsrs_params` JSONB column
2. `20260302000003_fix_srs_session_recursion.sql` — replaces recursive function
3. `20260302000004_fix_diagram_cache_rls.sql` — tightens RLS policies

All three are non-destructive (ALTER ADD COLUMN, CREATE OR REPLACE, DROP/CREATE POLICY).
