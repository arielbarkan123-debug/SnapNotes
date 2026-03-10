/**
 * TikZ Layer Parser
 *
 * Parses TikZ code containing % === LAYER N: Description === markers
 * and builds cumulative step documents for step-by-step rendering.
 *
 * Layer markers follow this format:
 *   % === LAYER 1: Draw the object ===
 *   % === LAYER 2: Add weight force ===
 *
 * Code before the first layer marker (but inside tikzpicture) is treated
 * as "layer 0" (setup code) and is always included in cumulative steps.
 */

export interface ParsedLayer {
  /** Layer number (0 = setup, 1+ = numbered layers) */
  layerNumber: number
  /** Human-readable description from the marker comment */
  description: string
  /** TikZ drawing commands belonging to this layer */
  code: string
}

export interface ParsedTikz {
  /** Lines before \begin{tikzpicture} (e.g. \usetikzlibrary) */
  preamble: string
  /** Options string from \begin{tikzpicture}[...] including brackets */
  tikzpictureOptions: string
  /** Parsed layers in order */
  layers: ParsedLayer[]
}

/**
 * Regex to detect layer marker comments.
 * Matches: % === LAYER 1: Draw the object ===
 * Allows extra whitespace around all parts.
 */
const LAYER_REGEX = /^%\s*===\s*LAYER\s+(\d+)\s*:\s*(.+?)\s*===\s*$/

/**
 * Extract the options portion from a \begin{tikzpicture}[...] line.
 * Handles nested brackets (e.g. [every node/.style={font=\small}, thick]).
 */
function extractTikzpictureOptions(line: string): string {
  const beginIdx = line.indexOf('\\begin{tikzpicture}')
  if (beginIdx === -1) return ''

  const afterBegin = line.substring(beginIdx + '\\begin{tikzpicture}'.length).trim()
  if (!afterBegin.startsWith('[')) return ''

  // Walk through characters, tracking bracket depth
  let depth = 0
  for (let i = 0; i < afterBegin.length; i++) {
    if (afterBegin[i] === '[') depth++
    else if (afterBegin[i] === ']') {
      depth--
      if (depth === 0) {
        return afterBegin.substring(0, i + 1)
      }
    }
  }

  // Unbalanced brackets -- return everything after begin
  return afterBegin
}

/**
 * Parse TikZ code with layer markers into structured layers.
 *
 * - Lines before \begin{tikzpicture} become the preamble
 * - Code inside tikzpicture but before the first layer marker becomes layer 0 ("Setup")
 * - Each % === LAYER N: Description === starts a new layer
 * - If there are no layer markers, the entire body becomes a single layer 1
 */
