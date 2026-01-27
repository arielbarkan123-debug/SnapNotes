/**
 * Math Visualization Types
 * Step-synced diagrams for math problems (long division, equations, fractions, etc.)
 */

// ============================================================================
// Long Division Types
// ============================================================================

export interface LongDivisionStep {
  /** Step number (0-indexed) */
  step: number
  /** Type of operation in this step */
  type: 'setup' | 'divide' | 'multiply' | 'subtract' | 'bring_down' | 'remainder' | 'complete' | 'check'
  /** Position in the division - for quotient digits, this is the dividend position they align with */
  position: number
  /** Starting position for quotient (only in 'setup' step) - indicates which dividend digit the first quotient digit aligns above */
  quotientStartPosition?: number
  /** The quotient digit found in this step (for 'divide' type) */
  quotientDigit?: number
  /** The product written below (for 'multiply' type) */
  product?: number
  /** The difference after subtraction (for 'subtract' type) */
  difference?: number
  /** The new working number after bringing down (for 'bring_down' type) */
  workingNumber?: number
  /** Explanation for this step */
  explanation?: string
  explanationHe?: string
  /** Calculation shown (e.g., "5 × 7 = 35") */
  calculation?: string
  /** Whether this step is highlighted */
  highlighted?: boolean
}

export interface LongDivisionData {
  /** The dividend (number being divided) */
  dividend: number
  /** The divisor (number dividing by) */
  divisor: number
  /** The quotient (answer) */
  quotient: number
  /** The remainder (if any) */
  remainder: number
  /** All steps in the division process */
  steps: LongDivisionStep[]
  /** Current step being shown */
  currentStep?: number
  /** Title for the diagram */
  title?: string
}

// ============================================================================
// Equation Solving Types
// ============================================================================

export interface EquationStep {
  /** Step number */
  step: number
  /** The equation at this step (e.g., "2x + 5 = 15") */
  equation: string
  /** What operation was performed to get here */
  operation?: 'initial' | 'add' | 'subtract' | 'multiply' | 'divide' | 'simplify' | 'combine' | 'distribute' | 'factor'
  /** Description of the operation (e.g., "Subtract 5 from both sides") */
  description?: string
  descriptionHe?: string
  /** The calculation shown (e.g., "-5 from both sides") */
  calculation?: string
  /** Whether this step is highlighted */
  highlighted?: boolean
  /** Left side of equation */
  leftSide: string
  /** Right side of equation */
  rightSide: string
}

export interface EquationData {
  /** Original equation */
  originalEquation: string
  /** Variable being solved for */
  variable: string
  /** Final solution */
  solution: string
  /** All steps to solve */
  steps: EquationStep[]
  /** Title */
  title?: string
  /** Show balance scale visualization */
  showBalanceScale?: boolean
}

// ============================================================================
// Fraction Types
// ============================================================================

export interface Fraction {
  numerator: number
  denominator: number
  /** Display as mixed number */
  wholeNumber?: number
  /** Color for visualization */
  color?: string
}

export interface FractionStep {
  step: number
  type: 'initial' | 'find_lcd' | 'convert' | 'operate' | 'simplify' | 'result'
  /** Fractions shown at this step */
  fractions: Fraction[]
  /** Operation symbol between fractions */
  operator?: '+' | '-' | '×' | '÷'
  /** Result fraction */
  result?: Fraction
  /** LCD if applicable */
  lcd?: number
  /** Description of what's happening */
  description?: string
  descriptionHe?: string
  /** Calculation shown */
  calculation?: string
  highlighted?: boolean
}

export interface FractionOperationData {
  /** The operation type */
  operationType: 'add' | 'subtract' | 'multiply' | 'divide'
  /** First fraction */
  fraction1: Fraction
  /** Second fraction */
  fraction2: Fraction
  /** Final result */
  result: Fraction
  /** All steps */
  steps: FractionStep[]
  /** Title */
  title?: string
  /** Show pie chart visualization */
  showPieChart?: boolean
  /** Show bar model visualization */
  showBarModel?: boolean
}

// ============================================================================
// Number Line Types (extended for step-sync)
// ============================================================================

export interface NumberLineStep {
  step: number
  type: 'setup' | 'mark_point' | 'mark_interval' | 'highlight' | 'compare'
  /** Points visible at this step */
  visiblePoints: number[]
  /** Intervals visible at this step */
  visibleIntervals?: Array<{ start: number | null; end: number | null }>
  /** Description */
  description?: string
  descriptionHe?: string
  highlighted?: boolean
}

export interface NumberLineData {
  min: number
  max: number
  points: Array<{
    value: number
    label?: string
    style?: 'filled' | 'hollow'
    color?: string
  }>
  intervals?: Array<{
    start: number | null
    end: number | null
    startInclusive?: boolean
    endInclusive?: boolean
    color?: string
  }>
  steps?: NumberLineStep[]
  title?: string
}

// ============================================================================
// Coordinate Plane Types (extended for step-sync)
// ============================================================================

