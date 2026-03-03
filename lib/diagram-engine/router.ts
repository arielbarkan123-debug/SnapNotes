import { detectTopic } from './tikz';

export type Pipeline = 'e2b-latex' | 'e2b-matplotlib' | 'tikz' | 'recraft';

// New hybrid pipelines for client-side rendering (no server image generation needed)
export type HybridPipeline = Pipeline | 'desmos' | 'geogebra' | 'recharts' | 'mermaid';

// ─── Topic → Pipeline Mapping ───────────────────────────────────────────────
//
// The key insight: each topic has a "best renderer" based on what it looks like.
//
// RECRAFT (realistic/illustrated image + Vision labels):
//   Things with complex organic shapes that need to LOOK realistic.
//   Organs, cells, organisms, body systems, real-world objects.
//   A TikZ circle can't show what a mitochondria looks like — you need a real image.
//
// TIKZ (clean geometric schematic):
//   Things that ARE schematic by nature — circles, arrows, boxes, labeled diagrams.
//   Atoms (Bohr model = concentric circles), molecules (ball-and-stick),
//   cycles (circular arrows), processes (flow charts), solar system (orbits).
//   These look BETTER as clean geometry than as illustrations.
//
// E2B MATPLOTLIB (data visualization + physics):
//   Graphs, plots, charts, statistical displays, coordinate geometry,
//   physics force diagrams, anything with axes and data points.
//
// E2B LATEX (structured math typesetting):
//   Step-by-step math work, long division, multiplication, fractions,
//   equation solving — things that need precise typesetting, not drawing.

// ─── Explicit topic rules (checked first, highest priority) ─────────────────

interface TopicRule {
  pattern: RegExp;
  pipeline: Pipeline;
}

