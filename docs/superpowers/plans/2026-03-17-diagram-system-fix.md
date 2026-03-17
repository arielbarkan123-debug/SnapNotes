# Diagram System Fix + Multi-Pipeline Walkthrough

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken diagram pipeline routing (quick mode forces TikZ for everything), enable Recraft progressive label step capture, and make the walkthrough support all 4 pipelines instead of TikZ-only.

**Architecture:** Three independent changes that build on each other: (1) Remove the quick mode TikZ forcing so the AI router picks pipelines correctly, (2) Add Recraft progressive label step capture so biology/anatomy diagrams get step-by-step images, (3) Wire the walkthrough to use the AI router + diagram engine for non-TikZ topics. Each change is independently deployable.

**Tech Stack:** Next.js 14, TypeScript, E2B sandbox (pdflatex), Recraft V3 API, Anthropic Claude API, QuickLaTeX HTTP API, Supabase Storage.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/homework/tutor-engine.ts` | Modify (lines 736-740, 957-967) | Remove `forcePipeline = 'tikz'` for quick mode |
| `lib/diagram-engine/recraft-executor.ts` | Modify (lines 32-37, 308-321) | Return `baseImageUrl` + `labels` alongside composited image |
| `lib/diagram-engine/index.ts` | Modify (lines 26-40, 440-482, 604-611) | Add `baseImageUrl`/`labels` to DiagramResult, add Recraft step capture path |
| `lib/diagram-engine/step-capture/recraft-steps.ts` | **Create** | Progressive label overlay step capture in single E2B session |
| `lib/diagram-engine/step-capture/index.ts` | Modify (lines 67-86) | Add `'recraft'` case to pipeline switch |
| `app/api/homework/sessions/[sessionId]/walkthrough/route.ts` | Modify (lines 111-240) | Use AI router, call diagram engine for non-TikZ |
| `lib/homework/walkthrough-generator.ts` | Modify (lines 704-717) | Accept `forceTextOnly` option |

---

## Chunk 1: Quick Mode Fix + Recraft Data Passthrough

### Task 1: Remove Quick Mode TikZ Forcing

**Files:**
- Modify: `lib/homework/tutor-engine.ts:736-740` (greeting path)
- Modify: `lib/homework/tutor-engine.ts:957-967` (chat path)

- [ ] **Step 1: Fix greeting path (line 736-740)**

Replace:
```typescript
// Pipeline selection based on diagram pipeline mode (quick = TikZ only, accurate = full routing)
const isQuickMode = pipelineMode === 'quick'
const forcePipeline = isQuickMode ? 'tikz' as const : undefined
const skipQA = isQuickMode
const skipStepCapture = isQuickMode
```

With:
```typescript
// Pipeline selection: quick skips QA + step capture for speed, but lets AI router pick pipeline.
// Accurate runs full QA loop + step capture. Off is handled upstream.
const isQuickMode = pipelineMode === 'quick'
const forcePipeline = undefined  // Always let AI router pick the best pipeline
const skipQA = isQuickMode
const skipStepCapture = isQuickMode
```

- [ ] **Step 2: Fix chat path (line 957-967)**

Replace:
```typescript
// Pipeline selection based on diagram pipeline mode:
// - 'quick': force TikZ pipeline (QuickLaTeX HTTP API, ~8s, no sandbox)
// - 'accurate': full routing via routeQuestion() with QA and step capture
// - 'off': no engine diagram (handled by shouldFireEngine = false)
const isQuickMode = pipelineMode === 'quick'
const forcePipeline = isQuickMode ? 'tikz' as const : undefined
const skipQA = isQuickMode
const skipStepCapture = isQuickMode
if (forcePipeline) {
  log.info(`Quick mode: forcing tikz pipeline (bypasses E2B sandbox)`)
}
```

With:
```typescript
// Pipeline selection: quick skips QA + step capture for speed, but lets AI router pick pipeline.
// This means anatomy → Recraft, physics → TikZ, graphs → Matplotlib even in quick mode.
// Accurate runs full QA loop + step capture. Off is handled by shouldFireEngine = false.
const isQuickMode = pipelineMode === 'quick'
const forcePipeline = undefined  // Always let AI router pick the best pipeline
const skipQA = isQuickMode
const skipStepCapture = isQuickMode
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors (forcePipeline was typed as `Pipeline | undefined`, `undefined` is valid)

- [ ] **Step 4: Commit**

