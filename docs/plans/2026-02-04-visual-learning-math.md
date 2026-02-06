# App-Wide Diagram Overhaul — Phase 1: Math Diagrams

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild and expand all Math diagram components (81 types from the DIAGRAM_CATALOG) to professional, blackboard-quality SVG visualizations. These diagrams render app-wide via the shared `DiagramRenderer` — they appear in Homework checking, Practice mode, Prepare chat, and Course lessons. This plan covers only the diagram components themselves, not any specific feature.

**Architecture:** Extend the existing `MathDiagramRenderer` switch-case pattern with new diagram components organized by grade band (Elementary, Middle, High School). Each component is a pure SVG renderer that accepts typed data, supports step-synced progressive reveal via Framer Motion, and uses the shared `diagram-theme.ts` design system. New types are added to `types/math.ts` and registered in `components/homework/diagram/types.ts`.

**Where these render:** `DiagramRenderer` (`components/homework/diagram/DiagramRenderer.tsx`) dispatches to `MathDiagramRenderer` which dispatches to individual diagram components. This is used by:
- Homework checker (inline diagrams in tutor responses)
- Practice mode (diagrams in explanations)
- Prepare chat sidebar (diagram quick action)
- Course lesson steps (step-synced diagrams)
- Full-screen diagram view

**Tech Stack:** React 18, SVG, Framer Motion, mathjs (expression eval), TypeScript, Tailwind CSS, `diagram-theme.ts` design system.

**Subject order after Math:** Physics → Chemistry → Biology → Geometry → Economics (separate plans for each).

---

## Current State

### What Exists (15 math diagram types)
| Type | Component | Quality | Action |
|------|-----------|---------|--------|
| `long_division` | LongDivisionDiagram | Good | Keep, polish |
| `equation` | EquationSteps | Good | Keep, polish |
| `fraction` | FractionOperation | Good | Keep, polish |
| `number_line` | NumberLine (558 lines) | Decent | Rebuild — no step-sync, limited styling |
| `coordinate_plane` | CoordinatePlane (727 lines) | Decent | Rebuild — no step-sync, needs visual upgrade |
| `triangle` | Triangle | Placeholder | Rebuild completely |
| `circle` | Placeholder only | Placeholder | Build from scratch |
| `bar_model` | Placeholder only | Placeholder | Build from scratch |
| `area_model` | Placeholder only | Placeholder | Build from scratch |
| `factoring` | FactoringDiagram | Good | Keep, polish |
| `completing_square` | CompletingSquareSteps | Good | Keep, polish |
| `polynomial` | PolynomialOperations | Good | Keep, polish |
| `radical` | RadicalSimplification | Good | Keep, polish |
| `systems` | SystemsOfEquations | Good | Keep, polish |
| `inequality` | InequalityDiagram | Good | Keep, polish |

### What Needs Building (66 new types)
From `docs/plans/DIAGRAM_CATALOG.md`: M-E1 through M-E23 (23), M-M1 through M-M26 (26), M-H1 through M-H32 (17 new — 15 already partially exist).

---

## Architecture Decisions

### 1. Component Organization
```
components/math/
  elementary/           # Grade 1-5 diagrams
    CountingArray.tsx        # M-E1
    TenFrame.tsx             # M-E2
    PartWholeModel.tsx       # M-E3
    BasicNumberLine.tsx      # M-E4 (simplified version of NumberLine)
    TapeDiagram.tsx          # M-E5
    PlaceValueChart.tsx      # M-E6
    Base10Blocks.tsx         # M-E7
    PictureGraph.tsx         # M-E8
    BarGraph.tsx             # M-E9
    FractionCircle.tsx       # M-E10
    FractionBar.tsx          # M-E11
    FractionNumberLine.tsx   # M-E12
    MultiplicationArray.tsx  # M-E13
    AreaModelMultiply.tsx    # M-E14
    ScaledBarGraph.tsx       # M-E15
    EquivalentFractions.tsx  # M-E16
    MixedNumbers.tsx         # M-E17
    DecimalGrid.tsx          # M-E18
    FractionMultiplyArea.tsx # M-E19
    FractionDivision.tsx     # M-E20
    VolumeModel.tsx          # M-E21
    OrderOfOperations.tsx    # M-E22
    QuadrantOne.tsx          # M-E23
  middle/               # Grade 6-8 diagrams
    DoubleNumberLine.tsx     # M-M1
    RatioTable.tsx           # M-M2
    RatioTapeDiagram.tsx     # M-M3
    FullCoordinatePlane.tsx  # M-M4 (upgrade of existing)
    DotPlot.tsx              # M-M5
    Histogram.tsx            # M-M6
    BoxPlot.tsx              # M-M7
    StemLeafPlot.tsx         # M-M8
    CentralTendency.tsx      # M-M9
    ProportionalGraph.tsx    # M-M10
    PercentBar.tsx           # M-M11
    ProbabilityTree.tsx      # M-M12
    SampleSpace.tsx          # M-M13
    VennDiagram.tsx          # M-M14
    NetDiagram3D.tsx         # M-M15
    CrossSection.tsx         # M-M16
    ScaleDrawing.tsx         # M-M17
    LinearFunction.tsx       # M-M18
    SystemOfEquationsGraph.tsx # M-M19 (upgrade of existing)
    SlopeTriangle.tsx        # M-M20
    ScatterPlot.tsx          # M-M21
    TwoWayTable.tsx          # M-M22
    PythagoreanTheorem.tsx   # M-M23
    TransformationDiagram.tsx # M-M24
    IrrationalNumberLine.tsx # M-M25
    ScientificNotation.tsx   # M-M26
  highschool/           # Grade 9-12 diagrams
    QuadraticGraph.tsx       # M-H1
    PolynomialGraph.tsx      # M-H2
    ExponentialGraph.tsx     # M-H3
    LogarithmicGraph.tsx     # M-H4
    AbsoluteValueGraph.tsx   # M-H5
    RadicalGraph.tsx         # M-H6
    PiecewiseGraph.tsx       # M-H7
    InequalityGraph1D.tsx    # M-H8 (upgrade of existing)
    SystemOfInequalities.tsx # M-H9
    SequenceDiagram.tsx      # M-H10
    RationalFunctionGraph.tsx # M-H11
    ConicSections.tsx        # M-H12
    ComplexPlane.tsx         # M-H13
    MatrixVisualization.tsx  # M-H14
    VectorDiagram.tsx        # M-H15
    TrigGraphs.tsx           # M-H16
    UnitCircle.tsx           # M-H17
    PolarGraph.tsx           # M-H18
    ParametricCurve.tsx      # M-H19
    LimitVisualization.tsx   # M-H20
    DerivativeTangent.tsx    # M-H21
    FunctionDerivatives.tsx  # M-H22
    RiemannSum.tsx           # M-H23
    SolidOfRevolution.tsx    # M-H24
    NormalDistribution.tsx   # M-H25
    RegressionLine.tsx       # M-H26
    ResidualPlot.tsx         # M-H27
    ProbabilityDistribution.tsx # M-H28
    BinomialDistribution.tsx # M-H29
    SamplingDistribution.tsx # M-H30
    ConfidenceInterval.tsx   # M-H31
    HypothesisTest.tsx       # M-H32
```

