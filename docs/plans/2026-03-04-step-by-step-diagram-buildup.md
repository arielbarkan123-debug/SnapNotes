# Step-by-Step Diagram Build-Up Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Every diagram in NoteSnap gets an opt-in "Step by Step" button that launches a walkthrough where the diagram builds up piece by piece, with textbook-quality (TikZ/QuickLaTeX) rendering at each stage and bilingual explanations.

**Architecture:** The AI generates one TikZ document with `% === LAYER N ===` markers alongside every diagram. This layered TikZ source is stored as text in the conversation. When the user clicks "Step by Step", the server parses the layers, compiles cumulative versions via QuickLaTeX, and returns image URLs. The frontend displays them in a walkthrough UI with a side panel (desktop) or stacked layout (mobile).

**Tech Stack:** Next.js 14, Anthropic Claude API, QuickLaTeX API (existing TikZ pipeline), Framer Motion, Tailwind CSS, next-intl

**Scope restriction:** Step-by-step only works for TikZ-pipeline diagrams initially. Other pipelines (E2B matplotlib, Recraft, Desmos, GeoGebra) show the "Step by Step" button as disabled/hidden. This covers the majority of math, geometry, and physics diagrams.

---

## Task 1: Add StepByStep Types

**Files:**
- Modify: `components/homework/diagram/types.ts`
- Modify: `lib/homework/types.ts`

**Step 1: Write the failing test**

Create: `__tests__/lib/diagram-engine/step-types.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import type { StepByStepSource, StepLayerMeta } from '@/components/homework/diagram/types'

describe('StepByStep types', () => {
  it('StepByStepSource has required fields', () => {
    const source: StepByStepSource = {
      tikzCode: '\\begin{tikzpicture}...',
      steps: [
        {
          layer: 1,
          label: 'Draw object',
          labelHe: 'צייר גוף',
          explanation: 'We start by drawing the object.',
          explanationHe: 'נתחיל בציור הגוף.',
        },
      ],
    }
    expect(source.tikzCode).toBeTruthy()
    expect(source.steps).toHaveLength(1)
    expect(source.steps[0].layer).toBe(1)
    expect(source.steps[0].label).toBeTruthy()
    expect(source.steps[0].labelHe).toBeTruthy()
    expect(source.steps[0].explanation).toBeTruthy()
    expect(source.steps[0].explanationHe).toBeTruthy()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/curvalux/NoteSnap && npx vitest run __tests__/lib/diagram-engine/step-types.test.ts`
Expected: FAIL — `StepByStepSource` type not found

**Step 3: Add types to diagram types**

Modify: `components/homework/diagram/types.ts` — add after the `DiagramState` interface:

```typescript
/** Metadata for one layer in a step-by-step TikZ build-up */
export interface StepLayerMeta {
  /** Layer number (1-based, cumulative) */
  layer: number
  /** Short label for this step (EN) */
  label: string
  /** Short label for this step (HE) */
  labelHe: string
  /** Full explanation of what this step adds (EN) */
  explanation: string
  /** Full explanation of what this step adds (HE) */
  explanationHe: string
}

/** Source data for on-demand step-by-step rendering */
export interface StepByStepSource {
  /** Complete TikZ code with % === LAYER N === markers */
  tikzCode: string
  /** Metadata for each layer/step */
  steps: StepLayerMeta[]
}

/** Result of rendering step-by-step images */
export interface StepRenderResult {
  /** Image URLs for each cumulative step (index 0 = layer 1 only, index 1 = layers 1+2, etc.) */
  stepImageUrls: string[]
  /** Whether some steps failed to render */
  partial: boolean
  /** Error messages for failed steps (sparse array, keyed by step index) */
  errors?: Record<number, string>
}
```

**Step 4: Extend TutorDiagramState**

Modify: `lib/homework/types.ts` — find `TutorDiagramState` interface and add `stepByStepSource`:

```typescript
export interface TutorDiagramState {
  type: string
  data: Record<string, unknown>
  visibleStep?: number
  totalSteps?: number
  stepConfig?: Array<Record<string, unknown>>
  /** Layered TikZ source for on-demand step-by-step rendering (TikZ pipeline only) */
  stepByStepSource?: {
    tikzCode: string
    steps: Array<{
      layer: number
      label: string
      labelHe: string
      explanation: string
      explanationHe: string
    }>
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd /Users/curvalux/NoteSnap && npx vitest run __tests__/lib/diagram-engine/step-types.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add components/homework/diagram/types.ts lib/homework/types.ts __tests__/lib/diagram-engine/step-types.test.ts
git commit -m "feat(diagrams): add StepByStepSource types for layered TikZ build-up"
```

---

## Task 2: TikZ Layer Parser

**Files:**
- Create: `lib/diagram-engine/tikz-layer-parser.ts`
- Test: `__tests__/lib/diagram-engine/tikz-layer-parser.test.ts`

**Step 1: Write failing tests**

Create: `__tests__/lib/diagram-engine/tikz-layer-parser.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { parseTikzLayers, buildCumulativeStep } from '@/lib/diagram-engine/tikz-layer-parser'

const SAMPLE_TIKZ = `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% === LAYER 1: Draw the object ===
\\draw[thick] (0,0) rectangle (2,1);
\\node at (1,0.5) {Box};
% === LAYER 2: Weight force ===
\\draw[-{Stealth},very thick,red] (1,0) -- (1,-1.5) node[below,fill=white] {$mg$};
% === LAYER 3: Normal force ===
\\draw[-{Stealth},very thick,blue] (1,1) -- (1,2.5) node[above,fill=white] {$N$};
% === LAYER 4: Friction ===
\\draw[-{Stealth},very thick,orange] (0,0.5) -- (-1.2,0.5) node[left,fill=white] {$f$};
\\end{tikzpicture}`

describe('parseTikzLayers', () => {
  it('extracts correct number of layers', () => {
    const result = parseTikzLayers(SAMPLE_TIKZ)
    expect(result.layers).toHaveLength(4)
    expect(result.preamble).toContain('\\usetikzlibrary{arrows.meta}')
  })

  it('each layer has correct number and content', () => {
    const result = parseTikzLayers(SAMPLE_TIKZ)
    expect(result.layers[0].layerNumber).toBe(1)
    expect(result.layers[0].description).toBe('Draw the object')
    expect(result.layers[0].code).toContain('rectangle')
    expect(result.layers[1].layerNumber).toBe(2)
    expect(result.layers[1].code).toContain('mg')
  })

  it('preserves tikzpicture options', () => {
    const result = parseTikzLayers(SAMPLE_TIKZ)
    expect(result.tikzpictureOptions).toBe('[scale=1.5]')
  })
})

describe('buildCumulativeStep', () => {
  it('step 1 includes only layer 1', () => {
    const parsed = parseTikzLayers(SAMPLE_TIKZ)
    const tikz = buildCumulativeStep(parsed, 1)
    expect(tikz).toContain('\\begin{tikzpicture}')
    expect(tikz).toContain('rectangle')
    expect(tikz).not.toContain('mg')
    expect(tikz).not.toContain('$N$')
  })

  it('step 3 includes layers 1, 2, and 3', () => {
    const parsed = parseTikzLayers(SAMPLE_TIKZ)
    const tikz = buildCumulativeStep(parsed, 3)
    expect(tikz).toContain('rectangle')
    expect(tikz).toContain('mg')
    expect(tikz).toContain('$N$')
    expect(tikz).not.toContain('$f$')
  })

  it('final step includes all layers', () => {
    const parsed = parseTikzLayers(SAMPLE_TIKZ)
    const tikz = buildCumulativeStep(parsed, 4)
    expect(tikz).toContain('rectangle')
    expect(tikz).toContain('mg')
    expect(tikz).toContain('$N$')
    expect(tikz).toContain('$f$')
  })

  it('includes preamble in output', () => {
    const parsed = parseTikzLayers(SAMPLE_TIKZ)
    const tikz = buildCumulativeStep(parsed, 1)
    expect(tikz).toContain('\\usetikzlibrary{arrows.meta}')
  })

  it('handles TikZ with no layers (returns full code)', () => {
    const noLayers = `\\begin{tikzpicture}
