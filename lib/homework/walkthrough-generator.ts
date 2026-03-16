/**
 * Walkthrough Generator
 *
 * Makes a single Claude call to generate a structured step-by-step solution
 * with layered TikZ code and bilingual explanations. Returns a WalkthroughSolution
 * that can be streamed to the client and compiled into step images.
 *
 * Supports multiple question types with topic-specific layered templates,
 * and falls back to text-only mode when diagrams don't add value.
 */

import { AI_MODEL, getAnthropicClient } from '@/lib/ai/claude'
import { buildLanguageInstruction, type ContentLanguage } from '@/lib/ai/language'
import { getAdvancedGuidance } from '@/lib/diagram-engine/tikz/advanced-fallback'
import { parseTikzLayers } from '@/lib/diagram-engine/tikz-layer-parser'
import { estimateCumulativeSize } from '@/lib/diagram-engine/tikz-layer-parser'
import { validateTikzBeforeCompilation, buildValidationRetryPrompt } from '@/lib/diagram-engine/tikz-validator'
import type { WalkthroughSolution, WalkthroughStep } from '@/types/walkthrough'

// Type import for Anthropic SDK (only used for type annotation)
import type Anthropic from '@anthropic-ai/sdk'
import { createLogger } from '@/lib/logger'

const log = createLogger('homework:walkthrough-generator')

// ============================================================================
// Topic Classification
// ============================================================================

export type WalkthroughTopic =
  | 'projectile'   // projectile motion, kinematics
  | 'fbd'          // free body diagrams, forces, inclined planes
  | 'geometry'     // triangles, circles, areas, volumes
  | 'graph'        // function plots, coordinate geometry
  | 'circuit'      // electrical circuits
  | 'generic'      // any visual topic not matching above — gets generic template
  | 'text-only'    // algebra, word problems, proofs — no diagram needed

/**
 * Classify a question into a walkthrough topic for template routing.
 * Returns 'text-only' for questions where a diagram would not add value.
 */
export function classifyWalkthroughTopic(questionText: string): WalkthroughTopic {
  const lower = questionText.toLowerCase()

  // Projectile motion / kinematics
  if (/projectile|trajectory|launch|thrown|throw.*angle|range.*height|building.*ball|cliff.*throw|ball.*m\/s.*angle|angle.*velocity.*height/.test(lower)) {
    return 'projectile'
  }

  // Free body diagrams / forces
  if (/free body|fbd|force diagram|inclined? plane|normal force|friction.*force|box.*incline|block.*slope|newton.*law.*force|net force|tension.*rope|pulley.*mass/.test(lower)) {
    return 'fbd'
  }

  // Geometry (shapes, areas, volumes, angles)
  if (/triangle.*area|area.*triangle|circle.*radius|circumference|rectangle.*area|area.*rectangle|perimeter|hypotenuse|pythagor|isosceles|equilateral|parallelogram|trapez|polygon|volume.*cylinder|volume.*sphere|volume.*cone|surface area/.test(lower)) {
    return 'geometry'
  }

  // Graphs / functions / coordinate geometry
  if (/graph.*f\(x\)|plot.*function|parabola|quadratic.*roots|roots.*equation.*graph|y\s*=\s*x\^|vertex.*parabola|intercept.*graph|sketch.*graph|domain.*range.*function|asymptote/.test(lower)) {
    return 'graph'
  }

  // Electrical circuits
  if (/circuit.*resistor|resistor.*series|parallel.*circuit|ohm.*law.*circuit|voltage.*current.*resistance|capacitor.*circuit|battery.*resistor/.test(lower)) {
    return 'circuit'
  }

  // Pendulum / oscillation → generic with pendulum guidance
  if (/pendulum|oscillat|bob|swing|period.*length/.test(lower)) {
    return 'generic'
  }

  // Waves → generic with waves guidance
  if (/wave|harmonic|standing|wavelength|amplitude|frequency/.test(lower)) {
    return 'generic'
  }

  // Optics → generic with optics guidance
  if (/lens|mirror|ray.*diagram|refraction|focal|converging|diverging/.test(lower)) {
    return 'generic'
  }

  // Text-only: pure algebra, arithmetic, word problems, proofs, definitions
  if (/solve.*equation|simplify|factor|expand|evaluate|what is \d|calculate.*(?:sum|product|difference|quotient)|prove that|show that|find.*value.*of.*x|system.*equation|simultaneous|inequality|logarithm.*solve|derivative.*of|integral.*of|limit.*as/.test(lower)) {
    return 'text-only'
  }

  // Default: if the question likely needs a visual, default to generic diagram mode
  // Uses the GENERIC_LAYERED_TEMPLATE + domain-specific guidance from getAdvancedGuidance()
  if (/diagram|draw|sketch|illustrate|vector|force|angle|height|distance|velocity|acceleration|spring|pulley|ramp|slope|incline|energy|momentum|torque|pressure|temperature/.test(lower)) {
    return 'generic'
  }

  // For anything else, text-only is safest — no meaningless diagrams
  return 'text-only'
}