### 2. Shared SVG Primitives
Create `components/math/shared/` with reusable SVG building blocks so we don't duplicate grid rendering, axis drawing, label placement, etc. across 80+ components:

```
components/math/shared/
  SVGGrid.tsx              # Configurable grid background (major/minor lines)
  SVGAxes.tsx              # X/Y axes with tick marks and labels
  SVGPoint.tsx             # Animated point with label
  SVGLine.tsx              # Line/segment/ray with animation
  SVGCurve.tsx             # Function curve rendering (uses mathjs)
  SVGBar.tsx               # Animated bar for bar graphs/histograms
  SVGFractionBar.tsx       # Colored fraction strip
  SVGFractionCircle.tsx    # Colored pie sector
  SVGArrow.tsx             # Arrow head with direction
  SVGLabel.tsx             # Positioned text label with background
  SVGShading.tsx           # Region fill/shading with animation
  SVGStepReveal.tsx        # Wrapper for step-synced fade-in/draw animations
  index.ts                 # Barrel export
```

### 3. Type System Extension
Add new type unions to `types/math.ts` incrementally. Each batch of diagrams adds its types. The existing `MathDiagramData` union already accepts `Record<string, any>` as a fallback, so new types work immediately even before being formally added to the union.

### 4. Registration Pattern
Each new diagram type is registered in:
1. `types/math.ts` → `MathDiagramType` union (add type string)
2. `types/math.ts` → `MathDiagramData` union (add data interface)
3. `components/math/MathDiagramRenderer.tsx` → switch case (add render branch)
4. `components/homework/diagram/types.ts` → `MATH_DIAGRAM_TYPES` array + `DIAGRAM_TYPE_NAMES` map

### 5. Quality Standard
Every diagram must meet this bar (inspired by the physics tutor blackboard reference):
- **Clean SVG rendering** at any size (compact 350x280 to fullscreen)
- **Step-by-step progressive reveal** with Framer Motion animations
- **Dark mode** via `diagram-theme.ts` colors
- **RTL support** for Hebrew labels
- **EN/HE labels** on all text elements
- **Responsive** — works at compact (chat inline), medium (guide section), and fullscreen sizes
- **Error boundaries** — graceful fallback if data is malformed

---

## Implementation Batches

Given 81 diagram types, this is split into **8 batches** of ~10 diagrams each. Each batch follows TDD: types → shared primitives needed → components → registration → verification.

---

### Batch 1: Shared Primitives + Elementary Counting (Tasks 1-3)

**Goal:** Build the shared SVG primitives library, then implement the first 5 elementary diagrams (M-E1 through M-E5).

#### Task 1: Create shared SVG primitives library

**Files:**
- Create: `components/math/shared/SVGGrid.tsx`
- Create: `components/math/shared/SVGAxes.tsx`
- Create: `components/math/shared/SVGPoint.tsx`
- Create: `components/math/shared/SVGLine.tsx`
- Create: `components/math/shared/SVGBar.tsx`
- Create: `components/math/shared/SVGLabel.tsx`
- Create: `components/math/shared/SVGArrow.tsx`
- Create: `components/math/shared/SVGStepReveal.tsx`
- Create: `components/math/shared/SVGFractionBar.tsx`
- Create: `components/math/shared/SVGFractionCircle.tsx`
- Create: `components/math/shared/SVGShading.tsx`
- Create: `components/math/shared/SVGCurve.tsx`
- Create: `components/math/shared/index.ts`

**Step 1: Create SVGGrid component**

A configurable grid background used by coordinate planes, graphs, and any diagram needing grid lines.

