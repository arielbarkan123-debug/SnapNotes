# Smart Label Pipeline — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Scope:** Diagram labeling system in Homework Helper (generalizable to other features)

## Problem

Recraft generates beautiful anatomical/scientific images, but the labeling system is broken:

1. **Labels missing:** The TikZ compositing chain (E2B sandbox → LaTeX → PDF → PNG) silently fails at 6 different points, returning the raw Recraft image with built-in dots but no text labels.
2. **Labels inaccurate:** Claude Vision is asked to simultaneously identify structures AND estimate their coordinates — two hard tasks in one call, causing both content and positioning errors.
3. **Many topics get no diagram at all:** The pipeline takes 40-60s and frequently times out (60s budget). Errors are silently converted to `undefined` at 8 points in the call chain, giving users zero feedback.
4. **Silent failure cascade:** `recraft-executor.ts` → `index.ts` → `integration.ts` → `tutor-engine.ts` — each layer catches errors and returns `undefined`. User sees a text-only answer with no indication a diagram was attempted.

## Solution: Smart Label Pipeline

Replace the fragile server-side TikZ compositing with a three-phase label generation pipeline and client-side SVG rendering.

### Architecture Overview

```
CURRENT (fragile, ~40-60s):
  Claude rewrites prompt
  → Recraft generates image
  → Vision identifies + places labels (two tasks, one call)
  → E2B sandbox → download image → TikZ .tex → pdflatex → PDF→PNG → base64
  → 6 silent failure points, any one kills all labels

PROPOSED (robust, ~18-25s):
  Phase 1 (parallel, ~10-15s):
    A: Claude generates label list from domain knowledge (bilingual)
    B: Recraft generates clean image (enhanced negative prompt)
  Phase 2 (~3-5s):
    C: Vision maps known labels to image coordinates (one focused task)
    D: Algorithm computes label text positions (collision-fixing)
  Phase 3 (~3-5s, accurate mode only):
    E: Vision verifies label placement, corrects if needed
  Phase 4 (instant, client-side):
    F: Frontend renders SVG overlay (lines + dots) + HTML labels (text)
```

### Phase 1: Parallel Label Content + Image Generation

**1A: Claude generates structured label list**

A text-only Claude call (no image needed) generates the label content from domain knowledge:

```typescript
interface LabelContent {
  text: string;           // "Cornea"
  textHe: string;         // "קרנית"
  description: string;    // "Transparent front layer that refracts light"
  descriptionHe: string;  // "שכבה שקופה קדמית שמשברת אור"
}
```

This runs in parallel with image generation. ~3-5s, near-zero failure rate. Phase 1 is bottlenecked by Recraft (the slower parallel branch at ~10-15s), so Phase 1A latency doesn't affect total time. The label names are always anatomically/scientifically correct because they come from Claude's domain knowledge, not from Vision guessing what's in an image.

**1B: Recraft generates clean image (enhanced)**

Same Recraft flow as today, but with stronger negative prompts to suppress built-in leader lines and annotation dots:

```
Added to negative_prompt:
"callout lines, leader lines, pointer dots, annotation markers,
 reference lines, label dots, numbered markers, indicator lines"
```

This ensures the SVG overlay is the ONLY labeling layer — no double-dots from Recraft's own rendering.

The base image is uploaded to Supabase storage before Phase 2 (Recraft CDN URLs expire). Vision receives the permanent Supabase URL, not the ephemeral Recraft CDN URL. Upload path: `diagrams/{userId}/{hash}.png` in the existing `diagram-steps` bucket. This uses `uploadStepImages()` from the existing step-capture code (retained for this purpose).

### Phase 2: Focused Vision Positioning

Vision receives the Recraft image + the pre-generated label list. Its ONLY task is spatial: "where is each structure?"

```
Prompt: "Here are the structures in this image: Cornea, Iris, Pupil, Lens,
Retina, Optic Nerve, Sclera, Vitreous Humor.

For each, find its CENTER in the image as (targetX%, targetY%) from the top-left corner.
Return a JSON array with 'found' (boolean) for each structure.
If a structure is NOT CLEARLY VISIBLE, set 'found' to false and omit targetX/targetY."
```