// ============================================================================
// Walkthrough-Specific TikZ Prompt (replaces generic TIKZ_CORE_PROMPT)
// ============================================================================

const WALKTHROUGH_TIKZ_PROMPT = `You are a LaTeX/TikZ expert generating LAYERED diagrams for step-by-step walkthroughs.
Each layer will be compiled SEPARATELY via QuickLaTeX (limited remote pdflatex).

OUTPUT FORMAT:
- Output ONLY raw LaTeX inside the JSON tikzCode field.
- Start with \\usetikzlibrary if needed, then \\begin{tikzpicture}...\\end{tikzpicture}
- Use ONLY these TikZ libraries: arrows.meta, calc, positioning

QUICKLATEX LIMITS — CRITICAL:
ABSOLUTELY FORBIDDEN (code is validated before compilation — violations cause automatic rejection):
1. \\pgfmathsetmacro or \\pgfmathparse → INSTEAD: write 0.866, not cos(30)
2. \\foreach with more than 8 iterations → INSTEAD: write explicit \\draw lines
3. plot[domain=...] → INSTEAD: \\draw[smooth] plot coordinates {(x1,y1) (x2,y2)...}
4. \\definecolor{...}{RGB}{...} → INSTEAD: use built-in names (blue!70, red!80)
5. decorations.markings → INSTEAD: use node labels with positioning
6. gradient fills (top color, bottom color, shading) → INSTEAD: use solid fills with opacity
SAFE: \\draw[smooth, tension=0.6] plot coordinates {(x1,y1) (x2,y2)...}, pre-computed decimal numbers, built-in xcolor names (blue!70, green!60!black).
PRE-COMPUTE ALL coordinates as decimal numbers before writing code.

SMOOTH CURVES — CRITICAL:
When drawing ANY curve (parabola, trajectory, function graph, sine wave, etc.):
- Use AT LEAST 15 coordinate points, spaced every 0.5 units along x-axis
- ALWAYS add tension=0.6 to smooth: \\draw[smooth, tension=0.6] plot coordinates {...}
- More points = smoother curve. 7-9 points create UGLY straight-line segments.
- For parabolas spanning 8 x-units: use 17 points (every 0.5)
- For shorter curves (4 x-units): use at least 12 points (every ~0.35)
WRONG: plot coordinates {(0,0) (2,3) (4,4) (6,3) (8,0)} — only 5 points, looks like a polygon
RIGHT: plot coordinates {(0,0) (0.5,0.9) (1,1.7) (1.5,2.4) (2,3) (2.5,3.5) (3,3.8) (3.5,4.0) (4,4.0) (4.5,3.8) (5,3.5) (5.5,3.0) (6,2.4) (6.5,1.7) (7,0.9) (8,0)} — 16 points, smooth curve

SPATIAL ZONE PLANNING — MUST FOLLOW:
Before writing TikZ, mentally divide the canvas into zones:
- TOP ZONE (y > main content): max-height labels, titles
- LEFT MARGIN (x < -0.5 from content): vertical dimension lines (heights)
- RIGHT MARGIN (x > content + 0.5): vertical annotations
- BOTTOM ZONE (y < -0.5 from content): horizontal dimension lines (widths, ranges)
- CENTER: the actual physics/math diagram
Never place labels inside the CENTER zone unless they are anchored to avoid overlap.

DIMENSION LINE CONVENTIONS (physics standard):
- HEIGHT labels: Vertical double-arrow on the LEFT side, label to the left:
  \\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick] (-0.8,0) -- (-0.8,3) node[midway, left, fill=white, inner sep=2pt] {$h = 15$ m};
- WIDTH/RANGE labels: Horizontal double-arrow BELOW the diagram, label below:
  \\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick] (0,-0.8) -- (5,-0.8) node[midway, below, fill=white, inner sep=2pt] {$R$};
- ANGLE labels: Arc placed OUTSIDE the angle, with explicit anchor:
  \\draw (0.8,0) arc (0:30:0.8); \\node[above right, fill=white, inner sep=1pt] at (0.9,0.25) {$30^{\\circ}$};

LABEL ANCHORING RULES — EVERY node MUST have positioning:
- Above a line: use "above" or anchor=south
- Below a line: use "below" or anchor=north
- Left of a point: use "left" or anchor=east
- Right of a point: use "right" or anchor=west
- NEVER use bare node{text} without a position — it WILL overlap other elements.
- ALL label nodes MUST have: fill=white, inner sep=2pt

CHARACTER BUDGET:
- Each LAYER: 300-700 characters max (curve layers with many coordinates may need more)
- Total TikZ code: under 3500 characters (compiled multiple times)
- Keep it SIMPLE — correct placement and smooth curves beat decorative elements

NO RED COLORING — CRITICAL:
Do NOT use \\color{red}, \\textcolor{red}, red fill, or any red in your TikZ code.
The build system automatically highlights new elements per step using a separate mechanism.
If you add red, it will conflict and create visual artifacts.

GENERAL DRAWING RULES:
- Scale: use scale=1.8 to 2.2
- ARROWS: use -{Stealth[length=3mm,width=2mm]} with very thick
- FLAT 2D ONLY: no 3D, no shading, no decorative elements
- COLORS: blue!70, green!60!black, orange!80!black, black for outlines
- Use \\draw arc for angles. NEVER use \\pic.
- No Unicode characters — use LaTeX: ^{\\circ}, \\theta, \\alpha, etc.

PROJECTILE TRAJECTORY — CRITICAL:
When drawing a projectile trajectory curve, the INITIAL TANGENT of the curve MUST match the launch angle exactly.
- For a 30° launch: the first segment of the curve must slope at tan(30°)=0.577 (rise/run)
- For a 45° launch: the first segment must slope at tan(45°)=1.0
- For a 60° launch: the first segment must slope at tan(60°)=1.732
The trajectory must START ALONG the same direction as the initial velocity vector, then arc downward due to gravity.
WRONG: trajectory going steeply upward past/above the velocity vector arrow
RIGHT: trajectory beginning in the SAME direction as the velocity arrow, then curving
Pre-compute coordinates using the parabola y = -a(x-x0)² + b(x-x0) + y0 where b = tan(θ) at launch.`