```tsx
// components/math/shared/SVGGrid.tsx
'use client'

import { motion } from 'framer-motion'
import { COLORS } from '@/lib/diagram-theme'

interface SVGGridProps {
  width: number
  height: number
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  /** Padding around the grid in px */
  padding?: { top: number; right: number; bottom: number; left: number }
  /** Show minor grid lines */
  showMinorGrid?: boolean
  /** Major grid line interval (default: 1) */
  majorInterval?: number
  /** Minor grid line interval (default: 0.5) */
  minorInterval?: number
  /** Whether to animate grid appearance */
  animate?: boolean
  /** Dark mode */
  darkMode?: boolean
}

export function SVGGrid({
  width, height, xMin, xMax, yMin, yMax,
  padding = { top: 20, right: 20, bottom: 40, left: 40 },
  showMinorGrid = true,
  majorInterval = 1,
  minorInterval = 0.5,
  animate = true,
  darkMode = false,
}: SVGGridProps) {
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const xScale = (x: number) => padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth
  const yScale = (y: number) => padding.top + ((yMax - y) / (yMax - yMin)) * plotHeight

  const majorColor = darkMode ? COLORS.gray[700] : COLORS.gray[200]
  const minorColor = darkMode ? COLORS.gray[800] : COLORS.gray[100]

  const lines: JSX.Element[] = []

  // Minor grid
  if (showMinorGrid) {
    for (let x = Math.ceil(xMin / minorInterval) * minorInterval; x <= xMax; x += minorInterval) {
      lines.push(<line key={`mx-${x}`} x1={xScale(x)} y1={padding.top} x2={xScale(x)} y2={height - padding.bottom} stroke={minorColor} strokeWidth={0.5} />)
    }
    for (let y = Math.ceil(yMin / minorInterval) * minorInterval; y <= yMax; y += minorInterval) {
      lines.push(<line key={`my-${y}`} x1={padding.left} y1={yScale(y)} x2={width - padding.right} y2={yScale(y)} stroke={minorColor} strokeWidth={0.5} />)
    }
  }

  // Major grid
  for (let x = Math.ceil(xMin / majorInterval) * majorInterval; x <= xMax; x += majorInterval) {
    lines.push(<line key={`Mx-${x}`} x1={xScale(x)} y1={padding.top} x2={xScale(x)} y2={height - padding.bottom} stroke={majorColor} strokeWidth={1} />)
  }
  for (let y = Math.ceil(yMin / majorInterval) * majorInterval; y <= yMax; y += majorInterval) {
    lines.push(<line key={`My-${y}`} x1={padding.left} y1={yScale(y)} x2={width - padding.right} y2={yScale(y)} stroke={majorColor} strokeWidth={1} />)
  }

  const Wrapper = animate ? motion.g : 'g'
  const animProps = animate ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } } : {}

  return <Wrapper {...animProps}>{lines}</Wrapper>
}
```

**Step 2: Create SVGAxes component**

X/Y axes with tick marks and labels. Used by coordinate planes, graphs, number lines.

```tsx
// components/math/shared/SVGAxes.tsx
'use client'

import { COLORS } from '@/lib/diagram-theme'

interface SVGAxesProps {
  width: number
  height: number
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  padding?: { top: number; right: number; bottom: number; left: number }
  xLabel?: string
  yLabel?: string
  tickInterval?: number
  showTickLabels?: boolean
  darkMode?: boolean
}

export function SVGAxes({
  width, height, xMin, xMax, yMin, yMax,
  padding = { top: 20, right: 20, bottom: 40, left: 40 },
  xLabel, yLabel,
  tickInterval = 1,
  showTickLabels = true,
  darkMode = false,
}: SVGAxesProps) {
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const xScale = (x: number) => padding.left + ((x - xMin) / (xMax - xMin)) * plotWidth
  const yScale = (y: number) => padding.top + ((yMax - y) / (yMax - yMin)) * plotHeight

  const axisColor = darkMode ? COLORS.gray[300] : COLORS.gray[800]
  const tickColor = darkMode ? COLORS.gray[400] : COLORS.gray[600]

  // Origin position (clamp to visible area)
  const originX = xScale(Math.max(xMin, Math.min(xMax, 0)))
  const originY = yScale(Math.max(yMin, Math.min(yMax, 0)))

  return (
    <g>
      {/* X axis */}
      <line x1={padding.left} y1={originY} x2={width - padding.right} y2={originY} stroke={axisColor} strokeWidth={1.5} />
      {/* Y axis */}
      <line x1={originX} y1={padding.top} x2={originX} y2={height - padding.bottom} stroke={axisColor} strokeWidth={1.5} />

      {/* X ticks */}
      {Array.from({ length: Math.floor((xMax - xMin) / tickInterval) + 1 }, (_, i) => {
        const val = Math.ceil(xMin / tickInterval) * tickInterval + i * tickInterval
        if (val > xMax || val === 0) return null
        const x = xScale(val)
        return (
          <g key={`xt-${val}`}>
            <line x1={x} y1={originY - 4} x2={x} y2={originY + 4} stroke={axisColor} strokeWidth={1} />
            {showTickLabels && (
              <text x={x} y={originY + 16} textAnchor="middle" fontSize={10} fill={tickColor}>{val}</text>
            )}
          </g>
        )
      })}

      {/* Y ticks */}
      {Array.from({ length: Math.floor((yMax - yMin) / tickInterval) + 1 }, (_, i) => {
        const val = Math.ceil(yMin / tickInterval) * tickInterval + i * tickInterval
        if (val > yMax || val === 0) return null
        const y = yScale(val)
        return (
          <g key={`yt-${val}`}>
            <line x1={originX - 4} y1={y} x2={originX + 4} y2={y} stroke={axisColor} strokeWidth={1} />
            {showTickLabels && (
              <text x={originX - 8} y={y + 4} textAnchor="end" fontSize={10} fill={tickColor}>{val}</text>
            )}
          </g>
        )
      })}

      {/* Axis labels */}
      {xLabel && <text x={width - padding.right} y={originY + 32} textAnchor="end" fontSize={12} fontWeight={500} fill={axisColor}>{xLabel}</text>}
      {yLabel && <text x={originX - 8} y={padding.top - 8} textAnchor="middle" fontSize={12} fontWeight={500} fill={axisColor}>{yLabel}</text>}
    </g>
  )
}
```

