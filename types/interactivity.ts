/**
 * Interactivity Types
 *
 * Type definitions for Phase 3: Interactive diagram parameters,
 * "What If" mode, and exploration suggestions.
 */

// =============================================================================
// Parameter Definitions
// =============================================================================

/**
 * Definition of an adjustable parameter for interactive diagrams
 */
export interface ParameterDefinition {
  /** Unique identifier for the parameter */
  name: string
  /** Display label (English) */
  label: string
  /** Display label (Hebrew) */
  labelHe?: string
  /** Current/default value */
  default: number
  /** Minimum allowed value */
  min: number
  /** Maximum allowed value */
  max: number
  /** Step increment for slider */
  step: number
  /** Unit of measurement (e.g., "kg", "m/s", "°") */
  unit?: string
  /** Unit in Hebrew (e.g., 'ק"ג', "מ/ש", "°") */
  unitHe?: string
  /** Optional description/tooltip */
  description?: string
  /** Optional description in Hebrew */
  descriptionHe?: string
  /** Category for grouping related parameters */
  category?: 'mass' | 'force' | 'angle' | 'velocity' | 'distance' | 'friction' | 'time' | 'other'
  /** Whether this parameter affects physics calculations */
  affectsPhysics?: boolean
  /** Color for the slider (defaults to subject color) */
  color?: string
}

/**
 * Marks/ticks to display on a slider
 */
export interface SliderMark {
  /** Value where the mark appears */
  value: number
  /** Label to display */
  label: string
  /** Hebrew label */
  labelHe?: string
}

// =============================================================================
// Parameter Slider Component Props
// =============================================================================

export interface ParameterSliderProps {
  /** Parameter definition */
  parameter: ParameterDefinition
  /** Current value */
  value: number
  /** Change handler */
  onChange: (value: number) => void
  /** Language for labels */
  language?: 'en' | 'he'
  /** Optional marks/ticks on the slider */
  marks?: SliderMark[]
  /** Show current value display */
  showValue?: boolean
  /** Custom color override */
  color?: string
  /** Disabled state */
  disabled?: boolean
  /** Compact mode (smaller UI) */
  compact?: boolean
  /** Additional className */
  className?: string
}

// =============================================================================
// What If Mode
// =============================================================================

/**
 * Result of a physics calculation
 */
export interface CalculationResult {
  /** The calculated value */
  value: number
  /** Unit of measurement */
  unit: string
  /** Human-readable description */
  description: string
  /** Hebrew description */
  descriptionHe?: string
  /** Label for the result (e.g., "Acceleration", "Net Force") */
  label: string
  /** Hebrew label */
  labelHe?: string
  /** Formatted value string (e.g., "3.45 m/s²") */
  formatted: string
  /** Whether this is the primary/main result */
  isPrimary?: boolean
}

/**
 * Exploration suggestion from AI or predefined
 */
export interface ExplorationSuggestion {
  /** Unique identifier */
  id: string
  /** Question to prompt exploration (e.g., "What if the angle was steeper?") */
  question: string
  /** Hebrew question */
  questionHe?: string
  /** Parameter changes to apply when clicking this suggestion */
  parameterChanges: Record<string, number>
  /** Why this is interesting/educational */
  insight?: string
  /** Hebrew insight */
  insightHe?: string
  /** Expected outcome description */
  expectedOutcome?: string
  /** Hebrew expected outcome */
  expectedOutcomeHe?: string
}

/**
 * Props for WhatIfMode component
 */
export interface WhatIfModeProps {
  /** Parameter definitions for this diagram */
  parameters: ParameterDefinition[]
  /** Current parameter values */
  values: Record<string, number>
  /** Handler for parameter changes */
  onParameterChange: (name: string, value: number) => void
  /** Handler for bulk parameter changes (from suggestions) */
  onParametersChange: (changes: Record<string, number>) => void
  /** Calculation results to display */
  results: CalculationResult[]
  /** Exploration suggestions */
  suggestions?: ExplorationSuggestion[]
  /** Language */
  language?: 'en' | 'he'
  /** Subject for theming */
  subject?: 'physics' | 'math' | 'chemistry' | 'biology' | 'geometry'
  /** Whether the panel is expanded */
  expanded?: boolean
  /** Toggle expansion */
  onToggleExpanded?: () => void
  /** Reset to default values */
  onReset?: () => void
  /** Additional className */
  className?: string
}

// =============================================================================
// Interactive Diagram Configuration
// =============================================================================

/**
 * Configuration for making a diagram interactive
 */
