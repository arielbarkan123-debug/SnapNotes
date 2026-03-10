/**
 * Fallback guidance for non-elementary topics (physics, high school math,
 * biology, chemistry). These sections were in the original monolithic
 * TIKZ_SYSTEM_PROMPT and must be preserved for prompts that don't match
 * any elementary template.
 *
 * NOTE: QuickLaTeX banned features are listed ONCE in the universal
 * WALKTHROUGH_TIKZ_PROMPT. Each guidance section here references that
 * with a short reminder instead of duplicating the full list.
 */

export const PHYSICS_FBD_GUIDANCE = `PHYSICS — FREE BODY DIAGRAMS:
Follow all QuickLaTeX constraints from the main rules above.

- Draw ONE single unified diagram: the physical setup (incline, block, etc.) with ALL force vectors drawn directly on/from the block.
- Below the diagram, add a "Calculations" box showing step-by-step derivation of every numeric value.
- Use \\draw arc for angles. NEVER use \\pic.
- Calculate ALL values using g = 9.8\\,\\text{m/s}^2.
- PRE-COMPUTE all trig values as decimals (cos25=0.906, sin25=0.423).
- Use explicit \\draw lines for ground hatching (max 6 lines). NEVER use \\foreach.
- Here is the REFERENCE TEMPLATE. Adapt values but keep this exact structure:

\\usetikzlibrary{arrows.meta, calc}
\\begin{tikzpicture}[scale=1.5]
% --- INCLINED PLANE ---
\\fill[gray!12] (0,0) -- (6,0) -- (6,2.8) -- cycle;
\\draw[very thick] (0,0) -- (6,0) -- (6,2.8) -- cycle;
% Angle at base
\\draw (1.2,0) arc (0:25:1.2);
\\node[above right, fill=white, inner sep=1pt] at (1.4,0.2) {$25^{\\circ}$};
% Ground line + hatching (explicit lines, no \\foreach)
\\draw[thick] (-0.3,0) -- (6.5,0);
\\draw[thin] (-0.1,0) -- (-0.4,-0.3);
\\draw[thin] (0.5,0) -- (0.2,-0.3);
\\draw[thin] (1.1,0) -- (0.8,-0.3);
\\draw[thin] (1.7,0) -- (1.4,-0.3);
\\draw[thin] (2.3,0) -- (2.0,-0.3);

% --- BLOCK on incline (pre-computed center at 55% along slope) ---
% Block center: (3.3, 1.54) = 0.55*(6,2.8)
\\fill[blue!15, thick] (2.85,0.88) -- (3.65,1.25) -- (3.28,2.05) -- (2.48,1.68) -- cycle;
\\draw[thick] (2.85,0.88) -- (3.65,1.25) -- (3.28,2.05) -- (2.48,1.68) -- cycle;
\\node[fill=blue!15, inner sep=1pt] at (3.07,1.47) {\\footnotesize $30\\,\\text{kg}$};

% --- FORCE VECTORS (all from block center at 3.07,1.47) ---
% Weight W straight down
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, blue!70] (3.07,1.47) -- (3.07,-1.0)
  node[left, fill=white, inner sep=2pt] {$\\vec{W}$};

% Normal force N perpendicular to surface (pre-computed: -2.2*sin25=−0.93, 2.2*cos25=1.99)
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, green!60!black] (3.07,1.47) -- (2.14,3.46)
  node[above left, fill=white, inner sep=2pt] {$\\vec{N}$};

% mg sin theta component - along incline DOWNHILL (pre-computed: -1.5*cos25=−1.36, -1.5*sin25=−0.63)
\\draw[-{Stealth[length=2.5mm]}, thick, dashed, orange!80!black] (3.07,1.47) -- (1.71,0.84)
  node[below left, fill=white, inner sep=2pt] {\\footnotesize $mg\\sin\\theta$};

% --- CALCULATIONS BOX below diagram ---
\\node[draw, rounded corners=3pt, fill=gray!5, text width=9cm, font=\\footnotesize,
  anchor=north west, inner sep=6pt, align=left]
  at (-0.3,-1.8) {
  \\textbf{Given:} $\\theta=25^{\\circ}$, $m=30\\,\\text{kg}$, $g=9.8\\,\\text{m/s}^2$\\\\[4pt]
  $W = mg = 30 \\times 9.8 = 294\\,\\text{N}$\\\\[3pt]
  $N = mg\\cos\\theta = 294 \\times 0.906 = 266\\,\\text{N}$\\\\[3pt]
  $mg\\sin\\theta = 294 \\times 0.423 = 124\\,\\text{N}$
};
\\end{tikzpicture}

Adapt this template: change mass, angle, force values. PRE-COMPUTE all trig as decimals. ALWAYS include the calculations box.`