Output per label:
```json
[
  { "text": "Cornea", "found": true, "targetX": 28, "targetY": 50 },
  { "text": "Vitreous Humor", "found": false }
]
```

Vision returns an explicit `found` field (no sentinel values). Vision does NOT decide label text positions.

**Algorithmic label placement** computes the `x, y` positions where label text appears:
- `targetX < 40` → label on left margin (`x = 5`)
- `targetX > 60` → label on right margin (`x = 95`)
- Middle zone → whichever side is less crowded
- Sort by `targetY` per side, enforce 6-unit minimum gap (existing algorithm)

Labels with `found: false` are excluded from rendering.

### Phase 3: Verification (Accurate Mode Only)

Vision verifies that each `targetX/targetY` correctly identifies the center of the named structure. This is a spatial accuracy check, not a layout check.

```
"I mapped these structures to coordinates on this image:
• Cornea → center at (28%, 50%)
• Iris → center at (35%, 48%)
• Retina → center at (60%, 30%)

For each, verify the coordinate points to the CENTER of that structure.
Return CORRECT or provide corrected (targetX%, targetY%)."
```

If corrections are returned, they are applied. Maximum 1 correction round (no infinite loop). Skipped in quick mode.

### Phase 4: Frontend SVG Overlay

A new `LabeledDiagramOverlay` React component replaces all server-side compositing:

```
Layer structure (position: absolute stacking):
  Layer 1 (bottom): <img> — Recraft image from Supabase storage
  Layer 2 (middle): <svg viewBox="0 0 100 100"> — leader lines + target dots
  Layer 3 (top):    HTML <div> elements — label text with white bg, shadow
```

- **SVG** for geometric elements: `viewBox="0 0 100 100"` with `preserveAspectRatio="xMidYMid meet"`. Assumes 1:1 aspect ratio images (Recraft always generates 1024x1024). If non-square sizes are ever used, the SVG viewBox must match the aspect ratio.
- **HTML** for text labels: native RTL support (`dir="rtl"` for Hebrew), proper font rendering, responsive sizing, accessibility
- **Framer Motion** for step-by-step transitions (fade-in labels by group)

**Step-by-step walkthrough for Recraft** becomes client-side show/hide:
- Each label has a `stepGroup` number mapping it to a teaching step
- Step N shows labels with `stepGroup <= N` (cumulative reveal)
- Zero server calls, instant transitions, cannot fail
- Replaces the current E2B-based Recraft step image pre-rendering (which takes 25-60s and frequently times out)

**Important: `StepByStepWalkthrough` component is retained for TikZ pipeline.** Only the Recraft step-capture code (`captureRecraftSteps`) is removed. TikZ walkthroughs still use pre-rendered step images via the existing layer-based compilation. The `LabeledDiagramOverlay` component handles Recraft step reveals; `StepByStepWalkthrough` handles TikZ step reveals. The frontend checks `pipeline === 'recraft'` to decide which component to render.

### Component Interface

```typescript
<LabeledDiagramOverlay
  imageUrl={string}              // Supabase storage URL
  labels={OverlayLabel[]}        // from API response
  locale={"en" | "he"}           // determines text field + direction
  step={number | null}           // null = show all, 0-N = progressive
  onLabelClick={(label) => void} // optional: expand description
/>
```

### Updated OverlayLabel Interface

Canonicalized in `types/index.ts` (removing duplicate definitions from `recraft-executor.ts`, `EngineDiagramImage.tsx`, and the inline type on `EngineDiagramResult` in `integration.ts`):

```typescript
// types/index.ts — single source of truth
interface OverlayLabel {
  text: string;              // "Cornea" (same as today)
  textHe: string;            // "קרנית" (NEW)
  x: number;                 // label text position — COMPUTED by algorithm
  y: number;
  targetX: number;           // structure location — from Vision
  targetY: number;
  description?: string;      // for walkthrough text (NEW)
  descriptionHe?: string;    // Hebrew description (NEW)
  stepGroup?: number;        // which walkthrough step (NEW)
  found: boolean;            // Vision confirmed this structure is visible (NEW)
}
```

