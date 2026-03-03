# Batch 5: Scan -> Solve -> Explain -- Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Solve This" button below recognized formulas in the formula scanner. Shows step-by-step solution, optional interactive graph (Desmos), and plain-English explanation.

**Architecture:** New API endpoint for solving. New SolveResult component. Reuses DesmosRenderer from Batch 4 for graphing.

**Tech Stack:** Next.js 14, Supabase, TypeScript, KaTeX, Desmos API, Framer Motion

---

## Context: Existing Architecture

The formula scanner currently lives in these files:

- **`app/(main)/formula-scanner/page.tsx`** -- page wrapper
- **`app/(main)/formula-scanner/FormulaScannerContent.tsx`** (261 lines) -- main UI with tabs (text/image), KaTeX preview, analyze button, results display
- **`lib/formula-scanner/analyzer.ts`** (166 lines) -- `analyzeFormulaFromText()`, `analyzeFormulaFromImage()` using Claude AI. Returns `FormulaAnalysis` with: latex, name, nameHe, subject, symbols, derivation, relatedFormulas, practiceQuestion
- **`app/api/formula-scanner/analyze/route.ts`** (47 lines) -- POST endpoint, accepts `{ imageUrl?, latexText? }`, returns `{ analysis }`
- **`components/formula-scanner/FormulaBreakdown.tsx`** (191 lines) -- displays formula name, symbol cards, expandable derivation, related formulas, practice question with answer toggle
- **i18n:** `messages/en/formulaScanner.json` (30 keys), `messages/he/formulaScanner.json` (30 keys)

The DesmosRenderer from Batch 4 will be at: `components/diagrams/DesmosRenderer.tsx`

---

## Data Flow

```
User clicks "Solve This" on analyzed formula
    |
    v
POST /api/formula-scanner/solve { latex, context? }
    |
    v
Claude AI generates: { steps[], graph?, explanation }
    |
    v
SolveResult component renders:
  1. Step-by-step solution (KaTeX + text)
  2. Interactive graph (DesmosRenderer) if applicable
  3. Plain-English explanation
```

---

## Task 1: Create solve API route

**New file:** `/Users/curvalux/NoteSnap/app/api/formula-scanner/solve/route.ts`

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'
import { solveFormula } from '@/lib/formula-scanner/solver'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Parse request
    const body = await request.json()
    const { latex, context } = body as {
      latex: string
      context?: string  // Optional: additional context from the formula analysis
    }

    if (!latex || typeof latex !== 'string') {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'latex is required')
    }

    // Solve
    const solution = await solveFormula(latex, context)

    return NextResponse.json({
      success: true,
      solution,
    })
  } catch (error) {
    console.error('[FormulaSolver] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to solve formula'
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, message)
  }
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 2: Create solver module

**New file:** `/Users/curvalux/NoteSnap/lib/formula-scanner/solver.ts`

```typescript
/**
 * Formula Solver
 *
 * Uses Claude to generate step-by-step solutions, optional Desmos graph expressions,
 * and plain-English explanations for scanned formulas.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'

// --- Types ---

export interface SolveStep {
  stepNumber: number
  /** LaTeX expression for this step */
  expression: string
  /** English explanation */
  explanation: string
  /** Hebrew explanation */
  explanationHe: string
}

export interface SolveGraph {
  engine: 'desmos'
  expressions: Array<{
    latex: string
    color: string
    label?: string
  }>
  xRange?: [number, number]
  yRange?: [number, number]
}

export interface FormulaSolution {
  /** Step-by-step solution */
  steps: SolveStep[]
  /** Interactive graph (null if not applicable) */
  graph: SolveGraph | null
  /** Plain-English explanation (2-3 sentences) */
  explanation: string
  /** Plain-Hebrew explanation */
  explanationHe: string
  /** The original LaTeX formula that was solved */
  originalLatex: string
}

// --- Claude Prompt ---

const SOLVE_FORMULA_PROMPT = `You are a mathematics and science expert. The student scanned a formula and wants to see it solved.