```bash
git add lib/homework/tutor-engine.ts
git commit -m "fix: quick mode lets AI router pick pipeline instead of forcing TikZ

Previously quick mode forced all diagrams to TikZ, bypassing the AI router.
This meant Recraft (anatomy, biology), Matplotlib (graphs), and E2B LaTeX
(math typesetting) were never used unless the user manually selected 'Accurate'.
Now quick mode just skips QA + step capture for speed, while the AI router
picks the correct pipeline for each topic."
```

---

### Task 2: Recraft Executor Returns Base Image + Labels

**Files:**
- Modify: `lib/diagram-engine/recraft-executor.ts:32-37` (RecraftResult interface)
- Modify: `lib/diagram-engine/recraft-executor.ts:308-321` (return statements)

- [ ] **Step 1: Extend RecraftResult interface (line 32-37)**

Replace:
```typescript
export interface RecraftResult {
  imageUrl: string;
  // Note: overlay is no longer returned - labels are composited via TikZ
  /** Step-by-step teaching explanations for text-based walkthrough */
  stepMetadata?: RecraftStepMeta[];
}
```

With:
```typescript
export interface RecraftResult {
  imageUrl: string;
  /** Original Recraft image URL before label compositing (for progressive step capture) */
  baseImageUrl?: string;
  /** Labels used in compositing (for progressive step capture) */
  labels?: OverlayLabel[];
  /** Step-by-step teaching explanations for text-based walkthrough */
  stepMetadata?: RecraftStepMeta[];
}
```

- [ ] **Step 2: Return baseImageUrl + labels from generateRecraftDiagram (line 308-321)**

Replace:
```typescript
  // Step 6: Composite labels using TikZ (text is ONLY added via TikZ, never by Recraft)
  if (labels && labels.length > 0) {
    log.info(`Compositing ${labels.length} labels via TikZ...`);
    const compositedUrl = await compositeWithTikzLabels(imageUrl, labels);
    if (compositedUrl) {
      log.info('TikZ composite successful');
      return { imageUrl: compositedUrl, stepMetadata };
    }
    log.info('TikZ composite failed, returning base image without labels');
  }

  // Return base image if no labels or compositing failed
  return { imageUrl, stepMetadata };
```

With:
```typescript
  // Step 6: Composite labels using TikZ (text is ONLY added via TikZ, never by Recraft)
  if (labels && labels.length > 0) {
    log.info(`Compositing ${labels.length} labels via TikZ...`);
    const compositedUrl = await compositeWithTikzLabels(imageUrl, labels);
    if (compositedUrl) {
      log.info('TikZ composite successful');
      return { imageUrl: compositedUrl, baseImageUrl: imageUrl, labels, stepMetadata };
    }
    log.info('TikZ composite failed, returning base image without labels');
  }

  // Return base image if no labels or compositing failed
  return { imageUrl, baseImageUrl: imageUrl, labels, stepMetadata };
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors (new fields are optional)

- [ ] **Step 4: Commit**

```bash
git add lib/diagram-engine/recraft-executor.ts
git commit -m "feat: Recraft executor returns base image URL and labels

Exposes the pre-compositing image URL and label positions so the
step capture pipeline can create progressive label overlays."
```

---

### Task 3: DiagramResult Passthrough + Recraft Step Capture Path

**Files:**
- Modify: `lib/diagram-engine/index.ts:26-40` (DiagramResult interface)
- Modify: `lib/diagram-engine/index.ts:604-611` (generateRecraftWithQA return)
- Modify: `lib/diagram-engine/index.ts:440-482` (add Recraft step capture block)

- [ ] **Step 1: Add fields to DiagramResult (line 26-40)**

Replace:
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
  stepImages?: StepImage[];
  /** Step-by-step teaching explanations (used for recraft text-based walkthroughs) */
  stepMetadata?: RecraftStepMeta[];
  /** Full unprocessed AI response text — used by step-capture to extract metadata JSON */
  fullResponseText?: string;
}
```

With:
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
  stepImages?: StepImage[];
  /** Step-by-step teaching explanations (used for recraft text-based walkthroughs) */
  stepMetadata?: RecraftStepMeta[];
  /** Full unprocessed AI response text — used by step-capture to extract metadata JSON */
  fullResponseText?: string;
  /** Original Recraft image URL before label compositing (for progressive step capture) */
  baseImageUrl?: string;
  /** Labels from Recraft Vision labeling (for progressive step capture) */
  labels?: OverlayLabel[];
}
```

- [ ] **Step 2: Pass through in generateRecraftWithQA (line 604-611)**

Replace:
```typescript
    return {
      imageUrl: await postProcessDiagram(recraftResult.imageUrl, 'recraft'),
      pipeline: 'recraft',
      attempts: qaRound + 1,
      // Note: Labels are now composited via TikZ, not returned as overlay
      qaVerdict: qaRound > 0 ? 'pass-after-retry' : 'pass',
      stepMetadata: recraftResult.stepMetadata,
    };