All existing imports of `OverlayLabel` from `recraft-executor.ts` or local redeclarations are updated to import from `@/types`.

## Error Surfacing

Replace the silent `undefined` cascade with typed status feedback.

### DiagramStatus Type

```typescript
type DiagramStatus =
  | { status: 'generating' }
  | { status: 'success'; imageUrl: string; labels: OverlayLabel[]; stepMetadata: RecraftStepMeta[] }
  | { status: 'failed'; reason: string; fallbackText?: string }
  | { status: 'timeout'; willRetryOnNext: boolean }
```

### User-Facing Messages

| Status | UI | Message |
|--------|-----|---------|
| `generating` | Pulse animation placeholder | "Creating detailed diagram..." |
| `success` | Labeled diagram with SVG overlay | (none needed) |
| `timeout` | Text answer + info banner | "Diagram is still generating — it'll appear when ready." |
| `failed` | Text answer + warning | "Could not generate diagram for this topic." |
| `credits_exhausted` | Text answer + error | "Diagram generation unavailable — image credits exhausted." |

### Type Integration

`DiagramStatus` is added to `TutorResponse` as an optional top-level field alongside the existing `diagram`:

```typescript
// In lib/homework/types.ts
interface TutorResponse {
  // ... existing fields ...
  diagram?: TutorDiagramState;         // existing — set on success
  diagramStatus?: DiagramStatus;       // NEW — always set when diagrams are enabled
}
```

This is additive (no breaking change). When `diagramStatus.status === 'success'`, `diagram` is also populated. When `status` is `'failed'` or `'timeout'`, `diagram` is `undefined` but `diagramStatus` carries the reason.

### Changes in Error Chain

- `integration.ts`: Return `{ status: 'failed', reason }` instead of `undefined`
- `tutor-engine.ts`: Set `tutorResponse.diagramStatus` in all cases (generating, success, failed, timeout) instead of silently swallowing
- Chat API route: Include `diagramStatus` in the streamed response JSON
- Frontend: Render appropriate UI state based on `diagramStatus`

## Routing Improvements

### New Regex Patterns

```typescript
// Physics motion (natural language)
{ pattern: /\b(ball|object|rock|stone)\b.*\b(kick|throw|launch|fire|shoot|toss|drop)/i, pipeline: 'e2b-matplotlib' },
{ pattern: /\b(slide|roll|push|pull)\b.*\b(ramp|incline|slope|hill)/i, pipeline: 'e2b-matplotlib' },
{ pattern: /\bhow far\b.*\b(travel|land|go|reach)/i, pipeline: 'e2b-matplotlib' },

// Labeled anatomy (reverse word order)
{ pattern: /\blabeled?\b.*\b(brain|heart|eye|lung|ear|skin|cell|kidney|liver|stomach)/i, pipeline: 'recraft' },
{ pattern: /\b(brain|heart|eye|lung|ear|skin|cell|kidney|liver|stomach)\b.*\blabeled?\b/i, pipeline: 'recraft' },
```

### AI Router Prompt Enhancement

Add to the AI router system prompt:
```
- Physics word problems describing motion (ball kicked, object thrown, box sliding)
  should use "e2b-matplotlib" for trajectory/force diagrams
- Any request containing "labeled" with a body part or organism
  should use "recraft" for realistic illustrated diagrams
```

### Timeout Budget

The new pipeline averages ~20s (vs ~45s current), providing ~40s headroom within the 60s budget. Timeout failures become rare rather than common.

## Data Persistence

| Data | Storage | Reason |
|------|---------|--------|
| Base Recraft image | Supabase storage (upload after generation) | Recraft CDN URLs expire |
| Label JSON array | Stored with diagram result in homework session | Frontend needs it to render SVG overlay |
| Step metadata | Stored with diagram result | Walkthrough text explanations |

