# Step-Capture Pipeline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pre-render step-by-step diagram images during diagram generation (not on-demand) so the frontend gets instant walkthroughs.

**Architecture:** AI generates code with `STEP N` markers → compile at each cumulative checkpoint → upload step PNGs to Supabase Storage → embed URLs in `DiagramResult` → frontend loads pre-saved images instantly.

**Tech Stack:** TypeScript, Supabase Storage, E2B Sandbox, QuickLaTeX API, Next.js 14, React

**Design doc:** `docs/plans/2026-03-05-step-capture-pipeline-design.md`

---

## Task 1: Add StepImage Type and Extend DiagramResult

**Files:**
- Modify: `components/homework/diagram/types.ts`
- Modify: `lib/diagram-engine/index.ts:21-29`

**Step 1: Add StepImage interface to types.ts**

In `components/homework/diagram/types.ts`, add after `StepRenderResult` (line 80):

```typescript
/** Pre-rendered step image with bilingual metadata (saved to Supabase Storage during generation) */
export interface StepImage {
  /** Supabase Storage public URL */
  url: string
  /** Short label (EN) */
  label: string
  /** Short label (HE) */
  labelHe: string
  /** Pedagogical explanation (EN) */
  explanation: string
  /** Pedagogical explanation (HE) */
  explanationHe: string
}
```

**Step 2: Extend DiagramResult in index.ts**

In `lib/diagram-engine/index.ts`, add `stepImages` to the `DiagramResult` interface (line 21-29):

```typescript
export interface DiagramResult {
  imageUrl: string;
  pipeline: Pipeline;
  attempts: number;
  code?: string;
  overlay?: OverlayLabel[];
  qaVerdict?: string;
  smartPipeline?: { computeUsed: boolean; computeTimeMs?: number; attempts?: number };
  /** Pre-rendered step images from step-capture pipeline */
  stepImages?: import('@/components/homework/diagram/types').StepImage[];
}
```

**Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors (new optional field, nothing breaks)

**Step 4: Commit**

```bash
git add components/homework/diagram/types.ts lib/diagram-engine/index.ts
git commit -m "feat(step-capture): add StepImage type and extend DiagramResult"
```

---

## Task 2: Create Supabase Storage Upload Utility

**Files:**
- Create: `lib/diagram-engine/step-capture/upload-steps.ts`

**Step 1: Write the test**

Create `__tests__/lib/diagram-engine/step-capture/upload-steps.test.ts`:

```typescript
import { uploadStepImages, generateDiagramHash } from '@/lib/diagram-engine/step-capture/upload-steps'

// Mock Supabase
const mockUpload = jest.fn()
const mockGetPublicUrl = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    storage: {
      from: jest.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  }),
}))

beforeEach(() => {
  mockUpload.mockReset()
  mockGetPublicUrl.mockReset()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('generateDiagramHash', () => {
  it('returns a short hex string', () => {
    const hash = generateDiagramHash('some question', 'tikz')
    expect(hash).toMatch(/^[a-f0-9]{12}$/)
  })

  it('same input produces same hash', () => {
    const a = generateDiagramHash('force diagram', 'tikz')
    const b = generateDiagramHash('force diagram', 'tikz')
    expect(a).toBe(b)
  })

  it('different input produces different hash', () => {
    const a = generateDiagramHash('force diagram', 'tikz')
    const b = generateDiagramHash('graph y=x^2', 'matplotlib')
    expect(a).not.toBe(b)
  })
})

describe('uploadStepImages', () => {
  it('uploads N buffers and returns N URLs', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'test/path' }, error: null })
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/test/path' },
    })

    const buffers = [
      Buffer.from('fake-png-1'),
      Buffer.from('fake-png-2'),
      Buffer.from('fake-png-3'),
    ]

    const urls = await uploadStepImages(buffers, 'user_123', 'abc123')
    expect(urls).toHaveLength(3)
    expect(urls[0]).toBe('https://storage.example.com/test/path')
    expect(mockUpload).toHaveBeenCalledTimes(3)
  })

  it('returns null for failed uploads', async () => {
    mockUpload
      .mockResolvedValueOnce({ data: { path: 'ok' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'quota exceeded' } })

    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://storage.example.com/ok' },
    })

    const buffers = [Buffer.from('a'), Buffer.from('b')]
    const urls = await uploadStepImages(buffers, 'user_123', 'abc123')
    expect(urls).toHaveLength(2)
    expect(urls[0]).toBe('https://storage.example.com/ok')
    expect(urls[1]).toBeNull()
  })

  it('returns all null on complete failure', async () => {
    mockUpload.mockResolvedValue({ data: null, error: { message: 'down' } })

    const urls = await uploadStepImages([Buffer.from('a')], 'user_123', 'hash')
    expect(urls).toEqual([null])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/diagram-engine/step-capture/upload-steps.test.ts --no-coverage`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `lib/diagram-engine/step-capture/upload-steps.ts`:

```typescript
/**
 * Upload pre-rendered step images to Supabase Storage.
 *
 * Bucket: diagram-steps
 * Path: {userId}/{diagramHash}/step_{N}.png
 *
 * All uploads run in parallel. Individual failures return null URL
 * (the step is skipped in the frontend walkthrough).
 */

import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'diagram-steps'

/**
 * Generate a short deterministic hash for a diagram (used as folder name).
 * Combines question text + pipeline to make it unique per generation context.
 */
export function generateDiagramHash(question: string, pipeline: string): string {
  return createHash('sha256')
    .update(`${question}::${pipeline}`)
    .digest('hex')
    .slice(0, 12)
}

/**
 * Upload step image buffers to Supabase Storage.
 *
 * @param buffers - PNG image buffers (one per step, in order)
 * @param userId - User ID for storage path
 * @param diagramHash - Short hash for grouping step images
 * @returns Array of public URLs (null for failed uploads)
 */
export async function uploadStepImages(
  buffers: Buffer[],
  userId: string,
  diagramHash: string,
): Promise<(string | null)[]> {
  const supabase = await createClient()

  const uploadPromises = buffers.map(async (buffer, index) => {
    const storagePath = `${userId}/${diagramHash}/step_${index + 1}.png`

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType: 'image/png',
          cacheControl: '86400', // 24 hours
          upsert: true,          // Allow re-generation overwrites
        })

      if (error || !data) {
        console.warn(`[StepCapture] Failed to upload step ${index + 1}:`, error?.message)
        return null
      }

      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(data.path)

      return urlData.publicUrl
    } catch (err) {
      console.error(`[StepCapture] Upload error step ${index + 1}:`, err)
      return null
    }
  })

  return Promise.all(uploadPromises)
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/diagram-engine/step-capture/upload-steps.test.ts --no-coverage`
Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add lib/diagram-engine/step-capture/upload-steps.ts __tests__/lib/diagram-engine/step-capture/upload-steps.test.ts
git commit -m "feat(step-capture): add Supabase Storage upload utility for step images"
```

---

## Task 3: Create TikZ Step Capture

Reuses existing `parseTikzLayers()` + `buildCumulativeStep()` from `tikz-layer-parser.ts` and `compileTikZ()` from `tikz-executor.ts`. Compiles each cumulative step in parallel and returns PNG buffers.

**Files:**
- Create: `lib/diagram-engine/step-capture/tikz-steps.ts`

**Step 1: Write the test**

Create `__tests__/lib/diagram-engine/step-capture/tikz-steps.test.ts`:

```typescript
import { captureTikzSteps } from '@/lib/diagram-engine/step-capture/tikz-steps'

