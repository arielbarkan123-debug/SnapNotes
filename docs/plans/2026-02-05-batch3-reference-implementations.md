# Batch 3: Reference Implementations (NumberLine + CoordinatePlane)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild NumberLine and CoordinatePlane as reference implementations that use the full new infrastructure (useDiagramBase, subject colors, adaptive line weight, animation variants). These become the template for rebuilding all remaining components.

**Architecture:** Each component gains:
1. `subject` and `complexity` props (passed from MathDiagramRenderer)
2. Subject-coded colors via `getSubjectColor(subject)` replacing hardcoded colors
3. Adaptive line weight via `getAdaptiveLineWeight(complexity)`
4. New animation variants from `lib/diagram-animations.ts`
5. Dark mode support via `DIAGRAM_BACKGROUNDS`

**Key constraint:** Preserve all existing functionality (error highlights, intervals, curves, mathjs parsing). This is additive — we're upgrading the visual system, not rewriting logic.

---

## Task 7: Upgrade NumberLine to New Infrastructure

**Files:**
- Modify: `components/math/NumberLine.tsx`
- Test: `__tests__/components/math/NumberLine.test.tsx` (new)

### Step 1: Write failing test

Create `__tests__/components/math/NumberLine.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { NumberLine } from '@/components/math/NumberLine'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    circle: (props: any) => <circle {...props} />,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock useVisualComplexity to avoid context dependency
jest.mock('@/hooks/useVisualComplexity', () => ({
  useVisualComplexity: ({ forceComplexity }: any = {}) => ({
    complexity: forceComplexity || 'middle_school',
    fontSize: { small: 11, normal: 14, large: 18 },
    showConcreteExamples: forceComplexity === 'elementary',
    colors: { primary: '#6366f1', accent: '#818cf8' },
  }),
  useComplexityAnimations: () => ({
    duration: 400,
    stagger: 50,
    enabled: true,
  }),
}))

describe('NumberLine', () => {
  const baseData = {
    min: -5,
    max: 5,
    points: [{ value: 2, label: '2', style: 'filled' as const }],
    intervals: [],
  }

  it('renders without crashing', () => {
    const { container } = render(<NumberLine data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <NumberLine data={baseData} subject="physics" />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('uses subject color for points when subject provided', () => {
    const { container } = render(
      <NumberLine data={baseData} subject="physics" />
    )
    // Physics primary color is #f97316
    const circle = container.querySelector('circle[fill="#f97316"]')
    expect(circle).toBeInTheDocument()
  })

  it('uses default math color when no subject provided', () => {
    const { container } = render(
      <NumberLine data={baseData} />
    )
    // Math primary (from subject colors) is #6366f1
    const circle = container.querySelector('circle[fill="#6366f1"]')
    expect(circle).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    const { container } = render(
      <NumberLine data={{ ...baseData, title: 'Test Line' }} />
    )
    expect(container.textContent).toContain('Test Line')
  })

  it('renders correct number of tick marks', () => {
    const data = { min: 0, max: 5, points: [], intervals: [] }
    const { container } = render(<NumberLine data={data} />)
    // Ticks at 0, 1, 2, 3, 4, 5 = 6 ticks
    const ticks = container.querySelectorAll('g')
    expect(ticks.length).toBeGreaterThanOrEqual(6)
  })
})
```

### Step 2: Run test to verify it fails

Run: `npx jest __tests__/components/math/NumberLine.test.tsx --no-cache`
Expected: FAIL — NumberLine doesn't accept `subject` prop yet

### Step 3: Add subject and complexity props to NumberLine

In `components/math/NumberLine.tsx`:

1. Add imports:
```typescript
import type { SubjectKey } from '@/lib/diagram-theme'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
```

2. Add to interface:
```typescript
  /** Subject for color coding */
  subject?: SubjectKey
```

3. In the function body, derive subject colors:
```typescript
  // Subject-coded colors (override useVisualComplexity colors for points/intervals)
  const subjectColors = useMemo(
    () => getSubjectColor(subject ?? 'math'),
    [subject]
  )
  const adaptiveLineWeight = useMemo(
    () => getAdaptiveLineWeight(forcedComplexity ?? 'middle_school'),
    [forcedComplexity]
  )
```

4. Replace `colors.primary` usages with `subjectColors.primary`:
- Point fills: `fill={isFilled ? subjectColors.primary : 'white'}`
- Point strokes: `stroke={subjectColors.primary}`
- Default interval colors: `interval.color || subjectColors.primary` (replace `'#3B82F6'`)
- Main line strokeWidth: `strokeWidth={adaptiveLineWeight}`

