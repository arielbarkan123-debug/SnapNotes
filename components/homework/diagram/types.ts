/**
 * Diagram types and constants for TutoringChat
 *
 * The diagram engine (lib/diagram-engine/) generates all diagrams as images.
 * tutor-engine.ts converts AI responses to { type: 'engine_image' } before
 * they reach the frontend. All React SVG diagram components have been removed.
 */

// DiagramState is now a generic record — the only type that reaches the renderer is engine_image
export interface DiagramState {
  type: string
  data?: Record<string, unknown>
  visibleStep?: number
  totalSteps?: number
  stepConfig?: Array<Record<string, unknown>>
}

// Engine-generated image types (E2B/TikZ/Recraft pipeline)
export const ENGINE_DIAGRAM_TYPES = ['engine_image']

// Components that manage their own step controls
// Only engine_image is relevant now, but kept for FullScreenDiagramView compatibility
export const SELF_MANAGING_DIAGRAM_TYPES = new Set([
  'engine_image',
])

// Human-readable diagram type names
export const DIAGRAM_TYPE_NAMES: Record<string, string> = {
  engine_image: 'AI Generated Diagram',
}

/**
 * Check if diagram is an engine-generated image (E2B/TikZ/Recraft)
 */
export function isEngineDiagram(diagram: DiagramState): boolean {
  return ENGINE_DIAGRAM_TYPES.includes(diagram.type)
}

/**
 * Get human-readable diagram type name
 */
export function getDiagramTypeName(type: string): string {
  return DIAGRAM_TYPE_NAMES[type] || type.replace(/_/g, ' ')
}