// ============================================================================
// Reference layered templates per topic
// ============================================================================

const GENERIC_LAYERED_TEMPLATE = `
GENERIC LAYERED TEMPLATE — Adapt for ANY topic:
This shows the LAYER marker pattern. Adapt the content for your specific topic.

\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=2.0]
% === LAYER 1: Setup framework ===
% Draw the main structure — axes, outline, ground, or base shape
\\draw[-{Stealth[length=2.5mm]}, thick] (-0.5,0) -- (6,0) node[right] {$x$};
\\draw[-{Stealth[length=2.5mm]}, thick] (0,-0.5) -- (0,4) node[above] {$y$};
% === LAYER 2: Add main elements ===
% Draw the key objects — shapes, vectors, curves, components
\\draw[very thick, blue!70] (1,0) -- (4,3) -- (5,1) -- cycle;
\\fill[blue!10] (1,0) -- (4,3) -- (5,1) -- cycle;
% === LAYER 3: Labels and results ===
% Add dimensions, annotations, and calculation box
\\node[above, fill=white, inner sep=2pt] at (4,3) {$P$};
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick] (1,-0.5) -- (5,-0.5)
  node[midway, below, fill=white, inner sep=2pt] {$d = 4$ cm};
\\node[draw, rounded corners, fill=gray!5, font=\\footnotesize, anchor=north west, inner sep=6pt]
  at (-0.3,-1.2) {Result: $A = \\frac{1}{2}bh = 6\\,\\text{cm}^2$};
\\end{tikzpicture}`

