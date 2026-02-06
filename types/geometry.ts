/**
 * Geometry Types
 * Types for geometry diagram components and calculations
 */

// ============================================
// BASE TYPES
// ============================================

/**
 * Point2D - A point in 2D space
 */
export interface Point2D {
  x: number
  y: number
  label?: string
}

/**
 * SolutionStep - A step in a geometry calculation
 */
export interface SolutionStep {
  stepNumber: number
  description: string
  formula?: string // LaTeX formula
  substitution?: string // LaTeX with values substituted
  result?: string // LaTeX result
}

/**
 * GeometryFormula - A formula with its components
 */
export interface GeometryFormula {
  name: string
  formula: string // LaTeX
  description?: string
}

// ============================================
// SQUARE
// ============================================

export interface SquareData {
  side: number
  sideLabel?: string
  vertices?: [Point2D, Point2D, Point2D, Point2D]
  showDiagonals?: boolean
  diagonalLabel?: string
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
  highlightSide?: number // 0-3
}

export interface SquareCalculations {
  area: number
  perimeter: number
  diagonal: number
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
    diagonal?: SolutionStep[]
  }
}

// ============================================
// RECTANGLE
// ============================================

export interface RectangleData {
  width: number
  height: number
  widthLabel?: string
  heightLabel?: string
  vertices?: [Point2D, Point2D, Point2D, Point2D]
  showDiagonals?: boolean
  diagonalLabel?: string
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
  highlightSide?: 'width' | 'height'
}

export interface RectangleCalculations {
  area: number
  perimeter: number
  diagonal: number
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
    diagonal?: SolutionStep[]
  }
}

// ============================================
// TRIANGLE TYPES
// ============================================

export type TriangleType = 'equilateral' | 'isosceles' | 'scalene' | 'right' | 'right-isosceles' | 'general'

export interface TriangleGeometryData {
  type: TriangleType
  vertices: [Point2D, Point2D, Point2D]
  sides: {
    a: number // opposite to vertex A
    b: number // opposite to vertex B
    c: number // opposite to vertex C
    labels?: { a?: string; b?: string; c?: string }
  }
  angles?: {
    A?: number // angle at vertex A (degrees)
    B?: number // angle at vertex B
    C?: number // angle at vertex C
  }
  height?: {
    value: number
    from: 'A' | 'B' | 'C'
    showLine?: boolean
  }
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
  highlightSides?: ('a' | 'b' | 'c')[]
  highlightAngles?: ('A' | 'B' | 'C')[]
  showRightAngleMarker?: boolean
}

export interface TriangleCalculations {
  area: number
  perimeter: number
  semiperimeter: number
  heights: { hA: number; hB: number; hC: number }
  angles: { A: number; B: number; C: number }
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
    angles?: SolutionStep[]
  }
}

// ============================================
// CIRCLE
// ============================================

