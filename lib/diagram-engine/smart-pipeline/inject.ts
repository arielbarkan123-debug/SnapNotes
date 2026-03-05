/**
 * Smart Pipeline — Value Injection
 *
 * Formats computed values into a clear text block that gets prepended
 * to the rendering prompt. The rendering AI uses these exact numbers
 * instead of computing them itself.
 */

import type { ComputedProblem, AnalysisResult } from './types';

/**
 * Format computed values into text prepended to the rendering prompt.
 *
 * The format is designed to be:
 * 1. Unmistakable — starts with a clear header
 * 2. Actionable — values include units and formulas
 * 3. Authoritative — "independently computed and verified"
 * 4. Complete — includes solution steps for step-by-step diagrams
 */
export function inject(
  computed: ComputedProblem,
  analysis: AnalysisResult,
  originalQuestion: string,
): string {
  const header = `PRE-COMPUTED VALUES — USE THESE EXACT NUMBERS:
These values have been independently computed and verified with SymPy. Do NOT recalculate.`;

  const meta = `Problem type: ${analysis.problemType}
Domain: ${analysis.domain}`;

  // Format each computed value
  const valuesLines = Object.entries(computed.values)
    .map(([key, cv]) => {
      const step = cv.step ? `  (${cv.step})` : '';
      return `  ${cv.name || key} = ${formatNumber(cv.value)} ${cv.unit}${step}`;
    })
    .join('\n');

  const valuesSection = `COMPUTED VALUES:\n${valuesLines}`;

  // Format solution steps
  let stepsSection = '';
  if (computed.solutionSteps.length > 0) {
    const stepsLines = computed.solutionSteps
      .map((step, i) => `  ${i + 1}. ${step}`)
      .join('\n');
    stepsSection = `\nSOLUTION STEPS:\n${stepsLines}`;
  }

  // Format diagram hints (from analysis) to guide rendering
  let hintsSection = '';
  if (analysis.diagramHints) {
    const hints = analysis.diagramHints;
    const hintLines: string[] = [];
    if (hints.diagramType) {
      hintLines.push(`  Diagram type: ${hints.diagramType}`);
    }
    if (hints.elementsToShow && hints.elementsToShow.length > 0) {
      hintLines.push(`  Elements to show: ${hints.elementsToShow.join(', ')}`);
    }
    if (hints.coordinateRanges) {
      const ranges = hints.coordinateRanges;
      if (ranges.x) hintLines.push(`  X range: [${ranges.x[0]}, ${ranges.x[1]}]`);
      if (ranges.y) hintLines.push(`  Y range: [${ranges.y[0]}, ${ranges.y[1]}]`);
    }
    if (hintLines.length > 0) {
      hintsSection = `\nDIAGRAM HINTS:\n${hintLines.join('\n')}`;
    }
  }

  const critical = `\nCRITICAL: Use ONLY these values in all labels, annotations, and calculations shown on the diagram. Do NOT recompute or round differently.`;

  const original = `\nORIGINAL QUESTION:\n${originalQuestion}`;

  return [header, '', meta, '', valuesSection, stepsSection, hintsSection, critical, original].join('\n');
}

/**
 * Format a number for display on a diagram.
 * - Integers stay as integers (e.g., 240 not 240.0)
 * - Decimals show up to 4 significant figures
 * - Very small/large numbers use scientific notation
 */
function formatNumber(value: number): string {
  // Guard against NaN/Infinity — should be caught by verification, but be safe
  if (!isFinite(value)) return String(value);

  if (Number.isInteger(value)) return String(value);

  // For very large or very small numbers, use scientific notation
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 0.001 && value !== 0)) {
    return value.toExponential(3);
  }

  // Round to 4 significant figures
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const precision = Math.max(0, 3 - magnitude);
  const rounded = Number(value.toFixed(precision));

  // Remove trailing zeros after decimal point
  return String(rounded);
}
