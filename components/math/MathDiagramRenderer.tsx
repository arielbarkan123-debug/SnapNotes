'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type MathDiagramState,
  type MathDiagramStepConfig,
  type LongDivisionData,
  type EquationData,
  type FractionOperationData,
  // Elementary data types
  type CountingObjectsData,
  type TenFrameData,
  type PartPartWholeData,
  type BarModelData,
  type PlaceValueChartData,
  type Base10BlocksData,
  type PictureGraphData,
  type BarGraphData,
  type FractionCircleData,
  type FractionBarData,
  type FractionNumberLineData,
  type MultiplicationArrayData,
  type AreaModelMultiplicationData,
  type ScaledBarGraphData,
  type EquivalentFractionModelData,
  type MixedNumberModelData,
  type DecimalGridData,
  type FractionMultiplicationAreaData,
  type FractionDivisionModelData,
  type VolumeModelData,
  type OrderOfOperationsTreeData,
  // Middle School data types
  type DoubleNumberLineData,
  type RatioTableData,
  type TapeDiagramRatioData,
  type PercentBarModelData,
  type DotPlotData,
  type HistogramData,
  type BoxPlotData,
  type StemAndLeafPlotData,
  type MeasuresOfCenterData,
  type ProbabilityTreeData,
  type SampleSpaceDiagramData,
  type VennDiagramData,
  type NetDiagram3DData,
  type CrossSectionDiagramData,
  type ScaleDrawingData,
  type SlopeTriangleData,
  type SystemOfEquationsGraphData,
  type ScatterPlotTrendLineData,
  type TwoWayFrequencyTableData,
  type PythagoreanTheoremDiagramData,
  type TransformationDiagramData,
  // High School data types
  type QuadraticGraphData,
  type PolynomialGraphData,
  type ExponentialGraphData,
  type LogarithmicGraphData,
  type RationalFunctionGraphData,
  type ConicSectionsData,
  type ComplexNumberPlaneData,
  type BinomialDistributionData,
  type ProbabilityDistributionData,
  type ParametricCurveData,
  type LimitVisualizationData,
  type DerivativeTangentLineData,
  type ResidualPlotData,
  type SequenceDiagramData,
  type SamplingDistributionData,
  type FBDData,
  // Geometry data types
  type RotationCoordinatePlaneData,
  type DilationCoordinatePlaneData,
  type TessellationPatternData,
  type TransformationsCompositionData,
  type TriangleGeometryData,
  type RegularPolygonData,
  type PerpendicularBisectorConstructionData,
  type OrthographicViews3DData,
  type TangentRadiusPerpendicularityData,
  type ExteriorAngleTheoremData,
  type InscribedAngleTheoremData,
  type TriangleCongruenceData,
  type TriangleSimilarityData,
  type LawOfSinesCosinesData,
  type AngleTypesData,
  type ComplementarySupplementaryData,
  type VerticalAnglesData,
  type ParallelLinesTransversalData,
  type TriangleAngleSumData,
  // Basic shape data types
  type SquareData,
  type RectangleData,
  type ParallelogramData,
  type RhombusData,
  type TrapezoidData,
} from '@/types/math'
import { SELF_MANAGING_DIAGRAM_TYPES } from '@/components/homework/diagram/types'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import type { TableData } from '@/types'

// ============================================================================
// Existing component imports
// ============================================================================
import { LongDivisionDiagram } from './LongDivisionDiagram'
import { EquationSteps } from './EquationSteps'
import { FractionOperation } from './FractionOperation'
import { NumberLine } from './NumberLine'
import { CoordinatePlane } from './CoordinatePlane'
import { FactoringDiagram, type FactoringData } from './FactoringDiagram'
import { CompletingSquareSteps, type CompletingSquareData } from './CompletingSquareSteps'
import { PolynomialOperations, type PolynomialOperationsData } from './PolynomialOperations'
import { RadicalSimplification, type RadicalSimplificationData } from './RadicalSimplification'
import { SystemsOfEquations, type SystemsOfEquationsData } from './SystemsOfEquations'
import { InequalityDiagram, type InequalityData } from './InequalityDiagram'
import { TreeDiagram } from './TreeDiagram'
import { Triangle } from './Triangle'
import { Circle } from './Circle'
import { UnitCircle } from './UnitCircle'
import { InteractiveCoordinatePlane } from './InteractiveCoordinatePlane'
import { EquationGrapher } from './EquationGrapher'
import type { TriangleDataWithErrors, CircleDataWithErrors, UnitCircleDataWithErrors, TreeDiagramDataWithErrors, CoordinatePlaneData } from '@/types'

// ============================================================================
// Elementary Math component imports (Grades 1-5)
// ============================================================================
import { CountingObjectsArray } from './CountingObjectsArray'
import { TenFrame } from './TenFrame'
import { PartPartWhole } from './PartPartWhole'
import { BarModel } from './BarModel'
import { PlaceValueChart } from './PlaceValueChart'
import { Base10Blocks } from './Base10Blocks'
import { PictureGraph } from './PictureGraph'
import { BarGraph } from './BarGraph'
import { FractionCircle } from './FractionCircle'
import { FractionBar } from './FractionBar'
import { FractionNumberLine } from './FractionNumberLine'
import { MultiplicationArray } from './MultiplicationArray'
import { AreaModelMultiplication } from './AreaModelMultiplication'
import { ScaledBarGraph } from './ScaledBarGraph'
import { EquivalentFractionModel } from './EquivalentFractionModel'
import { MixedNumberModel } from './MixedNumberModel'
import { DecimalGrid } from './DecimalGrid'
import { FractionMultiplicationArea } from './FractionMultiplicationArea'
import { FractionDivisionModel } from './FractionDivisionModel'
import { VolumeModel } from './VolumeModel'
import { OrderOfOperationsTree } from './OrderOfOperationsTree'
import { QuadrantOneCoordinatePlane } from './QuadrantOneCoordinatePlane'