```

With:
```typescript
    return {
      imageUrl: await postProcessDiagram(recraftResult.imageUrl, 'recraft'),
      pipeline: 'recraft',
      attempts: qaRound + 1,
      qaVerdict: qaRound > 0 ? 'pass-after-retry' : 'pass',
      stepMetadata: recraftResult.stepMetadata,
      baseImageUrl: recraftResult.baseImageUrl,
      labels: recraftResult.labels,
    };
```

- [ ] **Step 3: Add Recraft step capture block (after existing step capture block, ~line 482)**

After the closing `}` of the existing code-based step capture block (line 482), add:

```typescript
    // ── Recraft step capture: progressive label overlays (best-effort) ──
    // For Recraft diagrams, create step images by progressively revealing labels
    // on the base image. Uses a single E2B sandbox session for efficiency.
    if (result.pipeline === 'recraft' && !options?.skipStepCapture && result.baseImageUrl && result.labels && result.labels.length > 0) {
      try {
        const { createClient: createSC } = await import('@/lib/supabase/server');
        const supabase = await createSC();
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        if (userId) {
          const { captureRecraftSteps } = await import('./step-capture/recraft-steps');
          const RECRAFT_STEP_CAPTURE_TIMEOUT_MS = 25_000;
          const capturePromise = captureRecraftSteps(
            result.baseImageUrl,
            result.labels,
            result.stepMetadata || [],
            userId,
            question,
          );
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), RECRAFT_STEP_CAPTURE_TIMEOUT_MS)
          );

          const captureResult = await Promise.race([capturePromise, timeoutPromise]);

          if (captureResult && captureResult.stepImages.length > 0) {
            result.stepImages = captureResult.stepImages;
            log.info(`Recraft step capture: ${captureResult.stepImages.length} steps in ${captureResult.captureTimeMs}ms`);
          } else if (!captureResult) {
            log.warn(`Recraft step capture timed out after ${RECRAFT_STEP_CAPTURE_TIMEOUT_MS}ms`);
            capturePromise.catch((err) => {
              log.warn('Background recraft step capture failed:', err);
            });
          }
        }
      } catch (err) {
        log.warn({ err }, 'Recraft step capture failed (non-blocking)');
      }
    }
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: Error about missing `captureRecraftSteps` — expected, will be created in Task 4.

- [ ] **Step 5: Commit**

```bash
git add lib/diagram-engine/index.ts
git commit -m "feat: wire Recraft progressive step capture into diagram engine

DiagramResult now carries baseImageUrl and labels from Recraft.
After Recraft generation, if labels exist, attempts progressive label
step capture (25s timeout, non-blocking). The actual capture function
is implemented in the next commit."
```

---

## Chunk 2: Recraft Progressive Label Step Capture

### Task 4: Create Recraft Step Capture Module

**Files:**
- Create: `lib/diagram-engine/step-capture/recraft-steps.ts`

- [ ] **Step 1: Create the recraft-steps.ts file**

