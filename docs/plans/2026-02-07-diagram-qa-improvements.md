# Diagram Visual QA & Improvements Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Visually QA all 100+ diagram components in browser (light/dark mode, all steps), record user feedback, then batch-fix rendering bugs and educational quality gaps.

**Architecture:** Build a dedicated QA review page that renders every diagram type with sample data, showing all step progressions side-by-side. User reviews each diagram interactively, feedback is saved to a structured JSON log. Fixes are applied in batches based on patterns found during review.

**Tech Stack:** Next.js page, existing DiagramRenderer, existing schema jsonExamples as sample data, JSON feedback log

---

## Phase 1: Build the QA Review Page

### Task 1: Create the QA page route and layout

**Files:**
- Create: `app/visual-qa/page.tsx`
- Read: `lib/diagram-schemas.ts` (for all 102 type definitions and jsonExamples)
- Read: `components/math/MathDiagramRenderer.tsx` (for rendering interface)

**Step 1: Create the QA page with all diagram types**

Create `app/visual-qa/page.tsx` — a `'use client'` page that:

1. Imports `DIAGRAM_SCHEMAS` from `lib/diagram-schemas.ts`
2. For each schema entry, parses the `jsonExample` string into a diagram object
3. Renders each diagram type in a section with:
   - **Header:** diagram type name, subject, grade range
   - **Step progression:** renders the diagram N times side-by-side (one per step), where N = `totalSteps` from the parsed jsonExample
   - Each step render sets `visibleStep` from 0 to totalSteps-1
   - Steps laid out **horizontally** in a flex row with `overflow-x: auto` for scrolling
   - Each step card has a label "Step N" above it
4. Global controls at the top:
   - Dark/light mode toggle (using `next-themes`)
   - Filter by subject (math, geometry, physics, all)
   - Filter by grade range
   - Search by diagram type name
5. Each diagram section is rendered at 400x350 default size
6. Page scrolls vertically through all 102 diagram types

```tsx
'use client'

import { useState, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { DIAGRAM_SCHEMAS } from '@/lib/diagram-schemas'
import { MathDiagramRenderer } from '@/components/math/MathDiagramRenderer'
import { GeometryDiagramRenderer } from '@/components/geometry/GeometryDiagramRenderer'
// Import other subject renderers as needed

// Parse all schemas into renderable diagram objects
const allDiagrams = Object.entries(DIAGRAM_SCHEMAS).map(([key, schema]) => {
  const parsed = JSON.parse(schema.jsonExample)
  return {
    key,
    type: schema.type,
    subject: schema.subject,
    gradeRange: schema.gradeRange,
    description: schema.description,
    diagram: parsed,
    totalSteps: parsed.totalSteps || 1,
  }
})
```

Key rendering logic for each diagram section:

```tsx
{/* For each diagram type */}
<div key={d.key} className="border rounded-lg p-4 mb-8">
  <h3 className="text-lg font-bold">{d.type} ({d.subject}, grades {d.gradeRange})</h3>
  <p className="text-sm text-gray-500 mb-3">{d.description}</p>

  {/* Steps side-by-side */}
  <div className="flex gap-4 overflow-x-auto pb-4">
    {Array.from({ length: d.totalSteps }, (_, step) => (
      <div key={step} className="flex-shrink-0">
        <div className="text-xs font-medium mb-1 text-center">Step {step + 1}</div>
        <div className="border rounded p-2 bg-white dark:bg-gray-900" style={{ width: 420, height: 370 }}>
          <DiagramRendererForType
            diagram={{ ...d.diagram, visibleStep: step }}
            width={400}
            height={350}
          />
        </div>
      </div>
    ))}
  </div>
</div>
```

The `DiagramRendererForType` wrapper routes to the correct renderer based on subject (math → MathDiagramRenderer, geometry → GeometryDiagramRenderer, etc.), matching the same logic in `components/homework/diagram/DiagramRenderer.tsx`.

**Step 2: Verify the page loads**

