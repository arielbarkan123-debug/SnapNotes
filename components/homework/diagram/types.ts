/**
 * Diagram types and constants for TutoringChat
 */

import type { DiagramState as PhysicsDiagramState } from '@/types/physics'
import type { MathDiagramState } from '@/types/math'
import type { ChemistryDiagramState } from '@/types/chemistry'
import type { BiologyDiagramState } from '@/types/biology'
import type { GeometryDiagramState } from '@/types/geometry'

// Combined diagram type that can be physics, math, chemistry, biology, or geometry
export type DiagramState = PhysicsDiagramState | MathDiagramState | ChemistryDiagramState | BiologyDiagramState | GeometryDiagramState

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
  'factoring',
  'completing_square',
  'polynomial',
  'radical',
  'systems',
  'inequality',
  'unit_circle',
  'tree_diagram',
  'interactive_coordinate_plane',
  'equation_grapher',
]

// Chemistry diagram types
export const CHEMISTRY_DIAGRAM_TYPES = ['atom', 'molecule', 'periodic_element', 'bonding']

// Biology diagram types
export const BIOLOGY_DIAGRAM_TYPES = ['cell', 'organelle', 'dna', 'process']

// Geometry diagram types
export const GEOMETRY_DIAGRAM_TYPES = [
  'square',
  'rectangle',
  'triangle',
  'circle',
  'parallelogram',
  'rhombus',
  'trapezoid',
  'regular_polygon',
]

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
  factoring: 'Factoring',
  completing_square: 'Completing the Square',
  polynomial: 'Polynomial Operations',
  radical: 'Radical Simplification',
  systems: 'Systems of Equations',
  inequality: 'Inequalities',
  unit_circle: 'Unit Circle',
  tree_diagram: 'Tree Diagram',
  interactive_coordinate_plane: 'Interactive Graph',
  equation_grapher: 'Equation Grapher',
  // Chemistry diagrams
  atom: 'Atom Structure',
  molecule: 'Molecule Structure',
  periodic_element: 'Periodic Element',
  bonding: 'Chemical Bonding',
  // Biology diagrams
  cell: 'Cell Structure',
  organelle: 'Organelle',
  dna: 'DNA Structure',
  process: 'Biological Process',
  // Geometry diagrams (triangle and circle already defined in math section)
  square: 'Square',
  rectangle: 'Rectangle',
  parallelogram: 'Parallelogram',
  rhombus: 'Rhombus',
  trapezoid: 'Trapezoid',
  regular_polygon: 'Regular Polygon',
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
 * Type guard for chemistry diagrams
 */
export function isChemistryDiagram(diagram: DiagramState): diagram is ChemistryDiagramState {
  return CHEMISTRY_DIAGRAM_TYPES.includes(diagram.type as string)
}

/**
 * Type guard for biology diagrams
 */
export function isBiologyDiagram(diagram: DiagramState): diagram is BiologyDiagramState {
  return BIOLOGY_DIAGRAM_TYPES.includes(diagram.type as string)
}

/**
 * Type guard for geometry diagrams
 */
export function isGeometryDiagram(diagram: DiagramState): diagram is GeometryDiagramState {
  return GEOMETRY_DIAGRAM_TYPES.includes(diagram.type as string)
}

/**
 * Get human-readable diagram type name
 */
export function getDiagramTypeName(type: string): string {
  return DIAGRAM_TYPE_NAMES[type] || type.replace(/_/g, ' ')
}
