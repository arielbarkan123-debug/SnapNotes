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
// Elementary Math Types (Grades 1-5)
// ============================================================================

export interface CountingObjectsData {
  objects: Array<{ type: string; count: number; color?: string }>
  operation: 'count' | 'add' | 'subtract'
  total: number
  title?: string
  groupSize?: number
}

export interface TenFrameData {
  filled: number
  total: 10 | 20
  color?: string
  showSecondFrame?: boolean
  title?: string
  highlightFilled?: number[]
}

export interface PartPartWholeData {
  whole: number
  part1: number
  part2: number
  showParts: boolean
  title?: string
  labels?: { whole?: string; part1?: string; part2?: string }
}

export interface BarModelData {
  parts: Array<{ value: number; label: string; color?: string }>
  total: number
  operation: 'add' | 'subtract' | 'compare' | 'multiply' | 'divide'
  unknownPart?: number
  title?: string
}

export interface PlaceValueChartData {
  number: number
  columns: ('ones' | 'tens' | 'hundreds' | 'thousands' | 'ten_thousands')[]
  showExpanded?: boolean
  title?: string
  highlightColumn?: string
}

export interface Base10BlocksData {
  number: number
  showDecomposition: boolean
  showRegrouping?: boolean
  title?: string
  operation?: 'represent' | 'add' | 'subtract'
  secondNumber?: number
}

export interface PictureGraphData {
  categories: Array<{ label: string; count: number; icon: string }>
  title: string
  symbolValue?: number
  showKey?: boolean
}

export interface BarGraphData {
  categories: Array<{ label: string; value: number; color?: string }>
  title: string
  scale: number
  orientation?: 'vertical' | 'horizontal'
  yAxisLabel?: string
  xAxisLabel?: string
}

export interface FractionCircleData {
  numerator: number
  denominator: number
  showLabel: boolean
  color?: string
  compareTo?: Fraction
  title?: string
}

export interface FractionBarData {
  numerator: number
  denominator: number
  showEquivalent?: Fraction
  color?: string
  title?: string
  showLabel?: boolean
}

export interface FractionNumberLineData {
  fractions: Fraction[]
  min: number
  max: number
  denominator: number
  showTickMarks?: boolean
  title?: string
}

export interface MultiplicationArrayData {
  rows: number
  columns: number
  showPartialProducts: boolean
  color?: string
  highlightRow?: number
  highlightColumn?: number
  title?: string
}

export interface AreaModelMultiplicationData {
  factor1: number
  factor2: number
  showPartials: boolean
  decomposition1?: number[]
  decomposition2?: number[]
  title?: string
}

export interface ScaledBarGraphData {
  data: Array<{ label: string; value: number; color?: string }>
  scale: number
  title: string
  yAxisLabel?: string
  xAxisLabel?: string
  showGridLines?: boolean
}

export interface EquivalentFractionModelData {
  fraction1: Fraction
  fraction2: Fraction
  showAlignment: boolean
  modelType?: 'circle' | 'bar' | 'both'
  title?: string
}

export interface MixedNumberModelData {
  wholeNumber: number
  fraction: Fraction
  showImproper: boolean
  modelType?: 'circle' | 'bar'
  title?: string
}

export interface DecimalGridData {
  value: number
  gridSize: 10 | 100
  showFractionEquivalent: boolean
  highlightCells?: number[]
  title?: string
}

export interface FractionMultiplicationAreaData {
  fraction1: Fraction
  fraction2: Fraction
  showOverlap: boolean
  showProduct?: boolean
  title?: string
}

export interface FractionDivisionModelData {
  dividend: Fraction
  divisor: Fraction
  showGroups: boolean
  quotient?: Fraction
  title?: string
}

export interface VolumeModelData {
  length: number
  width: number
  height: number
  showUnitCubes: boolean
  showLayers?: boolean
  showFormula?: boolean
  title?: string
}

export interface OrderOfOperationsTreeData {
  expression: string
  steps: Array<{ operation: string; result: number; highlighted?: boolean }>
  title?: string
  showParentheses?: boolean
}

// ============================================================================
// Middle School Math Types (Grades 6-8)
// ============================================================================

export interface DoubleNumberLineData {
  topLine: { label: string; values: number[]; unit?: string }
  bottomLine: { label: string; values: number[]; unit?: string }
  connections?: Array<{ topIndex: number; bottomIndex: number }>
  title?: string
  highlightPair?: number
}

