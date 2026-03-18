/**
 * Pre-Compilation TikZ Validator
 *
 * Catches banned features BEFORE sending to QuickLaTeX.
 * Provides specific fix instructions for targeted retry.
 *
 * Currently compileTikZ() in tikz-executor.ts only catches:
 *   - \pgfmathsetmacro / \pgfmathparse
 *   - plot[domain=..., variable=...]
 *
 * This validator catches many more issues and can auto-fix some.
 */

import { sanitizeUnicode } from './tikz-executor'

// ─── Types ───────────────────────────────────────────────────────────

export interface TikzValidationResult {
  valid: boolean
  errors: TikzValidationError[]
  warnings: TikzValidationWarning[]
  autoFixed: string[]        // Description of auto-applied fixes
  fixedCode?: string         // Code with auto-fixes applied (if any)
}

export interface TikzValidationError {
  type: 'banned_feature' | 'size_violation' | 'missing_layers' | 'structure_error'
  message: string
  line?: number
  fixInstruction: string     // Specific fix for Claude retry
}

export interface TikzValidationWarning {
  type: 'missing_label_style' | 'red_usage' | 'complexity'
  message: string
}

// ─── Constants ───────────────────────────────────────────────────────

const MAX_CODE_SIZE = 2800
const MAX_FOREACH_ITERATIONS = 8

// ─── Foreach Iteration Counter ───────────────────────────────────────

/**
 * Estimate the number of iterations in a \foreach line.
 *
 * Pattern 1: \foreach \x in {0,0.1,...,6}  → (6-0)/0.1+1 = 61
 * Pattern 2: \foreach \x in {1,...,5}      → 5
 * Pattern 3: \foreach \x in {a,b,c,d}     → 4 (count commas + 1)
 */
function countForeachIterations(line: string): number {
  // Extract the list part: \foreach ... in {<list>}
  const listMatch = line.match(/\\foreach\s+[^{]*\{([^}]+)\}/)
  if (!listMatch) return 1

  const list = listMatch[1].trim()

  // Pattern 1: {start, step, ..., end} — e.g. {0, 0.1, ..., 6}
  const rangeWithStep = list.match(/^(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*\.\.\.\s*,\s*(-?[\d.]+)$/)
  if (rangeWithStep) {
    const start = parseFloat(rangeWithStep[1])
    const step = parseFloat(rangeWithStep[2]) - start
    const end = parseFloat(rangeWithStep[3])
    if (step !== 0 && !isNaN(start) && !isNaN(step) && !isNaN(end)) {
      return Math.max(1, Math.floor(Math.abs((end - start) / step)) + 1)
    }
  }

  // Pattern 2: {start, ..., end} — e.g. {1, ..., 5}
  const rangeSimple = list.match(/^(-?[\d.]+)\s*,\s*\.\.\.\s*,\s*(-?[\d.]+)$/)
  if (rangeSimple) {
    const start = parseFloat(rangeSimple[1])
    const end = parseFloat(rangeSimple[2])
    if (!isNaN(start) && !isNaN(end)) {
      return Math.max(1, Math.abs(end - start) + 1)
    }
  }

  // Pattern 3: explicit list — {a,b,c,d} or {0,1,2,3,4}
  // Count commas + 1, but ignore commas inside nested braces
  let depth = 0
  let count = 1
  for (const ch of list) {
    if (ch === '{') depth++
    else if (ch === '}') depth--
    else if (ch === ',' && depth === 0) count++
  }

  return count
}

// ─── Auto-Fix Functions ──────────────────────────────────────────────

/**
 * Remove \definecolor{...}{RGB}{...} lines and replace color references.
 * Falls back to closest xcolor built-in.
 */
function autoFixDefineColor(code: string): { fixed: string; descriptions: string[] } {
  const descriptions: string[] = []
  const fixed = code.replace(
    /\\definecolor\{(\w+)\}\{RGB\}\{(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\}\s*\n?/g,
    (_match, name: string, r: string, g: string, b: string) => {
      const replacement = rgbToXcolor(parseInt(r), parseInt(g), parseInt(b))
      descriptions.push(`Replaced \\definecolor{${name}}{RGB}{${r},${g},${b}} with ${replacement}`)
      // We can't do a global replace of the color name easily, so just remove the definition
      return ''
    }
  )
  return { fixed, descriptions }
}

/**
 * Map an RGB triple to the closest xcolor built-in name.
 */
function rgbToXcolor(r: number, g: number, b: number): string {
  // Simple heuristic: check dominant channel
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)

  if (max - min < 30) {
    // Grayscale
    if (max < 64) return 'black'
    if (max < 128) return 'gray!60'
    if (max < 200) return 'gray!30'
    return 'white'
  }

  if (r > g && r > b) {
    if (g > 150) return 'orange!80'
    return 'red!80'
  }
  if (g > r && g > b) {
    if (b > 150) return 'teal!70'
    return 'green!70'
  }
  if (b > r && b > g) {
    if (r > 150) return 'violet!70'
    return 'blue!70'
  }

  return 'gray!50'
}

/**
 * Remove explicit \color{red} usage (conflicts with highlighting system).
 */
function autoFixRedUsage(code: string): { fixed: string; descriptions: string[] } {
  const descriptions: string[] = []
  let fixed = code

  // Remove \color{red} or \color{red!...}
  if (/\\color\{red[^}]*\}/.test(fixed)) {
    fixed = fixed.replace(/\\color\{red[^}]*\}/g, '')
    descriptions.push('Removed \\color{red} (conflicts with step highlighting)')
  }

  // Remove draw=red from style options
  if (/draw\s*=\s*red/.test(fixed)) {
    fixed = fixed.replace(/,?\s*draw\s*=\s*red[^,\]]*/, '')
    descriptions.push('Removed draw=red from styles (conflicts with step highlighting)')
  }

  return { fixed, descriptions }
}