const PROJECTILE_LAYERED_TEMPLATE = `
REFERENCE LAYERED TEMPLATES — Projectile motion:
Follow these structures EXACTLY. Only change numbers/labels to match the problem.
Use the GROUND-LEVEL template for flat ground launches, ELEVATED template for launches from buildings/cliffs.

--- TEMPLATE A: Ground-level launch (θ=30°, v₀=20 m/s) ---
\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=2.0]
% === LAYER 1: Setup scene ===
% Ground line
\\draw[thick] (-1,0) -- (9.5,0);
% Launch point dot
\\fill[black] (0.5,0) circle (3pt);
% === LAYER 2: Launch velocity + components ===
% IMPORTANT: velocity arrow defines the 30° direction. Trajectory must follow this SAME direction initially!
% v_0 arrow at 30° (dx=1.7, dy=0.98 → tan(30°)=0.577)
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, blue!70] (0.5,0) -- (2.2,0.98)
  node[above, fill=white, inner sep=2pt] {$\\vec{v}_0=20$ m/s};
% Angle arc
\\draw[thick] (1.3,0) arc (0:30:0.8);
\\node[above right, fill=white, inner sep=1pt] at (1.4,0.15) {$30^{\\circ}$};
% v_x component (dashed, along ground)
\\draw[-{Stealth[length=2.5mm]}, thick, dashed, green!60!black] (0.5,0) -- (2.2,0)
  node[below, fill=white, inner sep=2pt] {$v_x=17.3$};
% v_y component (dashed, vertical)
\\draw[-{Stealth[length=2.5mm]}, thick, dashed, orange!80!black] (0.5,0) -- (0.5,0.98)
  node[left, fill=white, inner sep=2pt] {$v_y=10$};
% === LAYER 3: Trajectory ===
% CRITICAL: First segment slope = tan(30°) = 0.577. Curve must start in SAME direction as v_0 arrow!
% Parabola: y = -0.0721*(x-0.5)*(x-8.5), symmetric, peak at x=4.5
% Use 17 points (every 0.5) for a SMOOTH curve — fewer points create ugly polygon segments
\\draw[very thick, blue!70, smooth, tension=0.6] plot coordinates {
  (0.5,0.0) (1.0,0.27) (1.5,0.50) (2.0,0.69) (2.5,0.86) (3.0,0.99) (3.5,1.08)
  (4.0,1.13) (4.5,1.15) (5.0,1.13) (5.5,1.08) (6.0,0.99) (6.5,0.86) (7.0,0.69)
  (7.5,0.50) (8.0,0.27) (8.5,0.0)
};
\\fill[blue!70] (0.5,0) circle (3pt);
\\fill[blue!70] (8.5,0) circle (3pt);
% Max height dashed line
\\draw[dashed, gray] (4.5,0) -- (4.5,1.15);
\\node[above, fill=white, inner sep=2pt] at (4.5,1.15) {$H_{max}$};
% === LAYER 4: Final answer ===
% Range arrow BELOW ground
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick, green!60!black] (0.5,-0.5) -- (8.5,-0.5)
  node[midway, below, fill=white, inner sep=2pt] {$R=35.3$ m};
\\end{tikzpicture}

--- TEMPLATE B: Elevated launch (from building, θ=30°, v₀=20 m/s, h=15m) ---
\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=2.0]
% === LAYER 1: Setup scene ===
% Ground
\\draw[thick] (-1.5,0) -- (10,0);
% Building
\\fill[gray!15] (0,0) rectangle (1.2,3);
\\draw[thick] (0,0) rectangle (1.2,3);
% Height dimension on LEFT side (not bottom!)
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick] (-0.6,0) -- (-0.6,3)
  node[midway, left, fill=white, inner sep=2pt] {$h=15$ m};
% === LAYER 2: Launch velocity ===
% v_0 arrow at 30° (dx=1.7, dy=0.98 → tan(30°)=0.577)
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, blue!70] (1.2,3) -- (2.9,3.98)
  node[above right, fill=white, inner sep=2pt] {$\\vec{v}_0=20$ m/s};
% Angle arc
\\draw[thick] (2.0,3) arc (0:30:0.8);
\\node[above right, fill=white, inner sep=1pt] at (2.1,3.15) {$30^{\\circ}$};
% v_x component (BELOW, dashed)
\\draw[-{Stealth[length=2.5mm]}, thick, dashed, green!60!black] (1.2,3) -- (2.9,3)
  node[below, fill=white, inner sep=2pt] {$v_x=17.3$};
% v_y component (LEFT, dashed)
\\draw[-{Stealth[length=2.5mm]}, thick, dashed, orange!80!black] (1.2,3) -- (1.2,4)
  node[left, fill=white, inner sep=2pt] {$v_y=10$};
% === LAYER 3: Trajectory ===
% CRITICAL: First segment slope MUST = tan(30°) = 0.577 to match the launch angle!
% Parabola computed: y = -0.1328x² + 0.8957x + 2.1164 (tangent=0.577 at x=1.2, y=0 at x=8.6)
% Use 16 points for a SMOOTH curve — fewer points create ugly polygon segments
\\draw[very thick, blue!70, smooth, tension=0.6] plot coordinates {
  (1.2,3.0) (1.7,3.26) (2.2,3.45) (2.7,3.56) (3.2,3.61) (3.7,3.58)
  (4.2,3.49) (4.7,3.33) (5.2,3.10) (5.7,2.81) (6.2,2.45) (6.7,2.02)
  (7.2,1.53) (7.7,0.97) (8.2,0.35) (8.6,0.0)
};
\\fill[blue!70] (1.2,3) circle (3pt);
\\fill[blue!70] (8.6,0) circle (3pt);
% Max height dashed line
\\draw[dashed, gray] (3.4,0) -- (3.4,3.63);
\\node[above, fill=white, inner sep=2pt] at (3.4,3.63) {$H_{max}$};
% === LAYER 4: Final answer ===
% Range arrow BELOW ground
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick, green!60!black] (1.2,-0.6) -- (8.6,-0.6)
  node[midway, below, fill=white, inner sep=2pt] {$R=47.0$ m};
\\node[below=0.2cm, fill=white, inner sep=2pt] at (8.6,0) {Landing};
\\end{tikzpicture}

TRAJECTORY ACCURACY RULE:
The trajectory curve's FIRST segment MUST have slope = tan(launch angle).
- 30° → slope ≈ 0.577 (for every 1 unit right, go 0.577 up)
- 45° → slope = 1.0 (equal rise and run)
- 60° → slope ≈ 1.732
The curve must begin in the EXACT SAME direction as the initial velocity arrow.
NEVER draw the curve going above/over the velocity vector — they start in the same direction!`

