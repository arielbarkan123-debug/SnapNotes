# Formula Scanner

> A feature that lets users analyze and solve math/science formulas from typed LaTeX or a photo.

---

## What It Does

Formula Scanner has two sequential steps:

1. **Analyze** — breaks down a formula into its components (symbols, variables, meaning, subject area)
2. **Solve** — walks through a step-by-step solution with optional Desmos graph

Results are session-only. Nothing is written to the database.

---

## End-to-End Flow

```
User opens /formula-scanner
  │
  ├─ Text tab: types LaTeX string
  └─ Image tab: selects photo
       → uploads to Supabase Storage: uploads/formula-scanner/{timestamp}.{ext}
       → gets public URL

POST /api/formula-scanner/analyze
  │
  ├─ Text path:  analyzeFormulaFromText(latexText)
  │               → Claude prompt (claude-sonnet-4-6)
  │               → JSON parsed → FormulaAnalysis
  │
  └─ Image path: analyzeFormulaFromImage(imageUrl)
                  → Claude vision extracts LaTeX from image
                  → same analysis prompt as text path
                  → FormulaAnalysis (with extracted latex)

Client renders FormulaBreakdown (KaTeX)

  ↓  user clicks "Solve This"

POST /api/formula-scanner/solve
  → solveFormula(latex, context)
  → Claude prompt → FormulaSolution { steps[], graph?, summary }

Client renders SolveResult (KaTeX + optional DesmosRenderer)
```

---

## Key Files

```
lib/formula-scanner/
  analyzer.ts          — analyzeFormulaFromText(), analyzeFormulaFromImage()
  solver.ts            — solveFormula()

app/api/formula-scanner/
  analyze/route.ts     — POST, maxDuration=60, auth required
  solve/route.ts       — POST, maxDuration=60, auth required

app/(main)/formula-scanner/
  page.tsx             — server page, auth gate
  FormulaScannerContent.tsx — main client UI (tabs, upload, state)

components/formula-scanner/
  FormulaBreakdown.tsx — renders symbol breakdown, related formulas
  SolveResult.tsx      — renders steps, Desmos graph, summary
```

---

## Types

Defined locally inside `lib/formula-scanner/` (not exported from `types/index.ts`):

```typescript
// analyzer.ts
interface FormulaSymbol {
  symbol: string
  meaning: string
  unit?: string
}

interface FormulaAnalysis {
  latex: string
  name: string
  subject: string
  description: string
  symbols: FormulaSymbol[]
  relatedFormulas?: string[]
}

// solver.ts
interface SolveStep {
  step: number
  description: string
  descriptionHe?: string
  latex?: string
}

interface SolveGraph {
  // Desmos-compatible expression config
}

interface FormulaSolution {
  steps: SolveStep[]
  graph?: SolveGraph
  summary: string
  summaryHe?: string
}
```

> Note: `MathStep` / `MathSolution` in `types/index.ts` are a separate type system used by the lesson/deep-practice pipeline — not related to this feature.

---

## AI Usage

| | Detail |
|-|--------|
| **Model** | `claude-sonnet-4-6` (via `AI_MODEL` from `lib/ai/claude.ts`, overridable by `ANTHROPIC_MODEL` env) |
| **SDK** | `@anthropic-ai/sdk` `messages.create` |
| **Vision** | Image path sends `{ type: 'image', source: { type: 'url', url } }` in the message content |
| **Output** | Both routes expect Claude to return a JSON block; parsed with `JSON.parse` |

---

## Rendering

| Component | Library | What it renders |
|-----------|---------|----------------|
| `FormulaScannerContent` | `react-katex` `BlockMath` | Live LaTeX preview while typing |
| `FormulaBreakdown` | `BlockMath`, `InlineMath` | Main formula, symbol table, related formulas |
| `SolveResult` | `SafeBlockMath`, `SafeInlineMath` | Each solve step; wraps KaTeX in error boundary |
| `SolveResult` | `DesmosRenderer` (dynamic import) | Graph if `solution.graph` is present |

`katex/dist/katex.min.css` is imported wherever KaTeX is used.

---

## Storage & Persistence

| Data | Where it lives |
|------|---------------|
| Uploaded formula image | Supabase Storage bucket `uploads`, prefix `formula-scanner/` |
| `FormulaAnalysis` | React state only — not persisted |
| `FormulaSolution` | React state only — not persisted |

There is no DB write in this feature. Refreshing the page loses the result.

---

## API Reference

### `POST /api/formula-scanner/analyze`

**Body** (one of the two is required):
```json
{ "latexText": "E = mc^2" }
{ "imageUrl": "https://..." }
```

**Response:**
```json
{ "success": true, "analysis": { ...FormulaAnalysis } }
```

---

### `POST /api/formula-scanner/solve`

**Body:**
```json
{ "latex": "E = mc^2", "context": "Physics — energy equation" }
```

**Response:**
```json
{ "success": true, "solution": { ...FormulaSolution } }
```

Both routes require an authenticated Supabase session (cookie-based JWT). Return `401` otherwise.
