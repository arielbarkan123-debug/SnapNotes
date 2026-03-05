/**
 * Prompt additions for generating layered TikZ code with step-by-step markers.
 * Appended to the core TikZ prompt when step-by-step source is requested.
 *
 * NOTE: Uses STEP markers (% === STEP N: ...) for consistency across all pipelines.
 * The tikz-layer-parser internally normalizes STEP→LAYER for backward compatibility.
 */

export const LAYERED_TIKZ_INSTRUCTIONS = `

STEP-BY-STEP MARKER SYSTEM — REQUIRED:
In addition to the standard TikZ diagram, structure your code with STEP MARKERS so the diagram can be revealed step-by-step for teaching purposes.

STEP MARKER FORMAT:
% === STEP N: Short description ===

RULES:
1. Place a step marker before each logical group of elements.
2. Steps are CUMULATIVE — Step 3 means "show steps 1+2+3 together."
3. Each step must only ADD new elements. Never modify or remove elements from previous steps.
4. Use ABSOLUTE COORDINATES only (no \\node[right of=...] across steps). Elements must not shift position when earlier steps are rendered alone.
5. Aim for 3-6 steps per diagram (not too few, not too many).
6. Step order should follow TEACHER WHITEBOARD ORDER — build the way a teacher would on a board.
7. The FULL diagram (all steps) must look identical to a non-layered version.

TEACHER WHITEBOARD ORDER:
| Topic | Order |
|-------|-------|
| Free Body Diagram | Object → Weight → Normal → Applied → Friction → Net force |
| Inclined Plane | Surface → Object → Weight → Decompose → Normal → Friction |
| Function Graph | Axes + grid → Plot curve → Key points → Labels + legend |
| Projectile Motion | Ground + launch → Trajectory → Velocity vectors → Height/range |
| Circuit | Battery → Main path → Components → Current arrows → Values |
| Geometry | Given shape → Construction lines → Angles/sides → Measurements |

STEP SEQUENCE GUIDELINES:
- Step 1: Basic setup (axes, grid, coordinate system, object outline)
- Step 2 to N-1: Progressive additions (forces, labels, calculations, curves)
- Step N: Final answer, result, or summary annotation

EXAMPLE — Free Body Diagram:
\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% === STEP 1: Draw the object on the surface ===
\\draw[thick,gray] (-2,0) -- (4,0);
\\draw[thick] (0,0) rectangle (2,1.2);
\\node at (1,0.6) {\\large 5 kg};
% === STEP 2: Weight force (gravity) ===
\\draw[-{Stealth[length=3mm]},very thick,red] (1,0) -- (1,-1.8) node[below,fill=white,inner sep=2pt] {\\large $mg = 49$ N};
% === STEP 3: Normal force ===
\\draw[-{Stealth[length=3mm]},very thick,blue!70] (1,1.2) -- (1,3) node[above,fill=white,inner sep=2pt] {\\large $N = 49$ N};
% === STEP 4: Applied force and friction ===
\\draw[-{Stealth[length=3mm]},very thick,green!60!black] (2,0.6) -- (3.5,0.6) node[right,fill=white,inner sep=2pt] {\\large $F = 20$ N};
\\draw[-{Stealth[length=3mm]},very thick,orange!80!black] (0,0.6) -- (-1.2,0.6) node[left,fill=white,inner sep=2pt] {\\large $f = 12$ N};
\\end{tikzpicture}

EXAMPLE — Quadratic Function Graph:
\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=0.8]
% === STEP 1: Coordinate axes ===
\\draw[-{Stealth},thick] (-1,0) -- (6,0) node[right] {$x$};
\\draw[-{Stealth},thick] (0,-2) -- (0,6) node[above] {$y$};
\\foreach \\x in {1,...,5} \\draw (\\x,0.1) -- (\\x,-0.1) node[below] {\\x};
\\foreach \\y in {1,...,5} \\draw (0.1,\\y) -- (-0.1,\\y) node[left] {\\y};
% === STEP 2: Plot the parabola ===
\\draw[very thick,blue!70,domain=0.27:4.73,samples=50] plot (\\x, {0.5*(\\x-2.5)^2 - 0.5});
% === STEP 3: Mark the vertex ===
\\fill[red] (2.5,-0.5) circle (3pt);
\\node[below right,fill=white,inner sep=2pt] at (2.5,-0.5) {Vertex $(2.5, -0.5)$};
% === STEP 4: Mark x-intercepts and axis of symmetry ===
\\fill[green!60!black] (1.5,0) circle (3pt);
\\fill[green!60!black] (3.5,0) circle (3pt);
\\draw[dashed,gray] (2.5,-1) -- (2.5,5) node[above,fill=white,inner sep=1pt] {$x=2.5$};
\\end{tikzpicture}

After the TikZ code, output a JSON block with step metadata.
IMPORTANT: Explanations MUST include inline LaTeX math using $...$ for all formulas, values, and equations.
Example: "We add the weight force: $W = mg = 5 \\times 9.8 = 49$ N acting downward"

\\\`\\\`\\\`json
{ "steps": [
  { "step": 1, "label": "Short English label", "labelHe": "תווית קצרה בעברית", "explanation": "Explanation with inline LaTeX, e.g. 'We add the weight: $W = mg = 49$ N downward'", "explanationHe": "הסבר עם נוסחאות, למשל 'מוסיפים את הכוח: $W = mg = 49$ ניוטון כלפי מטה'" }
]}
\\\`\\\`\\\``

/**
 * Prompt for the AI to generate step metadata alongside the TikZ code.
 * This is used in a second message to extract step explanations.
 */
export const STEP_METADATA_PROMPT = `Now provide the step-by-step metadata for the TikZ diagram you just generated.

Return JSON (no markdown fences, no explanation):
{
  "steps": [
    {
      "step": 1,
      "label": "Short 3-5 word English label",
      "labelHe": "Short 3-5 word Hebrew label",
      "explanation": "1-2 sentence explanation with inline LaTeX math ($...$) for all formulas and values. Example: 'The parabola $y = 0.5(x-2.5)^2 - 0.5$ has vertex at $(2.5, -0.5)$.'",
      "explanationHe": "אותו הסבר בעברית עם נוסחאות בLaTeX, למשל: 'הפרבולה $y = 0.5(x-2.5)^2 - 0.5$ עם קודקוד ב-$(2.5, -0.5)$'"
    }
  ]
}

Rules:
- One entry per STEP marker in the TikZ code
- Labels should be concise (3-5 words)
- Explanations should be pedagogical — explain the WHY, not just the WHAT
- Explanations MUST include LaTeX math using $...$ for all formulas, values, and equations
- Example: "Weight force $W = mg = 5 \\times 9.8 = 49$ N acts downward from center of mass"
- Hebrew translations must be natural, not word-for-word`