Given the formula in LaTeX notation, do the following:

1. SOLVE it step by step. Show every algebraic step with explanation in both English and Hebrew.
   - If the formula has specific variables (like E = mc^2), substitute example values and solve numerically.
   - If it's an equation to solve (like x^2 - 4 = 0), solve for the variable.
   - If it's a definition (like A = pi*r^2), show how to use it with example values.

2. Should this be GRAPHED? Output Desmos-compatible LaTeX expressions if:
   - The formula has a plottable relationship (y as function of x, or can be rearranged)
   - It involves functions (quadratic, linear, trigonometric, exponential, etc.)
   - It has an interesting visual representation
   If it's simple arithmetic or a constant, set graph to null.

3. EXPLAIN in 2-3 simple sentences what this formula represents, in both English and Hebrew.
   Explain it as if talking to a high school student.

Return ONLY valid JSON (no markdown code blocks):
{
  "steps": [
    {
      "stepNumber": 1,
      "expression": "LaTeX expression for this step",
      "explanation": "English explanation of what we did",
      "explanationHe": "Hebrew explanation"
    }
  ],
  "graph": {
    "engine": "desmos",
    "expressions": [
      { "latex": "y=x^2-4", "color": "#6366f1", "label": "f(x)" }
    ],
    "xRange": [-5, 5],
    "yRange": [-5, 10]
  } | null,
  "explanation": "2-3 sentence English explanation of what this formula means",
  "explanationHe": "Same explanation in Hebrew"
}