Run: `npm run dev`
Navigate to: `http://localhost:3000/visual-qa`
Expected: Page loads with all 102 diagram types, each showing step progression side-by-side.

**Step 3: Commit**

```bash
git add app/visual-qa/page.tsx
git commit -m "feat: add visual QA page for all 102 diagram types with step progression"
```

---

### Task 2: Add filtering and dark mode controls

**Files:**
- Modify: `app/visual-qa/page.tsx`

**Step 1: Add filter controls**

At the top of the page, add:
- Subject filter buttons: All | Math | Geometry | Physics
- Grade range dropdown: All | 1-4 | 5-8 | 9-12
- Text search input for diagram type name
- Dark/light mode toggle button
- A count showing "Showing X of 102 diagrams"

```tsx
const [subjectFilter, setSubjectFilter] = useState<string>('all')
const [gradeFilter, setGradeFilter] = useState<string>('all')
const [search, setSearch] = useState('')

const filtered = useMemo(() => {
  return allDiagrams.filter(d => {
    if (subjectFilter !== 'all' && d.subject !== subjectFilter) return false
    if (gradeFilter !== 'all') {
      const [gMin, gMax] = gradeFilter.split('-').map(Number)
      const [dMin, dMax] = d.gradeRange.split('-').map(Number)
      if (dMax < gMin || dMin > gMax) return false
    }
    if (search && !d.type.includes(search.toLowerCase())) return false
    return true
  })
}, [subjectFilter, gradeFilter, search])
```

**Step 2: Verify filters work**

Run: dev server, navigate to `/visual-qa`
Expected: Clicking "Geometry" shows only geometry diagrams. Search "box" shows box_plot. Dark mode toggle switches theme.

**Step 3: Commit**

```bash
git add app/visual-qa/page.tsx
git commit -m "feat: add filtering and dark mode controls to visual QA page"
```

---

## Phase 2: QA Feedback System

### Task 3: Create the feedback log structure

**Files:**
- Create: `docs/plans/diagram-qa-log.json`

**Step 1: Create initial empty feedback log**

```json
{
  "_meta": {
    "created": "2026-02-07",
    "description": "Visual QA feedback log for all diagram components",
    "statuses": ["pending", "ok", "needs_fix", "broken"],
    "totalDiagrams": 102,
    "reviewed": 0
  },
  "diagrams": {}
}
```

Each reviewed diagram will have this structure:

```json
{
  "bar_model": {
    "status": "needs_fix",
    "reviewedAt": "2026-02-07",
    "visual": ["part colors invisible in dark mode", "text overlaps below bar"],
    "educational": ["missing total label explanation"],
    "ai": ["AI sometimes sends empty parts array"],
    "steps": {
      "step1": "ok",
      "step2": "text overlap on labels",
      "step3": "ok",
      "step4": "answer color too faint"
    },
    "darkMode": "broken - colors not visible",
    "priority": "high"
  }
}
```

**Step 2: Commit**

```bash
git add docs/plans/diagram-qa-log.json
git commit -m "feat: add diagram QA feedback log structure"
```

---

## Phase 3: Interactive QA Review Sessions

### Task 4: Review diagrams with the user

This is the interactive review phase. For each diagram type:

1. Open `http://localhost:3000/visual-qa` in the browser
2. Screenshot the diagram (all steps, light mode)
3. Toggle dark mode, screenshot again
4. Show both screenshots to the user
5. Record their feedback in `docs/plans/diagram-qa-log.json`

**Review order (by subject, then grade):**

**Batch 1 — Elementary Math (31 types):**
counting_objects_array, ten_frame, part_part_whole, bar_model, place_value_chart, base_10_blocks, picture_graph, bar_graph, fraction_circle, fraction_bar, fraction_number_line, multiplication_array, area_model_multiplication, scaled_bar_graph, equivalent_fraction_model, mixed_number_model, decimal_grid, fraction_multiplication_area, fraction_division_model, volume_model, order_of_operations_tree, quadrant_one_coordinate_plane, area_model, math_table