### Step 4: Run test to verify it passes

Run: `npx jest __tests__/components/math/NumberLine.test.tsx --no-cache`
Expected: PASS

### Step 5: Commit

```bash
git add components/math/NumberLine.tsx __tests__/components/math/NumberLine.test.tsx
git commit -m "feat: upgrade NumberLine to use subject colors and adaptive line weight"
```

---

## Task 8: Upgrade CoordinatePlane to New Infrastructure

**Files:**
- Modify: `components/math/CoordinatePlane.tsx`
- Test: `__tests__/components/math/CoordinatePlane.test.tsx` (new)

### Step 1: Write failing test

Create `__tests__/components/math/CoordinatePlane.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { CoordinatePlane } from '@/components/math/CoordinatePlane'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
    path: (props: any) => <path {...props} />,
    line: (props: any) => <line {...props} />,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
  },
}))

// Mock mathjs
jest.mock('mathjs', () => ({
  parse: (expr: string) => ({
    evaluate: ({ x }: { x: number }) => {
      if (expr === 'x^2') return x * x
      if (expr === 'x') return x
      return 0
    },
  }),
}))

// Mock diagram-animations
jest.mock('@/lib/diagram-animations', () => ({
  createPathDrawVariants: () => ({ hidden: {}, visible: {} }),
  prefersReducedMotion: () => true,
}))

describe('CoordinatePlane', () => {
  const baseData = {
    xMin: -5,
    xMax: 5,
    yMin: -5,
    yMax: 5,
    showGrid: true,
  }

  it('renders without crashing', () => {
    const { container } = render(<CoordinatePlane data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <CoordinatePlane data={baseData} subject="geometry" />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    const { container } = render(
      <CoordinatePlane data={{ ...baseData, title: 'y = x²' }} />
    )
    expect(container.textContent).toContain('y = x²')
  })

  it('renders points with subject color', () => {
    const data = {
      ...baseData,
      points: [{ id: 'p1', x: 1, y: 1, label: 'P', color: undefined }],
    }
    const { container } = render(
      <CoordinatePlane data={data} subject="geometry" />
    )
    // Geometry primary is #ec4899
    const circle = container.querySelector('circle[fill="#ec4899"]')
    expect(circle).toBeInTheDocument()
  })

  it('uses adaptive line weight for axes', () => {
    const { container } = render(
      <CoordinatePlane data={baseData} complexity="elementary" />
    )
    // Elementary line weight is 4
    const axis = container.querySelector('line[stroke-width="4"]')
    expect(axis).toBeInTheDocument()
  })
})
```

### Step 2: Run test to verify it fails

Run: `npx jest __tests__/components/math/CoordinatePlane.test.tsx --no-cache`
Expected: FAIL — CoordinatePlane doesn't accept `subject` or `complexity` props

### Step 3: Add subject and complexity props to CoordinatePlane

In `components/math/CoordinatePlane.tsx`:

1. Add imports:
```typescript
import type { SubjectKey } from '@/lib/diagram-theme'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
```

2. Add to interface:
```typescript
  /** Subject for color coding */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
```

3. In the function body:
```typescript
  const subjectColors = useMemo(
    () => getSubjectColor(subject ?? 'math'),
    [subject]
  )
  const adaptiveLineWeight = useMemo(
    () => getAdaptiveLineWeight(complexity ?? 'middle_school'),
    [complexity]
  )
```

4. Replace hardcoded colors:
- `COLORS.primary[400]`/`COLORS.primary[500]`/`COLORS.primary[600]` → `subjectColors.primary` (for curve gradients and point defaults)
- Axis `strokeWidth={2}` → `strokeWidth={adaptiveLineWeight}`
- Point default color: `point.color || subjectColors.primary`

### Step 4: Run test to verify it passes

Run: `npx jest __tests__/components/math/CoordinatePlane.test.tsx --no-cache`
Expected: PASS

### Step 5: Commit

```bash
git add components/math/CoordinatePlane.tsx __tests__/components/math/CoordinatePlane.test.tsx
git commit -m "feat: upgrade CoordinatePlane to use subject colors and adaptive line weight"
```

---

## Verification Checklist

After both tasks:

1. `npx jest __tests__/components/math/ __tests__/components/diagrams/ __tests__/hooks/ __tests__/lib/diagram-theme.test.ts __tests__/lib/diagram-animations.test.ts __tests__/lib/diagram-schemas.test.ts --no-cache` — all pass
2. `npx tsc --noEmit` — no new errors
3. `git log --oneline` — 2 new commits for Tasks 7-8
