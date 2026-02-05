'use client'

import { useMemo } from 'react'
import type { TrapezoidData, TrapezoidCalculations, SolutionStep } from '@/types/geometry'
import { GEOMETRY_COLORS } from '@/types/geometry'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

interface TrapezoidProps {
  data: TrapezoidData
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
 * Trapezoid - SVG component for displaying trapezoids
 * Shows area, perimeter, and median (midsegment) calculations
 */
export function Trapezoid({
  data,
  width = 350,
  height = 350,
  className = '',
  currentStep = 0,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: TrapezoidProps) {
  const {
    topBase: a,
    bottomBase: b,
    height: h,
    leftSide,
    rightSide,
    topLabel = 'a',
    bottomLabel = 'b',
    heightLabel = 'h',
    leftLabel = 'c',
    rightLabel = 'd',
    showHeight = true,
    isIsosceles = false,
    title,
    showFormulas = true,
    showCalculations = true,
  } = data

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])

  // Calculate all measurements
  const calculations: TrapezoidCalculations = useMemo(() => {
    // Area = ((a + b) / 2) × h
    const area = ((a + b) / 2) * h

    // Calculate sides if not provided
    let left = leftSide
    let right = rightSide

    if (!left || !right) {
      const offset = (b - a) / 2
      if (isIsosceles) {
        // Both sides equal for isosceles trapezoid
        const sideLen = Math.sqrt(h * h + offset * offset)
        left = left || sideLen
        right = right || sideLen
      } else {
        // Assume right-angled on left (common case)
        left = left || h
        right = right || Math.sqrt(h * h + (b - a) * (b - a))
      }
    }

    const perimeter = a + b + left + right

    // Median (midsegment) = (a + b) / 2
    const median = (a + b) / 2

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת שטח טרפז' : 'Area formula for a trapezoid',
        formula: 'A = \\frac{(a + b)}{2} \\times h',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = \\frac{(${a} + ${b})}{2} \\times ${h}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `A = \\frac{${a + b}}{2} \\times ${h} = ${median} \\times ${h} = ${area}`,
      },
    ]