export interface RatioTableData {
  columns: Array<{ header: string; values: number[] }>
  highlightRow?: number
  highlightColumn?: number
  showEquivalence?: boolean
  title?: string
}

export interface TapeDiagramRatioData {
  ratio: [number, number]
  labels: [string, string]
  totalValue?: number
  unknownPart?: 0 | 1
  partColors?: [string, string]
  title?: string
}

export interface DotPlotData {
  data: number[]
  min: number
  max: number
  title: string
  xAxisLabel?: string
  highlightValue?: number
}

export interface HistogramData {
  bins: Array<{ min: number; max: number; count: number }>
  title: string
  xAxisLabel?: string
  yAxisLabel?: string
  binWidth?: number
}

export interface BoxPlotData {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  outliers?: number[]
  title: string
  showLabels?: boolean
  data?: number[]
}

export interface StemAndLeafPlotData {
  stems: Array<{ stem: number; leaves: number[] }>
  title: string
  stemLabel?: string
  leafLabel?: string
  key?: string
}

export interface MeasuresOfCenterData {
  data: number[]
  mean: number
  median: number
  mode: number[]
  range?: number
  title?: string
  showOnNumberLine?: boolean
}

export interface ProportionalRelationshipGraphData {
  constantOfProportionality: number
  points: Array<{ x: number; y: number; label?: string }>
  xLabel?: string
  yLabel?: string
  title?: string
  showUnitRate?: boolean
}

export interface PercentBarModelData {
  total: number
  parts: Array<{ value: number; percent: number; label: string; color?: string }>
  showPercents: boolean
  title?: string
}

export interface ProbabilityTreeData {
  levels: Array<{
    branches: Array<{
      label: string
      probability: number
      children?: number[]
    }>
  }>
  outcomes?: Array<{ path: string[]; probability: number }>
  title?: string
  highlightPath?: number[]
}

export interface SampleSpaceDiagramData {
  event1: { name: string; outcomes: string[] }
  event2: { name: string; outcomes: string[] }
  favorableOutcomes?: Array<[string, string]>
  title?: string
}

export interface VennDiagramData {
  sets: Array<{ label: string; elements: string[]; color?: string }>
  intersections?: Array<{ setIndices: number[]; elements: string[] }>
  universalSet?: string[]
  title?: string
}

export interface NetDiagram3DData {
  shape: 'cube' | 'rectangular_prism' | 'triangular_prism' | 'cylinder' | 'cone' | 'pyramid'
  dimensions: Record<string, number>
  showFoldLines?: boolean
  showLabels?: boolean
  title?: string
}

export interface CrossSectionDiagramData {
  solid: 'cube' | 'rectangular_prism' | 'cylinder' | 'cone' | 'sphere' | 'pyramid'
  plane: 'horizontal' | 'vertical' | 'diagonal'
  planePosition?: number
  showCrossSection?: boolean
  title?: string
}

export interface ScaleDrawingData {
  scaleFactor: number
  originalDimensions: Record<string, number>
  scaledDimensions: Record<string, number>
  shape: 'rectangle' | 'triangle' | 'polygon'
  showMeasurements?: boolean
  title?: string
}

export interface LinearFunctionGraphData {
  slope: number
  yIntercept: number
  expression?: string
  showSlope?: boolean
  showIntercept?: boolean
  domain?: { min: number; max: number }
  points?: Array<{ x: number; y: number; label?: string }>
  title?: string
}

export interface SystemOfEquationsGraphData {
  equations: Array<{
    slope: number
    yIntercept: number
    expression: string
    color?: string
  }>
  solution?: { x: number; y: number }
  showSolution?: boolean
  title?: string
}

export interface SlopeTriangleData {
  point1: { x: number; y: number }
  point2: { x: number; y: number }
  rise: number
  run: number
  slope: number
  showRiseRun?: boolean
  showSlopeFormula?: boolean
  title?: string
}

export interface ScatterPlotTrendLineData {
  points: Array<{ x: number; y: number }>
  trendLine?: { slope: number; yIntercept: number; rSquared?: number }
  xLabel?: string
  yLabel?: string
  title?: string
  showResiduals?: boolean
}

export interface TwoWayFrequencyTableData {
  rowHeaders: string[]
  columnHeaders: string[]
  data: number[][]
  rowLabel: string
  columnLabel: string
  showMarginals?: boolean
  highlightCell?: [number, number]
  title?: string
}

