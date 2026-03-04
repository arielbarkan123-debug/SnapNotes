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
  /** Layered TikZ source for on-demand step-by-step rendering (TikZ pipeline only) */
  stepByStepSource?: StepByStepSource
}

// Engine-generated image types (E2B/TikZ/Recraft pipeline)
export const ENGINE_DIAGRAM_TYPES = ['engine_image', 'step_sequence']

// Components that manage their own step controls
// engine_image and step_sequence both manage their own navigation
export const SELF_MANAGING_DIAGRAM_TYPES = new Set([
  'engine_image',
  'step_sequence',
])

// Human-readable diagram type names
export const DIAGRAM_TYPE_NAMES: Record<string, string> = {
  engine_image: 'AI Generated Diagram',
  step_sequence: 'Step-by-Step Breakdown',
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

/** Metadata for one layer in a step-by-step TikZ build-up */
export interface StepLayerMeta {
  /** Layer number (1-based, cumulative) */
  layer: number
  /** Short label for this step (EN) */
  label: string
  /** Short label for this step (HE) */
  labelHe: string
  /** Full explanation of what this step adds (EN) */
  explanation: string
  /** Full explanation of what this step adds (HE) */
  explanationHe: string
}

/** Source data for on-demand step-by-step rendering */
export interface StepByStepSource {
  /** Complete TikZ code with % === LAYER N === markers */
  tikzCode: string
  /** Metadata for each layer/step */
  steps: StepLayerMeta[]
}

/** Result of rendering step-by-step images */
export interface StepRenderResult {
  /** Image URLs for each cumulative step (index 0 = layer 1 only, etc.) */
  stepImageUrls: string[]
  /** Whether some steps failed to render */
  partial: boolean
  /** Error messages for failed steps (sparse, keyed by step index) */
  errors?: Record<number, string>
}