**Step 3: Create remaining shared primitives**

Create `SVGPoint`, `SVGLine`, `SVGBar`, `SVGLabel`, `SVGArrow`, `SVGStepReveal`, `SVGFractionBar`, `SVGFractionCircle`, `SVGShading`, `SVGCurve`, and barrel `index.ts`.

Each primitive should:
- Accept a `visible` boolean prop for step-synced reveal
- Use Framer Motion for entry animations (fade, draw, scale)
- Accept `darkMode` for color switching
- Be under 80 lines each

**Step 4: Create barrel export**

```tsx
// components/math/shared/index.ts
export { SVGGrid } from './SVGGrid'
export { SVGAxes } from './SVGAxes'
export { SVGPoint } from './SVGPoint'
export { SVGLine } from './SVGLine'
export { SVGBar } from './SVGBar'
export { SVGLabel } from './SVGLabel'
export { SVGArrow } from './SVGArrow'
export { SVGStepReveal } from './SVGStepReveal'
export { SVGFractionBar } from './SVGFractionBar'
export { SVGFractionCircle } from './SVGFractionCircle'
export { SVGShading } from './SVGShading'
export { SVGCurve } from './SVGCurve'
```

**Step 5: Run build to verify**

Run: `cd /Users/curvalux/NoteSnap && npm run build 2>&1 | tail -20`
Expected: Build succeeds (shared primitives are not imported yet, so no errors)

**Step 6: Commit**

```bash
git add components/math/shared/
git commit -m "feat: add shared SVG primitives library for math diagrams"
```

---

#### Task 2: Add types for Elementary diagrams (M-E1 through M-E9)

**Files:**
- Modify: `types/math.ts`
- Modify: `components/homework/diagram/types.ts`

**Step 1: Add data interfaces to types/math.ts**

Add after the existing `CircleData` interface (around line 278):

```typescript
// ============================================================================
// Elementary Diagram Types (Grades 1-5)
// ============================================================================

// M-E1: Counting Objects Array
export interface CountingArrayData {
  rows: number
  columns: number
  /** Total count (rows * columns or partial) */
  total: number
  /** Object shape */
  objectType: 'dot' | 'star' | 'block' | 'circle'
  /** Which cells are filled (for partial arrays) — row,col pairs */
  filledCells?: Array<{ row: number; col: number }>
  /** Color of objects */
  color?: string
  /** Expression shown (e.g., "3 + 4 = 7") */
  expression?: string
  title?: string
  steps?: Array<{
    step: number
    visibleRows: number
    visibleCols: number
    description?: string
    descriptionHe?: string
  }>
}

// M-E2: Ten Frame
export interface TenFrameData {
  /** Number of counters (0-20 for double) */
  count: number
  /** Single (10) or double (20) frame */
  frameType: 'single' | 'double'
  /** Counter color */
  counterColor?: string
  /** Expression shown */
  expression?: string
  title?: string
  steps?: Array<{
    step: number
    visibleCount: number
    description?: string
    descriptionHe?: string
  }>
}

// M-E3: Part-Part-Whole
export interface PartWholeData {
  whole: number
  part1: number
  part2: number
  /** Visual style */
  style: 'circle' | 'box' | 'bar'
  /** Colors for each part */
  part1Color?: string
  part2Color?: string
  /** Expression */
  expression?: string
  title?: string
  steps?: Array<{
    step: number
    showPart1: boolean
    showPart2: boolean
    showWhole: boolean
    description?: string
    descriptionHe?: string
  }>
}

// M-E5: Tape Diagram (Bar Model)
export interface TapeDiagramData {
  /** Bars to display */
  bars: Array<{
    label: string
    value: number
    color?: string
    segments?: Array<{ value: number; label?: string; color?: string }>
  }>
  /** Operation type */
  operation: 'addition' | 'subtraction' | 'comparison' | 'multiplication'
  /** Unknown value position */
  unknownPosition?: 'total' | 'part1' | 'part2' | 'difference'
  /** Result expression */
  expression?: string
  title?: string
  steps?: Array<{
    step: number
    visibleBars: number[]
    showResult: boolean
    description?: string
    descriptionHe?: string
  }>
}

// M-E6: Place Value Chart
export interface PlaceValueChartData {
  number: number
  /** Max place value to show */
  maxPlace: 'ones' | 'tens' | 'hundreds' | 'thousands' | 'ten_thousands'
  /** Show expanded form */
  showExpanded?: boolean
  /** Show blocks visualization */
  showBlocks?: boolean
  title?: string
  steps?: Array<{
    step: number
    visiblePlaces: string[]
    description?: string
    descriptionHe?: string
  }>
}

// M-E7: Base-10 Blocks
export interface Base10BlocksData {
  number: number
  /** Show regrouping animation */
  showRegrouping?: boolean
  /** Second number for operations */
  secondNumber?: number
  /** Operation */
  operation?: 'add' | 'subtract'
  title?: string
  steps?: Array<{
    step: number
    thousands: number
    hundreds: number
    tens: number
    ones: number
    description?: string
    descriptionHe?: string
  }>
}

// M-E8: Picture Graph
export interface PictureGraphData {
  title: string
  categories: Array<{
    label: string
    labelHe?: string
    count: number
    icon: 'circle' | 'star' | 'square' | 'heart' | 'apple' | 'book'
  }>
  /** What each icon represents */
  iconValue: number
  /** Orientation */
  orientation: 'horizontal' | 'vertical'
  steps?: Array<{
    step: number
    visibleCategories: number[]
    description?: string
    descriptionHe?: string
  }>
}

// M-E9: Bar Graph
export interface BarGraphData {
  title: string
  categories: Array<{
    label: string
    labelHe?: string
    value: number
    color?: string
  }>
  /** Y-axis label */
  yAxisLabel?: string
  yAxisLabelHe?: string
  /** Scale (value per unit) */
  scale: number
  /** Max Y value */
  maxValue: number
  orientation: 'horizontal' | 'vertical'
  steps?: Array<{
    step: number
    visibleBars: number[]
    description?: string
    descriptionHe?: string
  }>
}
```

