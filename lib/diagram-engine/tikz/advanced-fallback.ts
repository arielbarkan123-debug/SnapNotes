/**
 * Fallback guidance for non-elementary topics (physics, high school math,
 * biology, chemistry). These sections were in the original monolithic
 * TIKZ_SYSTEM_PROMPT and must be preserved for prompts that don't match
 * any elementary template.
 */

export const PHYSICS_FBD_GUIDANCE = `PHYSICS — FREE BODY DIAGRAMS:
- Draw ONE single unified diagram: the physical setup (incline, block, etc.) with ALL force vectors drawn directly on/from the block.
- On the RIGHT side of the diagram, add a "Calculations" box showing step-by-step derivation of every numeric value.
- Use \\draw arc for angles. NEVER use \\pic.
- Calculate ALL values using g = 9.8\\,\\text{m/s}^2.
- Here is the REFERENCE TEMPLATE. Adapt values but keep this exact structure:

\\usetikzlibrary{arrows.meta, calc}
\\begin{tikzpicture}[scale=1.5]
% --- INCLINED PLANE ---
\\fill[gray!12] (0,0) -- (6,0) -- (6,2.8) -- cycle;
\\draw[very thick] (0,0) -- (6,0) -- (6,2.8) -- cycle;
% Angle at base
\\draw (1.2,0) arc (0:25:1.2);
\\node[fill=white, inner sep=1pt] at (1.7,0.3) {$25^{\\circ}$};
% Ground hatching
\\draw[thick] (-0.3,0) -- (6.5,0);
\\foreach \\x in {-0.2,0.2,...,6.4} { \\draw (\\x,0) -- (\\x-0.3,-0.3); }

% --- BLOCK on incline ---
\\coordinate (B) at ($(0,0)!0.55!(6,2.8)$);
\\draw[thick, fill=blue!15, rotate around={25:(B)}]
  ([shift={(-0.45,-0.45)}]B) rectangle ([shift={(0.45,0.45)}]B);
\\node[rotate=25, fill=blue!15, inner sep=1pt] at (B) {\\footnotesize $30\\,\\text{kg}$};

% --- TILTED COORDINATE AXES from block center ---
\\draw[dashed, gray!50, thin] ($(B)+({-1.8*cos(25)},{-1.8*sin(25)})$) -- ($(B)+({1.8*cos(25)},{1.8*sin(25)})$)
  node[right, fill=white, inner sep=2pt] {\\footnotesize $x'$};
\\draw[dashed, gray!50, thin] ($(B)+({0.8*sin(25)},{-0.8*cos(25)})$) -- ($(B)+({-1.5*sin(25)},{1.5*cos(25)})$)
  node[above, fill=white, inner sep=2pt] {\\footnotesize $y'$};

% --- FORCE VECTORS (all from block center) ---
% Weight W straight down
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, red] (B) -- ($(B)+(0,-3)$)
  node[left=0.15cm, red, fill=white, inner sep=2pt] {$\\vec{W}$};

% Normal force N perpendicular to surface, away from incline
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, blue!70] (B) -- ($(B)+({-2.2*sin(25)},{2.2*cos(25)})$)
  node[above left=0.1cm, blue!70, fill=white, inner sep=2pt] {$\\vec{N}$};

% mg sin theta component - along incline DOWNHILL
\\draw[-{Stealth[length=2.5mm]}, thick, dashed, orange!80!red] (B) -- ($(B)+({-1.5*cos(25)},{-1.5*sin(25)})$)
  node[below left=0.1cm, orange!80!red, fill=white, inner sep=2pt] {\\footnotesize $mg\\sin\\theta$};

% mg cos theta component - perpendicular INTO surface
\\draw[-{Stealth[length=2.5mm]}, thick, dashed, green!50!black] (B) -- ($(B)+({1.5*sin(25)},{-1.5*cos(25)})$)
  node[below right=0.1cm, green!50!black, fill=white, inner sep=2pt] {\\footnotesize $mg\\cos\\theta$};

% Angle between W and y' (perpendicular to surface)
\\draw[thin] ($(B)+(0,-1.0)$) arc (-90:{-90+25}:1.0);
\\node[fill=white, inner sep=1pt] at ($(B)+(0.4,-0.75)$) {\\footnotesize $\\theta$};

% --- CALCULATIONS BOX below diagram ---
\\node[draw, rounded corners=4pt, fill=gray!5, text width=12cm, font=\\footnotesize,
  anchor=north west, inner sep=8pt, align=left]
  at (0,-3.8) {
  \\textbf{Calculations} \\quad $\\theta=25^{\\circ}$, $m=30\\,\\text{kg}$, $g=9.8\\,\\text{m/s}^2$\\\\[6pt]
  $\\vec{W} = mg = 30 \\times 9.8 = \\textcolor{red}{294\\,\\text{N}}$ \\hfill (Weight, straight down)\\\\[4pt]
  $\\vec{N} = mg\\cos\\theta = 294\\times\\cos 25^{\\circ} = 294\\times 0.906 = \\textcolor{blue}{266\\,\\text{N}}$ \\hfill (Normal force, $\\perp$ to surface)\\\\[4pt]
  $mg\\sin\\theta = 294\\times\\sin 25^{\\circ} = 294\\times 0.423 = \\textcolor{orange}{124\\,\\text{N}}$ \\hfill (Component along incline)\\\\[4pt]
  $mg\\cos\\theta = 294\\times\\cos 25^{\\circ} = 294\\times 0.906 = \\textcolor{green!50!black}{266\\,\\text{N}}$ \\hfill (Component $\\perp$ to incline)
};
\\end{tikzpicture}

Adapt this template: change mass, angle, force values as needed. ALWAYS include the calculations box. For non-inclined-plane problems, adapt the layout but keep the same principle: one unified diagram + calculations box on the side.`

