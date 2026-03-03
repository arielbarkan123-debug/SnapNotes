# Batch 2: Homework Enhancements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three new homework checker modes (batch worksheet, before-submit, rubric) and a "Practice This" button that creates targeted practice from homework errors.

**Architecture:** All four features extend the existing homework checker (`app/api/homework/check/route.ts` + `lib/homework/checker-engine.ts`). Features #7, #8, #9 add new `mode` values to the checker. Feature #6 adds a button to feedback items that creates practice sessions.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind CSS, Framer Motion, Claude Vision API, i18n (next-intl)

---

## Existing File Inventory

| File | Lines | Purpose |
|------|-------|---------|
| `lib/homework/types.ts` | 518 | All homework type definitions |
| `lib/homework/checker-engine.ts` | 1,686 | `analyzeHomework()` — three-phase pipeline |
| `app/api/homework/check/route.ts` | 358 | POST (streaming NDJSON), GET (list checks) |
| `app/api/homework/check/[checkId]/route.ts` | 86 | GET (single check), DELETE |
| `app/(main)/homework/check/page.tsx` | ~900 | Upload form (image/text tabs) |
| `app/(main)/homework/[sessionId]/page.tsx` | 929 | Results page (grade, feedback, annotations) |
| `components/homework/index.ts` | 11 | Barrel exports |
| `messages/en/homework.json` | 184 keys | English i18n |
| `messages/he/homework.json` | 198 keys | Hebrew i18n |
| `lib/practice/types.ts` | 511 | Practice session types |
| `app/api/practice/session/route.ts` | 118 | POST/GET practice sessions |

## Current Type Signatures

```typescript
// lib/homework/checker-engine.ts
export interface CheckerInput {
  inputMode: InputMode // 'image' | 'text'
  taskImageUrl?: string
  answerImageUrl?: string
  referenceImageUrls?: string[]
  teacherReviewUrls?: string[]
  taskText?: string
  answerText?: string
  taskDocumentText?: string
  answerDocumentText?: string
}

export interface CheckerOutput {
  feedback: HomeworkFeedback
  subject: string
  topic: string
  taskText: string
  answerText: string
}
```

---

## Phase 1: Types & Shared Infrastructure

### Task 1.1: Add `CheckMode` type and extend `CheckerInput`

**File:** `lib/homework/types.ts`

Add after line 11 (after `export type GradeLevel = ...`):

```typescript
/** Homework checker mode — determines what type of analysis to run */
export type CheckMode = 'standard' | 'batch_worksheet' | 'before_submit' | 'rubric'
```

Add to `CreateCheckRequest` interface (after `answerDocumentText` field, around line 132):

```typescript
  // Checker mode
  mode?: CheckMode

  // Batch worksheet mode: additional answer page images (up to 3 more)
  additionalImageUrls?: string[]

  // Before-submit mode flag
  beforeSubmit?: boolean

  // Rubric mode: rubric image URLs
  rubricImageUrls?: string[]
```

**Test:** `npx tsc --noEmit`

---

### Task 1.2: Add Batch Worksheet result types

**File:** `lib/homework/types.ts`

Add at end of file, before the legacy types section (before line 217, `// Legacy Types`):

```typescript
// ============================================================================
// Batch Worksheet Mode Types
// ============================================================================

export interface BatchWorksheetItem {
  problemNumber: number | string
  problemText: string
  studentAnswer: string
  correctAnswer: string
  isCorrect: boolean | null // null = unclear/unreadable
  explanation: string
  topic: string
  errorType?: 'factual' | 'conceptual' | 'calculation' | 'formatting' | 'incomplete'
}

export interface BatchWorksheetResult {
  mode: 'batch_worksheet'
  totalProblems: number
  correct: number
  incorrect: number
  unclear: number
  items: BatchWorksheetItem[]
  topicBreakdown: Record<string, { correct: number; total: number }>
  /** Overall percentage score */
  score: number
}
```

**Test:** `npx tsc --noEmit`

---

### Task 1.3: Add Before-Submit result types

**File:** `lib/homework/types.ts`

Add directly below the batch worksheet types:

```typescript
// ============================================================================
// Before-Submit Mode Types
// ============================================================================

export type BeforeSubmitStatus = 'correct' | 'check_again' | 'needs_rework' | 'unclear'

export interface BeforeSubmitItem {
  problemIndex: number
  problemText: string
  status: BeforeSubmitStatus
  /** Three escalating hints: gentle nudge → stronger hint → near-answer */
  hints: [string, string, string]
}

export interface BeforeSubmitResult {
  mode: 'before_submit'
  items: BeforeSubmitItem[]
  summary: {
    correct: number
    checkAgain: number
    needsRework: number
    unclear: number
    total: number
  }
}
```

**Test:** `npx tsc --noEmit`

---

### Task 1.4: Add Rubric result types

**File:** `lib/homework/types.ts`

Add directly below the before-submit types:

```typescript
// ============================================================================
// Rubric Mode Types
// ============================================================================

export interface RubricCriterion {
  criterion: string
  maxPoints: number
  earnedPoints: number
  percentage: number
  reasoning: string
  suggestions: string
}

export interface RubricResult {
  mode: 'rubric'
  rubricBreakdown: RubricCriterion[]
  totalEarned: number
  totalPossible: number
  percentage: number
  estimatedGrade: string
  /** Standard feedback items, each tagged with a rubric criterion */
  taggedFeedback: Array<FeedbackPoint & { rubricCriterion: string }>
}
```

**Test:** `npx tsc --noEmit`

---

### Task 1.5: Add unified `CheckerResult` union type

**File:** `lib/homework/types.ts`

Add directly below the rubric types:

```typescript
// ============================================================================
// Unified Checker Result (all modes)
// ============================================================================

/**
 * Extended output from the checker engine that includes mode-specific results.
 * The `feedback` field is always populated for backward compatibility.
 * Mode-specific result is in `modeResult` when mode !== 'standard'.
 */
export interface ExtendedCheckerOutput {
  feedback: HomeworkFeedback
  subject: string
  topic: string
  taskText: string
  answerText: string
  mode: CheckMode
  modeResult?: BatchWorksheetResult | BeforeSubmitResult | RubricResult
}
```

**Test:** `npx tsc --noEmit`

---

### Task 1.6: Extend `CheckerInput` in checker-engine.ts

**File:** `lib/homework/checker-engine.ts`

Update the `CheckerInput` interface (around line 376) — add after `answerDocumentText`:

```typescript
  // Mode-specific fields
  mode?: CheckMode
  additionalImageUrls?: string[]
  rubricImageUrls?: string[]
```

Add `CheckMode` to the import from `./types` (around line 16):

```typescript
import type {
  HomeworkFeedback,
  GradeLevel,
  AnnotatedFeedbackPoint,
  AnnotationRegion,
  AnnotationData,
  InputMode,
  CheckMode,
  SolutionSet,
  VerifiedProblem,
  StudentAnswerSet,
  FeedbackPoint,
  BatchWorksheetResult,
  BatchWorksheetItem,
  BeforeSubmitResult,
  BeforeSubmitItem,
  BeforeSubmitStatus,
  RubricResult,
  RubricCriterion,
  ExtendedCheckerOutput,
} from './types'
```

Update `CheckerOutput` to use `ExtendedCheckerOutput` — change:

```typescript
export interface CheckerOutput {
  feedback: HomeworkFeedback
  subject: string
  topic: string
  taskText: string
  answerText: string
}
```

to:

```typescript
export type CheckerOutput = ExtendedCheckerOutput
```

**Test:** `npx tsc --noEmit`

---

### Task 1.7: Add `mode` column to database

**File:** `supabase/migrations/20260302_homework_check_modes.sql` (NEW)

```sql
-- ============================================================================
-- Add mode and mode_result columns to homework_checks
-- Supports batch worksheet, before-submit, and rubric modes
-- ============================================================================

-- Add mode column (defaults to 'standard' for existing checks)
ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'standard'
CHECK (mode IN ('standard', 'batch_worksheet', 'before_submit', 'rubric'));

-- Add mode_result column for storing mode-specific JSON results
ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS mode_result JSONB;

-- Add rubric_image_urls column for rubric mode
ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS rubric_image_urls TEXT[] DEFAULT '{}';

-- Add additional_image_urls column for batch worksheet mode
ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS additional_image_urls TEXT[] DEFAULT '{}';

-- Add practice_completed column for tracking practice-from-mistakes
ALTER TABLE homework_checks
ADD COLUMN IF NOT EXISTS practiced_items JSONB DEFAULT '[]'::jsonb;

-- Index on mode for filtering
CREATE INDEX IF NOT EXISTS homework_checks_mode_idx ON homework_checks(mode);

-- Comments
COMMENT ON COLUMN homework_checks.mode IS 'Checker mode: standard, batch_worksheet, before_submit, or rubric';
COMMENT ON COLUMN homework_checks.mode_result IS 'Mode-specific result JSON (BatchWorksheetResult, BeforeSubmitResult, or RubricResult)';
COMMENT ON COLUMN homework_checks.rubric_image_urls IS 'Rubric image URLs for rubric mode';
COMMENT ON COLUMN homework_checks.additional_image_urls IS 'Additional worksheet page images for batch worksheet mode';
COMMENT ON COLUMN homework_checks.practiced_items IS 'Array of {problemIndex, practiceSessionId} for practiced mistakes';
```