// ============================================================================
// Middle School Math component imports (Grades 6-8)
// ============================================================================
import { DoubleNumberLine } from './DoubleNumberLine'
import { RatioTable } from './RatioTable'
import { TapeDiagramRatio } from './TapeDiagramRatio'
import { PercentBarModel } from './PercentBarModel'
import { DotPlot } from './DotPlot'
import { Histogram } from './Histogram'
import { BoxPlot } from './BoxPlot'
import { StemAndLeafPlot } from './StemAndLeafPlot'
import { MeasuresOfCenter } from './MeasuresOfCenter'
import { ProbabilityTree } from './ProbabilityTree'
import { SampleSpaceDiagram } from './SampleSpaceDiagram'
import { VennDiagram } from './VennDiagram'
import { NetDiagram3D } from './NetDiagram3D'
import { CrossSectionDiagram } from './CrossSectionDiagram'
import { ScaleDrawing } from './ScaleDrawing'
import { SlopeTriangle } from './SlopeTriangle'
import { SystemOfEquationsGraph } from './SystemOfEquationsGraph'
import { ScatterPlotTrendLine } from './ScatterPlotTrendLine'
import { TwoWayFrequencyTable } from './TwoWayFrequencyTable'
import { PythagoreanTheoremDiagram } from './PythagoreanTheoremDiagram'
import { TransformationDiagram } from './TransformationDiagram'

// ============================================================================
// High School Math component imports (Grades 9-12)
// ============================================================================
import { QuadraticGraph } from './QuadraticGraph'
import { ResidualPlot } from './ResidualPlot'
import { ComplexNumberPlane } from './ComplexNumberPlane'
import { ConicSections } from './ConicSections'
import { PolynomialGraph } from './PolynomialGraph'
import { ExponentialGraph } from './ExponentialGraph'
import { LogarithmicGraph } from './LogarithmicGraph'
import { RationalFunctionGraph } from './RationalFunctionGraph'
import { BinomialDistribution } from './BinomialDistribution'
import { ProbabilityDistribution } from './ProbabilityDistribution'
import { ParametricCurve } from './ParametricCurve'
import { LimitVisualization } from './LimitVisualization'
import { DerivativeTangentLine } from './DerivativeTangentLine'
import { SequenceDiagram } from './SequenceDiagram'
import { SamplingDistribution } from './SamplingDistribution'
import { FBD } from './FBD'

// ============================================================================
// Geometry component imports
// ============================================================================
import { RotationCoordinatePlane } from './RotationCoordinatePlane'
import { DilationCoordinatePlane } from './DilationCoordinatePlane'
import { TessellationPattern } from './TessellationPattern'
import { TransformationsComposition } from './TransformationsComposition'
import { TriangleGeometry } from './TriangleGeometry'
import { RegularPolygon } from './RegularPolygon'
import { PerpendicularBisectorConstruction } from './PerpendicularBisectorConstruction'
import { OrthographicViews3D } from './OrthographicViews3D'
import { TangentRadiusPerpendicularity } from './TangentRadiusPerpendicularity'
import { ExteriorAngleTheorem } from './ExteriorAngleTheorem'
import { InscribedAngleTheorem } from './InscribedAngleTheorem'
import { TriangleCongruence } from './TriangleCongruence'
import { TriangleSimilarity } from './TriangleSimilarity'
import { LawOfSinesCosines } from './LawOfSinesCosines'
import { AngleTypes } from './AngleTypes'
import { ComplementarySupplementary } from './ComplementarySupplementary'
import { VerticalAngles } from './VerticalAngles'
import { ParallelLinesTransversal } from './ParallelLinesTransversal'
import { TriangleAngleSum } from './TriangleAngleSum'

// ============================================================================
// Basic shape component imports
// ============================================================================
import { Square } from './Square'
import { Rectangle } from './Rectangle'
import { Parallelogram } from './Parallelogram'
import { Rhombus } from './Rhombus'
import { Trapezoid } from './Trapezoid'

// ============================================================================
// Utility component imports
// ============================================================================
import { MathTable } from './MathTable'

interface MathDiagramRendererProps {
  /** Diagram state from tutor response */
  diagram: MathDiagramState
  /** Override the current step */
  currentStep?: number
  /** Whether to animate transitions */
  animate?: boolean
  /** Animation duration in ms */
  animationDuration?: number
  /** Callback when step animation completes */
  onStepComplete?: () => void
  /** Callback when user clicks to advance step manually */
  onStepAdvance?: () => void
  /** Callback when user clicks to go back a step */
  onStepBack?: () => void
  /** Whether to show step controls */
  showControls?: boolean
  /** Width of the diagram */
  width?: number
  /** Height of the diagram */
  height?: number
  /** Additional className */
  className?: string
  /** Language for labels */
  language?: 'en' | 'he'
  /** Subject for color coding */
  subject?: SubjectKey
  /** Complexity level for adaptive styling */
  complexity?: VisualComplexityLevel
}

/**
 * MathDiagramRenderer - Universal renderer for all math diagram types
 *
 * This component:
 * - Renders the appropriate diagram component based on type
 * - Manages step-synced animation state
 * - Provides optional controls for manual step advancement
 * - Integrates with tutor responses
 */