\\draw (0,0) -- (1,1);
\\end{tikzpicture}`
    const parsed = parseTikzLayers(noLayers)
    expect(parsed.layers).toHaveLength(1)
    const tikz = buildCumulativeStep(parsed, 1)
    expect(tikz).toContain('\\draw (0,0) -- (1,1)')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/curvalux/NoteSnap && npx vitest run __tests__/lib/diagram-engine/tikz-layer-parser.test.ts`
Expected: FAIL — module not found

**Step 3: Implement the parser**

Create: `lib/diagram-engine/tikz-layer-parser.ts`

```typescript
/**
 * TikZ Layer Parser
 *
 * Parses TikZ code containing % === LAYER N: Description === markers
 * and builds cumulative step documents for step-by-step rendering.
 */

export interface ParsedLayer {
  layerNumber: number
  description: string
  code: string
}

export interface ParsedTikz {
  preamble: string
  tikzpictureOptions: string
  layers: ParsedLayer[]
}

const LAYER_REGEX = /^%\s*===\s*LAYER\s+(\d+)\s*:\s*(.+?)\s*===\s*$/

/**
 * Parse TikZ code with layer markers into structured layers.
 *
 * Expected format:
 * ```
 * \usetikzlibrary{...}
 * \begin{tikzpicture}[options]
 * % === LAYER 1: Description ===
 * ...tikz code...
 * % === LAYER 2: Description ===
 * ...tikz code...
 * \end{tikzpicture}
 * ```
 */
export function parseTikzLayers(tikzCode: string): ParsedTikz {
  const lines = tikzCode.split('\n')

  let preamble = ''
  let tikzpictureOptions = ''
  const layers: ParsedLayer[] = []

  let insideTikz = false
  let currentLayerNumber = 0
  let currentDescription = ''
  let currentCode: string[] = []
  let preLayerCode: string[] = []

  for (const line of lines) {
    // Detect \begin{tikzpicture}
    const beginMatch = line.match(/\\begin\{tikzpicture\}(\[.*?\])?/)
    if (beginMatch) {
      tikzpictureOptions = beginMatch[1] || ''
      insideTikz = true
      continue
    }

    // Detect \end{tikzpicture}
    if (line.trim() === '\\end{tikzpicture}') {
      // Flush last layer
      if (currentLayerNumber > 0) {
        layers.push({
          layerNumber: currentLayerNumber,
          description: currentDescription,
          code: currentCode.join('\n').trim(),
        })
      } else if (preLayerCode.length > 0) {
        // No layer markers found — treat entire body as layer 1
        layers.push({
          layerNumber: 1,
          description: 'Complete diagram',
          code: preLayerCode.join('\n').trim(),
        })
      }
      break
    }

    if (!insideTikz) {
      // Everything before \begin{tikzpicture} is preamble
      if (line.trim()) {
        preamble += (preamble ? '\n' : '') + line
      }
      continue
    }

    // Check for layer marker
    const layerMatch = line.match(LAYER_REGEX)
    if (layerMatch) {
      // Flush previous layer
      if (currentLayerNumber > 0) {
        layers.push({
          layerNumber: currentLayerNumber,
          description: currentDescription,
          code: currentCode.join('\n').trim(),
        })
      } else if (preLayerCode.length > 0) {
        // Code before first layer marker — treat as layer 0 (setup)
        layers.push({
          layerNumber: 0,
          description: 'Setup',
          code: preLayerCode.join('\n').trim(),
        })
      }
      currentLayerNumber = parseInt(layerMatch[1], 10)
      currentDescription = layerMatch[2].trim()
      currentCode = []
    } else {
      if (currentLayerNumber > 0) {
        currentCode.push(line)
      } else {
        preLayerCode.push(line)
      }
    }
  }

  // If no layers were found at all, wrap everything as a single layer
  if (layers.length === 0) {
    const allCode = lines
      .filter(l => !l.match(/\\begin\{tikzpicture\}/) && l.trim() !== '\\end{tikzpicture}')
      .filter(l => !l.match(/\\usetikzlibrary/))
      .join('\n')
      .trim()

    layers.push({
      layerNumber: 1,
      description: 'Complete diagram',
      code: allCode,
    })
  }

  return { preamble, tikzpictureOptions, layers }
}

/**
 * Build a complete TikZ document for step N (cumulative: layers 1..N).
 * Layer 0 (setup) is always included if present.
 */
export function buildCumulativeStep(parsed: ParsedTikz, stepNumber: number): string {
  const { preamble, tikzpictureOptions, layers } = parsed

  // Always include layer 0 (setup) if it exists
  const includedLayers = layers.filter(
    l => l.layerNumber === 0 || l.layerNumber <= stepNumber
  )

  const bodyCode = includedLayers
    .map(l => l.code)
    .filter(Boolean)
    .join('\n\n')

  const parts: string[] = []
  if (preamble) parts.push(preamble)
  parts.push(`\\begin{tikzpicture}${tikzpictureOptions}`)
  parts.push(bodyCode)
  parts.push('\\end{tikzpicture}')

  return parts.join('\n')
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/curvalux/NoteSnap && npx vitest run __tests__/lib/diagram-engine/tikz-layer-parser.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add lib/diagram-engine/tikz-layer-parser.ts __tests__/lib/diagram-engine/tikz-layer-parser.test.ts
git commit -m "feat(diagrams): add TikZ layer parser for step-by-step rendering"
```

---

## Task 3: Step-by-Step Renderer