Rules:
- Steps should be clear and educational
- Each step should show the mathematical progression
- LaTeX in expressions must be valid KaTeX-compatible LaTeX
- Desmos expressions must use Desmos-compatible LaTeX (e.g., y=x^2 not y=x**2)
- If graph is provided, include appropriate axis ranges
- Graph colors should be from: #6366f1 (violet), #ec4899 (pink), #14b8a6 (teal), #f59e0b (amber), #ef4444 (red)
- Always provide both English AND Hebrew for explanations`

// --- Solver ---

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  return new Anthropic({ apiKey })
}

/**
 * Solve a formula step-by-step with optional graph and explanation.
 */
export async function solveFormula(latex: string, context?: string): Promise<FormulaSolution> {
  const client = getClient()

  const userMessage = context
    ? `Solve this formula: ${latex}\n\nAdditional context: ${context}`
    : `Solve this formula: ${latex}`

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4000,
    system: SOLVE_FORMULA_PROMPT,
    messages: [{
      role: 'user',
      content: userMessage,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse solver response')
  }

  const parsed = JSON.parse(jsonMatch[0]) as Omit<FormulaSolution, 'originalLatex'>

  return {
    ...parsed,
    originalLatex: latex,
  }
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 3: Create SolveResult component

**New file:** `/Users/curvalux/NoteSnap/components/formula-scanner/SolveResult.tsx`

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, BarChart3, BookOpen, Lightbulb } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import 'katex/dist/katex.min.css'
import { BlockMath, InlineMath } from 'react-katex'
import dynamic from 'next/dynamic'
import type { FormulaSolution } from '@/lib/formula-scanner/solver'

// Lazy-load DesmosRenderer (heavy CDN dependency)
const DesmosRenderer = dynamic(() => import('@/components/diagrams/DesmosRenderer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl h-[300px]">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading graph...</span>
      </div>
    </div>
  ),
})

// --- Types ---

interface SolveResultProps {
  solution: FormulaSolution
}

// --- Component ---

export default function SolveResult({ solution }: SolveResultProps) {
  const t = useTranslations('formulaScanner')
  const locale = useLocale()
  const isHe = locale === 'he'

  const [showSteps, setShowSteps] = useState(true)
  const [showGraph, setShowGraph] = useState(true)
  const [showExplanation, setShowExplanation] = useState(true)

  return (
    <div className="space-y-4" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Section 1: Step-by-Step Solution */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowSteps(!showSteps)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            <BookOpen className="w-4 h-4 text-violet-500" />
            {t('solve.stepByStep')}
          </span>
          {showSteps ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        <AnimatePresence>
          {showSteps && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                {solution.steps.map((step, idx) => (
                  <motion.div
                    key={step.stepNumber}
                    initial={{ opacity: 0, x: isHe ? 10 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex gap-3"
                  >
                    {/* Step number badge */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400">
                      {step.stepNumber}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* LaTeX expression */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-1.5 overflow-x-auto">
                        <BlockMath math={step.expression} />
                      </div>

                      {/* Explanation */}
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {isHe ? step.explanationHe : step.explanation}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Section 2: Interactive Graph (if applicable) */}
      {solution.graph && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowGraph(!showGraph)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
              <BarChart3 className="w-4 h-4 text-teal-500" />
              {t('solve.interactiveGraph')}
            </span>
            {showGraph ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          <AnimatePresence>
            {showGraph && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <DesmosRenderer
                    expressions={solution.graph.expressions.map((expr, i) => ({
                      id: `expr-${i}`,
                      latex: expr.latex,
                      color: expr.color,
                      label: expr.label,
                      showLabel: !!expr.label,
                    }))}
                    xRange={solution.graph.xRange || [-10, 10]}
                    yRange={solution.graph.yRange || [-10, 10]}
                    height={350}
                    interactive
                    showGrid
                    showAxisNumbers
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {t('solve.graphHint')}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Section 3: Plain-English Explanation */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            {t('solve.explanation')}
          </span>
          {showExplanation ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {isHe ? solution.explanationHe : solution.explanation}
                  </p>
                </div>

                {/* Original formula reference */}
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <span>{t('solve.originalFormula')}:</span>
                  <InlineMath math={solution.originalLatex} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 4: Add "Solve This" button to FormulaScannerContent

**File:** `/Users/curvalux/NoteSnap/app/(main)/formula-scanner/FormulaScannerContent.tsx`

Modifications:

1. Import the new types and SolveResult component
2. Add state for solving: `isSolving`, `solution`
3. Add `handleSolve` function that calls `/api/formula-scanner/solve`
4. Render the "Solve This" button below FormulaBreakdown when analysis exists
5. Render SolveResult below the button when solution exists

**Add imports** at the top:

```typescript
import SolveResult from '@/components/formula-scanner/SolveResult'
import type { FormulaSolution } from '@/lib/formula-scanner/solver'
import { Calculator } from 'lucide-react'
```

**Add state** inside `FormulaScannerContent`:

```typescript
const [isSolving, setIsSolving] = useState(false)
const [solution, setSolution] = useState<FormulaSolution | null>(null)
```

**Add handler** inside `FormulaScannerContent`:

```typescript
const handleSolve = useCallback(async () => {
  if (!analysis || isSolving) return
  setIsSolving(true)
  setSolution(null)

  try {
    const response = await fetch('/api/formula-scanner/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latex: analysis.latex,
        context: `Formula: ${analysis.name}. Subject: ${analysis.subject}. ${analysis.derivation}`,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.message || 'Solving failed')
    }

    const data = await response.json()
    setSolution(data.solution)
  } catch (err) {
    console.error('[FormulaScanner] Solve error:', err)
    showError(err instanceof Error ? err.message : t('errors.solveFailed'))
  } finally {
    setIsSolving(false)
  }
}, [analysis, isSolving, showError, t])
```

**Render** inside the `<AnimatePresence>` block, after `<FormulaBreakdown>`:

```tsx
{/* Solve This Button */}
{analysis && (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.3 }}
    className="mt-4"
  >
    <button
      onClick={handleSolve}
      disabled={isSolving}
      className="w-full py-3.5 px-6 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
    >
      {isSolving ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          {t('solve.solving')}
        </>
      ) : (
        <>
          <Calculator className="w-5 h-5" />
          {t('solve.solveThis')}
        </>
      )}
    </button>
  </motion.div>
)}