const FBD_LAYERED_TEMPLATE = `
REFERENCE LAYERED TEMPLATE — Free Body Diagram (inclined plane):
Follow this structure EXACTLY. Only change mass/angle/force values to match the problem.

\\usetikzlibrary{arrows.meta, calc}
\\begin{tikzpicture}[scale=2.0]
% === LAYER 1: Setup scene ===
% Inclined plane
\\fill[gray!12] (0,0) -- (6,0) -- (6,2.8) -- cycle;
\\draw[very thick] (0,0) -- (6,0) -- (6,2.8) -- cycle;
% Angle at base
\\draw[thick] (1.2,0) arc (0:25:1.2);
\\node[above right, fill=white, inner sep=1pt] at (1.4,0.2) {$25^{\\circ}$};
% Ground line
\\draw[thick] (-0.5,0) -- (6.5,0);
% Ground hatching (5 explicit lines — no \\foreach)
\\draw[thin] (-0.3,0) -- (-0.6,-0.3);
\\draw[thin] (0.3,0) -- (0,-0.3);
\\draw[thin] (0.9,0) -- (0.6,-0.3);
\\draw[thin] (1.5,0) -- (1.2,-0.3);
\\draw[thin] (2.1,0) -- (1.8,-0.3);
% === LAYER 2: Draw block ===
% Block on incline (at 55% along the slope)
\\fill[blue!15, thick] (2.85,0.88) -- (3.65,1.25) -- (3.28,2.05) -- (2.48,1.68) -- cycle;
\\draw[thick] (2.85,0.88) -- (3.65,1.25) -- (3.28,2.05) -- (2.48,1.68) -- cycle;
\\node[fill=blue!15, inner sep=1pt] at (3.07,1.47) {\\footnotesize $m$};
% === LAYER 3: Force vectors ===
% Weight W straight down
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, blue!70] (3.07,1.47) -- (3.07,-0.8)
  node[left, fill=white, inner sep=2pt] {$\\vec{W}=mg$};
% Normal force N perpendicular to surface
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, green!60!black] (3.07,1.47) -- (2.14,3.47)
  node[above left, fill=white, inner sep=2pt] {$\\vec{N}$};
% mg sin theta along incline downhill
\\draw[-{Stealth[length=2.5mm]}, thick, dashed, orange!80!black] (3.07,1.47) -- (1.71,0.84)
  node[below left, fill=white, inner sep=2pt] {\\footnotesize $mg\\sin\\theta$};
% === LAYER 4: Calculations ===
% Calculations box below diagram
\\node[draw, rounded corners=3pt, fill=gray!5, text width=8cm, font=\\footnotesize,
  anchor=north west, inner sep=6pt, align=left]
  at (-0.5,-1.2) {
  \\textbf{Given:} $m$, $\\theta=25^{\\circ}$, $g=9.8\\,\\text{m/s}^2$\\\\[4pt]
  $W = mg$ \\hfill (weight)\\\\[3pt]
  $N = mg\\cos\\theta$ \\hfill (normal force)\\\\[3pt]
  $mg\\sin\\theta$ \\hfill (component along incline)
};
\\end{tikzpicture}`

const GEOMETRY_LAYERED_TEMPLATE = `
REFERENCE LAYERED TEMPLATE — Geometry (triangle with dimensions):
Follow this structure. Adapt for other shapes (rectangle, circle, etc.).

\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=2.0]
% === LAYER 1: Draw shape ===
% Triangle
\\draw[very thick, blue!70] (0,0) -- (4,0) -- (2,3) -- cycle;
\\fill[blue!10] (0,0) -- (4,0) -- (2,3) -- cycle;
% Vertex labels
\\node[below left, fill=white, inner sep=2pt] at (0,0) {$A$};
\\node[below right, fill=white, inner sep=2pt] at (4,0) {$B$};
\\node[above, fill=white, inner sep=2pt] at (2,3) {$C$};
% === LAYER 2: Add dimensions ===
% Base dimension BELOW
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick] (0,-0.5) -- (4,-0.5)
  node[midway, below, fill=white, inner sep=2pt] {$b = 8$ cm};
% Height dimension on LEFT
\\draw[dashed, gray] (2,0) -- (2,3);
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick] (-0.5,0) -- (-0.5,3)
  node[midway, left, fill=white, inner sep=2pt] {$h = 5$ cm};
% Right angle marker at base of height
\\draw[thick] (2,0) -- (2,0.3) -- (2.3,0.3) -- (2.3,0);
% === LAYER 3: Show calculation ===
% Area result
\\node[draw, rounded corners=3pt, fill=green!5, text width=6cm, font=\\footnotesize,
  anchor=north west, inner sep=6pt, align=left]
  at (-0.5,-1.5) {
  $A = \\frac{1}{2} \\times b \\times h = \\frac{1}{2} \\times 8 \\times 5 = 20\\,\\text{cm}^2$
};
\\end{tikzpicture}`