**Test:** Run migration via Supabase Dashboard SQL Editor.

---

### Task 1.8: Update `HomeworkCheck` type to include new columns

**File:** `lib/homework/types.ts`

Update the `HomeworkCheck` interface (around line 13). Add after `teacher_review_text`:

```typescript
  // Mode
  mode: CheckMode
  mode_result: BatchWorksheetResult | BeforeSubmitResult | RubricResult | null
  rubric_image_urls: string[]
  additional_image_urls: string[]
  practiced_items: Array<{ problemIndex: number; practiceSessionId: string }> | null
```

**Test:** `npx tsc --noEmit`

**Commit:** `feat: add types and DB schema for homework checker modes (batch worksheet, before-submit, rubric)`

---

## Phase 2: Feature #7 — Batch Worksheet Mode

### Task 2.1: Add batch worksheet analysis function to checker engine

**File:** `lib/homework/checker-engine.ts`

Add a new function before `analyzeHomework()` (before line 403):

```typescript
// ============================================================================
// BATCH WORKSHEET MODE
// ============================================================================

/**
 * Analyze a full worksheet with multiple problems from 1-4 images.
 * All problems are analyzed in a single Claude Vision call.
 */
async function analyzeWorksheetBatch(
  client: Anthropic,
  imageContents: Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }>,
  referenceContent: string | null
): Promise<{ worksheetResult: BatchWorksheetResult; subject: string; topic: string; taskText: string }> {
  const referenceBlock = referenceContent
    ? `\n\nREFERENCE MATERIAL:\n${referenceContent}`
    : ''

  const systemPrompt = `You are a meticulous homework grader. You will receive 1-4 photos of a student's worksheet.

TASK: Identify EVERY problem on the worksheet pages. For each problem, extract:
1. The problem number/label
2. The problem text (the question being asked)
3. The student's written answer
4. The correct answer (solve it yourself)
5. Whether the student's answer is correct, incorrect, or unclear/unreadable
6. A brief explanation of any error
7. The mathematical/subject topic this problem tests
8. The error type if incorrect

RULES:
- Be thorough — do NOT skip any problems
- If a student's handwriting is unreadable, mark isCorrect as null
- Solve each problem independently to verify correctness
- Identify the topic for each problem (e.g., "fractions", "linear equations", "area")
- Detect the language of the worksheet and respond in that language${referenceBlock}

Respond ONLY with valid JSON matching this exact schema:
{
  "subject": "string (e.g., math, physics, chemistry)",
  "topic": "string (overall worksheet topic)",
  "items": [
    {
      "problemNumber": "number or string",
      "problemText": "the question",
      "studentAnswer": "what the student wrote",
      "correctAnswer": "the actual correct answer",
      "isCorrect": true | false | null,
      "explanation": "explanation of error or confirmation of correctness",
      "topic": "specific topic for this problem",
      "errorType": "factual | conceptual | calculation | formatting | incomplete (only if incorrect)"
    }
  ]
}`

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContents,
          { type: 'text', text: 'Analyze all problems on this worksheet. Return JSON.' },
        ],
      },
    ],
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  const parsed = JSON.parse(jsonStr)
  const items: BatchWorksheetItem[] = (parsed.items || []).map((item: Record<string, unknown>) => ({
    problemNumber: item.problemNumber ?? '?',
    problemText: String(item.problemText || ''),
    studentAnswer: String(item.studentAnswer || ''),
    correctAnswer: String(item.correctAnswer || ''),
    isCorrect: item.isCorrect === null ? null : Boolean(item.isCorrect),
    explanation: String(item.explanation || ''),
    topic: String(item.topic || ''),
    errorType: item.errorType as BatchWorksheetItem['errorType'],
  }))

  const correct = items.filter((i) => i.isCorrect === true).length
  const incorrect = items.filter((i) => i.isCorrect === false).length
  const unclear = items.filter((i) => i.isCorrect === null).length
  const total = items.length
  const scoreDenom = total - unclear
  const score = scoreDenom > 0 ? Math.round((correct / scoreDenom) * 100) : 0

  // Build topic breakdown
  const topicBreakdown: Record<string, { correct: number; total: number }> = {}
  for (const item of items) {
    const t = item.topic || 'Other'
    if (!topicBreakdown[t]) topicBreakdown[t] = { correct: 0, total: 0 }
    topicBreakdown[t].total++
    if (item.isCorrect === true) topicBreakdown[t].correct++
  }

  // Build combined task text from all problems
  const taskText = items
    .map((item) => `${item.problemNumber}. ${item.problemText}`)
    .join('\n')

  const worksheetResult: BatchWorksheetResult = {
    mode: 'batch_worksheet',
    totalProblems: total,
    correct,
    incorrect,
    unclear,
    items,
    topicBreakdown,
    score,
  }

  return {
    worksheetResult,
    subject: String(parsed.subject || 'math'),
    topic: String(parsed.topic || 'worksheet'),
    taskText,
  }
}
```

**Test:** `npx tsc --noEmit`

---

### Task 2.2: Wire batch worksheet mode into `analyzeHomework()`

**File:** `lib/homework/checker-engine.ts`

In the `analyzeHomework()` function (around line 403), add a mode check right after the text mode branch (after line 413: `return analyzeHomeworkText(client, input)`). Add before the three-phase pipeline section:

```typescript
    // ============================================================================
    // MODE ROUTING: Batch Worksheet / Before-Submit / Rubric
    // ============================================================================
    const mode: CheckMode = input.mode || 'standard'

    if (mode === 'batch_worksheet') {
      console.log('[Checker] Batch worksheet mode — analyzing full worksheet...')
      if (!input.taskImageUrl) {
        throw new Error(formatEngineError(ENGINE_ERROR_CODES.ENG_IMG_004, 'Task image URL is required for batch worksheet mode'))
      }

      // Collect all worksheet images (task + additional pages)
      const allImageUrls = [input.taskImageUrl, ...(input.additionalImageUrls || [])]
      const imageContents = await Promise.all(
        allImageUrls.filter(Boolean).map((url) => fetchImageAsBase64Content(url!))
      )

      // Fetch reference content if provided
      let referenceContent: string | null = null
      if (input.referenceImageUrls?.length) {
        const refImages = await Promise.all(
          input.referenceImageUrls.map((url) => fetchImageAsBase64Content(url))
        )
        // We'll add reference images to the prompt context
        referenceContent = `[${refImages.length} reference image(s) provided]`
      }

      const { worksheetResult, subject, topic, taskText } = await analyzeWorksheetBatch(
        client,
        imageContents,
        referenceContent
      )

      // Build a minimal HomeworkFeedback for backward compatibility
      const correctPoints: FeedbackPoint[] = worksheetResult.items
        .filter((i) => i.isCorrect === true)
        .slice(0, 5)
        .map((i) => ({ title: `Problem ${i.problemNumber}`, description: i.explanation }))

      const improvementPoints: FeedbackPoint[] = worksheetResult.items
        .filter((i) => i.isCorrect === false)
        .map((i) => ({
          title: `Problem ${i.problemNumber}: ${i.topic}`,
          description: i.explanation,
          severity: (i.errorType === 'conceptual' || i.errorType === 'factual') ? 'major' as const : 'minor' as const,
        }))

      const gradeLevel: GradeLevel = worksheetResult.score >= 90 ? 'excellent'
        : worksheetResult.score >= 70 ? 'good'
        : worksheetResult.score >= 50 ? 'needs_improvement'
        : 'incomplete'

      const feedback: HomeworkFeedback = {
        gradeLevel,
        gradeEstimate: `${worksheetResult.score}/100`,
        summary: `Worksheet: ${worksheetResult.correct}/${worksheetResult.totalProblems} correct (${worksheetResult.score}%)`,
        correctPoints,
        improvementPoints,
        suggestions: Object.entries(worksheetResult.topicBreakdown)
          .filter(([, v]) => v.correct < v.total)
          .map(([topic, v]) => `Review ${topic}: ${v.correct}/${v.total} correct`),
        teacherStyleNotes: null,
        expectationComparison: null,
        encouragement: worksheetResult.score >= 80
          ? 'Great work on this worksheet! Keep it up!'
          : 'Keep practicing — each worksheet makes you stronger!',
      }

      return {
        feedback,
        subject,
        topic,
        taskText,
        answerText: '',
        mode: 'batch_worksheet',
        modeResult: worksheetResult,
      }
    }
```