{/* Solution Result */}
{solution && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-6"
  >
    <SolveResult solution={solution} />
  </motion.div>
)}
```

Also, reset `solution` when analysis changes:

In `handleAnalyze`, add `setSolution(null)` at the start.

In tab change handlers and file change handler, add `setSolution(null)`.

**Verify:** `npx tsc --noEmit`

---

## Task 5: Add i18n keys for solve feature

**File:** `/Users/curvalux/NoteSnap/messages/en/formulaScanner.json`

Add these keys (merge into existing):

```json
{
  "solve": {
    "solveThis": "Solve This",
    "solving": "Solving...",
    "stepByStep": "Step-by-Step Solution",
    "interactiveGraph": "Interactive Graph",
    "graphHint": "Drag to pan, scroll to zoom",
    "explanation": "What Does This Mean?",
    "originalFormula": "Original formula",
    "noGraph": "No graph applicable for this formula"
  },
  "errors": {
    "solveFailed": "Failed to solve formula. Please try again."
  }
}
```

**File:** `/Users/curvalux/NoteSnap/messages/he/formulaScanner.json`

Add these keys (merge into existing):

```json
{
  "solve": {
    "solveThis": "פתור את זה",
    "solving": "...פותר",
    "stepByStep": "פתרון שלב אחר שלב",
    "interactiveGraph": "גרף אינטראקטיבי",
    "graphHint": "גרור לזוז, גלול לזום",
    "explanation": "מה זה אומר?",
    "originalFormula": "הנוסחה המקורית",
    "noGraph": "אין גרף רלוונטי לנוסחה זו"
  },
  "errors": {
    "solveFailed": "נכשל בפתרון הנוסחה. נסה שוב."
  }
}
```

**Verify:** Both files are valid JSON.

---

## Task 6: Type check + build

```bash
cd /Users/curvalux/NoteSnap && npx tsc --noEmit
```

Common issues:
1. `Calculator` import from lucide-react -- already used in FormulaBreakdown, so it's available
2. `Loader2` import -- already imported in FormulaScannerContent
3. `FormulaSolution` type -- ensure it's exported from solver.ts

After type check passes:

```bash
cd /Users/curvalux/NoteSnap && npm run build
```

---

## Task 7: Commit

```bash
cd /Users/curvalux/NoteSnap && git add -A && git commit -m "feat: formula scanner Solve This -- step-by-step solution, graph, explanation

- Add POST /api/formula-scanner/solve endpoint
- Add lib/formula-scanner/solver.ts with Claude-powered solving
- Add SolveResult component with 3 expandable sections
- Integrate DesmosRenderer for interactive graph display
- Add Solve This button to FormulaScannerContent
- Add i18n keys for EN and HE"
```

---

## Summary

| # | Task | Files | Est. |
|---|------|-------|------|
| 1 | Create solve API route | `app/api/formula-scanner/solve/route.ts` (NEW) | 3 min |
| 2 | Create solver module | `lib/formula-scanner/solver.ts` (NEW) | 4 min |
| 3 | Create SolveResult component | `components/formula-scanner/SolveResult.tsx` (NEW) | 5 min |
| 4 | Add Solve button to FormulaScannerContent | `app/(main)/formula-scanner/FormulaScannerContent.tsx` | 5 min |
| 5 | Add i18n keys | `messages/{en,he}/formulaScanner.json` | 2 min |
| 6 | Type check + build | -- | 3 min |
| 7 | Commit | -- | 1 min |
| **Total** | | **3 new + 3 modified** | **~23 min** |

---

## Dependencies

- **Batch 4:** DesmosRenderer must exist at `components/diagrams/DesmosRenderer.tsx` before Task 3 can use it. If Batch 4 is not yet complete, the SolveResult component will still work -- it lazy-loads DesmosRenderer and shows a loading spinner if the component is not available. The graph section simply won't render if Desmos is not installed.
