# Smart Label Pipeline — Design Spec

**Date:** 2026-03-18
**Status:** Approved (v3 — post-review)
**Scope:** Diagram labeling system in Homework Helper (generalizable to other features)

## Problem

Recraft generates beautiful anatomical/scientific images, but the labeling system is broken:

1. **Labels missing:** The TikZ compositing chain (E2B sandbox → LaTeX → PDF → PNG) silently fails at 6 different points, returning the raw Recraft image with built-in dots but no text labels.
2. **Labels inaccurate:** Claude Vision is asked to simultaneously identify structures AND estimate their coordinates — two hard tasks in one call, causing both content and positioning errors.
3. **Many topics get no diagram at all:** The pipeline takes 40-60s and frequently times out (60s budget). Errors are silently converted to `undefined` at 8 points in the call chain, giving users zero feedback. Additionally, quick mode (`pipelineMode === 'quick'`) forces TikZ for ALL topics, meaning Recraft is never reached — anatomy/biology topics that need realistic images get routed to TikZ which cannot handle them.
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
    A: Claude generates label list from domain knowledge (bilingual EN+HE)
    B: Recraft generates clean image (enhanced negative prompt)
    B2: Upload base image to Supabase storage
  Phase 2 (~3-5s):
    C: Vision maps known labels to image coordinates (one focused task)
    D: Algorithm computes label text positions (collision-fixing)
  Phase 3 (~3-5s, accurate mode only):
    E: Vision verifies target coordinates, corrects if needed
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
  stepGroup: number;      // pedagogical ordering (1-based)
}
```

Claude assigns `stepGroup` for each label based on the natural teaching order (e.g., for the eye: group 1 = outer layer, group 2 = light control, group 3 = inner layer). This determines the step-by-step walkthrough progression.

This runs in parallel with image generation. ~3-5s, near-zero failure rate. Phase 1 is bottlenecked by Recraft (the slower parallel branch at ~10-15s), so Phase 1A latency doesn't affect total time.

Phase 1A is essential because:
- Label names are always anatomically/scientifically correct (domain knowledge, not Vision guessing)
- Bilingual labels (EN+HE) — Vision cannot produce correct Hebrew scientific terms
- Step grouping for pedagogical walkthrough ordering

**Known limitation:** Claude may list structures that Recraft does not render visibly. Phase 2 handles this via the `found` field — unrecognized structures are excluded rather than placed randomly.

**1B: Recraft generates clean image (enhanced)**

Same Recraft flow as today, but with stronger negative prompts to suppress built-in leader lines and annotation dots.

The enhanced negative prompt terms are passed via the `negative_prompt` parameter in `recraft-executor.ts` when calling `generateRecraftImage()`:

```typescript
// In recraft-executor.ts, passed to generateRecraftImage():
negative_prompt: "callout lines, leader lines, pointer dots, annotation markers, reference lines, label dots, numbered markers, indicator lines"
```

These are additive to the existing text-suppression terms already enforced in `recraft-client.ts` (`text, labels, letters, words, numbers...`). The `combinedNegativePrompt` logic in the client merges both.

**1B2: Upload base image to Supabase storage**

After Recraft generates the image and BEFORE Phase 2:

```typescript
// uploadBaseImage() uses createServiceClient() (service role, bypasses RLS)
// because this runs server-side with no browser auth session.
// Using the regular createClient() would cause silent 403 errors.
const supabase = createServiceClient()
const { data } = await supabase.storage
  .from('diagram-steps')
  .upload(`${userId}/${hash}/base.png`, buffer, { contentType: 'image/png' })
