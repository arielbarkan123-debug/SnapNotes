'use client'

import { useMemo } from 'react'
import type { ParallelogramData, ParallelogramCalculations, SolutionStep } from '@/types/geometry'
import { GEOMETRY_COLORS } from '@/types/geometry'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

interface ParallelogramProps {
  data: ParallelogramData
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
 * Parallelogram - SVG component for displaying parallelograms
 * Shows area, perimeter formulas with step-by-step solutions
 */
export function Parallelogram({
  data,
  width = 350,
  height = 350,
  className = '',
  currentStep = 0,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: ParallelogramProps) {
  const {
    base,
    side,
    height: h,
    baseLabel = 'b',
    sideLabel = 'a',
    heightLabel = 'h',
    angle = 60, // Default angle
    showHeight = true,
    title,
    showFormulas = true,
    showCalculations = true,
  } = data

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])

  // Calculate all measurements
  const calculations: ParallelogramCalculations = useMemo(() => {
    const area = base * h
    const perimeter = 2 * (base + side)

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת שטח מקבילית' : 'Area formula for a parallelogram',
        formula: 'A = base \\times height',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = ${base} \\times ${h}`,
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
        description: language === 'he' ? 'נוסחת היקף מקבילית' : 'Perimeter formula for a parallelogram',
        formula: 'P = 2(a + b)',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `P = 2(${side} + ${base})`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `P = 2 \\times ${side + base} = ${perimeter}`,
      },
    ]

    return {
      area,
      perimeter,
      steps: { area: areaSteps, perimeter: perimeterSteps },
    }
  }, [base, side, h, language])

  // SVG dimensions and scaling
  const padding = 50
  const plotWidth = width - padding * 2
  const plotHeight = height - 150

  // Calculate the slant offset based on angle
  const angleRad = (angle * Math.PI) / 180
  const slantOffset = h / Math.tan(angleRad)

  // Scale to fit
  const totalWidth = base + slantOffset
  const scaleX = plotWidth / totalWidth
  const scaleY = plotHeight / h
  const scale = Math.min(scaleX, scaleY, 25)

  const scaledBase = base * scale
  const scaledHeight = h * scale
  const scaledSlant = slantOffset * scale
  const _scaledSide = side * scale

  const startX = (width - scaledBase - scaledSlant) / 2 + scaledSlant
  const startY = padding + 30

  // Vertices (clockwise from top-left)
  const vertices = [
    { x: startX, y: startY, label: 'A' },
    { x: startX + scaledBase, y: startY, label: 'B' },
    { x: startX + scaledBase - scaledSlant, y: startY + scaledHeight, label: 'C' },
    { x: startX - scaledSlant, y: startY + scaledHeight, label: 'D' },
  ]

  const parallelogramPath = `M ${vertices[0].x} ${vertices[0].y}
                             L ${vertices[1].x} ${vertices[1].y}
                             L ${vertices[2].x} ${vertices[2].y}
                             L ${vertices[3].x} ${vertices[3].y} Z`

  return (
    <div className={`geometry-parallelogram ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
      >
        {/* Title */}
        {title && (
          <text
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Parallelogram fill */}
        <path
          d={parallelogramPath}
          fill={subjectColors.primary}
          fillOpacity={0.1}
          stroke="none"
        />

        {/* Parallelogram outline */}
        <path
          d={parallelogramPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={adaptiveLineWeight}
        />

        {/* Parallel marks on opposite sides */}
        {/* Top and bottom (base) */}
        <g>
          <line
            x1={(vertices[0].x + vertices[1].x) / 2 - 5}
            y1={vertices[0].y - 3}
            x2={(vertices[0].x + vertices[1].x) / 2 + 5}
            y2={vertices[0].y - 3}
            stroke="currentColor"
            strokeWidth={1.5}
          />
          <line
            x1={(vertices[3].x + vertices[2].x) / 2 - 5}
            y1={vertices[3].y + 3}
            x2={(vertices[3].x + vertices[2].x) / 2 + 5}
            y2={vertices[3].y + 3}
            stroke="currentColor"
            strokeWidth={1.5}
          />
        </g>

        {/* Left and right (sides) - double marks */}
        <g>
          {/* Left side marks */}
          <line
            x1={(vertices[0].x + vertices[3].x) / 2 - 8}
            y1={(vertices[0].y + vertices[3].y) / 2 - 2}
            x2={(vertices[0].x + vertices[3].x) / 2 - 3}
            y2={(vertices[0].y + vertices[3].y) / 2 + 2}
            stroke="currentColor"
            strokeWidth={1.5}
          />
          <line
            x1={(vertices[0].x + vertices[3].x) / 2 - 5}
            y1={(vertices[0].y + vertices[3].y) / 2 - 2}
            x2={(vertices[0].x + vertices[3].x) / 2}
            y2={(vertices[0].y + vertices[3].y) / 2 + 2}
            stroke="currentColor"
            strokeWidth={1.5}
          />
          {/* Right side marks */}
          <line
            x1={(vertices[1].x + vertices[2].x) / 2 + 3}
            y1={(vertices[1].y + vertices[2].y) / 2 - 2}
            x2={(vertices[1].x + vertices[2].x) / 2 + 8}
            y2={(vertices[1].y + vertices[2].y) / 2 + 2}
            stroke="currentColor"
            strokeWidth={1.5}
          />
          <line
            x1={(vertices[1].x + vertices[2].x) / 2}
            y1={(vertices[1].y + vertices[2].y) / 2 - 2}
            x2={(vertices[1].x + vertices[2].x) / 2 + 5}
            y2={(vertices[1].y + vertices[2].y) / 2 + 2}
            stroke="currentColor"
            strokeWidth={1.5}
          />
        </g>

        {/* Height line */}
        {showHeight && (
          <g>
            <line
              x1={vertices[0].x}
              y1={vertices[0].y}
              x2={vertices[0].x}
              y2={vertices[3].y}
              stroke={GEOMETRY_COLORS.auxiliary.height}
              strokeWidth={adaptiveLineWeight}
              strokeDasharray="5,3"
            />
            {/* Right angle marker at bottom */}
            <path
              d={`M ${vertices[0].x} ${vertices[3].y - 10} 
                  L ${vertices[0].x + 10} ${vertices[3].y - 10} 
                  L ${vertices[0].x + 10} ${vertices[3].y}`}
              fill="none"
              stroke={GEOMETRY_COLORS.auxiliary.height}
              strokeWidth={1.5}
            />
            {/* Height label */}
            <text
              x={vertices[0].x - 20}
              y={(vertices[0].y + vertices[3].y) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fill: GEOMETRY_COLORS.auxiliary.height }}
              className="text-sm font-medium"
            >
              {heightLabel} = {h}
            </text>
          </g>
        )}

        {/* Side labels */}
        {/* Base (top) */}
        <text
          x={(vertices[0].x + vertices[1].x) / 2}
          y={vertices[0].y - 10}
          textAnchor="middle"
          style={{ fill: subjectColors.primary }}
          className="text-sm font-medium"
        >
          {baseLabel} = {base}
        </text>

        {/* Side (left) */}
        <text
          x={(vertices[0].x + vertices[3].x) / 2 - 20}
          y={(vertices[0].y + vertices[3].y) / 2 - 15}
          textAnchor="middle"
          transform={`rotate(-${90 - angle}, ${(vertices[0].x + vertices[3].x) / 2 - 20}, ${(vertices[0].y + vertices[3].y) / 2 - 15})`}
          style={{ fill: subjectColors.primary }}
          className="text-sm font-medium"
        >
          {sideLabel} = {side}
        </text>

        {/* Angle indicator at bottom-left */}
        <path
          d={`M ${vertices[3].x + 25} ${vertices[3].y} 
              A 25 25 0 0 0 ${vertices[3].x + 25 * Math.cos(angleRad)} ${vertices[3].y - 25 * Math.sin(angleRad)}`}
          fill="none"
          stroke={GEOMETRY_COLORS.label.angle}
          strokeWidth={1.5}
        />
        <text
          x={vertices[3].x + 35}
          y={vertices[3].y - 10}
          className="fill-gray-600 dark:fill-gray-400 text-xs"
        >
          {angle}°
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
          <g transform={`translate(0, ${startY + scaledHeight + 40})`}>
            <text x={10} y={0} className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
              {language === 'he' ? 'נוסחאות:' : 'Formulas:'}
            </text>
            <text x={10} y={18} className="fill-current text-xs">
              {language === 'he' ? 'שטח' : 'Area'}: A = b × h = {base} × {h} = {calculations.area}
            </text>
            <text x={10} y={36} className="fill-current text-xs">
              {language === 'he' ? 'היקף' : 'Perimeter'}: P = 2(a + b) = 2({side} + {base}) = {calculations.perimeter}
            </text>
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
          </div>
        </div>
      )}
    </div>
  )
}

export default Parallelogram