export interface PythagoreanTheoremDiagramData {
  sideA: number
  sideB: number
  hypotenuse: number
  showSquares: boolean
  showLabels?: boolean
  showProof?: boolean
  title?: string
}

export interface TransformationDiagramData {
  original: Array<{ x: number; y: number }>
  transformed: Array<{ x: number; y: number }>
  transformationType: 'translation' | 'reflection' | 'rotation' | 'dilation'
  transformationParams: Record<string, number | string>
  showOriginal?: boolean
  showGrid?: boolean
  title?: string
}

export interface IrrationalNumberLineData {
  min: number
  max: number
  irrationals: Array<{
    value: number
    label: string
    expression: string
  }>
  rationals?: Array<{ value: number; label: string }>
  title?: string
}

export interface ScientificNotationScaleData {
  values: Array<{
    value: number
    label: string
    scientificNotation: string
  }>
  showPowersOf10?: boolean
  title?: string
}

// ============================================================================
// High School Math Types (Grades 9-12)
// ============================================================================

export interface QuadraticGraphData {
  a: number
  b: number
  c: number
  expression?: string
  vertex?: { x: number; y: number }
  roots?: number[]
  axisOfSymmetry?: number
  showVertex?: boolean
  showRoots?: boolean
  showAxisOfSymmetry?: boolean
  domain?: { min: number; max: number }
  title?: string
}

export interface PolynomialGraphData {
  coefficients: number[]
  degree: number
  expression?: string
  zeros?: number[]
  turningPoints?: Array<{ x: number; y: number }>
  endBehavior?: { left: 'up' | 'down'; right: 'up' | 'down' }
  domain?: { min: number; max: number }
  title?: string
}

export interface ExponentialGraphData {
  base: number
  coefficient?: number
  yIntercept?: number
  asymptote: number
  expression?: string
  isGrowth: boolean
  domain?: { min: number; max: number }
  showAsymptote?: boolean
  title?: string
}

export interface LogarithmicGraphData {
  base: number
  coefficient?: number
  asymptote: number
  expression?: string
  domain?: { min: number; max: number }
  showAsymptote?: boolean
  keyPoints?: Array<{ x: number; y: number; label?: string }>
  title?: string
}

export interface AbsoluteValueGraphData {
  a: number
  h: number
  k: number
  expression?: string
  vertex: { x: number; y: number }
  domain?: { min: number; max: number }
  showVertex?: boolean
  title?: string
}

export interface RadicalFunctionGraphData {
  index: number
  radicand: string
  coefficient?: number
  expression?: string
  domain?: { min: number; max: number }
  startPoint?: { x: number; y: number }
  title?: string
}

export interface PiecewiseFunctionGraphData {
  pieces: Array<{
    expression: string
    domain: { min: number; max: number }
    includeMin: boolean
    includeMax: boolean
    color?: string
  }>
  title?: string
  showBreakpoints?: boolean
}

export interface SystemOfInequalities2DData {
  inequalities: Array<{
    expression: string
    type: '<' | '<=' | '>' | '>='
    slope: number
    yIntercept: number
    color?: string
  }>
  feasibleRegion?: boolean
  vertices?: Array<{ x: number; y: number }>
  title?: string
}

export interface SequenceDiagramData {
  type: 'arithmetic' | 'geometric'
  terms: number[]
  firstTerm: number
  commonDifferenceOrRatio: number
  formula?: string
  showFormula?: boolean
  showDifferences?: boolean
  title?: string
}

export interface RationalFunctionGraphData {
  numerator: string
  denominator: string
  expression?: string
  verticalAsymptotes?: number[]
  horizontalAsymptote?: number
  holes?: Array<{ x: number; y: number }>
  xIntercepts?: number[]
  domain?: { min: number; max: number }
  showAsymptotes?: boolean
  title?: string
}

export interface ConicSectionsData {
  type: 'circle' | 'ellipse' | 'parabola' | 'hyperbola'
  center?: { x: number; y: number }
  // Circle / Ellipse
  radiusX?: number
  radiusY?: number
  // Parabola
  vertex?: { x: number; y: number }
  focus?: { x: number; y: number }
  directrix?: number
  // Hyperbola
  a?: number
  b?: number
  orientation?: 'horizontal' | 'vertical'
  expression?: string
  showFoci?: boolean
  showDirectrix?: boolean
  showAsymptotes?: boolean
  title?: string
}