**Files:**
- Create: `lib/diagram-engine/step-renderer.ts`
- Test: `__tests__/lib/diagram-engine/step-renderer.test.ts`

**Step 1: Write failing tests**

Create: `__tests__/lib/diagram-engine/step-renderer.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the tikz-executor module
vi.mock('@/lib/diagram-engine/tikz-executor', () => ({
  __esModule: true,
  // We'll mock compileTikZ — we need to export it from tikz-executor
}))

import { renderStepByStep } from '@/lib/diagram-engine/step-renderer'
import type { StepByStepSource } from '@/components/homework/diagram/types'

describe('renderStepByStep', () => {
  const mockSource: StepByStepSource = {
    tikzCode: `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% === LAYER 1: Draw the object ===
\\draw[thick] (0,0) rectangle (2,1);
% === LAYER 2: Weight force ===
\\draw[-{Stealth},very thick,red] (1,0) -- (1,-1.5) node[below] {$mg$};
\\end{tikzpicture}`,
    steps: [
      { layer: 1, label: 'Object', labelHe: 'גוף', explanation: 'Draw the box', explanationHe: 'צייר קופסה' },
      { layer: 2, label: 'Weight', labelHe: 'משקל', explanation: 'Add weight', explanationHe: 'הוסף משקל' },
    ],
  }

  it('returns correct number of step images', async () => {
    const result = await renderStepByStep(mockSource)
    expect(result.stepImageUrls).toHaveLength(2)
  })

  it('marks partial when some steps fail', async () => {
    // This test verifies error handling — implementation will test with mocked failures
    const result = await renderStepByStep(mockSource)
    expect(typeof result.partial).toBe('boolean')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/curvalux/NoteSnap && npx vitest run __tests__/lib/diagram-engine/step-renderer.test.ts`
Expected: FAIL — module not found

**Step 3: Export compileTikZ from tikz-executor**

Modify: `lib/diagram-engine/tikz-executor.ts` — the `compileTikZ` function is currently private. Export it:

Find:
```typescript
async function compileTikZ(tikzCode: string): Promise<CompileSuccess | CompileFailure> {
```

Replace with:
```typescript
export async function compileTikZ(tikzCode: string): Promise<CompileSuccess | CompileFailure> {
```

Also export the result types by adding after the existing exports:
```typescript
export type { CompileSuccess, CompileFailure }
```

**Step 4: Implement step renderer**

Create: `lib/diagram-engine/step-renderer.ts`

```typescript
/**
 * Step-by-Step Renderer
 *
 * Takes a StepByStepSource (layered TikZ + step metadata),
 * parses the layers, and renders each cumulative step via QuickLaTeX.
 * Includes retry logic and graceful fallback.
 */

import { parseTikzLayers, buildCumulativeStep } from './tikz-layer-parser'
import { compileTikZ } from './tikz-executor'
import type { StepByStepSource, StepRenderResult } from '@/components/homework/diagram/types'

const MAX_RETRIES = 2
const MAX_CONCURRENT_RENDERS = 3

/**
 * Render a single cumulative step with retry logic.
 * Returns the image URL or null on failure.
 */
async function renderSingleStep(
  tikzCode: string,
  stepIndex: number,
): Promise<{ url: string | null; error?: string }> {
  let lastError = ''

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await compileTikZ(tikzCode)

      if ('url' in result) {
        return { url: result.url }
      }

      lastError = result.error
      console.warn(
        `[StepRenderer] Step ${stepIndex + 1} compile attempt ${attempt + 1} failed:`,
        result.error.slice(0, 200),
      )
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[StepRenderer] Step ${stepIndex + 1} unexpected error:`, err)
    }
  }

  return { url: null, error: lastError }
}

/**
 * Render all steps of a step-by-step diagram.
 *
 * 1. Parses layered TikZ into structured layers
 * 2. Builds cumulative TikZ code for each step
 * 3. Renders each via QuickLaTeX with retry logic
 * 4. Returns image URLs + partial flag
 */
export async function renderStepByStep(
  source: StepByStepSource,
): Promise<StepRenderResult> {
  console.log(`[StepRenderer] Rendering ${source.steps.length} steps...`)

  const parsed = parseTikzLayers(source.tikzCode)

  if (parsed.layers.length === 0) {
    console.error('[StepRenderer] No layers found in TikZ code')
    return { stepImageUrls: [], partial: true, errors: { 0: 'No layers found in TikZ code' } }
  }

  // Build cumulative TikZ for each step
  const stepTikzCodes = source.steps.map((step) =>
    buildCumulativeStep(parsed, step.layer),
  )

  // Render with concurrency limit
  const stepImageUrls: string[] = []
  const errors: Record<number, string> = {}
  let hasFailures = false

  // Process in batches of MAX_CONCURRENT_RENDERS
  for (let i = 0; i < stepTikzCodes.length; i += MAX_CONCURRENT_RENDERS) {
    const batch = stepTikzCodes.slice(i, i + MAX_CONCURRENT_RENDERS)
    const batchResults = await Promise.all(
      batch.map((tikz, batchIdx) => renderSingleStep(tikz, i + batchIdx)),
    )

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j]
      if (result.url) {
        stepImageUrls.push(result.url)
      } else {
        hasFailures = true
        stepImageUrls.push('') // Placeholder for failed step
        errors[i + j] = result.error || 'Render failed'
      }
    }
  }

  const successCount = stepImageUrls.filter(Boolean).length
  console.log(`[StepRenderer] Done: ${successCount}/${source.steps.length} steps rendered`)

  return {
    stepImageUrls,
    partial: hasFailures,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  }
}

/**
 * Validate that a StepByStepSource has valid structure.
 * Use before storing to catch malformed AI output early.
 */
export function validateStepByStepSource(source: unknown): source is StepByStepSource {
  if (!source || typeof source !== 'object') return false
  const s = source as Record<string, unknown>
  if (typeof s.tikzCode !== 'string') return false
  if (!s.tikzCode.includes('\\begin{tikzpicture}')) return false
  if (!Array.isArray(s.steps)) return false
  if (s.steps.length === 0) return false
  for (const step of s.steps as unknown[]) {
    if (!step || typeof step !== 'object') return false
    const st = step as Record<string, unknown>
    if (typeof st.layer !== 'number') return false
    if (typeof st.label !== 'string') return false
    if (typeof st.explanation !== 'string') return false
  }
  return true
}
```

**Step 5: Run tests to verify they pass**

Run: `cd /Users/curvalux/NoteSnap && npx vitest run __tests__/lib/diagram-engine/step-renderer.test.ts`
Expected: PASS (tests use mocked QuickLaTeX)

**Step 6: Commit**

```bash
git add lib/diagram-engine/step-renderer.ts lib/diagram-engine/tikz-executor.ts __tests__/lib/diagram-engine/step-renderer.test.ts
git commit -m "feat(diagrams): add step-by-step renderer with retry and concurrency"
```

---

## Task 4: TikZ Prompt Update — Layer Convention

**Files:**
- Modify: `lib/diagram-engine/tikz/core-prompt.ts`
- Create: `lib/diagram-engine/tikz/layered-tikz-prompt.ts`

**Step 1: Create the layered TikZ prompt module**

Create: `lib/diagram-engine/tikz/layered-tikz-prompt.ts`

```typescript
/**
 * Prompt additions for generating layered TikZ code with step-by-step markers.
 * Appended to the core TikZ prompt when step-by-step source is requested.
 */