```typescript
/**
 * Recraft Step Capture — Progressive Label Overlays
 *
 * Creates step-by-step images for Recraft diagrams by progressively
 * revealing labels on the base image. Each step shows cumulative labels
 * composited via TikZ overlay in a single E2B sandbox session.
 *
 * Example: "Human Eye" with 8 labels across 4 steps:
 *   Step 1: base image + labels[0..1] (Cornea, Sclera)
 *   Step 2: base image + labels[0..3] (+ Iris, Pupil)
 *   Step 3: base image + labels[0..5] (+ Lens, Vitreous Humor)
 *   Step 4: base image + labels[0..7] (+ Retina, Optic Nerve)
 */

import { Sandbox } from '@e2b/code-interpreter'
import type { OverlayLabel, RecraftStepMeta } from '../recraft-executor'
import type { StepImage } from '@/components/homework/diagram/types'
import { uploadStepImages, generateDiagramHash } from './upload-steps'
import { createLogger } from '@/lib/logger'

const log = createLogger('diagram:recraft-steps')

const LATEX_TEMPLATE_ID = process.env.E2B_LATEX_TEMPLATE_ID || undefined

export interface RecraftStepCaptureResult {
  stepImages: StepImage[]
  captureTimeMs: number
}

/**
 * Escape special LaTeX characters in label text.
 */
function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
}

/**
 * Build TikZ overlay code for a subset of labels on the base image.
 */
function buildOverlayTikz(labels: OverlayLabel[]): string {
  const labelNodes = labels.map((label, i) => {
    const labelX = (label.x / 100) * 10
    const labelY = 10 - (label.y / 100) * 10
    const targetX = (label.targetX / 100) * 10
    const targetY = 10 - (label.targetY / 100) * 10
    const escapedText = escapeLatex(label.text)

    return `    % Label ${i + 1}: ${label.text}
    \\draw[line width=0.4pt, color=gray!70] (${targetX.toFixed(2)}, ${targetY.toFixed(2)}) -- (${labelX.toFixed(2)}, ${labelY.toFixed(2)});
    \\fill[color=gray!70] (${targetX.toFixed(2)}, ${targetY.toFixed(2)}) circle (0.06);
    \\node[fill=white, fill opacity=0.85, text opacity=1, inner sep=1.5pt, font=\\scriptsize\\sffamily] at (${labelX.toFixed(2)}, ${labelY.toFixed(2)}) {${escapedText}};`
  }).join('\n')

  return `\\documentclass[border=0pt]{standalone}
\\usepackage{tikz}
\\usepackage{graphicx}
\\begin{document}
\\begin{tikzpicture}
    \\node[anchor=south west, inner sep=0] at (0,0) {\\includegraphics[width=10cm, height=10cm]{/tmp/recraft_base.png}};
${labelNodes}
\\end{tikzpicture}
\\end{document}`
}

/**
 * Capture progressive label overlay step images for a Recraft diagram.
 *
 * Opens ONE E2B sandbox, downloads the base image once, then compiles
 * N TikZ overlays sequentially (each ~2-3s). Labels are distributed
 * evenly across steps.
 */
export async function captureRecraftSteps(
  baseImageUrl: string,
  labels: OverlayLabel[],
  stepMetadata: RecraftStepMeta[],
  userId: string,
  question: string,
): Promise<RecraftStepCaptureResult> {
  const startTime = Date.now()

  if (!LATEX_TEMPLATE_ID) {
    log.warn('E2B_LATEX_TEMPLATE_ID not set — skipping Recraft step capture')
    return { stepImages: [], captureTimeMs: Date.now() - startTime }
  }

  if (labels.length === 0) {
    return { stepImages: [], captureTimeMs: Date.now() - startTime }
  }

  // Determine number of steps: use stepMetadata count, or divide labels into 3-5 groups
  const numSteps = stepMetadata.length > 0
    ? Math.min(stepMetadata.length, labels.length)
    : Math.min(Math.max(3, Math.ceil(labels.length / 2)), 5)

  log.info({ numSteps, numLabels: labels.length }, 'Starting Recraft progressive step capture')

  const sandbox = await Sandbox.create(LATEX_TEMPLATE_ID, { timeoutMs: 60000 })

  try {
    // Wait for sandbox
    await sandbox.runCode('print("ready")', { timeoutMs: 15000 })

    // Download base image once
    const downloadResult = await sandbox.runCode(
      `import urllib.request, os
try:
    urllib.request.urlretrieve("${baseImageUrl}", "/tmp/recraft_base.png")
    print(f"OK:{os.path.getsize('/tmp/recraft_base.png')}")
except Exception as e:
    print(f"ERR:{e}")`,
      { timeoutMs: 20000 }
    )

    const dlOutput = downloadResult.logs.stdout.join('')
    if (!dlOutput.startsWith('OK:')) {
      log.error({ output: dlOutput }, 'Failed to download base image')
      return { stepImages: [], captureTimeMs: Date.now() - startTime }
    }

    // Compile progressive overlays
    const buffers: (Buffer | null)[] = []

    for (let step = 0; step < numSteps; step++) {
      // Labels for this step: cumulative, evenly distributed
      const labelCount = Math.ceil(((step + 1) / numSteps) * labels.length)
      const stepLabels = labels.slice(0, labelCount)
      const tikzCode = buildOverlayTikz(stepLabels)

      // Write TikZ, compile, convert to PNG
      const compileResult = await sandbox.runCode(
        `import subprocess, os, base64

tex = ${JSON.stringify(tikzCode)}
with open("/tmp/step.tex", "w") as f:
    f.write(tex)

