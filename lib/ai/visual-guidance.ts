/**
 * Visual Guidance System
 *
 * Provides recommendations (not requirements) for which visual types
 * are most helpful for specific math topics. This helps the AI generate
 * more visually-rich explanations when appropriate.
 */

import type { MathVisualType } from '@/types'

// ============================================
// VISUAL SUGGESTIONS MAP
// ============================================

/**
 * Maps math topics to their recommended visual types.
 * These are SUGGESTIONS, not requirements - the AI should use judgment
 * about when visuals actually help understanding.
 */
export const VISUAL_SUGGESTIONS: Record<string, MathVisualType[]> = {
  // Geometry
  triangles: ['triangle'],
  circles: ['circle'],
  polygons: ['coordinate_plane'],
  angles: ['triangle', 'coordinate_plane'],
  area: ['triangle', 'circle', 'coordinate_plane'],
  perimeter: ['triangle', 'coordinate_plane'],
  similarity: ['triangle'],
  congruence: ['triangle'],

  // Algebra
  quadratic_equations: ['coordinate_plane', 'number_line'],
  linear_equations: ['number_line', 'coordinate_plane'],
  inequalities: ['number_line'],
  systems_of_equations: ['coordinate_plane'],
  absolute_value: ['number_line'],
  polynomials: ['coordinate_plane'],
  rational_expressions: ['coordinate_plane'],

  // Trigonometry
  trig_equations: ['unit_circle', 'triangle'],
  trig_identities: ['unit_circle'],
  trig_functions: ['unit_circle', 'coordinate_plane'],
  right_triangles: ['triangle'],
  law_of_sines: ['triangle'],
  law_of_cosines: ['triangle'],

  // Functions
  finding_roots: ['coordinate_plane', 'number_line'],
  domain_range: ['coordinate_plane', 'number_line'],
  function_graphs: ['coordinate_plane'],
  transformations: ['coordinate_plane'],
  inverse_functions: ['coordinate_plane'],
  composition: ['coordinate_plane'],

  // Calculus
  limits: ['coordinate_plane'],
  derivatives: ['coordinate_plane'],
  integrals: ['coordinate_plane'],
  area_under_curve: ['coordinate_plane'],
  optimization: ['coordinate_plane'],
  related_rates: ['coordinate_plane'],

  // Probability & Statistics
  counting: ['tree_diagram'],
  probability: ['tree_diagram'],
  combinations: ['tree_diagram'],
  permutations: ['tree_diagram'],
  conditional_probability: ['tree_diagram'],

  // Number Theory
  number_patterns: ['number_line', 'table'],
  sequences: ['table', 'coordinate_plane'],
  series: ['table'],
}

// ============================================
// GUIDANCE FUNCTIONS
// ============================================

/**
 * Get suggested visual types for a topic
 * @param topicId - The topic identifier (can be partial match)
 * @returns Array of suggested visual types, or empty array if no suggestions
 */
export function getSuggestedVisuals(topicId: string): MathVisualType[] {
  const normalizedTopic = topicId.toLowerCase().replace(/[_-]/g, '_')

  // Direct match
  if (VISUAL_SUGGESTIONS[normalizedTopic]) {
    return VISUAL_SUGGESTIONS[normalizedTopic]
  }

  // Partial match - check if topic contains any key
  for (const [key, visuals] of Object.entries(VISUAL_SUGGESTIONS)) {
    if (normalizedTopic.includes(key) || key.includes(normalizedTopic)) {
      return visuals
    }
  }

  return []
}

/**
 * Get the primary (first) suggested visual for a topic
 */
export function getPrimarySuggestedVisual(
  topicId: string
): MathVisualType | null {
  const suggestions = getSuggestedVisuals(topicId)
  return suggestions.length > 0 ? suggestions[0] : null
}

/**
 * Check if a topic has visual suggestions
 */
export function hasVisualSuggestions(topicId: string): boolean {
  return getSuggestedVisuals(topicId).length > 0
}

// ============================================
// VISUAL GUIDANCE PROMPTS
// ============================================

/**
 * Visual guidance descriptions for each type
 */
