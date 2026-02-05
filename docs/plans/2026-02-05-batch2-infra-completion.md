# Batch 2: Infrastructure Completion (Tasks 4-6)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the remaining foundation infrastructure — step controls UI, renderer wiring, and AI schema system — so that every subsequent diagram component has everything it needs.

**Prerequisites:** Batch 1 complete (Tasks 1-3). The following are available:
- `SUBJECT_COLORS`, `getSubjectColor()`, `getAdaptiveLineWeight()`, `DIAGRAM_BACKGROUNDS` in `lib/diagram-theme.ts`
- `useDiagramBase` hook in `hooks/useDiagramBase.ts`
- `createSpotlightVariants()`, `lineDrawVariants`, `labelAppearVariants`, `createStepSequence()` in `lib/diagram-animations.ts`

**Branch:** `feature/visual-learning-overhaul`
**Worktree:** `/Users/curvalux/NoteSnap/.worktrees/visual-overhaul`

---

## Task 4: DiagramStepControls Component

A reusable step control bar (Next/Prev buttons, progress dots, step label, step counter). Replaces the inconsistent per-component step UIs. Supports RTL, dark mode, subject-coded dot colors.

**Files:**
- Create: `components/diagrams/DiagramStepControls.tsx`
- Test: `__tests__/components/diagrams/DiagramStepControls.test.tsx`

### Step 1: Write failing test

Create `__tests__/components/diagrams/DiagramStepControls.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'

describe('DiagramStepControls', () => {
  const defaultProps = {
    currentStep: 0,
    totalSteps: 5,
    onNext: jest.fn(),
    onPrev: jest.fn(),
    stepLabel: 'Draw the base',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders step label', () => {
    render(<DiagramStepControls {...defaultProps} />)
    expect(screen.getByText('Draw the base')).toBeInTheDocument()
  })

  it('renders step counter (1 / 5)', () => {
    render(<DiagramStepControls {...defaultProps} />)
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
  })

  it('disables prev button on first step', () => {
    render(<DiagramStepControls {...defaultProps} currentStep={0} />)
    const prevBtn = screen.getByLabelText('Previous step')
    expect(prevBtn).toBeDisabled()
  })

  it('disables next button on last step', () => {
    render(<DiagramStepControls {...defaultProps} currentStep={4} />)
    const nextBtn = screen.getByLabelText('Next step')
    expect(nextBtn).toBeDisabled()
  })

  it('calls onNext when next button clicked', () => {
    const onNext = jest.fn()
    render(<DiagramStepControls {...defaultProps} onNext={onNext} />)
    fireEvent.click(screen.getByLabelText('Next step'))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('calls onPrev when prev button clicked', () => {
    const onPrev = jest.fn()
    render(<DiagramStepControls {...defaultProps} currentStep={2} onPrev={onPrev} />)
    fireEvent.click(screen.getByLabelText('Previous step'))
    expect(onPrev).toHaveBeenCalledTimes(1)
  })

  it('renders progress dots equal to totalSteps', () => {
    render(<DiagramStepControls {...defaultProps} />)
    const dots = screen.getAllByTestId('step-dot')
    expect(dots).toHaveLength(5)
  })

  it('does not render label when not provided', () => {
    const { onNext, onPrev, ...rest } = defaultProps
    render(<DiagramStepControls currentStep={0} totalSteps={5} onNext={jest.fn()} onPrev={jest.fn()} />)
    expect(screen.queryByText('Draw the base')).not.toBeInTheDocument()
  })

  it('uses subject color for active dot when subjectColor provided', () => {
    const { container } = render(
      <DiagramStepControls {...defaultProps} subjectColor="#ec4899" />
    )
    const activeDot = container.querySelector('[data-testid="step-dot"][data-active="true"]')
    expect(activeDot).toBeInTheDocument()
    expect(activeDot?.getAttribute('style')).toContain('#ec4899')
  })
})
```

### Step 2: Run test to verify it fails

Run: `npx jest __tests__/components/diagrams/DiagramStepControls.test.tsx --no-cache`
Expected: FAIL — module not found