r = subprocess.run(
    ["pdflatex", "-interaction=nonstopmode", "-output-directory=/tmp", "/tmp/step.tex"],
    capture_output=True, timeout=15
)

if r.returncode != 0 or not os.path.exists("/tmp/step.pdf"):
    print(f"COMPILE_ERR:{r.stderr[-500:] if r.stderr else 'unknown'}")
else:
    subprocess.run(
        ["convert", "-density", "200", "/tmp/step.pdf", "-quality", "95", "/tmp/step.png"],
        capture_output=True, timeout=10
    )
    if os.path.exists("/tmp/step.png"):
        with open("/tmp/step.png", "rb") as f:
            data = f.read()
        print(f"OK:{base64.b64encode(data).decode()}")
    else:
        print("CONVERT_ERR")`,
        { timeoutMs: 25000 }
      )

      const output = compileResult.logs.stdout.join('')
      if (output.startsWith('OK:')) {
        const b64 = output.slice(3)
        buffers.push(Buffer.from(b64, 'base64'))
      } else {
        log.warn({ step: step + 1, output: output.slice(0, 200) }, 'Step compilation failed')
        buffers.push(null)
      }
    }

    // Upload to Supabase Storage
    const validBuffers = buffers.filter((b): b is Buffer => b !== null)
    if (validBuffers.length === 0) {
      return { stepImages: [], captureTimeMs: Date.now() - startTime }
    }

    const diagramHash = generateDiagramHash(question, 'recraft-steps')
    const urls = await uploadStepImages(validBuffers, userId, diagramHash)

    // Build StepImage array with metadata
    const stepImages: StepImage[] = []
    let bufferIdx = 0

    for (let i = 0; i < buffers.length; i++) {
      if (buffers[i] !== null) {
        const url = urls[bufferIdx]
        bufferIdx++

        if (url) {
          const meta = stepMetadata[i]
          stepImages.push({
            url,
            label: meta?.label || `Step ${i + 1}`,
            labelHe: meta?.labelHe || meta?.label || `שלב ${i + 1}`,
            explanation: meta?.explanation || '',
            explanationHe: meta?.explanationHe || meta?.explanation || '',
          })
        }
      }
    }

    const captureTimeMs = Date.now() - startTime
    log.info({ steps: stepImages.length, captureTimeMs }, 'Recraft step capture complete')

    return { stepImages, captureTimeMs }
  } catch (err) {
    log.error({ err }, 'Recraft step capture error')
    return { stepImages: [], captureTimeMs: Date.now() - startTime }
  } finally {
    await sandbox.kill().catch(() => {})
  }
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/diagram-engine/step-capture/recraft-steps.ts
git commit -m "feat: add Recraft progressive label step capture

Creates step-by-step images for Recraft diagrams by progressively
revealing labels on the base image. Uses a single E2B sandbox session
for efficiency — downloads the image once, then compiles N TikZ
overlays sequentially (~2-3s each). Labels are distributed evenly
across steps."
```

---

### Task 5: Wire Recraft into Step Capture Orchestrator

**Files:**
- Modify: `lib/diagram-engine/step-capture/index.ts:67-86` (pipeline switch)

- [ ] **Step 1: Add Recraft case to pipeline switch (line 67-86)**

Replace:
```typescript
    switch (pipeline) {
      case 'tikz': {
        const result = await captureTikzSteps(code)
        buffers = result.buffers
        break
      }
      case 'e2b-matplotlib': {
        const result = await captureMatplotlibSteps(code)
        buffers = result.buffers
        break
      }
      case 'e2b-latex': {
        const result = await captureLatexSteps(code)
        buffers = result.buffers
        break
      }
      default:
        // Recraft and other pipelines don't support step capture
        return { stepImages: [], captureTimeMs: Date.now() - startTime }
    }
```

With:
```typescript
    switch (pipeline) {
      case 'tikz': {
        const result = await captureTikzSteps(code)
        buffers = result.buffers
        break
      }
      case 'e2b-matplotlib': {
        const result = await captureMatplotlibSteps(code)
        buffers = result.buffers
        break
      }
      case 'e2b-latex': {
        const result = await captureLatexSteps(code)
        buffers = result.buffers
        break
      }
      case 'recraft':
        // Recraft step capture is handled separately in index.ts
        // (needs baseImageUrl + labels, not code)
        return { stepImages: [], captureTimeMs: Date.now() - startTime }
      default:
        return { stepImages: [], captureTimeMs: Date.now() - startTime }
    }
```

