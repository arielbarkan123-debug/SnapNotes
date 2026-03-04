# Day 1: Step-by-Step Animated Diagram Breakdowns

## Goal
When the tutor explains a multi-step problem (equations, proofs, derivations), generate a **multi-step animated sequence** where each step has its own AI-generated diagram + explanation. Students navigate forward/back through steps with smooth animations.

## Prerequisites
- Day 0 completed (deps installed, migration applied, build passes)
- Diagram engine working (`lib/diagram-engine/` exists with `generateDiagram()`, `tryEngineDiagram()`)

---

## Project Context & Conventions

**NoteSnap** is a Next.js 14 (App Router) homework assistant with Supabase, Tailwind, next-intl (EN+HE), dark mode.

### Key Conventions
- **API Routes**: `createClient()` + `getUser()` for auth, `createErrorResponse(ErrorCodes.X)` for errors
- **i18n**: `useTranslations('namespace')` + JSON files in `messages/{en,he}/`
- **Components**: `'use client'` directive, Framer Motion for animations, `dark:` Tailwind classes
- **Diagrams**: Engine generates PNG images via `tryEngineDiagram(question)` → returns `{ imageUrl, pipeline, overlay?, qaVerdict? }`
- **Diagram Types**: Registered in `components/homework/diagram/types.ts`, rendered by `DiagramRenderer.tsx`
- **Tutor Engine**: `lib/homework/tutor-engine.ts` generates responses with optional `diagram` field

### Critical File Locations
- `lib/diagram-engine/index.ts` — Main `generateDiagram()` orchestrator
- `lib/diagram-engine/integration.ts` — `tryEngineDiagram()` wrapper with concurrency control
- `lib/homework/tutor-engine.ts` — `generateTutorResponse()` main function
- `lib/homework/types.ts` — `TutorDiagramState` type definition (line ~334)
- `components/homework/diagram/types.ts` — Frontend `DiagramState`, `ENGINE_DIAGRAM_TYPES`
- `components/homework/diagram/DiagramRenderer.tsx` — Renders diagrams by type
- `components/homework/diagram/EngineDiagramImage.tsx` — Renders engine-generated images
- `messages/en/diagram.json` + `messages/he/diagram.json` — Diagram i18n strings

---

## Implementation Steps

### Step 1: Create `lib/diagram-engine/step-sequence.ts`

This is the core generator that decomposes a problem into steps and generates a diagram for each.

```typescript
/**
 * Step Sequence Generator
 *
 * Decomposes a multi-step problem into 3-7 visual steps,
 * generates a diagram for each step using the engine.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import { generateDiagram } from './index'
import type { Pipeline } from './index'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DiagramStep {
  stepNumber: number
  title: string
  titleHe: string
  explanation: string
  explanationHe: string
  diagramPrompt: string
  diagramImageUrl: string | null
  pipeline: string | null
  highlightWhat: string
}

export interface StepSequenceResult {
  question: string
  totalSteps: number
  steps: DiagramStep[]
  summary: string
  summaryHe: string
  partial: boolean // true if some diagrams failed
}

// ─── Step Decomposition via Claude ───────────────────────────────────────────

const DECOMPOSE_SYSTEM_PROMPT = `You are a math/science tutor breaking down a problem into clear visual steps.

Given a question, decompose the solution into 3-5 steps. Each step should be a clear, self-contained stage of the solution.

Return JSON (no markdown):
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title in English",
      "titleHe": "Step title in Hebrew",
      "explanation": "Clear 1-3 sentence explanation in English",
      "explanationHe": "Same explanation in Hebrew",
      "diagramPrompt": "A specific prompt to generate a diagram showing THIS step visually. Be concrete: mention exact values, coordinates, shapes, labels.",
      "highlightWhat": "What new element appears in this step (e.g., 'the discriminant calculation')"
    }
  ],
  "summary": "One sentence English summary of the full solution",
  "summaryHe": "Same summary in Hebrew"
}