**Step 2: Extend MathDiagramType union**

In `types/math.ts`, update the `MathDiagramType` union (around line 284):

```typescript
export type MathDiagramType =
  | 'long_division'
  | 'equation'
  | 'fraction'
  | 'number_line'
  | 'coordinate_plane'
  | 'triangle'
  | 'circle'
  | 'bar_model'
  | 'area_model'
  | 'factoring'
  | 'completing_square'
  | 'polynomial'
  | 'radical'
  | 'systems'
  | 'inequality'
  // Elementary (Grades 1-5)
  | 'counting_array'
  | 'ten_frame'
  | 'part_whole'
  | 'basic_number_line'
  | 'tape_diagram'
  | 'place_value_chart'
  | 'base_10_blocks'
  | 'picture_graph'
  | 'bar_graph'
```

**Step 3: Register in diagram types**

In `components/homework/diagram/types.ts`, add new types to `MATH_DIAGRAM_TYPES` array and `DIAGRAM_TYPE_NAMES`.

**Step 4: Run type check**

Run: `cd /Users/curvalux/NoteSnap && npx tsc --noEmit 2>&1 | tail -20`
Expected: No new type errors

**Step 5: Commit**

```bash
git add types/math.ts components/homework/diagram/types.ts
git commit -m "feat: add type definitions for elementary math diagrams (M-E1 through M-E9)"
```

---

#### Task 3: Build Elementary Counting & Operations diagrams (M-E1 through M-E9)

**Files:**
- Create: `components/math/elementary/CountingArray.tsx` (M-E1)
- Create: `components/math/elementary/TenFrame.tsx` (M-E2)
- Create: `components/math/elementary/PartWholeModel.tsx` (M-E3)
- Create: `components/math/elementary/BasicNumberLine.tsx` (M-E4)
- Create: `components/math/elementary/TapeDiagram.tsx` (M-E5)
- Create: `components/math/elementary/PlaceValueChart.tsx` (M-E6)
- Create: `components/math/elementary/Base10Blocks.tsx` (M-E7)
- Create: `components/math/elementary/PictureGraph.tsx` (M-E8)
- Create: `components/math/elementary/BarGraph.tsx` (M-E9)
- Modify: `components/math/MathDiagramRenderer.tsx` (add 9 switch cases)

**Step 1: Implement CountingArray (M-E1)**

Grid of objects (dots/stars/blocks) in rows/columns. Step-synced: reveal rows one at a time.