export function parseTikzLayers(tikzCode: string): ParsedTikz {
  const lines = tikzCode.split('\n')

  const preambleLines: string[] = []
  let tikzpictureOptions = ''
  const layers: ParsedLayer[] = []

  let insideTikz = false
  let currentLayerNumber = -1 // -1 = haven't seen any layer marker yet
  let currentDescription = ''
  let currentCode: string[] = []
  const preLayerCode: string[] = []
  let foundAnyLayerMarker = false

  for (const line of lines) {
    // Detect \begin{tikzpicture}
    if (line.includes('\\begin{tikzpicture}')) {
      tikzpictureOptions = extractTikzpictureOptions(line)
      insideTikz = true
      continue
    }

    // Detect \end{tikzpicture}
    if (line.trim() === '\\end{tikzpicture}') {
      // Flush handled after loop
      break
    }

    // Before tikzpicture: collect preamble
    if (!insideTikz) {
      if (line.trim()) {
        preambleLines.push(line)
      }
      continue
    }

    // Inside tikzpicture: check for layer markers
    const layerMatch = line.match(LAYER_REGEX)
    if (layerMatch) {
      foundAnyLayerMarker = true

      // Flush the previous numbered layer
      if (currentLayerNumber > 0) {
        layers.push({
          layerNumber: currentLayerNumber,
          description: currentDescription,
          code: currentCode.join('\n').trim(),
        })
      }

      currentLayerNumber = parseInt(layerMatch[1], 10)
      currentDescription = layerMatch[2].trim()
      currentCode = []
    } else {
      // Regular code line
      if (currentLayerNumber > 0) {
        currentCode.push(line)
      } else {
        // Code before first layer marker
        preLayerCode.push(line)
      }
    }
  }

  // Flush the last accumulated layer (handles both normal \end{tikzpicture}
  // and truncated input where \end{tikzpicture} is missing)
  if (currentLayerNumber > 0) {
    layers.push({
      layerNumber: currentLayerNumber,
      description: currentDescription,
      code: currentCode.join('\n').trim(),
    })
  }

  // If we had pre-layer code and also found layer markers, add as layer 0
  if (foundAnyLayerMarker && preLayerCode.length > 0) {
    const setupCode = preLayerCode.join('\n').trim()
    if (setupCode) {
      layers.unshift({
        layerNumber: 0,
        description: 'Setup',
        code: setupCode,
      })
    }
  }

  // If no layer markers were found at all, wrap everything as a single layer
  if (!foundAnyLayerMarker) {
    const bodyLines = lines
      .filter(l => !l.includes('\\begin{tikzpicture}') && l.trim() !== '\\end{tikzpicture}')
      .filter(l => !preambleLines.includes(l))

    layers.push({
      layerNumber: 1,
      description: 'Complete diagram',
      code: bodyLines.join('\n').trim(),
    })
  }

  return {
    preamble: preambleLines.join('\n'),
    tikzpictureOptions,
    layers,
  }
}

/**
 * Build a complete TikZ document for step N (cumulative: layers 1..N).
 *
 * Layer 0 (setup) is always included if present.
 * Step number is clamped to the available range.
 */
export function buildCumulativeStep(parsed: ParsedTikz, stepNumber: number): string {
  const { preamble, tikzpictureOptions, layers } = parsed

  // Include layer 0 (setup) always, plus all numbered layers up to stepNumber
  const includedLayers = layers.filter(
    l => l.layerNumber === 0 || l.layerNumber <= stepNumber
  )

  const bodyCode = includedLayers
    .map(l => l.code)
    .filter(Boolean)
    .join('\n\n')

  const parts: string[] = []
  if (preamble) parts.push(preamble)
  parts.push(`\\begin{tikzpicture}${tikzpictureOptions}`)
  parts.push(bodyCode)
  parts.push('\\end{tikzpicture}')

  return parts.join('\n')
}

/**
 * Build a cumulative TikZ document for step N with visual highlighting.
 *
 * Visual strategy:
 * - Layer 0 (setup): always included at full color — axes, ground, etc.
 * - Layers 1..N-1 (previous steps): faded to gray so they visually recede
 * - Layer N (current step): lines/arrows in red, text stays black for readability
 *
 * This creates a clear visual hierarchy: you instantly see what's new (red)
 * vs. what was already there (gray) vs. the base canvas (normal).
 *
 * The xcolor package is required (already in tikz-executor.ts preamble).
 */