**Test:** `npx tsc --noEmit`

---

### Task 2.3: Add i18n keys for batch worksheet mode

**File:** `messages/en/homework.json`

Add to the `"check"` object (after `"answerTextPlaceholderNote"`):

```json
    "modeStandard": "Standard Check",
    "modeBatchWorksheet": "Full Worksheet",
    "modeBeforeSubmit": "Before Submit",
    "modeRubric": "Rubric Check",
    "modeLabel": "Check Mode",
    "batchWorksheetDesc": "Upload 1-4 pages of a worksheet to check all problems at once",
    "additionalPages": "Additional Pages",
    "addPage": "Add Page",
    "pageOf": "Page {current} of {total}",
    "removePage": "Remove",
    "maxPages": "Maximum 4 pages"
```

Add to the `"results"` object (after `"startPractice"`):

```json
    ,
    "worksheetResults": "Worksheet Results",
    "problemsChecked": "{correct}/{total} correct",
    "worksheetScore": "Score: {score}%",
    "topicBreakdown": "Topic Breakdown",
    "problemNumber": "Problem {number}",
    "correct": "Correct",
    "incorrect": "Incorrect",
    "unclear": "Unclear",
    "studentWrote": "You wrote",
    "correctAnswerIs": "Correct answer",
    "errorExplanation": "Explanation",
    "worksheetSummary": "{correct} correct, {incorrect} incorrect, {unclear} unclear out of {total} problems",
    "expandProblem": "View details",
    "collapseProblem": "Hide details",
    "practiceThis": "Practice This",
    "practiced": "Practiced",
    "runFullCheck": "Run Full Check",
    "beforeSubmitBanner": "Before-Submit Mode — answers are hidden",
    "looksCorrect": "Looks correct",
    "checkAgain": "Check this again",
    "needsRework": "This needs rework",
    "getHintBtn": "Get Hint",
    "hintLevel": "Hint {level}/3",
    "rubricResults": "Rubric Results",
    "criterion": "Criterion",
    "earned": "Earned",
    "maxPts": "Max",
    "rubricScore": "{earned}/{possible} ({grade})",
    "rubricSuggestions": "Suggestions",
    "rubricReasoning": "Reasoning",
    "noRubricCriteria": "No rubric criteria detected"
```

**File:** `messages/he/homework.json`

Add to the `"check"` object (after `"answerTextPlaceholderNote"`):

```json
    "modeStandard": "בדיקה רגילה",
    "modeBatchWorksheet": "דף עבודה מלא",
    "modeBeforeSubmit": "לפני הגשה",
    "modeRubric": "בדיקה לפי מחוון",
    "modeLabel": "מצב בדיקה",
    "batchWorksheetDesc": "העלה 1-4 עמודים של דף עבודה לבדיקת כל התרגילים בבת אחת",
    "additionalPages": "עמודים נוספים",
    "addPage": "הוסף עמוד",
    "pageOf": "עמוד {current} מתוך {total}",
    "removePage": "הסר",
    "maxPages": "מקסימום 4 עמודים"
```

Add to the `"results"` object (after `"startPractice"`):

```json
    ,
    "worksheetResults": "תוצאות דף העבודה",
    "problemsChecked": "{correct}/{total} נכונים",
    "worksheetScore": "ציון: {score}%",
    "topicBreakdown": "פירוט לפי נושא",
    "problemNumber": "תרגיל {number}",
    "correct": "נכון",
    "incorrect": "שגוי",
    "unclear": "לא ברור",
    "studentWrote": "כתבת",
    "correctAnswerIs": "תשובה נכונה",
    "errorExplanation": "הסבר",
    "worksheetSummary": "{correct} נכונים, {incorrect} שגויים, {unclear} לא ברורים מתוך {total} תרגילים",
    "expandProblem": "הצג פרטים",
    "collapseProblem": "הסתר פרטים",
    "practiceThis": "תרגל את זה",
    "practiced": "תורגל",
    "runFullCheck": "הרץ בדיקה מלאה",
    "beforeSubmitBanner": "מצב לפני הגשה — התשובות מוסתרות",
    "looksCorrect": "נראה נכון",
    "checkAgain": "בדוק שוב",
    "needsRework": "דורש תיקון",
    "getHintBtn": "קבל רמז",
    "hintLevel": "רמז {level}/3",
    "rubricResults": "תוצאות מחוון",
    "criterion": "קריטריון",
    "earned": "הושג",
    "maxPts": "מקסימום",
    "rubricScore": "{earned}/{possible} ({grade})",
    "rubricSuggestions": "הצעות",
    "rubricReasoning": "נימוק",
    "noRubricCriteria": "לא זוהו קריטריוני מחוון"
```

**Test:** `npx tsc --noEmit`

---

### Task 2.4: Create `WorksheetTile` component

**File:** `components/homework/WorksheetTile.tsx` (NEW)

```typescript
'use client'

import { motion } from 'framer-motion'
import type { BatchWorksheetItem } from '@/lib/homework/types'

interface WorksheetTileProps {
  item: BatchWorksheetItem
  isExpanded: boolean
  onClick: () => void
}

function getTileColor(isCorrect: boolean | null) {
  if (isCorrect === true) return {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-700 dark:text-green-400',
    icon: '✓',
  }
  if (isCorrect === false) return {
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-700 dark:text-red-400',
    icon: '✗',
  }
  return {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-500 dark:text-gray-400',
    icon: '?',
  }
}

export default function WorksheetTile({ item, isExpanded, onClick }: WorksheetTileProps) {
  const colors = getTileColor(item.isCorrect)

  return (
    <motion.button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center
        rounded-xl border-2 p-3 transition-all
        ${colors.bg} ${colors.border}
        ${isExpanded ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
        hover:scale-105 active:scale-95
      `}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      layout
    >
      <span className={`text-2xl font-bold ${colors.text}`}>
        {colors.icon}
      </span>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1 truncate w-full text-center">
        #{item.problemNumber}
      </span>
    </motion.button>
  )
}
```

**Test:** `npx tsc --noEmit`

---

### Task 2.5: Create `WorksheetDetail` component

**File:** `components/homework/WorksheetDetail.tsx` (NEW)

```typescript
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { BatchWorksheetItem } from '@/lib/homework/types'

interface WorksheetDetailProps {
  item: BatchWorksheetItem
  isVisible: boolean
  onPractice?: (item: BatchWorksheetItem) => void
  isPracticed?: boolean
}

