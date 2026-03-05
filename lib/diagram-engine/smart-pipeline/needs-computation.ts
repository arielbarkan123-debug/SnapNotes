/**
 * Smart Pipeline — Decision Function
 *
 * Returns `true` when a question has computable numeric content that would
 * benefit from pre-computation with SymPy. Mirrors the regex pattern style
 * from tiered-router.ts.
 *
 * Two-layer approach:
 * 1. EXCLUSION patterns (fast reject) — biology, simple arithmetic, conceptual
 * 2. INCLUSION patterns (must match + numbers present)
 */

// ── Exclusion: topics that should NEVER go through computation ──────────────

// Biology/anatomy/Recraft — no math to compute
// NOTE: Removed words that legitimately appear in physics contexts:
// - "cross section" (pipe flow, beam analysis), "virus" (radius problems),
// - "volcano" (projectile problems), "realistic" (simulation context)
const EXCLUDE_BIOLOGY = /\b(anatomy|human eye|human heart|human brain|human lung|human ear|human skin|cutaway|plant cell|animal cell|cell structure|organelle|mitochondria|endoplasmic|golgi|ribosome|chloroplast|bacteria|fungus|amoeba|flower parts|leaf structure|root structure|dna|double helix|layers of earth|tectonic plate)\b/i;

// Additional biology exclusion — only triggered when NO physics/math keywords present
// These words can appear in physics contexts, so we only exclude them standalone
const EXCLUDE_BIOLOGY_SOFT = /\b(cross.?section|virus|volcano|realistic|illustration)\b/i;

// Pure conceptual questions without numbers — just "draw a", "show a", "label"
const EXCLUDE_CONCEPTUAL = /^(draw|show|label|illustrate|diagram|sketch)\s+(a|an|the)\s+/i;

// Simple arithmetic fully handled by LaTeX packages (longdivision, xlop)
// These don't need SymPy — the package itself computes and renders
const EXCLUDE_SIMPLE_ARITHMETIC = /\b(long division|long multiplication|short division)\b/i;

// Pure "graph y =" or "plot f(x)" — matplotlib handles rendering without pre-computation
// Only excludes when the question is PURELY about graphing (no computation keywords like "find", "calculate")
const EXCLUDE_PURE_GRAPHING = /^(graph|plot|sketch|draw)\s+(the\s+)?(function|equation|curve|line)?\s*(y\s*=|f\s*\(|g\s*\()/i;

// Computation keywords that override the pure graphing exclusion
// e.g., "Graph y = x^2 and find the roots" should NOT be excluded
const GRAPHING_OVERRIDE_COMPUTATION = /\b(find|calculate|compute|solve|determine|evaluate|what is|how much|how many|roots?|zeros?|intercepts?|maximum|minimum|area under|integral|derivative|vertex|asymptote)\b/i;

// ── Inclusion: topics that NEED computation ─────────────────────────────────

// Physics with numbers — forces, motion, energy, circuits, waves, thermal, FBD
const INCLUDE_PHYSICS = /\b(force|newton|acceleration|accelerates?|velocity|speed|momentum|energy|work|power|friction|inclined plane|tension|pulley|torque|equilibrium|projectile|trajectory|pendulum|kinematics?|circuit|resistor|voltage|current|ohm|capacitor|gravitational|centripetal|centrifugal|free body|fbd|spring|elastic|hooke|magnetic|wavelength|frequency|wave|pressure|buoyancy|archimedes|heat|temperature|thermal|entropy|specific heat|angular|rotational|inertia|moment of inertia|impulse|displacement)\b/i;

// Math solving — equations, optimization, area/volume computation
const INCLUDE_MATH_SOLVING = /\b(solve|find|calculate|compute|evaluate|determine|what is|how much|how many|how far|how fast|how long|how high)\b/i;

// Statistics with data — mean, std dev, regression (not just "draw a histogram")
const INCLUDE_STATISTICS = /\b(mean|average|median|mode|standard deviation|variance|regression|correlation|probability|expected value|z.?score|confidence interval|hypothesis test)\b/i;

// Geometry computation — area, perimeter, volume, angles
const INCLUDE_GEOMETRY_COMPUTE = /\b(find the area|calculate the area|find the perimeter|calculate the perimeter|find the volume|calculate the volume|find the angle|find the length|find the distance|find the midpoint|find the slope)\b/i;

// Numbers check — must contain actual numbers to compute
const HAS_NUMBERS = /\d+\.?\d*/;

// Additional number-like patterns (units with values)
// Longer units must come BEFORE shorter ones to avoid partial matching
// (e.g., "m/s²" before "m/s" before "m"). Word boundary \b after unit group
// prevents "5 minutes" from matching the "m" unit.
const HAS_NUMERIC_DATA = /\d+\s*(m\/s²|m\/s|km\/h|mph|kg|cm|mm|km|degrees?|lbs?|ft|rad|N|J|W|V|A|Ω|°|m|s|g)\b/i;

/**
 * Determine whether a question would benefit from pre-computation.
 *
 * Returns true when the question contains:
 * 1. A computable topic (physics, math solving, stats, geometry)
 * 2. Actual numbers or data to compute with
 * 3. Is NOT a topic handled by specialized renderers (biology, simple arithmetic)
 */
export function needsComputation(question: string): boolean {
  // Already enriched with pre-computed values — skip double computation
  if (question.startsWith('PRE-COMPUTED VALUES')) return false;

  const lower = question.toLowerCase();

  // ── Fast reject: hard exclusion patterns (always biology, never physics) ──
  if (EXCLUDE_BIOLOGY.test(lower)) return false;
  if (EXCLUDE_SIMPLE_ARITHMETIC.test(lower)) return false;
  // Only exclude pure graphing when no computation keywords are present
  // "Graph y = x^2" → excluded; "Graph y = x^2 and find the roots" → included
  if (EXCLUDE_PURE_GRAPHING.test(lower) && !GRAPHING_OVERRIDE_COMPUTATION.test(lower)) return false;

  // Conceptual without numbers
  if (EXCLUDE_CONCEPTUAL.test(lower) && !HAS_NUMBERS.test(lower)) return false;

  // ── Must have numbers to compute ──
  const hasNumbers = HAS_NUMBERS.test(question) || HAS_NUMERIC_DATA.test(question);
  if (!hasNumbers) return false;

  // ── Check computable topics ──
  const hasPhysics = INCLUDE_PHYSICS.test(lower);
  const hasMathSolving = INCLUDE_MATH_SOLVING.test(lower);
  const hasStatistics = INCLUDE_STATISTICS.test(lower);
  const hasGeometry = INCLUDE_GEOMETRY_COMPUTE.test(lower);
  const hasComputableTopic = hasPhysics || hasMathSolving || hasStatistics || hasGeometry;

  // Soft biology exclusion: only applies when NO computable topic is present
  // e.g., "cross section of a leaf" → excluded, but "cross section of pipe with 5 m/s flow" → included
  if (EXCLUDE_BIOLOGY_SOFT.test(lower) && !hasComputableTopic) return false;

  return hasComputableTopic;
}
