'use client'

import { useMemo } from 'react'
import type { RhombusData, RhombusCalculations, SolutionStep } from '@/types/geometry'
import { GEOMETRY_COLORS } from '@/types/geometry'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

interface RhombusProps {
  data: RhombusData
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
 * Rhombus - SVG component for displaying rhombi (diamonds)
 * Shows area, perimeter, and diagonal-based calculations
 */
export function Rhombus({
  data,
  width = 350,
  height = 350,
  className = '',
  currentStep = 0,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: RhombusProps) {
  const {
    side,
    diagonal1: d1,
    diagonal2: d2,
    sideLabel = 'a',
    d1Label = 'd₁',
    d2Label = 'd₂',
    showDiagonals = true,
    title,
    showFormulas = true,
    showCalculations = true,
  } = data

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])

  // Calculate all measurements
  const calculations: RhombusCalculations = useMemo(() => {
    // Area = (d1 × d2) / 2
    const area = (d1 * d2) / 2
    
    // Perimeter = 4 × side
    // If side not given, calculate from diagonals: side = √((d1/2)² + (d2/2)²)
    const calculatedSide = side > 0 ? side : Math.sqrt((d1 / 2) ** 2 + (d2 / 2) ** 2)
    const perimeter = 4 * calculatedSide

    // Angles (using diagonals)
    // Acute angle = 2 × arctan(d2 / d1)
    const acuteAngle = 2 * Math.atan(d2 / d1) * (180 / Math.PI)
    const obtuseAngle = 180 - acuteAngle

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת שטח מעוין (לפי אלכסונים)' : 'Area formula for a rhombus (using diagonals)',
        formula: 'A = \\frac{d_1 \\times d_2}{2}',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = \\frac{${d1} \\times ${d2}}{2}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `A = \\frac{${d1 * d2}}{2} = ${area}`,
      },
    ]