export default function WorksheetDetail({ item, isVisible, onPractice, isPracticed }: WorksheetDetailProps) {
  const t = useTranslations('homework.results')

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
            {/* Problem text */}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('problemNumber', { number: item.problemNumber })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {item.problemText}
              </p>
            </div>

            {/* Student answer vs correct answer */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t('studentWrote')}
                </p>
                <p className={`text-sm font-mono ${item.isCorrect === false ? 'text-red-600 dark:text-red-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                  {item.studentAnswer || '—'}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                  {t('correctAnswerIs')}
                </p>
                <p className="text-sm font-mono text-green-700 dark:text-green-300">
                  {item.correctAnswer}
                </p>
              </div>
            </div>

            {/* Explanation */}
            {item.explanation && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                  {t('errorExplanation')}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {item.explanation}
                </p>
              </div>
            )}

            {/* Practice This button (only for incorrect) */}
            {item.isCorrect === false && onPractice && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPractice(item)
                }}
                disabled={isPracticed}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full
                  transition-colors
                  ${isPracticed
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
                    : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50'
                  }
                `}
              >
                {isPracticed ? (
                  <>
                    <span>✓</span>
                    {t('practiced')}
                  </>
                ) : (
                  <>
                    <span>🎯</span>
                    {t('practiceThis')}
                  </>
                )}
              </button>
            )}

            {/* Topic + error type badges */}
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                {item.topic}
              </span>
              {item.errorType && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  {item.errorType}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

**Test:** `npx tsc --noEmit`

---

### Task 2.6: Create `BatchWorksheetResult` component

**File:** `components/homework/BatchWorksheetResult.tsx` (NEW)

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import type { BatchWorksheetResult as BatchResult, BatchWorksheetItem } from '@/lib/homework/types'
import WorksheetTile from './WorksheetTile'
import WorksheetDetail from './WorksheetDetail'

interface BatchWorksheetResultProps {
  result: BatchResult
  onPractice?: (item: BatchWorksheetItem, problemIndex: number) => void
  practicedIndices?: number[]
}

export default function BatchWorksheetResultView({
  result,
  onPractice,
  practicedIndices = [],
}: BatchWorksheetResultProps) {
  const t = useTranslations('homework.results')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const toggleExpanded = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index))
  }, [])

  const scoreColor = result.score >= 80
    ? 'text-green-600 dark:text-green-400'
    : result.score >= 60
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <div className="space-y-6">
      {/* Summary Bar — sticky */}
      <div className="sticky top-14 md:top-0 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[22px] shadow-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('worksheetResults')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {t('worksheetSummary', {
                correct: result.correct,
                incorrect: result.incorrect,
                unclear: result.unclear,
                total: result.totalProblems,
              })}
            </p>
          </div>
          <div className={`text-3xl font-bold ${scoreColor}`}>
            {result.score}%
          </div>
        </div>

        {/* Horizontal stacked bar */}
        <div className="flex h-3 rounded-full overflow-hidden mt-3 bg-gray-100 dark:bg-gray-700">
          {result.correct > 0 && (
            <div
              className="bg-green-500 transition-all"
              style={{ width: `${(result.correct / result.totalProblems) * 100}%` }}
            />
          )}
          {result.incorrect > 0 && (
            <div
              className="bg-red-500 transition-all"
              style={{ width: `${(result.incorrect / result.totalProblems) * 100}%` }}
            />
          )}
          {result.unclear > 0 && (
            <div
              className="bg-gray-400 transition-all"
              style={{ width: `${(result.unclear / result.totalProblems) * 100}%` }}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            {t('correct')} ({result.correct})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            {t('incorrect')} ({result.incorrect})
          </span>
          {result.unclear > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              {t('unclear')} ({result.unclear})
            </span>
          )}
        </div>
      </div>

      {/* Problem Grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
        {result.items.map((item, idx) => (
          <WorksheetTile
            key={idx}
            item={item}
            isExpanded={expandedIndex === idx}
            onClick={() => toggleExpanded(idx)}
          />
        ))}
      </div>

      {/* Expanded Detail */}
      {expandedIndex !== null && result.items[expandedIndex] && (
        <WorksheetDetail
          item={result.items[expandedIndex]}
          isVisible={true}
          onPractice={onPractice ? (item) => onPractice(item, expandedIndex) : undefined}
          isPracticed={practicedIndices.includes(expandedIndex)}
        />
      )}

      {/* Topic Breakdown */}
      {Object.keys(result.topicBreakdown).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-[22px] p-5 border border-gray-200 dark:border-gray-700 shadow-card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            {t('topicBreakdown')}
          </h3>
          <div className="space-y-2">
            {Object.entries(result.topicBreakdown).map(([topic, data]) => {
              const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
              return (
                <div key={topic} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 w-32 truncate">
                    {topic}
                  </span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-16 text-end">
                    {data.correct}/{data.total}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Test:** `npx tsc --noEmit`

---

### Task 2.7: Update homework check API route to support mode

**File:** `app/api/homework/check/route.ts`

In the POST handler, after parsing the body (around line 123), add mode validation:

```typescript
        // Parse mode (default to standard)
        const mode = body.mode || 'standard'
        const validModes = ['standard', 'batch_worksheet', 'before_submit', 'rubric']
        if (!validModes.includes(mode)) {
          send({ type: 'error', error: formatApiError('API_CHK_VAL_004', `Invalid mode: ${mode}`) })
          closeStream()
          return
        }
```

In the database insert (around line 151), add the new columns:

```typescript
            mode: mode,
            rubric_image_urls: body.rubricImageUrls || [],
            additional_image_urls: body.additionalImageUrls || [],
```

In the `analyzeHomework()` call (around line 194), pass the mode fields:

```typescript
          result = await analyzeHomework({
            inputMode,
            taskImageUrl: inputMode === 'image' ? body.taskImageUrl : undefined,
            answerImageUrl: inputMode === 'image' ? body.answerImageUrl : undefined,
            referenceImageUrls: body.referenceImageUrls,
            teacherReviewUrls: body.teacherReviewUrls,
            taskText: inputMode === 'text' ? body.taskText : undefined,
            answerText: inputMode === 'text' ? body.answerText : undefined,
            taskDocumentText: body.taskDocumentText,
            answerDocumentText: body.answerDocumentText,
            // Mode-specific
            mode,
            additionalImageUrls: body.additionalImageUrls,
            rubricImageUrls: body.rubricImageUrls,
          })
```

In the database update (around line 236), add mode_result:

```typescript
              mode_result: result.modeResult || null,
```

**Test:** `npx tsc --noEmit`

---

### Task 2.8: Add mode selector UI to upload page

**File:** `app/(main)/homework/check/page.tsx`

Add mode state after existing state declarations (around line 250 in the main component):

```typescript
  // Checker mode
  const [checkMode, setCheckMode] = useState<'standard' | 'batch_worksheet' | 'before_submit' | 'rubric'>('standard')
  // Batch worksheet additional pages (up to 3)
  const [additionalPages, setAdditionalPages] = useState<UploadedImage[]>([])
  // Before-submit toggle
  const [beforeSubmit, setBeforeSubmit] = useState(false)
  // Rubric images
  const [rubricImages, setRubricImages] = useState<UploadedImage[]>([])
```

Add a mode selector tab bar component at the top of the upload form (below the "How it works" section), rendering four pill tabs:

```tsx
        {/* Mode Selector */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(['standard', 'batch_worksheet', 'before_submit', 'rubric'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCheckMode(mode)}
              className={`
                flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors
                ${checkMode === mode
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              {t(`check.mode${mode === 'standard' ? 'Standard' : mode === 'batch_worksheet' ? 'BatchWorksheet' : mode === 'before_submit' ? 'BeforeSubmit' : 'Rubric'}`)}
            </button>
          ))}
        </div>
```

When `checkMode === 'batch_worksheet'`, show additional page uploaders below the task image uploader:

```tsx
        {/* Batch Worksheet Additional Pages */}
        {checkMode === 'batch_worksheet' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('check.additionalPages')}
              </label>
              {additionalPages.length < 3 && (
                <button
                  onClick={() => {/* trigger file input */}}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                >
                  + {t('check.addPage')}
                </button>
              )}
            </div>
            {additionalPages.map((page, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{t('check.pageOf', { current: idx + 2, total: additionalPages.length + 1 })}</span>
                <button onClick={() => setAdditionalPages(prev => prev.filter((_, i) => i !== idx))}
                  className="text-xs text-red-500 hover:underline">
                  {t('check.removePage')}
                </button>
              </div>
            ))}
            {additionalPages.length >= 3 && (
              <p className="text-xs text-gray-400">{t('check.maxPages')}</p>
            )}
          </div>
        )}
```

Update the submit handler to include mode fields in the API call body:

```typescript
          const requestBody = {
            inputMode,
            taskImageUrl: ...,
            answerImageUrl: ...,
            referenceImageUrls: ...,
            teacherReviewUrls: ...,
            // Mode fields
            mode: checkMode,
            additionalImageUrls: checkMode === 'batch_worksheet'
              ? additionalPages.map(p => p.uploadedUrl).filter(Boolean)
              : undefined,
            rubricImageUrls: checkMode === 'rubric'
              ? rubricImages.map(r => r.uploadedUrl).filter(Boolean)
              : undefined,
          }
```

**Note:** This task describes the UI changes conceptually. The implementer should weave these into the existing form structure, preserving all existing state and functionality. The key changes are:
1. A mode selector tab bar above the upload areas
2. Conditional UI for each mode below the standard uploader
3. Updated submit payload

**Test:** `npx tsc --noEmit` + manual browser test

---

### Task 2.9: Wire `BatchWorksheetResult` into results page

**File:** `app/(main)/homework/[sessionId]/page.tsx`

Import the new component:

```typescript
import BatchWorksheetResultView from '@/components/homework/BatchWorksheetResult'
import type { BatchWorksheetResult, BatchWorksheetItem, BeforeSubmitResult, RubricResult, CheckMode } from '@/lib/homework/types'
```

In the check results rendering section (around line 554, after the `feedback` extraction), add mode detection:

```typescript
  const checkMode = (check.mode || 'standard') as CheckMode
  const modeResult = check.mode_result
```

Before the standard feedback rendering (around line 605, the `<main>` section), add conditional rendering for batch worksheet mode:

```typescript
      {/* Mode-specific results */}
      {checkMode === 'batch_worksheet' && modeResult && 'items' in modeResult && (
        <BatchWorksheetResultView
          result={modeResult as BatchWorksheetResult}
          onPractice={(item, idx) => handlePracticeFromMistake(item, idx)}
          practicedIndices={(check.practiced_items || []).map(p => p.problemIndex)}
        />
      )}

      {/* Standard results (shown for standard mode OR as fallback) */}
      {checkMode === 'standard' && (
        <>
          {/* ...existing grade card, summary, correctPoints, improvementPoints, etc... */}
        </>
      )}
```

**Test:** `npx tsc --noEmit`

---

### Task 2.10: Update barrel exports

**File:** `components/homework/index.ts`

Add:

```typescript
export { default as BatchWorksheetResult } from './BatchWorksheetResult'
export { default as WorksheetTile } from './WorksheetTile'
export { default as WorksheetDetail } from './WorksheetDetail'
```

**Test:** `npx tsc --noEmit`

**Commit:** `feat: add batch worksheet mode — multi-page analysis with grid results`

---

## Phase 3: Feature #8 — "Before You Submit" Mode

### Task 3.1: Add before-submit analysis function to checker engine

**File:** `lib/homework/checker-engine.ts`

Add a new function after `analyzeWorksheetBatch()`:

```typescript
// ============================================================================
// BEFORE-SUBMIT MODE
// ============================================================================

/**
 * Analyze homework in "before-submit" mode: traffic light status with progressive hints.
 * Does NOT reveal correct answers.
 */
async function analyzeBeforeSubmit(
  client: Anthropic,
  imageContents: Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }>,
  textContent: string | null,
  referenceContent: string | null
): Promise<{ beforeSubmitResult: BeforeSubmitResult; subject: string; topic: string; taskText: string }> {
  const contentBlock = textContent
    ? `\n\nSTUDENT TEXT:\n${textContent}`
    : ''
  const referenceBlock = referenceContent
    ? `\n\nREFERENCE MATERIAL:\n${referenceContent}`
    : ''

  const systemPrompt = `You are a helpful homework reviewer doing a BEFORE-SUBMIT check.

CRITICAL RULE: You must NOT reveal the correct answers. The student hasn't submitted yet.

TASK: For each problem/answer on the page, assess:
1. Is it likely correct? → status: "correct"
2. Is it possibly wrong but close? → status: "check_again"
3. Is it clearly wrong or missing? → status: "needs_rework"
4. Is it unreadable? → status: "unclear"

For problems that aren't "correct", provide THREE escalating hints:
- Hint 1: A gentle nudge in the right direction (vague)
- Hint 2: A more specific hint about what to check
- Hint 3: A strong hint that nearly gives the approach (but NOT the answer)

For "correct" problems, provide three confirmatory hints explaining WHY it looks right.

Detect the language of the homework and respond in that language.${contentBlock}${referenceBlock}

Respond ONLY with valid JSON:
{
  "subject": "string",
  "topic": "string",
  "taskText": "extracted question text",
  "items": [
    {
      "problemIndex": 0,
      "problemText": "the question",
      "status": "correct | check_again | needs_rework | unclear",
      "hints": ["hint1", "hint2", "hint3"]
    }
  ]
}`

  const messageContent: Array<Anthropic.ImageBlockParam | Anthropic.TextBlockParam> = [
    ...imageContents,
    { type: 'text' as const, text: 'Check this homework before submission. Do NOT reveal answers. Return JSON.' },
  ]

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: messageContent }],
  })

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  let jsonStr = text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) jsonStr = jsonMatch[1].trim()

  const parsed = JSON.parse(jsonStr)
  const items: BeforeSubmitItem[] = (parsed.items || []).map((item: Record<string, unknown>, idx: number) => ({
    problemIndex: typeof item.problemIndex === 'number' ? item.problemIndex : idx,
    problemText: String(item.problemText || ''),
    status: (['correct', 'check_again', 'needs_rework', 'unclear'].includes(String(item.status))
      ? item.status
      : 'unclear') as BeforeSubmitStatus,
    hints: Array.isArray(item.hints) && item.hints.length === 3
      ? item.hints.map(String) as [string, string, string]
      : [String((item as Record<string, unknown>).hints?.[0] || ''), '', ''] as [string, string, string],
  }))

  const correct = items.filter((i) => i.status === 'correct').length
  const checkAgain = items.filter((i) => i.status === 'check_again').length
  const needsRework = items.filter((i) => i.status === 'needs_rework').length
  const unclear = items.filter((i) => i.status === 'unclear').length

  const beforeSubmitResult: BeforeSubmitResult = {
    mode: 'before_submit',
    items,
    summary: {
      correct,
      checkAgain,
      needsRework,
      unclear,
      total: items.length,
    },
  }

  return {
    beforeSubmitResult,
    subject: String(parsed.subject || 'unknown'),
    topic: String(parsed.topic || 'unknown'),
    taskText: String(parsed.taskText || ''),
  }
}
```

**Test:** `npx tsc --noEmit`

---

### Task 3.2: Wire before-submit mode into `analyzeHomework()`

**File:** `lib/homework/checker-engine.ts`

Add another mode branch after the batch_worksheet branch in `analyzeHomework()`:

```typescript
    if (mode === 'before_submit') {
      console.log('[Checker] Before-submit mode — checking without revealing answers...')

      const imageContents: Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> = []
      if (input.taskImageUrl) {
        imageContents.push(await fetchImageAsBase64Content(input.taskImageUrl))
      }
      if (input.answerImageUrl) {
        imageContents.push(await fetchImageAsBase64Content(input.answerImageUrl))
      }

      const textContent = input.taskText || input.taskDocumentText || null

      let referenceContent: string | null = null
      if (input.referenceImageUrls?.length) {
        referenceContent = `[${input.referenceImageUrls.length} reference image(s) provided]`
      }

      const { beforeSubmitResult, subject, topic, taskText } = await analyzeBeforeSubmit(
        client,
        imageContents,
        textContent,
        referenceContent
      )

      // Build minimal HomeworkFeedback for backward compatibility
      const feedback: HomeworkFeedback = {
        gradeLevel: 'good',
        gradeEstimate: `${beforeSubmitResult.summary.correct}/${beforeSubmitResult.summary.total} likely correct`,
        summary: `Before-submit check: ${beforeSubmitResult.summary.correct} look correct, ${beforeSubmitResult.summary.checkAgain + beforeSubmitResult.summary.needsRework} need review`,
        correctPoints: [],
        improvementPoints: [],
        suggestions: [],
        teacherStyleNotes: null,
        expectationComparison: null,
        encouragement: 'Review the flagged items before submitting!',
      }

      return {
        feedback,
        subject,
        topic,
        taskText,
        answerText: '',
        mode: 'before_submit',
        modeResult: beforeSubmitResult,
      }
    }