const GRAPH_LAYERED_TEMPLATE = `
REFERENCE LAYERED TEMPLATE — Function graph:
Follow this structure. Pre-compute ALL plot coordinates as decimals.

\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.8]
% === LAYER 1: Draw axes ===
% X-axis
\\draw[-{Stealth[length=2.5mm]}, thick] (-1,0) -- (6,0) node[right, fill=white, inner sep=2pt] {$x$};
% Y-axis
\\draw[-{Stealth[length=2.5mm]}, thick] (0,-2) -- (0,5) node[above, fill=white, inner sep=2pt] {$y$};
% Grid ticks
\\draw[thin, gray!30] (1,-0.1) -- (1,0.1) node[below=3pt, fill=white, inner sep=1pt] {\\footnotesize $1$};
\\draw[thin, gray!30] (2,-0.1) -- (2,0.1) node[below=3pt, fill=white, inner sep=1pt] {\\footnotesize $2$};
\\draw[thin, gray!30] (3,-0.1) -- (3,0.1) node[below=3pt, fill=white, inner sep=1pt] {\\footnotesize $3$};
\\draw[thin, gray!30] (4,-0.1) -- (4,0.1) node[below=3pt, fill=white, inner sep=1pt] {\\footnotesize $4$};
\\draw[thin, gray!30] (5,-0.1) -- (5,0.1) node[below=3pt, fill=white, inner sep=1pt] {\\footnotesize $5$};
% === LAYER 2: Plot function ===
% f(x) = x^2 - 4x + 3 = (x-1)(x-3), vertex at (2,-1)
% Use many points + tension for SMOOTH parabola — never use fewer than 15 points for curves
\\draw[very thick, blue!70, smooth, tension=0.6] plot coordinates {
  (-0.5,5.25) (-0.25,4.06) (0,3) (0.25,2.06) (0.5,1.25) (0.75,0.56) (1,0) (1.25,-0.44)
  (1.5,-0.75) (1.75,-0.94) (2,-1) (2.25,-0.94) (2.5,-0.75) (2.75,-0.44)
  (3,0) (3.25,0.56) (3.5,1.25) (3.75,2.06) (4,3) (4.25,4.06) (4.5,5.25)
};
\\node[above right, blue!70, fill=white, inner sep=2pt] at (4.2,4) {$f(x) = x^2 - 4x + 3$};
% === LAYER 3: Mark key points ===
% Roots
\\fill[green!60!black] (1,0) circle (3pt);
\\node[above left, fill=white, inner sep=2pt] at (1,0) {$(1,0)$};
\\fill[green!60!black] (3,0) circle (3pt);
\\node[above right, fill=white, inner sep=2pt] at (3,0) {$(3,0)$};
% Vertex
\\fill[orange!80!black] (2,-1) circle (3pt);
\\node[below right, fill=white, inner sep=2pt] at (2,-1) {$(2,-1)$};
% Y-intercept
\\fill[blue!70] (0,3) circle (3pt);
\\node[left, fill=white, inner sep=2pt] at (0,3) {$(0,3)$};
\\end{tikzpicture}`

// ============================================================================
// Build system prompt with topic-specific guidance and templates
// ============================================================================

function buildWalkthroughSystemPrompt(questionText: string, topic: WalkthroughTopic): string {
  const topicGuidance = getAdvancedGuidance(questionText)

  // Select template based on topic
  let templateBlock = ''
  switch (topic) {
    case 'projectile':
      templateBlock = `LAYERED TEMPLATE FOR THIS PROBLEM TYPE:\n${PROJECTILE_LAYERED_TEMPLATE}\n`
      break
    case 'fbd':
      templateBlock = `LAYERED TEMPLATE FOR THIS PROBLEM TYPE:\n${FBD_LAYERED_TEMPLATE}\n`
      break
    case 'geometry':
      templateBlock = `LAYERED TEMPLATE FOR THIS PROBLEM TYPE:\n${GEOMETRY_LAYERED_TEMPLATE}\n`
      break
    case 'graph':
      templateBlock = `LAYERED TEMPLATE FOR THIS PROBLEM TYPE:\n${GRAPH_LAYERED_TEMPLATE}\n`
      break
    case 'circuit':
    case 'generic':
      // Use generic template for topics without a specific template
      // Domain-specific guidance comes from getAdvancedGuidance() above
      templateBlock = `GENERIC LAYERED TEMPLATE:\n${GENERIC_LAYERED_TEMPLATE}\n
Adapt this structure for the specific topic. Use the domain-specific guidance above for topic-appropriate drawing conventions.
The template shows HOW to structure layers — replace the content with topic-relevant elements.\n`
      break
    case 'text-only':
      // Handled separately — no TikZ prompt needed
      break
  }

  // For text-only mode, use a different system prompt
  if (topic === 'text-only') {
    return buildTextOnlySystemPrompt()
  }

  return `You are an expert math and physics tutor creating a step-by-step solution walkthrough.

Your task: Given a student's question, produce a STRUCTURED JSON response containing:
1. A step-by-step solution with bilingual explanations
2. Complete layered TikZ code with LAYER markers for an evolving diagram

${WALKTHROUGH_TIKZ_PROMPT}

${topicGuidance ? `TOPIC-SPECIFIC GUIDANCE:\n${topicGuidance}\n` : ''}
${templateBlock}
WALKTHROUGH LAYER RULES:
- Structure TikZ with % === LAYER N: Description === markers (one per solution step)
- Each LAYER adds NEW elements cumulative to the diagram
- Use ABSOLUTE coordinates only — elements must not shift when layers are added
- Number of LAYER markers MUST equal number of steps

RESPONSE FORMAT — Output ONLY valid JSON, no markdown fences:
{
  "steps": [
    {
      "index": 0,
      "title": "Short title (3-6 words)",
      "titleHe": "כותרת קצרה בעברית",
      "explanation": "1-3 sentence explanation with inline LaTeX math ($...$). Explain the WHY, not just WHAT.",
      "explanationHe": "הסבר בעברית עם נוסחאות LaTeX",
      "equation": "v_x = v_0 \\\\cos\\\\theta = 20 \\\\cos 30^{\\\\circ} = 17.32 \\\\text{ m/s}",
      "newElements": "Brief description of new diagram elements"
    }
  ],
  "tikzCode": "\\\\usetikzlibrary{arrows.meta}\\n\\\\begin{tikzpicture}[scale=2.0]\\n% === LAYER 1: Setup scene ===\\n...\\n% === LAYER 2: Add forces ===\\n...\\n\\\\end{tikzpicture}",
  "finalAnswer": "The range is approximately 47.5 meters",
  "finalAnswerHe": "הטווח הוא כ-47.5 מטר"
}

STEP GUIDELINES:
- 3-5 steps total (not more, not fewer)
- Step 1: Identify given information and set up the problem
- Middle steps: Show key calculations/derivations
- Last step: State the final answer and verify
- Each step's explanation MUST use inline LaTeX: $v_0 = 20$ m/s, NOT "v₀ = 20 m/s"
- The "equation" field should contain the KEY equation for that step in LaTeX
- Hebrew translations must be natural, not word-for-word

TIKZ LAYER ORDER (must match steps 1:1):
- LAYER 1 → matches step[0] (index 0)
- LAYER 2 → matches step[1] (index 1)
- etc.
- Number of LAYER markers MUST equal number of steps`
}