export interface ComplexNumberPlaneData {
  points: Array<{
    real: number
    imaginary: number
    label?: string
    color?: string
  }>
  operations?: Array<{
    type: 'add' | 'subtract' | 'multiply'
    operand1: number
    operand2: number
    result: { real: number; imaginary: number }
  }>
  showModulus?: boolean
  showArgument?: boolean
  title?: string
}

export interface MatrixVisualizationData {
  matrices: Array<{
    rows: number[][]
    label?: string
    highlight?: Array<[number, number]>
  }>
  operation?: 'add' | 'subtract' | 'multiply' | 'determinant' | 'inverse' | 'transpose'
  result?: number[][]
  title?: string
}

export interface VectorDiagramData {
  vectors: Array<{
    start: { x: number; y: number }
    end: { x: number; y: number }
    label?: string
    color?: string
  }>
  operation?: 'add' | 'subtract' | 'scalar_multiply' | 'dot_product' | 'cross_product'
  resultant?: { start: { x: number; y: number }; end: { x: number; y: number } }
  showComponents?: boolean
  showMagnitude?: boolean
  title?: string
}

export interface TrigFunctionGraphsData {
  functions: Array<{
    type: 'sin' | 'cos' | 'tan' | 'csc' | 'sec' | 'cot'
    amplitude?: number
    period?: number
    phaseShift?: number
    verticalShift?: number
    color?: string
  }>
  domain?: { min: number; max: number }
  showAmplitude?: boolean
  showPeriod?: boolean
  showPhaseShift?: boolean
  title?: string
}

export interface PolarCoordinateGraphData {
  curves: Array<{
    expression: string
    type: 'rose' | 'cardioid' | 'limacon' | 'circle' | 'spiral' | 'custom'
    color?: string
  }>
  thetaRange?: { min: number; max: number }
  showGrid?: boolean
  showLabels?: boolean
  title?: string
}

export interface ParametricCurveData {
  xExpression: string
  yExpression: string
  tRange: { min: number; max: number }
  showDirection?: boolean
  showPoints?: Array<{ t: number; label?: string }>
  title?: string
}

export interface LimitVisualizationData {
  expression: string
  approachValue: number
  leftLimit?: number
  rightLimit?: number
  actualValue?: number
  showApproachArrows?: boolean
  showDiscontinuity?: boolean
  domain?: { min: number; max: number }
  title?: string
}

export interface DerivativeTangentLineData {
  expression: string
  point: { x: number; y: number }
  slope: number
  tangentLine?: { slope: number; yIntercept: number }
  secantLines?: Array<{
    x1: number
    x2: number
    slope: number
  }>
  domain?: { min: number; max: number }
  showSecants?: boolean
  title?: string
}

export interface FunctionDerivativeRelationshipData {
  functions: Array<{
    expression: string
    label: string
    type: 'f' | "f'" | "f''"
    color?: string
  }>
  criticalPoints?: Array<{ x: number; type: 'max' | 'min' | 'inflection' }>
  domain?: { min: number; max: number }
  title?: string
}

export interface RiemannSumData {
  expression: string
  interval: { a: number; b: number }
  numRectangles: number
  method: 'left' | 'right' | 'midpoint' | 'trapezoid'
  approximation: number
  actualArea?: number
  showFunction?: boolean
  title?: string
}

export interface SolidOfRevolutionData {
  expression: string
  interval: { a: number; b: number }
  axis: 'x' | 'y'
  method: 'disk' | 'washer' | 'shell'
  showCrossSection?: boolean
  volume?: number
  title?: string
}

export interface NormalDistributionData {
  mean: number
  standardDeviation: number
  shadedRegion?: { min?: number; max?: number }
  showEmpirical?: boolean
  zScores?: Array<{ value: number; label?: string }>
  probability?: number
  title?: string
}

export interface RegressionResidualsData {
  points: Array<{ x: number; y: number }>
  regressionLine: { slope: number; yIntercept: number }
  residuals: Array<{ x: number; observed: number; predicted: number; residual: number }>
  rSquared?: number
  showResidualLines?: boolean
  title?: string
}

export interface ResidualPlotData {
  residuals: Array<{ predicted: number; residual: number }>
  showZeroLine?: boolean
  showPattern?: boolean
  title?: string
}