export function MathDiagramRenderer({
  diagram,
  currentStep: stepOverride,
  animate = true,
  animationDuration = 400,
  onStepComplete,
  onStepAdvance,
  onStepBack,
  showControls = false,
  width,
  height,
  className = '',
  language = 'en',
  subject = 'math',
  complexity = 'middle_school',
}: MathDiagramRendererProps) {
  const [internalStep, setInternalStep] = useState(diagram.visibleStep)

  // Use override step if provided, otherwise use internal state
  const currentStep = stepOverride ?? internalStep

  // Sync internal step with diagram state changes
  useEffect(() => {
    if (stepOverride === undefined) {
      setInternalStep(diagram.visibleStep)
    }
  }, [diagram.visibleStep, stepOverride])

  // Calculate total steps once for use in rendering and controls
  const dataStepsArray = (diagram.data as { steps?: unknown[] })?.steps
  const calculatedTotalSteps = diagram.totalSteps ?? diagram.stepConfig?.length ?? dataStepsArray?.length ?? 1

  // Handle step completion
  const handleStepComplete = useCallback(() => {
    onStepComplete?.()
  }, [onStepComplete])

  // Handle manual step advance - always update internal state AND notify parent
  const handleNextStep = useCallback(() => {
    if (currentStep < calculatedTotalSteps - 1) {
      const newStep = currentStep + 1
      setInternalStep(newStep)
      onStepAdvance?.()
    }
  }, [currentStep, calculatedTotalSteps, onStepAdvance])

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1
      setInternalStep(newStep)
      onStepBack?.()
    }
  }, [currentStep, onStepBack])

  const isSelfManaging = SELF_MANAGING_DIAGRAM_TYPES.has(diagram.type)

  // Render the appropriate diagram type
  const renderDiagram = () => {
    const commonProps = {
      currentStep,
      stepConfig: diagram.stepConfig as MathDiagramStepConfig[],
      onStepComplete: handleStepComplete,
      animationDuration: animate ? animationDuration : 0,
      className: 'diagram-content',
      language,
      subject,
      complexity,
    }

    switch (diagram.type) {
      // ====================================================================
      // Core diagram types (previously wired)
      // ====================================================================

      case 'long_division':
        return (
          <LongDivisionDiagram
            data={diagram.data as LongDivisionData}
            width={width || 620}
            height={height || 450}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'equation':
        return (
          <EquationSteps
            data={diagram.data as EquationData}
            width={width || 400}
            height={height || 350}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'fraction':
        return (
          <FractionOperation
            data={diagram.data as FractionOperationData}
            width={width || 400}
            height={height || 350}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'number_line':
        // Self-managing: has own useDiagramBase + DiagramStepControls
        return (
          <NumberLine
            data={diagram.data as unknown as Parameters<typeof NumberLine>[0]['data']}
            width={width || 400}
            height={height || 100}
            className="diagram-content"
            subject={subject}
            complexity={complexity}
            language={language}
            initialStep={currentStep}
          />
        )

      case 'coordinate_plane':
        // Self-managing: has own useDiagramBase + DiagramStepControls
        return (
          <CoordinatePlane
            data={diagram.data as unknown as Parameters<typeof CoordinatePlane>[0]['data']}
            width={width || 400}
            height={height || 400}
            className="diagram-content"
            subject={subject}
            complexity={complexity}
            language={language}
            initialStep={currentStep}
          />
        )

      case 'factoring':
        return (
          <FactoringDiagram
            data={diagram.data as unknown as FactoringData}
            width={width || 420}
            height={height || 400}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'completing_square':
        return (
          <CompletingSquareSteps
            data={diagram.data as unknown as CompletingSquareData}
            width={width || 440}
            height={height || 450}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'polynomial':
        return (
          <PolynomialOperations
            data={diagram.data as unknown as PolynomialOperationsData}
            width={width || 480}
            height={height || 400}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'radical':
        return (
          <RadicalSimplification
            data={diagram.data as unknown as RadicalSimplificationData}
            width={width || 420}
            height={height || 400}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'systems':
        return (
          <SystemsOfEquations
            data={diagram.data as unknown as SystemsOfEquationsData}
            width={width || 460}
            height={height || 500}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'inequality':
        return (
          <InequalityDiagram
            data={diagram.data as unknown as InequalityData}
            width={width || 440}
            height={height || 450}
            totalSteps={calculatedTotalSteps}
            showStepCounter={false}
            {...commonProps}
          />
        )

      case 'triangle':
        return (
          <Triangle
            data={diagram.data as unknown as TriangleDataWithErrors}
            width={width || 400}
            height={height || 400}
            className="diagram-content"
            subject={subject}
            complexity={complexity}
            language={language}
            initialStep={currentStep}
          />
        )

      case 'circle':
        return (
          <Circle
            data={diagram.data as unknown as CircleDataWithErrors}
            width={width || 400}
            height={height || 400}
            className="diagram-content"
            subject={subject}
            complexity={complexity}
            language={language}
            initialStep={currentStep}
          />
        )

      case 'unit_circle':
        return (
          <UnitCircle
            data={diagram.data as unknown as UnitCircleDataWithErrors}
            width={width || 400}
            height={height || 400}
            className="diagram-content"
            subject={subject}
            complexity={complexity}
            language={language}
            initialStep={currentStep}
          />
        )

      case 'tree_diagram':
        return (
          <TreeDiagram
            data={diagram.data as unknown as TreeDiagramDataWithErrors}
            width={width || 500}
            height={height || 400}
            className="diagram-content"
            subject={subject}
            complexity={complexity}
            language={language}
            initialStep={currentStep}
          />
        )

      case 'interactive_coordinate_plane':
        return (
          <InteractiveCoordinatePlane
            data={diagram.data as unknown as CoordinatePlaneData}
            width={width || 400}
            height={height || 400}
            className="diagram-content"
            subject={subject}
            complexity={complexity}
            language={language}
            initialStep={currentStep}
          />
        )

      case 'equation_grapher':
        return (
          <EquationGrapher
            initialEquations={(diagram.data as { equations?: Array<{ expression: string; color?: string }> })?.equations}
            width={width || 500}
            height={height || 400}
            xRange={(diagram.data as { xRange?: [number, number] })?.xRange}
            yRange={(diagram.data as { yRange?: [number, number] })?.yRange}
            showGrid={true}
            className="diagram-content"
            subject={subject}
            complexity={complexity}
            language={language}
            initialStep={currentStep}
          />
        )

      // ====================================================================
      // Elementary Math (Grades 1-5)
      // ====================================================================

      case 'counting_objects_array':
        return (
          <CountingObjectsArray
            data={diagram.data as unknown as CountingObjectsData}
            width={width || 400}
            height={height || 300}
            {...commonProps}
          />
        )

      case 'ten_frame':
        return (
          <TenFrame
            data={diagram.data as unknown as TenFrameData}
            width={width || 400}
            height={height || 250}
            {...commonProps}
          />
        )

      case 'part_part_whole':
        return (
          <PartPartWhole
            data={diagram.data as unknown as PartPartWholeData}
            width={width || 400}
            height={height || 300}
            {...commonProps}
          />
        )

      case 'bar_model':
        return (
          <BarModel
            data={diagram.data as unknown as BarModelData}
            width={width || 500}
            height={height || 300}
            {...commonProps}
          />
        )

      case 'place_value_chart':
        return (
          <PlaceValueChart
            data={diagram.data as unknown as PlaceValueChartData}
            width={width || 500}
            height={height || 300}
            {...commonProps}
          />
        )

      case 'base10_blocks':
      case 'base_10_blocks':
        return (
          <Base10Blocks
            data={diagram.data as unknown as Base10BlocksData}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'picture_graph':
        return (
          <PictureGraph
            data={diagram.data as unknown as PictureGraphData}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'bar_graph':
        return (
          <BarGraph
            data={diagram.data as unknown as BarGraphData}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'fraction_circle':
        return (
          <FractionCircle
            data={diagram.data as unknown as FractionCircleData}
            width={width || 300}
            height={height || 300}
            {...commonProps}
          />
        )

      case 'fraction_bar':
        return (
          <FractionBar
            data={diagram.data as unknown as FractionBarData}
            width={width || 400}
            height={height || 200}
            {...commonProps}
          />
        )

      case 'fraction_number_line':
        return (
          <FractionNumberLine
            data={diagram.data as unknown as FractionNumberLineData}
            width={width || 500}
            height={height || 150}
            {...commonProps}
          />
        )

      case 'multiplication_array':
        return (
          <MultiplicationArray
            data={diagram.data as unknown as MultiplicationArrayData}
            width={width || 400}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'area_model_multiplication':
      case 'area_model':
        return (
          <AreaModelMultiplication
            data={diagram.data as unknown as AreaModelMultiplicationData}
            width={width || 400}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'scaled_bar_graph':
        return (
          <ScaledBarGraph
            data={diagram.data as unknown as ScaledBarGraphData}
            width={width || 500}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'equivalent_fraction_model':
        return (
          <EquivalentFractionModel
            data={diagram.data as unknown as EquivalentFractionModelData}
            width={width || 400}
            height={height || 300}
            {...commonProps}
          />
        )

      case 'mixed_number_model':
        return (
          <MixedNumberModel
            data={diagram.data as unknown as MixedNumberModelData}
            width={width || 400}
            height={height || 300}
            {...commonProps}
          />
        )

      case 'decimal_grid':
        return (
          <DecimalGrid
            data={diagram.data as unknown as DecimalGridData}
            width={width || 350}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'fraction_multiplication_area':
        return (
          <FractionMultiplicationArea
            data={diagram.data as unknown as FractionMultiplicationAreaData}
            width={width || 400}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'fraction_division_model':
        return (
          <FractionDivisionModel
            data={diagram.data as unknown as FractionDivisionModelData}
            width={width || 400}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'volume_model':
        return (
          <VolumeModel
            data={diagram.data as unknown as VolumeModelData}
            width={width || 400}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'order_of_operations_tree':
        return (
          <OrderOfOperationsTree
            data={diagram.data as unknown as OrderOfOperationsTreeData}
            width={width || 500}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'quadrant_one_coordinate_plane':
        return (
          <QuadrantOneCoordinatePlane
            data={diagram.data as unknown as Parameters<typeof QuadrantOneCoordinatePlane>[0]['data']}
            width={width || 400}
            height={height || 400}
            className="diagram-content"
            subject={subject}
            complexity={complexity}
            language={language}
          />
        )

      // ====================================================================
      // Middle School Math (Grades 6-8)
      // ====================================================================

      case 'double_number_line':
        return (
          <DoubleNumberLine
            data={diagram.data as unknown as DoubleNumberLineData}
            width={width || 500}
            height={height || 250}
            {...commonProps}
          />
        )

      case 'ratio_table':
        return (
          <RatioTable
            data={diagram.data as unknown as RatioTableData}
            width={width || 400}
            height={height || 300}
            {...commonProps}
          />
        )

      case 'tape_diagram_ratio':
        return (
          <TapeDiagramRatio
            data={diagram.data as unknown as TapeDiagramRatioData}
            width={width || 500}
            height={height || 250}
            {...commonProps}
          />
        )

      case 'percent_bar_model':
        return (
          <PercentBarModel
            data={diagram.data as unknown as PercentBarModelData}
            width={width || 500}
            height={height || 250}
            {...commonProps}
          />
        )

      case 'dot_plot':
        return (
          <DotPlot
            data={diagram.data as unknown as DotPlotData}
            width={width || 500}
            height={height || 300}
            {...commonProps}
          />
        )

      case 'histogram':
        return (
          <Histogram
            data={diagram.data as unknown as HistogramData}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'box_plot':
        return (
          <BoxPlot
            data={diagram.data as unknown as BoxPlotData}
            width={width || 500}
            height={height || 200}
            {...commonProps}
          />
        )

      case 'stem_and_leaf_plot':
        return (
          <StemAndLeafPlot
            data={diagram.data as unknown as StemAndLeafPlotData}
            width={width || 400}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'measures_of_center':
        return (
          <MeasuresOfCenter
            data={diagram.data as unknown as MeasuresOfCenterData}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'probability_tree':
        return (
          <ProbabilityTree
            data={diagram.data as unknown as ProbabilityTreeData}
            width={width || 500}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'sample_space_diagram':
        return (
          <SampleSpaceDiagram
            data={diagram.data as unknown as SampleSpaceDiagramData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'venn_diagram':
        return (
          <VennDiagram
            data={diagram.data as unknown as VennDiagramData}
            width={width || 450}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'net_diagram_3d':
        return (
          <NetDiagram3D
            data={diagram.data as unknown as NetDiagram3DData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'cross_section_diagram':
        return (
          <CrossSectionDiagram
            data={diagram.data as unknown as CrossSectionDiagramData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'scale_drawing':
        return (
          <ScaleDrawing
            data={diagram.data as unknown as ScaleDrawingData}
            width={width || 500}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'slope_triangle':
        return (
          <SlopeTriangle
            data={diagram.data as unknown as SlopeTriangleData}
            width={width || 400}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'system_of_equations_graph':
        return (
          <SystemOfEquationsGraph
            data={diagram.data as unknown as SystemOfEquationsGraphData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'scatter_plot_trend_line':
        return (
          <ScatterPlotTrendLine
            data={diagram.data as unknown as ScatterPlotTrendLineData}
            width={width || 500}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'two_way_frequency_table':
        return (
          <TwoWayFrequencyTable
            data={diagram.data as unknown as TwoWayFrequencyTableData}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'pythagorean_theorem_diagram':
        return (
          <PythagoreanTheoremDiagram
            data={diagram.data as unknown as PythagoreanTheoremDiagramData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'transformation_diagram':
        return (
          <TransformationDiagram
            data={diagram.data as unknown as TransformationDiagramData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      // ====================================================================
      // High School Math (Grades 9-12)
      // ====================================================================

      case 'quadratic_graph':
        return (
          <QuadraticGraph
            data={diagram.data as unknown as QuadraticGraphData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'residual_plot':
        return (
          <ResidualPlot
            data={diagram.data as unknown as ResidualPlotData}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'complex_number_plane':
        return (
          <ComplexNumberPlane
            data={diagram.data as unknown as ComplexNumberPlaneData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'conic_sections':
        return (
          <ConicSections
            data={diagram.data as unknown as ConicSectionsData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'polynomial_graph':
        return (
          <PolynomialGraph
            data={diagram.data as unknown as PolynomialGraphData}
            width={width || 500}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'exponential_graph':
        return (
          <ExponentialGraph
            data={diagram.data as unknown as ExponentialGraphData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'logarithmic_graph':
        return (
          <LogarithmicGraph
            data={diagram.data as unknown as LogarithmicGraphData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'rational_function_graph':
        return (
          <RationalFunctionGraph
            data={diagram.data as unknown as RationalFunctionGraphData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'binomial_distribution':
        return (
          <BinomialDistribution
            data={diagram.data as unknown as BinomialDistributionData}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'probability_distribution':
        return (
          <ProbabilityDistribution
            data={diagram.data as unknown as ProbabilityDistributionData}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'parametric_curve':
        return (
          <ParametricCurve
            data={diagram.data as unknown as ParametricCurveData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'limit_visualization':
        return (
          <LimitVisualization
            data={diagram.data as unknown as LimitVisualizationData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'derivative_tangent_line':
        return (
          <DerivativeTangentLine
            data={diagram.data as unknown as DerivativeTangentLineData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'sequence_diagram':
        return (
          <SequenceDiagram
            data={diagram.data as unknown as SequenceDiagramData}
            width={width || 500}
            height={height || 220}
            {...commonProps}
          />
        )

      case 'sampling_distribution':
        return (
          <SamplingDistribution
            data={diagram.data as unknown as SamplingDistributionData}
            width={width || 450}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'free_body_diagram':
        return (
          <FBD
            data={diagram.data as unknown as FBDData}
            width={width || 400}
            height={height || 400}
            {...commonProps}
          />
        )

      // ====================================================================
      // Geometry – Transformations
      // ====================================================================

      case 'rotation_coordinate_plane':
        return (
          <RotationCoordinatePlane
            data={diagram.data as unknown as RotationCoordinatePlaneData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'dilation_coordinate_plane':
        return (
          <DilationCoordinatePlane
            data={diagram.data as unknown as DilationCoordinatePlaneData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'tessellation_pattern':
        return (
          <TessellationPattern
            data={diagram.data as unknown as TessellationPatternData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'transformations_composition':
        return (
          <TransformationsComposition
            data={diagram.data as unknown as TransformationsCompositionData}
            width={width || 500}
            height={height || 400}
            {...commonProps}
          />
        )

      // ====================================================================
      // Geometry – Step-synced
      // ====================================================================

      case 'triangle_geometry':
        return (
          <TriangleGeometry
            data={diagram.data as unknown as TriangleGeometryData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'regular_polygon':
        return (
          <RegularPolygon
            data={diagram.data as unknown as RegularPolygonData}
            width={width || 400}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'perpendicular_bisector_construction':
        return (
          <PerpendicularBisectorConstruction
            data={diagram.data as unknown as PerpendicularBisectorConstructionData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'orthographic_views_3d':
        return (
          <OrthographicViews3D
            data={diagram.data as unknown as OrthographicViews3DData}
            width={width || 500}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'tangent_radius_perpendicularity':
        return (
          <TangentRadiusPerpendicularity
            data={diagram.data as unknown as TangentRadiusPerpendicularityData}
            width={width || 400}
            height={height || 400}
            {...commonProps}
          />
        )

      // ====================================================================
      // Geometry – Theorems
      // ====================================================================

      case 'exterior_angle_theorem':
        return (
          <ExteriorAngleTheorem
            data={diagram.data as unknown as ExteriorAngleTheoremData}
            width={width || 450}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'inscribed_angle_theorem':
        return (
          <InscribedAngleTheorem
            data={diagram.data as unknown as InscribedAngleTheoremData}
            width={width || 400}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'triangle_congruence':
        return (
          <TriangleCongruence
            data={diagram.data as unknown as TriangleCongruenceData}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'triangle_similarity':
        return (
          <TriangleSimilarity
            data={diagram.data as unknown as TriangleSimilarityData}
            width={width || 500}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'law_of_sines_cosines':
        return (
          <LawOfSinesCosines
            data={diagram.data as unknown as LawOfSinesCosinesData}
            width={width || 500}
            height={height || 400}
            {...commonProps}
          />
        )

      // ====================================================================
      // Geometry – Angle / Line Theorems
      // ====================================================================

      case 'angle_types':
        return (
          <AngleTypes
            data={diagram.data as unknown as AngleTypesData}
            width={width || 500}
            height={height || 300}
            {...commonProps}
          />
        )

      case 'complementary_supplementary':
        return (
          <ComplementarySupplementary
            data={diagram.data as unknown as ComplementarySupplementaryData}
            width={width || 450}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'vertical_angles':
        return (
          <VerticalAngles
            data={diagram.data as unknown as VerticalAnglesData}
            width={width || 400}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'parallel_lines_transversal':
        return (
          <ParallelLinesTransversal
            data={diagram.data as unknown as ParallelLinesTransversalData}
            width={width || 450}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'triangle_angle_sum':
        return (
          <TriangleAngleSum
            data={diagram.data as unknown as TriangleAngleSumData}
            width={width || 450}
            height={height || 350}
            {...commonProps}
          />
        )

      // ====================================================================
      // Basic Shapes
      // ====================================================================

      case 'square':
        return (
          <Square
            data={diagram.data as unknown as SquareData}
            width={width || 400}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'rectangle':
        return (
          <Rectangle
            data={diagram.data as unknown as RectangleData}
            width={width || 450}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'parallelogram':
        return (
          <Parallelogram
            data={diagram.data as unknown as ParallelogramData}
            width={width || 450}
            height={height || 350}
            {...commonProps}
          />
        )

      case 'rhombus':
        return (
          <Rhombus
            data={diagram.data as unknown as RhombusData}
            width={width || 400}
            height={height || 400}
            {...commonProps}
          />
        )

      case 'trapezoid':
        return (
          <Trapezoid
            data={diagram.data as unknown as TrapezoidData}
            width={width || 450}
            height={height || 350}
            {...commonProps}
          />
        )

      // ====================================================================
      // Utility diagrams
      // ====================================================================

      case 'math_table':
        return (
          <MathTable
            data={diagram.data as unknown as TableData}
            className="diagram-content"
            subject={subject}
            complexity={complexity}
          />
        )

      default: {
        console.warn('[DiagramRenderer] Failed to render diagram:', {
          type: diagram.type,
          error: `Unknown math diagram type '${diagram.type}'`,
          data: diagram.data,
        })
        return (
          <div className="flex items-center justify-center h-64 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 px-4">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {language === 'he'
                ? `סוג תרשים '${diagram.type}' לא נתמך`
                : `Diagram type '${diagram.type}' is not supported`}
            </p>
          </div>
        )
      }
    }
  }

  // Get diagram type display name
  const getDiagramTypeName = (): string => {
    const names: Record<string, Record<string, string>> = {
      en: {
        // Core
        long_division: 'Long Division',
        equation: 'Equation Solving',
        fraction: 'Fractions',
        number_line: 'Number Line',
        coordinate_plane: 'Coordinate Plane',
        triangle: 'Triangle',
        circle: 'Circle',
        unit_circle: 'Unit Circle',
        factoring: 'Factoring',
        completing_square: 'Completing the Square',
        polynomial: 'Polynomial Operations',
        radical: 'Radical Simplification',
        systems: 'Systems of Equations',
        inequality: 'Inequalities',
        tree_diagram: 'Tree Diagram',
        interactive_coordinate_plane: 'Interactive Graph',
        equation_grapher: 'Equation Grapher',
        // Elementary
        counting_objects_array: 'Counting Objects',
        ten_frame: 'Ten Frame',
        part_part_whole: 'Part-Part-Whole',
        bar_model: 'Bar Model',
        place_value_chart: 'Place Value Chart',
        base10_blocks: 'Base-10 Blocks',
        base_10_blocks: 'Base-10 Blocks',
        picture_graph: 'Picture Graph',
        bar_graph: 'Bar Graph',
        fraction_circle: 'Fraction Circle',
        fraction_bar: 'Fraction Bar',
        fraction_number_line: 'Fraction Number Line',
        multiplication_array: 'Multiplication Array',
        area_model_multiplication: 'Area Model',
        area_model: 'Area Model',
        scaled_bar_graph: 'Scaled Bar Graph',
        equivalent_fraction_model: 'Equivalent Fractions',
        mixed_number_model: 'Mixed Numbers',
        decimal_grid: 'Decimal Grid',
        fraction_multiplication_area: 'Fraction Multiplication',
        fraction_division_model: 'Fraction Division',
        volume_model: 'Volume Model',
        order_of_operations_tree: 'Order of Operations',
        quadrant_one_coordinate_plane: 'Coordinate Plane (Q1)',
        // Middle School
        double_number_line: 'Double Number Line',
        ratio_table: 'Ratio Table',
        tape_diagram_ratio: 'Tape Diagram',
        percent_bar_model: 'Percent Bar Model',
        dot_plot: 'Dot Plot',
        histogram: 'Histogram',
        box_plot: 'Box Plot',
        stem_and_leaf_plot: 'Stem and Leaf Plot',
        measures_of_center: 'Measures of Center',
        probability_tree: 'Probability Tree',
        sample_space_diagram: 'Sample Space',
        venn_diagram: 'Venn Diagram',
        net_diagram_3d: '3D Net Diagram',
        cross_section_diagram: 'Cross Section',
        scale_drawing: 'Scale Drawing',
        slope_triangle: 'Slope Triangle',
        system_of_equations_graph: 'System of Equations',
        scatter_plot_trend_line: 'Scatter Plot',
        two_way_frequency_table: 'Two-Way Table',
        pythagorean_theorem_diagram: 'Pythagorean Theorem',
        transformation_diagram: 'Transformations',
        // High School
        quadratic_graph: 'Quadratic Graph',
        residual_plot: 'Residual Plot',
        complex_number_plane: 'Complex Number Plane',
        conic_sections: 'Conic Sections',
        polynomial_graph: 'Polynomial Graph',
        exponential_graph: 'Exponential Graph',
        logarithmic_graph: 'Logarithmic Graph',
        rational_function_graph: 'Rational Function',
        binomial_distribution: 'Binomial Distribution',
        probability_distribution: 'Probability Distribution',
        parametric_curve: 'Parametric Curve',
        limit_visualization: 'Limit Visualization',
        derivative_tangent_line: 'Derivative & Tangent Line',
        sequence_diagram: 'Sequence Diagram',
        sampling_distribution: 'Sampling Distribution',
        free_body_diagram: 'Free Body Diagram',
        // Geometry
        rotation_coordinate_plane: 'Rotation',
        dilation_coordinate_plane: 'Dilation',
        tessellation_pattern: 'Tessellation',
        transformations_composition: 'Composition of Transformations',
        triangle_geometry: 'Triangle Geometry',
        regular_polygon: 'Regular Polygon',
        perpendicular_bisector_construction: 'Perpendicular Bisector',
        orthographic_views_3d: 'Orthographic Views',
        tangent_radius_perpendicularity: 'Tangent-Radius',
        exterior_angle_theorem: 'Exterior Angle Theorem',
        inscribed_angle_theorem: 'Inscribed Angle Theorem',
        triangle_congruence: 'Triangle Congruence',
        triangle_similarity: 'Triangle Similarity',
        law_of_sines_cosines: 'Law of Sines/Cosines',
        angle_types: 'Angle Types',
        complementary_supplementary: 'Complementary & Supplementary',
        vertical_angles: 'Vertical Angles',
        parallel_lines_transversal: 'Parallel Lines & Transversal',
        triangle_angle_sum: 'Triangle Angle Sum',
        // Basic Shapes
        square: 'Square',
        rectangle: 'Rectangle',
        parallelogram: 'Parallelogram',
        rhombus: 'Rhombus',
        trapezoid: 'Trapezoid',
        // Utility
        math_table: 'Math Table',
      },
      he: {
        // Core
        long_division: 'חילוק ארוך',
        equation: 'פתרון משוואה',
        fraction: 'שברים',
        number_line: 'ציר מספרים',
        coordinate_plane: 'מערכת צירים',
        triangle: 'משולש',
        circle: 'מעגל',
        unit_circle: 'מעגל היחידה',
        factoring: 'פירוק לגורמים',
        completing_square: 'השלמה לריבוע',
        polynomial: 'פעולות פולינום',
        radical: 'פישוט שורשים',
        systems: 'מערכת משוואות',
        inequality: 'אי-שוויונות',
        tree_diagram: 'תרשים עץ',
        interactive_coordinate_plane: 'גרף אינטראקטיבי',
        equation_grapher: 'שרטוט משוואות',
        // Elementary
        counting_objects_array: 'ספירת עצמים',
        ten_frame: 'מסגרת עשר',
        part_part_whole: 'חלק-חלק-שלם',
        bar_model: 'מודל עמודות',
        place_value_chart: 'טבלת ערך מקום',
        base10_blocks: 'קוביות בסיס 10',
        base_10_blocks: 'קוביות בסיס 10',
        picture_graph: 'גרף תמונות',
        bar_graph: 'גרף עמודות',
        fraction_circle: 'עיגול שברים',
        fraction_bar: 'פס שברים',
        fraction_number_line: 'ציר מספרים שברים',
        multiplication_array: 'מערך כפל',
        area_model_multiplication: 'מודל שטח',
        area_model: 'מודל שטח',
        scaled_bar_graph: 'גרף עמודות מדורג',
        equivalent_fraction_model: 'שברים שקולים',
        mixed_number_model: 'מספרים מעורבים',
        decimal_grid: 'רשת עשרונית',
        fraction_multiplication_area: 'כפל שברים',
        fraction_division_model: 'חילוק שברים',
        volume_model: 'מודל נפח',
        order_of_operations_tree: 'סדר פעולות',
        quadrant_one_coordinate_plane: 'מערכת צירים (רבע 1)',
        // Middle School
        double_number_line: 'ציר מספרים כפול',
        ratio_table: 'טבלת יחסים',
        tape_diagram_ratio: 'דיאגרמת סרט',
        percent_bar_model: 'מודל אחוזים',
        dot_plot: 'תרשים נקודות',
        histogram: 'היסטוגרמה',
        box_plot: 'תרשים קופסה',
        stem_and_leaf_plot: 'תרשים גבעול ועלה',
        measures_of_center: 'מדדי מרכז',
        probability_tree: 'עץ הסתברות',
        sample_space_diagram: 'מרחב מדגם',
        venn_diagram: 'דיאגרמת ון',
        net_diagram_3d: 'פריסה תלת-ממדית',
        cross_section_diagram: 'חתך רוחב',
        scale_drawing: 'שרטוט בקנה מידה',
        slope_triangle: 'משולש שיפוע',
        system_of_equations_graph: 'מערכת משוואות',
        scatter_plot_trend_line: 'תרשים פיזור',
        two_way_frequency_table: 'טבלה דו-כיוונית',
        pythagorean_theorem_diagram: 'משפט פיתגורס',
        transformation_diagram: 'טרנספורמציות',
        // High School
        quadratic_graph: 'גרף ריבועי',
        residual_plot: 'תרשים שאריות',
        complex_number_plane: 'מישור מספרים מרוכבים',
        conic_sections: 'חתכי חרוט',
        polynomial_graph: 'גרף פולינום',
        exponential_graph: 'גרף מעריכי',
        logarithmic_graph: 'גרף לוגריתמי',
        rational_function_graph: 'פונקציה רציונלית',
        binomial_distribution: 'התפלגות בינומית',
        probability_distribution: 'התפלגות הסתברות',
        parametric_curve: 'עקומה פרמטרית',
        limit_visualization: 'המחשת גבול',
        derivative_tangent_line: 'נגזרת וקו משיק',
        sequence_diagram: 'דיאגרמת סדרה',
        sampling_distribution: 'התפלגות דגימה',
        free_body_diagram: 'דיאגרמת גוף חופשי',
        // Geometry
        rotation_coordinate_plane: 'סיבוב',
        dilation_coordinate_plane: 'דילציה',
        tessellation_pattern: 'ריצוף',
        transformations_composition: 'הרכבת טרנספורמציות',
        triangle_geometry: 'גיאומטריית משולש',
        regular_polygon: 'מצולע משוכלל',
        perpendicular_bisector_construction: 'אנך אמצעי',
        orthographic_views_3d: 'מבטים אורתוגרפיים',
        tangent_radius_perpendicularity: 'משיק-רדיוס',
        exterior_angle_theorem: 'משפט הזווית החיצונית',
        inscribed_angle_theorem: 'משפט הזווית החסומה',
        triangle_congruence: 'חפיפת משולשים',
        triangle_similarity: 'דמיון משולשים',
        law_of_sines_cosines: 'משפט הסינוסים/קוסינוסים',
        angle_types: 'סוגי זוויות',
        complementary_supplementary: 'זוויות משלימות ומשלימות ל-180°',
        vertical_angles: 'זוויות קודקודיות',
        parallel_lines_transversal: 'ישרים מקבילים וחותך',
        triangle_angle_sum: 'סכום זוויות במשולש',
        // Basic Shapes
        square: 'ריבוע',
        rectangle: 'מלבן',
        parallelogram: 'מקבילית',
        rhombus: 'מעוין',
        trapezoid: 'טרפז',
        // Utility
        math_table: 'טבלה מתמטית',
      },
    }
    return names[language][diagram.type] || diagram.type
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Diagram type header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {getDiagramTypeName()}
        </span>
        {!isSelfManaging && (
          <span className="text-xs text-gray-400">
            {language === 'he' ? 'צעד' : 'Step'} {currentStep + 1}/{calculatedTotalSteps}
          </span>
        )}
      </div>

      {/* Diagram */}
      <div className={`flex justify-center rounded-lg overflow-x-auto ${isSelfManaging && !showControls ? '[&_[data-diagram-controls]]:hidden' : ''}`}>
        {renderDiagram()}
      </div>

      {/* Step controls (optional) — hidden for self-managing components */}
      {showControls && calculatedTotalSteps > 1 && !isSelfManaging && (
        <div className="step-controls mt-3 flex items-center justify-between px-2">
          {/* Progress indicator */}
          <div className="progress-indicator flex items-center gap-2">
            <div className="progress-bar h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full w-32">
              <div
                className="progress-fill h-full bg-violet-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / calculatedTotalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="nav-buttons flex gap-2">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {language === 'he' ? '← הקודם' : '← Prev'}
            </button>
            <button
              onClick={handleNextStep}
              disabled={currentStep >= calculatedTotalSteps - 1}
              className="px-3 py-1.5 text-sm bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {language === 'he' ? 'הבא →' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* Current step info — hidden for self-managing components */}
      {!isSelfManaging && diagram.stepConfig?.[currentStep]?.stepLabel && (
        <div className="step-info mt-2 p-2 bg-violet-50 dark:bg-violet-900/30 rounded-md mx-2">
          <p className="text-sm text-violet-700 dark:text-violet-300">
            {language === 'he'
              ? diagram.stepConfig[currentStep].stepLabelHe || diagram.stepConfig[currentStep].stepLabel
              : diagram.stepConfig[currentStep].stepLabel}
          </p>
        </div>
      )}

    </div>
  )
}

export default MathDiagramRenderer
