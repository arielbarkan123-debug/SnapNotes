/**
 * Tiered Router — routes ALL diagram requests to the 4-pipeline engine.
 *
 * The engine has 4 pipelines for different diagram types:
 *   - E2B LaTeX: pixel-perfect arithmetic layouts (long division, multiplication)
 *   - E2B Matplotlib: high-fidelity physics diagrams, statistics charts, graphs
 *   - TikZ: geometry, cycles, circuits, coordinates, elementary math visuals
 *   - Recraft: realistic biology/anatomy illustrations
 *
 * The main router.ts selects the best pipeline for each question.
 * TikZ is the default fallback for any unmatched topics.
 */

import { routeQuestion, type Pipeline } from './router';

export type DiagramTier = 'diagram-engine';  // Always use engine now

export interface TieredRoute {
  tier: DiagramTier;
  pipeline?: Pipeline;   // only set when tier is 'diagram-engine'
  reason: string;
}

// ─── Topics where the diagram engine produces clearly better results ────────

// Recraft-exclusive: realistic images that React SVG simply cannot produce
const RECRAFT_ONLY = /\b(anatomy of|human eye|human heart|human brain|human lung|human ear|human skin|cross.?section|cutaway|internal structure|inside of|plant cell|animal cell|cell structure|cell diagram|cell membrane|organelle|mitochondria|endoplasmic reticulum|golgi|ribosome|chloroplast|vacuole|lysosome|bacteria|virus|fungus|amoeba|paramecium|flower parts|leaf structure|root structure|stem structure|seed structure|dna|double helix|rna structure|chromosome structure|volcano|layers of earth|earth.?s layers|tectonic plate|realistic|illustration of|photograph|3d model)\b/i;

// TikZ-exclusive: complex science schematics beyond what React components cover
// (NOTE: many of these like water cycle, food chain, solar system DO have TikZ templates
//  but do NOT have React components)
const TIKZ_SCIENCE = /\b(water cycle|rock cycle|carbon cycle|nitrogen cycle|life cycle|krebs cycle|cell cycle|photosynthesis|cellular respiration|mitosis|meiosis|protein synthesis|food chain|food web|energy pyramid|trophic level|ecosystem diagram|solar system|planet orbit|phases of the moon|moon phases|earth sun moon|punnett square|pedigree|genotype|phenotype|allele|classification|taxonomy|phylogenetic|kingdom|domain)\b/i;

// E2B LaTeX: arithmetic and division problems benefit from textbook-style layout
// This includes explicit requests AND implicit division/multiplication problems
const LATEX_ARITHMETIC = /\b(long division|long multiplication|short division|division|divide|divided|multiply|multiplication)\b/i;

// Arithmetic expressions: "765/5", "234×56", "7248 ÷ 8" etc — these benefit from E2B LaTeX
const ARITHMETIC_EXPRESSION = /\d+\s*[/÷]\s*\d+|\d+\s*[*×]\s*\d+|\d+\s*(divided by|times)\s*\d+/i;

// E2B Matplotlib: statistics and data visualization topics
const MATPLOTLIB_STATS = /\b(histogram|scatter\s*plot|box\s*and\s*whisker|standard deviation|normal distribution|bell curve|regression|correlation|probability distribution|statistical|frequency distribution|ogive|cumulative frequency)\b/i;

/**
 * Determine whether to use React components or the diagram engine.
 *
 * Returns { tier: 'react-component' } for topics handled by existing SVG components,
 * or { tier: 'diagram-engine', pipeline } for topics needing the full engine.
 */
export function tieredRoute(question: string): TieredRoute {
  const lower = question.toLowerCase();

  // Recraft topics — React SVG cannot produce realistic images
  if (RECRAFT_ONLY.test(lower)) {
    return {
      tier: 'diagram-engine',
      pipeline: 'recraft',
      reason: 'Realistic biology/anatomy image — requires Recraft AI',
    };
  }

  // TikZ science topics that don't have React components
  if (TIKZ_SCIENCE.test(lower)) {
    return {
      tier: 'diagram-engine',
      pipeline: 'tikz',
      reason: 'Complex science schematic — better with TikZ templates',
    };
  }

  // Explicit long division/multiplication request — LaTeX version is more authentic
  if (LATEX_ARITHMETIC.test(lower)) {
    return {
      tier: 'diagram-engine',
      pipeline: 'e2b-latex',
      reason: 'Textbook-style arithmetic layout — better with LaTeX packages',
    };
  }

  // Arithmetic expressions like "765/5" — LaTeX is pixel-perfect
  if (ARITHMETIC_EXPRESSION.test(lower)) {
    return {
      tier: 'diagram-engine',
      pipeline: 'e2b-latex',
      reason: 'Arithmetic expression — LaTeX produces textbook layout',
    };
  }

  // Statistics/data visualization — Matplotlib produces high-fidelity charts
  if (MATPLOTLIB_STATS.test(lower)) {
    return {
      tier: 'diagram-engine',
      pipeline: 'e2b-matplotlib',
      reason: 'Statistics/data visualization — better with Matplotlib',
    };
  }

  // Everything else → use the main router to select the best pipeline
  // The router has comprehensive rules and defaults to TikZ
  const pipeline = routeQuestion(question);
  return {
    tier: 'diagram-engine',
    pipeline,
    reason: `Routed to ${pipeline} via main pipeline selector`,
  };
}

/**
 * Check if the engine should be used for this question.
 *
 * Always returns true — all diagrams now use the 4-pipeline engine.
 */
export function shouldUseEngine(_question: string): boolean {
  return true;  // Engine is always used now
}
