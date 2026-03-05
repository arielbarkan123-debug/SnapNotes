# Step-Capture Pipeline — Design Document

**Date:** 2026-03-05
**Status:** Approved
**Scope:** Diagram engine — TikZ, Matplotlib, and LaTeX pipelines

---

## Problem

The current step-by-step diagram system has a separate, on-demand rendering flow:

1. A parallel AI call (`generateLayeredTikz`) generates TikZ with layer markers
2. Only works for TikZ pipeline (no matplotlib or LaTeX coverage)
3. When the user clicks "Step by Step", a separate API call (`/api/diagrams/render-steps`) compiles N cumulative steps via QuickLaTeX
4. Steps are compiled on demand — slow, error-prone, and not cached

This means step-by-step is: TikZ-only, slow to load, and architecturally separate from the main generation flow.

## Solution: Step-Capture Pipeline

**Core principle:** Generate the diagram with step markers → compile at each step → save step images to Supabase Storage during generation → frontend gets instant pre-rendered steps.

### Architecture

```
Current:
  AI → full code → compile once → 1 image
  (later) User clicks "Step by Step" → slice code → compile N times → N images

New:
  AI → full code WITH step markers → compile at each checkpoint → save N images
  User clicks "Step by Step" → images already exist → instant walkthrough
```

One holistic AI generation (one API call) produces code structured with step markers. The AI plans the full diagram but writes it in pedagogical stages. We compile at each cumulative checkpoint, upload each step image to Supabase Storage, and embed the URLs in the diagram result.

### What Changes

- Diagram generation pipelines gain step awareness (prompt changes + compile-per-step logic)
- Step images uploaded to Supabase Storage during generation
- `DiagramResult` expands to include `stepImages[]`
- Frontend `StepByStepWalkthrough` loads pre-saved images (no API call)

### What Gets Eliminated

- `layered-tikz-generator.ts` — replaced by in-pipeline step capture
- `/api/diagrams/render-steps` API route — no longer needed
- `step-renderer.ts` `renderStepByStep()` — replaced by compile-during-generation
- Parallel `generateLayeredTikz` call in `integration.ts`

### What Stays the Same

- Routing (`routeQuestion()`)
- QA system (runs on final image)
- Cache (final diagram cached; step URLs are part of result)
- Fallback chain
- Frontend walkthrough UI (mostly unchanged, loads from URLs)

---

## Per-Pipeline Implementation

### TikZ Pipeline

AI generates TikZ with `% === STEP N: Description ===` markers. We compile cumulative subsets via QuickLaTeX:

```
Step 1: compile layers 0+1 → save step_1.png → upload
Step 2: compile layers 0+1+2 → save step_2.png → upload
Step 3: compile layers 0+1+2+3 → save step_3.png → upload (= final image)
```

Uses existing `parseTikzLayers()` and `buildCumulativeStep()` from `tikz-layer-parser.ts` — these functions are preserved but called during generation instead of on-demand.

### Matplotlib Pipeline

AI generates Python with `# === STEP N: Description ===` markers. We inject `plt.savefig(f'step_{n}.png')` calls after each marker. One E2B sandbox execution produces all step PNGs:

```python
fig, ax = plt.subplots(figsize=(10,8))

# === STEP 1: Set up coordinate axes ===
ax.set_xlabel('x'); ax.set_ylabel('y'); ax.grid(True)
plt.savefig('step_1.png')  # ← injected by pipeline

# === STEP 2: Plot the parabola ===
x = np.linspace(-2, 6, 300)
ax.plot(x, x**2 - 4*x + 3, 'b-', linewidth=2)
plt.savefig('step_2.png')  # ← injected by pipeline

# === STEP 3: Mark vertex and roots ===
ax.plot(2, -1, 'ro', markersize=10)
ax.annotate('Vertex (2,-1)', xy=(2,-1), ...)
plt.savefig('step_3.png')  # ← injected (= final)
```

One E2B run, N PNGs extracted from sandbox filesystem.

### LaTeX Pipeline

AI generates LaTeX with `% === STEP N: Description ===` markers. We compile each cumulative subset separately via E2B sandbox (LaTeX runs inside E2B, not QuickLaTeX):