export const PHYSICS_CIRCUITS_GUIDANCE = `PHYSICS — CIRCUITS:
Follow all QuickLaTeX constraints from the main rules above.

- Use \\usepackage[siunitx]{circuitikz} for proper circuit symbols (if available), otherwise use clean manual TikZ
- Standard symbols: resistors as zigzag (draw 3-4 peaks, width 0.6cm), capacitors as two parallel lines, batteries as long/short parallel lines with + and - labels
- Arrange circuit in a clean rectangle: battery on left, components along top and bottom paths
- Label every component directly next to it with fill=white: $R_1 = 10\\,\\Omega$, $V = 12\\,\\text{V}$, etc.
- Show current direction with a colored arrow and $I$ label
- Keep the circuit compact (max 8cm wide, 5cm tall) so the calculations box fits below
- Calculations box: show Ohm's law steps, total resistance, current, voltage drops`

export const PHYSICS_PROJECTILE_GUIDANCE = `PHYSICS — PROJECTILE MOTION / KINEMATICS:
Follow all QuickLaTeX constraints from the main rules above.

Rules:
- Trajectory: \\draw[smooth, tension=0.6] plot coordinates {(x1,y1) (x2,y2) ...} with 15-20 pre-computed points (every 0.5 x-units). NEVER use plot[domain=...]. Fewer than 15 points creates ugly polygon-like segments.
- Ball = SMALL FILLED CIRCLE (3pt). NEVER a rectangle.
- Show: velocity vector at launch, max height dashed line, range arrow, landing dot.
- NO decorative elements (windows, grass, sky, clouds, backgrounds).
- PRE-COMPUTE ALL coordinates as decimal numbers. NEVER use \\pgfmathsetmacro.
- Keep total code under 2000 characters.

VELOCITY VECTOR CONVENTIONS:
- v_0 (initial velocity): diagonal arrow FROM launch point, label ABOVE RIGHT of the arrow tip
- v_x (horizontal component): horizontal arrow FROM launch point, label BELOW the arrow
- v_y (vertical component): vertical arrow FROM launch point, label to the LEFT of the arrow
- Space components at least 0.8 TikZ units from each other to prevent overlap
- Draw components as dashed arrows, v_0 as solid thick arrow

REFERENCE TEMPLATE (ground launch). FOLLOW THIS EXACTLY — only change numbers:

\\usetikzlibrary{arrows.meta, calc}
\\begin{tikzpicture}[scale=1.3]
% Ground
\\draw[thick] (-0.5,0) -- (10,0);
\\draw[thick] (-0.3,0) -- (-0.3,-0.2) (0.3,0) -- (0.3,-0.2) (0.9,0) -- (0.9,-0.2) (1.5,0) -- (1.5,-0.2) (2.1,0) -- (2.1,-0.2);
% Trajectory (pre-computed points)
\\draw[very thick, blue!70, smooth] plot coordinates {
  (0,0) (0.82,1.15) (1.63,1.91) (2.45,2.30) (3.27,2.30)
  (4.08,1.91) (4.90,1.15) (5.71,0.00)
};
% Key points
\\fill[blue!70] (0,0) circle (3pt);
\\fill[blue!70] (2.86,2.30) circle (3pt);
\\fill[blue!70] (5.71,0) circle (3pt);
% Max height line
\\draw[dashed, gray] (2.86,0) -- (2.86,2.30);
\\node[above=0.3cm, fill=white, inner sep=2pt] at (2.86,2.30) {$H_{\\max}=10.2\\,\\text{m}$};
% Range arrow
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick, green!60!black] (0,-0.6) -- (5.71,-0.6)
  node[midway, below, fill=white, inner sep=2pt] {$R = 40.8\\,\\text{m}$};
% Velocity vector
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, blue!70] (0,0) -- (1.5,1.5)
  node[above left, fill=white, inner sep=2pt] {$\\vec{v}_0 = 20\\,\\text{m/s}$};
% Angle arc
\\draw[thick] (0.8,0) arc (0:45:0.8);
\\node[fill=white, inner sep=1pt] at (1.1,0.35) {$\\theta$};
\\end{tikzpicture}

ELEVATED LAUNCH TEMPLATE (launch from a building/cliff). Use when there is a height:

\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.3]
% Ground
\\draw[thick] (-0.5,0) -- (11,0);
% Building (simple rectangle)
\\fill[gray!20] (0,0) rectangle (1.2,3);
\\draw[thick] (0,0) rectangle (1.2,3);
% Height label
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick, blue!70] (-0.4,0) -- (-0.4,3)
  node[midway, left, fill=white, inner sep=2pt] {$h=10\\,\\text{m}$};
% Trajectory (8 pre-computed points from (1.2, 3) down to landing)
\\draw[very thick, blue!70, smooth] plot coordinates {
  (1.2,3.0) (2.5,3.5) (3.8,3.5) (5.1,3.1)
  (6.4,2.2) (7.7,0.9) (8.6,0.0)
};
% Key points
\\fill[blue!70] (1.2,3) circle (3pt);
\\fill[blue!70] (8.6,0) circle (3pt);
\\node[below=0.2cm, fill=white, inner sep=2pt] at (8.6,0) {Landing};
% Velocity vector at launch
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, blue!70] (1.2,3) -- (2.7,3.87)
  node[above, fill=white, inner sep=2pt] {$\\vec{v}_0 = 20\\,\\text{m/s}$};
% Angle arc
\\draw[thick] (2.0,3) arc (0:30:0.8);
\\node[fill=white, inner sep=1pt] at (2.3,3.2) {$30^{\\circ}$};
% Range arrow (from building base)
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick, green!60!black] (1.2,-0.6) -- (8.6,-0.6)
  node[midway, below, fill=white, inner sep=2pt] {$R=47.0\\,\\text{m}$};
\\end{tikzpicture}

CRITICAL: Follow the template structure EXACTLY. Only change numeric values. Do NOT add \\definecolor, \\pgfmathsetmacro, plot[domain], \\foreach, or decorative elements.`