    const perimeterSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת היקף מעוין' : 'Perimeter formula for a rhombus',
        formula: 'P = 4a',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `P = 4 \\times ${calculatedSide.toFixed(2)}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `P = ${perimeter.toFixed(2)}`,
      },
    ]

    const sideSteps: SolutionStep[] = side > 0 ? [] : [
      {
        stepNumber: 1,
        description: language === 'he' ? 'חישוב צלע מאלכסונים (משפט פיתגורס)' : 'Calculate side from diagonals (Pythagorean theorem)',
        formula: 'a = \\sqrt{(\\frac{d_1}{2})^2 + (\\frac{d_2}{2})^2}',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `a = \\sqrt{(\\frac{${d1}}{2})^2 + (\\frac{${d2}}{2})^2}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `a = \\sqrt{${(d1 / 2) ** 2} + ${(d2 / 2) ** 2}} = ${calculatedSide.toFixed(2)}`,
      },
    ]

    return {
      area,
      perimeter,
      side: calculatedSide,
      angles: { acute: acuteAngle, obtuse: obtuseAngle },
      steps: { area: areaSteps, perimeter: perimeterSteps, side: sideSteps },
    }
  }, [d1, d2, side, language])

  // SVG dimensions and scaling
  const padding = 50
  const plotWidth = width - padding * 2
  const plotHeight = height - 140

  // Scale to fit
  const scaleX = plotWidth / d1
  const scaleY = plotHeight / d2
  const scale = Math.min(scaleX, scaleY, 25) * 0.8

  const scaledD1 = d1 * scale
  const scaledD2 = d2 * scale

  const cx = width / 2
  const cy = padding + 30 + scaledD2 / 2

  // Vertices (diamond shape: top, right, bottom, left)
  const vertices = [
    { x: cx, y: cy - scaledD2 / 2, label: 'A' }, // Top
    { x: cx + scaledD1 / 2, y: cy, label: 'B' }, // Right
    { x: cx, y: cy + scaledD2 / 2, label: 'C' }, // Bottom
    { x: cx - scaledD1 / 2, y: cy, label: 'D' }, // Left
  ]

  const rhombusPath = `M ${vertices[0].x} ${vertices[0].y}
                       L ${vertices[1].x} ${vertices[1].y}
                       L ${vertices[2].x} ${vertices[2].y}
                       L ${vertices[3].x} ${vertices[3].y} Z`

  return (
    <div className={`geometry-rhombus ${className}`}>
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

        {/* Rhombus fill */}
        <path
          d={rhombusPath}
          fill={subjectColors.primary}
          fillOpacity={0.1}
          stroke="none"
        />

        {/* Rhombus outline */}
        <path
          d={rhombusPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={adaptiveLineWeight}
        />

        {/* Equal side marks */}
        {[
          [vertices[0], vertices[1]],
          [vertices[1], vertices[2]],
          [vertices[2], vertices[3]],
          [vertices[3], vertices[0]],
        ].map(([v1, v2], i) => {
          const mx = (v1.x + v2.x) / 2
          const my = (v1.y + v2.y) / 2
          const dx = v2.x - v1.x
          const dy = v2.y - v1.y
          const len = Math.hypot(dx, dy)
          const perpX = (-dy / len) * 8
          const perpY = (dx / len) * 8
          return (
            <line
              key={`mark-${i}`}
              x1={mx - perpX * 0.3}
              y1={my - perpY * 0.3}
              x2={mx + perpX * 0.3}
              y2={my + perpY * 0.3}
              stroke="currentColor"
              strokeWidth={adaptiveLineWeight}
            />
          )
        })}

        {/* Diagonals */}
        {showDiagonals && (
          <g>
            {/* Horizontal diagonal (d1) */}
            <line
              x1={vertices[3].x}
              y1={vertices[3].y}
              x2={vertices[1].x}
              y2={vertices[1].y}
              stroke={GEOMETRY_COLORS.auxiliary.diagonal}
              strokeWidth={adaptiveLineWeight}
              strokeDasharray="5,3"
            />
            {/* Vertical diagonal (d2) */}
            <line
              x1={vertices[0].x}
              y1={vertices[0].y}
              x2={vertices[2].x}
              y2={vertices[2].y}
              stroke={GEOMETRY_COLORS.highlight.secondary}
              strokeWidth={adaptiveLineWeight}
              strokeDasharray="5,3"
            />
            {/* Right angle marker at center */}
            <path
              d={`M ${cx + 8} ${cy} L ${cx + 8} ${cy - 8} L ${cx} ${cy - 8}`}
              fill="none"
              stroke={GEOMETRY_COLORS.label.angle}
              strokeWidth={1.5}
            />
            {/* Center point */}
            <circle cx={cx} cy={cy} r={adaptiveLineWeight} fill="currentColor" />

            {/* Diagonal labels */}
            <text
              x={cx + scaledD1 / 4 + 10}
              y={cy - 8}
              className="fill-purple-600 dark:fill-purple-400 text-xs font-medium"
            >
              {d1Label} = {d1}
            </text>
            <text
              x={cx + 10}
              y={cy - scaledD2 / 4}
              className="fill-green-600 dark:fill-green-400 text-xs font-medium"
            >
              {d2Label} = {d2}
            </text>
          </g>
        )}

        {/* Side label */}
        <text
          x={(vertices[0].x + vertices[1].x) / 2 + 15}
          y={(vertices[0].y + vertices[1].y) / 2 - 5}
          className="fill-blue-600 dark:fill-blue-400 text-sm font-medium"
        >
          {sideLabel} = {calculations.side.toFixed(2)}
        </text>

        {/* Angle indicators */}
        {/* Acute angle at left */}
        <text
          x={vertices[3].x + 20}
          y={vertices[3].y}
          dominantBaseline="middle"
          className="fill-gray-600 dark:fill-gray-400 text-xs"
        >
          {calculations.angles.acute.toFixed(1)}°
        </text>
        {/* Obtuse angle at top */}
        <text
          x={vertices[0].x + 5}
          y={vertices[0].y + 20}
          className="fill-gray-600 dark:fill-gray-400 text-xs"
        >
          {calculations.angles.obtuse.toFixed(1)}°
        </text>

        {/* Vertex labels */}
        {vertices.map((v, i) => (
          <g key={`vertex-${i}`}>
            <circle cx={v.x} cy={v.y} r={adaptiveLineWeight} fill="currentColor" />
            <text
              x={v.x + (i === 1 ? 12 : i === 3 ? -12 : 0)}
              y={v.y + (i === 0 ? -10 : i === 2 ? 15 : 0)}
              textAnchor="middle"
              dominantBaseline={i === 1 || i === 3 ? 'middle' : 'auto'}
              className="fill-current text-sm font-bold"
            >
              {v.label}
            </text>
          </g>
        ))}

        {/* Formulas section */}
        {showFormulas && (
          <g transform={`translate(0, ${cy + scaledD2 / 2 + 25})`}>
            <text x={10} y={0} className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
              {language === 'he' ? 'נוסחאות:' : 'Formulas:'}
            </text>
            <text x={10} y={18} className="fill-current text-xs">
              {language === 'he' ? 'שטח' : 'Area'}: A = (d₁×d₂)/2 = ({d1}×{d2})/2 = {calculations.area}
            </text>
            <text x={10} y={36} className="fill-current text-xs">
              {language === 'he' ? 'היקף' : 'Perimeter'}: P = 4a = 4×{calculations.side.toFixed(2)} = {calculations.perimeter.toFixed(2)}
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
            {/* Side calculation (if computed) */}
            {calculations.steps?.side && calculations.steps.side.length > 0 && (
              <div className="border-l-2 border-purple-500 pl-3">
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  {language === 'he' ? 'חישוב צלע:' : 'Side calculation:'}
                </p>
                {calculations.steps.side.slice(0, currentStep + 1).map((step) => (
                  <p key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400">
                    {step.formula || step.substitution || step.result}
                  </p>
                ))}
              </div>
            )}

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
          </div>
        </div>
      )}
    </div>
  )
}

export default Rhombus