```

Upload path: `{userId}/{hash}/base.png` in the existing `diagram-steps` bucket. Matches the existing RLS policy pattern `{userId}/*`. The permanent Supabase public URL is used for all subsequent operations (Vision receives it, frontend renders it).

### Phase 2: Focused Vision Positioning

Vision receives the Recraft image (via Supabase public URL, using the `url` source type in the Anthropic API — avoids downloading + base64 encoding, saves ~1-2s) plus the pre-generated label list. Its ONLY task is spatial: "where is each structure?"

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

**If the verification call itself fails** (API error, timeout): use the unverified positions from Phase 2, which are already usable. Log the failure but do not block delivery.

### Phase 4: Frontend SVG Overlay

A new `LabeledDiagramOverlay` React component replaces all server-side compositing:

```
Layer structure (position: absolute stacking):
  Layer 1 (bottom): <img> — Recraft image from Supabase storage
  Layer 2 (middle): <svg viewBox="0 0 100 100"> — leader lines + target dots
  Layer 3 (top):    HTML <div> elements — label text with white bg, shadow
```

**Container enforces `aspect-ratio: 1`** because Recraft always generates 1024x1024. This ensures the SVG viewBox (100x100) and HTML percentage positions share the same coordinate space. Without this, non-square containers would cause misalignment between SVG lines and HTML labels.

```css
.labeled-diagram-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;  /* CRITICAL: keeps SVG and HTML coords aligned */
}
```

- **SVG** for geometric elements: `viewBox="0 0 100 100"` with `preserveAspectRatio="none"` (since container is forced square, "none" is safe and matches existing code pattern). `pointer-events: none` so clicks pass through to labels.
- **HTML** for text labels: native RTL support (`dir="rtl"` for Hebrew), proper font rendering, responsive sizing
- **Framer Motion** for step-by-step transitions (fade-in labels by group)

**Image loading:** Layers 2 and 3 (SVG + labels) are hidden until the `<img>` fires `onLoad`. A skeleton placeholder is shown while the image loads, preventing floating labels over empty space.

**Accessibility:** Container has `role="img"` with `aria-label` describing the diagram topic. Labels are wrapped in an `aria-hidden` list for screen readers that lists all structure names.

**Step-by-step walkthrough for Recraft** becomes client-side show/hide:
- Each label has a `stepGroup` number (assigned by Claude in Phase 1A)
- Step N shows labels with `stepGroup <= N` (cumulative reveal)
- Zero server calls, instant transitions, cannot fail
- Replaces the current E2B-based Recraft step image pre-rendering (which takes 25-60s and frequently times out)

**Important: `StepByStepWalkthrough` component is retained for TikZ pipeline.** Only the Recraft step-capture code (`captureRecraftSteps`) is removed. TikZ walkthroughs still use pre-rendered step images via the existing layer-based compilation. The `LabeledDiagramOverlay` component handles Recraft step reveals; `StepByStepWalkthrough` handles TikZ step reveals.

**Frontend branching logic** in `DiagramRenderer.tsx`:
```typescript
// In DiagramRenderer.tsx, within the engine_image rendering path:
if (engineData.pipeline === 'recraft' && engineData.labels?.length > 0) {
  return <LabeledDiagramOverlay imageUrl={...} labels={...} locale={...} step={...} />
} else {
  return <EngineDiagramImage ... />  // existing component for TikZ/matplotlib/latex
}
```

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
  textHe?: string;           // "קרנית" (NEW, optional for backward compat)
  x: number;                 // label text position — COMPUTED by algorithm
  y: number;
  targetX: number;           // structure location — from Vision
  targetY: number;
  description?: string;      // for walkthrough text (NEW)
  descriptionHe?: string;    // Hebrew description (NEW)
  stepGroup?: number;        // which walkthrough step (NEW)
  found?: boolean;           // Vision confirmed structure is visible (NEW, defaults to true when absent)
}
```

**Backward compatibility:** All new fields are optional. Old cached/persisted diagrams that lack `textHe`, `found`, `stepGroup`, etc. will render correctly:
- `found` defaults to `true` when absent (so old labels are not filtered out)
- `textHe` falls back to `text` when absent
- `stepGroup` defaults to `0` (all labels shown at once) when absent

All existing imports of `OverlayLabel` are updated to import from `@/types`. This includes:
- `recraft-executor.ts` (original definition)
- `EngineDiagramImage.tsx` (local redeclaration)
- `integration.ts` (inline type on `EngineDiagramResult`)
- `index.ts` (import from recraft-executor)
- `step-capture/recraft-steps.ts` (import from recraft-executor)

`RecraftStepMeta` also moves to `types/index.ts` alongside `OverlayLabel`, since it's used in the `DiagramStatus` success variant and in `TutorResponse`.

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

### DiagramStatus API Flow

`diagramStatus` is a **transient response-only field**. It is NOT persisted in `ConversationMessage` (which is stored in the database). It flows through the API like this:

```
tutor-engine.ts sets tutorResponse.diagramStatus
  → chat/route.ts reads tutorResponse.diagramStatus
  → Streamed JSON includes diagramStatus as a separate field:
    send({ type: 'tutor_response', message: conversationMessage, diagramStatus: tutorResponse.diagramStatus })
  → Frontend reads diagramStatus from the streamed response
  → diagramStatus is NOT added to ConversationMessage — old clients simply ignore it
```

The `ConversationMessage` type is unchanged. The `diagramStatus` lives alongside it in the API response, not inside it. Old clients that don't know about `diagramStatus` continue to work — they just don't show status messages.