```latex
% === STEP 1: Write the equation ===
\begin{align}
2x + 5 &= 13
\end{align}

% === STEP 2: Subtract 5 from both sides ===
\begin{align}
2x + 5 &= 13 \\
2x &= 8
\end{align}

% === STEP 3: Divide by 2 ===
\begin{align}
2x + 5 &= 13 \\
2x &= 8 \\
x &= \boxed{4}
\end{align}
```

Each cumulative subset compiled to PDF → converted to PNG → uploaded.

---

## Teacher Whiteboard Order

The AI prompt includes per-topic ordering rules so steps follow the pedagogical sequence a teacher would use on a whiteboard.

| Topic | Teacher Order | Rationale |
|-------|--------------|-----------|
| **Free Body Diagram** | Object → Weight → Normal → Applied → Friction → Net force | Identify forces: "always there" → "causing motion" → "resisting" |
| **Inclined Plane** | Surface → Object → Weight → Decompose components → Normal → Friction | Must decompose gravity BEFORE discussing normal |
| **Function Graph** | Axes + grid → Plot curve → Key points (roots, vertex) → Labels + legend | Shape before details |
| **Projectile Motion** | Ground + launch → Trajectory arc → Velocity vectors → Height/range → Calculations | Trajectory first, analysis second |
| **Circuit** | Battery → Main path → Components → Current arrows → Values | Follow the current flow |
| **Geometry** | Given shape → Construction lines → Mark angles/sides → Measurements → Conclusion | Build from given → find answer |
| **Equation Solving** | Original equation → First operation → Each simplification → Boxed answer | Standard algebraic sequence |
| **Long Division** | Dividend ÷ Divisor → First digit → Subtract → Bring down → Repeat → Remainder | Standard algorithm |

These are embedded in per-pipeline system prompts, not hardcoded — the AI uses them as guidance, and naturally adapts the step count and content to the specific question.

---

## Data Model

### Supabase Storage

```
Bucket: diagram-steps
Path:   {userId}/{diagramHash}/step_{N}.png

Example:
  diagram-steps/user_abc123/7f8a2b/step_1.png
  diagram-steps/user_abc123/7f8a2b/step_2.png
  diagram-steps/user_abc123/7f8a2b/step_3.png
```

### DiagramResult Extension

```typescript
interface DiagramResult {
  imageUrl: string;          // final diagram (existing)
  pipeline: Pipeline;        // (existing)
  attempts: number;          // (existing)
  qaVerdict: string;         // (existing)
  code?: string;             // (existing)
  // NEW:
  stepImages?: StepImage[];  // pre-rendered step images
}

interface StepImage {
  url: string;               // Supabase Storage public URL
  label: string;             // EN: "Draw the object on the surface"
  labelHe: string;           // HE: "שרטוט העצם על המשטח"
  explanation: string;       // EN: pedagogical explanation
  explanationHe: string;     // HE: explanation in Hebrew
}
```

### Step Metadata Generation

Step labels and explanations are generated by the AI alongside the code. The prompt asks the AI to include metadata as a JSON block at the end of its response:

```
After your code, output a JSON block with step metadata:
{ "steps": [
  { "step": 1, "label": "...", "labelHe": "...", "explanation": "...", "explanationHe": "..." },
  ...
]}
```

This replaces the current second AI call for metadata generation.

---

## Frontend Changes

### StepByStepWalkthrough

- Loads images from pre-saved Supabase Storage URLs (no API call)
- `stepImages` prop replaces `stepImageUrls` + `steps` separate props
- "Step by Step" button available immediately (no loading spinner)
- Remove dependency on `/api/diagrams/render-steps`

### DiagramRenderer

- Check for `stepImages` in diagram result instead of `stepByStepSource`
- Remove on-demand rendering logic
- "Step by Step" button shown when `stepImages.length > 1`

---

## Error Handling

- If any step fails to compile, skip it (partial steps are fine)
- If ALL steps fail, fall back to current behavior (final image only, no step-by-step)
- Step compilation errors don't block the final diagram
- QA runs on the final image only (not per-step)

## Performance

- TikZ: N QuickLaTeX calls (parallel, 3 concurrent max) — adds ~2-4s for 4 steps
- Matplotlib: 1 E2B call (all steps in one run) — minimal overhead
- LaTeX: N E2B calls or 1 call with multiple output files — ~2-3s for 3 steps
- Supabase Storage uploads: parallel, fire-and-forget — negligible
- Net impact: ~2-4 seconds added to generation, but step-by-step is instant for the user (vs. current 3-8 second on-demand compilation)