    const perimeterSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת היקף טרפז' : 'Perimeter formula for a trapezoid',
        formula: 'P = a + b + c + d',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `P = ${a} + ${b} + ${left.toFixed(2)} + ${right.toFixed(2)}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `P = ${perimeter.toFixed(2)}`,
      },
    ]

    const medianSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת קו אמצעים (מדיאנה)' : 'Midsegment (median) formula',
        formula: 'm = \\frac{a + b}{2}',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `m = \\frac{${a} + ${b}}{2}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `m = ${median}`,
      },
    ]

    return {
      area,
      perimeter,
      medianLength: median,
      leftSide: left,
      rightSide: right,
      steps: { area: areaSteps, perimeter: perimeterSteps, median: medianSteps },
    }
  }, [a, b, h, leftSide, rightSide, isIsosceles, language])

  // SVG dimensions and scaling
  const padding = 50
  const plotWidth = width - padding * 2
  const plotHeight = height - 150

  // Scale to fit
  const scaleX = plotWidth / b // Bottom base is the longest
  const scaleY = plotHeight / h
  const scale = Math.min(scaleX, scaleY, 25) * 0.85

  const scaledTop = a * scale
  const scaledBottom = b * scale
  const scaledHeight = h * scale

  const cx = width / 2
  const startY = padding + 30

  // Calculate horizontal offset for top base (centered above bottom)
  const topOffset = (scaledBottom - scaledTop) / 2
  const leftOffset = isIsosceles ? topOffset : 0

  // Vertices (clockwise from top-left)
  const vertices = [
    { x: cx - scaledBottom / 2 + leftOffset, y: startY, label: 'A' }, // Top-left
    { x: cx - scaledBottom / 2 + leftOffset + scaledTop, y: startY, label: 'B' }, // Top-right
    { x: cx + scaledBottom / 2, y: startY + scaledHeight, label: 'C' }, // Bottom-right
    { x: cx - scaledBottom / 2, y: startY + scaledHeight, label: 'D' }, // Bottom-left
  ]

  const trapezoidPath = `M ${vertices[0].x} ${vertices[0].y}
                         L ${vertices[1].x} ${vertices[1].y}
                         L ${vertices[2].x} ${vertices[2].y}
                         L ${vertices[3].x} ${vertices[3].y} Z`

  // Median line position (halfway down the height)
  const medianY = startY + scaledHeight / 2
  const medianLeftX = (vertices[0].x + vertices[3].x) / 2
  const medianRightX = (vertices[1].x + vertices[2].x) / 2

  return (
    <div className={`geometry-trapezoid ${className}`}>
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

        {/* Trapezoid fill */}
        <path
          d={trapezoidPath}
          fill={subjectColors.primary}
          fillOpacity={0.1}
          stroke="none"
        />

        {/* Trapezoid outline */}
        <path
          d={trapezoidPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={adaptiveLineWeight}
        />

        {/* Parallel marks on top and bottom bases */}
        <g>
          {/* Top base mark */}
          <line
            x1={(vertices[0].x + vertices[1].x) / 2 - 5}
            y1={vertices[0].y - 5}
            x2={(vertices[0].x + vertices[1].x) / 2 + 5}
            y2={vertices[0].y - 5}
            stroke="currentColor"
            strokeWidth={1.5}
          />
          {/* Bottom base mark */}
          <line
            x1={(vertices[3].x + vertices[2].x) / 2 - 5}
            y1={vertices[3].y + 5}
            x2={(vertices[3].x + vertices[2].x) / 2 + 5}
            y2={vertices[3].y + 5}
            stroke="currentColor"
            strokeWidth={1.5}
          />
        </g>

        {/* Equal side marks for isosceles trapezoid */}
        {isIsosceles && (
          <>
            {/* Left side mark */}
            <line
              x1={(vertices[0].x + vertices[3].x) / 2 - 8}
              y1={(vertices[0].y + vertices[3].y) / 2}
              x2={(vertices[0].x + vertices[3].x) / 2 - 4}
              y2={(vertices[0].y + vertices[3].y) / 2 + 5}
              stroke="currentColor"
              strokeWidth={adaptiveLineWeight}
            />
            {/* Right side mark */}
            <line
              x1={(vertices[1].x + vertices[2].x) / 2 + 4}
              y1={(vertices[1].y + vertices[2].y) / 2}
              x2={(vertices[1].x + vertices[2].x) / 2 + 8}
              y2={(vertices[1].y + vertices[2].y) / 2 + 5}
              stroke="currentColor"
              strokeWidth={adaptiveLineWeight}
            />
          </>
        )}

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

        {/* Median (midsegment) line */}
        <g>
          <line
            x1={medianLeftX}
            y1={medianY}
            x2={medianRightX}
            y2={medianY}
            stroke={GEOMETRY_COLORS.highlight.tertiary}
            strokeWidth={adaptiveLineWeight}
            strokeDasharray="8,4"
          />
          {/* Median label */}
          <text
            x={(medianLeftX + medianRightX) / 2}
            y={medianY - 8}
            textAnchor="middle"
            style={{ fill: GEOMETRY_COLORS.highlight.tertiary }}
            className="text-xs"
          >
            m = {calculations.medianLength}
          </text>
        </g>

        {/* Side labels */}
        {/* Top base */}
        <text
          x={(vertices[0].x + vertices[1].x) / 2}
          y={vertices[0].y - 12}
          textAnchor="middle"
          style={{ fill: subjectColors.primary }}
          className="text-sm font-medium"
        >
          {topLabel} = {a}
        </text>

        {/* Bottom base */}
        <text
          x={(vertices[3].x + vertices[2].x) / 2}
          y={vertices[3].y + 18}
          textAnchor="middle"
          style={{ fill: subjectColors.primary }}
          className="text-sm font-medium"
        >
          {bottomLabel} = {b}
        </text>

        {/* Left side */}
        <text
          x={(vertices[0].x + vertices[3].x) / 2 - 18}
          y={(vertices[0].y + vertices[3].y) / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fill: subjectColors.primary }}
          className="text-xs"
        >
          {leftLabel}
        </text>

        {/* Right side */}
        <text
          x={(vertices[1].x + vertices[2].x) / 2 + 18}
          y={(vertices[1].y + vertices[2].y) / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fill: subjectColors.primary }}
          className="text-xs"
        >
          {rightLabel}
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
          <g transform={`translate(0, ${startY + scaledHeight + 35})`}>
            <text x={10} y={0} className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
              {language === 'he' ? 'נוסחאות:' : 'Formulas:'}
            </text>
            <text x={10} y={18} className="fill-current text-xs">
              {language === 'he' ? 'שטח' : 'Area'}: A = ((a+b)/2)×h = (({a}+{b})/2)×{h} = {calculations.area}
            </text>
            <text x={10} y={36} className="fill-current text-xs">
              {language === 'he' ? 'היקף' : 'Perimeter'}: P ≈ {calculations.perimeter.toFixed(2)}
            </text>
            <text x={10} y={54} className="fill-current text-xs">
              {language === 'he' ? 'קו אמצעים' : 'Midsegment'}: m = (a+b)/2 = {calculations.medianLength}
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

            {/* Median calculation */}
            <div className="border-l-2 border-amber-500 pl-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {language === 'he' ? 'קו אמצעים:' : 'Midsegment:'}
              </p>
              {calculations.steps?.median?.slice(0, currentStep + 1).map((step) => (
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

export default Trapezoid