### Changes in Error Chain

- `integration.ts`: Return typed `DiagramStatus` instead of `undefined`
- `tutor-engine.ts`: Set `tutorResponse.diagramStatus` in all cases (generating, success, failed, timeout) instead of silently swallowing
- Chat API route: Include `diagramStatus` in the streamed response JSON alongside `ConversationMessage`
- Frontend: Render appropriate UI state based on `diagramStatus`

## Routing Improvements

### Quick Mode Awareness

**Critical fix:** Quick mode (`pipelineMode === 'quick'`) currently forces ALL topics through TikZ (`forcePipeline = 'tikz'`). This means Recraft is never reached for anatomy/biology topics in quick mode — they fail silently because TikZ cannot render realistic images.

Since the new pipeline is ~20s (well within the 60s budget), Recraft should be selectively available in quick mode:

```typescript
// In tutor-engine.ts, when determining forcePipeline:
const isQuickMode = pipelineMode === 'quick'

// NEW: In quick mode, allow Recraft for topics that NEED realistic images
// (anatomy, cells, organisms). These cannot be rendered by TikZ at all.
const needsRecraft = /\b(anatomy|human eye|human heart|human brain|cell|organ|dna|bacteria|virus|labeled)\b/i
const forcePipeline = isQuickMode
  ? (needsRecraft.test(questionText) ? undefined : 'tikz' as const)  // let AI router pick for Recraft topics
  : undefined
```

This means: in quick mode, anatomy topics go through the AI router (which will pick Recraft), while all other topics still get the fast TikZ path. Quick mode Recraft skips QA and verification (Phase 3) to stay fast.

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
| Base Recraft image | Supabase storage via `createServiceClient()` | Recraft CDN URLs expire |
| Label JSON array | Stored with diagram result in homework session | Frontend needs it to render SVG overlay |
| Step metadata | Stored with diagram result | Walkthrough text explanations |

## Cache Compatibility

The diagram cache (`getCachedDiagram` / `cacheDiagram` in `index.ts`) stores `DiagramResult` objects. After this migration:

- **Old cached Recraft results** contain TikZ-composited `imageUrl` (base64 data URLs) with no overlay label data. These continue to work — `EngineDiagramImage` renders them as static images (no SVG overlay).
- **New cached Recraft results** contain `baseImageUrl` (Supabase URL), `labels` (OverlayLabel[]), and `stepMetadata`. `LabeledDiagramOverlay` renders them with SVG overlay.
- **Frontend handles both:** if `labels?.length > 0`, use `LabeledDiagramOverlay`; otherwise fall back to `EngineDiagramImage`. No cache invalidation needed.

Old homework sessions with persisted diagram data also render correctly because all new `OverlayLabel` fields are optional with safe defaults.

## Feature Flag

For production safety, a feature flag controls which pipeline is used:

```
RECRAFT_PIPELINE_VERSION=v2  # 'v1' = old TikZ compositing, 'v2' = SVG overlay
```

- `v1` (default during rollout): existing TikZ compositing pipeline, zero behavior change
- `v2`: new Smart Label Pipeline with SVG overlay

This allows instant rollback without a deploy. The flag is checked in `recraft-executor.ts` at the start of `generateRecraftDiagram()`. Both code paths coexist during the migration period. The old `compositeWithTikzLabels()` function is kept as dead code for one release cycle, then removed.

## Code Impact

### Removed (~460 LOC, after feature flag period)
- `compositeWithTikzLabels()` in `recraft-executor.ts` (~142 LOC) — entire E2B/TikZ chain
- `step-capture/recraft-steps.ts` (entire file, ~225 LOC) — pre-rendered Recraft step images
- Recraft step capture block in `index.ts` lines 487-526 (~40 LOC) — dynamic import + timeout race
- Legacy SVG overlay in `EngineDiagramImage.tsx` (~50 LOC)
- Current Vision labeling code in `recraft-executor.ts` (replaced, ~142 LOC shared with new code)

### Added (~480 LOC)
- `generateLabelContent()` — Claude text call for bilingual label list with stepGroups (~60 LOC)
- `mapLabelsToImage()` — focused Vision positioning using URL source type (~60 LOC)
- `verifyLabelPlacement()` — verification Vision pass with graceful failure (~50 LOC)
- `computeLabelPositions()` — algorithmic label placement (~40 LOC)
- `uploadBaseImage()` — upload Recraft image to Supabase via `createServiceClient()` (~30 LOC)
- `LabeledDiagramOverlay` — React component with SVG+HTML rendering, image onLoad, a11y (~220 LOC)
- `DiagramStatus` types, `TutorResponse.diagramStatus` field, and frontend UI states (~20 LOC)