const VISUAL_GUIDANCE_DESCRIPTIONS: Record<MathVisualType, string> = {
  number_line: `
    NumberLine - Best for: inequalities, absolute value, roots, intervals
    Data structure:
    {
      type: "number_line",
      data: {
        min: number,
        max: number,
        points: [{ value: number, label?: string, color?: string }],
        regions?: [{ start: number, end: number, color?: string, label?: string }],
        title?: string
      }
    }`,
  coordinate_plane: `
    CoordinatePlane - Best for: graphing functions, systems of equations, transformations
    Data structure:
    {
      type: "coordinate_plane",
      data: {
        xRange: [min, max],
        yRange: [min, max],
        functions?: [{ expression: string, color?: string, label?: string }],
        points?: [{ x: number, y: number, label?: string, color?: string }],
        lines?: [{ x1, y1, x2, y2, color?, dashed? }],
        title?: string
      }
    }`,
  triangle: `
    Triangle - Best for: geometry, trigonometry, similarity/congruence
    Data structure:
    {
      type: "triangle",
      data: {
        vertices: { A: {x, y}, B: {x, y}, C: {x, y} },
        labels?: { A?: string, B?: string, C?: string },
        showAngles?: boolean,
        showSides?: boolean,
        angles?: { A?: number, B?: number, C?: number },
        sides?: { AB?: number, BC?: number, CA?: number },
        title?: string
      }
    }`,
  circle: `
    Circle - Best for: circle geometry, arc length, sector area
    Data structure:
    {
      type: "circle",
      data: {
        center: { x: number, y: number },
        radius: number,
        showRadius?: boolean,
        showDiameter?: boolean,
        sectors?: [{ startAngle, endAngle, color?, label? }],
        points?: [{ angle: number, label?: string }],
        title?: string
      }
    }`,
  unit_circle: `
    UnitCircle - Best for: trigonometry, angles, trig values
    Data structure:
    {
      type: "unit_circle",
      data: {
        highlightedAngles?: number[],  // angles in degrees
        showCoordinates?: boolean,
        showTrigValues?: boolean,
        selectedAngle?: number,
        title?: string
      }
    }`,
  table: `
    Table - Best for: data comparison, sequences, function values
    Data structure:
    {
      type: "table",
      data: {
        headers: string[],
        rows: (string | number)[][],
        title?: string,
        highlightRows?: number[],
        highlightCols?: number[]
      }
    }`,
  tree_diagram: `
    TreeDiagram - Best for: probability, counting, decision trees
    Data structure:
    {
      type: "tree_diagram",
      data: {
        root: {
          id: string,
          label: string,
          value?: string,
          children?: TreeNode[]
        },
        showProbabilities?: boolean,
        title?: string
      }
    }`,
}

/**
 * Generate visual guidance text for AI prompts based on topic
 */
export function getVisualGuidanceForPrompt(topicId: string): string {
  const suggestions = getSuggestedVisuals(topicId)

  if (suggestions.length === 0) {
    return ''
  }

  const guidanceLines = suggestions
    .map((type) => VISUAL_GUIDANCE_DESCRIPTIONS[type])
    .filter(Boolean)

  return `
VISUAL GUIDANCE for this topic:
Consider including one of these visual types if it helps explain the concept:

${guidanceLines.join('\n\n')}

When to include visuals:
- When the concept is spatial or geometric
- When showing a relationship between values
- When a diagram clarifies the solution approach
- When highlighting where common mistakes occur

When NOT to include visuals:
- For simple arithmetic or basic calculations
- When the concept is purely algebraic manipulation
- When text explanation is clearer than a diagram
`
}

/**
 * Get a comprehensive visual guidance section for prompts
 * Includes all visual types for reference
 */
export function getFullVisualGuidance(): string {
  return `
AVAILABLE VISUAL TYPES:
When a visual would help understanding, include one in the response.
Each visual should have a "visual" field with type and data.

${Object.values(VISUAL_GUIDANCE_DESCRIPTIONS).join('\n\n')}

Guidelines:
- Include visuals when they clarify the concept
- Don't force visuals where they don't add value
- Use appropriate visual type for the math topic
- Include error highlighting when showing common mistakes
`
}

// ============================================
// ERROR VISUALIZATION GUIDANCE
// ============================================

/**
 * Guidance for error visualization in visuals
 */
export const ERROR_VISUAL_GUIDANCE = `
ERROR HIGHLIGHTING IN VISUALS:
When showing mistakes or corrections, use these patterns:

1. Wrong values/points:
   - Add "isError: true" to highlight in red
   - Include "errorLabel" with brief description

2. Correct values:
   - Add "isCorrect: true" to highlight in green
   - Use alongside wrong values for comparison

3. For number lines:
   errorHighlight: {
     wrongPoints: [{ value: 2, isError: true, errorLabel: "Found root, not solution" }],
     correctRegions: [{ start: -Infinity, end: 2, isCorrect: true }]
   }

4. For coordinate planes:
   errorHighlight: {
     wrongPoints: [{ x: 2, y: 3, isError: true }],
     correctPoints: [{ x: 2, y: -3, isCorrect: true }]
   }

5. For triangles:
   errorHighlight: {
     wrongSides: ["AB"],
     wrongAngles: ["C"],
     corrections: { "AB": "should be 5, not 3" }
   }
`

export default {
  VISUAL_SUGGESTIONS,
  getSuggestedVisuals,
  getPrimarySuggestedVisual,
  hasVisualSuggestions,
  getVisualGuidanceForPrompt,
  getFullVisualGuidance,
  ERROR_VISUAL_GUIDANCE,
}