Rules:
- 3-5 steps maximum (prefer 3-4 for simple problems)
- Each diagramPrompt must be specific enough to generate a standalone diagram
- Include actual numbers/values from the problem in diagramPrompt
- Steps should build on each other logically
- Keep explanations concise but clear
- Always provide both English and Hebrew`

async function decomposeIntoSteps(question: string): Promise<{
  steps: Array<{
    stepNumber: number
    title: string
    titleHe: string
    explanation: string
    explanationHe: string
    diagramPrompt: string
    highlightWhat: string
  }>
  summary: string
  summaryHe: string
}> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 2048,
    system: DECOMPOSE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: question }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract JSON (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse step decomposition response')
  }

  return JSON.parse(jsonMatch[0])
}

// ─── Main Generator ─────────────────────────────────────────────────────────

/**
 * Generate a step-by-step diagram sequence for a multi-step problem.
 *
 * 1. Claude decomposes the problem into 3-5 steps
 * 2. Each step's diagramPrompt is sent to generateDiagram() sequentially
 * 3. Failed diagrams are skipped (partial: true)
 * 4. Returns the full sequence for the frontend StepSequencePlayer
 */
export async function generateStepSequence(
  question: string,
  context?: { subject?: string; language?: string },
): Promise<StepSequenceResult> {
  console.log(`[StepSequence] Generating for: "${question.slice(0, 80)}..."`)

  // Step 1: Decompose problem into steps via Claude
  const decomposition = await decomposeIntoSteps(question)

  if (!decomposition.steps || decomposition.steps.length === 0) {
    throw new Error('No steps generated from decomposition')
  }

  console.log(`[StepSequence] Decomposed into ${decomposition.steps.length} steps`)

  // Step 2: Generate diagrams sequentially (avoid rate limits)
  const steps: DiagramStep[] = []
  let hasFailures = false

  for (const step of decomposition.steps) {
    console.log(`[StepSequence] Generating diagram for step ${step.stepNumber}: "${step.diagramPrompt.slice(0, 60)}..."`)

    try {
      const result = await generateDiagram(step.diagramPrompt)

      if ('error' in result) {
        console.warn(`[StepSequence] Step ${step.stepNumber} diagram failed: ${result.error}`)
        hasFailures = true
        steps.push({
          ...step,
          diagramImageUrl: null,
          pipeline: null,
        })
      } else {
        steps.push({
          ...step,
          diagramImageUrl: result.imageUrl,
          pipeline: result.pipeline,
        })
      }
    } catch (err) {
      console.error(`[StepSequence] Step ${step.stepNumber} error:`, err)
      hasFailures = true
      steps.push({
        ...step,
        diagramImageUrl: null,
        pipeline: null,
      })
    }
  }

  const successCount = steps.filter(s => s.diagramImageUrl).length
  console.log(`[StepSequence] Complete: ${successCount}/${steps.length} diagrams generated`)

  return {
    question,
    totalSteps: steps.length,
    steps,
    summary: decomposition.summary,
    summaryHe: decomposition.summaryHe,
    partial: hasFailures,
  }
}

/**
 * Check if a question is suitable for step sequence (multi-step problem).
 * Simple concept questions should use single diagrams.
 */
export function isMultiStepProblem(question: string): boolean {
  const multiStepIndicators = [
    /solve/i, /calculate/i, /find\s+(the|x|y)/i, /compute/i,
    /prove/i, /derive/i, /show\s+that/i, /evaluate/i,
    /simplify/i, /factor/i, /expand/i, /integrate/i,
    /differentiate/i, /graph/i, /sketch/i,
    /step.by.step/i, /how\s+to/i, /work\s+out/i,
    /\d+\s*[+\-*/×÷=]\s*\d+/,  // Math expressions
    /x\s*[²³]|x\^/i,  // Polynomial expressions
    // Hebrew indicators
    /פתור/i, /חשב/i, /מצא/i, /הוכח/i,
  ]

  return multiStepIndicators.some(pattern => pattern.test(question))
}
```

### Step 2: Create `components/homework/diagram/StepDot.tsx`

```typescript
'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface StepDotProps {
  stepNumber: number
  isActive: boolean
  isCompleted: boolean
  onClick: () => void
  label?: string
}

export default function StepDot({ stepNumber, isActive, isCompleted, onClick, label }: StepDotProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group"
      aria-label={label || `Step ${stepNumber}`}
      aria-current={isActive ? 'step' : undefined}
    >
      <motion.div
        className={`
          flex items-center justify-center rounded-full transition-colors duration-200
          ${isActive
            ? 'w-8 h-8 bg-violet-600 text-white shadow-lg shadow-violet-600/30'
            : isCompleted
              ? 'w-6 h-6 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
              : 'w-6 h-6 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
          }
        `}
        animate={{ scale: isActive ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {isCompleted && !isActive ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <span className="text-xs font-semibold">{stepNumber}</span>
        )}
      </motion.div>
      {label && (
        <span className={`text-[10px] max-w-[60px] text-center leading-tight truncate
          ${isActive ? 'text-violet-600 dark:text-violet-400 font-medium' : 'text-gray-400 dark:text-gray-500'}
        `}>
          {label}
        </span>
      )}
    </button>
  )
}
```

