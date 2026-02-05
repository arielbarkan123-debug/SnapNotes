'use client'

import { useMemo } from 'react'
import type { RectangleData, RectangleCalculations, SolutionStep } from '@/types/geometry'
import { GEOMETRY_COLORS } from '@/types/geometry'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

interface RectangleProps {
  data: RectangleData
  width?: number
  height?: number
  className?: string
  currentStep?: number
  showStepByStep?: boolean
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * Rectangle - SVG component for displaying rectangles with calculations
 * Shows area, perimeter, and diagonal formulas with step-by-step solutions
 */
export function Rectangle({
  data,
  width: svgWidth = 350,
  height: svgHeight = 350,
  className = '',
  currentStep = 0,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: RectangleProps) {
  const {
    width: rectWidth,
    height: rectHeight,
    widthLabel = 'w',
    heightLabel = 'h',
    showDiagonals = false,
    diagonalLabel = 'd',
    title,
    showFormulas = true,
    showCalculations = true,
    highlightSide,
  } = data

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])

  // Calculate all measurements
  const calculations: RectangleCalculations = useMemo(() => {
    const area = rectWidth * rectHeight
    const perimeter = 2 * (rectWidth + rectHeight)
    const diagonal = Math.sqrt(rectWidth * rectWidth + rectHeight * rectHeight)

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת שטח מלבן' : 'Area formula for a rectangle',
        formula: 'A = w \\times h',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = ${rectWidth} \\times ${rectHeight}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `A = ${area}`,
      },
    ]