export interface ProbabilityDistributionData {
  outcomes: Array<{ value: number | string; probability: number; label?: string }>
  expectedValue?: number
  standardDeviation?: number
  type: 'discrete' | 'continuous'
  title?: string
}

export interface BinomialDistributionData {
  n: number
  p: number
  highlightK?: number
  showMean?: boolean
  showStd?: boolean
  cumulative?: boolean
  title?: string
}

export interface SamplingDistributionData {
  populationMean: number
  populationStd: number
  sampleSize: number
  numSamples: number
  sampleMeans?: number[]
  showCLT?: boolean
  title?: string
}

export interface FBDData {
  object: {
    type: 'block' | 'sphere' | 'wedge' | 'particle' | 'car' | 'person'
    position: { x: number; y: number }
    mass?: number
    label?: string
    color?: string
  }
  forces: Array<{
    name: string
    type: 'weight' | 'normal' | 'friction' | 'applied' | 'tension' | 'drag' | 'spring'
    magnitude: number
    angle: number
    symbol: string
    subscript?: string
    color?: string
  }>
  title?: string
  showForceMagnitudes?: boolean
  stepConfig?: Array<{
    step: number
    visibleForces: string[]
    highlightForces?: string[]
    stepLabel: string
    stepLabelHe?: string
  }>
}

export interface ConfidenceIntervalData {
  pointEstimate: number
  marginOfError: number
  confidenceLevel: number
  lower: number
  upper: number
  sampleSize?: number
  standardError?: number
  showDistribution?: boolean
  title?: string
}

export interface HypothesisTestData {
  nullHypothesis: string
  alternativeHypothesis: string
  testStatistic: number
  pValue: number
  significanceLevel: number
  rejectionRegion?: { type: 'left' | 'right' | 'two-tailed'; criticalValue: number }
  decision: 'reject' | 'fail_to_reject'
  showDistribution?: boolean
  title?: string
}

// ============================================================================
// Geometry Diagram Types (Step-synced)
// ============================================================================

export interface TriangleGeometryData {
  type: 'scalene' | 'isosceles' | 'equilateral' | 'right'
  vertices: Array<{ x: number; y: number }>
  sides: {
    a: number
    b: number
    c: number
    labels?: { a?: string; b?: string; c?: string }
  }
  angles: { A: number; B: number; C: number }
  height?: { value: number; from: string; showLine?: boolean }
  title?: string
  showFormulas?: boolean
}

export interface RegularPolygonData {
  sides: number
  sideLength: number
  sideLabel?: string
  showApothem?: boolean
  showCentralAngle?: boolean
  showInteriorAngle?: boolean
  title?: string
  showFormulas?: boolean
}

export interface PerpendicularBisectorConstructionData {
  point1: { x: number; y: number }
  point2: { x: number; y: number }
  showConstruction?: boolean
  showArcs?: boolean
  showBisector?: boolean
  showMidpoint?: boolean
  title?: string
}

export interface OrthographicViews3DData {
  shape: string
  views: {
    front: number[][]
    side: number[][]
    top: number[][]
  }
  show3DModel?: boolean
  title?: string
}

export interface TangentRadiusPerpendicularityData {
  radius: number
  tangentPoint: number
  showRightAngle?: boolean
  showTangentLine?: boolean
  showRadius?: boolean
  title?: string
}

// ============================================================================
// Transformation Geometry Types
// ============================================================================

export interface RotationCoordinatePlaneData {
  originalVertices: Array<{ x: number; y: number }>
  centerOfRotation: { x: number; y: number }
  angleDegrees: number
  showCenter?: boolean
  showArc?: boolean
  showPrime?: boolean
  title?: string
}

export interface DilationCoordinatePlaneData {
  originalVertices: Array<{ x: number; y: number }>
  centerOfDilation: { x: number; y: number }
  scaleFactor: number
  showCenter?: boolean
  showRays?: boolean
  showPrime?: boolean
  title?: string
}

export interface TessellationPatternData {
  baseShape: 'triangle' | 'square' | 'hexagon'
  rows: number
  columns: number
  showTransformations?: boolean
  colors?: string[]
  title?: string
}

export interface TransformationsCompositionData {
  originalShape: Array<{ x: number; y: number }>
  transformations: Array<{
    type: 'reflection' | 'rotation' | 'translation' | 'dilation'
    params: Record<string, number | string>
  }>
  finalShape: Array<{ x: number; y: number }>
  showIntermediate?: boolean
  showOrder?: boolean
  title?: string
}