```tsx
// components/math/elementary/CountingArray.tsx
'use client'
import { motion } from 'framer-motion'
import { COLORS } from '@/lib/diagram-theme'
import type { CountingArrayData } from '@/types/math'

interface CountingArrayProps {
  data: CountingArrayData
  currentStep: number
  width?: number
  height?: number
  language?: 'en' | 'he'
}

export function CountingArray({ data, currentStep, width = 400, height = 300, language = 'en' }: CountingArrayProps) {
  const { rows, columns, objectType = 'dot', color = COLORS.primary[500], expression, title, steps } = data
  const cellSize = Math.min((width - 80) / columns, (height - 80) / rows, 40)
  const gridWidth = columns * cellSize
  const gridHeight = rows * cellSize
  const startX = (width - gridWidth) / 2
  const startY = title ? 50 : 30

  const currentStepData = steps?.[currentStep]
  const visibleRows = currentStepData?.visibleRows ?? rows
  const visibleCols = currentStepData?.visibleCols ?? columns

  const renderObject = (cx: number, cy: number, size: number) => {
    switch (objectType) {
      case 'star':
        // 5-pointed star
        const points = Array.from({ length: 10 }, (_, i) => {
          const r = i % 2 === 0 ? size / 2 : size / 4
          const angle = (i * Math.PI) / 5 - Math.PI / 2
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`
        }).join(' ')
        return <polygon points={points} fill={color} />
      case 'block':
        return <rect x={cx - size/2.5} y={cy - size/2.5} width={size/1.25} height={size/1.25} rx={3} fill={color} />
      case 'circle':
        return <circle cx={cx} cy={cy} r={size / 2.5} fill="none" stroke={color} strokeWidth={2} />
      default: // dot
        return <circle cx={cx} cy={cy} r={size / 3} fill={color} />
    }
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {title && (
        <text x={width/2} y={24} textAnchor="middle" fontSize={14} fontWeight={600} fill={COLORS.gray[800]}>{title}</text>
      )}
      {/* Grid objects */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: columns }, (_, c) => {
          const visible = r < visibleRows && c < visibleCols
          if (!visible) return null
          const cx = startX + c * cellSize + cellSize / 2
          const cy = startY + r * cellSize + cellSize / 2
          return (
            <motion.g
              key={`${r}-${c}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (r * columns + c) * 0.03, duration: 0.2 }}
            >
              {renderObject(cx, cy, cellSize * 0.7)}
            </motion.g>
          )
        })
      )}
      {/* Expression */}
      {expression && (
        <text x={width/2} y={startY + gridHeight + 30} textAnchor="middle" fontSize={16} fontWeight={600} fill={COLORS.primary[600]}>
          {expression}
        </text>
      )}
      {/* Step description */}
      {currentStepData && (
        <text x={width/2} y={height - 8} textAnchor="middle" fontSize={11} fill={COLORS.gray[500]}>
          {language === 'he' ? currentStepData.descriptionHe || currentStepData.description : currentStepData.description}
        </text>
      )}
    </svg>
  )
}
```

**Step 2: Implement TenFrame (M-E2)**

2x5 grid with counters. Step-synced: add counters one at a time or in groups.

**Step 3: Implement PartWholeModel (M-E3)**

Circle/box showing number decomposition. Step-synced: show whole, then parts.

**Step 4: Implement BasicNumberLine (M-E4)**

Simplified number line (0-20) with "jump" arrows for addition/subtraction.

**Step 5: Implement TapeDiagram (M-E5)**

Singapore-style bar model. Step-synced: show bars, then operation, then answer.

**Step 6: Implement PlaceValueChart (M-E6)**

Columns showing place values with digit decomposition.

**Step 7: Implement Base10Blocks (M-E7)**

Visual cubes/rods/flats for multi-digit numbers.

**Step 8: Implement PictureGraph (M-E8)**

Icon-based graph with configurable icons and scale.

**Step 9: Implement BarGraph (M-E9)**

Vertical/horizontal bar chart with animated bars.

**Step 10: Register all 9 in MathDiagramRenderer**

Add lazy imports and switch cases in `components/math/MathDiagramRenderer.tsx`:

```tsx
// Add dynamic imports at top
import dynamic from 'next/dynamic'
const CountingArray = dynamic(() => import('./elementary/CountingArray').then(m => ({ default: m.CountingArray })), { ssr: false })
const TenFrame = dynamic(() => import('./elementary/TenFrame').then(m => ({ default: m.TenFrame })), { ssr: false })
// ... etc for all 9

// Add switch cases
case 'counting_array':
  return <CountingArray data={diagram.data as unknown as CountingArrayData} currentStep={currentStep} width={width || 400} height={height || 300} language={language} />
```

**Step 11: Run build**

Run: `cd /Users/curvalux/NoteSnap && npm run build 2>&1 | tail -20`
Expected: Build succeeds

**Step 12: Commit**

```bash
git add components/math/elementary/ components/math/MathDiagramRenderer.tsx
git commit -m "feat: add 9 elementary counting & operations diagrams (M-E1 through M-E9)"
```

---

### Batch 2: Elementary Fractions & Advanced (Tasks 4-5)

**Goal:** M-E10 through M-E23 (14 diagrams: fractions, decimals, multiplication models, volume, coordinate plane Q1).

#### Task 4: Add types for M-E10 through M-E23

**Files:**
- Modify: `types/math.ts` — add 14 new data interfaces
- Modify: `components/homework/diagram/types.ts` — register type names

Add interfaces for:
- `FractionCircleData` (M-E10), `FractionBarModelData` (M-E11), `FractionNumberLineData` (M-E12)
- `MultiplicationArrayData` (M-E13), `AreaModelMultiplyData` (M-E14), `ScaledBarGraphData` (M-E15)
- `EquivalentFractionsData` (M-E16), `MixedNumbersData` (M-E17)
- `DecimalGridData` (M-E18), `FractionMultiplyAreaData` (M-E19), `FractionDivisionData` (M-E20)
- `VolumeModelData` (M-E21), `OrderOfOperationsData` (M-E22), `QuadrantOneData` (M-E23)

Extend `MathDiagramType` with: `'fraction_circle' | 'fraction_bar' | 'fraction_number_line' | 'multiplication_array' | 'area_model_multiply' | 'scaled_bar_graph' | 'equivalent_fractions' | 'mixed_numbers' | 'decimal_grid' | 'fraction_multiply_area' | 'fraction_division' | 'volume_model' | 'order_of_operations' | 'quadrant_one'`

**Commit:** `feat: add type definitions for elementary fractions & advanced diagrams (M-E10 through M-E23)`

#### Task 5: Build Elementary Fractions & Advanced components

**Files:**
- Create: 14 component files in `components/math/elementary/`
- Modify: `components/math/MathDiagramRenderer.tsx`

Build each component following the same pattern as Task 3. Key components:

- **FractionCircle** (M-E10): SVG circle with animated sector fills using `SVGFractionCircle` primitive
- **FractionBar** (M-E11): Horizontal rectangle divided into equal strips using `SVGFractionBar` primitive
- **MultiplicationArray** (M-E13): Similar to CountingArray but with row/column labels for factors
- **AreaModelMultiply** (M-E14): Rectangle partitioned into partial products with labels
- **DecimalGrid** (M-E18): 10x10 grid with cell shading for tenths/hundredths
- **VolumeModel** (M-E21): Isometric 3D representation of unit cubes (2.5D SVG)
- **OrderOfOperations** (M-E22): Tree diagram with expression evaluation branches
- **QuadrantOne** (M-E23): First-quadrant coordinate plane using `SVGGrid` + `SVGAxes` + `SVGPoint`

Register all in MathDiagramRenderer with dynamic imports.

**Commit:** `feat: add 14 elementary fraction & advanced diagrams (M-E10 through M-E23)`

---

### Batch 3: Middle School Ratios & Statistics (Tasks 6-7)

**Goal:** M-M1 through M-M9 (9 diagrams: double number line, ratio table, tape diagram, full coordinate plane, data visualizations).

#### Task 6: Add types for M-M1 through M-M9

**Files:**
- Modify: `types/math.ts`
- Modify: `components/homework/diagram/types.ts`

Add interfaces for:
- `DoubleNumberLineData` (M-M1), `RatioTableData` (M-M2), `RatioTapeDiagramData` (M-M3)
- `FullCoordinatePlaneData` (M-M4 — extends existing CoordinatePlaneData)
- `DotPlotData` (M-M5), `HistogramData` (M-M6), `BoxPlotData` (M-M7)
- `StemLeafPlotData` (M-M8), `CentralTendencyData` (M-M9)

**Commit:** `feat: add type definitions for middle school ratios & statistics (M-M1 through M-M9)`

#### Task 7: Build Middle School Ratios & Statistics components

**Files:**
- Create: 9 component files in `components/math/middle/`
- Modify: `components/math/MathDiagramRenderer.tsx`

Key components:
- **DoubleNumberLine** (M-M1): Two parallel number lines with equivalent ratio markings
- **RatioTable** (M-M2): Animated table with rows appearing step-by-step
- **FullCoordinatePlane** (M-M4): Upgrade existing CoordinatePlane with 4 quadrants, better styling, step-sync
- **Histogram** (M-M6): Consecutive-interval bars using `SVGBar` primitives
- **BoxPlot** (M-M7): Five-number summary with animated whiskers/box rendering

**Commit:** `feat: add 9 middle school ratios & statistics diagrams (M-M1 through M-M9)`

---

### Batch 4: Middle School Algebra & Geometry (Tasks 8-9)

**Goal:** M-M10 through M-M26 (17 diagrams: proportional relationships, probability, linear functions, transformations).

#### Task 8: Add types for M-M10 through M-M26

**Files:**
- Modify: `types/math.ts`
- Modify: `components/homework/diagram/types.ts`

Add 17 new data interfaces covering:
- Proportional/percent models (M-M10, M-M11)
- Probability (M-M12, M-M13, M-M14 Venn)
- 3D/geometry (M-M15 nets, M-M16 cross-sections, M-M17 scale drawings)
- Functions (M-M18 linear, M-M19 systems, M-M20 slope triangle)
- Statistics (M-M21 scatter, M-M22 two-way table)
- Geometry/number theory (M-M23 Pythagorean, M-M24 transformations, M-M25 irrationals, M-M26 scientific notation)

**Commit:** `feat: add type definitions for middle school algebra & geometry (M-M10 through M-M26)`

#### Task 9: Build Middle School Algebra & Geometry components

**Files:**
- Create: 17 component files in `components/math/middle/`
- Modify: `components/math/MathDiagramRenderer.tsx`

Key components:
- **ProbabilityTree** (M-M12): Branching diagram with animated branches revealing step-by-step
- **VennDiagram** (M-M14): 2-3 overlapping SVG circles with region labels
- **NetDiagram3D** (M-M15): Unfolded 3D shapes (prisms, pyramids) — complex SVG paths
- **PythagoreanTheorem** (M-M23): Right triangle with squares drawn on sides, area animation
- **TransformationDiagram** (M-M24): Before/after figures with translation/rotation/reflection arrows

**Commit:** `feat: add 17 middle school algebra & geometry diagrams (M-M10 through M-M26)`

---

### Batch 5: High School Algebra Graphs (Tasks 10-11)

**Goal:** M-H1 through M-H15 (15 diagrams: quadratic, polynomial, exponential, logarithmic, rational functions, conics, vectors, matrices, complex plane).

#### Task 10: Add types for M-H1 through M-H15

**Files:**
- Modify: `types/math.ts`
- Modify: `components/homework/diagram/types.ts`

Add interfaces for function graph types:
- `QuadraticGraphData`, `PolynomialGraphData`, `ExponentialGraphData`, `LogarithmicGraphData`
- `AbsoluteValueGraphData`, `RadicalGraphData`, `PiecewiseGraphData`
- `InequalityGraph1DData`, `SystemOfInequalitiesData`
- `SequenceDiagramData`, `RationalFunctionGraphData`
- `ConicSectionsData`, `ComplexPlaneData`, `MatrixVisualizationData`, `VectorDiagramData`

All function graph types share a common base pattern: `{ xMin, xMax, yMin, yMax, functions: [...], points: [...], annotations: [...] }`.

**Commit:** `feat: add type definitions for high school algebra graphs (M-H1 through M-H15)`

#### Task 11: Build High School Algebra Graph components

**Files:**
- Create: 15 component files in `components/math/highschool/`
- Modify: `components/math/MathDiagramRenderer.tsx`

Most of these are function graph variants that leverage `SVGGrid`, `SVGAxes`, and `SVGCurve` from shared primitives. Key unique components:

- **QuadraticGraph** (M-H1): Parabola with vertex, axis of symmetry, roots labeled
- **ConicSections** (M-H12): Switch between circle, ellipse, parabola, hyperbola with foci
- **ComplexPlane** (M-H13): Argand diagram with real/imaginary axes
- **MatrixVisualization** (M-H14): Grid with cells, dimension labels, row/column operations
- **VectorDiagram** (M-H15): Arrows with magnitude/direction, tip-to-tail addition

**Commit:** `feat: add 15 high school algebra graph diagrams (M-H1 through M-H15)`

---

### Batch 6: High School Precalculus & Calculus (Tasks 12-13)

**Goal:** M-H16 through M-H24 (9 diagrams: trig, unit circle, polar, parametric, limits, derivatives, integrals, solids of revolution).

#### Task 12: Add types for M-H16 through M-H24

**Files:**
- Modify: `types/math.ts`
- Modify: `components/homework/diagram/types.ts`

Add interfaces for:
- `TrigGraphsData`, `UnitCircleData`, `PolarGraphData`, `ParametricCurveData`
- `LimitVisualizationData`, `DerivativeTangentData`, `FunctionDerivativesData`
- `RiemannSumData`, `SolidOfRevolutionData`

**Commit:** `feat: add type definitions for precalculus & calculus diagrams (M-H16 through M-H24)`

#### Task 13: Build Precalculus & Calculus components

**Files:**
- Create: 9 component files in `components/math/highschool/`
- Modify: `components/math/MathDiagramRenderer.tsx`

Key components:
- **UnitCircle** (M-H17): Circle with radius 1, key angles marked, (cos,sin) coordinates
- **RiemannSum** (M-H23): Function curve with animated rectangles filling area
- **SolidOfRevolution** (M-H24): 2.5D isometric visualization of rotated solid
- **DerivativeTangent** (M-H21): Curve with secant lines animating to tangent line

**Commit:** `feat: add 9 precalculus & calculus diagrams (M-H16 through M-H24)`

---

### Batch 7: High School Statistics (Tasks 14-15)

**Goal:** M-H25 through M-H32 (8 diagrams: normal distribution, regression, residuals, probability distributions, confidence intervals, hypothesis testing).

#### Task 14: Add types for M-H25 through M-H32

**Files:**
- Modify: `types/math.ts`
- Modify: `components/homework/diagram/types.ts`

Add interfaces for:
- `NormalDistributionData`, `RegressionLineData`, `ResidualPlotData`
- `ProbabilityDistributionData`, `BinomialDistributionData`
- `SamplingDistributionData`, `ConfidenceIntervalData`, `HypothesisTestData`

**Commit:** `feat: add type definitions for statistics diagrams (M-H25 through M-H32)`

#### Task 15: Build Statistics components

**Files:**
- Create: 8 component files in `components/math/highschool/`
- Modify: `components/math/MathDiagramRenderer.tsx`

Key components:
- **NormalDistribution** (M-H25): Bell curve with σ bands shaded (68-95-99.7 rule)
- **RegressionLine** (M-H26): Scatter plot with least-squares line and residual segments
- **ConfidenceInterval** (M-H31): Number line with point estimate and margin of error
- **HypothesisTest** (M-H32): Normal curve with rejection region(s) shaded

**Commit:** `feat: add 8 high school statistics diagrams (M-H25 through M-H32)`

---

### Batch 8: Polish & Integration (Tasks 16-18)

#### Task 16: Polish existing diagrams to match new quality standard

**Files:**
- Modify: `components/math/NumberLine.tsx` — add step-sync, improve styling
- Modify: `components/math/CoordinatePlane.tsx` — add step-sync, use shared primitives
- Modify: `components/math/Triangle.tsx` — rebuild with proper SVG rendering
- Modify: Remaining "placeholder" diagram types in MathDiagramRenderer

**Step 1:** Refactor NumberLine to use `SVGAxes` shared primitive and add step-sync support.
**Step 2:** Refactor CoordinatePlane to use `SVGGrid`, `SVGAxes`, `SVGPoint`, `SVGCurve` shared primitives.
**Step 3:** Rebuild Triangle with proper geometry calculations, labeled sides/angles, step-synced reveal.

**Commit:** `refactor: polish existing math diagrams to match new quality standard`

#### Task 17: Update AI system prompts with all new diagram schemas

**Files:**
- Modify: `app/api/prepare/[id]/chat/route.ts` — expand diagram schemas
- Modify: Any other AI system prompts that generate diagrams (homework tutor, practice tutor)

Add JSON schema examples for the most common new diagram types so the AI can generate them correctly. Group by grade level so the AI picks appropriate diagrams based on context.

**Commit:** `feat: update AI system prompts with expanded diagram type schemas`

#### Task 18: Final build, deploy, verify

**Step 1:** Run full build
Run: `cd /Users/curvalux/NoteSnap && npm run build 2>&1 | tail -30`
Expected: Build succeeds with zero errors

**Step 2:** Run type check
Run: `cd /Users/curvalux/NoteSnap && npx tsc --noEmit 2>&1 | tail -20`
Expected: Zero type errors

**Step 3:** Deploy
Run: `cd /Users/curvalux/NoteSnap && npx vercel --prod 2>&1 | tail -10`

**Step 4:** Push to git
```bash
git push origin main
```

**Step 5:** Commit plan completion
```bash
git add docs/plans/
git commit -m "docs: complete Phase 1 Math visual learning overhaul plan"
```

---

## Summary

| Batch | Tasks | Diagrams | Grade Band |
|-------|-------|----------|------------|
| 1 | 1-3 | 9 + shared primitives | Elementary 1-2 |
| 2 | 4-5 | 14 | Elementary 3-5 |
| 3 | 6-7 | 9 | Middle 6 |
| 4 | 8-9 | 17 | Middle 7-8 |
| 5 | 10-11 | 15 | High School Algebra |
| 6 | 12-13 | 9 | High School Precalc/Calc |
| 7 | 14-15 | 8 | High School Statistics |
| 8 | 16-18 | Polish + Integration | All |
| **Total** | **18 tasks** | **81 diagram types** | **Grades 1-12** |

## Next Phase
After completing Phase 1 (Math), continue with:
- **Phase 2: Physics** (48 diagrams) — separate plan
- **Phase 3: Chemistry** (51 diagrams) — separate plan
- **Phase 4: Biology** (59 diagrams) — separate plan
- **Phase 5: Geometry** (41 diagrams) — separate plan
- **Phase 6: Economics** (45 diagrams) — separate plan