// Mock tikz-executor
const mockCompileTikZ = jest.fn()
jest.mock('@/lib/diagram-engine/tikz-executor', () => ({
  compileTikZ: (...args: unknown[]) => mockCompileTikZ(...args),
}))

beforeEach(() => {
  mockCompileTikZ.mockReset()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

const SAMPLE_TIKZ = `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% === STEP 1: Draw the object ===
\\draw[thick] (0,0) rectangle (2,1);
% === STEP 2: Weight force ===
\\draw[-{Stealth},red] (1,0) -- (1,-1.5) node[below] {$mg$};
% === STEP 3: Normal force ===
\\draw[-{Stealth},blue] (1,1) -- (1,2.5) node[above] {$N$};
\\end{tikzpicture}`

describe('captureTikzSteps', () => {
  it('compiles N cumulative steps and returns buffers', async () => {
    // Mock QuickLaTeX returning URLs
    mockCompileTikZ.mockResolvedValue({ url: 'https://quicklatex.com/fake.png' })

    // Mock fetch for downloading the images
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(Buffer.from('fake-png-data'), { status: 200 })
    )

    const result = await captureTikzSteps(SAMPLE_TIKZ)

    expect(result.buffers).toHaveLength(3)
    expect(result.buffers[0]).toBeInstanceOf(Buffer)
    expect(mockCompileTikZ).toHaveBeenCalledTimes(3)
    // Step 1 TikZ should contain rectangle but not $mg$
    const firstCallArg = mockCompileTikZ.mock.calls[0][0] as string
    expect(firstCallArg).toContain('rectangle')
    expect(firstCallArg).not.toContain('$mg$')

    mockFetch.mockRestore()
  })

  it('returns null buffer for failed step compilations', async () => {
    mockCompileTikZ
      .mockResolvedValueOnce({ url: 'https://quicklatex.com/ok.png' })
      .mockResolvedValueOnce({ error: 'syntax error' })
      .mockResolvedValueOnce({ url: 'https://quicklatex.com/ok2.png' })

    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(Buffer.from('png'), { status: 200 })
    )

    const result = await captureTikzSteps(SAMPLE_TIKZ)

    expect(result.buffers).toHaveLength(3)
    expect(result.buffers[0]).toBeInstanceOf(Buffer)
    expect(result.buffers[1]).toBeNull()
    expect(result.buffers[2]).toBeInstanceOf(Buffer)

    mockFetch.mockRestore()
  })

  it('returns empty buffers for code with no step markers', async () => {
    const noSteps = `\\begin{tikzpicture}
\\draw (0,0) -- (1,1);
\\end{tikzpicture}`

    const result = await captureTikzSteps(noSteps)
    // No step markers → single implicit layer → only 1 step = no walkthrough value
    expect(result.buffers.length).toBeLessThanOrEqual(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/diagram-engine/step-capture/tikz-steps.test.ts --no-coverage`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `lib/diagram-engine/step-capture/tikz-steps.ts`:

```typescript
/**
 * TikZ Step Capture
 *
 * Parses TikZ code with STEP markers, compiles each cumulative subset
 * via QuickLaTeX, and returns PNG buffers for each step.
 *
 * Reuses existing tikz-layer-parser for parsing (STEP markers use same
 * regex pattern as LAYER markers — the parser is marker-name-agnostic
 * after normalization).
 */

import { parseTikzLayers, buildCumulativeStep } from '../tikz-layer-parser'
import { compileTikZ } from '../tikz-executor'

const MAX_CONCURRENT = 3

interface TikzStepResult {
  /** PNG buffers for each step (null = compilation failed) */
  buffers: (Buffer | null)[]
}

/**
 * Compile each cumulative TikZ step and return PNG buffers.
 *
 * Note: The tikz-layer-parser recognizes both `% === LAYER N` and
 * `% === STEP N` markers (we normalize STEP→LAYER before parsing).
 */
export async function captureTikzSteps(tikzCode: string): Promise<TikzStepResult> {
  // Normalize STEP markers to LAYER markers for the parser
  const normalized = tikzCode.replace(
    /^(%\s*===\s*)STEP(\s+\d+)/gm,
    '$1LAYER$2',
  )

  const parsed = parseTikzLayers(normalized)

  // Filter out layer 0 (setup) — it's always included in cumulative builds
  const stepsToRender = parsed.layers.filter(l => l.layerNumber > 0)

  if (stepsToRender.length <= 0) {
    return { buffers: [] }
  }

  // Compile each cumulative step
  const compileSingleStep = async (
    stepNumber: number,
  ): Promise<Buffer | null> => {
    const stepTikz = buildCumulativeStep(parsed, stepNumber)

    try {
      const result = await compileTikZ(stepTikz)

      if ('error' in result) {
        console.warn(`[TikzSteps] Step ${stepNumber} compile failed:`, result.error.slice(0, 200))
        return null
      }

      // Download the image from QuickLaTeX URL
      const response = await fetch(result.url)
      if (!response.ok) {
        console.warn(`[TikzSteps] Step ${stepNumber} download failed: ${response.status}`)
        return null
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (err) {
      console.error(`[TikzSteps] Step ${stepNumber} error:`, err)
      return null
    }
  }

  // Process in batches of MAX_CONCURRENT
  const buffers: (Buffer | null)[] = []

  for (let i = 0; i < stepsToRender.length; i += MAX_CONCURRENT) {
    const batch = stepsToRender.slice(i, i + MAX_CONCURRENT)
    const batchResults = await Promise.all(
      batch.map(layer => compileSingleStep(layer.layerNumber)),
    )
    buffers.push(...batchResults)
  }

  console.log(`[TikzSteps] Captured ${buffers.filter(Boolean).length}/${stepsToRender.length} steps`)
  return { buffers }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/diagram-engine/step-capture/tikz-steps.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/diagram-engine/step-capture/tikz-steps.ts __tests__/lib/diagram-engine/step-capture/tikz-steps.test.ts
git commit -m "feat(step-capture): add TikZ step capture via cumulative QuickLaTeX compilation"
```

---

## Task 4: Create Matplotlib Step Capture

Injects `plt.savefig()` calls after each STEP marker, executes once in E2B sandbox, extracts all step PNGs from the sandbox filesystem.

**Files:**
- Create: `lib/diagram-engine/step-capture/matplotlib-steps.ts`

**Step 1: Write the test**

Create `__tests__/lib/diagram-engine/step-capture/matplotlib-steps.test.ts`:

```typescript
import {
  injectSaveFigCalls,
  parseStepMarkers,
} from '@/lib/diagram-engine/step-capture/matplotlib-steps'

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

const SAMPLE_PYTHON = `import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(10,8))

# === STEP 1: Set up axes ===
ax.set_xlabel('x')
ax.set_ylabel('y')
ax.grid(True)

# === STEP 2: Plot the curve ===
x = np.linspace(-2, 6, 300)
ax.plot(x, x**2 - 4*x + 3, 'b-', linewidth=2)

# === STEP 3: Mark key points ===
ax.plot(2, -1, 'ro', markersize=10)

plt.savefig('diagram.png', dpi=150, bbox_inches='tight')
`

describe('parseStepMarkers', () => {
  it('finds all STEP markers with descriptions', () => {
    const markers = parseStepMarkers(SAMPLE_PYTHON)
    expect(markers).toHaveLength(3)
    expect(markers[0]).toEqual({ step: 1, description: 'Set up axes', line: 5 })
    expect(markers[1]).toEqual({ step: 2, description: 'Plot the curve', line: 9 })
    expect(markers[2]).toEqual({ step: 3, description: 'Mark key points', line: 13 })
  })

  it('returns empty for code without markers', () => {
    const markers = parseStepMarkers('import matplotlib\nplt.plot([1,2,3])\n')
    expect(markers).toHaveLength(0)
  })
})

describe('injectSaveFigCalls', () => {
  it('inserts plt.savefig after each STEP marker block', () => {
    const result = injectSaveFigCalls(SAMPLE_PYTHON)
    expect(result).toContain("plt.savefig('/tmp/step_1.png'")
    expect(result).toContain("plt.savefig('/tmp/step_2.png'")
    expect(result).toContain("plt.savefig('/tmp/step_3.png'")
  })

  it('preserves all original code', () => {
    const result = injectSaveFigCalls(SAMPLE_PYTHON)
    expect(result).toContain('ax.set_xlabel')
    expect(result).toContain('np.linspace')
    expect(result).toContain('ax.plot(2, -1')
  })

  it('places savefig before next STEP marker (not at end of line)', () => {
    const result = injectSaveFigCalls(SAMPLE_PYTHON)
    const lines = result.split('\n')
    // Find the savefig for step 1 — it should appear BEFORE the STEP 2 marker
    const saveFig1Line = lines.findIndex(l => l.includes("step_1.png"))
    const step2Line = lines.findIndex(l => l.includes('STEP 2'))
    expect(saveFig1Line).toBeLessThan(step2Line)
  })

  it('returns code unchanged if no markers', () => {
    const plain = 'import matplotlib\nplt.plot([1,2,3])\n'
    expect(injectSaveFigCalls(plain)).toBe(plain)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/diagram-engine/step-capture/matplotlib-steps.test.ts --no-coverage`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `lib/diagram-engine/step-capture/matplotlib-steps.ts`:

```typescript
/**
 * Matplotlib Step Capture
 *
 * Parses Python/matplotlib code with `# === STEP N: Description ===` markers,
 * injects `plt.savefig()` calls after each step block, and executes once in
 * E2B sandbox. All step PNGs are produced in a single run.
 */

import { Sandbox } from '@e2b/code-interpreter'

const STEP_REGEX = /^#\s*===\s*STEP\s+(\d+)\s*:\s*(.+?)\s*===\s*$/

export interface StepMarker {
  step: number
  description: string
  /** 0-indexed line number in original code */
  line: number
}

/**
 * Find all STEP markers in Python code.
 */
export function parseStepMarkers(code: string): StepMarker[] {
  const lines = code.split('\n')
  const markers: StepMarker[] = []

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(STEP_REGEX)
    if (match) {
      markers.push({
        step: parseInt(match[1], 10),
        description: match[2].trim(),
        line: i,
      })
    }
  }

  return markers
}

/**
 * Inject `plt.savefig('/tmp/step_N.png', ...)` calls into Python code.
 *
 * Each savefig is placed just before the NEXT step marker (capturing everything
 * the current step added). The last step's savefig goes before the original
 * `plt.savefig('diagram.png')` or at the end of the file.
 */
export function injectSaveFigCalls(code: string): string {
  const markers = parseStepMarkers(code)
  if (markers.length === 0) return code

  const lines = code.split('\n')
  const injections: Array<{ beforeLine: number; savefig: string }> = []

  for (let i = 0; i < markers.length; i++) {
    const savefig = `plt.savefig('/tmp/step_${markers[i].step}.png', dpi=150, bbox_inches='tight', facecolor='white')`

    if (i < markers.length - 1) {
      // Insert before the NEXT step marker
      injections.push({ beforeLine: markers[i + 1].line, savefig })
    } else {
      // Last step: insert before the original plt.savefig or at end
      const origSavefigLine = lines.findIndex(
        (l, idx) => idx > markers[i].line && /plt\.savefig\s*\(/.test(l),
      )
      if (origSavefigLine !== -1) {
        injections.push({ beforeLine: origSavefigLine, savefig })
      } else {
        injections.push({ beforeLine: lines.length, savefig })
      }
    }
  }

  // Apply injections in reverse order (so line numbers stay valid)
  const result = [...lines]
  for (const inj of injections.sort((a, b) => b.beforeLine - a.beforeLine)) {
    result.splice(inj.beforeLine, 0, inj.savefig)
  }

  return result.join('\n')
}

/**
 * Execute matplotlib code with injected savefig calls in E2B sandbox.
 * Returns PNG buffers for each step.
 */
export async function captureMatplotlibSteps(
  code: string,
): Promise<{ buffers: (Buffer | null)[]; markers: StepMarker[] }> {
  const markers = parseStepMarkers(code)
  if (markers.length === 0) {
    return { buffers: [], markers: [] }
  }

  const injectedCode = injectSaveFigCalls(code)

  const LATEX_TEMPLATE_ID = process.env.E2B_LATEX_TEMPLATE_ID || undefined
  const sandbox = LATEX_TEMPLATE_ID
    ? await Sandbox.create(LATEX_TEMPLATE_ID, { timeoutMs: 120000 })
    : await Sandbox.create()

  try {
    // Write the injected script
    await sandbox.files.write('/tmp/diagram.py', injectedCode)

    // Execute
    const execution = await sandbox.runCode(
      `import subprocess
result = subprocess.run(['python3', '/tmp/diagram.py'], capture_output=True, text=True, timeout=60)
if result.returncode != 0:
    print(f"SCRIPT_ERROR: {result.stderr}")
else:
    print("SCRIPT_OK")

# List step files
import os, glob
step_files = sorted(glob.glob('/tmp/step_*.png'))
print(f"STEP_FILES: {len(step_files)}")
for f in step_files:
    print(f"STEP_FILE: {f} SIZE: {os.path.getsize(f)}")`,
      { timeoutMs: 60000 },
    )

    if (execution.error) {
      console.error('[MatplotlibSteps] Execution error:', execution.error.value)
      return { buffers: markers.map(() => null), markers }
    }

    const stdout = execution.logs.stdout.join('')
    if (stdout.includes('SCRIPT_ERROR:')) {
      console.error('[MatplotlibSteps] Script error:', stdout.split('SCRIPT_ERROR:')[1]?.slice(0, 500))
      return { buffers: markers.map(() => null), markers }
    }

    // Read each step PNG from sandbox
    const buffers: (Buffer | null)[] = []
    for (const marker of markers) {
      const filePath = `/tmp/step_${marker.step}.png`
      try {
        const content = await sandbox.files.read(filePath)
        if (content) {
          const buffer = typeof content === 'string'
            ? Buffer.from(content, 'binary')
            : Buffer.from(content)
          buffers.push(buffer)
        } else {
          console.warn(`[MatplotlibSteps] Step ${marker.step} file not found`)
          buffers.push(null)
        }
      } catch {
        console.warn(`[MatplotlibSteps] Failed to read step ${marker.step}`)
        buffers.push(null)
      }
    }

    console.log(`[MatplotlibSteps] Captured ${buffers.filter(Boolean).length}/${markers.length} steps`)
    return { buffers, markers }
  } finally {
    await sandbox.kill()
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/diagram-engine/step-capture/matplotlib-steps.test.ts --no-coverage`
Expected: PASS (parseStepMarkers and injectSaveFigCalls tests pass; sandbox tests skipped via mock)

**Step 5: Commit**

```bash
git add lib/diagram-engine/step-capture/matplotlib-steps.ts __tests__/lib/diagram-engine/step-capture/matplotlib-steps.test.ts
git commit -m "feat(step-capture): add matplotlib step capture with savefig injection"
```

---

## Task 5: Create LaTeX Step Capture

Parses LaTeX code with STEP markers, builds cumulative subsets, compiles each in E2B sandbox.

**Files:**
- Create: `lib/diagram-engine/step-capture/latex-steps.ts`

**Step 1: Write the test**

Create `__tests__/lib/diagram-engine/step-capture/latex-steps.test.ts`:

```typescript
import {
  parseLatexStepMarkers,
  buildCumulativeLatexStep,
} from '@/lib/diagram-engine/step-capture/latex-steps'

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

const SAMPLE_LATEX = `\\documentclass[border=20pt,varwidth]{standalone}
\\usepackage{amsmath}
\\begin{document}

% === STEP 1: Write the equation ===
\\begin{align}
2x + 5 &= 13
\\end{align}

% === STEP 2: Subtract 5 ===
\\begin{align}
2x + 5 &= 13 \\\\
2x &= 8
\\end{align}

% === STEP 3: Solve for x ===
\\begin{align}
2x + 5 &= 13 \\\\
2x &= 8 \\\\
x &= \\boxed{4}
\\end{align}

\\end{document}`

describe('parseLatexStepMarkers', () => {
  it('finds all STEP markers', () => {
    const markers = parseLatexStepMarkers(SAMPLE_LATEX)
    expect(markers).toHaveLength(3)
    expect(markers[0]).toEqual({ step: 1, description: 'Write the equation', line: expect.any(Number) })
    expect(markers[2].description).toBe('Solve for x')
  })
})

describe('buildCumulativeLatexStep', () => {
  it('step 1 includes only first step content', () => {
    const markers = parseLatexStepMarkers(SAMPLE_LATEX)
    const step1 = buildCumulativeLatexStep(SAMPLE_LATEX, markers, 1)
    expect(step1).toContain('\\documentclass')
    expect(step1).toContain('\\begin{document}')
    expect(step1).toContain('2x + 5 &= 13')
    expect(step1).not.toContain('2x &= 8')
    expect(step1).toContain('\\end{document}')
  })

  it('step 2 includes steps 1 and 2', () => {
    const markers = parseLatexStepMarkers(SAMPLE_LATEX)
    const step2 = buildCumulativeLatexStep(SAMPLE_LATEX, markers, 2)
    expect(step2).toContain('2x + 5 &= 13')
    expect(step2).toContain('2x &= 8')
    expect(step2).not.toContain('\\boxed{4}')
  })

  it('final step includes everything', () => {
    const markers = parseLatexStepMarkers(SAMPLE_LATEX)
    const step3 = buildCumulativeLatexStep(SAMPLE_LATEX, markers, 3)
    expect(step3).toContain('\\boxed{4}')
  })

  it('preserves preamble in all steps', () => {
    const markers = parseLatexStepMarkers(SAMPLE_LATEX)
    const step1 = buildCumulativeLatexStep(SAMPLE_LATEX, markers, 1)
    expect(step1).toContain('\\usepackage{amsmath}')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/diagram-engine/step-capture/latex-steps.test.ts --no-coverage`
Expected: FAIL

**Step 3: Write the implementation**

Create `lib/diagram-engine/step-capture/latex-steps.ts`:

```typescript
/**
 * LaTeX Step Capture
 *
 * Parses LaTeX documents with `% === STEP N: Description ===` markers,
 * builds cumulative subsets (preamble + steps 1..N), and compiles each
 * in E2B sandbox to produce step PNG images.
 */

import { Sandbox } from '@e2b/code-interpreter'

const STEP_REGEX = /^%\s*===\s*STEP\s+(\d+)\s*:\s*(.+?)\s*===\s*$/
const LATEX_TEMPLATE_ID = process.env.E2B_LATEX_TEMPLATE_ID || undefined

export interface LatexStepMarker {
  step: number
  description: string
  line: number
}

/**
 * Find all STEP markers in LaTeX code.
 */
export function parseLatexStepMarkers(code: string): LatexStepMarker[] {
  const lines = code.split('\n')
  const markers: LatexStepMarker[] = []

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(STEP_REGEX)
    if (match) {
      markers.push({
        step: parseInt(match[1], 10),
        description: match[2].trim(),
        line: i,
      })
    }
  }

  return markers
}

/**
 * Build a cumulative LaTeX document containing steps 1 through stepNumber.
 *
 * Strategy:
 * - Everything before the first STEP marker = preamble (always included)
 * - Content between STEP N and STEP N+1 = step N's content
 * - Content after last STEP marker up to \end{document} = last step's content
 * - Reconstructs: preamble + steps 1..stepNumber + \end{document}
 */
export function buildCumulativeLatexStep(
  fullCode: string,
  markers: LatexStepMarker[],
  stepNumber: number,
): string {
  const lines = fullCode.split('\n')

  // Find preamble (everything before first STEP marker)
  const firstMarkerLine = markers[0].line
  const preamble = lines.slice(0, firstMarkerLine).join('\n')

  // Find step content blocks
  const stepBlocks: string[] = []
  for (let i = 0; i < markers.length; i++) {
    const startLine = markers[i].line + 1 // Skip the marker line itself
    const endLine = i < markers.length - 1
      ? markers[i + 1].line
      : lines.findIndex((l, idx) => idx > startLine && l.trim() === '\\end{document}')

    const blockEnd = endLine !== -1 ? endLine : lines.length
    const block = lines.slice(startLine, blockEnd).join('\n').trim()
    stepBlocks.push(block)
  }

  // Build cumulative: preamble + steps 1..stepNumber
  const includedSteps = stepBlocks.slice(0, stepNumber)
  const lastStep = includedSteps[includedSteps.length - 1]

  // The cumulative content is just the LAST step's content (since LaTeX steps
  // are inherently cumulative in the design — step 2 repeats step 1's equations)
  return `${preamble}\n\n${lastStep}\n\n\\end{document}`
}

/**
 * Compile each cumulative LaTeX step in E2B sandbox and return PNG buffers.
 */
export async function captureLatexSteps(
  code: string,
): Promise<{ buffers: (Buffer | null)[]; markers: LatexStepMarker[] }> {
  const markers = parseLatexStepMarkers(code)
  if (markers.length === 0) {
    return { buffers: [], markers: [] }
  }

  if (!LATEX_TEMPLATE_ID) {
    console.warn('[LatexSteps] E2B_LATEX_TEMPLATE_ID not set')
    return { buffers: markers.map(() => null), markers }
  }

  const sandbox = await Sandbox.create(LATEX_TEMPLATE_ID, { timeoutMs: 120000 })
  try {
    // Wait for sandbox
    await sandbox.runCode('print("ready")', { timeoutMs: 30000 })

    const buffers: (Buffer | null)[] = []

    for (let i = 0; i < markers.length; i++) {
      const stepCode = buildCumulativeLatexStep(code, markers, markers[i].step)
      const filename = `step_${markers[i].step}`

      try {
        // Write LaTeX file
        await sandbox.files.write(`/tmp/${filename}.tex`, stepCode)

        // Compile
        const compileResult = await sandbox.runCode(
          `import subprocess, os
os.chdir('/tmp')
result = subprocess.run(
    ['pdflatex', '-interaction=nonstopmode', '-halt-on-error', '${filename}.tex'],
    capture_output=True, text=True, timeout=30
)
if result.returncode != 0:
    lines = result.stdout.split('\\n')
    error_lines = [l for l in lines if l.startswith('!') or 'Error' in l]
    print(f"LATEX_ERROR: {'\\n'.join(error_lines[:10])}")
else:
    print("COMPILE_OK")`,
          { timeoutMs: 30000 },
        )

        const compileOutput = compileResult.logs.stdout.join('')
        if (compileOutput.includes('LATEX_ERROR:')) {
          console.warn(`[LatexSteps] Step ${markers[i].step} compile failed`)
          buffers.push(null)
          continue
        }

        // Convert to PNG
        const convertResult = await sandbox.runCode(
          `import subprocess
from IPython.display import Image, display
result = subprocess.run([
    'convert', '-density', '300', '-quality', '100',
    '-background', 'white', '-alpha', 'remove',
    '-trim', '+repage',
    '/tmp/${filename}.pdf', '/tmp/${filename}.png'
], capture_output=True, text=True, timeout=30)
if result.returncode != 0:
    print(f"CONVERT_ERROR: {result.stderr}")
else:
    display(Image(filename='/tmp/${filename}.png'))`,
          { timeoutMs: 30000 },
        )

        // Extract PNG from IPython display
        let captured = false
        for (const res of convertResult.results) {
          if (res.png) {
            buffers.push(Buffer.from(res.png, 'base64'))
            captured = true
            break
          }
        }

        if (!captured) {
          console.warn(`[LatexSteps] Step ${markers[i].step} no PNG captured`)
          buffers.push(null)
        }
      } catch (err) {
        console.error(`[LatexSteps] Step ${markers[i].step} error:`, err)
        buffers.push(null)
      }
    }

    console.log(`[LatexSteps] Captured ${buffers.filter(Boolean).length}/${markers.length} steps`)
    return { buffers, markers }
  } finally {
    await sandbox.kill()
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/diagram-engine/step-capture/latex-steps.test.ts --no-coverage`
Expected: PASS (parser and builder tests pass)

**Step 5: Commit**

```bash
git add lib/diagram-engine/step-capture/latex-steps.ts __tests__/lib/diagram-engine/step-capture/latex-steps.test.ts
git commit -m "feat(step-capture): add LaTeX step capture with cumulative compilation"
```

---

## Task 6: Create Step Metadata Parser

Extracts step metadata JSON from AI response (labels + explanations in EN/HE).

**Files:**
- Create: `lib/diagram-engine/step-capture/parse-metadata.ts`

**Step 1: Write the test**

Create `__tests__/lib/diagram-engine/step-capture/parse-metadata.test.ts`:

```typescript
import { parseStepMetadata } from '@/lib/diagram-engine/step-capture/parse-metadata'

describe('parseStepMetadata', () => {
  it('parses valid JSON block from AI response', () => {
    const response = `Here is your code...

\`\`\`json
{ "steps": [
  { "step": 1, "label": "Draw the object", "labelHe": "ציור העצם", "explanation": "We start by...", "explanationHe": "מתחילים ב..." },
  { "step": 2, "label": "Add weight", "labelHe": "הוספת משקל", "explanation": "Next we add...", "explanationHe": "לאחר מכן..." }
]}
\`\`\``

    const result = parseStepMetadata(response)
    expect(result).toHaveLength(2)
    expect(result![0].label).toBe('Draw the object')
    expect(result![1].labelHe).toBe('הוספת משקל')
  })

  it('parses JSON without code fences', () => {
    const response = `{ "steps": [
      { "step": 1, "label": "Setup", "labelHe": "הגדרה", "explanation": "First...", "explanationHe": "ראשית..." }
    ]}`

    const result = parseStepMetadata(response)
    expect(result).toHaveLength(1)
  })

  it('returns null for invalid JSON', () => {
    const result = parseStepMetadata('not json at all')
    expect(result).toBeNull()
  })

  it('returns null for JSON missing required fields', () => {
    const result = parseStepMetadata('{ "steps": [{ "step": 1, "label": "only label" }] }')
    expect(result).toBeNull()
  })

  it('handles steps array at top level', () => {
    const response = `[
      { "step": 1, "label": "A", "labelHe": "א", "explanation": "E", "explanationHe": "ה" }
    ]`
    const result = parseStepMetadata(response)
    expect(result).toHaveLength(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/diagram-engine/step-capture/parse-metadata.test.ts --no-coverage`
Expected: FAIL

**Step 3: Write the implementation**

Create `lib/diagram-engine/step-capture/parse-metadata.ts`:

```typescript
/**
 * Parse step metadata JSON from AI response text.
 *
 * The AI is instructed to output a JSON block at the end of its response:
 * { "steps": [{ "step": 1, "label": "...", "labelHe": "...", "explanation": "...", "explanationHe": "..." }] }
 */

export interface StepMetadataEntry {
  step: number
  label: string
  labelHe: string
  explanation: string
  explanationHe: string
}

/**
 * Extract and validate step metadata from AI response text.
 * Returns null if parsing fails or metadata is invalid.
 */
export function parseStepMetadata(text: string): StepMetadataEntry[] | null {
  try {
    // Strip markdown code fences if present
    let jsonText = text
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim()
    }

    // Try to find a JSON object or array
    const jsonMatch = jsonText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[1])

    // Handle both { "steps": [...] } and direct array
    const steps: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed?.steps

    if (!Array.isArray(steps) || steps.length === 0) return null

    // Validate each entry
    const validated: StepMetadataEntry[] = []
    for (const entry of steps) {
      if (!entry || typeof entry !== 'object') return null
      const e = entry as Record<string, unknown>

      if (
        typeof e.step !== 'number' ||
        typeof e.label !== 'string' ||
        typeof e.labelHe !== 'string' ||
        typeof e.explanation !== 'string' ||
        typeof e.explanationHe !== 'string'
      ) {
        return null
      }

      validated.push({
        step: e.step,
        label: e.label,
        labelHe: e.labelHe,
        explanation: e.explanation,
        explanationHe: e.explanationHe,
      })
    }

    return validated
  } catch {
    return null
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/diagram-engine/step-capture/parse-metadata.test.ts --no-coverage`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/diagram-engine/step-capture/parse-metadata.ts __tests__/lib/diagram-engine/step-capture/parse-metadata.test.ts
git commit -m "feat(step-capture): add step metadata JSON parser"
```

---

## Task 7: Create Step Capture Orchestrator

Main entry point that coordinates: parse markers → capture steps → upload → return StepImage[].

**Files:**
- Create: `lib/diagram-engine/step-capture/index.ts`

**Step 1: Write the implementation**

Create `lib/diagram-engine/step-capture/index.ts`:

```typescript
/**
 * Step Capture Orchestrator
 *
 * Called during diagram generation to pre-render step-by-step images.
 * Coordinates per-pipeline step capture, uploads to Supabase Storage,
 * and returns StepImage[] to embed in DiagramResult.
 *
 * Each pipeline has its own capture strategy:
 * - TikZ: parse STEP markers → compile cumulative subsets via QuickLaTeX
 * - Matplotlib: inject savefig calls → single E2B run → extract N PNGs
 * - LaTeX: parse STEP markers → compile cumulative subsets via E2B
 */

import type { Pipeline } from '../router'
import type { StepImage } from '@/components/homework/diagram/types'
import { captureTikzSteps } from './tikz-steps'
import { captureMatplotlibSteps, parseStepMarkers } from './matplotlib-steps'
import { captureLatexSteps, parseLatexStepMarkers } from './latex-steps'
import { parseStepMetadata, type StepMetadataEntry } from './parse-metadata'
import { uploadStepImages, generateDiagramHash } from './upload-steps'

/** Feature flag — can be disabled via env var */
const STEP_CAPTURE_ENABLED = process.env.STEP_CAPTURE_ENABLED !== 'false'

export interface StepCaptureResult {
  stepImages: StepImage[]
  captureTimeMs: number
}

/**
 * Capture step images from generated diagram code.
 *
 * @param code - The complete code generated by AI (TikZ/Python/LaTeX)
 * @param pipeline - Which pipeline generated the code
 * @param metadataText - AI response text containing step metadata JSON
 * @param userId - User ID for storage paths
 * @param question - Original question (for hash generation)
 * @returns StepImage array (empty on failure, never throws)
 */
export async function captureSteps(
  code: string,
  pipeline: Pipeline,
  metadataText: string,
  userId: string,
  question: string,
): Promise<StepCaptureResult> {
  if (!STEP_CAPTURE_ENABLED) {
    return { stepImages: [], captureTimeMs: 0 }
  }

  const startTime = Date.now()

  try {
    // 1. Parse metadata from AI response
    const metadata = parseStepMetadata(metadataText)
    if (!metadata || metadata.length === 0) {
      console.warn('[StepCapture] No valid metadata found')
      return { stepImages: [], captureTimeMs: Date.now() - startTime }
    }

    // 2. Capture step images based on pipeline
    let buffers: (Buffer | null)[]

    switch (pipeline) {
      case 'tikz': {
        const result = await captureTikzSteps(code)
        buffers = result.buffers
        break
      }
      case 'e2b': {
        // Detect E2B sub-mode: matplotlib vs LaTeX
        const hasStepMarkers = /^#\s*===\s*STEP\s+\d+/m.test(code)
        const hasLatexStepMarkers = /^%\s*===\s*STEP\s+\d+/m.test(code)

        if (hasStepMarkers) {
          const result = await captureMatplotlibSteps(code)
          buffers = result.buffers
        } else if (hasLatexStepMarkers) {
          const result = await captureLatexSteps(code)
          buffers = result.buffers
        } else {
          console.log('[StepCapture] E2B code has no STEP markers')
          return { stepImages: [], captureTimeMs: Date.now() - startTime }
        }
        break
      }
      default:
        // Recraft and other pipelines don't support step capture
        return { stepImages: [], captureTimeMs: Date.now() - startTime }
    }

    if (buffers.length === 0) {
      return { stepImages: [], captureTimeMs: Date.now() - startTime }
    }

    // 3. Upload to Supabase Storage
    const validBuffers = buffers.filter((b): b is Buffer => b !== null)
    if (validBuffers.length === 0) {
      console.warn('[StepCapture] All step compilations failed')
      return { stepImages: [], captureTimeMs: Date.now() - startTime }
    }

    const diagramHash = generateDiagramHash(question, pipeline)
    const urls = await uploadStepImages(validBuffers, userId, diagramHash)

    // 4. Combine URLs with metadata
    const stepImages: StepImage[] = []
    let bufferIdx = 0

    for (let i = 0; i < buffers.length && i < metadata.length; i++) {
      if (buffers[i] !== null) {
        const url = urls[bufferIdx]
        bufferIdx++

        if (url) {
          stepImages.push({
            url,
            label: metadata[i].label,
            labelHe: metadata[i].labelHe,
            explanation: metadata[i].explanation,
            explanationHe: metadata[i].explanationHe,
          })
        }
      }
      // Skip steps where compilation failed — partial is fine
    }

    const captureTimeMs = Date.now() - startTime
    console.log(`[StepCapture] Completed: ${stepImages.length} steps in ${captureTimeMs}ms`)

    return { stepImages, captureTimeMs }
  } catch (err) {
    console.error('[StepCapture] Unexpected error:', err)
    return { stepImages: [], captureTimeMs: Date.now() - startTime }
  }
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors

**Step 3: Commit**

```bash
git add lib/diagram-engine/step-capture/index.ts
git commit -m "feat(step-capture): add orchestrator combining all pipeline captures + upload"
```

---

## Task 8: Add Step Marker Instructions to System Prompts

Add STEP marker instructions to the E2B system prompt (matplotlib + LaTeX modes) and modify the TikZ layered prompt to use STEP instead of LAYER.

**Files:**
- Modify: `lib/diagram-engine/system-prompt.ts`
- Modify: `lib/diagram-engine/tikz/layered-tikz-prompt.ts`

**Step 1: Add step marker instructions to E2B system prompt**

In `lib/diagram-engine/system-prompt.ts`, add before the final backtick of SYSTEM_PROMPT (find the end of the prompt string). Add a new section:

```
STEP-BY-STEP MARKERS — REQUIRED FOR ALL DIAGRAMS:

Structure your code with STEP markers so the diagram can be revealed step-by-step for teaching.

For matplotlib (Python):
# === STEP N: Short description ===

For LaTeX:
% === STEP N: Short description ===

RULES:
1. Place a marker before each logical group of elements.
2. Steps are CUMULATIVE — Step 3 means everything from steps 1+2+3 is visible.
3. Each step ADDS new elements. Never remove elements from previous steps.
4. Aim for 3-6 steps per diagram.
5. Follow TEACHER WHITEBOARD ORDER — build the way a teacher would on a board:

| Topic | Order |
|-------|-------|
| Free Body Diagram | Object → Weight → Normal → Applied → Friction → Net force |
| Inclined Plane | Surface → Object → Weight → Decompose → Normal → Friction |
| Function Graph | Axes + grid → Plot curve → Key points → Labels + legend |
| Projectile Motion | Ground + launch → Trajectory → Velocity vectors → Height/range |
| Circuit | Battery → Main path → Components → Current arrows → Values |
| Geometry | Given shape → Construction lines → Angles/sides → Measurements |
| Equation Solving | Original equation → Each operation → Boxed answer |

After your code, output a JSON block with step metadata:
\`\`\`json
{ "steps": [
  { "step": 1, "label": "Short English label", "labelHe": "תווית קצרה בעברית", "explanation": "What this step shows and why", "explanationHe": "הסבר בעברית" }
]}
\`\`\`
```

**Step 2: Update TikZ layered prompt to use STEP markers**

In `lib/diagram-engine/tikz/layered-tikz-prompt.ts`, rename all `LAYER` references to `STEP`:

- Change `LAYERED_TIKZ_INSTRUCTIONS` to use `% === STEP N:` instead of `% === LAYER N:`
- Add the teacher whiteboard order table
- Add the metadata JSON instruction (so TikZ generates metadata inline too)
- Update `STEP_METADATA_PROMPT` to match (this is still used as fallback)

Replace the `LAYERED_TIKZ_INSTRUCTIONS` const with the updated version using STEP markers and including the teacher whiteboard order and metadata JSON instruction.

In the examples within the prompt, change all `% === LAYER N:` to `% === STEP N:`.

**Step 3: Run type check and test**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors

Run: `npx jest __tests__/lib/diagram-engine/ --no-coverage`
Expected: All existing tests pass (tikz-layer-parser tests still work because the parser handles both LAYER and STEP markers via normalization in tikz-steps.ts)

**Step 4: Commit**

```bash
git add lib/diagram-engine/system-prompt.ts lib/diagram-engine/tikz/layered-tikz-prompt.ts
git commit -m "feat(step-capture): add STEP marker instructions to all pipeline prompts"
```

---

## Task 9: Integrate Step Capture into Main Generation Flow

Wire up `captureSteps()` into `generateDiagram()` in `lib/diagram-engine/index.ts` so step images are captured during generation and embedded in DiagramResult.

**Files:**
- Modify: `lib/diagram-engine/index.ts`

**Step 1: Add import**

At top of `lib/diagram-engine/index.ts` (after line 11):

```typescript
import { captureSteps } from './step-capture';
```

**Step 2: Add step capture after successful generation**

In `generateDiagram()`, after the final image is ready and QA has passed but before caching, add step capture. Find the section where `result` is finalized (around line 370-385 where QA verdict is set and caching happens).

Add between QA completion and cache storage:

```typescript
// Step capture: pre-render step images (fire alongside cache, don't block)
if (result.code && !('error' in result)) {
  // Get userId from Supabase auth (best-effort, skip if unavailable)
  try {
    const { createClient: createSC } = await import('@/lib/supabase/server');
    const supabase = await createSC();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'anonymous';

    // The AI response text (for metadata extraction) is the code itself
    // plus any trailing JSON block — we pass the full code
    const { stepImages, captureTimeMs } = await captureSteps(
      result.code,
      result.pipeline,
      result.code, // Metadata is embedded in the AI response
      userId,
      question,
    );

    if (stepImages.length > 0) {
      result.stepImages = stepImages;
      console.log(`[DiagramEngine] Step capture: ${stepImages.length} steps in ${captureTimeMs}ms`);
    }
  } catch (err) {
    // Step capture failure never blocks diagram delivery
    console.warn('[DiagramEngine] Step capture failed (non-blocking):', err);
  }
}
```

**Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors

**Step 4: Commit**

```bash
git add lib/diagram-engine/index.ts
git commit -m "feat(step-capture): integrate captureSteps into generateDiagram flow"
```

---

## Task 10: Update Integration Layer to Pass stepImages

Update `integration.ts` to propagate `stepImages` from `DiagramResult` to `EngineDiagramResult`, replacing the old `stepByStepSource`.

**Files:**
- Modify: `lib/diagram-engine/integration.ts:27-51` (EngineDiagramResult interface)
- Modify: `lib/diagram-engine/integration.ts:106-114` (return statement)

**Step 1: Update EngineDiagramResult interface**

In `lib/diagram-engine/integration.ts`, add `stepImages` to the interface (line 27-51):

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
  /** @deprecated Use stepImages instead */
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
  /** Pre-rendered step images from step-capture pipeline */
  stepImages?: import('@/components/homework/diagram/types').StepImage[];
}
```

**Step 2: Pass stepImages in return statement**

In `tryEngineDiagram()`, update the return block (around line 106-114):

```typescript
return {
  type: 'engine_diagram',
  imageUrl: result.imageUrl,
  pipeline: result.pipeline,
  attempts: result.attempts,
  qaVerdict: result.qaVerdict,
  overlay: result.overlay,
  stepByStepSource: validLayeredSource || undefined,  // Keep for backward compat during migration
  stepImages: result.stepImages,                       // NEW: pre-rendered steps
};
```

**Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors

**Step 4: Commit**

```bash
git add lib/diagram-engine/integration.ts
git commit -m "feat(step-capture): propagate stepImages through integration layer"
```

---

## Task 11: Update Frontend — DiagramRenderer

Update DiagramRenderer to prefer pre-rendered `stepImages` over on-demand rendering. When `stepImages` are available, skip the API call entirely.

**Files:**
- Modify: `components/homework/diagram/DiagramRenderer.tsx`
- Modify: `components/homework/diagram/types.ts` (DiagramState)

**Step 1: Add stepImages to DiagramState**

In `components/homework/diagram/types.ts`, add to `DiagramState` (line 10-18):

```typescript
export interface DiagramState {
  type: string
  data?: Record<string, unknown>
  visibleStep?: number
  totalSteps?: number
  stepConfig?: Array<Record<string, unknown>>
  /** @deprecated Use stepImages for pre-rendered steps */
  stepByStepSource?: StepByStepSource
  /** Pre-rendered step images (from step-capture pipeline) */
  stepImages?: StepImage[]
}
```

**Step 2: Update DiagramRenderer to use pre-rendered steps**

In `components/homework/diagram/DiagramRenderer.tsx`, update the step-by-step logic (around lines 129-172):

```typescript
// Extract step data (prefer pre-rendered stepImages over legacy stepByStepSource)
const stepImages = diagram?.stepImages
const stepByStepSource = diagram?.stepByStepSource
const hasPreRenderedSteps = !!stepImages && stepImages.length > 1
const hasLegacySteps = !!stepByStepSource && stepByStepSource.steps.length > 0
const hasStepByStep = hasPreRenderedSteps || hasLegacySteps

// Handle "Step by Step" button click
const handleStepByStepClick = useCallback(async () => {
  if (hasPreRenderedSteps && stepImages) {
    // Pre-rendered: instant — no API call needed
    setStepImageUrls(stepImages.map(s => s.url))
    setStepsMeta(stepImages.map(s => ({
      layer: 0, // Not used for pre-rendered
      label: s.label,
      labelHe: s.labelHe,
      explanation: s.explanation,
      explanationHe: s.explanationHe,
    })))
    setIsPartial(false)
    setWalkthroughMode('active')
    return
  }

  // Legacy: on-demand rendering via API (backward compatibility)
  if (!stepByStepSource) return
  setWalkthroughMode('loading')
  // ... existing API call logic stays for backward compat
}, [hasPreRenderedSteps, stepImages, stepByStepSource])
```

Keep the existing on-demand API call logic as a fallback path (for cached diagrams that were generated before step-capture was enabled).

**Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors

**Step 4: Commit**

```bash
git add components/homework/diagram/DiagramRenderer.tsx components/homework/diagram/types.ts
git commit -m "feat(step-capture): update DiagramRenderer to use pre-rendered step images"
```

---

## Task 12: Update Frontend Helper — Data Flow

Ensure `stepImages` flows from the API response through to the DiagramState that reaches DiagramRenderer.

**Files:**
- Search for and modify: the helper that converts tutor engine results to DiagramState

**Step 1: Find the conversion helper**

Search for `convertToDiagramState` or similar function that maps API results to DiagramState. It should be in `components/homework/diagram/helpers.ts` or similar.

**Step 2: Add stepImages to the conversion**

Ensure the helper passes through `stepImages` when converting from the API response format to `DiagramState`.

**Step 3: Verify in homework types**

Check `lib/homework/types.ts` — the `TutorDiagramState` type that comes from the tutor engine. Add `stepImages` field to it if not present.

**Step 4: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: 0 errors

**Step 5: Commit**

```bash
git add <modified files>
git commit -m "feat(step-capture): wire stepImages through tutor data flow to frontend"
```

---

## Task 13: Create Supabase Storage Bucket

Create the `diagram-steps` bucket in Supabase for storing step images.

**Files:**
- Create: `supabase/migrations/20260305_diagram_steps_bucket.sql`

**Step 1: Write the migration**

```sql
-- Create diagram-steps bucket for pre-rendered step images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diagram-steps',
  'diagram-steps',
  true,           -- Public bucket (images served directly to frontend)
  5242880,        -- 5MB max per file
  ARRAY['image/png']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload step images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'diagram-steps'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access (images are served to the student)
CREATE POLICY "Public read access for step images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'diagram-steps');

-- Allow users to overwrite their own files (re-generation)
CREATE POLICY "Users can update their step images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'diagram-steps'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

**Step 2: Apply migration to Supabase**

Apply via Supabase dashboard or CLI. Verify the bucket appears in Storage section.

**Step 3: Commit**

```bash
git add supabase/migrations/20260305_diagram_steps_bucket.sql
git commit -m "feat(step-capture): add Supabase Storage bucket migration for diagram-steps"
```

---

## Task 14: Build Verification & Type Check

Run full build and test suite to verify everything compiles and no existing tests break.

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Run all new tests**

Run: `npx jest __tests__/lib/diagram-engine/step-capture/ --no-coverage`
Expected: All tests pass

**Step 3: Run full test suite**

Run: `npx jest --no-coverage 2>&1 | tail -20`
Expected: 0 new failures (pre-existing youtube test crash is expected)

**Step 4: Run build**

Run: `npm run build 2>&1 | tail -30`
Expected: Build succeeds

**Step 5: Commit (if any fixes needed)**

---

## Task 15: End-to-End Manual Testing

Test the complete flow with real diagram generation.

**Step 1: Deploy to Vercel preview**

Push to a branch and let Vercel build.

**Step 2: Test TikZ step capture**

Question: "Draw a free body diagram for an 80kg box on a 30° inclined plane with μ=0.2"

Verify:
- Diagram generates normally
- Vercel logs show `[StepCapture] Completed: N steps in Xms`
- "Step by Step" button appears immediately (no loading spinner)
- Clicking shows pre-rendered step walkthrough
- Steps follow teacher whiteboard order (object → weight → normal → friction)

**Step 3: Test Matplotlib step capture**

Question: "Graph y = x² - 4x + 3 and mark roots and vertex"

Verify:
- Same checks as TikZ
- Steps: axes → curve → key points → labels

**Step 4: Test LaTeX step capture**

Question: "Solve step by step: 3x + 7 = 22"

Verify:
- Steps show progressive equation solving
- Each step adds one operation

**Step 5: Test graceful degradation**

Disable step capture: Set `STEP_CAPTURE_ENABLED=false` in env
Verify: Diagrams still work, no step-by-step offered (or legacy on-demand works)

---

## Summary: Files Created/Modified

| Action | File |
|--------|------|
| MODIFY | `components/homework/diagram/types.ts` — Add StepImage, extend DiagramState |
| MODIFY | `lib/diagram-engine/index.ts` — Add stepImages to DiagramResult, integrate captureSteps |
| CREATE | `lib/diagram-engine/step-capture/upload-steps.ts` — Supabase Storage upload |
| CREATE | `lib/diagram-engine/step-capture/tikz-steps.ts` — TikZ cumulative compilation |
| CREATE | `lib/diagram-engine/step-capture/matplotlib-steps.ts` — Savefig injection + E2B |
| CREATE | `lib/diagram-engine/step-capture/latex-steps.ts` — Cumulative LaTeX compilation |
| CREATE | `lib/diagram-engine/step-capture/parse-metadata.ts` — AI metadata JSON parser |
| CREATE | `lib/diagram-engine/step-capture/index.ts` — Orchestrator |
| MODIFY | `lib/diagram-engine/system-prompt.ts` — Add STEP marker instructions |
| MODIFY | `lib/diagram-engine/tikz/layered-tikz-prompt.ts` — LAYER→STEP + whiteboard order |
| MODIFY | `lib/diagram-engine/integration.ts` — Propagate stepImages |
| MODIFY | `components/homework/diagram/DiagramRenderer.tsx` — Use pre-rendered steps |
| CREATE | `supabase/migrations/20260305_diagram_steps_bucket.sql` — Storage bucket |
| CREATE | `__tests__/lib/diagram-engine/step-capture/upload-steps.test.ts` |
| CREATE | `__tests__/lib/diagram-engine/step-capture/tikz-steps.test.ts` |
| CREATE | `__tests__/lib/diagram-engine/step-capture/matplotlib-steps.test.ts` |
| CREATE | `__tests__/lib/diagram-engine/step-capture/latex-steps.test.ts` |
| CREATE | `__tests__/lib/diagram-engine/step-capture/parse-metadata.test.ts` |

---

## Future Cleanup (After Validation)

Once step-capture is validated in production, remove legacy files in a separate PR:

- Delete `lib/diagram-engine/layered-tikz-generator.ts`
- Delete `lib/diagram-engine/step-renderer.ts`
- Delete `app/api/diagrams/render-steps/route.ts`
- Remove `generateLayeredTikz` call from `integration.ts`
- Remove `stepByStepSource` from types (keep only `stepImages`)
- Remove legacy on-demand rendering path from DiagramRenderer