export function buildCumulativeStepWithHighlight(parsed: ParsedTikz, stepNumber: number): string {
  const { preamble, tikzpictureOptions, layers } = parsed

  // Separate layers into categories
  const setupLayer = layers.find(l => l.layerNumber === 0)
  const previousLayers = layers.filter(
    l => l.layerNumber > 0 && l.layerNumber < stepNumber
  )
  const currentLayer = layers.find(l => l.layerNumber === stepNumber)

  // Build body: setup (normal) + previous (gray) + current (red lines, black text)
  const bodyParts: string[] = []

  // Setup layer stays at full color — it's the "canvas"
  if (setupLayer?.code) {
    bodyParts.push(setupLayer.code)
  }

  // Previous layers fade to gray for visual depth
  if (previousLayers.length > 0) {
    bodyParts.push('% --- Previous steps (faded) ---')
    bodyParts.push('\\begingroup\\color{gray!50}')
    for (const layer of previousLayers) {
      if (layer.code) {
        bodyParts.push(layer.code)
      }
    }
    bodyParts.push('\\endgroup')
  }

  // Current layer: red lines/arrows but BLACK text for readability
  if (currentLayer?.code) {
    bodyParts.push('% --- Current step (highlighted) ---')
    bodyParts.push('\\begin{scope}[every path/.append style={draw=red!80, line width=1.2pt}, every node/.append style={text=black}]')
    bodyParts.push(currentLayer.code)
    bodyParts.push('\\end{scope}')
  }

  const parts: string[] = []
  if (preamble) parts.push(preamble)
  parts.push(`\\begin{tikzpicture}${tikzpictureOptions}`)
  parts.push(bodyParts.filter(Boolean).join('\n\n'))
  parts.push('\\end{tikzpicture}')

  return parts.join('\n')
}

/**
 * Validate that layer count matches expected step count.
 *
 * Returns alignment info including whether they match,
 * how many numbered layers exist, and a descriptive message.
 */
export function validateLayerStepAlignment(
  parsed: ParsedTikz,
  expectedSteps: number,
): { valid: boolean; layerCount: number; message?: string } {
  const numbered = parsed.layers.filter(l => l.layerNumber > 0)
  if (numbered.length === expectedSteps) {
    return { valid: true, layerCount: numbered.length }
  }
  if (numbered.length < expectedSteps) {
    return {
      valid: false,
      layerCount: numbered.length,
      message: `Expected ${expectedSteps} layers, found ${numbered.length}. Last ${expectedSteps - numbered.length} step(s) will have no diagram.`,
    }
  }
  return {
    valid: false,
    layerCount: numbered.length,
    message: `Found ${numbered.length} layers for ${expectedSteps} steps. Extra layers will be ignored.`,
  }
}

/**
 * Estimate cumulative TikZ document size (in characters) for each step.
 *
 * Returns an array where index i is the total character count of the
 * TikZ document for step i+1 (including preamble, setup, and all
 * cumulative layers + highlight wrappers).
 *
 * Used to predict which steps may exceed the QuickLaTeX 3500 char limit.
 */
export function estimateCumulativeSize(parsed: ParsedTikz): number[] {
  const { preamble, tikzpictureOptions, layers } = parsed
  const numbered = layers.filter(l => l.layerNumber > 0)
  const setupLayer = layers.find(l => l.layerNumber === 0)

  // Base overhead: preamble + \begin{tikzpicture}[...] + \end{tikzpicture}
  const baseOverhead =
    (preamble ? preamble.length + 1 : 0) +
    `\\begin{tikzpicture}${tikzpictureOptions}`.length + 1 +
    '\\end{tikzpicture}'.length + 1

  // Setup layer (always included)
  const setupSize = setupLayer?.code.length || 0

  // Highlight wrapping overhead per step
  const grayWrapOverhead = '% --- Previous steps (faded) ---\n\\begingroup\\color{gray!50}\n\\endgroup'.length
  const redScopeOverhead = '% --- Current step (highlighted) ---\n\\begin{scope}[every path/.append style={draw=red!80, line width=1.2pt}, every node/.append style={text=black}]\n\\end{scope}'.length

  const sizes: number[] = []
  let cumulativePrevious = 0

  for (let i = 0; i < numbered.length; i++) {
    const currentLayerSize = numbered[i].code.length

    let totalSize = baseOverhead + setupSize
    if (i > 0) {
      // Previous layers wrapped in gray
      totalSize += grayWrapOverhead + cumulativePrevious
    }
    // Current layer wrapped in red scope
    totalSize += redScopeOverhead + currentLayerSize

    sizes.push(totalSize)
    cumulativePrevious += numbered[i].code.length
  }

  return sizes
}