// ============================================================================
// Advanced Geometry Theorem Types
// ============================================================================

export interface ExteriorAngleTheoremData {
  /** Interior angles of the triangle (must sum to 180) */
  interiorAngles: [number, number, number]
  /** The exterior angle value */
  exteriorAngle: number
  /** Vertex index (0, 1, or 2) where the exterior angle is drawn */
  exteriorAtVertex: number
  /** Triangle vertex positions */
  vertices: Array<{ x: number; y: number }>
  /** Whether to show the relationship equation */
  showRelationship?: boolean
  /** Diagram title */
  title?: string
}

export interface InscribedAngleTheoremData {
  /** Circle radius */
  radius: number
  /** Central angle in degrees */
  centralAngle: number
  /** Inscribed angle in degrees (should be half of central) */
  inscribedAngle: number
  /** Arc angle in degrees */
  arcAngle: number
  /** Angle (in degrees) on the circle where the inscribed angle vertex sits */
  inscribedVertex: number
  /** Angles (in degrees) on the circle for the arc endpoints */
  arcEndpoints: [number, number]
  /** Whether to show the relationship equation */
  showRelationship?: boolean
  /** Diagram title */
  title?: string
}

export interface TriangleCongruenceData {
  /** First triangle */
  triangle1: {
    vertices: Array<{ x: number; y: number }>
    sides: number[]
    angles: number[]
  }
  /** Second triangle */
  triangle2: {
    vertices: Array<{ x: number; y: number }>
    sides: number[]
    angles: number[]
  }
  /** Congruence criterion (e.g. "SSS", "SAS", "ASA", "AAS", "HL") */
  criterion: string
  /** Which parts correspond between the triangles */
  correspondingParts: Array<{
    type: string
    index1: number
    index2: number
  }>
  /** Whether to show tick/arc congruence marks */
  showCongruenceMarks?: boolean
  /** Diagram title */
  title?: string
}

export interface TriangleSimilarityData {
  /** First (smaller) triangle */
  triangle1: {
    vertices: Array<{ x: number; y: number }>
    sides: number[]
    angles: number[]
  }
  /** Second (larger) triangle */
  triangle2: {
    vertices: Array<{ x: number; y: number }>
    sides: number[]
    angles: number[]
  }
  /** Similarity criterion (e.g. "AA", "SSS", "SAS") */
  criterion: string
  /** Scale factor between the triangles */
  scaleFactor: number
  /** Whether to show side ratio labels */
  showRatios?: boolean
  /** Diagram title */
  title?: string
}

export interface LawOfSinesCosinesData {
  /** The triangle with all measurements */
  triangle: {
    vertices: Array<{ x: number; y: number }>
    sides: number[]
    angles: number[]
  }
  /** Which law to demonstrate */
  law: 'sines' | 'cosines'
  /** Which part we are solving for (e.g. "a", "B") */
  solveFor: string
  /** Known parts used in the calculation (e.g. ["b", "c", "A"]) */
  knownParts: string[]
  /** Whether to show the formula */
  showFormula?: boolean
  /** Whether to show the substitution step */
  showSubstitution?: boolean
  /** Diagram title */
  title?: string
}

// ============================================================================
// Angle / Line Theorem Geometry Types
// ============================================================================

export interface AngleTypesData {
  angles: Array<{
    measure: number
    type: 'acute' | 'right' | 'obtuse' | 'straight' | 'reflex'
    label: string
    vertex: { x: number; y: number }
    ray1Angle: number
    ray2Angle: number
  }>
  title?: string
}

export interface ComplementarySupplementaryData {
  angle1: number
  angle2: number
  relationship: 'complementary' | 'supplementary'
  showSum?: boolean
  vertex?: { x: number; y: number }
  title?: string
}

export interface VerticalAnglesData {
  angle1: number
  angle2: number
  intersection: { x: number; y: number }
  showCongruenceMarks?: boolean
  title?: string
}

export interface ParallelLinesTransversalData {
  line1Y: number
  line2Y: number
  transversalAngle: number
  highlightAngles?: Array<{
    position: string
    side: string
    type: string
  }>
  showAngleMeasures?: boolean
  title?: string
}

export interface TriangleAngleSumData {
  angles: [number, number, number]
  vertices: Array<{ x: number; y: number }>
  labels: [string, string, string]
  showSum?: boolean
  title?: string
}

// ============================================================================
// Basic Shape Geometry
// ============================================================================