- [ ] **Step 2: Run type check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: Clean type check, successful build

- [ ] **Step 3: Commit**

```bash
git add lib/diagram-engine/step-capture/index.ts
git commit -m "fix: document Recraft step capture bypass in orchestrator

Recraft step capture is handled directly in the diagram engine index.ts
(needs baseImageUrl + labels, not code). Add explicit case for clarity."
```

---

## Chunk 3: Walkthrough Multi-Pipeline Support

### Task 6: Walkthrough Generator Supports forceTextOnly

**Files:**
- Modify: `lib/homework/walkthrough-generator.ts:704-717`

- [ ] **Step 1: Add forceTextOnly option to generateWalkthroughSolution**

Replace:
```typescript
export async function generateWalkthroughSolution(
  questionText: string,
  imageUrls?: string[],
  language?: ContentLanguage,
): Promise<WalkthroughGenerationResult> {
  const topicClassified = classifyWalkthroughTopic(questionText)

  // First attempt
  let solution = await generateWalkthroughSolutionOnce(questionText, imageUrls, { language })

  // For text-only mode, no TikZ validation needed
  if (solution.mode === 'text-only' || !solution.tikzCode) {
    return { solution, topicClassified, validationErrors: [] }
  }
```

With:
```typescript
export async function generateWalkthroughSolution(
  questionText: string,
  imageUrls?: string[],
  language?: ContentLanguage,
  options?: { forceTextOnly?: boolean },
): Promise<WalkthroughGenerationResult> {
  // When forceTextOnly is set, the visual comes from the diagram engine (non-TikZ pipeline).
  // We still classify the topic for telemetry, but force text-only generation.
  const topicClassified = options?.forceTextOnly ? 'engine-visual' : classifyWalkthroughTopic(questionText)

  // First attempt — if forceTextOnly, override topic to text-only for prompt selection
  const effectiveOptions = options?.forceTextOnly
    ? { language, forceTextOnly: true as const }
    : { language }
  let solution = await generateWalkthroughSolutionOnce(questionText, imageUrls, effectiveOptions)

  // For text-only mode (or engine-visual), no TikZ validation needed
  if (solution.mode === 'text-only' || !solution.tikzCode) {
    return { solution, topicClassified, validationErrors: [] }
  }
```

- [ ] **Step 2: Update generateWalkthroughSolutionOnce to handle forceTextOnly**

In `generateWalkthroughSolutionOnce` (around line 579), update the topic classification:

Replace:
```typescript
  // Classify topic
  const topic = classifyWalkthroughTopic(questionText)
  log.info({ topic }, 'Topic classified')
```

With:
```typescript
  // Classify topic — forceTextOnly means the diagram engine handles visuals
  const topic = options?.forceTextOnly ? 'text-only' as const : classifyWalkthroughTopic(questionText)
  log.info({ topic, forceTextOnly: !!options?.forceTextOnly }, 'Topic classified')
```

And add `forceTextOnly` to the options type (line 574):

Replace:
```typescript
  options?: { simplify?: boolean; previousMaxSize?: number; validationFixes?: string; language?: ContentLanguage },
```

With:
```typescript
  options?: { simplify?: boolean; previousMaxSize?: number; validationFixes?: string; language?: ContentLanguage; forceTextOnly?: boolean },
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add lib/homework/walkthrough-generator.ts
git commit -m "feat: walkthrough generator supports forceTextOnly option

When forceTextOnly is set, the walkthrough generates solution text without
TikZ code. The visual diagram comes from the diagram engine instead.
Used when the AI router selects a non-TikZ pipeline (Recraft, Matplotlib, etc.)."
```

---

### Task 7: Walkthrough API Route Uses AI Router + Diagram Engine

**Files:**
- Modify: `app/api/homework/sessions/[sessionId]/walkthrough/route.ts:111-240`

This is the core change. The walkthrough route currently:
1. Generates solution (with TikZ or text-only) via `generateWalkthroughSolution()`
2. If TikZ: compiles step images via `renderWalkthroughSteps()`
3. If text-only: skips compilation

New flow:
1. AI router picks pipeline
2. If TikZ: current flow (unchanged)
3. If non-TikZ: generate text solution + call `tryEngineDiagram()` in parallel

- [ ] **Step 1: Add imports at top of file**

After existing imports (around line 16), add:

```typescript
import { routeQuestionWithAI } from '@/lib/diagram-engine/router'
import { tryEngineDiagram } from '@/lib/diagram-engine/integration'
```

