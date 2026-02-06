'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  GeometryDiagramState,
  GeometryStepConfig as _GeometryStepConfig,
  SquareData,
  RectangleData,
  TriangleGeometryData,
  CircleGeometryData,
  ParallelogramData,
  RhombusData,
  TrapezoidData,
  RegularPolygonData,
  GeometryShapeType,
} from '@/types/geometry'
import { Square } from './Square'
import { Rectangle } from './Rectangle'
import { TriangleGeometry } from './TriangleGeometry'
import { CircleGeometry } from './CircleGeometry'
import { Parallelogram } from './Parallelogram'
import { Rhombus } from './Rhombus'
import { Trapezoid } from './Trapezoid'
import { RegularPolygon } from './RegularPolygon'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

interface GeometryDiagramRendererProps {
  /** Diagram state from tutor response */
  diagram: GeometryDiagramState
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
  /** Show step-by-step solution */
  showStepByStep?: boolean
  /** Subject for color theming */
  subject?: SubjectKey
  /** Visual complexity level */
  complexity?: VisualComplexityLevel
}

// Shape type display names
const SHAPE_NAMES: Record<GeometryShapeType, { en: string; he: string }> = {
  square: { en: 'Square', he: 'ריבוע' },
  rectangle: { en: 'Rectangle', he: 'מלבן' },
  triangle: { en: 'Triangle', he: 'משולש' },
  circle: { en: 'Circle', he: 'מעגל' },
  parallelogram: { en: 'Parallelogram', he: 'מקבילית' },
  rhombus: { en: 'Rhombus', he: 'מעוין' },
  trapezoid: { en: 'Trapezoid', he: 'טרפז' },
  regular_polygon: { en: 'Regular Polygon', he: 'מצולע משוכלל' },
  // Middle School Geometry
  angle_types: { en: 'Angle Types', he: 'סוגי זוויות' },
  complementary_supplementary: { en: 'Complementary & Supplementary', he: 'זוויות משלימות ומשלימות ל-180' },
  vertical_angles: { en: 'Vertical Angles', he: 'זוויות קודקודיות' },
  parallel_lines_transversal: { en: 'Parallel Lines & Transversal', he: 'ישרים מקבילים וחותך' },
  triangle_angle_sum: { en: 'Triangle Angle Sum', he: 'סכום זוויות במשולש' },
  exterior_angle_theorem: { en: 'Exterior Angle Theorem', he: 'משפט הזווית החיצונית' },
  translation_coordinate_plane: { en: 'Translation', he: 'הזזה' },
  reflection_coordinate_plane: { en: 'Reflection', he: 'שיקוף' },
  rotation_coordinate_plane: { en: 'Rotation', he: 'סיבוב' },
  dilation_coordinate_plane: { en: 'Dilation', he: 'הרחבה' },
  congruence_transformations: { en: 'Congruence Transformations', he: 'חפיפה' },
  similarity_transformations: { en: 'Similarity Transformations', he: 'דמיון' },
  pythagorean_visual_proof: { en: 'Pythagorean Theorem Proof', he: 'הוכחת משפט פיתגורס' },
  shape_3d_with_net: { en: '3D Shape & Net', he: 'גוף תלת-ממדי ופריסה' },
  cross_section_3d_shape: { en: '3D Cross Section', he: 'חתך של גוף תלת-ממדי' },
  // High School Geometry
  point_line_plane_basics: { en: 'Points, Lines & Planes', he: 'נקודות, ישרים ומישורים' },
  angle_bisector_construction: { en: 'Angle Bisector', he: 'חוצה זווית' },
  perpendicular_bisector_construction: { en: 'Perpendicular Bisector', he: 'אנך אמצעי' },
  triangle_congruence: { en: 'Triangle Congruence', he: 'חפיפת משולשים' },
  triangle_similarity: { en: 'Triangle Similarity', he: 'דמיון משולשים' },
  cpctc_proof: { en: 'CPCTC Proof', he: 'הוכחת CPCTC' },
  triangle_centers: { en: 'Triangle Centers', he: 'נקודות מיוחדות במשולש' },
  midsegment_theorem: { en: 'Midsegment Theorem', he: 'משפט קו האמצע' },
  isosceles_triangle_properties: { en: 'Isosceles Triangle', he: 'משולש שווה שוקיים' },
  quadrilateral_properties: { en: 'Quadrilateral Properties', he: 'תכונות מרובעים' },
  circle_parts: { en: 'Circle Parts', he: 'חלקי המעגל' },
  inscribed_angle_theorem: { en: 'Inscribed Angle Theorem', he: 'משפט הזווית ההיקפית' },
  tangent_radius_perpendicularity: { en: 'Tangent-Radius Perpendicularity', he: 'ניצבות משיק-רדיוס' },
  chord_secant_tangent_relations: { en: 'Chord-Secant-Tangent', he: 'יתר-חותך-משיק' },
  arc_length_sector_area: { en: 'Arc Length & Sector Area', he: 'אורך קשת ושטח גזרה' },
  circle_equation_coordinate_plane: { en: 'Circle Equation', he: 'משוואת המעגל' },
  coordinate_geometry_proof: { en: 'Coordinate Geometry Proof', he: 'הוכחה בגיאומטריה אנליטית' },
  trig_ratios_right_triangle: { en: 'Trig Ratios', he: 'יחסי טריגונומטריה' },
  unit_circle_trig_values: { en: 'Unit Circle Trig Values', he: 'ערכי מעגל היחידה' },
  law_of_sines_cosines: { en: 'Law of Sines & Cosines', he: 'משפט הסינוסים והקוסינוסים' },
  transformations_composition: { en: 'Transformations Composition', he: 'הרכבת העתקות' },
  tessellation_pattern: { en: 'Tessellation', he: 'ריצוף' },
  orthographic_views_3d: { en: 'Orthographic Views', he: 'הטלות אורתוגונליות' },
  cross_sections_3d_solids: { en: '3D Cross Sections', he: 'חתכים של גופים' },
  cavalieris_principle: { en: "Cavalieri's Principle", he: 'עקרון קוולייר' },
  surface_area_from_net: { en: 'Surface Area from Net', he: 'שטח פנים מפריסה' },
}

