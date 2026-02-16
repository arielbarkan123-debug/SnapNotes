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
  'polynomial',
  'radical',
  'systems',
  'inequality',
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

// Components that manage their own step controls via internal useDiagramBase + DiagramStepControls.
// These do NOT respond to external currentStep changes — they only accept initialStep (one-time).
// Used to suppress outer step controls and let the component's own controls work.
export const SELF_MANAGING_DIAGRAM_TYPES = new Set([
  // Original entries
  'long_division',
  'equation',
  'fraction',
  'factoring',
  'completing_square',
  'number_line',
  'coordinate_plane',
  'triangle',
  'circle',
  'unit_circle',
  'tree_diagram',
  'interactive_coordinate_plane',
  'equation_grapher',
  'polynomial',
  'radical',
  'systems',
  'inequality',
  // Math / general diagram components
  'bar_model',
  'sequence_diagram',
  'histogram',
  'fraction_multiplication_area',
  'fraction_division_model',
  'fraction_circle',
  'fbd',
  'free_body_diagram',
  'dot_plot',
  'double_number_line',
  'conic_sections',
  'complex_number_plane',
  'box_plot',
  'quadratic_graph',
  'polynomial_graph',
  'exponential_graph',
  'logarithmic_graph',
  'rational_function_graph',
  'system_of_equations_graph',
  'slope_triangle',
  'scatter_plot_trend_line',
  'two_way_frequency_table',
  'pythagorean_theorem_diagram',
  'transformation_diagram',
  'tessellation_pattern',
  'net_diagram_3d',
  'orthographic_views_3d',
  // Geometry components
  'regular_polygon',
  'triangle_angle_sum',
  'transformations_composition',
  'parallel_lines_transversal',
  'triangle_similarity',
  'vertical_angles',
  'complementary_supplementary',
  'law_of_sines_cosines',
  'triangle_congruence',
  'tangent_radius_perpendicularity',
  'perpendicular_bisector_construction',
  'angle_types',
  'inscribed_angle_theorem',
  'trapezoid',
  'dilation_coordinate_plane',
  'exterior_angle_theorem',
  'rhombus',
  'rotation_coordinate_plane',
  'parallelogram',
  'rectangle',
  'square',
  'triangle_geometry',
  // Statistics / probability components
  'measures_of_center',
  'stem_and_leaf_plot',
  'probability_tree',
  'probability_distribution',
  'binomial_distribution',
  'normal_distribution',
  'sampling_distribution',
  'residual_plot',
  'venn_diagram',
  'sample_space_diagram',
  // Elementary / visual model components
  'scale_drawing',
  'percent_bar_model',
  'cross_section_diagram',
  'place_value_chart',
  'base_10_blocks',
  'picture_graph',
  'bar_graph',
  'fraction_bar',
  'fraction_number_line',
  'multiplication_array',
  'area_model_multiplication',
  'scaled_bar_graph',
  'equivalent_fraction_model',
  'mixed_number_model',
  'decimal_grid',
  'volume_model',
  'order_of_operations_tree',
  'ratio_table',
  'tape_diagram_ratio',
  'counting_objects',
  'ten_frame',
  'part_part_whole',
  'math_table',
  // Advanced math components
  'parametric_curve',
  'polar_curve',
  'vector_diagram',
  'matrix_visualization',
  'limit_visualization',
  'derivative_tangent_line',
  'integral_area',
])

// Engine-generated image types (E2B/TikZ/Recraft pipeline)
export const ENGINE_DIAGRAM_TYPES = ['engine_image']

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
  // Engine-generated image diagrams
  engine_image: 'AI Generated Diagram',
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
 * Check if diagram is an engine-generated image (E2B/TikZ/Recraft)
 */
export function isEngineDiagram(diagram: DiagramState): boolean {
  return ENGINE_DIAGRAM_TYPES.includes(diagram.type as string)
}

/**
 * Get human-readable diagram type name
 */
export function getDiagramTypeName(type: string): string {
  return DIAGRAM_TYPE_NAMES[type] || type.replace(/_/g, ' ')
}