const TOPIC_RULES: TopicRule[] = [
  // ── RECRAFT: needs realistic/illustrated image ──
  // Organs & anatomy — complex organic shapes, need to SEE what they look like
  { pattern: /\b(anatomy of|human eye|human heart|human brain|human lung|human ear|human skin)\b/i, pipeline: 'recraft' },
  { pattern: /\b(cross.?section|cutaway|internal structure|inside of)\b/i, pipeline: 'recraft' },
  { pattern: /\b(organ|skeletal system|muscular system|nervous system|digestive system|respiratory system|circulatory system)\b/i, pipeline: 'recraft' },
  // Cells — complex internal organelles, need illustration to show what they look like
  { pattern: /\b(plant cell|animal cell|cell structure|cell diagram|cell membrane|organelle)\b/i, pipeline: 'recraft' },
  { pattern: /\b(mitochondria|endoplasmic reticulum|golgi|ribosome|chloroplast|vacuole|lysosome)\b/i, pipeline: 'recraft' },
  // Real organisms & biological structures
  { pattern: /\b(bacteria|virus|fungus|amoeba|paramecium)\b/i, pipeline: 'recraft' },
  { pattern: /\b(flower parts|leaf structure|root structure|stem structure|seed structure)\b/i, pipeline: 'recraft' },
  // DNA/RNA — double helix needs realistic 3D rendering
  { pattern: /\b(dna|double helix|rna structure|chromosome structure)\b/i, pipeline: 'recraft' },
  // Geological real-world structures
  { pattern: /\b(volcano|layers of earth|earth.?s layers|tectonic plate)\b/i, pipeline: 'recraft' },
  // Explicit illustration request
  { pattern: /\b(realistic|illustration of|photograph|3d model)\b/i, pipeline: 'recraft' },

  // ── TIKZ: clean schematic/geometric diagrams ──
  // Atoms — Bohr model is concentric circles with dots, perfect for TikZ
  { pattern: /\b(atom|atomic structure|electron shell|electron configuration|bohr model|orbital)\b/i, pipeline: 'tikz' },
  // Molecules — ball-and-stick or structural formula, geometric
  { pattern: /\b(molecule|molecular structure|covalent bond|ionic bond|chemical bond|lewis dot)\b/i, pipeline: 'tikz' },
  // Cycles — circular arrow flow diagrams, schematic
  { pattern: /\b(water cycle|rock cycle|carbon cycle|nitrogen cycle|life cycle|krebs cycle|cell cycle)\b/i, pipeline: 'tikz' },
  // Biological processes — flow diagrams with boxes and arrows
  { pattern: /\b(photosynthesis|cellular respiration|mitosis|meiosis|protein synthesis)\b/i, pipeline: 'tikz' },
  // Ecology — schematic food chains, webs, energy pyramids
  { pattern: /\b(food chain|food web|energy pyramid|trophic level|ecosystem diagram)\b/i, pipeline: 'tikz' },
  // Solar system, space — orbital diagrams, schematic
  { pattern: /\b(solar system|planet orbit|phases of the moon|moon phases|earth sun moon)\b/i, pipeline: 'tikz' },
  // Classification, taxonomy — tree diagrams
  { pattern: /\b(classification|taxonomy|phylogenetic|kingdom|domain)\b/i, pipeline: 'tikz' },
  // Genetics — Punnett squares, pedigrees
  { pattern: /\b(punnett square|pedigree|genotype|phenotype|allele)\b/i, pipeline: 'tikz' },
  // Unit circle → matplotlib (must come before generic "circle" geometry rule)
  { pattern: /\b(unit circle)\b/i, pipeline: 'e2b-matplotlib' },
  // Geometry (always TikZ)
  { pattern: /\b(triangle|circle|rectangle|polygon|angle|parallel|perpendicular|congruent|similar|pythagorean)\b/i, pipeline: 'tikz' },
  { pattern: /\b(coordinate plane|number line|tessellation|transformation|rotation|reflection|translation|dilation)\b/i, pipeline: 'tikz' },
  // Elementary math visuals
  { pattern: /\b(ten frame|base.?10|place value|fraction circle|fraction bar|tape diagram|bar model|part.?whole)\b/i, pipeline: 'tikz' },
  { pattern: /\b(ratio table|double number line|percent bar|area model|array)\b/i, pipeline: 'tikz' },
  // Probability
  { pattern: /\b(probability tree|tree diagram|sample space|venn diagram)\b/i, pipeline: 'tikz' },
  // Electrical circuits (schematic)
  { pattern: /\b(circuit|resistor|capacitor|series circuit|parallel circuit)\b/i, pipeline: 'tikz' },

  // ── E2B MATPLOTLIB: graphs, plots, data, physics ──
  // Explicit graphing
  { pattern: /\b(graph|plot|sketch)\b.*[=]/i, pipeline: 'e2b-matplotlib' },
  { pattern: /\b(graph|plot)\s+(the|a|this|my)?\s*(function|equation|line|curve|parabola|sine|cosine)/i, pipeline: 'e2b-matplotlib' },
  // Physics force diagrams
  { pattern: /\b(free body|fbd|force diagram)\b/i, pipeline: 'e2b-matplotlib' },
  // Statistical charts
  { pattern: /\b(bar chart|histogram|scatter plot|box plot|pie chart|stem.?and.?leaf|dot plot)\b/i, pipeline: 'e2b-matplotlib' },
  // Functions and graphs
  { pattern: /\b(y\s*=|f\(x\)|g\(x\))\b/i, pipeline: 'e2b-matplotlib' },
  { pattern: /\b(parabola|hyperbola|ellipse|sine|cosine|tangent)\b/i, pipeline: 'e2b-matplotlib' },
  { pattern: /\b(normal distribution|bell curve)\b/i, pipeline: 'e2b-matplotlib' },
  // Physics motion/waves
  { pattern: /\b(projectile|trajectory|wave diagram|standing wave)\b/i, pipeline: 'e2b-matplotlib' },
  // Economics
  { pattern: /\b(supply and demand|economics curve|production possibility)\b/i, pipeline: 'e2b-matplotlib' },

  // ── E2B LATEX: structured math typesetting ──
  // Division expressions: "765/5", "765 / 5", "765÷5", "765 divided by 5", "long division"
  { pattern: /\b(long division)\b/i, pipeline: 'e2b-latex' },
  { pattern: /\d+\s*[/÷]\s*\d+/, pipeline: 'e2b-latex' },
  { pattern: /\d+\s*(divided by|times|plus|minus|×)\s*\d+/i, pipeline: 'e2b-latex' },
  // Multiplication expressions: "234 * 56", "234×56", "multiply 234 by 56", "long multiplication"
  { pattern: /\b(long multiplication)\b/i, pipeline: 'e2b-latex' },
  { pattern: /\d+\s*[*×]\s*\d+/, pipeline: 'e2b-latex' },
  { pattern: /\b(multiply|multiplication)\b.*\d/i, pipeline: 'e2b-latex' },
  // Addition/subtraction with explicit algorithm request
  { pattern: /\d+\s*[+\-]\s*\d+/i, pipeline: 'e2b-latex' },
  { pattern: /\b(add|subtract|carry|borrow)\b.*\d/i, pipeline: 'e2b-latex' },
  // Other math typesetting
  { pattern: /\b(factor tree|prime factorization)\b/i, pipeline: 'e2b-latex' },
  { pattern: /\b(solve|step by step|simplify)\b.*\b(equation|expression|fraction)\b/i, pipeline: 'e2b-latex' },
  { pattern: /\b(matrix|determinant|truth table)\b/i, pipeline: 'e2b-latex' },
  { pattern: /\b(chemical equation|balance.*equation)\b/i, pipeline: 'e2b-latex' },
  { pattern: /\b(polynomial division|synthetic division)\b/i, pipeline: 'e2b-latex' },
  { pattern: /\b(quadratic formula)\b/i, pipeline: 'e2b-latex' },
];

// --- Hybrid Pipeline Type Mappings ----------------------------------------
export const DESMOS_TYPES = [
  'coordinate_plane', 'function_graph', 'linear_equation', 'quadratic_graph',
  'inequality_graph', 'system_of_equations', 'scatter_plot_regression',
  'trigonometric_graph', 'piecewise_function', 'parametric_curve', 'polar_graph',
] as const;