/**
 * GeometryDiagramRenderer - Universal renderer for all geometry diagram types
 *
 * This component:
 * - Renders the appropriate geometry component based on shape type
 * - Manages step-synced animation state for step-by-step solutions
 * - Provides optional controls for manual step advancement
 * - Integrates with tutor responses
 */
export function GeometryDiagramRenderer({
  diagram,
  currentStep: stepOverride,
  animate = true,
  animationDuration = 400,
  onStepComplete,
  onStepAdvance,
  showControls = false,
  width,
  height,
  className = '',
  language = 'en',
  showStepByStep = false,
  subject = 'geometry',
  complexity = 'middle_school',
}: GeometryDiagramRendererProps) {
  const [internalStep, setInternalStep] = useState(diagram.visibleStep)

  // Use override step if provided, otherwise use internal state
  const currentStep = stepOverride ?? internalStep

  // Sync internal step with diagram state changes
  useEffect(() => {
    if (stepOverride === undefined) {
      setInternalStep(diagram.visibleStep)
    }
  }, [diagram.visibleStep, stepOverride])

  // Calculate total steps
  const calculatedTotalSteps = diagram.totalSteps ?? diagram.stepConfig?.length ?? 3

  // Handle step completion
  const handleStepComplete = useCallback(() => {
    onStepComplete?.()
  }, [onStepComplete])

  // Handle manual step advance
  const handleNextStep = useCallback(() => {
    if (currentStep < calculatedTotalSteps - 1) {
      const newStep = currentStep + 1
      if (stepOverride === undefined) {
        setInternalStep(newStep)
      }
      onStepAdvance?.()
      if (newStep === calculatedTotalSteps - 1) {
        handleStepComplete()
      }
    }
  }, [currentStep, calculatedTotalSteps, stepOverride, onStepAdvance, handleStepComplete])

  const handlePrevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1
      if (stepOverride === undefined) {
        setInternalStep(newStep)
      }
    }
  }, [currentStep, stepOverride])

  // Common props for all shape components
  const commonProps = {
    width: width || 350,
    height: height || 350,
    className: 'diagram-content',
    currentStep,
    showStepByStep,
    language,
    subject,
    complexity,
  }

  // Render the appropriate diagram type
  const renderDiagram = () => {
    switch (diagram.type) {
      case 'square':
        return <Square data={diagram.data as SquareData} {...commonProps} />

      case 'rectangle':
        return <Rectangle data={diagram.data as RectangleData} {...commonProps} />

      case 'triangle':
        return <TriangleGeometry data={diagram.data as TriangleGeometryData} {...commonProps} />

      case 'circle':
        return <CircleGeometry data={diagram.data as CircleGeometryData} {...commonProps} />

      case 'parallelogram':
        return <Parallelogram data={diagram.data as ParallelogramData} {...commonProps} />

      case 'rhombus':
        return <Rhombus data={diagram.data as RhombusData} {...commonProps} />

      case 'trapezoid':
        return <Trapezoid data={diagram.data as TrapezoidData} {...commonProps} />

      case 'regular_polygon':
        return <RegularPolygon data={diagram.data as RegularPolygonData} {...commonProps} />

      default:
        return (
          <div className="flex items-center justify-center h-64 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">
              {language === 'he'
                ? `סוג צורה "${diagram.type}" לא נתמך`
                : `Shape type "${diagram.type}" not supported`}
            </p>
          </div>
        )
    }
  }

  // Get diagram type display name
  const getShapeName = (): string => {
    return SHAPE_NAMES[diagram.type]?.[language] || diagram.type
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Shape type header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {getShapeName()}
        </span>
        {showStepByStep && (
          <span className="text-xs text-gray-400">
            {language === 'he' ? 'צעד' : 'Step'} {currentStep + 1}/{calculatedTotalSteps}
          </span>
        )}
      </div>

      {/* Diagram */}
      <div className="flex justify-center bg-white dark:bg-gray-800 rounded-lg p-2 overflow-hidden">
        {renderDiagram()}
      </div>

      {/* Step controls (optional) */}
      {showControls && showStepByStep && calculatedTotalSteps > 1 && (
        <div className="step-controls mt-3 flex items-center justify-between px-2">
          {/* Progress indicator */}
          <div className="progress-indicator flex items-center gap-2">
            <div className="progress-bar h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full w-32">
              <div
                className="progress-fill h-full bg-blue-500 rounded-full transition-all"
                style={{ 
                  width: `${((currentStep + 1) / calculatedTotalSteps) * 100}%`,
                  transitionDuration: animate ? `${animationDuration}ms` : '0ms',
                }}
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
              className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {language === 'he' ? 'הבא →' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      {/* Current step info from stepConfig */}
      {diagram.stepConfig?.[currentStep]?.stepLabel && showStepByStep && (
        <div className="step-info mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-md mx-2">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {language === 'he'
              ? diagram.stepConfig[currentStep].stepLabelHe || diagram.stepConfig[currentStep].stepLabel
              : diagram.stepConfig[currentStep].stepLabel}
          </p>
        </div>
      )}

    </div>
  )
}

export default GeometryDiagramRenderer