export interface CoordinatePlaneStep {
  step: number
  type: 'setup' | 'plot_point' | 'draw_line' | 'draw_curve' | 'shade_region' | 'find_intersection'
  /** Elements visible at this step */
  visiblePoints?: string[]
  visibleLines?: string[]
  visibleCurves?: string[]
  description?: string
  descriptionHe?: string
  calculation?: string
  highlighted?: boolean
}

export interface CoordinatePlaneData {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  xLabel?: string
  yLabel?: string
  showGrid?: boolean
  points?: Array<{
    id: string
    x: number
    y: number
    label?: string
    color?: string
  }>
  lines?: Array<{
    id: string
    points: [{ x: number; y: number }, { x: number; y: number }]
    color?: string
    dashed?: boolean
    type?: 'segment' | 'ray' | 'line'
  }>
  curves?: Array<{
    id: string
    expression: string
    color?: string
    domain?: { min: number; max: number }
  }>
  steps?: CoordinatePlaneStep[]
  title?: string
}

// ============================================================================
// Geometry Types
// ============================================================================

export interface GeometryStep {
  step: number
  type: 'setup' | 'draw' | 'mark' | 'label' | 'calculate' | 'highlight'
  /** Elements visible at this step */
  visibleElements: string[]
  /** Measurements visible */
  visibleMeasurements?: string[]
  description?: string
  descriptionHe?: string
  calculation?: string
  highlighted?: boolean
}

export interface TriangleData {
  /** Vertices */
  vertices: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }]
  /** Vertex labels */
  labels?: [string, string, string]
  /** Side lengths (if known) */
  sides?: [number | null, number | null, number | null]
  /** Angle measures in degrees (if known) */
  angles?: [number | null, number | null, number | null]
  /** What to show */
  showSides?: boolean
  showAngles?: boolean
  showHeight?: boolean
  showMedians?: boolean
  /** Step configuration */
  steps?: GeometryStep[]
  title?: string
}

export interface CircleData {
  center: { x: number; y: number }
  radius: number
  /** Elements to show */
  showRadius?: boolean
  showDiameter?: boolean
  showChord?: { from: number; to: number } // angles in degrees
  showArc?: { from: number; to: number; color?: string }
  showSector?: { from: number; to: number; color?: string }
  showTangent?: { at: number } // angle where tangent touches
  /** Step configuration */
  steps?: GeometryStep[]
  title?: string
}

// ============================================================================
// Combined Math Diagram Types
// ============================================================================

export type MathDiagramType =
  | 'long_division'
  | 'equation'
  | 'fraction'
  | 'number_line'
  | 'coordinate_plane'
  | 'triangle'
  | 'circle'
  | 'bar_model'
  | 'area_model'
  | 'factoring'
  | 'completing_square'
  | 'polynomial'
  | 'radical'
  | 'systems'
  | 'inequality'

// Base MathDiagramData - new diagram types use 'unknown' casting in renderer
// to avoid circular dependencies
export type MathDiagramData =
  | LongDivisionData
  | EquationData
  | FractionOperationData
  | NumberLineData
  | CoordinatePlaneData
  | TriangleData
  | CircleData
  // New diagram types are handled via unknown casting in MathDiagramRenderer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | Record<string, any>

export interface MathDiagramState {
  /** Type of diagram */
  type: MathDiagramType
  /** Diagram-specific data */
  data: MathDiagramData
  /** Current step to display */
  visibleStep: number
  /** Total number of steps */
  totalSteps?: number
  /** Step configuration for progressive reveal */
  stepConfig?: MathDiagramStepConfig[]
  /** Evolution mode: manual = user controls, auto-advance = progresses with conversation */
  evolutionMode?: 'manual' | 'auto-advance'
  /** Conversation turn when this diagram was introduced/updated */
  conversationTurn?: number
  /** Elements that were added/updated in this step (for highlighting new additions) */
  updatedElements?: string[]
}

export interface MathDiagramStepConfig {
  step: number
  /** Label for this step */
  stepLabel?: string
  stepLabelHe?: string
  /** Calculation to show */
  showCalculation?: string
  /** Animation type */
  animation?: 'none' | 'fade' | 'draw' | 'highlight'
}

// ============================================================================
// Tutor Response Extension
// ============================================================================

export interface TutorMathDiagramResponse {
  /** The diagram state */
  diagram: MathDiagramState
  /** Whether this diagram should replace the previous one */
  replacePrevious?: boolean
}

// ============================================================================
// Styling Constants
// ============================================================================

export const MATH_COLORS = {
  primary: '#4f46e5', // indigo
  secondary: '#6366f1', // lighter indigo
  success: '#22c55e', // green
  error: '#ef4444', // red
  warning: '#f59e0b', // amber
  highlight: '#fbbf24', // yellow
  muted: '#9ca3af', // gray
  dividend: '#1f2937', // dark gray
  divisor: '#4b5563', // gray
  quotient: '#4f46e5', // indigo
  product: '#dc2626', // red for subtraction
  difference: '#059669', // emerald
  workingNumber: '#2563eb', // blue
} as const

export const FRACTION_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
] as const