```

**Test:** `npx tsc --noEmit`

---

### Task 3.3: Create `BeforeSubmitResult` component

**File:** `components/homework/BeforeSubmitResult.tsx` (NEW)

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import type { BeforeSubmitResult, BeforeSubmitStatus } from '@/lib/homework/types'

interface BeforeSubmitResultProps {
  result: BeforeSubmitResult
  onRunFullCheck?: () => void
}

function getStatusConfig(status: BeforeSubmitStatus) {
  switch (status) {
    case 'correct':
      return { color: 'bg-green-500', ring: 'ring-green-200 dark:ring-green-800', label: 'looksCorrect', icon: '✓', textColor: 'text-green-700 dark:text-green-400' }
    case 'check_again':
      return { color: 'bg-amber-500', ring: 'ring-amber-200 dark:ring-amber-800', label: 'checkAgain', icon: '!', textColor: 'text-amber-700 dark:text-amber-400' }
    case 'needs_rework':
      return { color: 'bg-red-500', ring: 'ring-red-200 dark:ring-red-800', label: 'needsRework', icon: '✗', textColor: 'text-red-700 dark:text-red-400' }
    case 'unclear':
      return { color: 'bg-gray-400', ring: 'ring-gray-200 dark:ring-gray-700', label: 'unclear', icon: '?', textColor: 'text-gray-500 dark:text-gray-400' }
  }
}

function HintRevealer({ hints }: { hints: [string, string, string] }) {
  const t = useTranslations('homework.results')
  const [revealedLevel, setRevealedLevel] = useState(0)

  const revealNext = useCallback(() => {
    setRevealedLevel((prev) => Math.min(prev + 1, 3))
  }, [])

  return (
    <div className="mt-3 space-y-2">
      <AnimatePresence>
        {Array.from({ length: revealedLevel }, (_, i) => (
          <motion.div
            key={i}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-500 dark:text-blue-400 mb-1">
                {t('hintLevel', { level: i + 1 })}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">{hints[i]}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {revealedLevel < 3 && (
        <button
          onClick={revealNext}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
        >
          💡 {t('getHintBtn')}
        </button>
      )}
    </div>
  )
}

export default function BeforeSubmitResultView({ result, onRunFullCheck }: BeforeSubmitResultProps) {
  const t = useTranslations('homework.results')

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-[22px] p-4 text-center">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          🔒 {t('beforeSubmitBanner')}
        </p>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-[22px] p-5 border border-gray-200 dark:border-gray-700 shadow-card">
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg mx-auto">
              {result.summary.correct}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('looksCorrect')}</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-lg mx-auto">
              {result.summary.checkAgain}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('checkAgain')}</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-lg mx-auto">
              {result.summary.needsRework}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('needsRework')}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {result.items.map((item, idx) => {
          const config = getStatusConfig(item.status)
          return (
            <div
              key={idx}
              className={`bg-white dark:bg-gray-800 rounded-[22px] p-4 border border-gray-200 dark:border-gray-700 shadow-card`}
            >
              <div className="flex items-start gap-3">
                {/* Traffic light circle */}
                <div className={`w-8 h-8 rounded-full ${config.color} ring-4 ${config.ring} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5`}>
                  {config.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('problemNumber', { number: item.problemIndex + 1 })}
                    </p>
                    <span className={`text-xs font-medium ${config.textColor}`}>
                      {t(config.label)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {item.problemText}
                  </p>

                  {/* Hint revealer (for non-correct items) */}
                  {item.status !== 'correct' && item.hints[0] && (
                    <HintRevealer hints={item.hints} />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Run Full Check CTA */}
      {onRunFullCheck && (
        <button
          onClick={onRunFullCheck}
          className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-[22px] transition-colors shadow-card"
        >
          {t('runFullCheck')}
        </button>
      )}
    </div>
  )
}
```