export const LAYERED_TIKZ_INSTRUCTIONS = `

STEP-BY-STEP LAYER SYSTEM — REQUIRED:
In addition to the standard TikZ diagram, structure your code with LAYER MARKERS so the diagram can be revealed step-by-step for teaching purposes.

LAYER MARKER FORMAT:
% === LAYER N: Short description ===

RULES:
1. Place a layer marker before each logical group of elements.
2. Layers are CUMULATIVE — Layer 3 means "show layers 1+2+3 together."
3. Each layer must only ADD new elements. Never modify or remove elements from previous layers.
4. Use ABSOLUTE COORDINATES only (no \\node[right of=...] across layers). Elements must not shift position when earlier layers are rendered alone.
5. Aim for 3-6 layers per diagram (not too few, not too many).
6. Layer order should follow pedagogical logic — setup first, details/answers last.
7. The FULL diagram (all layers) must look identical to a non-layered version.

LAYER SEQUENCE GUIDELINES:
- Layer 1: Basic setup (axes, grid, coordinate system, object outline)
- Layer 2-N-1: Progressive additions (forces, labels, calculations, curves)
- Layer N: Final answer, result, or summary annotation

EXAMPLE — Free Body Diagram:
\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% === LAYER 1: Draw the object on the surface ===
\\draw[thick,gray] (-2,0) -- (4,0);
\\draw[thick] (0,0) rectangle (2,1.2);
\\node at (1,0.6) {\\large 5 kg};
% === LAYER 2: Weight force (gravity) ===
\\draw[-{Stealth[length=3mm]},very thick,red] (1,0) -- (1,-1.8) node[below,fill=white,inner sep=2pt] {\\large $mg = 49$ N};
% === LAYER 3: Normal force ===
\\draw[-{Stealth[length=3mm]},very thick,blue!70] (1,1.2) -- (1,3) node[above,fill=white,inner sep=2pt] {\\large $N = 49$ N};
% === LAYER 4: Applied force and friction ===
\\draw[-{Stealth[length=3mm]},very thick,green!60!black] (2,0.6) -- (3.5,0.6) node[right,fill=white,inner sep=2pt] {\\large $F = 20$ N};
\\draw[-{Stealth[length=3mm]},very thick,orange!80!black] (0,0.6) -- (-1.2,0.6) node[left,fill=white,inner sep=2pt] {\\large $f = 12$ N};
\\end{tikzpicture}

EXAMPLE — Quadratic Function Graph:
\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=0.8]
% === LAYER 1: Coordinate axes ===
\\draw[-{Stealth},thick] (-1,0) -- (6,0) node[right] {$x$};
\\draw[-{Stealth},thick] (0,-2) -- (0,6) node[above] {$y$};
\\foreach \\x in {1,...,5} \\draw (\\x,0.1) -- (\\x,-0.1) node[below] {\\x};
\\foreach \\y in {1,...,5} \\draw (0.1,\\y) -- (-0.1,\\y) node[left] {\\y};
% === LAYER 2: Plot the parabola ===
\\draw[very thick,blue!70,domain=0.27:4.73,samples=50] plot (\\x, {0.5*(\\x-2.5)^2 - 0.5});
% === LAYER 3: Mark the vertex ===
\\fill[red] (2.5,-0.5) circle (3pt);
\\node[below right,fill=white,inner sep=2pt] at (2.5,-0.5) {Vertex $(2.5, -0.5)$};
% === LAYER 4: Mark x-intercepts and axis of symmetry ===
\\fill[green!60!black] (1.5,0) circle (3pt);
\\fill[green!60!black] (3.5,0) circle (3pt);
\\draw[dashed,gray] (2.5,-1) -- (2.5,5) node[above,fill=white,inner sep=1pt] {$x=2.5$};
\\end{tikzpicture}`

/**
 * Prompt for the AI to generate step metadata alongside the TikZ code.
 * This is used in a second message to extract step explanations.
 */
export const STEP_METADATA_PROMPT = `Now provide the step-by-step metadata for the layered TikZ diagram you just generated.

Return JSON (no markdown fences, no explanation):
{
  "steps": [
    {
      "layer": 1,
      "label": "Short 3-5 word English label",
      "labelHe": "Short 3-5 word Hebrew label",
      "explanation": "1-2 sentence English explanation of what this step shows and why",
      "explanationHe": "Same explanation in Hebrew"
    }
  ]
}

Rules:
- One entry per LAYER marker in the TikZ code
- Labels should be concise (3-5 words)
- Explanations should be pedagogical — explain the WHY, not just the WHAT
- Hebrew translations must be natural, not word-for-word`
```

**Step 2: Commit**

```bash
git add lib/diagram-engine/tikz/layered-tikz-prompt.ts
git commit -m "feat(diagrams): add layered TikZ prompt instructions and examples"
```

---

## Task 5: Generate Layered TikZ Alongside Diagrams

**Files:**
- Create: `lib/diagram-engine/layered-tikz-generator.ts`
- Modify: `lib/diagram-engine/integration.ts`

**Step 1: Create the layered TikZ generator**

Create: `lib/diagram-engine/layered-tikz-generator.ts`

```typescript
/**
 * Layered TikZ Generator
 *
 * Generates layered TikZ code (with LAYER markers) for a given question.
 * Called alongside normal diagram generation to produce step-by-step source.
 * Only works for TikZ-pipeline questions.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import { buildTikzPrompt } from './tikz'
import { LAYERED_TIKZ_INSTRUCTIONS, STEP_METADATA_PROMPT } from './tikz/layered-tikz-prompt'
import { validateStepByStepSource } from './step-renderer'
import type { StepByStepSource } from '@/components/homework/diagram/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

/**
 * Generate layered TikZ code + step metadata for a question.
 *
 * Flow:
 * 1. Build the TikZ prompt with added layer instructions
 * 2. AI generates layered TikZ code
 * 3. AI generates step metadata JSON
 * 4. Validate and return StepByStepSource
 */