    const perimeterSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת היקף מלבן' : 'Perimeter formula for a rectangle',
        formula: 'P = 2(w + h)',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `P = 2(${rectWidth} + ${rectHeight})`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `P = 2 \\times ${rectWidth + rectHeight} = ${perimeter}`,
      },
    ]

    const diagonalSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת אלכסון (משפט פיתגורס)' : 'Diagonal formula (Pythagorean theorem)',
        formula: 'd = \\sqrt{w^2 + h^2}',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `d = \\sqrt{${rectWidth}^2 + ${rectHeight}^2}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `d = \\sqrt{${rectWidth * rectWidth + rectHeight * rectHeight}} \\approx ${diagonal.toFixed(2)}`,
      },
    ]

    return {
      area,
      perimeter,
      diagonal,
      steps: { area: areaSteps, perimeter: perimeterSteps, diagonal: diagonalSteps },
    }
  }, [rectWidth, rectHeight, language])

  // SVG dimensions and scaling
  const padding = 50
  const availableWidth = svgWidth - padding * 2
  const availableHeight = svgHeight - 130 - padding
  
  // Scale to fit
  const scaleX = availableWidth / rectWidth
  const scaleY = availableHeight / rectHeight
  const scale = Math.min(scaleX, scaleY, 30) // Cap scale for very small values
  
  const scaledWidth = rectWidth * scale
  const scaledHeight = rectHeight * scale
  const startX = (svgWidth - scaledWidth) / 2
  const startY = padding + 20

  // Vertices (clockwise from top-left)
  const vertices = [
    { x: startX, y: startY, label: 'A' },
    { x: startX + scaledWidth, y: startY, label: 'B' },
    { x: startX + scaledWidth, y: startY + scaledHeight, label: 'C' },
    { x: startX, y: startY + scaledHeight, label: 'D' },
  ]

  const rectPath = `M ${vertices[0].x} ${vertices[0].y} 
                    L ${vertices[1].x} ${vertices[1].y} 
                    L ${vertices[2].x} ${vertices[2].y} 
                    L ${vertices[3].x} ${vertices[3].y} Z`

  // Right angle marker
  const rightAngleSize = 12
  const renderRightAngle = (vx: number, vy: number, dx1: number, dy1: number, dx2: number, dy2: number) => (
    <path
      d={`M ${vx + dx1 * rightAngleSize} ${vy + dy1 * rightAngleSize} 
          L ${vx + dx1 * rightAngleSize + dx2 * rightAngleSize} ${vy + dy1 * rightAngleSize + dy2 * rightAngleSize}
          L ${vx + dx2 * rightAngleSize} ${vy + dy2 * rightAngleSize}`}
      fill="none"
      stroke={GEOMETRY_COLORS.label.angle}
      strokeWidth={1.5}
    />
  )

  return (
    <div className={`geometry-rectangle ${className}`}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="text-gray-800 dark:text-gray-200"
      >
        {/* Title */}
        {title && (
          <text
            x={svgWidth / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Rectangle fill */}
        <path
          d={rectPath}
          fill={subjectColors.primary}
          fillOpacity={0.1}
          stroke="none"
        />

        {/* Rectangle outline */}
        <path
          d={rectPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={adaptiveLineWeight}
        />

        {/* Highlighted sides */}
        {highlightSide === 'width' && (
          <>
            <line
              x1={vertices[0].x}
              y1={vertices[0].y}
              x2={vertices[1].x}
              y2={vertices[1].y}
              stroke={GEOMETRY_COLORS.highlight.primary}
              strokeWidth={3}
            />
            <line
              x1={vertices[3].x}
              y1={vertices[3].y}
              x2={vertices[2].x}
              y2={vertices[2].y}
              stroke={GEOMETRY_COLORS.highlight.primary}
              strokeWidth={3}
            />
          </>
        )}
        {highlightSide === 'height' && (
          <>
            <line
              x1={vertices[1].x}
              y1={vertices[1].y}
              x2={vertices[2].x}
              y2={vertices[2].y}
              stroke={GEOMETRY_COLORS.highlight.primary}
              strokeWidth={3}
            />
            <line
              x1={vertices[0].x}
              y1={vertices[0].y}
              x2={vertices[3].x}
              y2={vertices[3].y}
              stroke={GEOMETRY_COLORS.highlight.primary}
              strokeWidth={3}
            />
          </>
        )}

        {/* Diagonals */}
        {showDiagonals && (
          <>
            <line
              x1={vertices[0].x}
              y1={vertices[0].y}
              x2={vertices[2].x}
              y2={vertices[2].y}
              stroke={GEOMETRY_COLORS.auxiliary.diagonal}
              strokeWidth={1.5}
              strokeDasharray="5,3"
            />
            <line
              x1={vertices[1].x}
              y1={vertices[1].y}
              x2={vertices[3].x}
              y2={vertices[3].y}
              stroke={GEOMETRY_COLORS.auxiliary.diagonal}
              strokeWidth={1.5}
              strokeDasharray="5,3"
            />
            {/* Diagonal label */}
            <text
              x={(vertices[0].x + vertices[2].x) / 2 + 10}
              y={(vertices[0].y + vertices[2].y) / 2 - 5}
              style={{ fill: GEOMETRY_COLORS.auxiliary.diagonal }}
              className="text-xs"
            >
              {diagonalLabel}
            </text>
          </>
        )}

        {/* Right angle markers at each corner */}
        {renderRightAngle(vertices[0].x, vertices[0].y, 1, 0, 0, 1)}
        {renderRightAngle(vertices[1].x, vertices[1].y, 0, 1, -1, 0)}
        {renderRightAngle(vertices[2].x, vertices[2].y, -1, 0, 0, -1)}
        {renderRightAngle(vertices[3].x, vertices[3].y, 0, -1, 1, 0)}

        {/* Side labels */}
        {/* Width (top) */}
        <text
          x={(vertices[0].x + vertices[1].x) / 2}
          y={vertices[0].y - 10}
          textAnchor="middle"
          style={{ fill: subjectColors.primary }}
          className="text-sm font-medium"
        >
          {widthLabel} = {rectWidth}
        </text>
        {/* Height (right) */}
        <text
          x={vertices[1].x + 15}
          y={(vertices[1].y + vertices[2].y) / 2}
          textAnchor="start"
          dominantBaseline="middle"
          style={{ fill: subjectColors.primary }}
          className="text-sm font-medium"
        >
          {heightLabel} = {rectHeight}
        </text>

        {/* Vertex labels */}
        {vertices.map((v, i) => (
          <g key={`vertex-${i}`}>
            <circle cx={v.x} cy={v.y} r={adaptiveLineWeight} fill="currentColor" />
            <text
              x={v.x + (i === 0 || i === 3 ? -12 : 12)}
              y={v.y + (i === 0 || i === 1 ? -8 : 12)}
              textAnchor="middle"
              className="fill-current text-sm font-bold"
            >
              {v.label}
            </text>
          </g>
        ))}

        {/* Formulas section */}
        {showFormulas && (
          <g transform={`translate(0, ${startY + scaledHeight + 30})`}>
            <text x={10} y={0} className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
              {language === 'he' ? 'נוסחאות:' : 'Formulas:'}
            </text>
            <text x={10} y={18} className="fill-current text-xs">
              {language === 'he' ? 'שטח' : 'Area'}: A = w × h = {rectWidth} × {rectHeight} = {calculations.area}
            </text>
            <text x={10} y={36} className="fill-current text-xs">
              {language === 'he' ? 'היקף' : 'Perimeter'}: P = 2(w + h) = 2({rectWidth} + {rectHeight}) = {calculations.perimeter}
            </text>
            {showDiagonals && (
              <text x={10} y={54} className="fill-current text-xs">
                {language === 'he' ? 'אלכסון' : 'Diagonal'}: d = √(w² + h²) ≈ {calculations.diagonal.toFixed(2)}
              </text>
            )}
          </g>
        )}
      </svg>

      {/* Step-by-step solution */}
      {showStepByStep && showCalculations && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">
            {language === 'he' ? 'פתרון מפורט:' : 'Step-by-Step Solution:'}
          </h4>
          <div className="space-y-3">
            {/* Area calculation */}
            <div className="border-l-2 border-blue-500 pl-3">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {language === 'he' ? 'שטח:' : 'Area:'}
              </p>
              {calculations.steps?.area.slice(0, currentStep + 1).map((step) => (
                <p key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400">
                  {step.formula || step.substitution || step.result}
                </p>
              ))}
            </div>

            {/* Perimeter calculation */}
            <div className="border-l-2 border-green-500 pl-3">
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                {language === 'he' ? 'היקף:' : 'Perimeter:'}
              </p>
              {calculations.steps?.perimeter.slice(0, currentStep + 1).map((step) => (
                <p key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400">
                  {step.formula || step.substitution || step.result}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Rectangle
