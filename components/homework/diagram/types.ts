/**
 * Diagram types and constants for TutoringChat
 */

import type { DiagramState as PhysicsDiagramState } from '@/types/physics'
import type { MathDiagramState } from '@/types/math'

// Combined diagram type that can be either physics or math
export type DiagramState = PhysicsDiagramState | MathDiagramState

// Physics diagram types
export const PHYSICS_DIAGRAM_TYPES = [
  'fbd',
  'inclined_plane',
  'projectile',
  'pulley',
  'circuit',
  'wave',
  'optics',
  'motion',
]

// Math diagram types
export const MATH_DIAGRAM_TYPES = [
  'long_division',
  'equation',
  'fraction',
  'number_line',
  'coordinate_plane',
  'triangle',
  'circle',
  'bar_model',
  'area_model',
]

// Chemistry diagram types (for future use)
export const CHEMISTRY_DIAGRAM_TYPES = ['molecule', 'reaction', 'energy_diagram']

// Biology diagram types (for future use)
export const BIOLOGY_DIAGRAM_TYPES = ['cell', 'system', 'process_flow']

// Human-readable diagram type names
export const DIAGRAM_TYPE_NAMES: Record<string, string> = {
  // Physics diagrams
  fbd: 'Free Body Diagram',
  inclined_plane: 'Inclined Plane',
  projectile: 'Projectile Motion',
  pulley: 'Pulley System',
  circuit: 'Circuit Diagram',
  wave: 'Wave Diagram',
  optics: 'Optics',
  motion: 'Motion Diagram',
  // Math diagrams
  long_division: 'Long Division',
  equation: 'Equation Solving',
  fraction: 'Fractions',
  number_line: 'Number Line',
  coordinate_plane: 'Coordinate Plane',
  triangle: 'Triangle',
  circle: 'Circle',
  bar_model: 'Bar Model',
  area_model: 'Area Model',
  // Chemistry diagrams
  molecule: 'Molecule Structure',
  reaction: 'Chemical Reaction',
  energy_diagram: 'Energy Diagram',
  // Biology diagrams
  cell: 'Cell Structure',
  system: 'System Diagram',
  process_flow: 'Process Flow',
}

/**
 * Type guard for physics diagrams
 */
export function isPhysicsDiagram(diagram: DiagramState): diagram is PhysicsDiagramState {
  return PHYSICS_DIAGRAM_TYPES.includes(diagram.type as string)
}

/**
 * Type guard for math diagrams
 */
export function isMathDiagram(diagram: DiagramState): diagram is MathDiagramState {
  return MATH_DIAGRAM_TYPES.includes(diagram.type as string)
}

/**
 * Type guard for chemistry diagrams (for future use)
 */
export function isChemistryDiagram(diagram: DiagramState): boolean {
  return CHEMISTRY_DIAGRAM_TYPES.includes(diagram.type as string)
}

/**
 * Type guard for biology diagrams (for future use)
 */
export function isBiologyDiagram(diagram: DiagramState): boolean {
  return BIOLOGY_DIAGRAM_TYPES.includes(diagram.type as string)
}

/**
 * Get human-readable diagram type name
 */
export function getDiagramTypeName(type: string): string {
  return DIAGRAM_TYPE_NAMES[type] || type.replace(/_/g, ' ')
}