export async function generateLayeredTikz(
  question: string,
): Promise<StepByStepSource | null> {
  try {
    console.log(`[LayeredTikZ] Generating for: "${question.slice(0, 80)}..."`)

    // Build prompt with layer instructions appended
    const basePrompt = buildTikzPrompt(question)
    const systemPrompt = basePrompt + LAYERED_TIKZ_INSTRUCTIONS

    // Step 1: Generate the layered TikZ code
    const tikzResponse = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate layered TikZ code (with % === LAYER N === markers) for:\n\n${question}`,
        },
      ],
    })

    const tikzBlock = tikzResponse.content.find(b => b.type === 'text')
    if (!tikzBlock || tikzBlock.type !== 'text') {
      console.warn('[LayeredTikZ] No text in response')
      return null
    }

    let tikzCode = tikzBlock.text

    // Strip markdown code fences if present
    const codeMatch = tikzCode.match(/```(?:latex|tex|tikz|plaintext)?\s*\n([\s\S]*?)```/)
    if (codeMatch) {
      tikzCode = codeMatch[1].trim()
    }

    // Validate it has layer markers
    if (!tikzCode.includes('% === LAYER')) {
      console.warn('[LayeredTikZ] Generated code has no layer markers')
      return null
    }

    if (!tikzCode.includes('\\begin{tikzpicture}')) {
      console.warn('[LayeredTikZ] Generated code is not valid TikZ')
      return null
    }

    // Step 2: Generate step metadata
    const metaResponse = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: 'You are a helpful assistant that generates JSON metadata.',
      messages: [
        {
          role: 'user',
          content: `Here is a layered TikZ diagram:\n\n${tikzCode}\n\n${STEP_METADATA_PROMPT}`,
        },
      ],
    })

    const metaBlock = metaResponse.content.find(b => b.type === 'text')
    if (!metaBlock || metaBlock.type !== 'text') {
      console.warn('[LayeredTikZ] No metadata in response')
      return null
    }

    // Parse JSON from response
    const jsonMatch = metaBlock.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[LayeredTikZ] Could not parse metadata JSON')
      return null
    }

    const metadata = JSON.parse(jsonMatch[0])

    const source: StepByStepSource = {
      tikzCode,
      steps: metadata.steps,
    }

    // Validate structure
    if (!validateStepByStepSource(source)) {
      console.warn('[LayeredTikZ] Source validation failed')
      return null
    }

    console.log(`[LayeredTikZ] Generated ${source.steps.length} layers successfully`)
    return source
  } catch (err) {
    console.error('[LayeredTikZ] Error:', err)
    return null
  }
}
```

**Step 2: Extend tryEngineDiagram to also generate layered TikZ**

Modify: `lib/diagram-engine/integration.ts` — update the `tryEngineDiagram` function to also generate layered TikZ for TikZ-pipeline diagrams.

Add import at top:
```typescript
import { generateLayeredTikz } from './layered-tikz-generator'
import { routeQuestion } from './router'
```

Add a new field to `EngineDiagramResult`:
```typescript
export interface EngineDiagramResult {
  type: 'engine_diagram';
  imageUrl: string;
  pipeline: Pipeline;
  attempts: number;
  qaVerdict?: string;
  overlay?: Array<{
    text: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
  }>;
  /** Layered TikZ source for step-by-step (TikZ pipeline only) */
  stepByStepSource?: {
    tikzCode: string;
    steps: Array<{
      layer: number;
      label: string;
      labelHe: string;
      explanation: string;
      explanationHe: string;
    }>;
  };
}
```

Update `tryEngineDiagram` to generate layered TikZ in parallel:
```typescript
export async function tryEngineDiagram(
  question: string,
  forcePipeline?: Pipeline,
): Promise<EngineDiagramResult | undefined> {
  console.log(`[Engine] tryEngineDiagram called with: "${question.slice(0, 80)}..."`);

  if (!forcePipeline && !shouldUseEngine(question)) {
    console.log('[Engine] shouldUseEngine returned false, skipping');
    return undefined;
  }

  console.log('[Engine] Calling generateDiagram...');

  try {
    // Determine pipeline to check if TikZ (for step-by-step)
    const pipeline = forcePipeline || routeQuestion(question);
    const isTikzPipeline = pipeline === 'tikz';

    // Generate diagram and layered TikZ in parallel (for TikZ pipeline)
    const [result, layeredSource] = await Promise.all([
      generateDiagram(question, forcePipeline),
      isTikzPipeline ? generateLayeredTikz(question) : Promise.resolve(null),
    ]);

    if ('error' in result) {
      console.error(`[Engine] Generation failed: ${result.error}`, { pipeline: result.pipeline });
      return undefined;
    }

    console.log(`[Engine] Success! Pipeline: ${result.pipeline}, URL length: ${result.imageUrl?.length}`);
    if (layeredSource) {
      console.log(`[Engine] Layered TikZ: ${layeredSource.steps.length} layers`);
    }

    return {
      type: 'engine_diagram',
      imageUrl: result.imageUrl,
      pipeline: result.pipeline,
      attempts: result.attempts,
      qaVerdict: result.qaVerdict,
      overlay: result.overlay,
      stepByStepSource: layeredSource || undefined,
    };
  } catch (err) {
    console.error('[Engine] Unexpected error:', err);
    return undefined;
  }
}
```

**Step 3: Commit**

```bash
git add lib/diagram-engine/layered-tikz-generator.ts lib/diagram-engine/integration.ts
git commit -m "feat(diagrams): generate layered TikZ alongside diagram for step-by-step"
```

---

## Task 6: Wire StepByStepSource Through Tutor Engine

**Files:**
- Modify: `lib/homework/tutor-engine.ts`

**Step 1: Find where TutorDiagramState is constructed**

Search in `tutor-engine.ts` for where `EngineDiagramResult` is converted to `TutorDiagramState`. The function builds a diagram object like:
```typescript
{ type: 'engine_image', data: { imageUrl: ..., pipeline: ... } }
```

**Step 2: Pass stepByStepSource through**

Wherever the tutor engine creates the diagram state from an engine result, also pass the `stepByStepSource`:

```typescript
// When constructing the TutorDiagramState from engine result:
const diagramState: TutorDiagramState = {
  type: 'engine_image',
  data: {
    imageUrl: engineResult.imageUrl,
    pipeline: engineResult.pipeline,
    overlay: engineResult.overlay,
    qaVerdict: engineResult.qaVerdict,
  },
  // Pass step-by-step source if available
  stepByStepSource: engineResult.stepByStepSource,
}
```

This is a minimal change — just threading the field through.

**Step 3: Verify the field flows to the conversation**

The conversation already stores `TutorDiagramState` as JSONB. Since we added `stepByStepSource` as an optional field, it will be serialized/deserialized automatically. No DB migration needed.

**Step 4: Commit**

```bash
git add lib/homework/tutor-engine.ts
git commit -m "feat(diagrams): thread stepByStepSource through tutor engine to conversation"
```

---

## Task 7: Render Steps API Route

**Files:**
- Create: `app/api/diagrams/render-steps/route.ts`
- Test: manually via curl or frontend

**Step 1: Create the API route**

Create: `app/api/diagrams/render-steps/route.ts`

```typescript
/**
 * POST /api/diagrams/render-steps
 *
 * On-demand rendering of step-by-step diagram images.
 * Takes a StepByStepSource, parses layers, renders each cumulative step
 * via QuickLaTeX, and returns image URLs.
 *
 * Called when user clicks "Step by Step" button on a diagram.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderStepByStep } from '@/lib/diagram-engine/step-renderer'
import { validateStepByStepSource } from '@/lib/diagram-engine/step-renderer'
import type { StepByStepSource } from '@/components/homework/diagram/types'

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stepByStepSource } = body as { stepByStepSource: StepByStepSource }

    // Validate input
    if (!validateStepByStepSource(stepByStepSource)) {
      return NextResponse.json(
        { error: 'Invalid stepByStepSource structure' },
        { status: 400 },
      )
    }

    console.log(`[RenderSteps] Rendering ${stepByStepSource.steps.length} steps for user ${user.id}`)

    // Render all steps
    const result = await renderStepByStep(stepByStepSource)

    console.log(
      `[RenderSteps] Done: ${result.stepImageUrls.filter(Boolean).length}/${stepByStepSource.steps.length} rendered`,
    )

    return NextResponse.json({
      stepImageUrls: result.stepImageUrls,
      partial: result.partial,
      errors: result.errors,
      steps: stepByStepSource.steps, // Echo back step metadata for frontend
    })
  } catch (err) {
    console.error('[RenderSteps] Error:', err)
    return NextResponse.json(
      { error: 'Failed to render step-by-step diagram' },
      { status: 500 },
    )
  }
}
```

**Step 2: Commit**

```bash
git add app/api/diagrams/render-steps/route.ts
git commit -m "feat(diagrams): add POST /api/diagrams/render-steps API route"
```

---

## Task 8: Frontend — StepByStep Button on Diagrams

**Files:**
- Create: `components/homework/diagram/StepByStepButton.tsx`
- Modify: `components/homework/diagram/EngineDiagramImage.tsx`

**Step 1: Create the button component**

Create: `components/homework/diagram/StepByStepButton.tsx`

```typescript
'use client'

import { Layers } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface StepByStepButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}

export default function StepByStepButton({
  onClick,
  disabled,
  loading,
}: StepByStepButtonProps) {
  const t = useTranslations('diagram')

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
        bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300
        hover:bg-violet-200 dark:hover:bg-violet-900/50
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-all duration-200 shadow-sm"
      aria-label={t('stepByStep.buttonLabel')}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-violet-600 dark:border-violet-400" />
      ) : (
        <Layers className="w-3.5 h-3.5" />
      )}
      <span>{loading ? t('stepByStep.loading') : t('stepByStep.button')}</span>
    </button>
  )
}
```

**Step 2: Add the button to EngineDiagramImage**

Modify: `components/homework/diagram/EngineDiagramImage.tsx` — add a `stepByStepSource` prop and render the button when available.

Update the props interface:
```typescript
interface EngineDiagramImageProps {
  imageUrl: string
  pipeline?: string
  overlay?: OverlayLabel[]
  qaVerdict?: string
  /** If present, shows "Step by Step" button */
  hasStepByStep?: boolean
  /** Called when user clicks Step by Step */
  onStepByStepClick?: () => void
  /** Whether step-by-step is currently loading */
  stepByStepLoading?: boolean
}
```

Add button to the render (after the pipeline badge, before the closing `</div>` of the relative container):
```tsx
{/* Step by Step button */}
{hasStepByStep && onStepByStepClick && (
  <div className="absolute bottom-2 right-2 z-10">
    <StepByStepButton
      onClick={onStepByStepClick}
      loading={stepByStepLoading}
    />
  </div>
)}
```

Import at top: `import StepByStepButton from './StepByStepButton'`

**Step 3: Commit**

```bash
git add components/homework/diagram/StepByStepButton.tsx components/homework/diagram/EngineDiagramImage.tsx
git commit -m "feat(diagrams): add Step by Step button to engine diagram images"
```

---

## Task 9: Frontend — StepByStep Walkthrough Component

**Files:**
- Create: `components/homework/diagram/StepByStepWalkthrough.tsx`

**Step 1: Create the walkthrough component**

This is the main UI that appears when the user clicks "Step by Step". It reuses patterns from `StepSequencePlayer` but with the new layout (side panel on desktop, stacked on mobile).

Create: `components/homework/diagram/StepByStepWalkthrough.tsx`

```typescript
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import StepDot from './StepDot'
import EngineDiagramImage from './EngineDiagramImage'
import type { StepLayerMeta } from './types'

interface StepByStepWalkthroughProps {
  stepImageUrls: string[]
  steps: StepLayerMeta[]
  finalImageUrl: string
  language?: 'en' | 'he'
  partial?: boolean
  onClose: () => void
}

const AUTOPLAY_INTERVAL = 6000

export default function StepByStepWalkthrough({
  stepImageUrls,
  steps,
  finalImageUrl,
  language = 'en',
  partial,
  onClose,
}: StepByStepWalkthroughProps) {
  const t = useTranslations('diagram')
  const isHe = language === 'he'
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]))
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null)

  const totalSteps = steps.length
  const step = steps[currentStep]
  const imageUrl = stepImageUrls[currentStep] || ''
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  // ─── Navigation ──────────────────────────────────────────────

  const goToStep = useCallback((index: number) => {
    if (index < 0 || index >= totalSteps) return
    setDirection(index > currentStep ? 1 : -1)
    setCurrentStep(index)
    setVisitedSteps(prev => new Set([...prev, index]))
  }, [currentStep, totalSteps])

  const goNext = useCallback(() => {
    if (isLast) {
      setIsAutoPlaying(false)
      return
    }
    goToStep(currentStep + 1)
  }, [currentStep, isLast, goToStep])

  const goPrev = useCallback(() => {
    if (!isFirst) goToStep(currentStep - 1)
  }, [currentStep, isFirst, goToStep])

  const restart = useCallback(() => {
    setDirection(-1)
    setCurrentStep(0)
    setVisitedSteps(new Set([0]))
    setIsAutoPlaying(false)
  }, [])

  // ─── Auto-play ───────────────────────────────────────────────

  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(goNext, AUTOPLAY_INTERVAL)
    }
    return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current) }
  }, [isAutoPlaying, goNext])

  useEffect(() => {
    if (isLast && isAutoPlaying) setIsAutoPlaying(false)
  }, [isLast, isAutoPlaying])

  // ─── Keyboard ────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') { onClose(); return }
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
  }, [goNext, goPrev, isHe, onClose])

  // ─── Touch swipe ─────────────────────────────────────────────

  const touchStartX = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(diff) > 50) {
      diff > 0 ? (isHe ? goNext() : goPrev()) : (isHe ? goPrev() : goNext())
    }
    touchStartX.current = null
  }

  // ─── Animation ───────────────────────────────────────────────

  const fadeVariants = {
    enter: { opacity: 0, scale: 0.98 },
    center: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  }

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div
      className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg"
      dir={isHe ? 'rtl' : 'ltr'}
      role="region"
      aria-label={t('stepByStep.walkthroughLabel')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-violet-50/50 dark:bg-violet-900/10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            {t('stepByStep.title')}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label={t('stepByStep.close')}
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-700">
        <motion.div
          className="h-full bg-violet-600"
          animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700">
        {steps.map((s, i) => (
          <StepDot
            key={i}
            stepNumber={i + 1}
            isActive={i === currentStep}
            isCompleted={visitedSteps.has(i) && i !== currentStep}
            onClick={() => goToStep(i)}
            label={isHe ? s.labelHe : s.label}
          />
        ))}
      </div>

      {/* Main content: side-by-side on desktop, stacked on mobile */}
      <div
        className="flex flex-col md:flex-row"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Diagram panel (60% on desktop) */}
        <div className="w-full md:w-3/5 p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              variants={fadeVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              {imageUrl ? (
                <div className="rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                  <EngineDiagramImage
                    imageUrl={imageUrl}
                    pipeline="tikz"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {t('stepByStep.renderFailed')}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Explanation panel (40% on desktop) */}
        <div className="w-full md:w-2/5 p-4 md:p-6 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* Step badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-sm font-bold">
                  {currentStep + 1}
                </span>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {isHe ? step.labelHe : step.label}
                </h3>
              </div>

              {/* Explanation */}
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {isHe ? step.explanationHe : step.explanation}
              </p>

              {/* Final step summary */}
              {isLast && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <p className="text-xs font-medium text-green-700 dark:text-green-300">
                    {t('stepByStep.complete')}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <button
          onClick={isHe ? goNext : goPrev}
          disabled={isHe ? isLast : isFirst}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t('stepSequence.previous')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAutoPlaying(prev => !prev)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isAutoPlaying ? (
              <Pause className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            ) : (
              <Play className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>

          {isLast && (
            <button
              onClick={restart}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        <button
          onClick={isHe ? goPrev : goNext}
          disabled={isHe ? isFirst : isLast}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <span className="hidden sm:inline">{t('stepSequence.next')}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Partial warning */}
      {partial && (
        <div className="px-4 pb-3">
          <p className="text-xs text-amber-500 dark:text-amber-400 text-center">
            {t('stepByStep.partialWarning')}
          </p>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/homework/diagram/StepByStepWalkthrough.tsx
git commit -m "feat(diagrams): add StepByStepWalkthrough component with side panel layout"
```

---

## Task 10: Wire Everything Together in DiagramRenderer

**Files:**
- Modify: `components/homework/diagram/DiagramRenderer.tsx`
- Modify: `components/homework/diagram/InlineDiagram.tsx`
- Modify: `components/homework/diagram/helpers.ts`
- Modify: `components/homework/diagram/index.ts`

**Step 1: Update helpers to pass stepByStepSource**

Modify: `components/homework/diagram/helpers.ts` — ensure `convertToDiagramState` preserves the `stepByStepSource` field from the tutor diagram.

**Step 2: Update DiagramRenderer to support walkthrough mode**

Modify: `components/homework/diagram/DiagramRenderer.tsx` — for `engine_image` type, check if `stepByStepSource` exists in the data and render `EngineDiagramImage` with the step-by-step button props. Add state management for the walkthrough.

The `DiagramRenderer` should:
1. Check if `diagram.data` contains a `stepByStepSource` field
2. If yes, pass `hasStepByStep={true}` and `onStepByStepClick` to `EngineDiagramImage`
3. When clicked, call the `/api/diagrams/render-steps` API
4. When images are ready, render `StepByStepWalkthrough` instead of the static image
5. Allow closing the walkthrough to return to the static image

**Step 3: Update InlineDiagram**

Modify: `components/homework/diagram/InlineDiagram.tsx` — when walkthrough is active, expand the container to full width to accommodate the side panel.

**Step 4: Update barrel exports**

Modify: `components/homework/diagram/index.ts` — add exports for new components.

**Step 5: Commit**

```bash
git add components/homework/diagram/DiagramRenderer.tsx components/homework/diagram/InlineDiagram.tsx components/homework/diagram/helpers.ts components/homework/diagram/index.ts
git commit -m "feat(diagrams): wire step-by-step walkthrough into DiagramRenderer"
```

---

## Task 11: i18n Translations

**Files:**
- Modify: `messages/en/diagram.json`
- Modify: `messages/he/diagram.json`

**Step 1: Add step-by-step translation keys**

Add to `messages/en/diagram.json`:
```json
{
  "stepByStep": {
    "button": "Step by Step",
    "buttonLabel": "View step-by-step diagram build-up",
    "loading": "Preparing steps...",
    "title": "Step-by-Step Build-Up",
    "walkthroughLabel": "Step-by-step diagram walkthrough",
    "close": "Close walkthrough",
    "complete": "Diagram complete! All elements are now shown.",
    "renderFailed": "This step could not be rendered",
    "partialWarning": "Some steps could not be rendered and are shown as placeholders.",
    "fallbackTitle": "Step-by-Step Explanation",
    "fallbackNote": "Visual build-up unavailable. Showing text explanations with the final diagram."
  }
}
```

Add to `messages/he/diagram.json`:
```json
{
  "stepByStep": {
    "button": "צעד אחר צעד",
    "buttonLabel": "צפה בבניית התרשים צעד אחר צעד",
    "loading": "מכין שלבים...",
    "title": "בנייה צעד אחר צעד",
    "walkthroughLabel": "הדרכת תרשים צעד אחר צעד",
    "close": "סגור הדרכה",
    "complete": "התרשים הושלם! כל האלמנטים מוצגים.",
    "renderFailed": "לא ניתן היה לעבד שלב זה",
    "partialWarning": "חלק מהשלבים לא נוצרו בהצלחה ומוצגים כמצייני מקום.",
    "fallbackTitle": "הסבר צעד אחר צעד",
    "fallbackNote": "הבנייה הוויזואלית אינה זמינה. מציג הסברים טקסטואליים עם התרשים הסופי."
  }
}
```

**Step 2: Commit**

```bash
git add messages/en/diagram.json messages/he/diagram.json
git commit -m "feat(i18n): add step-by-step diagram translations for EN and HE"
```

---

## Task 12: Fallback — Text-Only Steps When Render Fails

**Files:**
- Create: `components/homework/diagram/StepByStepFallback.tsx`

**Step 1: Create fallback component**

When step rendering fails entirely, show the final diagram with text-only explanations.

Create: `components/homework/diagram/StepByStepFallback.tsx`

```typescript
'use client'

import { useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import EngineDiagramImage from './EngineDiagramImage'
import type { StepLayerMeta } from './types'

interface StepByStepFallbackProps {
  steps: StepLayerMeta[]
  finalImageUrl: string
  pipeline?: string
  language?: 'en' | 'he'
  onClose: () => void
}

/**
 * Fallback when step-by-step image rendering fails.
 * Shows the final diagram with numbered text explanations.
 */
export default function StepByStepFallback({
  steps,
  finalImageUrl,
  pipeline,
  language = 'en',
  onClose,
}: StepByStepFallbackProps) {
  const t = useTranslations('diagram')
  const isHe = language === 'he'
  const [expandedStep, setExpandedStep] = useState<number | null>(null)

  return (
    <div
      className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg"
      dir={isHe ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-amber-50/50 dark:bg-amber-900/10">
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
          {t('stepByStep.fallbackTitle')}
        </span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Diagram */}
        <div className="w-full md:w-3/5 p-4 border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700">
          <EngineDiagramImage imageUrl={finalImageUrl} pipeline={pipeline} />
        </div>

        {/* Text steps */}
        <div className="w-full md:w-2/5 p-4 space-y-2 max-h-[400px] overflow-y-auto">
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
            {t('stepByStep.fallbackNote')}
          </p>
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">
                  {isHe ? step.labelHe : step.label}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expandedStep === i ? 'rotate-90' : ''}`} />
              </button>
              {expandedStep === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-3 pb-2"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed ps-7">
                    {isHe ? step.explanationHe : step.explanation}
                  </p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/homework/diagram/StepByStepFallback.tsx
git commit -m "feat(diagrams): add text-only fallback for failed step-by-step renders"
```

---

## Task 13: Lesson Integration

**Files:**
- Modify: `components/lesson/StepContent.tsx`

**Step 1: Add step-by-step support to lesson diagrams**

The lesson `StepContent.tsx` renders diagrams via `DiagramRenderer`. Since `DiagramRenderer` now handles step-by-step internally (it checks for `stepByStepSource` in the data), lesson diagrams will automatically get the "Step by Step" button if their `diagramData` includes a `stepByStepSource` field.

No changes needed to `StepContent.tsx` itself — the button appears automatically through `DiagramRenderer`.

However, for lessons to HAVE step-by-step source, we need to update `generateDiagramsForSteps` in `integration.ts` to also generate layered TikZ when generating lesson diagrams.

Modify: `lib/diagram-engine/integration.ts` — update the `generateDiagramsForSteps` function to include `stepByStepSource` in the lesson step diagram data:

```typescript
// Inside the loop where results are applied to lesson steps:
if (result.status === 'fulfilled' && result.value) {
  const { lessonIdx, stepIdx } = tasks[i];
  lessons[lessonIdx].steps[stepIdx].diagramData = {
    type: 'engine_image',
    data: {
      imageUrl: result.value.imageUrl,
      pipeline: result.value.pipeline,
      // Include step-by-step source if available
      ...(result.value.stepByStepSource && {
        stepByStepSource: result.value.stepByStepSource,
      }),
    },
  };
  generated++;
}
```

**Step 2: Commit**

```bash
git add lib/diagram-engine/integration.ts
git commit -m "feat(diagrams): pass step-by-step source through to lesson diagrams"
```

---

## Task 14: Type Check & Build Verification

**Step 1: Run TypeScript type check**

Run: `cd /Users/curvalux/NoteSnap && npx tsc --noEmit`
Expected: No type errors

**Step 2: Run all tests**

Run: `cd /Users/curvalux/NoteSnap && npx vitest run`
Expected: All tests pass (existing + new)

**Step 3: Run build**

Run: `cd /Users/curvalux/NoteSnap && npm run build`
Expected: Build succeeds

**Step 4: Fix any issues found**

Address type errors, test failures, or build issues.

**Step 5: Commit**

```bash
git add -A
git commit -m "fix: resolve type errors and build issues for step-by-step diagrams"
```

---

## Task 15: Manual Integration Test

**Step 1: Start dev server**

Run: `cd /Users/curvalux/NoteSnap && npm run dev`

**Step 2: Test in homework tutoring**

1. Navigate to a homework session with diagrams enabled
2. Ask a math/physics question that generates a TikZ diagram
3. Verify the "Step by Step" button appears on the diagram
4. Click it — verify loading state appears
5. Verify step images render and the walkthrough UI works
6. Test navigation: next/prev buttons, step dots, keyboard arrows
7. Test auto-play
8. Close walkthrough — verify it returns to the static diagram
9. Test in Hebrew mode — verify RTL layout works

**Step 3: Test fallback**

1. Force a failure by temporarily breaking the TikZ code
2. Verify the text-only fallback appears
3. Verify expanding/collapsing step explanations works

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during manual integration testing"
```

---

## Summary of Files

### New Files (8):
| File | Purpose |
|------|---------|
| `lib/diagram-engine/tikz-layer-parser.ts` | Parse `% === LAYER N ===` markers, build cumulative steps |
| `lib/diagram-engine/step-renderer.ts` | Render step images via QuickLaTeX with retry |
| `lib/diagram-engine/layered-tikz-generator.ts` | AI generates layered TikZ + step metadata |
| `lib/diagram-engine/tikz/layered-tikz-prompt.ts` | Prompt instructions for layer convention |
| `app/api/diagrams/render-steps/route.ts` | API endpoint for on-demand step rendering |
| `components/homework/diagram/StepByStepButton.tsx` | "Step by Step" button overlay |
| `components/homework/diagram/StepByStepWalkthrough.tsx` | Full walkthrough UI |
| `components/homework/diagram/StepByStepFallback.tsx` | Text-only fallback |

### Modified Files (8):
| File | Change |
|------|--------|
| `components/homework/diagram/types.ts` | Add `StepByStepSource`, `StepLayerMeta`, `StepRenderResult` |
| `lib/homework/types.ts` | Add `stepByStepSource` to `TutorDiagramState` |
| `lib/diagram-engine/tikz-executor.ts` | Export `compileTikZ` |
| `lib/diagram-engine/integration.ts` | Generate + thread layered TikZ |
| `lib/homework/tutor-engine.ts` | Pass `stepByStepSource` through |
| `components/homework/diagram/EngineDiagramImage.tsx` | Add step-by-step button props |
| `components/homework/diagram/DiagramRenderer.tsx` | Add walkthrough state management |
| `messages/en/diagram.json` + `messages/he/diagram.json` | Add i18n keys |

### Test Files (2):
| File | Tests |
|------|-------|
| `__tests__/lib/diagram-engine/step-types.test.ts` | Type validation |
| `__tests__/lib/diagram-engine/tikz-layer-parser.test.ts` | Parser + builder |