export const PHYSICS_PENDULUM_GUIDANCE = `PHYSICS — PENDULUM / OSCILLATION:
Follow all QuickLaTeX constraints from the main rules above.

- Draw support point at top center, string as a line, bob as a filled circle
- For multiple positions: space them horizontally, use different colors for each position
- Draw force arrows FROM the bob: weight down, tension along string toward pivot
- Show angle arc from vertical to string
- Keep the diagram vertically compact (max 6cm tall for pendulum + space for calculations)`

export const PHYSICS_WAVES_GUIDANCE = `PHYSICS — WAVES / STANDING WAVES:
Follow all QuickLaTeX constraints from the main rules above.

- Stack harmonics vertically with 3cm vertical spacing between them
- Draw wave shapes with \\draw[smooth, tension=0.6] plot coordinates {(x1,y1) (x2,y2) ...} using 15-20 PRE-COMPUTED points. NEVER use plot[domain=...] or samples=N.
- Example: \\draw[smooth, tension=0.6, thick, blue] plot coordinates {(0,0) (0.25,0.38) (0.5,0.71) (0.75,0.92) (1,1) (1.25,0.92) (1.5,0.71) (1.75,0.38) (2,0) (2.25,-0.38) (2.5,-0.71) (2.75,-0.92) (3,-1) (3.25,-0.92) (3.5,-0.71) (3.75,-0.38) (4,0)};
- For double-arrows (wavelength markers), use {Stealth[length=2mm]}-{Stealth[length=2mm]} NOT <->
- Keep each harmonic simple: one solid wave curve, node dots, antinode labels
- Do NOT draw both positive and negative envelopes — draw ONE wave curve per harmonic
- Limit to max 3 harmonics per diagram to keep compilation reliable
- Use different colors per harmonic: blue for n=1, green!60!black for n=2, orange!80!black for n=3`

export const PHYSICS_OPTICS_GUIDANCE = `PHYSICS — OPTICS / RAY DIAGRAMS:
Follow all QuickLaTeX constraints from the main rules above.

- Draw the optical axis as a horizontal dashed line through the center
- Lens: draw as a double-convex arc (two arcs meeting at top and bottom) with vertical center line
- Mirror: draw as a thick curved arc with hatching lines behind it
- Rays: draw 2-3 principal rays as straight lines with arrows (-{Stealth[length=2.5mm]})
  - Ray 1: parallel to axis → through focal point (or appears to come from focal point for diverging)
  - Ray 2: through center of lens → continues straight
  - Ray 3: through near focal point → exits parallel to axis
- Virtual rays/images: use dashed lines
- Mark focal points (F) and center (C) as small filled dots with labels below the axis
- Draw the object as a thick upward arrow on the left side
- Draw the image as a thick arrow (solid for real, dashed for virtual)
- Keep diagram horizontally oriented, max 10cm wide`