### Step 3: Create `components/homework/diagram/StepSequencePlayer.tsx`

```typescript
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import StepDot from './StepDot'
import EngineDiagramImage from './EngineDiagramImage'

interface StepData {
  stepNumber: number
  title: string
  titleHe: string
  explanation: string
  explanationHe: string
  diagramImageUrl: string | null
  pipeline: string | null
  highlightWhat: string
}

interface StepSequencePlayerProps {
  steps: StepData[]
  language?: 'en' | 'he'
  summary?: string
  summaryHe?: string
  partial?: boolean
  onComplete?: () => void
}

const AUTOPLAY_INTERVAL = 5000 // 5 seconds per step

export default function StepSequencePlayer({
  steps,
  language = 'en',
  summary,
  summaryHe,
  partial,
  onComplete,
}: StepSequencePlayerProps) {
  const t = useTranslations('diagram')
  const isHe = language === 'he'
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0) // -1 = back, 1 = forward
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]))
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalSteps = steps.length
  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  // ─── Navigation ────────────────────────────────────────────────────────────

  const goToStep = useCallback((index: number) => {
    if (index < 0 || index >= totalSteps) return
    setDirection(index > currentStep ? 1 : -1)
    setCurrentStep(index)
    setVisitedSteps(prev => new Set([...prev, index]))
  }, [currentStep, totalSteps])

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete?.()
      setIsAutoPlaying(false)
      return
    }
    goToStep(currentStep + 1)
  }, [currentStep, isLast, goToStep, onComplete])

  const goPrev = useCallback(() => {
    if (!isFirst) goToStep(currentStep - 1)
  }, [currentStep, isFirst, goToStep])

  const restart = useCallback(() => {
    setDirection(-1)
    setCurrentStep(0)
    setVisitedSteps(new Set([0]))
    setIsAutoPlaying(false)
  }, [])

  // ─── Auto-play ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(goNext, AUTOPLAY_INTERVAL)
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [isAutoPlaying, goNext])

  // Stop autoplay when reaching last step
  useEffect(() => {
    if (isLast && isAutoPlaying) {
      setIsAutoPlaying(false)
    }
  }, [isLast, isAutoPlaying])

  // ─── Keyboard Navigation ──────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        isHe ? goPrev() : goNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        isHe ? goNext() : goPrev()
      } else if (e.key === ' ') {
        e.preventDefault()
        setIsAutoPlaying(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, isHe])

  // ─── Touch Swipe ───────────────────────────────────────────────────────────

  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    const threshold = 50

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        isHe ? goNext() : goPrev() // Swipe right
      } else {
        isHe ? goPrev() : goNext() // Swipe left
      }
    }
    touchStartX.current = null
  }

  // ─── Animation Variants ────────────────────────────────────────────────────

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
      role="region"
      aria-label={t('stepSequence.ariaLabel')}
      dir={isHe ? 'rtl' : 'ltr'}
    >
      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-700">
        <motion.div
          className="h-full bg-violet-600"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        {steps.map((s, i) => (
          <StepDot
            key={i}
            stepNumber={i + 1}
            isActive={i === currentStep}
            isCompleted={visitedSteps.has(i) && i !== currentStep}
            onClick={() => goToStep(i)}
            label={isHe ? s.titleHe : s.title}
          />
        ))}
      </div>

      {/* Main content area */}
      <div
        className="relative min-h-[350px] md:min-h-[400px]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="p-4 md:p-6"
          >
            {/* Step header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-xs font-bold">
                {step.stepNumber}
              </span>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {isHe ? step.titleHe : step.title}
              </h3>
            </div>

            {/* Explanation */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              {isHe ? step.explanationHe : step.explanation}
            </p>

            {/* Diagram */}
            {step.diagramImageUrl ? (
              <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                <EngineDiagramImage
                  imageUrl={step.diagramImageUrl}
                  pipeline={step.pipeline || undefined}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {t('stepSequence.diagramUnavailable')}
                </p>
              </div>
            )}

            {/* Highlight badge */}
            {step.highlightWhat && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/20 rounded-full">
                <span className="text-violet-600 dark:text-violet-400 text-xs">
                  {step.highlightWhat}
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        {/* Left: Previous */}
        <button
          onClick={isHe ? goNext : goPrev}
          disabled={isHe ? isLast : isFirst}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label={t('stepSequence.previous')}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('stepSequence.previous')}</span>
        </button>

        {/* Center: Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoPlaying(prev => !prev)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={isAutoPlaying ? t('stepSequence.pause') : t('stepSequence.play')}
          >
            {isAutoPlaying ? (
              <Pause className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            ) : (
              <Play className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          <span className="text-xs text-gray-400 dark:text-gray-500 min-w-[40px] text-center">
            {currentStep + 1} / {totalSteps}
          </span>

          {isLast && (
            <button
              onClick={restart}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('stepSequence.restart')}
            >
              <RotateCcw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        {/* Right: Next */}
        <button
          onClick={isHe ? goPrev : goNext}
          disabled={isHe ? isFirst : isLast}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label={t('stepSequence.next')}
        >
          <span className="hidden sm:inline">{t('stepSequence.next')}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary (shown on last step) */}
      {isLast && (summary || summaryHe) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pb-4"
        >
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-1">
              {t('stepSequence.summary')}
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              {isHe ? summaryHe : summary}
            </p>
          </div>
        </motion.div>
      )}

      {/* Partial warning */}
      {partial && (
        <div className="px-4 pb-3">
          <p className="text-xs text-amber-500 dark:text-amber-400 text-center">
            {t('stepSequence.partialWarning')}
          </p>
        </div>
      )}
    </div>
  )
}
```