### Step 3: Implement DiagramStepControls

Create `components/diagrams/DiagramStepControls.tsx`:

```tsx
'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DiagramStepControlsProps {
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  stepLabel?: string
  stepLabelHe?: string
  language?: 'en' | 'he'
  subjectColor?: string
  className?: string
}

export function DiagramStepControls({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  stepLabel,
  stepLabelHe,
  language = 'en',
  subjectColor,
  className = '',
}: DiagramStepControlsProps) {
  const isRTL = language === 'he'
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1
  const label = isRTL && stepLabelHe ? stepLabelHe : stepLabel

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <button
        onClick={onPrev}
        disabled={isFirst}
        aria-label="Previous step"
        className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {isRTL ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => {
          const isActive = i === currentStep
          const isPast = i < currentStep
          return (
            <div
              key={i}
              data-testid="step-dot"
              data-active={isActive}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isActive
                  ? subjectColor
                    ? 'scale-125'
                    : 'bg-indigo-500 dark:bg-indigo-400 scale-125'
                  : isPast
                    ? subjectColor
                      ? 'opacity-40'
                      : 'bg-indigo-300 dark:bg-indigo-600'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
              style={
                subjectColor && (isActive || isPast)
                  ? { backgroundColor: subjectColor, opacity: isActive ? 1 : 0.4 }
                  : undefined
              }
            />
          )
        })}
      </div>

      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums">
        {currentStep + 1} / {totalSteps}
      </span>

      <button
        onClick={onNext}
        disabled={isLast}
        aria-label="Next step"
        className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      {label && (
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate" style={isRTL ? { marginRight: '0.5rem' } : { marginLeft: '0.5rem' }}>
          {label}
        </span>
      )}
    </div>
  )
}
```

### Step 4: Run test to verify it passes

Run: `npx jest __tests__/components/diagrams/DiagramStepControls.test.tsx --no-cache`
Expected: PASS (9 tests)

### Step 5: Commit

```bash
git add components/diagrams/DiagramStepControls.tsx __tests__/components/diagrams/DiagramStepControls.test.tsx
git commit -m "feat: add reusable DiagramStepControls component with subject color support"
```

---

## Task 5: Wire Subject + Complexity Through Renderer Chain

Update `MathDiagramRenderer` and `DiagramRenderer` so every diagram component receives `subject` and `complexity` props. This is what connects the color/weight infrastructure to actual diagrams.

**Files:**
- Modify: `components/math/MathDiagramRenderer.tsx` (lines 23-48 props, lines 111-278 switch)
- Modify: `components/homework/diagram/DiagramRenderer.tsx` (lines 90-234)

### Step 1: Add `subject` and `complexity` to MathDiagramRenderer props

In `components/math/MathDiagramRenderer.tsx`, add to `MathDiagramRendererProps` interface:

```typescript
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

// Add to interface (after line 47):
  /** Subject for color coding */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
```

### Step 2: Destructure new props and add to commonProps

In the function signature, destructure `subject = 'math'` and `complexity = 'middle_school'`.

In the `commonProps` object (around line 113), add:

```typescript
const commonProps = {
  currentStep,
  stepConfig: diagram.stepConfig as MathDiagramStepConfig[],
  onStepComplete: handleStepComplete,
  animationDuration: animate ? animationDuration : 0,
  className: 'diagram-content',
  language,
  subject,       // NEW
  complexity,    // NEW
}
```

Note: Existing child components will ignore these props until they're rebuilt (Phase 2). This is intentional — it makes the props available so rebuilt components can use them immediately.

### Step 3: Update DiagramRenderer to pass subject

In `components/homework/diagram/DiagramRenderer.tsx`, update the `DiagramRendererProps` interface:

```typescript
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

// Add to DiagramRendererProps:
  /** Subject for color coding (auto-detected from diagram type if not provided) */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
```

In the function body, add auto-detection logic before the if-chain:

```typescript
// Auto-detect subject from diagram type
const detectedSubject: SubjectKey = subject
  ?? (isMathDiagram(diagram) ? 'math' : undefined)
  ?? (isPhysicsDiagram(diagram) ? 'physics' : undefined)
  ?? (isChemistryDiagram(diagram) ? 'chemistry' : undefined)
  ?? (isBiologyDiagram(diagram) ? 'biology' : undefined)
  ?? 'math'
```

Pass `subject={detectedSubject}` and `complexity={complexity}` to `MathDiagramRenderer`.

### Step 4: Verify no TypeScript errors

Run: `npx tsc --noEmit 2>&1 | grep -E "(MathDiagramRenderer|DiagramRenderer)" | head -10`
Expected: No new errors (existing child components don't declare these props yet, but they're spread via `...commonProps` which uses `...rest` patterns — verify this doesn't cause issues)

### Step 5: Run existing tests to verify no regressions

Run: `npx jest --passWithNoTests 2>&1 | tail -10`
Expected: Same test results as before (no new failures)

### Step 6: Commit

```bash
git add components/math/MathDiagramRenderer.tsx components/homework/diagram/DiagramRenderer.tsx
git commit -m "feat: wire subject and complexity props through diagram renderer chain"
```

---

## Task 6: AI Diagram Schema Registry

Replace the 3 hardcoded diagram schemas in the prepare chat route with a centralized registry. Start with the currently-implemented types (14 math + 2 geometry + 3 physics = 19), not all 122 — we'll expand as components are built.

**Files:**
- Create: `lib/diagram-schemas.ts`
- Test: `__tests__/lib/diagram-schemas.test.ts`
- Modify: `app/api/prepare/[id]/chat/route.ts` (lines 58-76)

### Step 1: Write failing test

Create `__tests__/lib/diagram-schemas.test.ts`:

```typescript
import { DIAGRAM_SCHEMAS, getDiagramSchemaPrompt } from '@/lib/diagram-schemas'

describe('DIAGRAM_SCHEMAS', () => {
  it('has schemas for all currently implemented math types', () => {
    const mathTypes = [
      'long_division', 'equation', 'fraction', 'number_line',
      'coordinate_plane', 'factoring', 'completing_square',
      'polynomial', 'radical', 'systems', 'inequality',
    ]
    for (const type of mathTypes) {
      expect(DIAGRAM_SCHEMAS[type]).toBeDefined()
      expect(DIAGRAM_SCHEMAS[type].type).toBe(type)
      expect(DIAGRAM_SCHEMAS[type].description).toBeTruthy()
      expect(DIAGRAM_SCHEMAS[type].jsonExample).toBeTruthy()
    }
  })

  it('has schemas for physics types', () => {
    expect(DIAGRAM_SCHEMAS.fbd).toBeDefined()
    expect(DIAGRAM_SCHEMAS.fbd.subject).toBe('physics')
  })

  it('each schema has required fields', () => {
    for (const [key, schema] of Object.entries(DIAGRAM_SCHEMAS)) {
      expect(schema.type).toBe(key)
      expect(schema.subject).toBeTruthy()
      expect(schema.description).toBeTruthy()
      expect(schema.jsonExample).toBeTruthy()
    }
  })

  it('jsonExample is valid JSON for each schema', () => {
    for (const [key, schema] of Object.entries(DIAGRAM_SCHEMAS)) {
      expect(() => JSON.parse(schema.jsonExample)).not.toThrow()
      const parsed = JSON.parse(schema.jsonExample)
      expect(parsed.type).toBe(key)
    }
  })
})

describe('getDiagramSchemaPrompt', () => {
  it('returns prompt string listing all schemas', () => {
    const prompt = getDiagramSchemaPrompt()
    expect(prompt).toContain('coordinate_plane')
    expect(prompt).toContain('number_line')
    expect(prompt).toContain('fbd')
  })

  it('filters by subject', () => {
    const mathPrompt = getDiagramSchemaPrompt('math')
    expect(mathPrompt).toContain('coordinate_plane')
    expect(mathPrompt).not.toContain('fbd')

    const physicsPrompt = getDiagramSchemaPrompt('physics')
    expect(physicsPrompt).toContain('fbd')
    expect(physicsPrompt).not.toContain('coordinate_plane')
  })

  it('returns empty string for unknown subject', () => {
    const prompt = getDiagramSchemaPrompt('underwater_basket_weaving')
    expect(prompt).toBe('')
  })
})
```

### Step 2: Run test to verify it fails

Run: `npx jest __tests__/lib/diagram-schemas.test.ts --no-cache`
Expected: FAIL — module not found

### Step 3: Implement diagram-schemas.ts

Create `lib/diagram-schemas.ts`:

```typescript
/**
 * Centralized diagram schema registry.
 *
 * Each schema tells the AI what JSON to produce for a given diagram type.
 * Schemas are added here as components are built. The AI system prompt
 * pulls from this registry via getDiagramSchemaPrompt().
 */

export interface DiagramSchema {
  type: string
  subject: string
  gradeRange: string
  description: string
  jsonExample: string
}

export const DIAGRAM_SCHEMAS: Record<string, DiagramSchema> = {
  // ---- MATH: Currently Implemented ----

  number_line: {
    type: 'number_line',
    subject: 'math',
    gradeRange: '1-12',
    description: 'Number line with points, intervals, and inequalities',
    jsonExample: JSON.stringify({
      type: 'number_line',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        min: -5,
        max: 10,
        title: '-2 ≤ x < 5',
        points: [
          { value: -2, label: '-2', style: 'filled', color: '#6366f1' },
          { value: 5, label: '5', style: 'hollow', color: '#6366f1' },
        ],
        intervals: [
          { start: -2, end: 5, startInclusive: true, endInclusive: false, color: '#6366f1' },
        ],
      },
    }),
  },

  coordinate_plane: {
    type: 'coordinate_plane',
    subject: 'math',
    gradeRange: '5-12',
    description: 'Coordinate plane with curves, points, and lines. Expressions: x^2, sin(x), cos(x), sqrt(x), abs(x), exp(x), log(x)',
    jsonExample: JSON.stringify({
      type: 'coordinate_plane',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        xMin: -5, xMax: 5, yMin: -5, yMax: 10, showGrid: true,
        title: 'y = x² - 2x - 3',
        curves: [{ id: 'f', expression: 'x^2 - 2*x - 3', color: '#6366f1' }],
        points: [{ id: 'v', x: 1, y: -4, label: 'Vertex (1,-4)', color: '#ef4444' }],
        lines: [{ id: 'sym', points: [{ x: 1, y: -100 }, { x: 1, y: 100 }], color: '#9ca3af', dashed: true, type: 'line' }],
      },
    }),
  },

  long_division: {
    type: 'long_division',
    subject: 'math',
    gradeRange: '3-6',
    description: 'Step-by-step long division visualization',
    jsonExample: JSON.stringify({
      type: 'long_division',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        dividend: 156,
        divisor: 12,
        steps: [
          { quotientDigit: '1', multiply: '12', subtract: '3', bringDown: '6', remainder: '36' },
          { quotientDigit: '3', multiply: '36', subtract: '0', bringDown: '', remainder: '0' },
        ],
      },
    }),
  },

  equation: {
    type: 'equation',
    subject: 'math',
    gradeRange: '6-12',
    description: 'Step-by-step equation solving with highlighted operations',
    jsonExample: JSON.stringify({
      type: 'equation',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        steps: [
          { expression: '2x + 5 = 13', explanation: 'Original equation' },
          { expression: '2x = 8', explanation: 'Subtract 5 from both sides' },
          { expression: 'x = 4', explanation: 'Divide both sides by 2' },
        ],
      },
    }),
  },

  fraction: {
    type: 'fraction',
    subject: 'math',
    gradeRange: '3-8',
    description: 'Fraction operation visualization (add, subtract, multiply, divide)',
    jsonExample: JSON.stringify({
      type: 'fraction',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        operation: 'add',
        fraction1: { numerator: 1, denominator: 3 },
        fraction2: { numerator: 1, denominator: 4 },
        result: { numerator: 7, denominator: 12 },
        steps: [
          { explanation: 'Find common denominator: LCD = 12' },
          { explanation: '4/12 + 3/12' },
          { explanation: '= 7/12' },
        ],
      },
    }),
  },

  factoring: {
    type: 'factoring',
    subject: 'math',
    gradeRange: '8-12',
    description: 'Polynomial factoring with step-by-step breakdown',
    jsonExample: JSON.stringify({
      type: 'factoring',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        expression: 'x² + 5x + 6',
        factoredForm: '(x + 2)(x + 3)',
        steps: [
          { expression: 'x² + 5x + 6', explanation: 'Find two numbers that multiply to 6 and add to 5' },
          { expression: '2 × 3 = 6, 2 + 3 = 5', explanation: 'Numbers: 2 and 3' },
          { expression: '(x + 2)(x + 3)', explanation: 'Write in factored form' },
        ],
      },
    }),
  },

  completing_square: {
    type: 'completing_square',
    subject: 'math',
    gradeRange: '9-12',
    description: 'Completing the square method visualization',
    jsonExample: JSON.stringify({
      type: 'completing_square',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        original: 'x² + 6x + 2 = 0',
        steps: [
          { expression: 'x² + 6x = -2', explanation: 'Move constant to right side' },
          { expression: 'x² + 6x + 9 = -2 + 9', explanation: 'Add (6/2)² = 9 to both sides' },
          { expression: '(x + 3)² = 7', explanation: 'Factor left side as perfect square' },
          { expression: 'x = -3 ± √7', explanation: 'Take square root of both sides' },
        ],
      },
    }),
  },

  polynomial: {
    type: 'polynomial',
    subject: 'math',
    gradeRange: '8-12',
    description: 'Polynomial operations (add, subtract, multiply, divide)',
    jsonExample: JSON.stringify({
      type: 'polynomial',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        operation: 'multiply',
        poly1: '(2x + 3)',
        poly2: '(x - 1)',
        steps: [
          { expression: '2x(x - 1) + 3(x - 1)', explanation: 'Distribute each term' },
          { expression: '2x² - 2x + 3x - 3', explanation: 'Multiply' },
          { expression: '2x² + x - 3', explanation: 'Combine like terms' },
        ],
      },
    }),
  },

  radical: {
    type: 'radical',
    subject: 'math',
    gradeRange: '8-12',
    description: 'Radical simplification step-by-step',
    jsonExample: JSON.stringify({
      type: 'radical',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        expression: '√72',
        steps: [
          { expression: '√(36 × 2)', explanation: 'Find largest perfect square factor' },
          { expression: '√36 × √2', explanation: 'Split the radical' },
          { expression: '6√2', explanation: 'Simplify √36 = 6' },
        ],
      },
    }),
  },

  systems: {
    type: 'systems',
    subject: 'math',
    gradeRange: '8-12',
    description: 'Systems of equations solving (substitution, elimination, or graphing)',
    jsonExample: JSON.stringify({
      type: 'systems',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        method: 'elimination',
        equation1: '2x + y = 7',
        equation2: 'x - y = 2',
        steps: [
          { expression: '2x + y = 7\nx - y = 2', explanation: 'Original system' },
          { expression: '3x = 9', explanation: 'Add equations to eliminate y' },
          { expression: 'x = 3', explanation: 'Divide by 3' },
          { expression: 'x = 3, y = 1', explanation: 'Substitute back: 3 - y = 2, y = 1' },
        ],
      },
    }),
  },

  inequality: {
    type: 'inequality',
    subject: 'math',
    gradeRange: '7-12',
    description: 'Inequality solving with number line visualization',
    jsonExample: JSON.stringify({
      type: 'inequality',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        steps: [
          { expression: '3x - 2 > 7', explanation: 'Original inequality' },
          { expression: '3x > 9', explanation: 'Add 2 to both sides' },
          { expression: 'x > 3', explanation: 'Divide by 3' },
        ],
        numberLine: { min: -2, max: 8, point: 3, direction: 'right', inclusive: false },
      },
    }),
  },

  // ---- PHYSICS: Currently Implemented ----

  fbd: {
    type: 'fbd',
    subject: 'physics',
    gradeRange: '9-12',
    description: 'Free body diagram with forces on an object. Object types: block, sphere, wedge, particle, car, person. Force angles: 0=right, 90=up, -90=down, 180=left.',
    jsonExample: JSON.stringify({
      type: 'fbd',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        object: { type: 'block', position: { x: 150, y: 150 }, mass: 5, label: 'm', color: '#e0e7ff' },
        forces: [
          { name: 'weight', type: 'weight', magnitude: 50, angle: -90, symbol: 'W', color: '#22c55e' },
          { name: 'normal', type: 'normal', magnitude: 50, angle: 90, symbol: 'N', color: '#3b82f6' },
          { name: 'friction', type: 'friction', magnitude: 15, angle: 180, symbol: 'f', subscript: 'k', color: '#ef4444' },
        ],
        title: 'Forces on block',
        showForceMagnitudes: true,
      },
      stepConfig: [
        { step: 0, visibleForces: [], stepLabel: 'Object' },
        { step: 1, visibleForces: ['weight'], highlightForces: ['weight'], stepLabel: 'Weight = 50N' },
        { step: 2, visibleForces: ['weight', 'normal', 'friction'], stepLabel: 'All forces' },
      ],
    }),
  },
}

/**
 * Generate a prompt string listing available diagram schemas for the AI.
 * Optionally filter by subject.
 */
export function getDiagramSchemaPrompt(subject?: string): string {
  const filtered = Object.values(DIAGRAM_SCHEMAS).filter(
    (s) => !subject || s.subject === subject
  )

  if (filtered.length === 0) return ''

  return filtered
    .map(
      (s) =>
        `### Diagram Schema: ${s.type}\n${s.description}\nGrades: ${s.gradeRange}\nExample: ${s.jsonExample}`
    )
    .join('\n\n')
}
```

### Step 4: Run test to verify it passes

Run: `npx jest __tests__/lib/diagram-schemas.test.ts --no-cache`
Expected: PASS

### Step 5: Update prepare chat route to use registry

In `app/api/prepare/[id]/chat/route.ts`, replace lines 58-76 (the hardcoded `### Diagram Schema:` blocks) with:

```typescript
// At top of file, add import:
import { getDiagramSchemaPrompt } from '@/lib/diagram-schemas'

// In buildSystemPrompt, replace the 3 hardcoded schema blocks with:
- "Draw Diagram": Generate a visual diagram. You MUST use one of these exact schemas:

${getDiagramSchemaPrompt()}
```

This replaces ~18 lines of hardcoded schemas with a single function call that pulls from the registry.

### Step 6: Verify the route still works

Run: `npx tsc --noEmit 2>&1 | grep "prepare.*chat" | head -5`
Expected: No new errors

### Step 7: Commit

```bash
git add lib/diagram-schemas.ts __tests__/lib/diagram-schemas.test.ts app/api/prepare/[id]/chat/route.ts
git commit -m "feat: add centralized diagram schema registry, replace hardcoded AI schemas"
```

---

## Verification Checklist

After all 3 tasks, verify:

1. `npx jest __tests__/components/diagrams/DiagramStepControls.test.tsx __tests__/lib/diagram-schemas.test.ts __tests__/hooks/useDiagramBase.test.ts __tests__/lib/diagram-theme.test.ts __tests__/lib/diagram-animations.test.ts --no-cache` — all pass
2. `npx tsc --noEmit 2>&1 | grep -v "WorkTogetherModal\|FullScreenDiagramView\|DiagramExplanationPanel\|diagram.json"` — no new errors
3. `git log --oneline` — 3 new commits for Tasks 4-6

---

## What Comes After

With Tasks 1-6 complete, all infrastructure is in place:

| Infrastructure | Status |
|---|---|
| Subject color system | Done (Task 1) |
| useDiagramBase hook | Done (Task 2) |
| Animation variants | Done (Task 3) |
| Step controls UI | Task 4 |
| Renderer wiring | Task 5 |
| AI schema registry | Task 6 |

**Next: Phase 2 — Rebuild the 14 existing math components** (Tasks 7-20), starting with NumberLine and CoordinatePlane as reference implementations.