export interface CircleGeometryData {
  radius: number
  radiusLabel?: string
  center?: Point2D
  showRadius?: boolean
  showDiameter?: boolean
  diameterLabel?: string
  sector?: {
    startAngle: number // degrees
    endAngle: number
    label?: string
    showArc?: boolean
  }
  arc?: {
    startAngle: number
    endAngle: number
    label?: string
  }
  chord?: {
    startAngle: number
    endAngle: number
    label?: string
  }
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface CircleCalculations {
  area: number
  circumference: number
  diameter: number
  sectorArea?: number
  arcLength?: number
  chordLength?: number
  steps?: {
    area: SolutionStep[]
    circumference: SolutionStep[]
    sector?: SolutionStep[]
    arc?: SolutionStep[]
  }
}

// ============================================
// PARALLELOGRAM
// ============================================

export interface ParallelogramData {
  base: number
  side: number
  height: number
  baseLabel?: string
  sideLabel?: string
  heightLabel?: string
  angle?: number // angle between base and side (degrees)
  vertices?: [Point2D, Point2D, Point2D, Point2D]
  showHeight?: boolean
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface ParallelogramCalculations {
  area: number
  perimeter: number
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
  }
}

// ============================================
// RHOMBUS
// ============================================

export interface RhombusData {
  side: number
  diagonal1: number // horizontal diagonal
  diagonal2: number // vertical diagonal
  sideLabel?: string
  d1Label?: string
  d2Label?: string
  vertices?: [Point2D, Point2D, Point2D, Point2D]
  showDiagonals?: boolean
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface RhombusCalculations {
  area: number
  perimeter: number
  side: number
  angles: { acute: number; obtuse: number }
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
    side?: SolutionStep[]
  }
}

// ============================================
// TRAPEZOID
// ============================================

export interface TrapezoidData {
  topBase: number // parallel side (shorter)
  bottomBase: number // parallel side (longer)
  height: number
  leftSide?: number
  rightSide?: number
  topLabel?: string
  bottomLabel?: string
  heightLabel?: string
  leftLabel?: string
  rightLabel?: string
  vertices?: [Point2D, Point2D, Point2D, Point2D]
  showHeight?: boolean
  isIsosceles?: boolean
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface TrapezoidCalculations {
  area: number
  perimeter: number
  medianLength: number // midsegment
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
    median?: SolutionStep[]
  }
}

// ============================================
// REGULAR POLYGON
// ============================================

export type RegularPolygonType = 'pentagon' | 'hexagon' | 'heptagon' | 'octagon' | 'nonagon' | 'decagon' | 'custom'

export interface RegularPolygonData {
  sides: number // number of sides (5 for pentagon, 6 for hexagon, etc.)
  sideLength: number
  sideLabel?: string
  apothem?: number // distance from center to midpoint of side
  apothemLabel?: string
  showApothem?: boolean
  showCentralAngle?: boolean
  showInteriorAngle?: boolean
  vertices?: Point2D[]
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface RegularPolygonCalculations {
  area: number
  perimeter: number
  apothem: number
  centralAngle: number
  interiorAngle: number
  exteriorAngle: number
  sumInteriorAngles: number
  steps?: {
    area: SolutionStep[]
    perimeter: SolutionStep[]
    angles?: SolutionStep[]
  }
}

// ============================================
// MIDDLE SCHOOL GEOMETRY (Grades 7-8)
// ============================================

export interface AngleTypesDiagramData {
  angles: Array<{
    measure: number
    type: 'acute' | 'right' | 'obtuse' | 'straight' | 'reflex'
    label?: string
    vertex: Point2D
    ray1Angle: number
    ray2Angle: number
  }>
  showProtractor?: boolean
  title?: string
}

export interface ComplementarySupplementaryData {
  angle1: number
  angle2: number
  relationship: 'complementary' | 'supplementary'
  showSum?: boolean
  vertex: Point2D
  title?: string
}

export interface VerticalAnglesData {
  angle1: number
  angle2: number
  intersection: Point2D
  showCongruenceMarks?: boolean
  title?: string
}

export interface ParallelLinesTransversalData {
  line1Y: number
  line2Y: number
  transversalAngle: number
  highlightAngles?: Array<{
    position: 'interior' | 'exterior'
    side: 'same' | 'alternate'
    type: 'corresponding' | 'alternate_interior' | 'alternate_exterior' | 'co_interior'
  }>
  showAngleMeasures?: boolean
  title?: string
}

export interface TriangleAngleSumData {
  angles: [number, number, number]
  vertices: [Point2D, Point2D, Point2D]
  labels?: [string, string, string]
  showSum?: boolean
  showTearOff?: boolean
  title?: string
}

export interface ExteriorAngleTheoremData {
  interiorAngles: [number, number, number]
  exteriorAngle: number
  exteriorAtVertex: 0 | 1 | 2
  vertices: [Point2D, Point2D, Point2D]
  showRelationship?: boolean
  title?: string
}

export interface TranslationCoordinatePlaneData {
  originalVertices: Point2D[]
  translationVector: { dx: number; dy: number }
  showVector?: boolean
  showPrime?: boolean
  title?: string
}

export interface ReflectionCoordinatePlaneData {
  originalVertices: Point2D[]
  lineOfReflection: 'x-axis' | 'y-axis' | 'y=x' | 'y=-x' | { slope: number; yIntercept: number }
  showLineOfReflection?: boolean
  showPrime?: boolean
  title?: string
}

export interface RotationCoordinatePlaneData {
  originalVertices: Point2D[]
  centerOfRotation: Point2D
  angleDegrees: number
  showCenter?: boolean
  showArc?: boolean
  showPrime?: boolean
  title?: string
}

export interface DilationCoordinatePlaneData {
  originalVertices: Point2D[]
  centerOfDilation: Point2D
  scaleFactor: number
  showCenter?: boolean
  showRays?: boolean
  showPrime?: boolean
  title?: string
}

export interface CongruenceTransformationsData {
  originalShape: Point2D[]
  transformedShape: Point2D[]
  transformations: Array<{
    type: 'translation' | 'reflection' | 'rotation'
    params: Record<string, number | string>
  }>
  showCorrespondence?: boolean
  showCongruenceMarks?: boolean
  title?: string
}

export interface SimilarityTransformationsData {
  originalShape: Point2D[]
  transformedShape: Point2D[]
  scaleFactor: number
  transformations: Array<{
    type: 'dilation' | 'translation' | 'reflection' | 'rotation'
    params: Record<string, number | string>
  }>
  showCorrespondence?: boolean
  showRatios?: boolean
  title?: string
}

export interface PythagoreanVisualProofData {
  sideA: number
  sideB: number
  hypotenuse: number
  proofType: 'squares' | 'rearrangement' | 'similar_triangles'
  showAreas?: boolean
  showEquation?: boolean
  title?: string
}

export interface Shape3DWithNetData {
  shape: 'cube' | 'rectangular_prism' | 'triangular_prism' | 'cylinder' | 'cone' | 'square_pyramid'
  dimensions: Record<string, number>
  showNet: boolean
  show3D: boolean
  showFoldAnimation?: boolean
  showLabels?: boolean
  title?: string
}

export interface CrossSection3DShapeData {
  solid: 'cube' | 'rectangular_prism' | 'cylinder' | 'cone' | 'sphere' | 'pyramid'
  dimensions: Record<string, number>
  cuttingPlane: {
    orientation: 'horizontal' | 'vertical' | 'diagonal'
    position: number
  }
  crossSectionShape?: string
  showCrossSection: boolean
  title?: string
}

// ============================================
// HIGH SCHOOL GEOMETRY (Grades 9-12)
// ============================================

export interface PointLinePlaneBasicsData {
  elements: Array<{
    type: 'point' | 'line' | 'ray' | 'segment' | 'plane'
    positions: Point2D[]
    label?: string
  }>
  relationships?: Array<{
    type: 'collinear' | 'coplanar' | 'intersection' | 'parallel' | 'perpendicular'
    elements: number[]
  }>
  title?: string
}

export interface AngleBisectorConstructionData {
  angle: number
  vertex: Point2D
  ray1End: Point2D
  ray2End: Point2D
  showConstruction?: boolean
  showArcs?: boolean
  showBisector?: boolean
  title?: string
}

export interface PerpendicularBisectorConstructionData {
  point1: Point2D
  point2: Point2D
  showConstruction?: boolean
  showArcs?: boolean
  showBisector?: boolean
  showMidpoint?: boolean
  title?: string
}

export interface TriangleCongruenceData {
  triangle1: { vertices: [Point2D, Point2D, Point2D]; sides: [number, number, number]; angles: [number, number, number] }
  triangle2: { vertices: [Point2D, Point2D, Point2D]; sides: [number, number, number]; angles: [number, number, number] }
  criterion: 'SSS' | 'SAS' | 'ASA' | 'AAS' | 'HL'
  correspondingParts: Array<{ type: 'side' | 'angle'; index1: number; index2: number }>
  showCongruenceMarks?: boolean
  title?: string
}

export interface TriangleSimilarityData {
  triangle1: { vertices: [Point2D, Point2D, Point2D]; sides: [number, number, number]; angles: [number, number, number] }
  triangle2: { vertices: [Point2D, Point2D, Point2D]; sides: [number, number, number]; angles: [number, number, number] }
  criterion: 'AA' | 'SAS' | 'SSS'
  scaleFactor: number
  showRatios?: boolean
  title?: string
}

export interface CPCTCProofDiagramData {
  triangles: [
    { vertices: [Point2D, Point2D, Point2D]; labels: [string, string, string] },
    { vertices: [Point2D, Point2D, Point2D]; labels: [string, string, string] }
  ]
  congruenceProof: { criterion: 'SSS' | 'SAS' | 'ASA' | 'AAS' | 'HL'; givenParts: string[] }
  targetPart: { type: 'side' | 'angle'; description: string }
  showProofFlow?: boolean
  title?: string
}

export interface TriangleCentersData {
  vertices: [Point2D, Point2D, Point2D]
  centerType: 'centroid' | 'incenter' | 'circumcenter' | 'orthocenter' | 'all'
  showMedians?: boolean
  showAngleBisectors?: boolean
  showPerpendicularBisectors?: boolean
  showAltitudes?: boolean
  showCircumscribedCircle?: boolean
  showInscribedCircle?: boolean
  title?: string
}

export interface MidsegmentTheoremData {
  vertices: [Point2D, Point2D, Point2D]
  midsegments: Array<{
    midpoints: [Point2D, Point2D]
    parallelTo: 'AB' | 'BC' | 'AC'
    length: number
  }>
  showParallelMarks?: boolean
  showLengthRatio?: boolean
  title?: string
}

export interface IsoscelesTrianglePropertiesData {
  vertices: [Point2D, Point2D, Point2D]
  equalSides: [number, number]
  baseAngles: number
  vertexAngle: number
  showCongruenceMarks?: boolean
  showBaseAngles?: boolean
  showAltitude?: boolean
  title?: string
}

export interface QuadrilateralPropertiesData {
  type: 'parallelogram' | 'rectangle' | 'rhombus' | 'square' | 'trapezoid' | 'kite'
  vertices: [Point2D, Point2D, Point2D, Point2D]
  properties: {
    parallelSides?: Array<[number, number]>
    equalSides?: Array<[number, number]>
    equalAngles?: Array<[number, number]>
    diagonalsBisect?: boolean
    diagonalsPerpendicular?: boolean
    diagonalsEqual?: boolean
  }
  showDiagonals?: boolean
  showProperties?: boolean
  title?: string
}

export interface CirclePartsDiagramData {
  radius: number
  center?: Point2D
  parts: Array<{
    type: 'radius' | 'diameter' | 'chord' | 'secant' | 'tangent' | 'arc' | 'sector' | 'segment'
    angle1?: number
    angle2?: number
    label?: string
    color?: string
  }>
  showLabels?: boolean
  title?: string
}

export interface InscribedAngleTheoremData {
  radius: number
  center?: Point2D
  centralAngle: number
  inscribedAngle: number
  arcAngle: number
  inscribedVertex: number
  arcEndpoints: [number, number]
  showRelationship?: boolean
  title?: string
}

export interface TangentRadiusPerpendicularityData {
  radius: number
  center?: Point2D
  tangentPoint: number
  showRightAngle?: boolean
  showTangentLine?: boolean
  showRadius?: boolean
  externalPoint?: Point2D
  title?: string
}

export interface ChordSecantTangentRelationsData {
  radius: number
  center?: Point2D
  elements: Array<{
    type: 'chord' | 'secant' | 'tangent'
    points: Point2D[]
    angle1?: number
    angle2?: number
  }>
  showLengthRelationships?: boolean
  showAngleRelationships?: boolean
  title?: string
}

export interface ArcLengthSectorAreaData {
  radius: number
  centralAngle: number
  center?: Point2D
  showArcLength?: boolean
  showSectorArea?: boolean
  showFormulas?: boolean
  arcLength?: number
  sectorArea?: number
  title?: string
}

export interface CircleEquationCoordinatePlaneData {
  center: Point2D
  radius: number
  equation?: string
  showCenter?: boolean
  showRadius?: boolean
  showGrid?: boolean
  points?: Array<{ point: Point2D; label?: string }>
  title?: string
}

export interface CoordinateGeometryProofData {
  vertices: Point2D[]
  shape: 'triangle' | 'quadrilateral' | 'polygon'
  proveProperty: 'parallel' | 'perpendicular' | 'congruent' | 'midpoint' | 'distance' | 'collinear'
  calculations: Array<{
    type: 'slope' | 'distance' | 'midpoint'
    points: [Point2D, Point2D]
    result: number | Point2D
  }>
  showGrid?: boolean
  title?: string
}

export interface TrigRatiosRightTriangleData {
  sides: { opposite: number; adjacent: number; hypotenuse: number }
  angle: number
  vertices: [Point2D, Point2D, Point2D]
  showSinCosT?: boolean
  showSOHCAHTOA?: boolean
  highlightRatio?: 'sin' | 'cos' | 'tan'
  title?: string
}

export interface UnitCircleTrigValuesData {
  angles: Array<{
    degrees: number
    radians: string
    sin: number
    cos: number
    tan?: number
  }>
  highlightAngle?: number
  showCoordinates?: boolean
  showReferenceTriangle?: boolean
  showAllQuadrants?: boolean
  title?: string
}

export interface LawOfSinesCosinesData {
  triangle: {
    vertices: [Point2D, Point2D, Point2D]
    sides: [number, number, number]
    angles: [number, number, number]
  }
  law: 'sines' | 'cosines'
  solveFor: 'side' | 'angle'
  knownParts: string[]
  showFormula?: boolean
  showSubstitution?: boolean
  title?: string
}

export interface TransformationsCompositionData {
  originalShape: Point2D[]
  transformations: Array<{
    type: 'translation' | 'reflection' | 'rotation' | 'dilation'
    params: Record<string, number | string>
    intermediateShape?: Point2D[]
  }>
  finalShape: Point2D[]
  showIntermediate?: boolean
  showOrder?: boolean
  title?: string
}

export interface TessellationPatternData {
  baseShape: 'triangle' | 'square' | 'hexagon' | 'custom'
  vertices?: Point2D[]
  rows: number
  columns: number
  showTransformations?: boolean
  colors?: string[]
  title?: string
}

export interface OrthographicViews3DData {
  shape: 'cube' | 'rectangular_prism' | 'l_shape' | 'pyramid' | 'custom'
  dimensions?: Record<string, number>
  views: {
    front: number[][]
    side: number[][]
    top: number[][]
  }
  show3DModel?: boolean
  title?: string
}

export interface CrossSections3DSolidsData {
  solid: 'prism' | 'cylinder' | 'cone' | 'sphere' | 'pyramid'
  dimensions: Record<string, number>
  cuttingPlanes: Array<{
    orientation: 'horizontal' | 'vertical' | 'angled'
    position: number
    resultingShape: string
  }>
  showAnimation?: boolean
  title?: string
}

export interface CavalierisPrincipleData {
  solid1: {
    type: string
    dimensions: Record<string, number>
    volume: number
  }
  solid2: {
    type: string
    dimensions: Record<string, number>
    volume: number
  }
  sliceHeight: number
  showCrossAreas?: boolean
  showEqualAreas?: boolean
  title?: string
}

export interface SurfaceAreaFromNetData {
  shape: 'cube' | 'rectangular_prism' | 'triangular_prism' | 'cylinder' | 'cone' | 'pyramid'
  dimensions: Record<string, number>
  faces: Array<{
    shape: 'rectangle' | 'triangle' | 'circle' | 'sector'
    dimensions: Record<string, number>
    area: number
    label?: string
  }>
  totalSurfaceArea: number
  showFoldAnimation?: boolean
  title?: string
}

// ============================================
// GEOMETRY DIAGRAM STATE
// For renderer integration
// ============================================

export type GeometryShapeType =
  | 'square'
  | 'rectangle'
  | 'triangle'
  | 'circle'
  | 'parallelogram'
  | 'rhombus'
  | 'trapezoid'
  | 'regular_polygon'
  // Middle School Geometry
  | 'angle_types'
  | 'complementary_supplementary'
  | 'vertical_angles'
  | 'parallel_lines_transversal'
  | 'triangle_angle_sum'
  | 'exterior_angle_theorem'
  | 'translation_coordinate_plane'
  | 'reflection_coordinate_plane'
  | 'rotation_coordinate_plane'
  | 'dilation_coordinate_plane'
  | 'congruence_transformations'
  | 'similarity_transformations'
  | 'pythagorean_visual_proof'
  | 'shape_3d_with_net'
  | 'cross_section_3d_shape'
  // High School Geometry
  | 'point_line_plane_basics'
  | 'angle_bisector_construction'
  | 'perpendicular_bisector_construction'
  | 'triangle_congruence'
  | 'triangle_similarity'
  | 'cpctc_proof'
  | 'triangle_centers'
  | 'midsegment_theorem'
  | 'isosceles_triangle_properties'
  | 'quadrilateral_properties'
  | 'circle_parts'
  | 'inscribed_angle_theorem'
  | 'tangent_radius_perpendicularity'
  | 'chord_secant_tangent_relations'
  | 'arc_length_sector_area'
  | 'circle_equation_coordinate_plane'
  | 'coordinate_geometry_proof'
  | 'trig_ratios_right_triangle'
  | 'unit_circle_trig_values'
  | 'law_of_sines_cosines'
  | 'transformations_composition'
  | 'tessellation_pattern'
  | 'orthographic_views_3d'
  | 'cross_sections_3d_solids'
  | 'cavalieris_principle'
  | 'surface_area_from_net'

export interface GeometryDiagramState {
  type: GeometryShapeType
  data:
    | SquareData
    | RectangleData
    | TriangleGeometryData
    | CircleGeometryData
    | ParallelogramData
    | RhombusData
    | TrapezoidData
    | RegularPolygonData
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | Record<string, any>
  visibleStep: number
  totalSteps?: number
  stepConfig?: GeometryStepConfig[]
  calculations?:
    | SquareCalculations
    | RectangleCalculations
    | TriangleCalculations
    | CircleCalculations
    | ParallelogramCalculations
    | RhombusCalculations
    | TrapezoidCalculations
    | RegularPolygonCalculations
}

export interface GeometryStepConfig {
  stepLabel: string
  stepLabelHe?: string
  showFormula?: boolean
  highlightPart?: string
  showCalculation?: boolean
}

// ============================================
// GEOMETRY COLORS
// ============================================

export const GEOMETRY_COLORS = {
  shape: {
    fill: '#3B82F6', // blue-500
    fillOpacity: 0.1,
    stroke: '#1F2937', // gray-800
  },
  highlight: {
    primary: '#EF4444', // red-500
    secondary: '#10B981', // green-500
    tertiary: '#F59E0B', // amber-500
  },
  label: {
    side: '#2563EB', // blue-600
    angle: '#6B7280', // gray-500
    formula: '#7C3AED', // purple-600
  },
  auxiliary: {
    height: '#10B981', // green-500
    diagonal: '#8B5CF6', // purple-500
    apothem: '#F59E0B', // amber-500
  },
} as const