**Test:** `npx tsc --noEmit`

---

### Task 3.4: Wire `BeforeSubmitResult` into results page

**File:** `app/(main)/homework/[sessionId]/page.tsx`

Import:

```typescript
import BeforeSubmitResultView from '@/components/homework/BeforeSubmitResult'
```

Add conditional rendering in the results section:

```typescript
      {checkMode === 'before_submit' && modeResult && 'summary' in modeResult && 'items' in modeResult && (
        <BeforeSubmitResultView
          result={modeResult as BeforeSubmitResult}
          onRunFullCheck={() => {
            // Navigate to check page with pre-filled data to re-run in standard mode
            router.push('/homework/check')
          }}
        />
      )}
```

Update barrel exports in `components/homework/index.ts`:

```typescript
export { default as BeforeSubmitResult } from './BeforeSubmitResult'
```

**Test:** `npx tsc --noEmit`

**Commit:** `feat: add before-submit mode — traffic light hints without revealing answers`

---

## Phase 4: Feature #9 — Rubric Mode

### Task 4.1: Add rubric analysis function to checker engine

**File:** `lib/homework/checker-engine.ts`

Add after the before-submit function:

```typescript
// ============================================================================
// RUBRIC MODE
// ============================================================================

/**
 * Two-phase rubric grading:
 * Phase A: Parse rubric from rubric image(s)
 * Phase B: Grade the homework against the parsed rubric
 */
async function analyzeWithRubric(
  client: Anthropic,
  homeworkImages: Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }>,
  rubricImages: Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }>,
  textContent: string | null
): Promise<{ rubricResult: RubricResult; subject: string; topic: string; taskText: string }> {
  // ---- PHASE A: Parse rubric ----
  const rubricParsePrompt = `You are analyzing a grading rubric. Extract ALL criteria with their point values.

Respond ONLY with valid JSON:
{
  "criteria": [
    { "criterion": "name of criterion", "maxPoints": number, "description": "what earns full points" }
  ],
  "totalPossible": number
}`

  const rubricResponse = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system: rubricParsePrompt,
    messages: [{
      role: 'user',
      content: [
        ...rubricImages,
        { type: 'text' as const, text: 'Extract all rubric criteria and point values. Return JSON.' },
      ],
    }],
  })

  const rubricText = rubricResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text).join('')

  let rubricJson = rubricText
  const rubricMatch = rubricText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (rubricMatch) rubricJson = rubricMatch[1].trim()

  const parsedRubric = JSON.parse(rubricJson)
  const criteria: Array<{ criterion: string; maxPoints: number; description: string }> = parsedRubric.criteria || []
  const totalPossible = parsedRubric.totalPossible || criteria.reduce((sum: number, c: { maxPoints: number }) => sum + c.maxPoints, 0)

  // ---- PHASE B: Grade against rubric ----
  const criteriaList = criteria.map((c, i) => `${i + 1}. ${c.criterion} (${c.maxPoints} pts): ${c.description}`).join('\n')
  const textBlock = textContent ? `\n\nSTUDENT TEXT:\n${textContent}` : ''

  const gradingPrompt = `You are grading homework against a specific rubric.

RUBRIC CRITERIA:
${criteriaList}

TOTAL POSSIBLE POINTS: ${totalPossible}

For each criterion, assign points (0 to maxPoints) and explain your reasoning.
Also provide a specific improvement suggestion for each criterion.

Detect the language of the homework and respond in that language.${textBlock}

Respond ONLY with valid JSON:
{
  "subject": "string",
  "topic": "string",
  "taskText": "extracted task text",
  "breakdown": [
    {
      "criterion": "criterion name",
      "maxPoints": number,
      "earnedPoints": number,
      "reasoning": "why this score",
      "suggestions": "how to improve"
    }
  ],
  "estimatedGrade": "A/B/C/D/F or equivalent"
}`

  const gradingResponse = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    system: gradingPrompt,
    messages: [{
      role: 'user',
      content: [
        ...homeworkImages,
        { type: 'text' as const, text: 'Grade this homework against the rubric. Return JSON.' },
      ],
    }],
  })

  const gradingText = gradingResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text).join('')

  let gradingJson = gradingText
  const gradingMatch = gradingText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (gradingMatch) gradingJson = gradingMatch[1].trim()

  const parsed = JSON.parse(gradingJson)
  const breakdown: RubricCriterion[] = (parsed.breakdown || []).map((item: Record<string, unknown>) => ({
    criterion: String(item.criterion || ''),
    maxPoints: Number(item.maxPoints || 0),
    earnedPoints: Math.min(Number(item.earnedPoints || 0), Number(item.maxPoints || 0)),
    percentage: Number(item.maxPoints) > 0
      ? Math.round((Number(item.earnedPoints || 0) / Number(item.maxPoints)) * 100)
      : 0,
    reasoning: String(item.reasoning || ''),
    suggestions: String(item.suggestions || ''),
  }))

  const totalEarned = breakdown.reduce((sum, c) => sum + c.earnedPoints, 0)
  const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0

  // Build tagged feedback items
  const taggedFeedback: Array<FeedbackPoint & { rubricCriterion: string }> = breakdown
    .filter((c) => c.earnedPoints < c.maxPoints)
    .map((c) => ({
      title: `${c.criterion}: ${c.earnedPoints}/${c.maxPoints}`,
      description: c.suggestions,
      severity: (c.percentage < 50 ? 'major' : c.percentage < 80 ? 'moderate' : 'minor') as 'minor' | 'moderate' | 'major',
      rubricCriterion: c.criterion,
    }))

  const rubricResult: RubricResult = {
    mode: 'rubric',
    rubricBreakdown: breakdown,
    totalEarned,
    totalPossible,
    percentage,
    estimatedGrade: String(parsed.estimatedGrade || ''),
    taggedFeedback,
  }

  return {
    rubricResult,
    subject: String(parsed.subject || 'unknown'),
    topic: String(parsed.topic || 'unknown'),
    taskText: String(parsed.taskText || ''),
  }
}
```

**Test:** `npx tsc --noEmit`

---

### Task 4.2: Wire rubric mode into `analyzeHomework()`

**File:** `lib/homework/checker-engine.ts`

Add after the before-submit branch:

```typescript
    if (mode === 'rubric') {
      console.log('[Checker] Rubric mode — two-phase rubric grading...')

      if (!input.rubricImageUrls?.length) {
        throw new Error('Rubric images are required for rubric mode')
      }

      // Fetch homework images
      const homeworkImages: Array<{ type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> = []
      if (input.taskImageUrl) {
        homeworkImages.push(await fetchImageAsBase64Content(input.taskImageUrl))
      }
      if (input.answerImageUrl) {
        homeworkImages.push(await fetchImageAsBase64Content(input.answerImageUrl))
      }

      // Fetch rubric images
      const rubricImages = await Promise.all(
        input.rubricImageUrls.map((url) => fetchImageAsBase64Content(url))
      )

      const textContent = input.taskText || input.taskDocumentText || null

      const { rubricResult, subject, topic, taskText } = await analyzeWithRubric(
        client,
        homeworkImages,
        rubricImages,
        textContent
      )

      // Build HomeworkFeedback for backward compatibility
      const gradeLevel: GradeLevel = rubricResult.percentage >= 90 ? 'excellent'
        : rubricResult.percentage >= 70 ? 'good'
        : rubricResult.percentage >= 50 ? 'needs_improvement'
        : 'incomplete'

      const feedback: HomeworkFeedback = {
        gradeLevel,
        gradeEstimate: `${rubricResult.totalEarned}/${rubricResult.totalPossible} (${rubricResult.estimatedGrade})`,
        summary: `Rubric grade: ${rubricResult.totalEarned}/${rubricResult.totalPossible} (${rubricResult.percentage}%)`,
        correctPoints: rubricResult.rubricBreakdown
          .filter((c) => c.percentage >= 80)
          .map((c) => ({ title: c.criterion, description: `${c.earnedPoints}/${c.maxPoints} — ${c.reasoning}` })),
        improvementPoints: rubricResult.taggedFeedback,
        suggestions: rubricResult.rubricBreakdown
          .filter((c) => c.earnedPoints < c.maxPoints)
          .map((c) => c.suggestions),
        teacherStyleNotes: null,
        expectationComparison: null,
        encouragement: rubricResult.percentage >= 80
          ? 'Strong work against this rubric!'
          : 'Use the rubric feedback to target your improvements!',
      }

      return {
        feedback,
        subject,
        topic,
        taskText,
        answerText: '',
        mode: 'rubric',
        modeResult: rubricResult,
      }
    }
```

**Test:** `npx tsc --noEmit`

---

### Task 4.3: Create `RubricTable` component

**File:** `components/homework/RubricTable.tsx` (NEW)

```typescript
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import type { RubricResult, RubricCriterion } from '@/lib/homework/types'

interface RubricTableProps {
  result: RubricResult
}

function getCriterionColor(pct: number) {
  if (pct >= 80) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', bar: 'bg-green-500' }
  if (pct >= 60) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', bar: 'bg-amber-500' }
  return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', bar: 'bg-red-500' }
}

function CriterionRow({ criterion, isExpanded, onToggle }: { criterion: RubricCriterion; isExpanded: boolean; onToggle: () => void }) {
  const t = useTranslations('homework.results')
  const colors = getCriterionColor(criterion.percentage)

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${colors.bg}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-start"
      >
        {/* Score bar */}
        <div className="w-12 h-12 rounded-lg bg-white dark:bg-gray-800 flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
          <span className={`text-lg font-bold ${colors.text}`}>
            {criterion.earnedPoints}
          </span>
          <span className="text-[10px] text-gray-400">/{criterion.maxPoints}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {criterion.criterion}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${criterion.percentage}%` }} />
            </div>
            <span className={`text-xs font-medium ${colors.text}`}>{criterion.percentage}%</span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-gray-200/50 dark:border-gray-700/50 pt-3">
              {/* Reasoning */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('rubricReasoning')}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{criterion.reasoning}</p>
              </div>
              {/* Suggestions */}
              {criterion.suggestions && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('rubricSuggestions')}</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{criterion.suggestions}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function RubricTable({ result }: RubricTableProps) {
  const t = useTranslations('homework.results')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const scoreColor = result.percentage >= 80
    ? 'text-green-600 dark:text-green-400'
    : result.percentage >= 60
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <div className="space-y-6">
      {/* Score Header */}
      <div className="bg-white dark:bg-gray-800 rounded-[22px] p-6 border border-gray-200 dark:border-gray-700 shadow-card text-center">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('rubricResults')}</h2>
        <div className={`text-4xl font-bold ${scoreColor}`}>
          {result.totalEarned}/{result.totalPossible}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {result.estimatedGrade} ({result.percentage}%)
        </p>
      </div>

      {/* Criteria List */}
      {result.rubricBreakdown.length > 0 ? (
        <div className="space-y-3">
          {result.rubricBreakdown.map((criterion, idx) => (
            <CriterionRow
              key={idx}
              criterion={criterion}
              isExpanded={expandedIndex === idx}
              onToggle={() => setExpandedIndex(prev => prev === idx ? null : idx)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-[22px] p-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('noRubricCriteria')}</p>
        </div>
      )}

      {/* Tagged Feedback */}
      {result.taggedFeedback.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-[22px] p-5 border border-gray-200 dark:border-gray-700 shadow-card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('suggestions')}</h3>
          <div className="space-y-2">
            {result.taggedFeedback.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 flex-shrink-0 mt-0.5">
                  {item.rubricCriterion}
                </span>
                <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Test:** `npx tsc --noEmit`

---

### Task 4.4: Wire rubric result into results page + rubric upload UI

**File:** `app/(main)/homework/[sessionId]/page.tsx`

Import:

```typescript
import RubricTable from '@/components/homework/RubricTable'
```

Add conditional rendering:

```typescript
      {checkMode === 'rubric' && modeResult && 'rubricBreakdown' in modeResult && (
        <RubricTable result={modeResult as RubricResult} />
      )}
```

**File:** `app/(main)/homework/check/page.tsx`

When `checkMode === 'rubric'`, show rubric upload section below the answer uploader:

```tsx
        {/* Rubric Upload (Rubric Mode) */}
        {checkMode === 'rubric' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              📋 Rubric
            </label>
            {/* Reuse ImageUploader pattern for rubric images */}
            {/* Allow 1-2 rubric images */}
          </div>
        )}
```

Update barrel exports in `components/homework/index.ts`:

```typescript
export { default as RubricTable } from './RubricTable'
```

**Test:** `npx tsc --noEmit`

**Commit:** `feat: add rubric mode — two-phase rubric parsing and grading`

---

## Phase 5: Feature #6 — Practice From Homework Mistakes

### Task 5.1: Create practice-complete API route

**File:** `app/api/homework/check/[checkId]/practice-complete/route.ts` (NEW)

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/homework/check/[checkId]/practice-complete
 * Records that a practice session was completed for a specific homework mistake.
 * Body: { problemIndex: number, practiceSessionId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ checkId: string }> }
) {
  try {
    const { checkId } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { problemIndex, practiceSessionId } = body

    if (typeof problemIndex !== 'number' || !practiceSessionId) {
      return NextResponse.json({ error: 'problemIndex (number) and practiceSessionId (string) are required' }, { status: 400 })
    }

    // Get current check
    const { data: check, error: fetchError } = await supabase
      .from('homework_checks')
      .select('practiced_items')
      .eq('id', checkId)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Check not found' }, { status: 404 })
    }

    // Append to practiced_items
    const currentItems = Array.isArray(check.practiced_items) ? check.practiced_items : []
    const alreadyPracticed = currentItems.some(
      (item: { problemIndex: number }) => item.problemIndex === problemIndex
    )

    if (alreadyPracticed) {
      return NextResponse.json({ success: true, alreadyPracticed: true })
    }

    const updatedItems = [...currentItems, { problemIndex, practiceSessionId }]

    const { error: updateError } = await supabase
      .from('homework_checks')
      .update({ practiced_items: updatedItems })
      .eq('id', checkId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('[PracticeComplete] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true, practicedItems: updatedItems })
  } catch (error) {
    console.error('[PracticeComplete] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

**Test:** `npx tsc --noEmit`

---

### Task 5.2: Extend practice session creation to handle homework error source

**File:** `lib/practice/types.ts`

Add to `CreateSessionRequest` (after `timeLimitMinutes`, around line 169):

```typescript
  /** Source of targeted practice */
  sourceType?: 'course' | 'homework_error'
  /** Context from a homework error (used when sourceType is 'homework_error') */
  errorContext?: {
    checkId: string
    problemIndex: number
    problemText: string
    correctAnswer: string
    studentAnswer: string
    topic: string
    errorType?: string
  }
```

**File:** `app/api/practice/session/route.ts`

Update the POST handler to accept the new source type. After the session type validation (around line 93), add:

```typescript
    // Handle homework error source — generate questions on the fly for the error topic
    const sourceType = body.sourceType
    const errorContext = body.errorContext

    // If source is homework_error and no targetConceptIds provided, use the error topic
    let effectiveTargetConceptIds = targetConceptIds
    if (sourceType === 'homework_error' && errorContext && !targetConceptIds?.length) {
      // Use the error topic as a pseudo concept ID for question generation
      effectiveTargetConceptIds = [`homework_error:${errorContext.topic}`]
    }
```

Pass `effectiveTargetConceptIds` to `createPracticeSession` instead of `targetConceptIds`.

**Test:** `npx tsc --noEmit`

---

### Task 5.3: Add "Practice This" handler to results page

**File:** `app/(main)/homework/[sessionId]/page.tsx`

Add a handler function inside the component:

```typescript
  // Practice from homework mistake
  const handlePracticeFromMistake = useCallback(async (
    item: BatchWorksheetItem | FeedbackPoint,
    problemIndex: number
  ) => {
    try {
      // Determine topic and context
      const topic = 'topic' in item ? item.topic : ''
      const errorContext = 'correctAnswer' in item ? {
        checkId: sessionId,
        problemIndex,
        problemText: item.problemText || '',
        correctAnswer: item.correctAnswer || '',
        studentAnswer: item.studentAnswer || '',
        topic,
        errorType: item.errorType,
      } : {
        checkId: sessionId,
        problemIndex,
        problemText: item.title,
        correctAnswer: '',
        studentAnswer: '',
        topic: '',
      }

      const res = await fetch('/api/practice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: 'targeted',
          sourceType: 'homework_error',
          errorContext,
          questionCount: 5,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to create practice session')
      }

      const { sessionId: practiceSessionId } = await res.json()

      // Record the practice link
      await fetch(`/api/homework/check/${sessionId}/practice-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemIndex, practiceSessionId }),
      })

      // Navigate to practice
      router.push(`/practice/${practiceSessionId}`)
    } catch (error) {
      console.error('Practice from mistake error:', error)
      toast.error('Failed to start practice session')
    }
  }, [sessionId, router, toast])