export const PHYSICS_CIRCUITS_GUIDANCE = `PHYSICS — CIRCUITS:
- Use \\usepackage[siunitx]{circuitikz} for proper circuit symbols (if available), otherwise use clean manual TikZ
- Standard symbols: resistors as zigzag (draw 3-4 peaks, width 0.6cm), capacitors as two parallel lines, batteries as long/short parallel lines with + and - labels
- Arrange circuit in a clean rectangle: battery on left, components along top and bottom paths
- Label every component directly next to it with fill=white: $R_1 = 10\\,\\Omega$, $V = 12\\,\\text{V}$, etc.
- Show current direction with a colored arrow and $I$ label
- Keep the circuit compact (max 8cm wide, 5cm tall) so the calculations box fits below
- Calculations box: show Ohm's law steps, total resistance, current, voltage drops`

export const PHYSICS_PROJECTILE_GUIDANCE = `PHYSICS — PROJECTILE MOTION / KINEMATICS:
Rules:
- Trajectory: \\draw[smooth] plot coordinates {(x1,y1) (x2,y2) ...} with 8-10 pre-computed points. NEVER use plot[domain=...].
- Ball = SMALL FILLED CIRCLE (3pt). NEVER a rectangle.
- Show: velocity vector at launch, max height dashed line, range arrow, landing dot.
- NO decorative elements (windows, grass, sky, clouds, backgrounds).
- PRE-COMPUTE ALL coordinates as decimal numbers. NEVER use \\pgfmathsetmacro.
- Keep total code under 2000 characters.

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
\\fill[red] (0,0) circle (3pt);
\\fill[red] (2.86,2.30) circle (3pt);
\\fill[red] (5.71,0) circle (3pt);
% Max height line
\\draw[dashed, gray] (2.86,0) -- (2.86,2.30);
\\node[above=0.3cm, fill=white, inner sep=2pt] at (2.86,2.30) {$H_{\\max}=10.2\\,\\text{m}$};
% Range arrow
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick, green!60!black] (0,-0.6) -- (5.71,-0.6)
  node[midway, below, fill=white, inner sep=2pt] {$R = 40.8\\,\\text{m}$};
% Velocity vector
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, red] (0,0) -- (1.5,1.5)
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
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick, red] (-0.4,0) -- (-0.4,3)
  node[midway, left, fill=white, inner sep=2pt] {$h=10\\,\\text{m}$};
% Trajectory (8 pre-computed points from (1.2, 3) down to landing)
\\draw[very thick, blue!70, smooth] plot coordinates {
  (1.2,3.0) (2.5,3.5) (3.8,3.5) (5.1,3.1)
  (6.4,2.2) (7.7,0.9) (8.6,0.0)
};
% Key points
\\fill[red] (1.2,3) circle (3pt);
\\fill[red] (8.6,0) circle (3pt);
\\node[below=0.2cm, fill=white, inner sep=2pt] at (8.6,0) {Landing};
% Velocity vector at launch
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, red] (1.2,3) -- (2.7,3.87)
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
- Draw support point at top center, string as a line, bob as a filled circle
- For multiple positions: space them horizontally, use different colors for each position
- Draw force arrows FROM the bob: weight down, tension along string toward pivot
- Show angle arc from vertical to string
- Keep the diagram vertically compact (max 6cm tall for pendulum + space for calculations)`

export const PHYSICS_WAVES_GUIDANCE = `PHYSICS — WAVES / STANDING WAVES:
- Stack harmonics vertically with 3cm vertical spacing between them
- Use plot[smooth, domain=0:W, samples=50] with simple sin functions for wave shapes
- For double-arrows (wavelength markers), use {Stealth[length=2mm]}-{Stealth[length=2mm]} NOT <->
- Keep each harmonic simple: one solid wave curve, node dots, antinode labels
- Do NOT draw both positive and negative envelopes — draw ONE wave curve per harmonic
- Limit to max 3 harmonics per diagram to keep compilation reliable
- Use different colors per harmonic: blue for n=1, green!60!black for n=2, orange!80!black for n=3`

export const MATH_GRAPHS_GUIDANCE = `MATH — GRAPHS AND PLOTS:
- Use proper axis labels with arrows at ends
- Add light gray gridlines where helpful
- Plot functions with smooth curves using \\draw[smooth, thick, color] plot coordinates or parametric plots
- Mark key points (intercepts, maxima, minima, intersections) with filled dots and coordinate labels
- Include a legend box if multiple functions shown: small colored lines + function name
- For trig functions: label x-axis with $\\pi/2$, $\\pi$, $3\\pi/2$, $2\\pi$ not decimal values`

export const BIOLOGY_GUIDANCE = `BIOLOGY:
- Use clean outlines with labeled parts
- Arrows pointing to structures with labels offset from the drawing
- Use subtle fill colors to distinguish regions`

export const CHEMISTRY_GUIDANCE = `CHEMISTRY:
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
  MATH_GRAPHS_GUIDANCE,
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

  // Math - Graphs
  if (/graph|plot|function|parabola|sine|cosine|tangent|equation.*graph|y\s*=|f\(x\)/.test(lower)) {
    sections.push(MATH_GRAPHS_GUIDANCE)
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