### Step 4: Modify `lib/homework/types.ts`

Add `'step_sequence'` to the `TutorDiagramState.type` union. Find the type union (around line 336) and add it:

```typescript
// In the TutorDiagramState interface, add 'step_sequence' to the type union:
// After '| 'engine_image'' add:
    | 'step_sequence'
```

Also add the step sequence data interface after `TutorDiagramState`:

```typescript
/** Step sequence diagram data shape */
export interface StepSequenceDiagramData {
  steps: Array<{
    stepNumber: number
    title: string
    titleHe: string
    explanation: string
    explanationHe: string
    diagramImageUrl: string | null
    pipeline: string | null
    highlightWhat: string
  }>
  summary: string
  summaryHe: string
  partial: boolean
}
```

### Step 5: Modify `components/homework/diagram/types.ts`

Update the constants to include `step_sequence`:

```typescript
// ENGINE_DIAGRAM_TYPES — add 'step_sequence'
export const ENGINE_DIAGRAM_TYPES = ['engine_image', 'step_sequence']

// DIAGRAM_TYPE_NAMES — add entry
export const DIAGRAM_TYPE_NAMES: Record<string, string> = {
  engine_image: 'AI Generated Diagram',
  step_sequence: 'Step-by-Step Breakdown',
}
```

### Step 6: Modify `components/homework/diagram/DiagramRenderer.tsx`

Add a lazy-loaded case for `step_sequence` BEFORE the `engine_image` case. Add at the top of the file:

```typescript
import { lazy, Suspense } from 'react'

const StepSequencePlayer = lazy(() => import('./StepSequencePlayer'))
```

Then in the component body, BEFORE the `engine_image` check, add:

```typescript
  // Step sequence diagram (multi-step animated breakdown)
  if (diagramType === 'step_sequence') {
    const seqData = diagram.data as {
      steps?: Array<{
        stepNumber: number
        title: string
        titleHe: string
        explanation: string
        explanationHe: string
        diagramImageUrl: string | null
        pipeline: string | null
        highlightWhat: string
      }>
      summary?: string
      summaryHe?: string
      partial?: boolean
    } | undefined

    if (seqData?.steps && seqData.steps.length > 0) {
      return (
        <DiagramErrorBoundary diagramType={diagramType} diagramData={seqData} onError={onRenderError}>
          <Suspense fallback={
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
          }>
            <StepSequencePlayer
              steps={seqData.steps}
              language={language}
              summary={seqData.summary}
              summaryHe={seqData.summaryHe}
              partial={seqData.partial}
            />
          </Suspense>
        </DiagramErrorBoundary>
      )
    }
  }
```

Also add `language` to the DiagramRendererProps interface if not already there:
```typescript
interface DiagramRendererProps {
  // ... existing props
  language?: 'en' | 'he'  // Add if missing
}
```

And destructure it in the function signature.

### Step 7: Modify `lib/homework/tutor-engine.ts`

This is the most critical modification. Find `generateTutorResponse()` and modify it to use step sequences for multi-step problems.

**What to change:**
1. Import the new functions:
```typescript
import { generateStepSequence, isMultiStepProblem } from '@/lib/diagram-engine/step-sequence'
```

