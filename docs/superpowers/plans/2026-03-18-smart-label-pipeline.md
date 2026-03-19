# Smart Label Pipeline Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fragile server-side TikZ/E2B label compositing with a robust three-phase label pipeline and client-side SVG overlay rendering for Recraft diagrams.

**Architecture:** Phase 1 generates bilingual label content (Claude domain knowledge) in parallel with Recraft image generation. Phase 2 uses focused Vision to map labels to coordinates. Phase 3 verifies placement. Phase 4 renders labels as SVG+HTML overlay in the browser. A feature flag (`RECRAFT_PIPELINE_VERSION`) controls rollout.

**Tech Stack:** Next.js 14 (App Router), Supabase storage, Anthropic Claude SDK (claude-sonnet-4-6), Recraft v4 API, Framer Motion, SVG, React

**Spec:** `docs/superpowers/specs/2026-03-18-smart-label-pipeline-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `lib/diagram-engine/label-pipeline.ts` | Phase 1-3: `generateLabelContent()`, `mapLabelsToImage()`, `verifyLabelPlacement()`, `computeLabelPositions()`, `uploadBaseImage()` |
| `components/homework/diagram/LabeledDiagramOverlay.tsx` | Phase 4: SVG+HTML overlay component with step-by-step support |
| `__tests__/lib/diagram-engine/label-pipeline.test.ts` | Unit tests for label pipeline functions |
| `__tests__/components/diagrams/LabeledDiagramOverlay.test.tsx` | Render tests for overlay component |

### Modified files
| File | Changes |
|------|---------|
| `types/index.ts` | Add `OverlayLabel`, `RecraftStepMeta`, `DiagramStatus` |
| `lib/diagram-engine/recraft-executor.ts` | Feature flag branch: v2 calls `label-pipeline.ts`, v1 keeps old path. Remove local `OverlayLabel`/`RecraftStepMeta` |
| `lib/diagram-engine/integration.ts` | Return `DiagramStatus` instead of `undefined`. Update `EngineDiagramResult.overlay` to use canonical `OverlayLabel` |
| `lib/diagram-engine/index.ts` | Update imports to `@/types` |
| `lib/diagram-engine/step-capture/recraft-steps.ts` | Update imports to `@/types` |
| `lib/diagram-engine/router.ts` | Add new regex patterns + enhance AI router prompt |
| `lib/homework/types.ts` | Add `DiagramStatus`, `diagramStatus` field on `TutorResponse` |
| `lib/homework/tutor-engine.ts` | Quick mode Recraft awareness, set `diagramStatus`, propagate errors |
| `app/api/homework/sessions/[sessionId]/chat/route.ts` | Stream `diagramStatus` alongside `ConversationMessage` |
| `components/homework/diagram/DiagramRenderer.tsx` | Branch to `LabeledDiagramOverlay` for Recraft with labels |
| `components/homework/diagram/EngineDiagramImage.tsx` | Remove local `OverlayLabel`, import from `@/types` |

---

## Chunk 1: Types, Feature Flag, and Frontend Component

### Task 1: Consolidate OverlayLabel and RecraftStepMeta into types/index.ts

**Files:**
- Modify: `types/index.ts` (after line 461)
- Modify: `lib/diagram-engine/recraft-executor.ts:16-30` (remove local interfaces)
- Modify: `lib/diagram-engine/index.ts:5` (update import)
- Modify: `lib/diagram-engine/integration.ts:37-43` (replace inline type)
- Modify: `lib/diagram-engine/step-capture/recraft-steps.ts:16` (update import)
- Modify: `components/homework/diagram/EngineDiagramImage.tsx:13-19` (remove local interface)

- [ ] **Step 1: Add OverlayLabel, RecraftStepMeta, and DiagramStatus to types/index.ts**

Add after the existing type exports at the end of the file:

```typescript
// ─── Diagram Overlay Labels ─────────────────────────────────────────────────

export interface OverlayLabel {
  text: string
  textHe?: string
  x: number
  y: number
  targetX: number
  targetY: number
  description?: string
  descriptionHe?: string
  stepGroup?: number
  found?: boolean  // defaults to true when absent
}

export interface RecraftStepMeta {
  step: number
  label: string
  labelHe: string
  explanation: string
  explanationHe: string
}

export type DiagramStatus =
  | { status: 'generating' }
  | { status: 'success'; imageUrl: string; labels: OverlayLabel[]; stepMetadata: RecraftStepMeta[] }
  | { status: 'failed'; reason: string; fallbackText?: string }
  | { status: 'timeout'; willRetryOnNext: boolean }