export interface SquareData {
  side: number
  sideLabel?: string
  showDiagonals?: boolean
  diagonalLabel?: string
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface RectangleData {
  width: number
  height: number
  widthLabel?: string
  heightLabel?: string
  showDiagonals?: boolean
  diagonalLabel?: string
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface ParallelogramData {
  base: number
  side: number
  height: number
  baseLabel?: string
  sideLabel?: string
  heightLabel?: string
  angle?: number
  showHeight?: boolean
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface RhombusData {
  side: number
  diagonal1: number
  diagonal2: number
  sideLabel?: string
  d1Label?: string
  d2Label?: string
  showDiagonals?: boolean
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
}

export interface TrapezoidData {
  topBase: number
  bottomBase: number
  height: number
  topLabel?: string
  bottomLabel?: string
  heightLabel?: string
  showHeight?: boolean
  isIsosceles?: boolean
  title?: string
  showFormulas?: boolean
  showCalculations?: boolean
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
  | 'unit_circle'
  | 'bar_model'
  | 'area_model'
  | 'factoring'
  | 'completing_square'
  | 'polynomial'
  | 'radical'
  | 'systems'
  | 'inequality'
  | 'tree_diagram'
  | 'interactive_coordinate_plane'
  | 'equation_grapher'
  // Elementary Math (Grades 1-5)
  | 'counting_objects'
  | 'counting_objects_array'
  | 'ten_frame'
  | 'part_part_whole'
  | 'place_value_chart'
  | 'base_10_blocks'
  | 'base10_blocks'
  | 'picture_graph'
  | 'bar_graph'
  | 'fraction_circle'
  | 'fraction_bar'
  | 'fraction_number_line'
  | 'multiplication_array'
  | 'area_model_multiplication'
  | 'scaled_bar_graph'
  | 'equivalent_fraction_model'
  | 'mixed_number_model'
  | 'decimal_grid'
  | 'fraction_multiplication_area'
  | 'fraction_division_model'
  | 'volume_model'
  | 'order_of_operations_tree'
  | 'quadrant_one_coordinate_plane'
  // Middle School Math (Grades 6-8)
  | 'double_number_line'
  | 'ratio_table'
  | 'tape_diagram_ratio'
  | 'dot_plot'
  | 'histogram'
  | 'box_plot'
  | 'stem_and_leaf_plot'
  | 'measures_of_center'
  | 'proportional_relationship_graph'
  | 'percent_bar_model'
  | 'probability_tree'
  | 'sample_space_diagram'
  | 'venn_diagram'
  | 'net_diagram_3d'
  | 'cross_section_diagram'
  | 'scale_drawing'
  | 'linear_function_graph'
  | 'system_of_equations_graph'
  | 'slope_triangle'
  | 'scatter_plot_trend_line'
  | 'two_way_frequency_table'
  | 'pythagorean_theorem_diagram'
  | 'transformation_diagram'
  | 'rotation_coordinate_plane'
  | 'dilation_coordinate_plane'
  | 'tessellation_pattern'
  | 'transformations_composition'
  | 'irrational_number_line'
  | 'scientific_notation_scale'
  // High School Math (Grades 9-12)
  | 'quadratic_graph'
  | 'polynomial_graph'
  | 'exponential_graph'
  | 'logarithmic_graph'
  | 'absolute_value_graph'
  | 'radical_function_graph'
  | 'piecewise_function_graph'
  | 'system_of_inequalities_2d'
  | 'sequence_diagram'
  | 'rational_function_graph'
  | 'conic_sections'
  | 'complex_number_plane'
  | 'matrix_visualization'
  | 'vector_diagram'
  | 'trig_function_graphs'
  | 'polar_coordinate_graph'
  | 'parametric_curve'
  | 'limit_visualization'
  | 'derivative_tangent_line'
  | 'function_derivative_relationship'
  | 'riemann_sum'
  | 'solid_of_revolution'
  | 'normal_distribution'
  | 'regression_residuals'
  | 'residual_plot'
  | 'probability_distribution'
  | 'binomial_distribution'
  | 'sampling_distribution'
  | 'confidence_interval'
  | 'hypothesis_test'
  // Physics
  | 'free_body_diagram'
  // Geometry (Step-synced)
  | 'triangle_geometry'
  | 'regular_polygon'
  | 'perpendicular_bisector_construction'
  | 'orthographic_views_3d'
  | 'tangent_radius_perpendicularity'
  // Advanced Geometry Theorems
  | 'exterior_angle_theorem'
  | 'inscribed_angle_theorem'
  | 'triangle_congruence'
  | 'triangle_similarity'
  | 'law_of_sines_cosines'
  // Angle / Line Theorem Geometry
  | 'angle_types'
  | 'complementary_supplementary'
  | 'vertical_angles'
  | 'parallel_lines_transversal'
  | 'triangle_angle_sum'
  // Basic Shape Geometry
  | 'square'
  | 'rectangle'
  | 'parallelogram'
  | 'rhombus'
  | 'trapezoid'
  // Utility
  | 'math_table'

export type MathDiagramData =
  // Core types
  | LongDivisionData
  | EquationData
  | FractionOperationData
  | NumberLineData
  | CoordinatePlaneData
  | TriangleData
  | CircleData
  // Elementary Math (Grades 1-5)
  | CountingObjectsData
  | TenFrameData
  | PartPartWholeData
  | BarModelData
  | PlaceValueChartData
  | Base10BlocksData
  | PictureGraphData
  | BarGraphData
  | FractionCircleData
  | FractionBarData
  | FractionNumberLineData
  | MultiplicationArrayData
  | AreaModelMultiplicationData
  | ScaledBarGraphData
  | EquivalentFractionModelData
  | MixedNumberModelData
  | DecimalGridData
  | FractionMultiplicationAreaData
  | FractionDivisionModelData
  | VolumeModelData
  | OrderOfOperationsTreeData
  // Middle School Math (Grades 6-8)
  | DoubleNumberLineData
  | RatioTableData
  | TapeDiagramRatioData
  | DotPlotData
  | HistogramData
  | BoxPlotData
  | StemAndLeafPlotData
  | MeasuresOfCenterData
  | ProportionalRelationshipGraphData
  | PercentBarModelData
  | ProbabilityTreeData
  | SampleSpaceDiagramData
  | VennDiagramData
  | NetDiagram3DData
  | CrossSectionDiagramData
  | ScaleDrawingData
  | LinearFunctionGraphData
  | SystemOfEquationsGraphData
  | SlopeTriangleData
  | ScatterPlotTrendLineData
  | TwoWayFrequencyTableData
  | PythagoreanTheoremDiagramData
  | TransformationDiagramData
  | RotationCoordinatePlaneData
  | DilationCoordinatePlaneData
  | TessellationPatternData
  | TransformationsCompositionData
  | IrrationalNumberLineData
  | ScientificNotationScaleData
  // High School Math (Grades 9-12)
  | QuadraticGraphData
  | PolynomialGraphData
  | ExponentialGraphData
  | LogarithmicGraphData
  | AbsoluteValueGraphData
  | RadicalFunctionGraphData
  | PiecewiseFunctionGraphData
  | SystemOfInequalities2DData
  | SequenceDiagramData
  | RationalFunctionGraphData
  | ConicSectionsData
  | ComplexNumberPlaneData
  | MatrixVisualizationData
  | VectorDiagramData
  | TrigFunctionGraphsData
  | PolarCoordinateGraphData
  | ParametricCurveData
  | LimitVisualizationData
  | DerivativeTangentLineData
  | FunctionDerivativeRelationshipData
  | RiemannSumData
  | SolidOfRevolutionData
  | NormalDistributionData
  | RegressionResidualsData
  | ResidualPlotData
  | ProbabilityDistributionData
  | BinomialDistributionData
  | SamplingDistributionData
  | ConfidenceIntervalData
  | HypothesisTestData
  // Physics
  | FBDData
  // Geometry (Step-synced)
  | TriangleGeometryData
  | RegularPolygonData
  | PerpendicularBisectorConstructionData
  | OrthographicViews3DData
  | TangentRadiusPerpendicularityData
  // Advanced Geometry Theorems
  | ExteriorAngleTheoremData
  | InscribedAngleTheoremData
  | TriangleCongruenceData
  | TriangleSimilarityData
  | LawOfSinesCosinesData
  // Angle / Line Theorem Geometry
  | AngleTypesData
  | ComplementarySupplementaryData
  | VerticalAnglesData
  | ParallelLinesTransversalData
  | TriangleAngleSumData
  // Basic Shape Geometry
  | SquareData
  | RectangleData
  | ParallelogramData
  | RhombusData
  | TrapezoidData

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
