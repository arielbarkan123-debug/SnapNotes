# Batch 3: Lesson & Practice Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Go Deeper" buttons to lesson steps, personalized worked examples when students get lesson questions wrong, and an infinite practice mode with real-time difficulty calibration.

**Architecture:** Features #2 and #3 modify the lesson system (StepContent.tsx, LessonView.tsx). Feature #4 extends the practice system with a new session type and micro-batch generation.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind CSS, Framer Motion, i18n (next-intl)

---

## Feature #2: Depth on Demand

**Summary:** "Go Deeper" button at the bottom of each non-question lesson step. Clicking it generates 2-3 AI sub-steps that appear in an accordion below the step content. Max depth: 2 levels (sub-steps can themselves be expanded once more).

### Task 2.1: Add i18n keys for Depth on Demand

**Files:**
- `messages/en/lesson.json`
- `messages/he/lesson.json`

**EN keys to add (at root level of the JSON, before the `"help"` key):**

```json
"goDeeper": "Go Deeper",
"collapse": "Collapse",
"depthLevel": "Depth {level}",
"loadingDepth": "Generating deeper explanation...",
"depthSubStep": "Sub-step {index}",
"quickCheck": "Quick Check",
"checkQuickAnswer": "Check",
"quickCheckCorrect": "Correct!",
"quickCheckIncorrect": "Not quite. The answer is: {answer}",
"depthError": "Could not generate deeper content. Please try again.",
"relatedExtension": "Related Extension"
```

**HE keys to add (same position):**

```json
"goDeeper": "העמק",
"collapse": "כווץ",
"depthLevel": "עומק {level}",
"loadingDepth": "מייצר הסבר מעמיק...",
"depthSubStep": "תת-שלב {index}",
"quickCheck": "בדיקה מהירה",
"checkQuickAnswer": "בדוק",
"quickCheckCorrect": "נכון!",
"quickCheckIncorrect": "לא בדיוק. התשובה היא: {answer}",
"depthError": "לא ניתן לייצר תוכן מעמיק. אנא נסה שוב.",
"relatedExtension": "הרחבה קשורה"
```

**Steps:**
1. Open `messages/en/lesson.json`
2. Insert the EN keys before the `"help"` object (around line 93)
3. Open `messages/he/lesson.json`
4. Insert the HE keys before the `"help"` object (around line 93)
5. Run `npx tsc --noEmit` to verify no breakage

---

### Task 2.2: Create the expand API route

**New file:** `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts`