- [ ] **Step 2: Replace the streaming pipeline (inside `async start(controller)`, after heartbeat setup)**

Replace the entire block from "Step 1: Generate solution via Claude" through the compilation/text-only logic (lines ~128-240) with:

```typescript
        // ─── Step 1: Route question to best pipeline ─────────────────
        log.info({ sessionId }, 'Routing question to best pipeline')
        const questionText = session.question_text || ''
        let pipeline: string
        try {
          pipeline = await routeQuestionWithAI(questionText)
        } catch {
          pipeline = 'tikz' // Fallback to TikZ if AI router fails
        }
        log.info({ pipeline }, 'Pipeline selected')

        const isTikzPipeline = pipeline === 'tikz'

        // Resolve language for the walkthrough content
        const userLanguage = await getContentLanguage(supabase, user.id)
        const sourceLanguage = detectSourceLanguage(questionText)
        const wasExplicit = await getExplicitToggleFlag()
        const language = resolveOutputLanguage(userLanguage, sourceLanguage, wasExplicit)
        if (sourceLanguage) {
          await clearExplicitToggleFlag()
        }

        // ─── Step 2: Generate solution + visual in parallel ──────────
        // For TikZ: solution includes aligned TikZ code (current behavior)
        // For non-TikZ: solution is text-only, visual comes from diagram engine
        const solutionPromise = generateWalkthroughSolution(
          questionText,
          session.question_image_url ? [session.question_image_url] : undefined,
          language,
          isTikzPipeline ? undefined : { forceTextOnly: true },
        )

        // Start diagram engine for non-TikZ pipelines (runs in parallel with solution)
        const enginePromise = !isTikzPipeline
          ? tryEngineDiagram(questionText).catch((err) => {
              log.warn({ err }, 'Engine diagram failed for walkthrough')
              return undefined
            })
          : Promise.resolve(undefined)

        const { solution, topicClassified, validationErrors } = await solutionPromise

        log.info({ steps: solution.steps.length, mode: solution.mode || 'diagram', topic: topicClassified, pipeline }, 'Solution generated')

        // ─── Step 3: Create walkthrough session in DB ─────────────────
        const isTextOnly = isTikzPipeline
          ? (solution.mode === 'text-only' || !solution.tikzCode || !solution.tikzCode.includes('\\begin{tikzpicture}'))
          : true // Non-TikZ solutions are always "text-only" (visual comes from engine)

        const { data: wSession, error: insertError } = await serviceClient
          .from('walkthrough_sessions')
          .insert({
            homework_session_id: sessionId,
            user_id: user.id,
            question_text: questionText,
            solution,
            generation_status: (isTextOnly && isTikzPipeline ? 'complete' : 'compiling') as WalkthroughGenerationStatus,
            total_steps: solution.steps.length,
            steps_rendered: isTextOnly && isTikzPipeline ? solution.steps.length : 0,
            step_images: [],
            topic_classified: topicClassified,
            validation_errors: validationErrors,
          })
          .select('id')
          .single()

        if (insertError || !wSession) {
          throw new Error(`Failed to create walkthrough session: ${insertError?.message}`)
        }

        walkthroughId = wSession.id
        send({ type: 'session_created', walkthroughId: walkthroughId! })
        send({ type: 'solution_ready', solution, totalSteps: solution.steps.length })

        // ─── Step 4: Generate step images ────────────────────────────
        if (isTikzPipeline && !isTextOnly) {
          // TikZ path: compile layered TikZ code (current behavior)
          log.info({ steps: solution.steps.length }, 'Compiling TikZ step images')

          const parsed = parseTikzLayers(solution.tikzCode)
          const alignment = validateLayerStepAlignment(parsed, solution.steps.length)
          if (!alignment.valid) {
            log.warn({ message: alignment.message }, 'Layer mismatch')
          }

          const sizes = estimateCumulativeSize(parsed)
          const oversizedIdx = sizes.findIndex(s => s > 3500)
          if (oversizedIdx >= 0) {
            log.warn({ stepIndex: oversizedIdx + 1, chars: sizes[oversizedIdx] }, 'Step may exceed QuickLaTeX limit')
          }

          const stepImages: string[] = new Array(solution.steps.length).fill('')

          const onStepRendered = (stepIndex: number, imageUrl: string) => {
            stepImages[stepIndex] = imageUrl
            const rendered = stepImages.filter(Boolean).length
            send({ type: 'step_image', stepIndex, imageUrl })
            send({ type: 'compilation_progress', stepsRendered: rendered, totalSteps: solution.steps.length })

            serviceClient
              .from('walkthrough_sessions')
              .update({
                step_images: stepImages,
                steps_rendered: rendered,
                updated_at: new Date().toISOString(),
              })
              .eq('id', walkthroughId!)
              .then(() => {})
          }

          const onStepFailed = (stepIndex: number, error: string) => {
            send({ type: 'step_failed', stepIndex, error })
          }

          await renderWalkthroughSteps(solution.tikzCode, solution.steps.length, onStepRendered, onStepFailed)

          const finalRendered = stepImages.filter(Boolean).length
          const finalStatus: WalkthroughGenerationStatus =
            finalRendered === solution.steps.length ? 'complete' : 'partial'

          await serviceClient
            .from('walkthrough_sessions')
            .update({
              generation_status: finalStatus,
              step_images: stepImages,
              steps_rendered: finalRendered,
              compilation_failures: solution.steps.length - finalRendered,
              updated_at: new Date().toISOString(),
            })
            .eq('id', walkthroughId)

          send({
            type: 'complete',
            stepsRendered: finalRendered,
            totalSteps: solution.steps.length,
          })

          log.info({ rendered: finalRendered, total: solution.steps.length }, 'TikZ walkthrough complete')

        } else {
          // Non-TikZ path: use diagram engine result
          const engineResult = await enginePromise

          const stepImages: string[] = new Array(solution.steps.length).fill('')

          if (engineResult) {
            log.info({ pipeline: engineResult.pipeline, hasStepImages: !!engineResult.stepImages?.length }, 'Engine result received')

            if (engineResult.stepImages && engineResult.stepImages.length > 0) {
              // Engine produced step images — map to walkthrough steps
              // Distribute engine step images across solution steps
              const eSteps = engineResult.stepImages
              for (let i = 0; i < solution.steps.length; i++) {
                const eIdx = Math.min(Math.floor((i / solution.steps.length) * eSteps.length), eSteps.length - 1)
                stepImages[i] = eSteps[eIdx].url
                send({ type: 'step_image', stepIndex: i, imageUrl: stepImages[i] })
              }
            } else {
              // Engine produced only a static image — show for all steps
              for (let i = 0; i < solution.steps.length; i++) {
                stepImages[i] = engineResult.imageUrl
                send({ type: 'step_image', stepIndex: i, imageUrl: engineResult.imageUrl })
              }
            }

            send({ type: 'compilation_progress', stepsRendered: solution.steps.length, totalSteps: solution.steps.length })
          } else {
            log.warn('No engine result — walkthrough will be text-only')
          }

          const finalRendered = stepImages.filter(Boolean).length
          const finalStatus: WalkthroughGenerationStatus = finalRendered > 0 ? 'complete' : 'complete'

          await serviceClient
            .from('walkthrough_sessions')
            .update({
              generation_status: finalStatus,
              step_images: stepImages,
              steps_rendered: finalRendered,
              updated_at: new Date().toISOString(),
            })
            .eq('id', walkthroughId)

          send({
            type: 'complete',
            stepsRendered: finalRendered,
            totalSteps: solution.steps.length,
          })

          log.info({ rendered: finalRendered, total: solution.steps.length, pipeline: engineResult?.pipeline || 'none' }, 'Engine walkthrough complete')
        }
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Run full build**

Run: `npx next build`
Expected: Successful build

- [ ] **Step 5: Commit**

```bash
git add app/api/homework/sessions/[sessionId]/walkthrough/route.ts
git commit -m "feat: walkthrough uses AI router + diagram engine for all pipelines

The walkthrough now routes questions through the AI-powered pipeline router
instead of keyword regex. For TikZ topics (physics, geometry), the current
layered TikZ flow is preserved. For non-TikZ topics (anatomy → Recraft,
graphs → Matplotlib, math → LaTeX), the walkthrough generates solution text
in parallel with the diagram engine, then maps engine images to walkthrough
steps. This means every walkthrough topic gets a visual diagram."
```

---

## Verification

After all tasks are complete:

- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `npx next build` — successful build
- [ ] `npx jest` — all existing tests pass
- [ ] Manual test: "human eye labeled with parts" homework → should get Recraft image (not TikZ)
- [ ] Manual test: "ball kicked at 20 m/s at 30 degrees" walkthrough → should get TikZ layered diagram
- [ ] Manual test: "graph y = x²" → should get Matplotlib graph
- [ ] Manual test: "human eye" walkthrough → should show Recraft image with progressive labels per step