/**
 * Build system prompt for text-only walkthroughs (no TikZ diagram).
 */
function buildTextOnlySystemPrompt(): string {
  return `You are an expert math and physics tutor creating a step-by-step solution walkthrough.

This question does NOT need a diagram. Focus on clear step-by-step explanations with equations.

Your task: Given a student's question, produce a STRUCTURED JSON response with step-by-step explanations.

RESPONSE FORMAT — Output ONLY valid JSON, no markdown fences:
{
  "steps": [
    {
      "index": 0,
      "title": "Short title (3-6 words)",
      "titleHe": "כותרת קצרה בעברית",
      "explanation": "1-3 sentence explanation with inline LaTeX math ($...$). Explain the WHY, not just WHAT.",
      "explanationHe": "הסבר בעברית עם נוסחאות LaTeX",
      "equation": "3x + 7 = 22"
    }
  ],
  "tikzCode": "",
  "finalAnswer": "x = 5",
  "finalAnswerHe": "x = 5"
}

STEP GUIDELINES:
- 3-5 steps total (not more, not fewer)
- Step 1: Identify given information and set up the problem
- Middle steps: Show key calculations/derivations
- Last step: State the final answer and verify
- Each step's explanation MUST use inline LaTeX: $3x + 7 = 22$, NOT "3x + 7 = 22"
- The "equation" field should contain the KEY equation for that step in LaTeX
- Hebrew translations must be natural, not word-for-word
- Set tikzCode to an empty string ""`
}

// ============================================================================
// Generator
// ============================================================================

/**
 * Internal: make a single Claude call to generate the walkthrough.
 */
async function generateWalkthroughSolutionOnce(
  questionText: string,
  imageUrls?: string[],
  options?: { simplify?: boolean; previousMaxSize?: number; validationFixes?: string; language?: ContentLanguage },
): Promise<WalkthroughSolution> {
  const anthropic = getAnthropicClient()

  // Classify topic
  const topic = classifyWalkthroughTopic(questionText)
  log.info({ topic }, 'Topic classified')

  // Build user message with optional images
  const userContent: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'url'; url: string } }> = []

  if (imageUrls && imageUrls.length > 0) {
    for (const url of imageUrls) {
      userContent.push({
        type: 'image' as const,
        source: { type: 'url' as const, url },
      })
    }
  }

  let userText = `Generate a step-by-step solution walkthrough for this question:\n\n${questionText}\n\nRespond with ONLY the JSON object. No markdown, no explanation, no code fences.`

  // Add simplification instruction on retry
  if (options?.simplify) {
    userText += `\n\nIMPORTANT: Your previous TikZ code was too large (${options.previousMaxSize} characters cumulative). The QuickLaTeX compiler has a 3500 character limit per compilation. SIMPLIFY the diagram: use fewer elements, shorter labels, and simpler geometry. Each layer must be under 400 characters.`
  }

  // Add specific validation fix instructions on retry
  if (options?.validationFixes) {
    userText += `\n\n${options.validationFixes}`
  }

  userContent.push({
    type: 'text',
    text: userText,
  })

  // Build system prompt dynamically with topic-specific guidance
  const langInstruction = options?.language ? buildLanguageInstruction(options.language) : ''
  const systemPrompt = langInstruction + buildWalkthroughSystemPrompt(questionText, topic)

  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userContent as Anthropic.Messages.ContentBlockParam[],
      },
    ],
  })

  // Extract text response
  const textBlock = message.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Parse JSON (strip markdown fences if present)
  let jsonText = textBlock.text.trim()
  const fenceMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim()
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    // Try to find JSON object in the response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error(`Failed to parse walkthrough JSON: ${jsonText.slice(0, 200)}`)
    }
    parsed = JSON.parse(jsonMatch[0])
  }

  // Validate structure
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('Walkthrough response missing steps array')
  }

  // For text-only mode, tikzCode can be empty
  const isTextOnly = topic === 'text-only' || !parsed.tikzCode || parsed.tikzCode === ''
  if (!isTextOnly && (typeof parsed.tikzCode !== 'string' || !String(parsed.tikzCode).includes('\\begin{tikzpicture}'))) {
    throw new Error('Walkthrough response missing valid tikzCode')
  }

  // Build typed solution
  const steps: WalkthroughStep[] = (parsed.steps as Array<Record<string, unknown>>).map((s, i) => ({
    index: typeof s.index === 'number' ? s.index : i,
    title: String(s.title || `Step ${i + 1}`),
    titleHe: String(s.titleHe || s.title || `שלב ${i + 1}`),
    explanation: String(s.explanation || ''),
    explanationHe: String(s.explanationHe || s.explanation || ''),
    equation: s.equation ? String(s.equation) : undefined,
    newElements: s.newElements ? String(s.newElements) : undefined,
  }))

  return {
    steps,
    tikzCode: isTextOnly ? '' : String(parsed.tikzCode),
    mode: isTextOnly ? 'text-only' : 'diagram',
    finalAnswer: String(parsed.finalAnswer || ''),
    finalAnswerHe: String(parsed.finalAnswerHe || parsed.finalAnswer || ''),
  }
}