2. In the diagram generation logic (where `tryEngineDiagram()` is called), add a check:
```typescript
// Before calling tryEngineDiagram, check if this is a multi-step problem
// that should get a step sequence instead
if (enableDiagrams && isMultiStepProblem(question)) {
  // Check if the pedagogical intent suggests showing the full solution
  const intent = tutorResponse.pedagogicalIntent
  if (intent === 'show_answer' || intent === 'guide_next_step') {
    try {
      const sequence = await generateStepSequence(question)
      if (sequence.steps.length > 0) {
        tutorResponse.diagram = {
          type: 'step_sequence' as const,
          visibleStep: 0,
          totalSteps: sequence.totalSteps,
          data: {
            steps: sequence.steps,
            summary: sequence.summary,
            summaryHe: sequence.summaryHe,
            partial: sequence.partial,
          },
        }
        // Skip single diagram generation
        return // or set a flag to skip the single diagram below
      }
    } catch (err) {
      console.error('[TutorEngine] Step sequence failed, falling back to single diagram:', err)
      // Fall through to single diagram
    }
  }
}
```

**IMPORTANT**: Read the actual `tutor-engine.ts` file carefully before modifying. The exact insertion point depends on the current flow. Look for where `tryEngineDiagram()` is called and add the step sequence logic BEFORE it, with a fallback to the existing single diagram behavior.

### Step 8: Update i18n Files

**Add to `messages/en/diagram.json`:**
```json
{
  "stepSequence": {
    "ariaLabel": "Step-by-step solution breakdown",
    "previous": "Previous",
    "next": "Next",
    "play": "Auto-play",
    "pause": "Pause",
    "restart": "Restart",
    "summary": "Solution Summary",
    "diagramUnavailable": "Diagram could not be generated for this step",
    "partialWarning": "Some step diagrams could not be generated",
    "stepOf": "Step {current} of {total}"
  }
}
```

**Add to `messages/he/diagram.json`:**
```json
{
  "stepSequence": {
    "ariaLabel": "פירוק פתרון צעד אחר צעד",
    "previous": "הקודם",
    "next": "הבא",
    "play": "הפעלה אוטומטית",
    "pause": "השהה",
    "restart": "התחל מחדש",
    "summary": "סיכום הפתרון",
    "diagramUnavailable": "לא ניתן היה ליצור תרשים לשלב זה",
    "partialWarning": "חלק מתרשימי השלבים לא נוצרו",
    "stepOf": "שלב {current} מתוך {total}"
  }
}
```

**NOTE**: These keys should be MERGED into the existing diagram.json files, not replace them. Read the existing content first and add the `stepSequence` key.

---

## Testing Checklist

After all changes are made, verify:

```bash
# 1. TypeScript
npx tsc --noEmit
# Must be zero errors

# 2. Tests
npm test
# All must pass

# 3. Build
npm run build
# Must be clean
```

### Browser Testing
1. Start dev server: `npm run dev`
2. Go to homework help / tutoring chat
3. Ask: "solve 2x² + 5x - 3 = 0" → Should get a step sequence with 3+ steps
4. Test step navigation (click arrows, click dots, press arrow keys)
5. Test auto-play (space bar or play button)
6. Test in Hebrew mode → arrows should flip, Hebrew text should show
7. Test dark mode → all backgrounds, text, borders should have dark variants
8. Test mobile (375px) → full width, swipe should work
9. Ask a concept question: "what is photosynthesis" → Should get single diagram, NOT step sequence

### Edge Cases
- What if ALL diagram generations fail? → Steps show placeholder, `partial: true` warning shows
- What if Claude decomposition returns 0 steps? → Error thrown, falls back to single diagram
- What if step sequence takes too long? → Existing timeout handling should apply

---

## Files Created
- `lib/diagram-engine/step-sequence.ts`
- `components/homework/diagram/StepSequencePlayer.tsx`
- `components/homework/diagram/StepDot.tsx`

## Files Modified
- `lib/homework/types.ts` (add `step_sequence` to type union + `StepSequenceDiagramData`)
- `components/homework/diagram/types.ts` (register `step_sequence`)
- `components/homework/diagram/DiagramRenderer.tsx` (render step sequences)
- `lib/homework/tutor-engine.ts` (use step sequence for multi-step problems)
- `messages/en/diagram.json` (add `stepSequence.*` keys)
- `messages/he/diagram.json` (add `stepSequence.*` keys)

## What's Next
Day 2: Multiple Explanation Styles (`day2-explanation-styles.md`)