export const MATH_GRAPHS_GUIDANCE = `MATH — GRAPHS AND PLOTS:
Follow all QuickLaTeX constraints from the main rules above.

- Use proper axis labels with arrows at ends
- Add light gray gridlines where helpful
- Plot functions with \\draw[smooth, tension=0.6, thick, color] plot coordinates {(x1,y1) (x2,y2) ...} using 15-20 PRE-COMPUTED points (every 0.25-0.5 x-units). NEVER use plot[domain=...] or samples=N. Fewer than 15 points creates polygon-like segments.
- Mark key points (intercepts, maxima, minima, intersections) with filled dots and coordinate labels
- Include a legend box if multiple functions shown: small colored lines + function name
- For trig functions: label x-axis with $\\pi/2$, $\\pi$, $3\\pi/2$, $2\\pi$ not decimal values`

export const MATH_CALCULUS_GUIDANCE = `MATH — CALCULUS VISUALIZATION:
Follow all QuickLaTeX constraints from the main rules above.

- Draw function curve with \\draw[smooth, tension=0.6, thick, blue!70] plot coordinates {...} using 15-20 PRE-COMPUTED points
- Derivative visualization: draw tangent line at the specified point, extend it 2 units each direction
  - Mark the point of tangency with a filled dot
  - Label the slope: node[above right, fill=white] {$f'(a) = m$}
- Integral visualization: shade the area under the curve using \\fill[blue!15]
  - Draw the curve OVER the shaded region so it stays visible
  - Use vertical dashed lines at integration bounds
  - Label bounds: $a$ and $b$ below x-axis
- Riemann sums: draw 5-6 rectangles with \\draw and \\fill[blue!10, opacity=0.5]
  - Use explicit coordinates for each rectangle, NOT \\foreach
- Keep calculations box below showing the symbolic + numeric result`

export const BIOLOGY_GUIDANCE = `BIOLOGY:
Follow all QuickLaTeX constraints from the main rules above.

- Use clean outlines with labeled parts
- Arrows pointing to structures with labels offset from the drawing
- Use subtle fill colors to distinguish regions`

export const CHEMISTRY_GUIDANCE = `CHEMISTRY:
Follow all QuickLaTeX constraints from the main rules above.

- Proper bond notation (single, double, triple)
- Correct molecular geometry angles
- Use standard element coloring conventions`

/**
 * All advanced/non-elementary guidance sections combined.
 * Used as fallback when no elementary template matches.
 */
export const ALL_ADVANCED_GUIDANCE = [
  PHYSICS_FBD_GUIDANCE,
  PHYSICS_CIRCUITS_GUIDANCE,
  PHYSICS_PROJECTILE_GUIDANCE,
  PHYSICS_PENDULUM_GUIDANCE,
  PHYSICS_WAVES_GUIDANCE,
  PHYSICS_OPTICS_GUIDANCE,
  MATH_GRAPHS_GUIDANCE,
  MATH_CALCULUS_GUIDANCE,
  BIOLOGY_GUIDANCE,
  CHEMISTRY_GUIDANCE,
].join('\n\n')

/**
 * Keywords that indicate an advanced (non-elementary) topic.
 * When any of these match, include the advanced fallback guidance.
 */
export const ADVANCED_KEYWORDS = [
  // Physics
  'free body', 'fbd', 'force diagram', 'circuit', 'resistor', 'capacitor',
  'inductor', 'voltage', 'current', 'ohm', 'projectile', 'trajectory',
  'pendulum', 'oscillation', 'wave', 'harmonic', 'standing wave',
  'refraction', 'reflection', 'lens', 'mirror', 'optics', 'ray diagram',
  'electric field', 'magnetic field', 'field lines', 'equipotential',
  'thermodynamic', 'pv diagram', 'carnot', 'inclined plane', 'pulley',
  'torque', 'momentum', 'collision', 'spring', 'hooke',
  'acceleration', 'friction', 'gravity', 'velocity', 'newton',
  'kinetic energy', 'potential energy',
  'focal', 'converging', 'diverging', 'concave', 'convex',
  // High school math
  'parabola', 'hyperbola', 'ellipse', 'quadratic', 'cubic', 'polynomial',
  'asymptote', 'domain', 'range',
  'sine', 'cosine', 'tangent', 'sin(', 'cos(', 'tan(',
  'unit circle', 'trigonometric', 'radian',
  'derivative', 'integral', 'limit', 'calculus', 'differentiation',
  'area under', 'riemann', 'tangent line',
  'vector', 'matrix', 'determinant',
  'logarithm', 'exponential',
  'complex number', 'complex plane', 'argand',
  'permutation', 'combination', 'binomial',
  'normal distribution', 'bell curve', 'standard deviation',
  'regression', 'correlation',
  'y = ', 'y=', 'f(x)', 'x^2', 'x^3',
  'slope', 'linear equation', 'system of equations',
  // Biology / Chemistry
  'cell', 'organelle', 'molecule', 'atom', 'electron',
  'lewis structure', 'molecular geometry', 'orbital',
  'bond', 'ionic', 'covalent',
  'dna', 'rna', 'double helix', 'helix', 'base pair',
  'photosynthesis', 'mitosis', 'meiosis',
]