## Code Impact

### Removed (~1000 LOC)
- `compositeWithTikzLabels()` in `recraft-executor.ts` (140 LOC) — entire E2B/TikZ chain
- `captureRecraftSteps()` in `step-capture/recraft-steps.ts` (225 LOC) — pre-rendered step images
- E2B sandbox creation, LaTeX template, PDF→PNG conversion, base64 encoding
- Legacy SVG overlay code in `EngineDiagramImage.tsx`

### Added (~450 LOC)
- `generateLabelContent()` — Claude text call for label list (~50 LOC)
- `mapLabelsToImage()` — focused Vision positioning (~60 LOC)
- `verifyLabelPlacement()` — verification Vision pass (~50 LOC)
- `computeLabelPositions()` — algorithmic label placement (~40 LOC)
- `uploadBaseImage()` — upload Recraft image to Supabase storage (~30 LOC)
- `LabeledDiagramOverlay` — React component with SVG+HTML rendering (~200 LOC)
- `DiagramStatus` types, `TutorResponse.diagramStatus` field, and frontend UI states

### Net: ~550 lines removed

## Scope Boundaries

### In Scope
- Recraft label pipeline rewrite (Phases 1-4)
- Frontend `LabeledDiagramOverlay` component
- Error surfacing in homework tutor
- Routing pattern additions
- Recraft negative prompt enhancement
- Base image persistence to Supabase storage

### Out of Scope
- TikZ diagram pipeline (unchanged — still used for schematics)
- E2B matplotlib pipeline (unchanged — still used for graphs)
- E2B LaTeX pipeline (unchanged — still used for math typesetting)
- Course generation diagrams (future work, same architecture applies)
- Interactive label editing by users
- Specialized spatial models (GroundingDINO etc. — future optimization)

## Migration Strategy

1. Consolidate `OverlayLabel` type into `types/index.ts`, remove duplicates from `recraft-executor.ts`, `EngineDiagramImage.tsx`, and `integration.ts` inline type
2. Build `LabeledDiagramOverlay` component alongside existing `EngineDiagramImage`
3. Implement new label generation functions (`generateLabelContent`, `mapLabelsToImage`, `verifyLabelPlacement`, `computeLabelPositions`)
4. Add `uploadBaseImage()` for persisting Recraft images to Supabase storage
5. Update `recraft-executor.ts` to use new pipeline: Phase 1 parallel generation → upload base image → Phase 2 focused Vision → Phase 3 verification. Remove `compositeWithTikzLabels`
6. Add `DiagramStatus` type and `diagramStatus` field to `TutorResponse` in `types.ts`
7. Update `integration.ts` to return `DiagramStatus` instead of `undefined`
8. Update `tutor-engine.ts` to set `tutorResponse.diagramStatus` in all cases
9. Update chat API route to include `diagramStatus` in response
10. Update frontend: render `DiagramStatus` UI states, use `LabeledDiagramOverlay` when `pipeline === 'recraft'`, keep `StepByStepWalkthrough` for TikZ
11. Remove `captureRecraftSteps` (Recraft-specific only — TikZ step capture remains)
12. Add new routing patterns to `router.ts` and enhance AI router prompt
13. Update Recraft negative prompt in `recraft-client.ts`
14. Test with: human eye, human brain, human heart, plant cell, ball kicked at angle, box on ramp

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Vision still misplaces labels (~±5% accuracy) | Verification pass catches gross errors; algorithmic placement ensures labels don't overlap |
| Claude lists structures not in the image | Vision returns explicit `found: false` field (no sentinel values), label excluded from rendering |
| Recraft still generates dots despite negative prompt | Stronger negative prompt; dots are cosmetic only, SVG labels are clear |
| SVG overlay misaligns on some browsers | Percentage-based coords with viewBox; test on Chrome, Safari, Firefox, mobile |
| Hebrew labels render incorrectly | HTML div with `dir="rtl"` — native browser support, no special handling |