export interface InteractiveDiagramConfig {
  /** Whether interactivity is enabled */
  enabled: boolean
  /** Parameter definitions */
  parameters: ParameterDefinition[]
  /** Function to calculate results from parameters */
  calculate: (params: Record<string, number>) => CalculationResult[]
  /** Predefined exploration suggestions */
  suggestions?: ExplorationSuggestion[]
  /** Whether to show "What If" mode by default */
  defaultExpanded?: boolean
}

/**
 * Props added to diagram components when interactive
 */
export interface InteractiveDiagramProps {
  /** Enable interactive mode */
  interactive?: boolean
  /** Initial parameter values (overrides defaults) */
  initialValues?: Record<string, number>
  /** Callback when parameters change */
  onParametersChange?: (values: Record<string, number>) => void
  /** Callback when calculation results update */
  onResultsChange?: (results: CalculationResult[]) => void
  /** Custom suggestions (in addition to defaults) */
  customSuggestions?: ExplorationSuggestion[]
  /** Hide the "What If" panel (only update diagram) */
  hideWhatIfPanel?: boolean
}

// =============================================================================
// Physics-Specific Parameter Presets
// =============================================================================

/**
 * Common physics parameters with sensible defaults
 */
export const PHYSICS_PARAMETER_PRESETS = {
  mass: {
    name: 'mass',
    label: 'Mass',
    labelHe: 'מסה',
    min: 0.1,
    max: 100,
    step: 0.1,
    default: 5,
    unit: 'kg',
    unitHe: 'ק"ג',
    category: 'mass' as const,
    affectsPhysics: true,
  },
  angle: {
    name: 'angle',
    label: 'Angle',
    labelHe: 'זווית',
    min: 0,
    max: 90,
    step: 1,
    default: 30,
    unit: '°',
    unitHe: '°',
    category: 'angle' as const,
    affectsPhysics: true,
  },
  friction: {
    name: 'frictionCoefficient',
    label: 'Friction Coefficient',
    labelHe: 'מקדם חיכוך',
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.3,
    unit: '',
    unitHe: '',
    category: 'friction' as const,
    affectsPhysics: true,
  },
  velocity: {
    name: 'velocity',
    label: 'Velocity',
    labelHe: 'מהירות',
    min: 0,
    max: 50,
    step: 0.5,
    default: 10,
    unit: 'm/s',
    unitHe: 'מ/ש',
    category: 'velocity' as const,
    affectsPhysics: true,
  },
  radius: {
    name: 'radius',
    label: 'Radius',
    labelHe: 'רדיוס',
    min: 0.1,
    max: 10,
    step: 0.1,
    default: 2,
    unit: 'm',
    unitHe: 'מ׳',
    category: 'distance' as const,
    affectsPhysics: true,
  },
  height: {
    name: 'height',
    label: 'Height',
    labelHe: 'גובה',
    min: 0,
    max: 50,
    step: 0.5,
    default: 0,
    unit: 'm',
    unitHe: 'מ׳',
    category: 'distance' as const,
    affectsPhysics: true,
  },
  force: {
    name: 'force',
    label: 'Force',
    labelHe: 'כוח',
    min: 0,
    max: 500,
    step: 1,
    default: 50,
    unit: 'N',
    unitHe: 'ניוטון',
    category: 'force' as const,
    affectsPhysics: true,
  },
  gravity: {
    name: 'gravity',
    label: 'Gravity',
    labelHe: 'תאוצת כבידה',
    min: 1,
    max: 25,
    step: 0.1,
    default: 9.8,
    unit: 'm/s²',
    unitHe: 'מ/ש²',
    category: 'other' as const,
    affectsPhysics: true,
  },
} as const

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Extract parameter names from a parameter definition array
 */
export type ParameterNames<T extends readonly ParameterDefinition[]> = T[number]['name']

/**
 * Create a values record type from parameter definitions
 */
export type ParameterValues<T extends readonly ParameterDefinition[]> = {
  [K in ParameterNames<T>]: number
}

/**
 * State for useInteractiveParameters hook
 */
export interface InteractiveParametersState {
  /** Current parameter values */
  values: Record<string, number>
  /** Whether any parameter has changed from default */
  isDirty: boolean
  /** History for undo functionality */
  history: Record<string, number>[]
  /** Current position in history */
  historyIndex: number
}

/**
 * Actions for useInteractiveParameters hook
 */
export interface InteractiveParametersActions {
  /** Update a single parameter */
  setValue: (name: string, value: number) => void
  /** Update multiple parameters at once */
  setValues: (changes: Record<string, number>) => void
  /** Reset all parameters to defaults */
  reset: () => void
  /** Undo last change */
  undo: () => void
  /** Redo last undone change */
  redo: () => void
  /** Check if undo is available */
  canUndo: boolean
  /** Check if redo is available */
  canRedo: boolean
}