/**
 * Extended result from walkthrough generation that includes
 * quality telemetry for storage.
 */
export interface WalkthroughGenerationResult {
  solution: WalkthroughSolution
  topicClassified: WalkthroughTopic
  validationErrors: Array<{ type: string; message: string; fixInstruction: string }>
}

/**
 * Generate a structured walkthrough solution from a question.
 *
 * Returns the parsed WalkthroughSolution + quality telemetry.
 * Includes:
 * 1. Pre-compilation validator to catch banned features
 * 2. Auto-fix for simple issues (definecolor, red, unicode)
 * 3. Targeted retry with specific fix instructions
 * 4. Size-based retry with simplification prompt
 */
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

  // ── Step 1: Run pre-compilation validator ──
  const validation = validateTikzBeforeCompilation(solution.tikzCode, { requireLayers: true })

  // Apply auto-fixes if any
  if (validation.fixedCode) {
    log.info({ autoFixed: validation.autoFixed }, 'Auto-fixed TikZ')
    solution = { ...solution, tikzCode: validation.fixedCode }
  }

  // Collect validation errors for telemetry
  const validationErrors = validation.errors.map(e => ({
    type: e.type,
    message: e.message,
    fixInstruction: e.fixInstruction,
  }))

  // ── Step 2: If validator found real errors, retry with specific instructions ──
  if (!validation.valid && validation.errors.some(e => e.type === 'banned_feature')) {
    const retryPrompt = buildValidationRetryPrompt(validation)
    log.warn({ errorCount: validation.errors.length }, 'Validator found errors, retrying with specific fix instructions')

    try {
      const retrySolution = await generateWalkthroughSolutionOnce(questionText, imageUrls, {
        validationFixes: retryPrompt,
        language,
      })

      // Validate the retry too (but only apply auto-fixes, don't retry again)
      if (retrySolution.tikzCode) {
        const retryValidation = validateTikzBeforeCompilation(retrySolution.tikzCode, { requireLayers: true })
        if (retryValidation.fixedCode) {
          log.info({ autoFixed: retryValidation.autoFixed }, 'Auto-fixed retry TikZ')
          solution = { ...retrySolution, tikzCode: retryValidation.fixedCode }
        } else {
          solution = retrySolution
        }
      }
    } catch (retryErr) {
      log.warn({ err: retryErr }, 'Targeted retry failed, using auto-fixed original')
      // Fall through to use the auto-fixed original
    }
  }

  // ── Step 3: Check cumulative size — retry if exceeds QuickLaTeX limit ──
  try {
    const parsed = parseTikzLayers(solution.tikzCode)
    const sizes = estimateCumulativeSize(parsed)
    const maxSize = Math.max(...sizes, 0)

    if (maxSize > 3500) {
      log.warn({ maxSize }, 'TikZ too large, retrying with simplified prompt')
      try {
        const simplified = await generateWalkthroughSolutionOnce(questionText, imageUrls, {
          simplify: true,
          previousMaxSize: maxSize,
          language,
        })

        // Auto-fix the simplified version too
        if (simplified.tikzCode) {
          const simpValidation = validateTikzBeforeCompilation(simplified.tikzCode)
          solution = simpValidation.fixedCode
            ? { ...simplified, tikzCode: simpValidation.fixedCode }
            : simplified
        }
      } catch (retryErr) {
        log.warn({ err: retryErr }, 'Simplified retry failed, using original')
      }
    }
  } catch (err) {
    log.warn({ err }, 'TikZ size validation warning')
  }

  return { solution, topicClassified, validationErrors }
}
