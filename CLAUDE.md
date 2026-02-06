# NoteSnap Project Instructions

## Important URLs

- **Production App**: https://snap-notes-j68u-three.vercel.app/
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ybgkzqrpfdhyftnbvgox

## Project Overview

NoteSnap is an AI-powered homework checker and learning assistant app built with:
- Next.js 14 (App Router)
- Supabase (Auth, Database)
- Tailwind CSS
- Internationalization (English + Hebrew)

## Key Features

- Homework photo upload and AI checking
- PDF/DOCX document support
- Math visualizations (100+ diagram types: elementary through high school math, geometry, physics)
- Multi-language support (EN/HE with RTL)

## Email Configuration

Custom SMTP configured with Resend for better email deliverability (especially iOS).

## Work Standards

- **Always finish to the end.** Never stop after implementing a skeleton or partial solution. Every feature must be fully complete, wired up, tested, and deployed before considering it done. If a plan has 6 phases, do all 6. If there are known gaps, fix them in the same session — don't list them as "future work."
- **No shortcuts, no loose ends.** Upload flows must actually upload. Chat history must actually load. PDF export must actually produce a PDF. Heartbeats must actually keep connections alive. If something is listed in the plan, it ships working.
- **Ask specific questions early.** If requirements are ambiguous or a decision is needed, ask immediately with concrete options — don't guess and don't defer. Questions should be specific (e.g., "Should PDF export use @react-pdf/renderer or html-to-pdf?") not vague (e.g., "How should I proceed?").
- **Own the verification.** After implementing, build it, type-check it, and test it in the browser. Deploy if asked. Don't declare done until it actually works end-to-end.
- **Self-review before declaring done.** Before finishing any task, stop and ask: "How did I finish so quickly? What did I miss, skip, or not do well enough?" Run a code review subagent on your own work. Check edge cases: does it work in both EN and HE? Does it work on mobile? Did the AI prompt actually produce correct output? Does the data flow end-to-end (API → DB → UI → render)? If you can't answer "yes" to all of these with evidence, you're not done.

## Visual Learning Diagram System — Post-Plan Concerns

The diagram system (100+ components) was built in Feb 2026. Below are known concerns that need attention AFTER the plan is complete. Address these before considering the feature production-ready.

### MUST FIX — Visual QA & Rendering

1. **No component has been visually verified in a browser.** All 80 math + 27 geometry components were built by AI agents without visual testing. SVG coordinates, colors, text placement, and animations could all be wrong. Pick 5-10 representative components from each grade band and verify they render correctly in both light/dark mode.
2. **RTL layout testing.** Hebrew mode flips layout direction. Step controls, labels, and diagram text positions may break in RTL. Test at least: NumberLine, EquationSteps, BarModel, TriangleCongruence in Hebrew.
3. **Mobile responsiveness.** Diagrams use fixed viewBox sizes (350-500px). Verify they scale properly on small screens (iPhone SE, 375px width). Some SVG text may overlap or get cut off.
4. **Animation performance.** Framer Motion animations on 100+ SVG elements could cause jank on low-end devices. Profile on a real phone.

### MUST FIX — AI Integration Quality

5. **AI diagram generation quality.** The AI now has schema awareness, but it has never been tested generating real diagrams for real student questions. Test: ask the tutor "explain box plots" and verify the AI returns valid BoxPlot diagram JSON. Do this for 10+ diagram types.
6. **Schema token budget.** The practice tutor prompt now includes a truncated schema list (~3000 chars). If this hurts response quality or speed, consider: (a) only including schemas relevant to the current subject/grade, or (b) using a two-step approach where AI first decides IF a diagram is needed, then gets the full schema.
7. **Diagram generator fallback.** `lib/homework/diagram-generator.ts` still only programmatically generates ~10 types. For AI-generated diagrams (the other 90+), the passthrough works, but if the AI returns malformed JSON, the error boundary catches it silently. Add logging for failed diagram renders.
8. **Edge case: AI generates unknown diagram type.** If the AI hallucinates a type string not in the switch (e.g., "pie_chart"), the renderer shows "Shape type not supported". This is handled but the error message could be more helpful.

### SHOULD FIX — Code Quality

9. **Component unit tests.** Zero component-level tests exist for the 80+ new components. At minimum, write snapshot tests for 10 representative components to catch regressions.
10. **Data validation.** Components don't validate their `data` prop at runtime. If the AI sends `{ type: "box_plot", data: { values: "not an array" } }`, the component will crash. Consider adding runtime validation (zod schemas) for the most commonly generated types.
11. **Unused type definitions.** `types/math.ts` defines types like `ProportionalRelationshipGraphData`, `IrrationalNumberLineData`, `ScientificNotationScaleData` etc. that have type definitions but NO components. These are aspirational — either build the components or remove the dead types.
12. **Duplicate type systems.** `types/index.ts` has `CoordinatePlaneData` with required `type` on lines, while `types/math.ts` has `CoordinatePlaneData` with optional `type`. This caused a bug before and may again. Consolidate.

### NICE TO HAVE — Polish