export const GEOGEBRA_TYPES = [
  'triangle', 'circle_geometry', 'angle_measurement', 'parallel_lines',
  'polygon', 'transformation', 'congruence', 'similarity',
  'pythagorean_theorem', 'circle_theorems', 'construction',
] as const;

export const RECHARTS_TYPES = [
  'box_plot', 'histogram', 'dot_plot', 'bar_chart', 'pie_chart',
  'line_chart', 'stem_leaf_plot', 'frequency_table',
] as const;

export const MERMAID_TYPES = [
  'tree_diagram', 'flowchart', 'sequence_diagram', 'factor_tree', 'probability_tree',
] as const;

/**
 * Get the hybrid pipeline for a given diagram type.
 * Returns null if the type should use a server-side pipeline.
 */
export function getHybridPipeline(diagramType: string): HybridPipeline | null {
  if ((DESMOS_TYPES as readonly string[]).includes(diagramType)) return 'desmos';
  if ((GEOGEBRA_TYPES as readonly string[]).includes(diagramType)) return 'geogebra';
  if ((RECHARTS_TYPES as readonly string[]).includes(diagramType)) return 'recharts';
  if ((MERMAID_TYPES as readonly string[]).includes(diagramType)) return 'mermaid';
  return null;
}

/**
 * Fallback server-side pipelines for when a hybrid renderer fails client-side.
 */
export const HYBRID_FALLBACKS: Record<string, Pipeline> = {
  'desmos': 'e2b-matplotlib',
  'geogebra': 'tikz',
  'recharts': 'e2b-matplotlib',
  'mermaid': 'tikz',
};

// ─── Fallback keyword scoring (lower priority) ─────────────────────────────

const RECRAFT_FALLBACK = [
  'anatomy', 'organ', 'heart', 'brain', 'lung', 'eye', 'ear', 'skin',
  'bone', 'muscle', 'tissue', 'cell', 'bacteria', 'virus',
  'dna', 'rna', 'chromosome', 'gene', 'protein',
  'realistic', 'illustration',
];

const LATEX_FALLBACK = [
  'divide', 'division', 'long division', 'multiply', 'multiplication',
  'long multiplication', 'fraction', 'fractions',
  'equation', 'solve', 'simplify', 'step by step',
  'addition', 'subtraction', 'remainder',
];

const MATPLOTLIB_FALLBACK = [
  'graph', 'plot', 'sketch', 'draw',
  'chart', 'histogram', 'scatter',
  'free body', 'force',
  'projectile', 'trajectory',
];

/**
 * Route a question to the best pipeline.
 *
 * Strategy:
 * 1. Check explicit topic rules (pattern match → instant decision)
 * 2. If no rule matches, fall back to keyword scoring + TikZ template confidence
 * 3. If nothing scores, default to TikZ (general STEM fallback)
 */
export function routeQuestion(question: string): Pipeline {
  const lower = question.toLowerCase();

  // ── Phase 1: Explicit topic rules (first match wins) ──
  // These are ordered by specificity — more specific patterns first
  for (const rule of TOPIC_RULES) {
    if (rule.pattern && rule.pattern.test(lower)) {
      return rule.pipeline;
    }
  }

  // ── Phase 2: Fallback keyword scoring ──
  let recraftScore = 0;
  let latexScore = 0;
  let matplotlibScore = 0;

  for (const kw of RECRAFT_FALLBACK) {
    if (lower.includes(kw)) recraftScore++;
  }
  for (const kw of LATEX_FALLBACK) {
    if (lower.includes(kw)) latexScore++;
  }
  for (const kw of MATPLOTLIB_FALLBACK) {
    if (lower.includes(kw)) matplotlibScore++;
  }

  // Check TikZ template confidence
  const templateMatch = detectTopic(question);
  const tikzScore = templateMatch.confidence >= 0.6 ? 4 : templateMatch.confidence >= 0.3 ? 2 : 0;

  const scores = [
    { pipeline: 'recraft' as Pipeline, score: recraftScore },
    { pipeline: 'e2b-latex' as Pipeline, score: latexScore },
    { pipeline: 'e2b-matplotlib' as Pipeline, score: matplotlibScore },
    { pipeline: 'tikz' as Pipeline, score: tikzScore },
  ];

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score === 0) return 'tikz';

  return scores[0].pipeline;
}

// ─── Cross-Pipeline Fallback Map ─────────────────────────────────────────────

/**
 * When a pipeline fails completely, this maps to a reasonable fallback.
 * The fallback should be capable of handling most of the same question types.
 */
const FALLBACKS: Record<Pipeline, Pipeline | null> = {
  'tikz': 'e2b-matplotlib',       // TikZ fails → try matplotlib (can draw most schematics)
  'e2b-latex': 'tikz',            // LaTeX fails → try TikZ (can typeset math too)
  'e2b-matplotlib': 'tikz',       // Matplotlib fails → try TikZ (clean diagrams)
  'recraft': 'tikz',              // Recraft fails → try TikZ (schematic fallback)
};

/**
 * Get the fallback pipeline for a failed primary pipeline.
 * Returns null if no fallback is configured.
 */
export function getFallbackPipeline(primary: Pipeline): Pipeline | null {
  return FALLBACKS[primary] ?? null;
}