```

- [ ] **Step 2: Update recraft-executor.ts — remove local interfaces, re-export from @/types**

In `lib/diagram-engine/recraft-executor.ts`, replace lines 16-30 (the local `OverlayLabel` and `RecraftStepMeta` interfaces) with:

```typescript
import type { OverlayLabel, RecraftStepMeta } from '@/types'
export type { OverlayLabel, RecraftStepMeta }
```

Keep the re-export so existing consumers of `./recraft-executor` don't break during migration.

- [ ] **Step 3: Update index.ts import**

In `lib/diagram-engine/index.ts` line 5, change:
```typescript
import type { OverlayLabel, RecraftStepMeta } from './recraft-executor';
```
to:
```typescript
import type { OverlayLabel, RecraftStepMeta } from '@/types';
```

- [ ] **Step 4: Update integration.ts inline overlay type**

In `lib/diagram-engine/integration.ts` lines 37-43, replace the inline `overlay` type with:

```typescript
overlay?: OverlayLabel[];
```

Add import at top:
```typescript
import type { OverlayLabel } from '@/types';
```

- [ ] **Step 5: Update step-capture/recraft-steps.ts import**

In `lib/diagram-engine/step-capture/recraft-steps.ts` line 16, change:
```typescript
import type { OverlayLabel, RecraftStepMeta } from '../recraft-executor';
```
to:
```typescript
import type { OverlayLabel, RecraftStepMeta } from '@/types';
```

- [ ] **Step 6: Update EngineDiagramImage.tsx — remove local interface**

In `components/homework/diagram/EngineDiagramImage.tsx`, remove the local `OverlayLabel` interface at lines 13-19. Add import:
```typescript
import type { OverlayLabel } from '@/types'
```

- [ ] **Step 7: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors. All imports resolve correctly.

- [ ] **Step 8: Commit**

```bash
git add types/index.ts lib/diagram-engine/recraft-executor.ts lib/diagram-engine/index.ts lib/diagram-engine/integration.ts lib/diagram-engine/step-capture/recraft-steps.ts components/homework/diagram/EngineDiagramImage.tsx
git commit -m "refactor: consolidate OverlayLabel and RecraftStepMeta into types/index.ts"
```

---

### Task 2: Add feature flag and DiagramStatus to TutorResponse

**Files:**
- Modify: `lib/homework/types.ts:431-444`
- Create: `.env.local` entry (document only)

- [ ] **Step 1: Add diagramStatus to TutorResponse**

In `lib/homework/types.ts`, find the `TutorResponse` interface (~line 431). Add after the `visualUpdate?` field:

```typescript
  diagramStatus?: DiagramStatus
```

Add import at top of the file:
```typescript
import type { DiagramStatus } from '@/types'
```

- [ ] **Step 2: Add RECRAFT_PIPELINE_VERSION to env**

Add to `.env.local`:
```
RECRAFT_PIPELINE_VERSION=v1
```

Add to `.env.example` (if it exists) or document in CLAUDE.md:
```
# Smart Label Pipeline: 'v1' = old TikZ compositing, 'v2' = SVG overlay
RECRAFT_PIPELINE_VERSION=v1
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add lib/homework/types.ts
git commit -m "feat: add DiagramStatus type and feature flag for Smart Label Pipeline"
```

---

### Task 3: Build LabeledDiagramOverlay component

**Files:**
- Create: `components/homework/diagram/LabeledDiagramOverlay.tsx`
- Create: `__tests__/components/diagrams/LabeledDiagramOverlay.test.tsx`

- [ ] **Step 1: Write failing render test**

Create `__tests__/components/diagrams/LabeledDiagramOverlay.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { LabeledDiagramOverlay } from '@/components/homework/diagram/LabeledDiagramOverlay'
import type { OverlayLabel } from '@/types'

const mockLabels: OverlayLabel[] = [
  { text: 'Cornea', textHe: 'קרנית', x: 5, y: 15, targetX: 28, targetY: 50, found: true, stepGroup: 1 },
  { text: 'Iris', textHe: 'קשתית', x: 95, y: 30, targetX: 42, targetY: 48, found: true, stepGroup: 1 },
  { text: 'Retina', textHe: 'רשתית', x: 95, y: 60, targetX: 65, targetY: 55, found: true, stepGroup: 2 },
]