### Net: ~neutral during feature flag period, then ~460 LOC removed when v1 is deleted

## Scope Boundaries

### In Scope
- Recraft label pipeline rewrite (Phases 1-4)
- Frontend `LabeledDiagramOverlay` component
- Error surfacing in homework tutor
- Routing pattern additions + quick mode Recraft awareness
- Recraft negative prompt enhancement
- Base image persistence to Supabase storage
- Feature flag for safe rollout
- Backward compatibility with old cached/persisted diagrams

### Out of Scope
- TikZ diagram pipeline (unchanged — still used for schematics)
- E2B matplotlib pipeline (unchanged — still used for graphs)
- E2B LaTeX pipeline (unchanged — still used for math typesetting)
- Course generation diagrams (future work, same architecture applies)
- Interactive label editing by users
- Specialized spatial models (GroundingDINO etc. — future optimization)

## Migration Strategy

1. Consolidate `OverlayLabel` and `RecraftStepMeta` types into `types/index.ts`. Remove duplicates from `recraft-executor.ts`, `EngineDiagramImage.tsx`, `integration.ts` inline type. Update imports in `index.ts` and `step-capture/recraft-steps.ts`.
2. Add `RECRAFT_PIPELINE_VERSION` feature flag (default `v1` = no behavior change)
3. Build `LabeledDiagramOverlay` component alongside existing `EngineDiagramImage`
4. Implement new label generation functions (`generateLabelContent`, `mapLabelsToImage`, `verifyLabelPlacement`, `computeLabelPositions`)
5. Add `uploadBaseImage()` for persisting Recraft images to Supabase storage (uses `createServiceClient()`)
6. Update `recraft-executor.ts`: behind `v2` flag, use new pipeline (Phase 1 parallel generation → upload → Phase 2 Vision → Phase 3 verification). Keep `compositeWithTikzLabels` for `v1` flag.
7. Add `DiagramStatus` type and `diagramStatus` field to `TutorResponse` in `lib/homework/types.ts`
8. Update `integration.ts` to return `DiagramStatus` instead of `undefined`
9. Update `tutor-engine.ts` to set `tutorResponse.diagramStatus` in all cases
10. Update chat API route to stream `diagramStatus` alongside `ConversationMessage` (transient, not persisted)
11. Update frontend `DiagramRenderer.tsx`: check `pipeline === 'recraft' && labels?.length > 0` → `LabeledDiagramOverlay`, else → `EngineDiagramImage`. Render `DiagramStatus` UI states.
12. Update Recraft negative prompt in `recraft-executor.ts` (additive terms passed via `generateRecraftImage()` params)
13. Add quick mode Recraft awareness in `tutor-engine.ts` (anatomy topics bypass TikZ force)
14. Add new routing patterns to `router.ts` and enhance AI router prompt
15. Test with: human eye labeled, human brain labeled, human heart, plant cell, ball kicked at 30 m/s at 40°, box sliding down ramp. Test in both EN and HE. Test old cached diagrams still render.
16. Deploy with `RECRAFT_PIPELINE_VERSION=v1`, flip to `v2` after manual QA
17. After stable period: remove `compositeWithTikzLabels`, delete `step-capture/recraft-steps.ts`, remove Recraft step capture block from `index.ts` lines 487-526, remove feature flag

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Vision still misplaces labels (~±5% accuracy) | Verification pass catches gross errors; algorithmic placement ensures labels don't overlap |
| Claude lists structures not in the image | Vision returns explicit `found: false` field, label excluded from rendering |
| Recraft still generates dots despite negative prompt | Stronger negative prompt; dots are cosmetic only, SVG labels are clear |
| SVG overlay misaligns on non-square containers | Container enforces `aspect-ratio: 1`; Recraft always generates 1024x1024 |
| Hebrew labels render incorrectly | HTML div with `dir="rtl"` — native browser support, no special handling |
| Old cached diagrams break after migration | All new OverlayLabel fields are optional with safe defaults; frontend handles both old and new formats |
| New pipeline has unexpected bugs in production | Feature flag (`RECRAFT_PIPELINE_VERSION`) enables instant rollback to v1 without deploy |
| Verification call (Phase 3) fails | Graceful fallback to unverified Phase 2 positions; log failure but don't block delivery |
| Supabase upload fails | Log error; Vision falls back to Recraft CDN URL (may expire later but works short-term) |
| Quick mode Recraft too slow | Recraft in quick mode skips QA and verification (Phase 3), keeping it under ~20s |