This API receives a step index and current depth, calls Claude to generate 2-3 sub-steps, and optionally caches them in the course JSONB.

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { checkRateLimit, RATE_LIMITS, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit'
import Anthropic from '@anthropic-ai/sdk'

// Allow 60 seconds for AI generation
export const maxDuration = 60

interface SubStep {
  title: string
  content: string
  hasExample: boolean
  quickCheck?: { question: string; answer: string }
}

interface ExpandResponse {
  subSteps: SubStep[]
  depth: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonIndex: string }> }
): Promise<NextResponse> {
  try {
    const { id: courseId, lessonIndex: lessonIndexStr } = await params
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(
      getIdentifier(user.id, request),
      RATE_LIMITS.generateCourse // Reuse course generation rate limit
    )
    if (!rateLimitResult.allowed) {
      const response = createErrorResponse(ErrorCodes.RATE_LIMITED)
      const headers = getRateLimitHeaders(rateLimitResult)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // Parse body
    const body = await request.json()
    const { stepIndex, currentDepth = 0 } = body as { stepIndex: number; currentDepth?: number }

    // Validate depth limit
    if (currentDepth >= 2) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Maximum depth reached (2 levels)')
    }

    const lessonIndex = parseInt(lessonIndexStr, 10)
    if (isNaN(lessonIndex) || lessonIndex < 0) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid lesson index')
    }

    // Fetch course
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('id, user_id, generated_course, title')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError || !course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    const generatedCourse = course.generated_course as { title?: string; subject?: string; gradeLevel?: string; lessons?: Array<{ title?: string; steps?: Array<{ type?: string; content?: string; expandedContent?: SubStep[][] }> }> } | null
    const lessons = generatedCourse?.lessons || []
    const lesson = lessons[lessonIndex]
    if (!lesson) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Lesson not found')
    }

    const steps = lesson.steps || []
    const step = steps[stepIndex]
    if (!step) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Step not found')
    }

    // Check cache: if expandedContent already exists for this depth, return it
    const cachedExpansions = step.expandedContent || []
    if (cachedExpansions[currentDepth]) {
      return NextResponse.json({
        subSteps: cachedExpansions[currentDepth],
        depth: currentDepth + 1,
      } satisfies ExpandResponse)
    }

    // Generate sub-steps via Claude
    const anthropic = new Anthropic()
    const subject = generatedCourse?.subject || course.title || 'General'
    const gradeLevel = generatedCourse?.gradeLevel || 'Not specified'

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `The student wants deeper explanation of this lesson step.

Step content: ${step.content}
Subject: ${subject}
Grade level: ${gradeLevel}
Current depth: ${currentDepth} (0 = first expansion, 1 = second expansion)

Generate 2-3 sub-steps that:
1. Explain the underlying reasoning
2. Include ONE worked example
3. Optionally include a quick-check question (one per expansion max)

If the step is already thorough, offer a related extension instead.
Cap each sub-step at 200 words max.

Return ONLY valid JSON, no markdown fences:
{ "subSteps": [{ "title": "string", "content": "string", "hasExample": boolean, "quickCheck": { "question": "string", "answer": "string" } | null }] }`
      }],
    })

    // Parse response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    let parsed: { subSteps: SubStep[] }
    try {
      // Strip potential markdown code fences
      const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      logError('Expand:parse', new Error(`Failed to parse AI response: ${responseText.slice(0, 200)}`))
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to parse AI response')
    }

    if (!parsed.subSteps || !Array.isArray(parsed.subSteps) || parsed.subSteps.length === 0) {
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'AI returned invalid sub-steps')
    }

    // Cache the expansion in the course JSONB (fire and forget)
    try {
      const updatedSteps = [...steps]
      const updatedStep = { ...updatedSteps[stepIndex] }
      const updatedExpanded = [...(updatedStep.expandedContent || [])]
      updatedExpanded[currentDepth] = parsed.subSteps
      updatedStep.expandedContent = updatedExpanded
      updatedSteps[stepIndex] = updatedStep

      const updatedLessons = [...lessons]
      updatedLessons[lessonIndex] = { ...lesson, steps: updatedSteps }
      const updatedCourse = { ...generatedCourse, lessons: updatedLessons }

      await supabase
        .from('courses')
        .update({ generated_course: updatedCourse })
        .eq('id', courseId)
    } catch (cacheErr) {
      // Non-critical: cache save failed, sub-steps still returned to client
      logError('Expand:cache', cacheErr)
    }

    return NextResponse.json({
      subSteps: parsed.subSteps,
      depth: currentDepth + 1,
    } satisfies ExpandResponse)
  } catch (error) {
    logError('Expand:generate', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate deeper explanation')
  }
}
```

**Steps:**
1. Create directory `app/api/courses/[id]/lessons/[lessonIndex]/expand/`
2. Write `route.ts` with the code above
3. Run `npx tsc --noEmit`

---

### Task 2.3: Create the DepthExpansion component

**New file:** `components/lesson/DepthExpansion.tsx`

This is the accordion component that renders sub-steps with animation, quick-check inline input, and nested "Go Deeper" buttons.

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'

interface SubStep {
  title: string
  content: string
  hasExample: boolean
  quickCheck?: { question: string; answer: string } | null
}

interface DepthExpansionProps {
  subSteps: SubStep[]
  depth: number // 1 or 2
  courseId: string
  lessonIndex: number
  stepIndex: number
  onRequestExpand?: (depth: number) => void
  isLoadingNested?: boolean
  nestedSubSteps?: SubStep[] | null
}

export default function DepthExpansion({
  subSteps,
  depth,
  courseId: _courseId,
  lessonIndex: _lessonIndex,
  stepIndex: _stepIndex,
  onRequestExpand,
  isLoadingNested = false,
  nestedSubSteps,
}: DepthExpansionProps) {
  const t = useTranslations('lesson')

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mt-4 space-y-3"
    >
      {/* Depth indicator pill */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-full">
          {t('depthLevel', { level: depth })}
        </span>
      </div>

      {/* Sub-steps */}
      {subSteps.map((subStep, index) => (
        <SubStepCard
          key={index}
          subStep={subStep}
          index={index}
          depth={depth}
        />
      ))}

      {/* Nested "Go Deeper" button - only at depth 1 */}
      {depth < 2 && onRequestExpand && (
        <div className="pt-2">
          {isLoadingNested ? (
            <DepthSkeleton />
          ) : nestedSubSteps ? (
            <AnimatePresence>
              <DepthExpansion
                subSteps={nestedSubSteps}
                depth={depth + 1}
                courseId={_courseId}
                lessonIndex={_lessonIndex}
                stepIndex={_stepIndex}
              />
            </AnimatePresence>
          ) : (
            <button
              onClick={() => onRequestExpand(depth)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              {t('goDeeper')}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

function SubStepCard({ subStep, index, depth }: { subStep: SubStep; index: number; depth: number }) {
  const t = useTranslations('lesson')

  return (
    <div
      className={`
        p-4 rounded-xl border transition-all
        ${depth === 1
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
          : 'bg-gray-100 dark:bg-gray-800/30 border-gray-300 dark:border-gray-600 ms-4'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            {subStep.title}
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
            {subStep.content}
          </p>

          {/* Example badge */}
          {subStep.hasExample && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
              {t('exampleLabel')}
            </span>
          )}

          {/* Quick check inline */}
          {subStep.quickCheck && (
            <QuickCheckInline
              question={subStep.quickCheck.question}
              answer={subStep.quickCheck.answer}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function QuickCheckInline({ question, answer }: { question: string; answer: string }) {
  const t = useTranslations('lesson')
  const [userInput, setUserInput] = useState('')
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  const handleCheck = () => {
    const correct = userInput.trim().toLowerCase() === answer.trim().toLowerCase()
    setIsCorrect(correct)
    setChecked(true)
  }

  return (
    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
        {t('quickCheck')}
      </p>
      <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">{question}</p>

      {!checked ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && userInput.trim()) handleCheck() }}
            className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            placeholder="..."
          />
          <button
            onClick={handleCheck}
            disabled={!userInput.trim()}
            className="px-3 py-1.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('checkQuickAnswer')}
          </button>
        </div>
      ) : (
        <div className={`text-sm font-medium ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {isCorrect
            ? t('quickCheckCorrect')
            : t('quickCheckIncorrect', { answer })
          }
        </div>
      )}
    </div>
  )
}

function DepthSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded mb-1" />
        <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded mb-1" />
        <div className="h-3 w-4/6 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  )
}

export { DepthSkeleton }
export type { SubStep }
```

**Steps:**
1. Create `components/lesson/DepthExpansion.tsx` with the code above
2. Run `npx tsc --noEmit`

---

### Task 2.4: Wire "Go Deeper" button into StepContent

**File:** `components/lesson/StepContent.tsx`

**Changes:**
1. Add new props to `StepContentProps`: `courseId`, `lessonIndex`, `stepIndex`
2. Add a "Go Deeper" button to every non-question step type (explanation, key_point, formula, example, summary)
3. Add state for expansion loading, sub-steps, and nested sub-steps
4. Use `DepthExpansion` when expanded

**Modify the `StepContentProps` interface** (line 19-34) to add:

```typescript
interface StepContentProps {
  step: Step
  lessonTitle: string
  onRequestHelp?: () => void
  annotation?: Annotation
  onSaveAnnotation?: (params: { noteText?: string; flagType?: 'confusing' | 'important' | null }) => Promise<Annotation | null>
  onDeleteAnnotation?: (id: string) => Promise<boolean>
  showAnnotationInput?: boolean
  onAnnotationInputToggle?: () => void
  // NEW: Depth on Demand props
  courseId?: string
  lessonIndex?: number
  stepIndex?: number
}
```

**Add imports at top of file:**

```typescript
import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
// ... existing imports ...

const DepthExpansion = dynamic(() => import('./DepthExpansion'), { ssr: false })
```

(Note: `useState` is already imported; just add `useCallback`.)

**Add a new `GoDeeper` wrapper component** inside the file (after the `HelpButton` function, around line 140):

```typescript
function GoDeeper({ courseId, lessonIndex, stepIndex }: {
  courseId?: string
  lessonIndex?: number
  stepIndex?: number
}) {
  const t = useTranslations('lesson')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [subSteps, setSubSteps] = useState<Array<{ title: string; content: string; hasExample: boolean; quickCheck?: { question: string; answer: string } | null }> | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Nested expansion state
  const [isLoadingNested, setIsLoadingNested] = useState(false)
  const [nestedSubSteps, setNestedSubSteps] = useState<Array<{ title: string; content: string; hasExample: boolean; quickCheck?: { question: string; answer: string } | null }> | null>(null)

  const handleExpand = useCallback(async () => {
    if (isExpanded) {
      setIsExpanded(false)
      return
    }

    // If already loaded, just show
    if (subSteps) {
      setIsExpanded(true)
      return
    }

    if (!courseId || lessonIndex === undefined || stepIndex === undefined) return

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonIndex}/expand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIndex, currentDepth: 0 }),
      })
      if (!res.ok) throw new Error('Failed to expand')
      const data = await res.json()
      setSubSteps(data.subSteps)
      setIsExpanded(true)
    } catch {
      setError(t('depthError'))
    } finally {
      setIsLoading(false)
    }
  }, [isExpanded, subSteps, courseId, lessonIndex, stepIndex, t])

  const handleNestedExpand = useCallback(async () => {
    if (!courseId || lessonIndex === undefined || stepIndex === undefined) return

    setIsLoadingNested(true)
    try {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonIndex}/expand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepIndex, currentDepth: 1 }),
      })
      if (!res.ok) throw new Error('Failed to expand')
      const data = await res.json()
      setNestedSubSteps(data.subSteps)
    } catch {
      setError(t('depthError'))
    } finally {
      setIsLoadingNested(false)
    }
  }, [courseId, lessonIndex, stepIndex, t])

  if (!courseId || lessonIndex === undefined || stepIndex === undefined) return null

  return (
    <div className="mt-4">
      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
      )}

      {/* Toggle button */}
      <button
        onClick={handleExpand}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
          ${isExpanded
            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('loadingDepth')}
          </>
        ) : isExpanded ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            {t('collapse')}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            {t('goDeeper')}
          </>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && subSteps && (
          <DepthExpansion
            subSteps={subSteps}
            depth={1}
            courseId={courseId}
            lessonIndex={lessonIndex}
            stepIndex={stepIndex}
            onRequestExpand={handleNestedExpand}
            isLoadingNested={isLoadingNested}
            nestedSubSteps={nestedSubSteps}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Update each step render** in the main `StepContent` component. For each case (explanation, key_point, formula, example, summary), add the `GoDeeper` component after the `annotationButton`. Example for the `'explanation'` case:

```typescript
case 'explanation':
  return (
    <>
      <ExplanationStep content={step.content} t={t} {...imageProps} helpButton={helpButton} />
      {annotationButton}
      <GoDeeper courseId={courseId} lessonIndex={lessonIndex} stepIndex={stepIndex} />
    </>
  )
```

Repeat the same pattern for `key_point`, `formula`, `example`, and `summary`. Do NOT add to `question` or `default`.

**Update the destructuring** in the main function to extract the new props:

```typescript
export default function StepContent({
  step,
  lessonTitle,
  onRequestHelp,
  annotation,
  onSaveAnnotation,
  onDeleteAnnotation,
  showAnnotationInput: _showAnnotationInput,
  onAnnotationInputToggle: _onAnnotationInputToggle,
  courseId,
  lessonIndex,
  stepIndex,
}: StepContentProps) {
```

**Steps:**
1. Edit `components/lesson/StepContent.tsx` with all changes described above
2. Run `npx tsc --noEmit`

---

### Task 2.5: Pass courseId, lessonIndex, stepIndex from LessonView to StepContent

**File:** `app/(main)/course/[id]/lesson/[lessonIndex]/LessonView.tsx`

Find the `<StepContent>` usage (around line 666) and add the new props:

```typescript
<StepContent
  key={currentStep}
  step={currentStepData}
  lessonTitle={lesson.title}
  onRequestHelp={() => setShowHelp(true)}
  annotation={getAnnotationForStep(currentStep)}
  onSaveAnnotation={(params) => saveAnnotation({ stepIndex: currentStep, ...params })}
  onDeleteAnnotation={deleteAnnotation}
  showAnnotationInput={showAnnotationInput}
  onAnnotationInputToggle={() => setShowAnnotationInput(prev => !prev)}
  courseId={course.id}
  lessonIndex={lessonIndex}
  stepIndex={currentStep}
/>
```

**Steps:**
1. Edit `LessonView.tsx` to add `courseId`, `lessonIndex`, `stepIndex` props to `<StepContent>`
2. Run `npx tsc --noEmit`
3. **Test in browser:** Open a lesson, see "Go Deeper" button on content steps. Click it. Verify sub-steps appear in accordion. Verify "Collapse" toggles them away. Verify nested "Go Deeper" generates depth-2 sub-steps.

---

### Task 2.6: Commit Feature #2

```bash
git add \
  messages/en/lesson.json \
  messages/he/lesson.json \
  app/api/courses/\[id\]/lessons/\[lessonIndex\]/expand/route.ts \
  components/lesson/DepthExpansion.tsx \
  components/lesson/StepContent.tsx \
  app/\(main\)/course/\[id\]/lesson/\[lessonIndex\]/LessonView.tsx

git commit -m "feat: add Depth on Demand — Go Deeper button on lesson steps with AI-generated sub-steps

- New expand API route generates 2-3 sub-steps via Claude
- DepthExpansion accordion component with depth indicators and quick-check inputs
- Max depth: 2 levels with nested expansion support
- Sub-steps cached in course JSONB for instant re-access
- i18n keys added for EN and HE"
```

---

## Feature #3: Worked Examples From YOUR Mistakes

**Summary:** When a student gets a lesson question wrong, after showing the "Incorrect" feedback, present a personalized worked example card that walks through the correct solution using the student's exact numbers. Includes a "Try a Similar One" mini-practice.

### Task 3.1: Add i18n keys for Worked Examples

**Files:**
- `messages/en/lesson.json`
- `messages/he/lesson.json`

**EN keys to add (at root level, before `"help"`):**

```json
"workedExample": {
  "title": "Let's work through this together",
  "step": "Step {number}",
  "mistakeIdentified": "Where the mistake happened",
  "tryASimilarOne": "Try a Similar One",
  "checkSimilar": "Check",
  "similarCorrect": "Got it! Great job!",
  "similarIncorrect": "Not quite. Let's look at another way.",
  "loading": "Preparing a worked example...",
  "error": "Could not generate a worked example.",
  "secondExample": "Let's try a different approach",
  "maxExamplesReached": "Keep studying this topic — you'll get it!"
}
```

**HE keys to add (same position):**

```json
"workedExample": {
  "title": "בוא נעבור על זה ביחד",
  "step": "שלב {number}",
  "mistakeIdentified": "איפה הייתה הטעות",
  "tryASimilarOne": "נסה אחד דומה",
  "checkSimilar": "בדוק",
  "similarCorrect": "הבנת! כל הכבוד!",
  "similarIncorrect": "לא בדיוק. בוא ננסה בדרך אחרת.",
  "loading": "מכין דוגמה מפורטת...",
  "error": "לא ניתן לייצר דוגמה מפורטת.",
  "secondExample": "בוא ננסה גישה אחרת",
  "maxExamplesReached": "המשך ללמוד את הנושא הזה — אתה תצליח!"
}
```

**Steps:**
1. Add the keys to both i18n files
2. Run `npx tsc --noEmit`

---

### Task 3.2: Create the worked-example API route

**New file:** `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/route.ts`

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { checkRateLimit, RATE_LIMITS, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

interface WorkedExampleStep {
  text: string
  math?: string // LaTeX string for KaTeX rendering
}

interface WorkedExampleResponse {
  steps: WorkedExampleStep[]
  tryAnother: { question: string; correctAnswer: string }
  errorDiagnosis: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonIndex: string }> }
): Promise<NextResponse> {
  try {
    const { id: courseId, lessonIndex: lessonIndexStr } = await params
    const supabase = await createClient()

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Rate limit
    const rateLimitResult = checkRateLimit(
      getIdentifier(user.id, request),
      RATE_LIMITS.generateCourse
    )
    if (!rateLimitResult.allowed) {
      const response = createErrorResponse(ErrorCodes.RATE_LIMITED)
      const headers = getRateLimitHeaders(rateLimitResult)
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      return response
    }

    // Parse body
    const body = await request.json()
    const { question, studentAnswer, correctAnswer, attemptNumber = 1 } = body as {
      question: string
      studentAnswer: string
      correctAnswer: string
      attemptNumber?: number
    }

    if (!question || !studentAnswer || !correctAnswer) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Missing required fields: question, studentAnswer, correctAnswer')
    }

    if (attemptNumber > 2) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Maximum 2 worked examples per problem')
    }

    const lessonIndex = parseInt(lessonIndexStr, 10)

    // Get course for subject/grade context
    const { data: course } = await supabase
      .from('courses')
      .select('title, generated_course')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .maybeSingle()

    const generatedCourse = course?.generated_course as { subject?: string; gradeLevel?: string } | null
    const subject = generatedCourse?.subject || course?.title || 'General'
    const gradeLevel = generatedCourse?.gradeLevel || 'Not specified'

    const anthropic = new Anthropic()

    const angleInstruction = attemptNumber === 2
      ? '\nThis is the SECOND attempt. Use a COMPLETELY DIFFERENT approach or analogy than the first worked example. Start from a different angle.'
      : ''

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `The student attempted this problem and got it wrong.

Problem: ${question}
Student's answer: ${studentAnswer}
Correct answer: ${correctAnswer}
Subject: ${subject}, Grade: ${gradeLevel}
Lesson index: ${lessonIndex}
${angleInstruction}

Generate a worked example that:
1. STARTS by acknowledging what the student wrote (use their exact numbers/text)
2. Identifies the specific mistake
3. Walks through correct solution using SAME numbers
4. Ends with verification step (plug answer back in)
5. Provides ONE similar problem for student to try

Use LaTeX notation (wrapped in $ delimiters) for any math expressions.

Return ONLY valid JSON, no markdown fences:
{
  "steps": [{ "text": "string", "math": "string or null" }],
  "tryAnother": { "question": "string", "correctAnswer": "string" },
  "errorDiagnosis": "string (one sentence describing the student's mistake pattern)"
}`
      }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    let parsed: WorkedExampleResponse
    try {
      const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      logError('WorkedExample:parse', new Error(`Failed to parse: ${responseText.slice(0, 200)}`))
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to parse AI response')
    }

    if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'AI returned invalid worked example')
    }

    return NextResponse.json(parsed)
  } catch (error) {
    logError('WorkedExample:generate', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate worked example')
  }
}
```

**Steps:**
1. Create directory `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/`
2. Write `route.ts` with the code above
3. Run `npx tsc --noEmit`

---

### Task 3.3: Create WorkedExampleCard component

**New file:** `components/lesson/WorkedExampleCard.tsx`

```typescript
'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'

const MathRenderer = dynamic(() => import('@/components/ui/MathRenderer'), { ssr: false })

interface WorkedExampleStep {
  text: string
  math?: string | null
}

interface TryAnother {
  question: string
  correctAnswer: string
}

interface WorkedExampleCardProps {
  steps: WorkedExampleStep[]
  tryAnother: TryAnother
  errorDiagnosis: string
  attemptNumber: number // 1 or 2
  onTryAnotherResult: (correct: boolean) => void
  onDismiss: () => void
}

export default function WorkedExampleCard({
  steps,
  tryAnother,
  errorDiagnosis,
  attemptNumber,
  onTryAnotherResult,
  onDismiss,
}: WorkedExampleCardProps) {
  const t = useTranslations('lesson.workedExample')
  const [tryAnswer, setTryAnswer] = useState('')
  const [tryChecked, setTryChecked] = useState(false)
  const [tryCorrect, setTryCorrect] = useState(false)

  const handleCheckTry = useCallback(() => {
    const normalized = tryAnswer.trim().toLowerCase()
    const expected = tryAnother.correctAnswer.trim().toLowerCase()
    const correct = normalized === expected
    setTryCorrect(correct)
    setTryChecked(true)
    onTryAnotherResult(correct)
  }, [tryAnswer, tryAnother.correctAnswer, onTryAnotherResult])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mt-4 bg-white dark:bg-gray-800 border-s-4 border-amber-400 rounded-2xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <span className="text-xl">📝</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {attemptNumber === 2 ? t('secondExample') : t('title')}
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {errorDiagnosis}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="px-5 pb-4 space-y-3">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15, duration: 0.3 }}
            className="flex gap-3"
          >
            <span className="flex-shrink-0 w-7 h-7 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center text-xs font-bold text-amber-700 dark:text-amber-300">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                {step.text}
              </p>
              {step.math && (
                <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-x-auto">
                  <MathRenderer math={step.math} display={false} />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Try a Similar One */}
      <div className="px-5 pb-5 pt-2 border-t border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10">
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
          {t('tryASimilarOne')}
        </p>
        <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">
          {tryAnother.question}
        </p>

        {!tryChecked ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={tryAnswer}
              onChange={(e) => setTryAnswer(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && tryAnswer.trim()) handleCheckTry() }}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              placeholder="..."
            />
            <button
              onClick={handleCheckTry}
              disabled={!tryAnswer.trim()}
              className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('checkSimilar')}
            </button>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-3 rounded-lg text-sm font-medium ${
              tryCorrect
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}
          >
            {tryCorrect ? t('similarCorrect') : t('similarIncorrect')}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export type { WorkedExampleStep, TryAnother }
```

**Steps:**
1. Create `components/lesson/WorkedExampleCard.tsx`
2. Run `npx tsc --noEmit`

---

### Task 3.4: Wire WorkedExampleCard into QuestionStep

**File:** `components/lesson/QuestionStep.tsx`

**Changes:**

1. Add new state variables after the existing state (around line 69):

```typescript
// Worked example state
const [showWorkedExample, setShowWorkedExample] = useState(false)
const [workedExampleData, setWorkedExampleData] = useState<{
  steps: Array<{ text: string; math?: string | null }>
  tryAnother: { question: string; correctAnswer: string }
  errorDiagnosis: string
} | null>(null)
const [workedExampleAttempt, setWorkedExampleAttempt] = useState(0)
const [isLoadingWorkedExample, setIsLoadingWorkedExample] = useState(false)
const [workedExampleError, setWorkedExampleError] = useState<string | null>(null)
```

2. Add import for `WorkedExampleCard` (lazy loaded, after existing dynamic imports around line 13):

```typescript
const WorkedExampleCard = dynamic(
  () => import('@/components/lesson/WorkedExampleCard'),
  { ssr: false }
)
```

3. Add a function to fetch the worked example (after `handleRequestHint`, around line 210):

```typescript
const fetchWorkedExample = useCallback(async (attemptNum: number) => {
  if (!courseId || lessonIndex === undefined) return
  setIsLoadingWorkedExample(true)
  setWorkedExampleError(null)
  try {
    const res = await fetch(`/api/courses/${courseId}/lessons/${lessonIndex}/worked-example`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        studentAnswer: selectedAnswer !== null ? options[selectedAnswer] : '',
        correctAnswer: options[correct_answer],
        attemptNumber: attemptNum,
      }),
    })
    if (!res.ok) throw new Error('Failed to fetch')
    const data = await res.json()
    setWorkedExampleData(data)
    setShowWorkedExample(true)
    setWorkedExampleAttempt(attemptNum)
  } catch {
    setWorkedExampleError('Could not generate worked example')
  } finally {
    setIsLoadingWorkedExample(false)
  }
}, [courseId, lessonIndex, question, selectedAnswer, options, correct_answer])
```

4. **Trigger the worked example on wrong answer.** Inside `handleCheck` (around line 146), after `setWrongAttempts((prev) => prev + 1)`, add:

```typescript
if (!correct) {
  setWrongAttempts((prev) => prev + 1)
  // Auto-fetch worked example on first wrong answer
  if (workedExampleAttempt === 0) {
    fetchWorkedExample(1)
  }
}
```

Note: The `fetchWorkedExample(1)` call will need to be added inside the `if (!correct)` block. Since `handleCheck` is `async`, this is fine as a fire-and-forget.

5. **Add WorkedExampleCard rendering.** Inside the feedback box section (after the "Help and Practice buttons" div that ends around line 448), add:

```typescript
{/* Worked Example Card */}
{!isCorrect && isLoadingWorkedExample && (
  <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 animate-pulse">
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    {t('workedExample.loading')}
  </div>
)}

{!isCorrect && showWorkedExample && workedExampleData && (
  <WorkedExampleCard
    steps={workedExampleData.steps}
    tryAnother={workedExampleData.tryAnother}
    errorDiagnosis={workedExampleData.errorDiagnosis}
    attemptNumber={workedExampleAttempt}
    onTryAnotherResult={(correct) => {
      if (!correct && workedExampleAttempt < 2) {
        // Wrong on "Try a Similar One" — fetch second worked example
        setShowWorkedExample(false)
        setWorkedExampleData(null)
        fetchWorkedExample(2)
      }
    }}
    onDismiss={() => setShowWorkedExample(false)}
  />
)}

{!isCorrect && workedExampleAttempt >= 2 && !showWorkedExample && (
  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic text-center">
    {t('workedExample.maxExamplesReached')}
  </p>
)}

{workedExampleError && (
  <p className="mt-2 text-sm text-red-500 dark:text-red-400">{workedExampleError}</p>
)}
```

Place this block inside the `{hasChecked && (...)}` section, after the existing `{!isCorrect && courseId && (...)}` help/practice buttons block and before the closing `</div>` of the feedback box.

6. Add `lessonIndex` to the `QuestionStepProps` interface (it's already there as an optional prop, so no change needed).

**Steps:**
1. Edit `components/lesson/QuestionStep.tsx` with all changes
2. Ensure `useCallback` is imported (it already is from line 1 — check it: actually it's not imported, only `useState` and `useEffect`. Add `useCallback` to the import)
3. Run `npx tsc --noEmit`
4. **Test in browser:** Open a lesson with a question, answer wrong, see the worked example card appear with step-by-step walkthrough. Try the "Similar One" input. If wrong, see second worked example.

---

### Task 3.5: Commit Feature #3

```bash
git add \
  messages/en/lesson.json \
  messages/he/lesson.json \
  app/api/courses/\[id\]/lessons/\[lessonIndex\]/worked-example/route.ts \
  components/lesson/WorkedExampleCard.tsx \
  components/lesson/QuestionStep.tsx

git commit -m "feat: add Worked Examples from YOUR Mistakes — personalized step-by-step walkthrough on wrong answers

- New worked-example API generates personalized walkthrough using student's exact answer
- WorkedExampleCard component with sequential step animation and KaTeX math rendering
- Try a Similar One inline practice with automatic second attempt on failure
- Max 2 worked examples per missed problem
- Error diagnosis identifies the student's specific mistake pattern
- i18n keys for EN and HE"
```

---

## Feature #4: Infinite Practice Mode

**Summary:** Never-ending practice session with real-time difficulty calibration. Questions arrive in micro-batches of 3. Difficulty adjusts every 5 questions based on accuracy. Topic rotates to weakest concept every 10 questions. Student can stop any time via a calm "Stop" button.

### Task 4.1: Add i18n keys for Infinite Practice

**Files:**
- `messages/en/practice.json`
- `messages/he/practice.json`

**EN keys to add (at root level, after `"compareWithModelAnswer"`):**

```json
"infinite": {
  "title": "Infinite Practice",
  "subtitle": "Keep going until you want to stop",
  "start": "Start Infinite Mode",
  "keepGoing": "Keep Going — Infinite Mode",
  "streak": "Streak",
  "totalAnswered": "Total",
  "currentDifficulty": "Difficulty",
  "stop": "Stop Session",
  "stopConfirm": "End your infinite practice session?",
  "generatingNext": "Loading next questions...",
  "difficultyUp": "Difficulty increased!",
  "difficultyDown": "Difficulty eased.",
  "topicSwitch": "Switching to: {topic}",
  "sessionSummary": "Infinite Session Summary",
  "questionsCompleted": "{count} questions completed",
  "longestStreak": "Longest streak: {count}",
  "avgAccuracy": "Average accuracy: {percent}%",
  "weakTopics": "Topics to review",
  "strongTopics": "Strong topics",
  "practiceAgain": "Practice Again",
  "noMoreQuestions": "Generating more questions..."
},
"sessionTypeInfinite": "Infinite"
```

**HE keys to add (same position):**

```json
"infinite": {
  "title": "תרגול אינסופי",
  "subtitle": "המשך עד שתרצה לעצור",
  "start": "התחל מצב אינסופי",
  "keepGoing": "המשך — מצב אינסופי",
  "streak": "רצף",
  "totalAnswered": "סה\"כ",
  "currentDifficulty": "רמת קושי",
  "stop": "עצור אימון",
  "stopConfirm": "לסיים את התרגול האינסופי?",
  "generatingNext": "טוען שאלות נוספות...",
  "difficultyUp": "הקושי עלה!",
  "difficultyDown": "הקושי ירד.",
  "topicSwitch": "עובר ל: {topic}",
  "sessionSummary": "סיכום אימון אינסופי",
  "questionsCompleted": "{count} שאלות הושלמו",
  "longestStreak": "רצף ארוך ביותר: {count}",
  "avgAccuracy": "דיוק ממוצע: {percent}%",
  "weakTopics": "נושאים לחזרה",
  "strongTopics": "נושאים חזקים",
  "practiceAgain": "תרגל שוב",
  "noMoreQuestions": "מייצר שאלות נוספות..."
},
"sessionTypeInfinite": "אינסופי"
```

**Steps:**
1. Add keys to both i18n files
2. Run `npx tsc --noEmit`

---

### Task 4.2: Add 'infinite' to SessionType and types

**File:** `lib/practice/types.ts`

1. Add `'infinite'` to the `SessionType` union (line 90):

```typescript
export type SessionType =
  | 'targeted'
  | 'mixed'
  | 'exam_prep'
  | 'quick'
  | 'custom'
  | 'infinite'   // Never-ending with difficulty calibration
```

2. Add to `PRACTICE_CONFIG.defaultQuestionCounts` (line 469):

```typescript
defaultQuestionCounts: {
  targeted: 10,
  mixed: 15,
  exam_prep: 30,
  quick: 5,
  custom: 10,
  infinite: 3, // Initial batch size
} as Record<SessionType, number>,
```

3. Add to `PRACTICE_CONFIG.minQuestions` (line 491):

```typescript
minQuestions: {
  targeted: 5,
  mixed: 5,
  exam_prep: 10,
  quick: 3,
  custom: 1,
  infinite: 1,
} as Record<SessionType, number>,
```

**Steps:**
1. Edit `lib/practice/types.ts`
2. Run `npx tsc --noEmit` — fix any type errors from code that exhaustively checks SessionType

---

### Task 4.3: Update session creation API to accept 'infinite'

**File:** `app/api/practice/session/route.ts`

Update the `validTypes` array (line 87):

```typescript
const validTypes = ['targeted', 'mixed', 'exam_prep', 'quick', 'custom', 'infinite']
```

**Steps:**
1. Edit the route file
2. Run `npx tsc --noEmit`

---

### Task 4.4: Create the next-batch API route

**New file:** `app/api/practice/session/[sessionId]/next-batch/route.ts`

This endpoint generates/fetches the next micro-batch of 3 questions for an infinite session, adjusting difficulty based on recent performance.

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes, logError } from '@/lib/api/errors'
import { getSession } from '@/lib/practice'
import { selectExistingQuestions, generateAndStoreQuestions } from '@/lib/practice/question-generator'
import type { DifficultyLevel } from '@/lib/adaptive/types'

export const maxDuration = 90

const BATCH_SIZE = 3

interface NextBatchRequest {
  currentDifficulty: number   // 1-5 float
  recentAccuracy: number      // 0-1 float (last 5 questions)
  questionsAnswered: number   // total answered so far
  weakConceptIds?: string[]   // concepts to focus on
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
  try {
    const { sessionId } = await params
    const supabase = await createClient()

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED, 'Please log in')
    }

    // Verify session ownership and type
    const session = await getSession(sessionId)
    if (!session) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Session not found')
    }
    if (session.user_id !== user.id) {
      return createErrorResponse(ErrorCodes.FORBIDDEN, 'Access denied')
    }
    if (session.session_type !== 'infinite') {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Not an infinite session')
    }
    if (session.status !== 'active') {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Session is not active')
    }

    const body = await request.json()
    const { currentDifficulty, recentAccuracy, questionsAnswered, weakConceptIds } = body as NextBatchRequest

    // Calibrate difficulty
    let newDifficulty = currentDifficulty
    if (questionsAnswered > 0 && questionsAnswered % 5 === 0) {
      if (recentAccuracy > 0.85) {
        newDifficulty = Math.min(5, currentDifficulty + 0.1)
      } else if (recentAccuracy < 0.50) {
        newDifficulty = Math.max(1, currentDifficulty - 0.1)
      }
    }

    // Round to nearest integer for DB query (DifficultyLevel is 1-5 int)
    const queryDifficulty = Math.max(1, Math.min(5, Math.round(newDifficulty))) as DifficultyLevel

    // Determine target concepts: rotate to weakest every 10 questions
    const targetConceptIds = (questionsAnswered > 0 && questionsAnswered % 10 === 0 && weakConceptIds?.length)
      ? weakConceptIds.slice(0, 3)
      : undefined

    // Exclude already-used question IDs to avoid repeats
    const usedIds = session.question_order || []

    // Try to select existing questions first
    let questionIds = await selectExistingQuestions({
      courseId: session.course_id || undefined,
      conceptIds: targetConceptIds,
      difficulty: queryDifficulty,
      count: BATCH_SIZE,
      excludeIds: usedIds,
    })

    // If not enough, generate via AI
    if (questionIds.length < BATCH_SIZE && session.course_id) {
      const shortfall = BATCH_SIZE - questionIds.length
      try {
        const { questionIds: newIds } = await generateAndStoreQuestions({
          courseId: session.course_id,
          count: shortfall,
        })
        questionIds = [...questionIds, ...newIds]
      } catch (err) {
        logError('InfiniteBatch:generate', err)
      }
    }

    if (questionIds.length === 0) {
      return createErrorResponse(ErrorCodes.VALIDATION_ERROR, 'No more questions available')
    }

    // Fetch the actual question data
    const { data: questions } = await supabase
      .from('practice_questions')
      .select('*')
      .in('id', questionIds)

    // Append new question IDs to session's question_order
    const updatedOrder = [...usedIds, ...questionIds]
    await supabase
      .from('practice_sessions')
      .update({
        question_order: updatedOrder,
        question_count: updatedOrder.length,
      })
      .eq('id', sessionId)

    return NextResponse.json({
      questions: questions || [],
      newDifficulty,
      batchStartIndex: usedIds.length,
    })
  } catch (error) {
    logError('InfiniteBatch:fetch', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch next batch')
  }
}
```

**Note:** The `selectExistingQuestions` function needs an `excludeIds` parameter. Check if it already supports this. If not, we need to add it.

**Steps:**
1. Check `lib/practice/question-generator.ts` for `selectExistingQuestions` signature
2. If `excludeIds` is not supported, add it (see sub-task below)
3. Create `app/api/practice/session/[sessionId]/next-batch/route.ts`
4. Run `npx tsc --noEmit`

---

### Task 4.4a: Add `excludeIds` parameter to `selectExistingQuestions`

**File:** `lib/practice/question-generator.ts`

Find the `selectExistingQuestions` function and add `excludeIds?: string[]` to its params. In the query builder, add a `.not('id', 'in', excludeIds)` filter when the array is provided.

Find the function signature (it should look like):
```typescript
export async function selectExistingQuestions(params: {
  courseId?: string
  conceptIds?: string[]
  difficulty?: DifficultyLevel
  count: number
}): Promise<string[]> {
```

Change to:
```typescript
export async function selectExistingQuestions(params: {
  courseId?: string
  conceptIds?: string[]
  difficulty?: DifficultyLevel
  count: number
  excludeIds?: string[]
}): Promise<string[]> {
```

Inside the function body, after the initial query builder setup, add:

```typescript
if (params.excludeIds && params.excludeIds.length > 0) {
  // Filter in batches to avoid URL length limits for very long arrays
  const batchSize = 100
  const recentExclude = params.excludeIds.slice(-batchSize) // Only exclude recent to keep URL manageable
  query = query.not('id', 'in', `(${recentExclude.join(',')})`)
}
```

**Steps:**
1. Edit `lib/practice/question-generator.ts`
2. Run `npx tsc --noEmit`

---

### Task 4.5: Create InfiniteHeader component

**New file:** `components/practice/InfiniteHeader.tsx`

Displays streak, rolling accuracy sparkline, total questions answered, difficulty bar, and stop button.

```typescript
'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

interface InfiniteHeaderProps {
  streak: number
  totalAnswered: number
  recentResults: boolean[] // last 20 results (true = correct)
  currentDifficulty: number // 1-5 float
  onStop: () => void
}

export default function InfiniteHeader({
  streak,
  totalAnswered,
  recentResults,
  currentDifficulty,
  onStop,
}: InfiniteHeaderProps) {
  const tp = useTranslations('practice.infinite')

  // Rolling accuracy from last 20
  const rollingAccuracy = useMemo(() => {
    if (recentResults.length === 0) return 0
    const correct = recentResults.filter(Boolean).length
    return Math.round((correct / recentResults.length) * 100)
  }, [recentResults])

  // Difficulty color: green (1) -> yellow (3) -> red (5)
  const difficultyColor = useMemo(() => {
    if (currentDifficulty <= 2) return 'bg-green-500'
    if (currentDifficulty <= 3.5) return 'bg-amber-500'
    return 'bg-red-500'
  }, [currentDifficulty])

  const difficultyPercent = ((currentDifficulty - 1) / 4) * 100

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Streak */}
          <div className="flex items-center gap-2">
            <motion.span
              key={streak}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="text-2xl"
            >
              {streak > 0 ? '🔥' : '💪'}
            </motion.span>
            <div className="text-start">
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                {streak}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{tp('streak')}</p>
            </div>
          </div>

          {/* Accuracy sparkline (mini bar chart of last 20) */}
          <div className="flex-1 max-w-[120px]">
            <div className="flex items-end gap-px h-6">
              {recentResults.slice(-20).map((correct, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-sm transition-all ${
                    correct
                      ? 'bg-green-400 dark:bg-green-500 h-full'
                      : 'bg-red-300 dark:bg-red-500 h-1/2'
                  }`}
                />
              ))}
              {/* Pad empty slots */}
              {Array.from({ length: Math.max(0, 20 - recentResults.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-t-sm" />
              ))}
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-0.5">
              {rollingAccuracy}%
            </p>
          </div>

          {/* Total & Difficulty */}
          <div className="text-end">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {totalAnswered}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{tp('totalAnswered')}</p>
            {/* Difficulty bar */}
            <div className="mt-1 w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${difficultyColor} rounded-full transition-all duration-500`}
                style={{ width: `${difficultyPercent}%` }}
              />
            </div>
          </div>

          {/* Stop button */}
          <button
            onClick={onStop}
            className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {tp('stop')}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Steps:**
1. Create `components/practice/InfiniteHeader.tsx`
2. Run `npx tsc --noEmit`

---

### Task 4.6: Modify PracticeSessionContent to handle infinite sessions

**File:** `app/(main)/practice/[sessionId]/PracticeSessionContent.tsx`

This is the biggest change. We need to:

1. Detect if `session.session_type === 'infinite'`
2. When infinite: show `InfiniteHeader` instead of `ProgressBar`
3. Track streak, recentResults, currentDifficulty locally
4. When approaching the end of the current question list, pre-fetch the next batch
5. Never show "complete" automatically — only when user clicks "Stop"
6. Replace `SessionComplete` with an infinite-specific summary when stopped

**Add imports at the top of the file:**

```typescript
import dynamic from 'next/dynamic'
// ... existing imports ...

const InfiniteHeader = dynamic(() => import('@/components/practice/InfiniteHeader'), { ssr: false })
```

**Add infinite-specific state** (after the existing state block around line 444):

```typescript
// Infinite mode state
const isInfinite = session.session_type === 'infinite'
const [infiniteStreak, setInfiniteStreak] = useState(0)
const [infiniteLongestStreak, setInfiniteLongestStreak] = useState(0)
const [infiniteRecentResults, setInfiniteRecentResults] = useState<boolean[]>([])
const [currentDifficulty, setCurrentDifficulty] = useState(session.target_difficulty || 3)
const [isFetchingBatch, setIsFetchingBatch] = useState(false)
const [allQuestions, setAllQuestions] = useState(questions) // Mutable list for infinite
const [showStopConfirm, setShowStopConfirm] = useState(false)
```

**Add batch pre-fetch logic** (new function):

```typescript
const fetchNextBatch = useCallback(async () => {
  if (isFetchingBatch || !isInfinite) return
  setIsFetchingBatch(true)
  try {
    // Calculate recent accuracy from last 5
    const last5 = infiniteRecentResults.slice(-5)
    const recentAccuracy = last5.length > 0 ? last5.filter(Boolean).length / last5.length : 0.5

    // Find weak concepts from wrong answers
    const weakConceptIds: string[] = [] // Could be populated from answer tracking

    const res = await fetch(`/api/practice/session/${session.id}/next-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentDifficulty,
        recentAccuracy,
        questionsAnswered: answeredCount,
        weakConceptIds: weakConceptIds.length ? weakConceptIds : undefined,
      }),
    })

    if (!res.ok) throw new Error('Batch fetch failed')
    const data = await res.json()

    if (data.questions?.length > 0) {
      setAllQuestions(prev => [...prev, ...data.questions])
    }
    if (data.newDifficulty !== undefined) {
      setCurrentDifficulty(data.newDifficulty)
    }
  } catch {
    // Non-critical: will try again before next question
  } finally {
    setIsFetchingBatch(false)
  }
}, [isFetchingBatch, isInfinite, infiniteRecentResults, currentDifficulty, answeredCount, session.id])
```

**Modify `handleNext`** to handle infinite mode. The key changes:
- Use `allQuestions` instead of `questions` for the length check
- When within 1 question of the end of `allQuestions`, trigger `fetchNextBatch()`
- Never auto-complete for infinite sessions

In the existing `handleNext` callback, wrap the completion check:

```typescript
const handleNext = useCallback(async () => {
  stopExplanationTracking()

  const nextIndex = currentIndex + 1
  const questionList = isInfinite ? allQuestions : questions

  // Pre-fetch next batch if close to end of available questions
  if (isInfinite && nextIndex >= questionList.length - 1) {
    fetchNextBatch()
  }

  if (!isInfinite && nextIndex >= questionList.length) {
    // ... existing completion logic ...
  } else if (isInfinite && nextIndex >= questionList.length) {
    // Infinite mode: wait for batch, show loading state
    // The fetchNextBatch call above should populate allQuestions
    // If still no questions, stay on current (batch fetch in progress)
    if (isFetchingBatch) {
      // Wait — user will see loading indicator
      return
    }
    // Fallback: try fetching now
    fetchNextBatch()
    return
  } else {
    setCurrentIndex(nextIndex)
    setView('question')
    setLastResult(null)
    startTimeRef.current = Date.now()
  }
}, [/* ... existing deps, add isInfinite, allQuestions, fetchNextBatch, isFetchingBatch */])
```

**Update `handleAnswer` for infinite tracking.** After the result is received (in the existing try block after `setLastResult(result)`):

```typescript
// Infinite mode: track streak and recent results
if (isInfinite) {
  const correct = result.isCorrect
  setInfiniteRecentResults(prev => [...prev.slice(-19), correct])
  if (correct) {
    setInfiniteStreak(prev => {
      const newStreak = prev + 1
      setInfiniteLongestStreak(longest => Math.max(longest, newStreak))
      return newStreak
    })
  } else {
    setInfiniteStreak(0)
  }
}
```

**Update the render section.** Use `allQuestions` for infinite mode:

```typescript
// Current question - use allQuestions for infinite
const currentQuestion = isInfinite ? allQuestions[currentIndex] : questions[currentIndex]
```

Replace the `ProgressBar` usage with conditional rendering:

```typescript
{/* Progress */}
{isInfinite ? (
  <InfiniteHeader
    streak={infiniteStreak}
    totalAnswered={answeredCount}
    recentResults={infiniteRecentResults}
    currentDifficulty={currentDifficulty}
    onStop={() => setShowStopConfirm(true)}
  />
) : (
  <ProgressBar current={answeredCount} total={questions.length} correct={correctCount} />
)}
```

**Add infinite loading indicator.** When `isFetchingBatch && !currentQuestion`:

```typescript
{isFetchingBatch && !currentQuestion && (
  <div className="flex flex-col items-center justify-center py-12 gap-3">
    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    <p className="text-sm text-gray-500 dark:text-gray-400">{tp('infinite.generatingNext')}</p>
  </div>
)}
```

**Update the complete view for infinite.** In the `view === 'complete'` section, add an infinite-specific summary:

```typescript
if (view === 'complete') {
  if (isInfinite) {
    const avgAccuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
    return (
      <div className="min-h-screen bg-transparent py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-[22px] shadow-card p-8 border border-gray-200 dark:border-gray-700 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {tp('infinite.sessionSummary')}
            </h2>
            <div className="grid grid-cols-3 gap-4 my-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{answeredCount}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{tp('infinite.totalAnswered')}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{avgAccuracy}%</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{tp('page.accuracy')}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{infiniteLongestStreak}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{tp('infinite.streak')}</p>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <Link
                href="/practice"
                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
              >
                {tp('page.backToDashboard')}
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
              >
                {tp('page.goToDashboard')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ... existing SessionComplete render ...
}
```

**Handle stop confirmation.** Add a second ConfirmModal for infinite stop (near the existing quit confirm):

```typescript
{/* Infinite Stop Confirm */}
<ConfirmModal
  isOpen={showStopConfirm}
  onClose={() => setShowStopConfirm(false)}
  onConfirm={async () => {
    setShowStopConfirm(false)
    // Complete the session
    try {
      await fetch(`/api/practice/session/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      })
    } catch { /* Continue anyway */ }
    setView('complete')
  }}
  title={tp('infinite.stop')}
  message={tp('infinite.stopConfirm')}
  variant="warning"
/>
```

**Steps:**
1. Edit `PracticeSessionContent.tsx` with all changes above
2. Add the `dynamic` import for `InfiniteHeader`
3. Run `npx tsc --noEmit`

---

### Task 4.7: Add "Infinite" button to practice page session type selection

**File:** `app/(main)/practice/page.tsx`

This is a large file. The practice page currently uses the `'mixed'` session type. We need to find where sessions are started and add an infinite mode entry point.

Search for the section where the practice session is initiated (the "Start Practice" button area). The practice page appears to be a self-contained practice flow rather than redirecting to `PracticeSessionContent`. We need to add a button/card for "Infinite Practice" that creates a session with `sessionType: 'infinite'` and redirects to `/practice/{sessionId}`.

Add a new button in the setup/hub view. Find the setup section and add an "Infinite Practice" card:

```typescript
{/* Infinite Practice Card */}
<button
  onClick={async () => {
    try {
      const res = await fetch('/api/practice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: 'infinite',
          courseId: selectedCourse || undefined,
        }),
      })
      const data = await res.json()
      if (data.sessionId) {
        router.push(`/practice/${data.sessionId}`)
      }
    } catch {
      showError('Failed to start infinite practice')
    }
  }}
  className="w-full p-4 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-200 dark:border-violet-800 rounded-xl hover:shadow-md transition-all text-start"
>
  <div className="flex items-center gap-3">
    <span className="text-2xl">∞</span>
    <div>
      <p className="font-semibold text-gray-900 dark:text-white">{tp('infinite.title')}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{tp('infinite.subtitle')}</p>
    </div>
  </div>
</button>
```

The exact placement depends on the practice page layout. Look for other session-type buttons or the setup view and add this alongside them.

**Steps:**
1. Find the appropriate location in the practice page
2. Add the infinite practice button
3. Run `npx tsc --noEmit`

---

### Task 4.8: Add "Keep Going" button to SessionComplete

**File:** `app/(main)/practice/[sessionId]/PracticeSessionContent.tsx`

In the existing `SessionComplete` component (the non-infinite one, around line 370), add a "Keep Going - Infinite Mode" button between the two existing action links. This button creates a new infinite session and redirects.

Add to the `SessionCompleteProps` interface:

```typescript
interface SessionCompleteProps {
  session: PracticeSession
  answeredCount: number
  correctCount: number
  onStartInfinite?: () => void
}
```

Add the button inside the `SessionComplete` component's actions div (between "Back to Practice Hub" and "Go to Dashboard"):

```typescript
{onStartInfinite && (
  <button
    onClick={onStartInfinite}
    className="flex-1 py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium rounded-lg transition-colors"
  >
    ∞ {tp('infinite.keepGoing')}
  </button>
)}
```

Pass the handler from the parent. In the parent's `SessionComplete` usage (around line 631):

```typescript
<SessionComplete
  session={session}
  answeredCount={answeredCount}
  correctCount={correctCount}
  onStartInfinite={async () => {
    try {
      const res = await fetch('/api/practice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: 'infinite',
          courseId: session.course_id || undefined,
        }),
      })
      const data = await res.json()
      if (data.sessionId) {
        router.push(`/practice/${data.sessionId}`)
      }
    } catch {
      showError('Failed to start infinite practice')
    }
  }}
/>
```

**Steps:**
1. Edit `PracticeSessionContent.tsx` — update `SessionComplete` component and its usage
2. Run `npx tsc --noEmit`

---

### Task 4.9: Update session-manager to handle infinite sessions

**File:** `lib/practice/session-manager.ts`

In `createPracticeSession`, infinite sessions should start with a small initial batch (3 questions) rather than the full set. The existing logic already handles this because:
- `questionCount` will be `3` from `PRACTICE_CONFIG.defaultQuestionCounts.infinite`
- The rest works as normal

One change needed: in `completeSession`, handle infinite sessions slightly differently — record `total_time_seconds` and do not calculate `accuracy` as a fraction (it's already a count-based stat).

Verify the existing `completeSession` handles this gracefully. No change should be needed since it already uses `session.questions_answered` and `session.questions_correct`.

**Steps:**
1. Verify `createPracticeSession` and `completeSession` handle `'infinite'` correctly
2. If any switch/exhaustive-check on SessionType exists, add `'infinite'` case
3. Run `npx tsc --noEmit`

---

### Task 4.10: Full type check and browser test

**Steps:**
1. Run `npx tsc --noEmit` — fix all errors
2. Run `npm run build` — verify build succeeds
3. **Browser test — Infinite Practice:**
   - Go to practice page, find "Infinite Practice" button
   - Click it — should redirect to session page
   - Answer 3 questions — next batch should auto-load
   - Answer 5+ questions — check difficulty change in header
   - Click "Stop" — see infinite session summary
4. **Browser test — "Keep Going" on SessionComplete:**
   - Complete a normal practice session
   - See "Keep Going — Infinite Mode" button
   - Click it — should create and redirect to infinite session

---

### Task 4.11: Commit Feature #4

```bash
git add \
  messages/en/practice.json \
  messages/he/practice.json \
  lib/practice/types.ts \
  lib/practice/session-manager.ts \
  lib/practice/question-generator.ts \
  app/api/practice/session/route.ts \
  app/api/practice/session/\[sessionId\]/next-batch/route.ts \
  components/practice/InfiniteHeader.tsx \
  app/\(main\)/practice/\[sessionId\]/PracticeSessionContent.tsx \
  app/\(main\)/practice/page.tsx

git commit -m "feat: add Infinite Practice Mode with real-time difficulty calibration

- New 'infinite' session type with micro-batches of 3 questions
- InfiniteHeader component: streak indicator, rolling accuracy sparkline, difficulty bar
- Difficulty calibrates every 5 questions: >85% accuracy increases, <50% decreases
- Topic rotation to weakest concepts every 10 questions
- Next-batch API pre-fetches questions as buffer runs low
- 'Keep Going' button on SessionComplete to enter infinite mode
- Calm 'Stop' button always visible for session exit
- i18n keys for EN and HE
- excludeIds support in question selector to prevent repeats"
```

---

## Final Verification Checklist

After all 3 features are implemented:

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] Feature #2: "Go Deeper" button appears on all non-question lesson steps
- [ ] Feature #2: Sub-steps render in accordion with depth indicators
- [ ] Feature #2: Nested expansion works (depth 2)
- [ ] Feature #2: Quick-check inline input works
- [ ] Feature #2: Cached expansions load instantly on revisit
- [ ] Feature #3: Wrong answer triggers worked example card
- [ ] Feature #3: Steps display sequentially with KaTeX math
- [ ] Feature #3: "Try a Similar One" works; wrong answer triggers second example
- [ ] Feature #3: Max 2 examples per problem enforced
- [ ] Feature #4: "Infinite" button on practice page creates infinite session
- [ ] Feature #4: InfiniteHeader shows streak, sparkline, difficulty bar
- [ ] Feature #4: Batch pre-fetching works (no dead-end at question 3)
- [ ] Feature #4: Difficulty adjusts after 5 questions
- [ ] Feature #4: "Stop" button ends session and shows summary
- [ ] Feature #4: "Keep Going" button on SessionComplete works
- [ ] All features work in Hebrew (RTL layout)
- [ ] All features work on mobile (375px width)
- [ ] All features work in dark mode