```

**Test:** `npx tsc --noEmit`

---

### Task 5.4: Add "Practice This" button to standard feedback items

**File:** `app/(main)/homework/[sessionId]/page.tsx`

In the "Areas for Improvement" section (around line 675), add a "Practice This" button inside each improvement point card, after the description:

```tsx
                        {/* Practice This button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePracticeFromMistake(point, idx)
                          }}
                          disabled={(check.practiced_items || []).some(p => p.problemIndex === idx)}
                          className={`
                            mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors
                            ${(check.practiced_items || []).some(p => p.problemIndex === idx)
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
                              : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-900/50'
                            }
                          `}
                        >
                          {(check.practiced_items || []).some(p => p.problemIndex === idx) ? (
                            <>✓ {t('results.practiced')}</>
                          ) : (
                            <>🎯 {t('results.practiceThis')}</>
                          )}
                        </button>
```

**Test:** `npx tsc --noEmit`

---

### Task 5.5: Add practice banner to practice page

**File:** Check if a banner component is needed for `app/(main)/practice/[sessionId]/page.tsx`.

When a practice session has `sourceType: 'homework_error'`, show a contextual banner at the top:

```tsx
{session.sourceType === 'homework_error' && session.errorContext && (
  <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-3 mb-4">
    <p className="text-sm text-violet-700 dark:text-violet-300">
      🎯 Practicing: <strong>{session.errorContext.topic}</strong> from your homework
    </p>
    <button
      onClick={() => router.push(`/homework/${session.errorContext.checkId}`)}
      className="text-xs text-violet-600 dark:text-violet-400 hover:underline mt-1"
    >
      ← Back to Homework
    </button>
  </div>
)}
```

**Note:** This requires storing `sourceType` and `errorContext` on the practice session record. If the practice session table doesn't have these columns, add a migration:

**File:** `supabase/migrations/20260302_practice_session_source.sql` (NEW)

```sql
-- Add source tracking to practice sessions
ALTER TABLE practice_sessions
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'course',
ADD COLUMN IF NOT EXISTS error_context JSONB;

COMMENT ON COLUMN practice_sessions.source_type IS 'Source: course, homework_error';
COMMENT ON COLUMN practice_sessions.error_context IS 'Context from homework error for targeted practice';
```

**Test:** `npx tsc --noEmit`

**Commit:** `feat: add "Practice This" button for homework mistakes — targeted practice from errors`

---

## Phase 6: Integration Testing & Polish

### Task 6.1: Type-check the entire project

```bash
npx tsc --noEmit
```

Fix any type errors found.

---

### Task 6.2: Manual testing checklist

Test each mode in the browser:

1. **Batch Worksheet Mode:**
   - [ ] Select "Full Worksheet" tab
   - [ ] Upload 1 page → verify grid of tiles appears
   - [ ] Upload 2-4 pages → verify all problems detected
   - [ ] Click a tile → verify detail expansion with AnimatePresence
   - [ ] Verify topic breakdown bar chart
   - [ ] Verify green/red/gray colors
   - [ ] Test in Hebrew (RTL)
   - [ ] Test on mobile (375px width)

2. **Before-Submit Mode:**
   - [ ] Select "Before Submit" tab
   - [ ] Upload homework → verify traffic lights appear
   - [ ] Verify NO correct answers are revealed
   - [ ] Click "Get Hint" → verify hint 1 appears
   - [ ] Click again → hint 2 appears
   - [ ] Click again → hint 3 appears
   - [ ] Verify "Run Full Check" button works
   - [ ] Test in Hebrew (RTL)

3. **Rubric Mode:**
   - [ ] Select "Rubric Check" tab
   - [ ] Upload homework + rubric image
   - [ ] Verify rubric criteria table appears
   - [ ] Verify color coding (green >80%, yellow 60-80%, red <60%)
   - [ ] Expand a criterion → verify reasoning + suggestions
   - [ ] Verify rubric criterion pills on feedback items
   - [ ] Test in Hebrew (RTL)

4. **Practice From Mistakes:**
   - [ ] Complete a standard check with errors
   - [ ] Verify "Practice This 🎯" button on each improvement point
   - [ ] Click "Practice This" → verify redirect to practice page
   - [ ] Complete practice → verify "Practiced ✓" badge on return
   - [ ] Verify batch worksheet tiles also show "Practice This"

---

### Task 6.3: Final commit

```bash
git add -A
git commit -m "feat: Batch 2 homework enhancements — worksheet mode, before-submit, rubric, practice-from-mistakes"
```

---

## Summary

| Phase | Feature | Files Modified | Files Created | Estimated Tasks |
|-------|---------|---------------|---------------|-----------------|
| 1 | Types & Infrastructure | 3 | 1 migration | 8 tasks |
| 2 | Batch Worksheet Mode | 5 | 4 components | 10 tasks |
| 3 | Before-Submit Mode | 3 | 1 component | 4 tasks |
| 4 | Rubric Mode | 4 | 1 component | 4 tasks |
| 5 | Practice From Mistakes | 4 | 2 (API + migration) | 5 tasks |
| 6 | Testing & Polish | — | — | 3 tasks |
| **Total** | | **~12 files** | **~9 new files** | **34 tasks** |

### New Files Created

| File | Purpose |
|------|---------|
| `components/homework/BatchWorksheetResult.tsx` | Grid view + summary bar for worksheet results |
| `components/homework/WorksheetTile.tsx` | Individual green/red/gray tile |
| `components/homework/WorksheetDetail.tsx` | Expanded view for single problem |
| `components/homework/BeforeSubmitResult.tsx` | Traffic light display with progressive hints |
| `components/homework/RubricTable.tsx` | Rubric criterion table with expandable rows |
| `app/api/homework/check/[checkId]/practice-complete/route.ts` | API to record practice completion |
| `supabase/migrations/20260302_homework_check_modes.sql` | DB columns for modes |
| `supabase/migrations/20260302_practice_session_source.sql` | DB columns for practice source tracking |

### Modified Files

| File | Changes |
|------|---------|
| `lib/homework/types.ts` | +6 new types, extended `HomeworkCheck` and `CreateCheckRequest` |
| `lib/homework/checker-engine.ts` | +3 analysis functions, mode routing in `analyzeHomework()` |
| `app/api/homework/check/route.ts` | Mode validation, new DB columns in insert/update |
| `app/(main)/homework/check/page.tsx` | Mode selector UI, conditional upload sections |
| `app/(main)/homework/[sessionId]/page.tsx` | Mode-specific result rendering, "Practice This" button |
| `components/homework/index.ts` | Barrel exports for 5 new components |
| `messages/en/homework.json` | +35 new i18n keys |
| `messages/he/homework.json` | +35 new i18n keys |
| `lib/practice/types.ts` | `sourceType` and `errorContext` on `CreateSessionRequest` |
| `app/api/practice/session/route.ts` | Handle `homework_error` source type |
