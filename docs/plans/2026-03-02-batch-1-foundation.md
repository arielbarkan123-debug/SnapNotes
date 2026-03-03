# Batch 1: Foundation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up dead code from old diagram system, add deep-dive wrong-answer analysis to practice, and add escalation ladder to homework tutoring chat.

**Architecture:** Three independent features with no shared dependencies. Dead code cleanup first to reduce noise. Deep dive adds a new card to practice answer feedback. Escalation ladder adds a cycling button to tutoring chat messages.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind CSS, Framer Motion, i18n (next-intl)

---

## Feature #12A: Dead Code Cleanup

**Goal:** Remove unused types, components, and modules from the old diagram system to reduce bundle size and cognitive load.

**Key Finding from codebase audit:** The `lib/visual-learning/` module is **NOT dead** — `tutor-engine.ts` actively imports `validateSchema`, `autoCorrectDiagram`, `DiagramType`, `StructuredDiagram`, and `SCHEMA_VERSION` from it. The `DiagramExplanationPanel` and `FullScreenDiagramView` are also **NOT dead** — `WorkTogetherModal.tsx` imports and renders `FullScreenDiagramView`, which in turn uses `DiagramExplanationPanel`. Similarly, `MathVisualType` is actively used by `lib/ai/visual-guidance.ts` and `lib/ai/math-methods.ts`, which are imported by `lib/ai/prompts.ts`.

**What IS dead:** The old data interfaces in `types/index.ts` that were created for the original visual system and are now superseded by `lib/visual-learning/types.ts` and `types/math.ts`. Specifically, the *WithErrors variants and the union type `MathVisual` that references them.

---

### Task 12A-1: Audit imports for old types in `types/index.ts`

**File:** (grep commands — no file changes)

**Action:** Search for every import/usage of the old data types from `types/index.ts` to determine which are dead.

**Commands to run:**
```bash
# Check each old type — exclude worktrees and docs
cd /Users/curvalux/NoteSnap

# 1. NumberLineData from types/index.ts (NOT from visual-learning or types/math.ts)
grep -rn "NumberLineData" --include="*.ts" --include="*.tsx" \
  --exclude-dir=".claude" --exclude-dir="node_modules" --exclude-dir="docs" | \
  grep -v "types/math.ts" | grep -v "lib/visual-learning"

# 2. CoordinatePlaneData from types/index.ts
grep -rn "CoordinatePlaneData" --include="*.ts" --include="*.tsx" \
  --exclude-dir=".claude" --exclude-dir="node_modules" --exclude-dir="docs" | \
  grep -v "types/math.ts" | grep -v "lib/visual-learning"

# 3. Old WithErrors types
grep -rn "WithErrors" --include="*.ts" --include="*.tsx" \
  --exclude-dir=".claude" --exclude-dir="node_modules" --exclude-dir="docs"

# 4. MathVisual union type usage
grep -rn "MathVisual[^T]" --include="*.ts" --include="*.tsx" \
  --exclude-dir=".claude" --exclude-dir="node_modules" --exclude-dir="docs"

# 5. mistakeVisual usage
grep -rn "mistakeVisual" --include="*.ts" --include="*.tsx" \
  --exclude-dir=".claude" --exclude-dir="node_modules" --exclude-dir="docs"
```

**Expected result:** The `*WithErrors` types, `MathVisual` union, and `mistakeVisual` field are not imported anywhere outside `types/index.ts` itself. The base types (`NumberLineData`, `CoordinatePlaneData`, etc.) in `types/index.ts` may be used by `lib/visual-learning/validator.ts`.

**Decision criteria:**
- If a type is only referenced within `types/index.ts` itself or only by `lib/visual-learning/validator.ts` (which has its own copies): **remove from `types/index.ts`**
- If a type is imported by active components: **keep it**

**Verification:** No file changes in this task; just record findings for use in Task 12A-2.

---

### Task 12A-2: Remove dead types from `types/index.ts`

**File:** `/Users/curvalux/NoteSnap/types/index.ts`

**Action:** Based on audit results from 12A-1, remove the following dead code blocks. The `lib/visual-learning/validator.ts` imports `CoordinatePlaneData` and `NumberLineData` from `types/index.ts` (line 19-20), so those base interfaces must be kept. But the `*WithErrors` extensions and the `MathVisual` union type are dead.

Remove the following blocks (approximate line ranges — verify exact lines before editing):

**Block 1: `*WithErrors` interfaces (lines ~410-435)**
```typescript
// REMOVE — these are never imported anywhere
export interface NumberLineDataWithErrors extends NumberLineData {
  errors?: { point: number; message: string }[]
}
export interface CoordinatePlaneDataWithErrors extends CoordinatePlaneData {
  errors?: { point: CoordinatePoint; message: string }[]
}
export interface TriangleDataWithErrors extends TriangleData {
  errors?: { vertex: string; message: string }[]
}
export interface CircleDataWithErrors extends CircleData {
  errors?: { element: string; message: string }[]
}
export interface UnitCircleDataWithErrors extends UnitCircleData {
  errors?: { element: string; message: string }[]
}
export interface TreeDiagramDataWithErrors extends TreeDiagramData {
  errors?: { node: string; message: string }[]
}
```