13. **Accessibility.** Diagrams have basic `role="img"` and `aria-label` but no detailed descriptions for screen readers. For a homework app used by students with disabilities, this matters.
14. **Print support.** If students print homework results, SVG diagrams need print-friendly styles (no animations, high contrast).
15. **Diagram caching.** Each diagram re-renders on every chat message update. For complex diagrams (100+ SVG elements), consider memoization.
16. **Teacher/parent view.** Diagrams show student-facing labels. Consider a "teacher mode" that shows the underlying math/data alongside the visual.

## Visual Learning — Plan Execution Gaps (Fix Before Post-Plan Concerns)

These are deviations from the original plan that were discovered in audit. Fix ALL of these FIRST, before tackling the post-plan concerns above.

### GAP 1: SVG Primitives Library Never Built (CRITICAL)

Plan Task 1 specified building `components/math/shared/` with 13 reusable SVG primitives:
- `SVGGrid.tsx` — configurable grid background
- `SVGAxes.tsx` — X/Y axes with tick marks and labels
- `SVGPoint.tsx` — animated point with label
- `SVGLine.tsx` — line/segment/ray with animation
- `SVGCurve.tsx` — function curve rendering
- `SVGBar.tsx` — animated bar for bar graphs/histograms
- `SVGFractionBar.tsx` — colored fraction strip
- `SVGFractionCircle.tsx` — colored pie sector
- `SVGArrow.tsx` — arrow head with direction
- `SVGLabel.tsx` — positioned text label with background
- `SVGShading.tsx` — region fill/shading with animation
- `SVGStepReveal.tsx` — wrapper for step-synced fade-in/draw animations
- `index.ts` — barrel export

**Impact:** All 107 components duplicate grid, axes, label, and point rendering code instead of sharing primitives. This makes bugs harder to fix globally and increases bundle size.

**Fix:** Extract common SVG patterns from existing working components into the shared primitives library. Then refactor the most-used components (CoordinatePlane, NumberLine, BoxPlot, Histogram) to use them.

### GAP 2: No Component Tests Created (CRITICAL)

Plan specified TDD approach for each batch. Zero test files exist for any of the 80+ new components. Only infrastructure tests (`diagram-schemas.test.ts`, `diagram-theme.test.ts`, `diagram-animations.test.ts`) and a few pre-existing component tests exist.

**Fix:** Write at minimum render tests for 15 representative components across grade bands:
- Elementary: TenFrame, CountingObjectsArray, BarModel, FractionCircle, Base10Blocks
- Middle: BoxPlot, Histogram, VennDiagram, ProbabilityTree, SlopeTriangle
- High School: QuadraticGraph, ConicSections, LimitVisualization, ParametricCurve, BinomialDistribution

### GAP 3: Grade-Level Directory Structure Not Followed

Plan specified:
```
components/math/elementary/   (Grade 1-5)
components/math/middle/       (Grade 6-8)
components/math/highschool/   (Grade 9-12)
```

**Actual:** All 80 components are flat in `components/math/`. This is a deviation from the plan but reorganizing now would require updating 100+ import paths. **Decision: Accept this deviation. Document it as intentional simplification.** The flat structure works with the renderer switch pattern.

### GAP 4: Hardcoded Colors in Several Components (Dark Mode Bug)

Multiple components use hardcoded `fill="#374151"` for text instead of theme-aware colors. Known affected files:
- `components/math/VennDiagram.tsx` — gray text won't show on dark backgrounds
- `components/math/ProbabilityTree.tsx` — same issue
- Likely others (needs grep audit)

**Fix:** Grep for `fill="#374151"` and `fill="#` across all new components and replace with `diagram.colors.text` or the themed color from `useDiagramBase`.

### GAP 5: Hebrew Translations Hardcoded, Not in i18n Files

All 107 components have inline Hebrew strings in `STEP_LABELS` objects instead of using the i18n system (`messages/he/diagram.json`). The i18n files exist (`messages/en/diagram.json`, `messages/he/diagram.json`) but are untracked and not integrated.

**Fix:** Commit the diagram.json translation files. For the inline `STEP_LABELS` pattern — this is acceptable for now since step labels are diagram-specific and the i18n system would need schema changes to support dynamic keys. **Decision: Accept inline Hebrew for step labels. Move general UI strings (like "Step X of Y") to i18n.**

### GAP 6: Batch 8 "Polish Existing Components" Not Done

Plan Task 16 specified refactoring NumberLine, CoordinatePlane, and Triangle to use the shared SVG primitives and add proper step-sync animations. Since the SVG primitives library was never built, these refactors didn't happen.

**Fix:** After building the SVG primitives library (Gap 1), refactor these 3 key components as the plan specified.

### GAP 7: Missing Schemas for SequenceDiagram and SamplingDistribution

Two components have renderer cases but no entries in `lib/diagram-schemas.ts`:
- `SequenceDiagram.tsx` → type: `sequence_diagram`
- `SamplingDistribution.tsx` → type: `sampling_distribution`

**Fix:** Add schemas for both to `lib/diagram-schemas.ts`.

### GAP 8: `messages/en/diagram.json` and `messages/he/diagram.json` Not Committed

These i18n files exist in the working directory but were never staged/committed.

**Fix:** Review contents and commit them.
