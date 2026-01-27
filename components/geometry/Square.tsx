'use client'

import { useMemo } from 'react'
import type { SquareData, SquareCalculations, SolutionStep } from '@/types/geometry'
import { GEOMETRY_COLORS } from '@/types/geometry'

interface SquareProps {
  data: SquareData
  width?: number
  height?: number
  className?: string
  currentStep?: number
  showStepByStep?: boolean
  language?: 'en' | 'he'
}

/**
 * Square - SVG component for displaying squares with calculations
 * Shows area, perimeter, and diagonal formulas with step-by-step solutions
 */
export function Square({
  data,
  width = 300,
  height = 350,
  className = '',
  currentStep = 0,
  showStepByStep = false,
  language = 'en',
}: SquareProps) {
  const {
    side,
    sideLabel = 'a',
    showDiagonals = false,
    diagonalLabel = 'd',
    title,
    showFormulas = true,
    showCalculations = true,
    highlightSide,
  } = data

  // Calculate all measurements
  const calculations: SquareCalculations = useMemo(() => {
    const area = side * side
    const perimeter = 4 * side
    const diagonal = side * Math.sqrt(2)

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת שטח ריבוע' : 'Area formula for a square',
        formula: 'A = a^2',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = ${side}^2`,
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
        description: language === 'he' ? 'נוסחת היקף ריבוע' : 'Perimeter formula for a square',
        formula: 'P = 4a',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `P = 4 \\times ${side}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `P = ${perimeter}`,
      },
    ]

    const diagonalSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת אלכסון ריבוע' : 'Diagonal formula for a square',
        formula: 'd = a\\sqrt{2}',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `d = ${side} \\times \\sqrt{2}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `d \\approx ${diagonal.toFixed(2)}`,
      },
    ]

    return {
      area,
      perimeter,
      diagonal,
      steps: { area: areaSteps, perimeter: perimeterSteps, diagonal: diagonalSteps },
    }
  }, [side, language])

  // SVG dimensions
  const padding = 50
  const squareSize = Math.min(width, height - 100) - padding * 2
  const startX = (width - squareSize) / 2
  const startY = padding + 20

  // Vertices (clockwise from top-left)
  const vertices = [
    { x: startX, y: startY, label: 'A' },
    { x: startX + squareSize, y: startY, label: 'B' },
    { x: startX + squareSize, y: startY + squareSize, label: 'C' },
    { x: startX, y: startY + squareSize, label: 'D' },
  ]

  const squarePath = `M ${vertices[0].x} ${vertices[0].y} 
                      L ${vertices[1].x} ${vertices[1].y} 
                      L ${vertices[2].x} ${vertices[2].y} 
                      L ${vertices[3].x} ${vertices[3].y} Z`

  // Right angle markers
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
    <div className={`geometry-square ${className}`}>
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

        {/* Square fill */}
        <path
          d={squarePath}
          fill={GEOMETRY_COLORS.shape.fill}
          fillOpacity={GEOMETRY_COLORS.shape.fillOpacity}
          stroke="none"
        />

        {/* Square outline */}
        <path
          d={squarePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        />

        {/* Highlighted sides */}
        {highlightSide !== undefined && (
          <line
            x1={vertices[highlightSide].x}
            y1={vertices[highlightSide].y}
            x2={vertices[(highlightSide + 1) % 4].x}
            y2={vertices[(highlightSide + 1) % 4].y}
            stroke={GEOMETRY_COLORS.highlight.primary}
            strokeWidth={3}
          />
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
              className="fill-purple-600 dark:fill-purple-400 text-xs"
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
        <text
          x={(vertices[0].x + vertices[1].x) / 2}
          y={vertices[0].y - 10}
          textAnchor="middle"
          className="fill-blue-600 dark:fill-blue-400 text-sm font-medium"
        >
          {sideLabel} = {side}
        </text>
        <text
          x={vertices[1].x + 15}
          y={(vertices[1].y + vertices[2].y) / 2}
          textAnchor="start"
          dominantBaseline="middle"
          className="fill-blue-600 dark:fill-blue-400 text-sm font-medium"
        >
          {sideLabel}
        </text>

        {/* Vertex labels */}
        {vertices.map((v, i) => (
          <g key={`vertex-${i}`}>
            <circle cx={v.x} cy={v.y} r={3} fill="currentColor" />
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
          <g transform={`translate(0, ${startY + squareSize + 25})`}>
            <text x={10} y={0} className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
              {language === 'he' ? 'נוסחאות:' : 'Formulas:'}
            </text>
            <text x={10} y={18} className="fill-current text-xs">
              {language === 'he' ? 'שטח' : 'Area'}: A = a² = {side}² = {calculations.area}
            </text>
            <text x={10} y={36} className="fill-current text-xs">
              {language === 'he' ? 'היקף' : 'Perimeter'}: P = 4a = 4×{side} = {calculations.perimeter}
            </text>
            {showDiagonals && (
              <text x={10} y={54} className="fill-current text-xs">
                {language === 'he' ? 'אלכסון' : 'Diagonal'}: d = a√2 ≈ {calculations.diagonal.toFixed(2)}
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
          </div>
        </div>
      )}
    </div>
  )
}

export default Square