// ─── Main Validator ──────────────────────────────────────────────────

/**
 * Validate TikZ code before compilation.
 *
 * Catches banned features, applies auto-fixes where possible,
 * and provides specific fix instructions for Claude retry.
 */
export function validateTikzBeforeCompilation(
  tikzCode: string,
  options?: { requireLayers?: boolean }
): TikzValidationResult {
  const errors: TikzValidationError[] = []
  const warnings: TikzValidationWarning[] = []
  const autoFixDescriptions: string[] = []
  let workingCode = tikzCode

  const lines = workingCode.split('\n')

  // ── Check 1: Size violation ──
  if (workingCode.length > MAX_CODE_SIZE) {
    errors.push({
      type: 'size_violation',
      message: `TikZ code is ${workingCode.length} chars (max ${MAX_CODE_SIZE})`,
      fixInstruction: `Reduce code to under ${MAX_CODE_SIZE} chars. Remove decorative elements, reduce plot points, pre-compute coordinates.`,
    })
  }

  // ── Check 2: \pgfmathsetmacro / \pgfmathparse ──
  for (let i = 0; i < lines.length; i++) {
    if (/\\pgfmathsetmacro|\\pgfmathparse/.test(lines[i])) {
      errors.push({
        type: 'banned_feature',
        message: `\\pgfmathsetmacro/\\pgfmathparse on line ${i + 1}`,
        line: i + 1,
        fixInstruction: 'Do not use \\pgfmathsetmacro or \\pgfmathparse. Pre-compute all values as decimal numbers and write them directly (e.g., 0.866 instead of cos(30)).',
      })
    }
  }

  // ── Check 3: plot[domain=...] ──
  for (let i = 0; i < lines.length; i++) {
    if (/plot\s*\[.*domain\s*=/.test(lines[i])) {
      errors.push({
        type: 'banned_feature',
        message: `plot[domain=...] on line ${i + 1}`,
        line: i + 1,
        fixInstruction: 'Do not use plot[domain=...]. Use \\draw[smooth] plot coordinates {(x1,y1) (x2,y2) ...} with 8-12 pre-computed points instead.',
      })
    }
  }

  // ── Check 4: \foreach with too many iterations ──
  for (let i = 0; i < lines.length; i++) {
    if (/\\foreach/.test(lines[i])) {
      const iterations = countForeachIterations(lines[i])
      if (iterations > MAX_FOREACH_ITERATIONS) {
        errors.push({
          type: 'banned_feature',
          message: `\\foreach on line ${i + 1} has ~${iterations} iterations (max ${MAX_FOREACH_ITERATIONS})`,
          line: i + 1,
          fixInstruction: `Reduce to ${MAX_FOREACH_ITERATIONS} or fewer iterations, or replace with explicit \\draw commands. Use \\draw[smooth] plot coordinates with pre-computed points instead of \\foreach loops.`,
        })
      }
    }
  }

  // ── Check 5: \definecolor{...}{RGB}{...} (auto-fixable) ──
  if (/\\definecolor\{[^}]+\}\{RGB\}/.test(workingCode)) {
    const result = autoFixDefineColor(workingCode)
    workingCode = result.fixed
    autoFixDescriptions.push(...result.descriptions)
  }

  // ── Check 6: decorations.markings ──
  for (let i = 0; i < lines.length; i++) {
    if (/decorations\.markings|decoration\s*=\s*\{.*mark\s*=/.test(lines[i])) {
      errors.push({
        type: 'banned_feature',
        message: `decorations.markings on line ${i + 1}`,
        line: i + 1,
        fixInstruction: 'Do not use decorations.markings. Use node labels with positioning (e.g., node[midway, above]) instead of decoration marks along paths.',
      })
    }
  }

  // ── Check 7: gradient fills ──
  for (let i = 0; i < lines.length; i++) {
    if (/(?:top|bottom|left|right|inner)\s*color\s*=|shading\s*=/.test(lines[i])) {
      errors.push({
        type: 'banned_feature',
        message: `Gradient/shading fill on line ${i + 1}`,
        line: i + 1,
        fixInstruction: 'Do not use gradient fills (top color, bottom color, shading). Use solid fills with opacity (e.g., fill=blue!20) instead.',
      })
    }
  }

  // ── Check 8: \color{red} usage (auto-fixable) ──
  if (/\\color\{red|draw\s*=\s*red/.test(workingCode)) {
    const result = autoFixRedUsage(workingCode)
    workingCode = result.fixed
    autoFixDescriptions.push(...result.descriptions)
  }

  // ── Check 9: Unicode characters (auto-fixable) ──
  const sanitized = sanitizeUnicode(workingCode)
  if (sanitized !== workingCode) {
    workingCode = sanitized
    autoFixDescriptions.push('Replaced Unicode characters with LaTeX equivalents')
  }

  // ── Check 10: Missing LAYER markers (optional) ──
  if (options?.requireLayers) {
    const hasLayerMarkers = /^%\s*===\s*LAYER\s+\d+/m.test(workingCode)
    if (!hasLayerMarkers) {
      errors.push({
        type: 'missing_layers',
        message: 'TikZ code has no % === LAYER N: Description === markers',
        fixInstruction: 'Add layer markers to separate the diagram into build steps. Each step\'s new elements should be in a separate layer: % === LAYER 1: Description === ... % === LAYER 2: Description === ...',
      })
    }
  }

  // ── Check 11: Missing tikzpicture environment ──
  if (!workingCode.includes('\\begin{tikzpicture}')) {
    errors.push({
      type: 'structure_error',
      message: 'Missing \\begin{tikzpicture}',
      fixInstruction: 'TikZ code must contain \\begin{tikzpicture} ... \\end{tikzpicture} environment.',
    })
  }

  // ── Warning: nodes without fill=white ──
  const nodeWithoutFill = /\\node\s*\[(?![^\]]*fill\s*=)[^\]]*\]\s*(?:at\s*\([^)]+\)\s*)?\{[^}]+\}/
  if (nodeWithoutFill.test(workingCode)) {
    warnings.push({
      type: 'missing_label_style',
      message: 'Some nodes lack fill=white — labels may overlap with lines',
    })
  }

  // ── Warning: code complexity ──
  const lineCount = lines.filter(l => l.trim() && !l.trim().startsWith('%')).length
  if (lineCount > 60) {
    warnings.push({
      type: 'complexity',
      message: `TikZ code has ${lineCount} non-comment lines — may timeout on QuickLaTeX`,
    })
  }

  // ── Build result ──
  const codeChanged = workingCode !== tikzCode
  const hasErrors = errors.length > 0

  return {
    valid: !hasErrors,
    errors,
    warnings,
    autoFixed: autoFixDescriptions,
    fixedCode: codeChanged ? workingCode : undefined,
  }
}

/**
 * Build a specific retry prompt from validation errors.
 * Much more actionable than "SIMPLIFY the diagram."
 */
export function buildValidationRetryPrompt(result: TikzValidationResult): string {
  if (result.errors.length === 0) return ''

  const errorLines = result.errors
    .map((e, i) => `${i + 1}. ${e.message}\n   FIX: ${e.fixInstruction}`)
    .join('\n\n')

  return `Your TikZ code has the following issues that MUST be fixed:

${errorLines}

Regenerate the complete JSON with fixed tikzCode. Keep all steps and explanations unchanged. Only fix the TikZ code.`
}