describe('LabeledDiagramOverlay', () => {
  it('renders image and all labels', () => {
    render(
      <LabeledDiagramOverlay
        imageUrl="https://example.com/eye.png"
        labels={mockLabels}
        locale="en"
        step={null}
      />
    )
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.getByText('Cornea')).toBeInTheDocument()
    expect(screen.getByText('Iris')).toBeInTheDocument()
    expect(screen.getByText('Retina')).toBeInTheDocument()
  })

  it('shows Hebrew labels when locale is he', () => {
    render(
      <LabeledDiagramOverlay
        imageUrl="https://example.com/eye.png"
        labels={mockLabels}
        locale="he"
        step={null}
      />
    )
    expect(screen.getByText('קרנית')).toBeInTheDocument()
    expect(screen.getByText('קשתית')).toBeInTheDocument()
  })

  it('shows only step 1 labels when step=0', () => {
    render(
      <LabeledDiagramOverlay
        imageUrl="https://example.com/eye.png"
        labels={mockLabels}
        locale="en"
        step={0}
      />
    )
    expect(screen.getByText('Cornea')).toBeInTheDocument()
    expect(screen.getByText('Iris')).toBeInTheDocument()
    expect(screen.queryByText('Retina')).not.toBeInTheDocument()
  })

  it('excludes labels with found=false', () => {
    const labelsWithMissing: OverlayLabel[] = [
      ...mockLabels,
      { text: 'Vitreous Humor', x: 5, y: 80, targetX: -1, targetY: -1, found: false },
    ]
    render(
      <LabeledDiagramOverlay
        imageUrl="https://example.com/eye.png"
        labels={labelsWithMissing}
        locale="en"
        step={null}
      />
    )
    expect(screen.queryByText('Vitreous Humor')).not.toBeInTheDocument()
  })

  it('defaults found to true when absent (backward compat)', () => {
    const oldLabel: OverlayLabel = { text: 'Lens', x: 5, y: 40, targetX: 45, targetY: 50 }
    render(
      <LabeledDiagramOverlay
        imageUrl="https://example.com/eye.png"
        labels={[oldLabel]}
        locale="en"
        step={null}
      />
    )
    expect(screen.getByText('Lens')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/diagrams/LabeledDiagramOverlay.test.tsx --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement LabeledDiagramOverlay component**

Create `components/homework/diagram/LabeledDiagramOverlay.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OverlayLabel } from '@/types'

interface LabeledDiagramOverlayProps {
  imageUrl: string
  labels: OverlayLabel[]
  locale: 'en' | 'he'
  step: number | null  // null = show all, 0-based index for progressive
  onLabelClick?: (label: OverlayLabel) => void
}

export function LabeledDiagramOverlay({
  imageUrl,
  labels,
  locale,
  step,
  onLabelClick,
}: LabeledDiagramOverlayProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const isRtl = locale === 'he'

  // Filter: only found labels (default true for backward compat)
  const visibleLabels = labels.filter(l => l.found !== false)

  // Step filtering: stepGroup is 1-based, step prop is 0-based index
  // step=0 shows stepGroup<=1, step=1 shows stepGroup<=2, etc.
  // step=null shows all
  const activeLabels = step === null
    ? visibleLabels
    : visibleLabels.filter(l => (l.stepGroup ?? 0) <= (step + 1))

  const getLabelText = (label: OverlayLabel) => {
    if (isRtl && label.textHe) return label.textHe
    return label.text
  }

  return (
    <div
      className="labeled-diagram-container relative w-full"
      style={{ aspectRatio: '1' }}
      role="img"
      aria-label={`Labeled diagram with ${visibleLabels.length} structures`}
    >
      {/* Layer 1: Base image */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
      )}
      <img
        src={imageUrl}
        alt=""
        className="w-full h-full object-contain rounded-lg"
        onLoad={() => setImageLoaded(true)}
        draggable={false}
      />

      {imageLoaded && (
        <>
          {/* Layer 2: SVG leader lines + dots */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {activeLabels.map((label, i) => (
              <g key={`line-${label.text}-${i}`}>
                <line
                  x1={label.targetX}
                  y1={label.targetY}
                  x2={label.x}
                  y2={label.y}
                  stroke="#6b7280"
                  strokeWidth="0.3"
                  strokeOpacity="0.7"
                />
                <circle
                  cx={label.targetX}
                  cy={label.targetY}
                  r="0.5"
                  fill="#6b7280"
                  fillOpacity="0.8"
                />
              </g>
            ))}
          </svg>

          {/* Layer 3: HTML label text */}
          <AnimatePresence>
            {activeLabels.map((label, i) => (
              <motion.div
                key={`label-${label.text}-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="absolute cursor-default"
                style={{
                  left: `${label.x}%`,
                  top: `${label.y}%`,
                  transform: label.x < 50
                    ? 'translateY(-50%)'
                    : 'translate(-100%, -50%)',
                }}
                dir={isRtl ? 'rtl' : 'ltr'}
                onClick={() => onLabelClick?.(label)}
              >
                <span className="inline-block bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-[10px] sm:text-xs px-1.5 py-0.5 rounded shadow-sm border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  {getLabelText(label)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/diagrams/LabeledDiagramOverlay.test.tsx --no-coverage`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add components/homework/diagram/LabeledDiagramOverlay.tsx __tests__/components/diagrams/LabeledDiagramOverlay.test.tsx
git commit -m "feat: add LabeledDiagramOverlay component with SVG+HTML rendering"
```

---

## Chunk 2: Label Pipeline Backend Functions

### Task 4: Implement label-pipeline.ts (Phases 1-3 + upload)

**Files:**
- Create: `lib/diagram-engine/label-pipeline.ts`
- Create: `__tests__/lib/diagram-engine/label-pipeline.test.ts`

- [ ] **Step 1: Write tests for computeLabelPositions**

Create `__tests__/lib/diagram-engine/label-pipeline.test.ts`:

```typescript
import { computeLabelPositions } from '@/lib/diagram-engine/label-pipeline'

describe('computeLabelPositions', () => {
  it('places left-side labels when targetX < 40', () => {
    const result = computeLabelPositions([
      { text: 'Cornea', found: true, targetX: 28, targetY: 50 },
    ])
    expect(result[0].x).toBe(5)
    expect(result[0].found).toBe(true)
  })

  it('places right-side labels when targetX > 60', () => {
    const result = computeLabelPositions([
      { text: 'Retina', found: true, targetX: 70, targetY: 55 },
    ])
    expect(result[0].x).toBe(95)
  })

  it('distributes middle-zone labels to less crowded side', () => {
    const result = computeLabelPositions([
      { text: 'A', found: true, targetX: 30, targetY: 20 },
      { text: 'B', found: true, targetX: 50, targetY: 50 },
    ])
    // A goes left (targetX<40), B should go right (less crowded)
    expect(result[0].x).toBe(5)
    expect(result[1].x).toBe(95)
  })

  it('enforces 6-unit minimum gap between labels on same side', () => {
    const result = computeLabelPositions([
      { text: 'A', found: true, targetX: 30, targetY: 20 },
      { text: 'B', found: true, targetX: 25, targetY: 22 },
      { text: 'C', found: true, targetX: 35, targetY: 24 },
    ])
    const ys = result.filter(l => l.x === 5).map(l => l.y).sort((a, b) => a - b)
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(6)
    }
  })

  it('excludes labels with found=false', () => {
    const result = computeLabelPositions([
      { text: 'A', found: true, targetX: 30, targetY: 20 },
      { text: 'B', found: false },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('A')
  })

  it('clamps positions to 2-98 safe margins', () => {
    const result = computeLabelPositions([
      { text: 'A', found: true, targetX: 1, targetY: 1 },
    ])
    expect(result[0].targetX).toBeGreaterThanOrEqual(5)
    expect(result[0].targetY).toBeGreaterThanOrEqual(5)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/diagram-engine/label-pipeline.test.ts --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement label-pipeline.ts**

Create `lib/diagram-engine/label-pipeline.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import { createServiceClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import type { OverlayLabel, RecraftStepMeta } from '@/types'

const log = createLogger('diagram:label-pipeline')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ─── Phase 1A: Generate label content from domain knowledge ──────────────────

export interface LabelContent {
  text: string
  textHe: string
  description: string
  descriptionHe: string
  stepGroup: number
}

const LABEL_CONTENT_PROMPT = `You are a science education expert. Given a diagram topic, list every key structure/component that should be labeled in an educational diagram.

For each structure provide:
- "text": correct English scientific/educational name (1-3 words)
- "textHe": correct Hebrew name
- "description": brief English description (one sentence)
- "descriptionHe": brief Hebrew description (one sentence)
- "stepGroup": teaching order group (1-based). Group structures that are taught together (e.g., outer layer = group 1, light control = group 2, inner layer = group 3).

List 6-12 structures. Return ONLY a valid JSON array, no other text.

Topic: "{QUESTION}"`

export async function generateLabelContent(question: string): Promise<LabelContent[]> {
  try {
    const msg = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: LABEL_CONTENT_PROMPT.replace('{QUESTION}', question),
      }],
    })

    const text = msg.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return []

    let jsonStr = text.text.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
    if (fenceMatch) jsonStr = fenceMatch[1].trim()
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (arrayMatch) jsonStr = arrayMatch[0]

    const parsed = JSON.parse(jsonStr) as LabelContent[]
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].text) return []

    return parsed.map((s, i) => ({
      text: s.text || `Structure ${i + 1}`,
      textHe: s.textHe || s.text || `מבנה ${i + 1}`,
      description: s.description || '',
      descriptionHe: s.descriptionHe || s.description || '',
      stepGroup: s.stepGroup ?? 1,
    }))
  } catch (err) {
    log.error({ err }, 'generateLabelContent failed')
    return []
  }
}

// ─── Phase 1B2: Upload base image to Supabase storage ──────────────────────

export async function uploadBaseImage(
  imageUrl: string,
  userId: string,
  diagramHash: string,
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      log.error({ status: response.status }, 'Failed to download Recraft image for upload')
      return null
    }
    const buffer = Buffer.from(await response.arrayBuffer())

    const supabase = createServiceClient()
    const path = `${userId}/${diagramHash}/base.png`

    const { error } = await supabase.storage
      .from('diagram-steps')
      .upload(path, buffer, { contentType: 'image/png', upsert: true })

    if (error) {
      log.error({ error }, 'Supabase upload failed')
      return null
    }

    const { data: publicUrlData } = supabase.storage
      .from('diagram-steps')
      .getPublicUrl(path)

    log.info({ path }, 'Base image uploaded to Supabase')
    return publicUrlData.publicUrl
  } catch (err) {
    log.error({ err }, 'uploadBaseImage failed')
    return null
  }
}

// ─── Phase 2: Focused Vision positioning ─────────────────────────────────────

interface VisionPositionResult {
  text: string
  found: boolean
  targetX?: number
  targetY?: number
}

const VISION_POSITION_PROMPT = `You are placing labels on an educational diagram.

The student asked about: "{QUESTION}"

Here are the structures to locate in this image:
{STRUCTURE_LIST}

For each structure, find its CENTER in the image as (targetX%, targetY%) from the top-left corner (0-100 range).

Return a JSON array with "found" (boolean) for each structure.
If a structure is NOT CLEARLY VISIBLE, set "found" to false and omit targetX/targetY.

Return ONLY a valid JSON array:
[{"text": "Cornea", "found": true, "targetX": 28, "targetY": 50}]`

export async function mapLabelsToImage(
  imageUrl: string,
  labelContent: LabelContent[],
  question: string,
): Promise<VisionPositionResult[]> {
  const structureList = labelContent
    .map((l, i) => `${i + 1}. ${l.text} — ${l.description}`)
    .join('\n')

  const prompt = VISION_POSITION_PROMPT
    .replace('{QUESTION}', question)
    .replace('{STRUCTURE_LIST}', structureList)

  try {
    const msg = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          { type: 'text', text: prompt },
        ],
      }],
    })

    const text = msg.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return []

    let jsonStr = text.text.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
    if (fenceMatch) jsonStr = fenceMatch[1].trim()
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (arrayMatch) jsonStr = arrayMatch[0]

    const parsed = JSON.parse(jsonStr) as VisionPositionResult[]
    if (!Array.isArray(parsed)) return []

    return parsed
  } catch (err) {
    log.error({ err }, 'mapLabelsToImage failed')
    return []
  }
}

// ─── Phase 3: Verification ───────────────────────────────────────────────────

export async function verifyLabelPlacement(
  imageUrl: string,
  labels: OverlayLabel[],
): Promise<OverlayLabel[]> {
  const foundLabels = labels.filter(l => l.found !== false)
  if (foundLabels.length === 0) return labels

  const mapping = foundLabels
    .map(l => `• ${l.text} → center at (${l.targetX}%, ${l.targetY}%)`)
    .join('\n')

  try {
    const msg = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          {
            type: 'text',
            text: `I mapped these structures to coordinates on this image:\n${mapping}\n\nFor each, verify the coordinate points to the CENTER of that structure.\nReturn a JSON array. For each label: {"text": "...", "correct": true} or {"text": "...", "correct": false, "targetX": corrected, "targetY": corrected}\n\nReturn ONLY the JSON array.`,
          },
        ],
      }],
    })

    const text = msg.content.find(b => b.type === 'text')
    if (!text || text.type !== 'text') return labels

    let jsonStr = text.text.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
    if (fenceMatch) jsonStr = fenceMatch[1].trim()
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (arrayMatch) jsonStr = arrayMatch[0]

    const corrections = JSON.parse(jsonStr) as Array<{
      text: string; correct: boolean; targetX?: number; targetY?: number
    }>

    // Apply corrections
    const correctedLabels = labels.map(label => {
      const correction = corrections.find(c => c.text === label.text)
      if (correction && !correction.correct && correction.targetX != null && correction.targetY != null) {
        log.info({ label: label.text, old: { x: label.targetX, y: label.targetY }, new: { x: correction.targetX, y: correction.targetY } }, 'Label corrected')
        return { ...label, targetX: correction.targetX, targetY: correction.targetY }
      }
      return label
    })

    // Recompute label positions after corrections
    return correctedLabels
  } catch (err) {
    log.warn({ err }, 'verifyLabelPlacement failed — using unverified positions')
    return labels
  }
}

// ─── Algorithmic label placement ─────────────────────────────────────────────

interface VisionResult {
  text: string
  found: boolean
  targetX?: number
  targetY?: number
}

export function computeLabelPositions(
  visionResults: VisionResult[],
  labelContent?: LabelContent[],
): OverlayLabel[] {
  // Filter to found labels only
  const found = visionResults.filter(v => v.found && v.targetX != null && v.targetY != null)

  // Clamp target positions to safe margins
  const clamped = found.map(v => ({
    ...v,
    targetX: Math.max(5, Math.min(95, v.targetX!)),
    targetY: Math.max(5, Math.min(95, v.targetY!)),
  }))

  // Determine side for each label
  const leftLabels: typeof clamped = []
  const rightLabels: typeof clamped = []

  for (const label of clamped) {
    if (label.targetX < 40) {
      leftLabels.push(label)
    } else if (label.targetX > 60) {
      rightLabels.push(label)
    } else {
      // Middle zone: put on less crowded side
      if (leftLabels.length <= rightLabels.length) {
        leftLabels.push(label)
      } else {
        rightLabels.push(label)
      }
    }
  }

  // Sort each side by targetY
  leftLabels.sort((a, b) => a.targetY - b.targetY)
  rightLabels.sort((a, b) => a.targetY - b.targetY)

  // Spread labels with 6-unit minimum gap
  function spreadLabels(group: typeof clamped): void {
    for (let i = 1; i < group.length; i++) {
      if (group[i].targetY - group[i - 1].targetY < 6) {
        group[i] = { ...group[i], targetY: Math.min(98, group[i - 1].targetY + 6) }
      }
    }
    for (let i = group.length - 2; i >= 0; i--) {
      if (group[i + 1].targetY - group[i].targetY < 6) {
        group[i] = { ...group[i], targetY: Math.max(2, group[i + 1].targetY - 6) }
      } else {
        break
      }
    }
  }

  spreadLabels(leftLabels)
  spreadLabels(rightLabels)

  // Build final OverlayLabel array
  const result: OverlayLabel[] = []

  for (const label of [...leftLabels, ...rightLabels]) {
    const content = labelContent?.find(c => c.text === label.text)
    const isLeft = leftLabels.includes(label)

    result.push({
      text: label.text,
      textHe: content?.textHe,
      x: isLeft ? 5 : 95,
      y: label.targetY,  // label Y matches the spread-adjusted position
      targetX: label.targetX,
      targetY: label.targetY,
      description: content?.description,
      descriptionHe: content?.descriptionHe,
      stepGroup: content?.stepGroup,
      found: true,
    })
  }

  return result
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/diagram-engine/label-pipeline.test.ts --no-coverage`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/diagram-engine/label-pipeline.ts __tests__/lib/diagram-engine/label-pipeline.test.ts
git commit -m "feat: implement label-pipeline.ts with Phases 1-3 and label positioning"
```

---

## Chunk 3: Wire Up Backend (Recraft Executor, Integration, Tutor Engine)

### Task 5: Update recraft-executor.ts with feature flag branch

**Files:**
- Modify: `lib/diagram-engine/recraft-executor.ts:162-324`

- [ ] **Step 1: Add v2 pipeline path behind feature flag**

In `recraft-executor.ts`, at the top of `generateRecraftDiagram()` (line ~162), add the feature flag branch:

```typescript
export async function generateRecraftDiagram(
  question: string,
  userId?: string,
  skipVerification?: boolean,
): Promise<RecraftResult | RecraftError> {
  const pipelineVersion = process.env.RECRAFT_PIPELINE_VERSION || 'v1'

  if (pipelineVersion === 'v2' && userId) {
    return generateRecraftDiagramV2(question, userId, skipVerification)
  }

  // ... existing v1 code unchanged ...
}
```

Then add the v2 function below:

```typescript
import {
  generateLabelContent,
  mapLabelsToImage,
  verifyLabelPlacement,
  computeLabelPositions,
  uploadBaseImage,
} from './label-pipeline'
import { generateDiagramHash } from './step-capture'

async function generateRecraftDiagramV2(
  question: string,
  userId: string,
  skipVerification?: boolean,
): Promise<RecraftResult | RecraftError> {
  log.info(`[v2] generateRecraftDiagram called: "${question.slice(0, 80)}..."`)

  const { style, is3D } = classifyTopic(question)
  const rewriteTemplate = is3D ? REWRITE_PROMPT_3D : REWRITE_PROMPT_2D

  // Step 1: Rewrite prompt (same as v1)
  let cleanPrompt: string
  try {
    const rewriteMsg = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: rewriteTemplate.replace('{QUESTION}', question) }],
    })
    const rewriteText = rewriteMsg.content.find(b => b.type === 'text')
    cleanPrompt = rewriteText?.type === 'text'
      ? rewriteText.text.trim().slice(0, 950)
      : buildFallbackPrompt(question, is3D)
  } catch {
    cleanPrompt = buildFallbackPrompt(question, is3D)
  }

  // Phase 1: Parallel — label content + Recraft image
  const [labelContent, recraftImage] = await Promise.allSettled([
    generateLabelContent(question),
    generateRecraftImage({
      prompt: cleanPrompt,
      style,
      size: '1024x1024',
      format: 'png',
      negative_prompt: 'callout lines, leader lines, pointer dots, annotation markers, reference lines, label dots, numbered markers, indicator lines',
    }),
  ])

  // Check Recraft result
  if (recraftImage.status === 'rejected') {
    return { error: recraftImage.reason instanceof Error ? recraftImage.reason.message : 'Recraft generation failed' }
  }
  const imageUrl = recraftImage.value.url
  const labels = labelContent.status === 'fulfilled' ? labelContent.value : []

  if (labels.length === 0) {
    log.warn('[v2] No label content generated — returning image without labels')
    return { imageUrl }
  }

  // Phase 1B2: Upload base image to Supabase
  const hash = generateDiagramHash(question, 'recraft')
  const permanentUrl = await uploadBaseImage(imageUrl, userId, hash)
  const finalImageUrl = permanentUrl || imageUrl  // fallback to CDN if upload fails

  // Phase 2: Focused Vision positioning
  const visionPositions = await mapLabelsToImage(finalImageUrl, labels, question)

  if (visionPositions.length === 0) {
    log.warn('[v2] Vision positioning failed — returning image without labels')
    return { imageUrl: finalImageUrl, baseImageUrl: finalImageUrl }
  }

  // Compute label text positions algorithmically
  let overlayLabels = computeLabelPositions(visionPositions, labels)

  // Phase 3: Verification (if not skipped)
  if (!skipVerification && overlayLabels.length > 0) {
    overlayLabels = await verifyLabelPlacement(finalImageUrl, overlayLabels)
    // Recompute positions after corrections
    overlayLabels = computeLabelPositions(
      overlayLabels.map(l => ({ text: l.text, found: l.found !== false, targetX: l.targetX, targetY: l.targetY })),
      labels,
    )
  }

  // Generate step metadata (same as v1)
  let stepMetadata: RecraftStepMeta[] | undefined
  try {
    // ... (reuse existing step metadata generation code from v1, lines 272-309)
  } catch (err) {
    log.warn({ err }, '[v2] Step metadata generation failed')
  }

  log.info({ labelCount: overlayLabels.length }, '[v2] Pipeline complete')

  return {
    imageUrl: finalImageUrl,
    baseImageUrl: finalImageUrl,
    labels: overlayLabels,
    stepMetadata,
  }
}
```

Note: The implementer should extract the step metadata generation code from the existing v1 path (lines 272-309) into a shared helper to avoid duplication.

- [ ] **Step 2: Update generateRecraftDiagram callers to pass userId**

In `lib/diagram-engine/index.ts`, update the `generateRecraftWithQA` function (~line 617) to pass `userId` and `skipVerification`:

The function already has access to `question`. Add `userId` parameter threading from `generateDiagram()` → `runPipeline()` → `generateRecraftWithQA()`.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add lib/diagram-engine/recraft-executor.ts lib/diagram-engine/index.ts
git commit -m "feat: add v2 label pipeline behind RECRAFT_PIPELINE_VERSION flag"
```

---

### Task 6: Update integration.ts to return DiagramStatus

**Files:**
- Modify: `lib/diagram-engine/integration.ts:101-104,152-155`

- [ ] **Step 1: Replace undefined returns with DiagramStatus**

In `integration.ts`, update the error handling at lines 101-104:

```typescript
// Before:
if ('error' in result) {
  log.error({ error: result.error, pipeline: result.pipeline }, 'Generation failed');
  return undefined;
}

// After:
if ('error' in result) {
  log.error({ error: result.error, pipeline: result.pipeline }, 'Generation failed');
  return { engineResult: undefined, diagramStatus: { status: 'failed' as const, reason: result.error } };
}
```

Update the return type of `tryEngineDiagram` and the catch block similarly. The function should return `{ engineResult?: EngineDiagramResult; diagramStatus?: DiagramStatus }`.

- [ ] **Step 2: Commit**

```bash
git add lib/diagram-engine/integration.ts
git commit -m "feat: return DiagramStatus from integration layer instead of undefined"
```

---

### Task 7: Update tutor-engine.ts — error propagation + quick mode Recraft

**Files:**
- Modify: `lib/homework/tutor-engine.ts:740,843-860,963,968-972,1091-1113`

- [ ] **Step 1: Add quick mode Recraft awareness**

In both `generateInitialGreeting` (~line 740) and `generateTutorResponse` (~line 963), replace:

```typescript
const forcePipeline = isQuickMode ? 'tikz' as const : undefined
```

with:

```typescript
const needsRecraft = /\b(anatomy|human eye|human heart|human brain|human lung|human ear|human skin|cell|organ|dna|bacteria|virus|labeled)\b/i
const forcePipeline = isQuickMode
  ? (needsRecraft.test(questionText) ? undefined : 'tikz' as const)
  : undefined
const skipVerification = isQuickMode  // quick mode Recraft skips Phase 3
```

- [ ] **Step 2: Propagate DiagramStatus to TutorResponse**

Update the engine result handling sections (~lines 843-860 and 1091-1113) to set `tutorResponse.diagramStatus` based on the result from `tryEngineDiagram`.

- [ ] **Step 3: Commit**

```bash
git add lib/homework/tutor-engine.ts
git commit -m "feat: quick mode Recraft awareness + DiagramStatus propagation"
```

---

### Task 8: Update chat API route to stream diagramStatus

**Files:**
- Modify: `app/api/homework/sessions/[sessionId]/chat/route.ts:234-243`

- [ ] **Step 1: Include diagramStatus in streamed response**

In the chat route, after the tutor response is generated, include `diagramStatus` in the streamed JSON alongside the conversation message:

```typescript
send({
  type: 'tutor_response',
  message: conversationMessage,
  diagramStatus: tutorResponse.diagramStatus,  // NEW: transient, not persisted
})
```

Do NOT add `diagramStatus` to `ConversationMessage` — it stays transient.

- [ ] **Step 2: Commit**

```bash
git add app/api/homework/sessions/[sessionId]/chat/route.ts
git commit -m "feat: stream diagramStatus alongside conversation message"
```

---

## Chunk 4: Frontend Wiring, Routing, and Cleanup

### Task 9: Wire LabeledDiagramOverlay into DiagramRenderer

**Files:**
- Modify: `components/homework/diagram/DiagramRenderer.tsx:278-323`

- [ ] **Step 1: Add branching logic for Recraft with labels**

In `DiagramRenderer.tsx`, in the `engine_image` rendering path (~line 278), add the branch:

```typescript
import { LabeledDiagramOverlay } from './LabeledDiagramOverlay'

// Inside the engine_image case:
if (engineData.pipeline === 'recraft' && engineData.labels?.length > 0) {
  return (
    <LabeledDiagramOverlay
      imageUrl={engineData.imageUrl}
      labels={engineData.labels}
      locale={locale}
      step={currentStep}
    />
  )
}
// else: fall through to existing EngineDiagramImage
```

- [ ] **Step 2: Add DiagramStatus UI rendering**

Add a component or inline rendering for `diagramStatus` states (generating pulse, failed message, timeout banner). Place this in the chat message component that renders tutor responses.

- [ ] **Step 3: Commit**

```bash
git add components/homework/diagram/DiagramRenderer.tsx
git commit -m "feat: wire LabeledDiagramOverlay into DiagramRenderer for Recraft"
```

---

### Task 10: Add routing patterns and enhance AI router

**Files:**
- Modify: `lib/diagram-engine/router.ts:134,257-271`

- [ ] **Step 1: Add new regex patterns**

In `router.ts`, before line 134 (end of TOPIC_RULES), add:

```typescript
  // Physics motion (natural language word problems)
  { pattern: /\b(ball|object|rock|stone)\b.*\b(kick|throw|launch|fire|shoot|toss|drop)/i, pipeline: 'e2b-matplotlib' },
  { pattern: /\b(slide|roll|push|pull)\b.*\b(ramp|incline|slope|hill)/i, pipeline: 'e2b-matplotlib' },
  { pattern: /\bhow far\b.*\b(travel|land|go|reach)/i, pipeline: 'e2b-matplotlib' },

  // Labeled anatomy (reverse word order)
  { pattern: /\blabeled?\b.*\b(brain|heart|eye|lung|ear|skin|cell|kidney|liver|stomach)/i, pipeline: 'recraft' },
  { pattern: /\b(brain|heart|eye|lung|ear|skin|cell|kidney|liver|stomach)\b.*\blabeled?\b/i, pipeline: 'recraft' },
```

- [ ] **Step 2: Enhance AI router prompt**

In `router.ts`, update `AI_ROUTER_PROMPT` (~line 257) to add after the DECISION RULES:

```
5. Physics word problems describing motion (ball kicked, object thrown, box sliding, how far does it land) → "e2b-matplotlib"
6. Any request containing "labeled" with a body part or organism → "recraft"
```

- [ ] **Step 3: Update Recraft negative prompt**

In `recraft-executor.ts`, in the `generateRecraftDiagram` v1 path, update the Recraft call to pass the enhanced negative prompt:

```typescript
const image = await generateRecraftImage({
  prompt: cleanPrompt,
  style,
  size: '1024x1024',
  format: 'png',
  negative_prompt: 'callout lines, leader lines, pointer dots, annotation markers, reference lines, label dots, numbered markers, indicator lines',
})
```

- [ ] **Step 4: Commit**

```bash
git add lib/diagram-engine/router.ts lib/diagram-engine/recraft-executor.ts
git commit -m "feat: add physics/anatomy routing patterns and enhance negative prompt"
```

---

### Task 11: Integration testing

**Files:** No new files — manual + automated testing

- [ ] **Step 1: Run all existing tests**

Run: `npx jest --no-coverage`
Expected: All existing tests pass (no regressions)

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 3: Manual testing checklist**

With `RECRAFT_PIPELINE_VERSION=v1` (default): verify zero behavior change.

Flip to `RECRAFT_PIPELINE_VERSION=v2` and test:
- [ ] "human eye labeled" → Recraft image + SVG labels in EN
- [ ] "human eye labeled" in Hebrew → Recraft image + Hebrew SVG labels
- [ ] "human brain labeled" → Recraft image + SVG labels
- [ ] "human heart" → Recraft image + SVG labels
- [ ] "plant cell" → Recraft image + SVG labels
- [ ] "ball kicked at 30 m/s at 40 degrees" → matplotlib trajectory diagram
- [ ] "box sliding down ramp" → matplotlib/tikz force diagram
- [ ] Old cached diagrams → still render correctly (no labels = static image)
- [ ] Step-by-step walkthrough → labels reveal progressively
- [ ] Mobile responsive → labels scale correctly

- [ ] **Step 4: Commit any test fixes**

```bash
git add -A
git commit -m "test: verify Smart Label Pipeline integration"
```

---

### Task 12: Deploy with feature flag

- [ ] **Step 1: Deploy with v1 (default)**

Deploy to Vercel. `RECRAFT_PIPELINE_VERSION` defaults to `v1`. Zero behavior change in production.

- [ ] **Step 2: Flip to v2**

Set `RECRAFT_PIPELINE_VERSION=v2` in Vercel environment variables. Redeploy.

- [ ] **Step 3: Monitor and verify**

Check Vercel logs for `[v2]` prefix log messages. Verify diagrams render correctly.

- [ ] **Step 4: If issues: rollback to v1**

Set `RECRAFT_PIPELINE_VERSION=v1` in Vercel. Instant rollback, no code change needed.

---

### Task 13 (Future): Remove v1 code after stable period

After v2 has been stable for 1+ weeks:

- [ ] Remove `compositeWithTikzLabels()` from `recraft-executor.ts`
- [ ] Delete `lib/diagram-engine/step-capture/recraft-steps.ts`
- [ ] Remove Recraft step capture block from `index.ts` (lines 487-526)
- [ ] Remove feature flag check
- [ ] Remove legacy SVG overlay from `EngineDiagramImage.tsx`
- [ ] Commit: `"chore: remove v1 TikZ compositing code after stable v2 rollout"`