/**
 * Keywords in ADVANCED_KEYWORDS that overlap with elementary science templates.
 * When the prompt matches one of these AND also matches an elementary template
 * with confidence >= 0.6, the advanced path should NOT be used.
 * The elementary template priority in buildTikzPrompt() handles this.
 */
export const ELEMENTARY_OVERLAP_KEYWORDS = [
  'cell', 'wave', 'reflection', 'refraction', 'circuit',
  'pulley', 'inclined plane', 'gravity', 'friction',
  'acceleration', 'velocity', 'spring',
  'magnetic field', 'field lines',
  'potential energy', 'kinetic energy',
]

/**
 * Check if a prompt is about an advanced (non-elementary) topic.
 */
export function isAdvancedTopic(prompt: string): boolean {
  const lower = prompt.toLowerCase()
  return ADVANCED_KEYWORDS.some((kw) => lower.includes(kw))
}

/**
 * Get the relevant subset of advanced guidance for a specific prompt.
 * Returns only the sections that match the prompt's keywords.
 */
export function getAdvancedGuidance(prompt: string): string {
  const lower = prompt.toLowerCase()
  const sections: string[] = []

  // Physics - FBD / Forces / Newton's Law
  if (/free body|fbd|force diagram|inclined plane|normal force|friction force|weight force|newton|accelerat|force.*producing|how much force|net force|F\s*=\s*m|force.*leg|kg.*accelerat/.test(lower)) {
    sections.push(PHYSICS_FBD_GUIDANCE)
  }

  // Physics - Circuits
  if (/circuit|resistor|capacitor|inductor|voltage|current|ohm|battery/.test(lower)) {
    sections.push(PHYSICS_CIRCUITS_GUIDANCE)
  }

  // Physics - Projectile
  if (/projectile|trajectory|kinematics|launch angle|range.*height/.test(lower)) {
    sections.push(PHYSICS_PROJECTILE_GUIDANCE)
  }

  // Physics - Pendulum
  if (/pendulum|oscillat|simple harmonic|bob|swing/.test(lower)) {
    sections.push(PHYSICS_PENDULUM_GUIDANCE)
  }

  // Physics - Waves
  if (/wave|harmonic|standing wave|frequency|wavelength|amplitude/.test(lower)) {
    sections.push(PHYSICS_WAVES_GUIDANCE)
  }

  // Physics - Optics
  if (/optics|lens|mirror|ray diagram|refraction|focal|converging|diverging|concave|convex/.test(lower)) {
    sections.push(PHYSICS_OPTICS_GUIDANCE)
  }

  // Math - Graphs
  if (/graph|plot|function|parabola|sine|cosine|tangent|equation.*graph|y\s*=|f\(x\)/.test(lower)) {
    sections.push(MATH_GRAPHS_GUIDANCE)
  }

  // Math - Calculus
  if (/derivative.*graph|integral.*area|tangent line|slope.*curve|area under|riemann|calculus.*visual|differentiat.*graph/.test(lower)) {
    sections.push(MATH_CALCULUS_GUIDANCE)
  }

  // Biology
  if (/cell|organ|anatomy|tissue|membrane|dna|rna|photosynthesis|helix|base pair|mitosis|meiosis/.test(lower)) {
    sections.push(BIOLOGY_GUIDANCE)
  }

  // Chemistry
  if (/molecule|atom|bond|ionic|covalent|lewis|orbital|element/.test(lower)) {
    sections.push(CHEMISTRY_GUIDANCE)
  }

  // If nothing specific matched but it's advanced, return all
  if (sections.length === 0) {
    return ALL_ADVANCED_GUIDANCE
  }

  return sections.join('\n\n')
}