**Block 2: `MathVisual` union type (lines ~445-460)**
```typescript
// REMOVE — not imported by any component
export type MathVisual =
  | { type: 'number_line'; data: NumberLineData }
  | { type: 'coordinate_plane'; data: CoordinatePlaneData }
  | { type: 'triangle'; data: TriangleData }
  | { type: 'circle'; data: CircleData }
  | { type: 'unit_circle'; data: UnitCircleData }
  | { type: 'table'; data: TableData }
  | { type: 'tree_diagram'; data: TreeDiagramData }
```

**Block 3: `mistakeVisual` field from `PracticeProblem` (line ~73)**
If `PracticeProblem` interface has a `mistakeVisual?: MathVisual` field and `PracticeProblem` itself is not used anywhere, remove the field. If `PracticeProblem` is used, remove only the `mistakeVisual` field.

**Verification:**
```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: No new type errors. If validator.ts breaks, it means it imports from `types/index.ts` — keep those types.

---

### Task 12A-3: Clean up `types/index.ts` — remove orphaned helper types

**File:** `/Users/curvalux/NoteSnap/types/index.ts`

**Action:** After removing `*WithErrors` types and `MathVisual`, check if any of the base data types (`TriangleData`, `CircleData`, `UnitCircleData`, `TableData`, `TreeDiagramData`) are only referenced by the removed code. If so, and if they are NOT imported elsewhere in the codebase, remove them too.

**Keep:** `NumberLineData`, `CoordinatePlaneData` (used by `lib/visual-learning/validator.ts`), `MathVisualType` (used by `lib/ai/visual-guidance.ts`), all types above line ~100 (SolutionStep, etc).

**Commands:**
```bash
cd /Users/curvalux/NoteSnap
# Check each base type
for type in TriangleData CircleData UnitCircleData TableData TreeDiagramData; do
  echo "=== $type ==="
  grep -rn "$type" --include="*.ts" --include="*.tsx" \
    --exclude-dir=".claude" --exclude-dir="node_modules" --exclude-dir="docs" | \
    grep -v "types/index.ts"
done
```

If any base type has zero imports outside `types/index.ts`, remove it and its supporting sub-types.

**Verification:**
```bash
npx tsc --noEmit 2>&1 | head -30
```

---

### Task 12A-4: Type-check and verify build

**Files:** None (verification only)

**Action:** Run a full type-check and build to confirm no regressions.

```bash
cd /Users/curvalux/NoteSnap
npx tsc --noEmit
npm run build 2>&1 | tail -20
```

**Expected:** Zero type errors. Build succeeds. If errors appear, fix them before proceeding.

---

### Task 12A-5: Commit dead code cleanup

**Action:** Stage and commit.

```bash
cd /Users/curvalux/NoteSnap
git add types/index.ts
git commit -m "chore: remove dead WithErrors types, MathVisual union, and mistakeVisual from types/index.ts

These types were part of the original visual system and are no longer imported
by any component. The active diagram types live in lib/visual-learning/types.ts
and types/math.ts."
```

---

## Feature #5: "Why Was I Wrong?" Deep Dive

**Goal:** When a student gets a practice question wrong, show a 3-panel deep-dive analysis that explains what they likely thought, why it's wrong, and the correct mental model. Includes a quick-check verification question.

**Scope:**
- New component: `components/practice/DeepDiveCard.tsx`
- Modify: `app/api/practice/session/[sessionId]/answer/route.ts` — add deep dive generation
- Modify: `lib/practice/session-manager.ts` — add deep dive to `recordAnswer` return
- Modify: `lib/practice/types.ts` — add `DeepDiveAnalysis` type
- Modify: `app/(main)/practice/[sessionId]/PracticeSessionContent.tsx` — render DeepDiveCard
- i18n: `messages/en/practice.json` and `messages/he/practice.json`

---

### Task 5-1: Add `DeepDiveAnalysis` type to practice types

**File:** `/Users/curvalux/NoteSnap/lib/practice/types.ts`

**Action:** Add the deep dive types after the `AnswerQuestionResponse` interface (after line ~203).

```typescript
// -----------------------------------------------------------------------------
// Deep Dive Analysis Types (Feature #5: "Why Was I Wrong?")
// -----------------------------------------------------------------------------

export interface DeepDiveQuickCheck {
  question: string
  answer: string
}

export interface DeepDiveAnalysis {
  /** What the student probably thought — specific to their wrong answer */
  likelyReasoning: string
  /** Why that reasoning fails — with counter-example */
  whyWrong: string
  /** The correct mental model — with analogy */
  correctModel: string
  /** Quick-check verification question */
  quickCheck: DeepDiveQuickCheck
}
```

Then add `deepDive` to the `AnswerQuestionResponse` interface:

**In `AnswerQuestionResponse` (around line ~187-203), add after `evaluationMethod`:**
```typescript
  /** Deep dive analysis for wrong answers (only present when isCorrect=false) */
  deepDive?: DeepDiveAnalysis