**Batch 2 — Core Math (17 types):**
number_line, coordinate_plane, long_division, equation, fraction, factoring, completing_square, polynomial, radical, systems, inequality, triangle, circle, unit_circle, tree_diagram, interactive_coordinate_plane, equation_grapher

**Batch 3 — Middle School Math (21 types):**
double_number_line, ratio_table, tape_diagram_ratio, percent_bar_model, dot_plot, histogram, box_plot, stem_and_leaf_plot, measures_of_center, probability_tree, sample_space_diagram, venn_diagram, net_diagram_3d, cross_section_diagram, scale_drawing, slope_triangle, system_of_equations_graph, scatter_plot_trend_line, two_way_frequency_table, pythagorean_theorem_diagram, transformation_diagram

**Batch 4 — High School Math (16 types):**
quadratic_graph, residual_plot, complex_number_plane, conic_sections, polynomial_graph, exponential_graph, logarithmic_graph, rational_function_graph, binomial_distribution, probability_distribution, parametric_curve, limit_visualization, derivative_tangent_line, sequence_diagram, sampling_distribution

**Batch 5 — Geometry (33 types):**
angle_types, complementary_supplementary, vertical_angles, parallel_lines_transversal, triangle_angle_sum, exterior_angle_theorem, inscribed_angle_theorem, perpendicular_bisector_construction, rotation_coordinate_plane, dilation_coordinate_plane, tessellation_pattern, transformations_composition, orthographic_views_3d, triangle_congruence, triangle_similarity, triangle_geometry, regular_polygon, tangent_radius_perpendicularity, law_of_sines_cosines, square, rectangle, parallelogram, rhombus, trapezoid

**Batch 6 — Physics (fbd)**

**After every 5-10 reviews:** Ask the user if they see patterns and want to start batch-fixing.

---

## Phase 4: Batch Fixes (after QA review)

### Task 5: Fix systemic issues found during QA

Based on QA log patterns, fix cross-cutting issues first:

**Likely systemic fixes (based on code review):**
1. **Hardcoded colors → theme-aware classes:** Replace `fill="#374151"` with `className="fill-gray-700 dark:fill-gray-300"` across all affected components
2. **Hardcoded hex stroke/fill → CSS variables or theme palette:** Use `diagram.colors` from the theme system consistently
3. **Label collision detection:** Port the collision detection from NumberLine to other components that need it
4. **Data validation:** Add guards for common edge cases (empty arrays, zero divisions, missing fields)

Each systemic fix applies to multiple components at once.

### Task 6: Fix per-component issues found during QA

For each diagram marked `needs_fix` or `broken` in the QA log:
1. Read the specific feedback
2. Fix the reported issues
3. Re-render on the QA page to verify
4. Update the QA log status to `ok`

---

## Phase 5: AI Generation Quality (parallel)

### Task 7: Test AI diagram generation for each type

For 10-15 representative diagram types:
1. Open the practice tutor or homework helper
2. Ask a question that should trigger each diagram type (e.g., "explain box plots" for box_plot)
3. Check if the AI returns valid diagram JSON
4. Log AI generation quality in the QA log under the `ai` field

**Common AI issues to look for:**
- AI returns unknown diagram type string
- AI returns malformed data (wrong field names, missing required fields)
- AI returns data that causes rendering errors
- AI doesn't generate a diagram when it should
- AI generates a diagram when it shouldn't

### Task 8: Fix AI prompt and schema issues

Based on AI testing:
1. Fix schema descriptions that are unclear
2. Add better jsonExamples for types the AI struggles with
3. Add runtime validation for most-generated diagram types
4. Add logging for failed diagram renders (currently silent)

---

## Success Criteria

- [ ] Visual QA page renders all 102 diagram types with step progression
- [ ] Every diagram type has been reviewed by the user (QA log 100% coverage)
- [ ] All `broken` and `needs_fix` diagrams fixed and verified
- [ ] Diagrams render correctly in both light and dark mode
- [ ] AI generates valid diagrams for at least 10 representative types
- [ ] QA log saved as permanent documentation