```

**Verification:**
```bash
npx tsc --noEmit 2>&1 | head -10
```

---

### Task 5-2: Add deep dive AI generation function to session-manager

**File:** `/Users/curvalux/NoteSnap/lib/practice/session-manager.ts`

**Action:** Add a `generateDeepDive` function that calls Claude to generate the 3-part analysis. Add it near the top of the file (after the imports section, before `createPracticeSession`).

**Add import at the top:**
```typescript
import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import type { DeepDiveAnalysis } from './types'
```

**Add function:**
```typescript
// -----------------------------------------------------------------------------
// Deep Dive Analysis Generation (Feature #5)
// -----------------------------------------------------------------------------

let deepDiveClient: Anthropic | null = null

function getDeepDiveClient(): Anthropic {
  if (!deepDiveClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')
    deepDiveClient = new Anthropic({ apiKey })
  }
  return deepDiveClient
}

async function generateDeepDive(
  questionText: string,
  studentAnswer: string,
  correctAnswer: string
): Promise<DeepDiveAnalysis | null> {
  try {
    const client = getDeepDiveClient()

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `A student got this wrong:
Question: ${questionText}
Student's answer: "${studentAnswer}"
Correct answer: "${correctAnswer}"

Generate a 3-part analysis:
1. likelyReasoning: What the student probably thought when they wrote "${studentAnswer}". Be SPECIFIC to their answer — don't give a generic mistake. Start with "You probably..."
2. whyWrong: Why that reasoning fails. Use a concrete counter-example or visualization. 2-3 sentences max.
3. correctModel: The right way to think about it. Include a memorable analogy or visualization. End with the solution restated.
4. quickCheck: A similar but different problem for verification. Include question and answer.

IMPORTANT: The likelyReasoning MUST be specific to the student's actual answer "${studentAnswer}", not a generic mistake description.

Return ONLY valid JSON with no markdown formatting:
{ "likelyReasoning": "...", "whyWrong": "...", "correctModel": "...", "quickCheck": { "question": "...", "answer": "..." } }`,
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()

    const parsed = JSON.parse(cleaned) as DeepDiveAnalysis

    // Validate structure
    if (
      !parsed.likelyReasoning ||
      !parsed.whyWrong ||
      !parsed.correctModel ||
      !parsed.quickCheck?.question ||
      !parsed.quickCheck?.answer
    ) {
      console.warn('[DeepDive] Incomplete response from AI:', parsed)
      return null
    }

    return parsed
  } catch (error) {
    console.error('[DeepDive] Generation failed:', error)
    return null
  }
}
```

**Verification:**
```bash
npx tsc --noEmit 2>&1 | head -10
```

---

### Task 5-3: Wire deep dive into `recordAnswer`

**File:** `/Users/curvalux/NoteSnap/lib/practice/session-manager.ts`

**Action:** In the `recordAnswer` function, after the answer evaluation is complete and before the return statement (around line ~461), add deep dive generation for wrong answers.

**Find the return block (around line 461):**
```typescript
  return {
    isCorrect,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
    evaluationScore,
    evaluationFeedback,
    evaluationMethod,
    sessionProgress: {
```

**Replace with:**
```typescript
  // Generate deep dive analysis for wrong answers (non-blocking — timeout after 8s)
  let deepDive: DeepDiveAnalysis | null = null
  if (!isCorrect) {
    try {
      deepDive = await Promise.race([
        generateDeepDive(question.question_text, userAnswer, question.correct_answer),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
      ])
    } catch {
      // Non-critical — continue without deep dive
    }
  }

  return {
    isCorrect,
    correctAnswer: question.correct_answer,
    explanation: question.explanation,
    evaluationScore,
    evaluationFeedback,
    evaluationMethod,
    deepDive: deepDive ?? undefined,
    sessionProgress: {
```

**Verification:**
```bash
npx tsc --noEmit 2>&1 | head -10
```

---

### Task 5-4: Add i18n keys for deep dive

**File:** `/Users/curvalux/NoteSnap/messages/en/practice.json`

**Action:** Add the following keys at the top level (after `"compareWithModelAnswer"` on line 169):

```json
  "deepDiveTitle": "Why Was I Wrong?",
  "deepDiveWhatYouThought": "What you thought",
  "deepDiveTheMistake": "The mistake",
  "deepDiveHowToThink": "How to think about it",
  "deepDiveQuickCheck": "Quick check",
  "deepDiveQuickCheckPlaceholder": "Type your answer...",
  "deepDiveQuickCheckCorrect": "Correct! You've got it.",
  "deepDiveQuickCheckWrong": "Not quite. The answer is: {answer}",
  "deepDiveGotIt": "Got it"
```

**File:** `/Users/curvalux/NoteSnap/messages/he/practice.json`

**Action:** Add the corresponding Hebrew keys (after `"compareWithModelAnswer"` on line 169):

```json
  "deepDiveTitle": "למה טעיתי?",
  "deepDiveWhatYouThought": "מה חשבת",
  "deepDiveTheMistake": "הטעות",
  "deepDiveHowToThink": "איך לחשוב על זה",
  "deepDiveQuickCheck": "בדיקה מהירה",
  "deepDiveQuickCheckPlaceholder": "הקלד את התשובה שלך...",
  "deepDiveQuickCheckCorrect": "נכון! הבנת.",
  "deepDiveQuickCheckWrong": "לא בדיוק. התשובה היא: {answer}",
  "deepDiveGotIt": "הבנתי"
```

**Verification:**
```bash
# Check both files are valid JSON
node -e "require('./messages/en/practice.json')"
node -e "require('./messages/he/practice.json')"
```

---

### Task 5-5: Create `DeepDiveCard` component

**File:** `/Users/curvalux/NoteSnap/components/practice/DeepDiveCard.tsx` (NEW FILE)

**Action:** Create the 3-panel sequential reveal card with quick-check question.

```tsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { DeepDiveAnalysis } from '@/lib/practice/types'

interface DeepDiveCardProps {
  deepDive: DeepDiveAnalysis
  onDismiss: () => void
}

const panelConfig = [
  {
    icon: '🤔',
    titleKey: 'deepDiveWhatYouThought' as const,
    field: 'likelyReasoning' as const,
    borderColor: 'border-amber-300 dark:border-amber-700',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
  },
  {
    icon: '⚠️',
    titleKey: 'deepDiveTheMistake' as const,
    field: 'whyWrong' as const,
    borderColor: 'border-red-300 dark:border-red-700',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    iconBg: 'bg-red-100 dark:bg-red-900/50',
  },
  {
    icon: '💡',
    titleKey: 'deepDiveHowToThink' as const,
    field: 'correctModel' as const,
    borderColor: 'border-green-300 dark:border-green-700',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    iconBg: 'bg-green-100 dark:bg-green-900/50',
  },
]

export default function DeepDiveCard({ deepDive, onDismiss }: DeepDiveCardProps) {
  const tp = useTranslations('practice')
  const [quickCheckAnswer, setQuickCheckAnswer] = useState('')
  const [quickCheckSubmitted, setQuickCheckSubmitted] = useState(false)
  const [quickCheckCorrect, setQuickCheckCorrect] = useState(false)

  const handleQuickCheckSubmit = () => {
    if (!quickCheckAnswer.trim()) return
    const isCorrect =
      quickCheckAnswer.trim().toLowerCase() ===
      deepDive.quickCheck.answer.trim().toLowerCase()
    setQuickCheckCorrect(isCorrect)
    setQuickCheckSubmitted(true)
  }

  return (
    <div className="mt-4 rounded-[18px] bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 border border-slate-200 dark:border-slate-700 p-5 overflow-hidden">
      {/* Header */}
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span className="text-lg">🔍</span>
        {tp('deepDiveTitle')}
      </h3>

      {/* 3 Panels with staggered reveal */}
      <div className="space-y-3">
        <AnimatePresence>
          {panelConfig.map((panel, index) => (
            <motion.div
              key={panel.field}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.3, duration: 0.4, ease: 'easeOut' }}
              className={`rounded-xl border ${panel.borderColor} ${panel.bgColor} p-4`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg ${panel.iconBg} flex items-center justify-center text-base flex-shrink-0`}
                >
                  {panel.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    {tp(panel.titleKey)}
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                    {deepDive[panel.field]}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick Check Question */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4, ease: 'easeOut' }}
        className="mt-4 rounded-xl border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30 p-4"
      >
        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-2">
          {tp('deepDiveQuickCheck')}
        </p>
        <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">
          {deepDive.quickCheck.question}
        </p>

        {!quickCheckSubmitted ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={quickCheckAnswer}
              onChange={(e) => setQuickCheckAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleQuickCheckSubmit()
              }}
              placeholder={tp('deepDiveQuickCheckPlaceholder')}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <button
              onClick={handleQuickCheckSubmit}
              disabled={!quickCheckAnswer.trim()}
              className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {tp('checkAnswer')}
            </button>
          </div>
        ) : (
          <div
            className={`p-3 rounded-lg text-sm ${
              quickCheckCorrect
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}
          >
            {quickCheckCorrect
              ? tp('deepDiveQuickCheckCorrect')
              : tp('deepDiveQuickCheckWrong', { answer: deepDive.quickCheck.answer })}
          </div>
        )}
      </motion.div>

      {/* Got It Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.3 }}
        className="mt-4"
      >
        <button
          onClick={onDismiss}
          className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
        >
          {tp('deepDiveGotIt')}
        </button>
      </motion.div>
    </div>
  )
}
```

**Verification:**
```bash
npx tsc --noEmit 2>&1 | head -10
```

---

### Task 5-6: Wire `DeepDiveCard` into `PracticeSessionContent`

**File:** `/Users/curvalux/NoteSnap/app/(main)/practice/[sessionId]/PracticeSessionContent.tsx`

**Action:** Import DeepDiveCard and render it inside `ResultCard` when the answer is wrong and a deep dive is available.

**Step 1: Add import at top (after the existing imports, around line 16):**
```typescript
import DeepDiveCard from '@/components/practice/DeepDiveCard'
import type { DeepDiveAnalysis } from '@/lib/practice/types'
```

**Step 2: Add `deepDive` prop to `ResultCardProps` (line ~234):**
Change:
```typescript
interface ResultCardProps {
  question: PracticeQuestion
  isCorrect: boolean
  userAnswer: string
  evaluationFeedback?: string
  evaluationMethod?: string
  evaluationScore?: number
  onNext: () => void
  onDifficultyFeedback?: (feedback: 'too_easy' | 'too_hard') => void
  questionIndex?: number
}
```
To:
```typescript
interface ResultCardProps {
  question: PracticeQuestion
  isCorrect: boolean
  userAnswer: string
  evaluationFeedback?: string
  evaluationMethod?: string
  evaluationScore?: number
  deepDive?: DeepDiveAnalysis
  onNext: () => void
  onDifficultyFeedback?: (feedback: 'too_easy' | 'too_hard') => void
  questionIndex?: number
}
```

**Step 3: Update `ResultCard` function signature (line ~246):**
Change:
```typescript
function ResultCard({ question, isCorrect, userAnswer, evaluationFeedback, evaluationMethod, evaluationScore, onNext, onDifficultyFeedback, questionIndex = 0 }: ResultCardProps) {
```
To:
```typescript
function ResultCard({ question, isCorrect, userAnswer, evaluationFeedback, evaluationMethod, evaluationScore, deepDive, onNext, onDifficultyFeedback, questionIndex = 0 }: ResultCardProps) {
```

**Step 4: Add state for deep dive dismissal inside `ResultCard` (after line 246):**
```typescript
  const [deepDiveDismissed, setDeepDiveDismissed] = useState(false)
```
(Note: `useState` is already imported at the top of the file.)

**Step 5: Render `DeepDiveCard` after the explanation section (after line ~330, before difficulty feedback):**

Find this block (around lines 323-330):
```tsx
      {/* Explanation */}
      {question.explanation && (
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 mb-6">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {tp('explanationLabel')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{question.explanation}</p>
        </div>
      )}
```

Insert AFTER it (before the difficulty feedback section):
```tsx
      {/* Deep Dive Analysis — only shown for wrong answers */}
      {!isCorrect && deepDive && !deepDiveDismissed && (
        <DeepDiveCard
          deepDive={deepDive}
          onDismiss={() => setDeepDiveDismissed(true)}
        />
      )}
```

**Step 6: Pass `deepDive` from `lastResult` to `ResultCard` (around line ~672):**

Find:
```tsx
          <ResultCard
            question={currentQuestion}
            isCorrect={lastResult.isCorrect}
            userAnswer={lastUserAnswer}
            evaluationFeedback={lastResult.evaluationFeedback}
            evaluationMethod={lastResult.evaluationMethod}
            evaluationScore={lastResult.evaluationScore}
            onNext={handleNext}
            onDifficultyFeedback={handleDifficultyFeedback}
            questionIndex={currentIndex}
          />
```

Replace with:
```tsx
          <ResultCard
            question={currentQuestion}
            isCorrect={lastResult.isCorrect}
            userAnswer={lastUserAnswer}
            evaluationFeedback={lastResult.evaluationFeedback}
            evaluationMethod={lastResult.evaluationMethod}
            evaluationScore={lastResult.evaluationScore}
            deepDive={lastResult.deepDive}
            onNext={handleNext}
            onDifficultyFeedback={handleDifficultyFeedback}
            questionIndex={currentIndex}
          />
```

**Verification:**
```bash
npx tsc --noEmit 2>&1 | head -10
```

---

### Task 5-7: Type-check and build

**Files:** None (verification only)

**Action:**
```bash
cd /Users/curvalux/NoteSnap
npx tsc --noEmit
npm run build 2>&1 | tail -20
```

**Expected:** Zero errors.

---

### Task 5-8: Commit Feature #5

**Action:**
```bash
cd /Users/curvalux/NoteSnap
git add \
  lib/practice/types.ts \
  lib/practice/session-manager.ts \
  components/practice/DeepDiveCard.tsx \
  app/\(main\)/practice/\[sessionId\]/PracticeSessionContent.tsx \
  messages/en/practice.json \
  messages/he/practice.json

git commit -m "feat: add 'Why Was I Wrong?' deep dive analysis to practice sessions

When a student answers incorrectly, the API now generates a 3-part AI analysis:
1. What you thought — specific to the student's actual answer
2. The mistake — why that reasoning fails
3. How to think about it — correct mental model with analogy

Includes a quick-check verification question. Panels appear with staggered
animation. Fully bilingual (EN/HE). Non-blocking with 8s timeout."
```

---

## Feature #11: "I'm Still Confused" Escalation Ladder

**Goal:** Add a cycling escalation button below tutor messages in the homework helper chat. Each press escalates through increasingly concrete help strategies: rephrase, analogy, worked example, video, easier problem, and finally "ask your teacher."

**Scope:**
- New component: `components/homework/EscalationButton.tsx`
- Modify: `components/homework/TutoringChat.tsx` — add escalation button to tutor messages
- Modify: `app/api/homework/sessions/[sessionId]/chat/route.ts` — detect escalation prefix
- Modify: `lib/homework/tutor-engine.ts` — add escalation-aware prompt template
- i18n: `messages/en/chat.json` and `messages/he/chat.json`

---

### Task 11-1: Add i18n keys for escalation ladder

**File:** `/Users/curvalux/NoteSnap/messages/en/chat.json`

**Action:** Add the following keys after `"diagramAutoAdvance"` (line 32):

```json
  "escalationLabel": "Still confused?",
  "escalation1": "I'm still confused",
  "escalation2": "Try an analogy",
  "escalation3": "Show me with numbers",
  "escalation4": "Watch a video",
  "escalation5": "Start easier",
  "escalation6": "Ask your teacher",
  "escalationTeacherMessage": "Sometimes it helps to talk to your teacher directly. You could say: \"I'm working on {topic} and I'm having trouble understanding {concept}. Could you explain it differently?\"",
  "escalationTeacherShare": "Copy to share with your teacher"
```

**File:** `/Users/curvalux/NoteSnap/messages/he/chat.json`

**Action:** Add the corresponding Hebrew keys after `"diagramAutoAdvance"` (line 32):

```json
  "escalationLabel": "עדיין לא ברור?",
  "escalation1": "עדיין לא מבין",
  "escalation2": "נסה אנלוגיה",
  "escalation3": "הראה לי עם מספרים",
  "escalation4": "צפה בסרטון",
  "escalation5": "התחל יותר קל",
  "escalation6": "שאל את המורה",
  "escalationTeacherMessage": "לפעמים עוזר לדבר עם המורה ישירות. תוכל לומר: \"אני עובד על {topic} ואני מתקשה להבין את {concept}. תוכל להסביר לי אחרת?\"",
  "escalationTeacherShare": "העתק לשיתוף עם המורה"
```

**Verification:**
```bash
node -e "require('./messages/en/chat.json')"
node -e "require('./messages/he/chat.json')"
```

---

### Task 11-2: Create `EscalationButton` component

**File:** `/Users/curvalux/NoteSnap/components/homework/EscalationButton.tsx` (NEW FILE)

**Action:** Create the cycling escalation button component.

```tsx
'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'

// ============================================================================
// Types
// ============================================================================

export type EscalationLevel = 0 | 1 | 2 | 3 | 4 | 5

export type EscalationAction =
  | 'REPHRASE'
  | 'ANALOGY'
  | 'CONCRETE'
  | 'VIDEO'
  | 'EASIER'
  | 'TEACHER'

interface EscalationConfig {
  level: EscalationLevel
  action: EscalationAction
  labelKey: string
  icon: string
}

const ESCALATION_LEVELS: EscalationConfig[] = [
  { level: 0, action: 'REPHRASE', labelKey: 'escalation1', icon: '😕' },
  { level: 1, action: 'ANALOGY', labelKey: 'escalation2', icon: '→' },
  { level: 2, action: 'CONCRETE', labelKey: 'escalation3', icon: '→' },
  { level: 3, action: 'VIDEO', labelKey: 'escalation4', icon: '→' },
  { level: 4, action: 'EASIER', labelKey: 'escalation5', icon: '→' },
  { level: 5, action: 'TEACHER', labelKey: 'escalation6', icon: '🏫' },
]

interface EscalationButtonProps {
  /** Current escalation level for this message context (0-5) */
  currentLevel: EscalationLevel
  /** Called when student clicks — returns the action and next level */
  onEscalate: (action: EscalationAction, level: EscalationLevel) => void
  /** Whether the chat is currently loading */
  disabled?: boolean
  /** Topic for teacher message (used at level 5) */
  topic?: string
  /** Concept for teacher message (used at level 5) */
  concept?: string
}

// ============================================================================
// Component
// ============================================================================

export default function EscalationButton({
  currentLevel,
  onEscalate,
  disabled = false,
  topic,
  concept,
}: EscalationButtonProps) {
  const t = useTranslations('chat')
  const [showTeacherMessage, setShowTeacherMessage] = useState(false)
  const [copied, setCopied] = useState(false)

  const config = ESCALATION_LEVELS[currentLevel]
  if (!config) return null

  const handleClick = useCallback(() => {
    if (disabled) return

    if (config.action === 'TEACHER') {
      setShowTeacherMessage(true)
      return
    }

    const nextLevel = Math.min(currentLevel + 1, 5) as EscalationLevel
    onEscalate(config.action, nextLevel)
  }, [disabled, config, currentLevel, onEscalate])

  const handleCopyTeacherMessage = useCallback(async () => {
    const message = t('escalationTeacherMessage', {
      topic: topic || 'this topic',
      concept: concept || 'this concept',
    })
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }, [t, topic, concept])

  return (
    <div className="mt-2">
      {/* Escalation Button */}
      {!showTeacherMessage && (
        <motion.button
          onClick={handleClick}
          disabled={disabled}
          whileTap={{ scale: 0.97 }}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
            transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
            ${currentLevel === 0
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
              : currentLevel === 5
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
        >
          <span>{config.icon}</span>
          <span>{t(config.labelKey)}</span>
        </motion.button>
      )}

      {/* Teacher Message (Level 5) */}
      <AnimatePresence>
        {showTeacherMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4"
          >
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              {t('escalationTeacherMessage', {
                topic: topic || 'this topic',
                concept: concept || 'this concept',
              })}
            </p>
            <button
              onClick={handleCopyTeacherMessage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              {copied ? '✓' : '📋'}
              <span>{copied ? 'Copied!' : t('escalationTeacherShare')}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Verification:**
```bash
npx tsc --noEmit 2>&1 | head -10
```

---

### Task 11-3: Add escalation state and button to `TutoringChat`

**File:** `/Users/curvalux/NoteSnap/components/homework/TutoringChat.tsx`

**Action:** Import EscalationButton, add per-conversation escalation state, and render the button below each tutor message.

**Step 1: Add import (after line 8):**
```typescript
import EscalationButton, { type EscalationLevel, type EscalationAction } from './EscalationButton'
```

**Step 2: Add escalation state in the main `TutoringChat` component (after line 293, inside the component):**

Find:
```typescript
  const [explanationStyle, setExplanationStyle] = useState<ExplanationStyleId>('step_by_step')
```

Add after it:
```typescript
  // Escalation ladder state: tracks the current level per message index
  // When a new tutor message arrives, a new entry is added at level 0
  const [escalationLevels, setEscalationLevels] = useState<Record<number, EscalationLevel>>({})
```

**Step 3: Add escalation handler (after `handleHintRequest`, around line 365):**

```typescript
  const handleEscalation = useCallback(
    async (messageIndex: number, action: EscalationAction, nextLevel: EscalationLevel) => {
      if (isLoading || isSubmitting) return

      // Update the level for this message
      setEscalationLevels((prev) => ({ ...prev, [messageIndex]: nextLevel }))

      // Send a special prefixed message that the API route will detect
      const escalationPrefix = `[ESCALATION:${action}] `
      await onSendMessage(escalationPrefix + 'Please explain differently.', explanationStyle)
    },
    [isLoading, isSubmitting, onSendMessage, explanationStyle]
  )
```

**Step 4: Pass escalation props to `MessageBubble` and render button.**

Change the messages render section (around line 392-398):

From:
```tsx
          {session.conversation.map((msg, idx) => (
            <MessageBubble
              key={idx}
              message={msg}
              t={t}
            />
          ))}
```

To:
```tsx
          {session.conversation.map((msg, idx) => (
            <div key={idx}>
              <MessageBubble
                message={msg}
                t={t}
              />
              {/* Escalation button — only on tutor messages, not the first welcome message */}
              {msg.role === 'tutor' && idx > 0 && (
                <div className="ms-9 mt-1">
                  <EscalationButton
                    currentLevel={escalationLevels[idx] ?? 0}
                    onEscalate={(action, level) => handleEscalation(idx, action, level)}
                    disabled={isLoading || isSubmitting}
                    topic={session.detected_topic || undefined}
                    concept={session.detected_concepts?.[0] || undefined}
                  />
                </div>
              )}
            </div>
          ))}
```

**Verification:**
```bash
npx tsc --noEmit 2>&1 | head -10
```

---

### Task 11-4: Handle escalation prefix in chat API route

**File:** `/Users/curvalux/NoteSnap/app/api/homework/sessions/[sessionId]/chat/route.ts`

**Action:** Detect the `[ESCALATION:ACTION]` prefix in incoming messages and pass the escalation action to the tutor engine context.

Find (around line 52-53):
```typescript
    if (!body.message || typeof body.message !== 'string') {
      return createErrorResponse(ErrorCodes.FIELD_REQUIRED, 'Message is required')
    }
```

Add AFTER that block (around line 55):
```typescript
    // Detect escalation prefix: [ESCALATION:ACTION] message
    let escalationAction: string | null = null
    let cleanMessage = body.message
    const escalationMatch = body.message.match(/^\[ESCALATION:(\w+)\]\s*/)
    if (escalationMatch) {
      escalationAction = escalationMatch[1] // REPHRASE, ANALOGY, CONCRETE, VIDEO, EASIER
      cleanMessage = body.message.replace(escalationMatch[0], '').trim()
    }
```

Then, where the `generateTutorResponse` is called (find it in the file — likely around lines 120-160), ensure the `escalationAction` is passed through to the tutor context. The easiest approach is to append it to the student message so the tutor engine sees it.

Find where the student message is added to conversation (there should be a call like `addMessage` or similar). The message passed to `generateTutorResponse` should include the escalation context.

Find where `context` is built for `generateTutorResponse` (the `TutorContext` object). In that object, we need to pass the escalation action. The simplest approach: add escalation to the `recentMessages` by modifying the student message content.

**Actually, the cleanest approach:** modify the student's message content before it's stored, to include a system-visible but user-hidden instruction. Let's instead add it to the TutorContext.

First, read the file to find the exact context-building section. Then add a field. Since modifying TutorContext type is heavier, let's just prepend the escalation instruction to the message before it goes to `generateTutorResponse`.

**Find where `generateTutorResponse` is called and prepend to the message:**

The student message passed to `generateTutorResponse` is in the conversation. Before calling `generateTutorResponse`, if `escalationAction` is set, we modify the last student message to include the escalation instruction.

**Simpler approach — add an instruction to the existing message:**

Find where the student message is saved and where `generateTutorResponse` is called. Between those, inject escalation context.

```typescript
    // If escalation, modify the student message to include the escalation instruction
    const studentMessage = escalationAction
      ? `[Student is requesting escalation: ${escalationAction}. ${getEscalationInstruction(escalationAction)}]\n${cleanMessage || "I still don't understand."}`
      : body.message
```

Add a helper function at the top of the file (after imports):

```typescript
function getEscalationInstruction(action: string): string {
  switch (action) {
    case 'REPHRASE':
      return 'Rephrase your previous explanation using simpler words and shorter sentences. Avoid jargon.'
    case 'ANALOGY':
      return 'Explain using a real-world analogy. Connect the concept to something familiar from everyday life.'
    case 'CONCRETE':
      return 'Show a fully worked numerical example with actual numbers. Walk through each calculation step.'
    case 'VIDEO':
      return 'The student wants a video explanation. Search YouTube for a relevant tutorial.'
    case 'EASIER':
      return 'The problem is too hard. Create a simpler version of the same problem type and walk through it first.'
    default:
      return 'Try a different explanation approach.'
  }
}
```

Then use `studentMessage` instead of `body.message` when saving the student's message and when building the context for `generateTutorResponse`.

For the `VIDEO` action, after the tutor response, trigger the YouTube search (which already exists in the route). The existing code already searches for videos — just ensure it activates when escalation is VIDEO.

**Verification:**
```bash
npx tsc --noEmit 2>&1 | head -10
```

---

### Task 11-5: Type-check and build

**Files:** None (verification only)

**Action:**
```bash
cd /Users/curvalux/NoteSnap
npx tsc --noEmit
npm run build 2>&1 | tail -20
```

**Expected:** Zero errors.

---

### Task 11-6: Commit Feature #11

**Action:**
```bash
cd /Users/curvalux/NoteSnap
git add \
  components/homework/EscalationButton.tsx \
  components/homework/TutoringChat.tsx \
  app/api/homework/sessions/\[sessionId\]/chat/route.ts \
  messages/en/chat.json \
  messages/he/chat.json

git commit -m "feat: add escalation ladder to homework tutoring chat

Students can cycle through 6 escalation levels when still confused:
1. Rephrase — simpler words
2. Analogy — real-world comparison
3. Concrete — worked numerical example
4. Video — YouTube search (existing feature)
5. Easier — simplified version of the problem
6. Ask teacher — copy-paste message for their teacher

Per-message state tracking. Fully bilingual (EN/HE). Accessible."
```

---

## Post-Implementation Checklist

After all three features are committed, run:

```bash
cd /Users/curvalux/NoteSnap
npx tsc --noEmit
npm run build
```

### Manual Testing (browser)

1. **Dead Code Cleanup:** Verify the build succeeds and the practice + homework features still work. Navigate to `/practice` and `/homework/help` in the browser.

2. **Deep Dive Card:** Start a practice session, deliberately answer wrong. Verify:
   - 3 panels appear with staggered animation
   - Quick-check question works (correct + incorrect states)
   - "Got it" button dismisses and shows Next Question button
   - Works in Hebrew mode (RTL layout)
   - Works on mobile (375px width)

3. **Escalation Ladder:** Start a homework help session, get a tutor response. Verify:
   - Escalation button appears below tutor messages (not below student messages, not on first welcome)
   - Clicking cycles through levels 1-5
   - Level 4 (video) triggers YouTube embed display
   - Level 6 shows teacher message with copy button
   - Button is disabled while tutor is typing
   - Works in Hebrew mode
