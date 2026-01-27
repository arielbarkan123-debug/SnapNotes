'use client'

import { useMemo } from 'react'
import type { CircleGeometryData, CircleCalculations, SolutionStep } from '@/types/geometry'
import { GEOMETRY_COLORS } from '@/types/geometry'

interface CircleGeometryProps {
  data: CircleGeometryData
  width?: number
  height?: number
  className?: string
  currentStep?: number
  showStepByStep?: boolean
  language?: 'en' | 'he'
}

/**
 * CircleGeometry - SVG component for displaying circles with all features
 * Supports: area, circumference, sectors, arcs, chords with step-by-step solutions
 */
export function CircleGeometry({
  data,
  width = 350,
  height = 400,
  className = '',
  currentStep = 0,
  showStepByStep = false,
  language = 'en',
}: CircleGeometryProps) {
  const {
    radius,
    radiusLabel = 'r',
    center: _center = { x: 0, y: 0 },
    showRadius = true,
    showDiameter = false,
    diameterLabel = 'd',
    sector,
    arc,
    chord,
    title,
    showFormulas = true,
    showCalculations = true,
  } = data

  // Calculate all measurements
  const calculations: CircleCalculations = useMemo(() => {
    const diameter = 2 * radius
    const circumference = 2 * Math.PI * radius
    const area = Math.PI * radius * radius

    let sectorArea: number | undefined
    let arcLength: number | undefined
    let chordLength: number | undefined

    // Sector calculations
    if (sector) {
      const angleDiff = Math.abs(sector.endAngle - sector.startAngle)
      const angleRad = (angleDiff * Math.PI) / 180
      sectorArea = 0.5 * radius * radius * angleRad
      arcLength = radius * angleRad
    }

    // Arc calculations (if no sector but arc is defined)
    if (arc && !sector) {
      const angleDiff = Math.abs(arc.endAngle - arc.startAngle)
      const angleRad = (angleDiff * Math.PI) / 180
      arcLength = radius * angleRad
    }

    // Chord calculations
    if (chord) {
      const angleDiff = Math.abs(chord.endAngle - chord.startAngle)
      const angleRad = (angleDiff * Math.PI) / 180
      chordLength = 2 * radius * Math.sin(angleRad / 2)
    }

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת שטח מעגל' : 'Area formula for a circle',
        formula: 'A = \\pi r^2',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = \\pi \\times ${radius}^2`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `A = \\pi \\times ${radius * radius} \\approx ${area.toFixed(2)}`,
      },
    ]

    const circumferenceSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת היקף מעגל' : 'Circumference formula',
        formula: 'C = 2\\pi r',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `C = 2 \\times \\pi \\times ${radius}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `C \\approx ${circumference.toFixed(2)}`,
      },
    ]

    const sectorSteps: SolutionStep[] | undefined = sector
      ? [
          {
            stepNumber: 1,
            description: language === 'he' ? 'נוסחת שטח גזרה' : 'Sector area formula',
            formula: 'A_{sector} = \\frac{\\theta}{360} \\times \\pi r^2',
          },
          {
            stepNumber: 2,
            description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
            substitution: `A_{sector} = \\frac{${Math.abs(sector.endAngle - sector.startAngle)}}{360} \\times \\pi \\times ${radius}^2`,
          },
          {
            stepNumber: 3,
            description: language === 'he' ? 'חישוב' : 'Calculate',
            result: `A_{sector} \\approx ${sectorArea?.toFixed(2)}`,
          },
        ]
      : undefined

    const arcSteps: SolutionStep[] | undefined = arc || sector
      ? [
          {
            stepNumber: 1,
            description: language === 'he' ? 'נוסחת אורך קשת' : 'Arc length formula',
            formula: 'L = \\frac{\\theta}{360} \\times 2\\pi r',
          },
          {
            stepNumber: 2,
            description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
            substitution: `L = \\frac{${Math.abs((arc || sector)!.endAngle - (arc || sector)!.startAngle)}}{360} \\times 2\\pi \\times ${radius}`,
          },
          {
            stepNumber: 3,
            description: language === 'he' ? 'חישוב' : 'Calculate',
            result: `L \\approx ${arcLength?.toFixed(2)}`,
          },
        ]
      : undefined

    return {
      area,
      circumference,
      diameter,
      sectorArea,
      arcLength,
      chordLength,
      steps: {
        area: areaSteps,
        circumference: circumferenceSteps,
        sector: sectorSteps,
        arc: arcSteps,
      },
    }
  }, [radius, sector, arc, chord, language])

  // SVG dimensions
  const padding = 60
  const diagramSize = Math.min(width, height - 120) - padding * 2
  const scaledRadius = diagramSize / 2.5 // Leave room for labels
  const cx = width / 2
  const cy = padding + 30 + scaledRadius

  // Point on circle from angle (degrees)
  const pointOnCircle = (angleDeg: number, r: number = scaledRadius) => ({
    x: cx + r * Math.cos((angleDeg * Math.PI) / 180),
    y: cy - r * Math.sin((angleDeg * Math.PI) / 180),
  })

  // Arc path
  const arcPath = (startDeg: number, endDeg: number, r: number = scaledRadius) => {
    const start = pointOnCircle(startDeg, r)
    const end = pointOnCircle(endDeg, r)
    const angleDiff = endDeg - startDeg
    const largeArc = Math.abs(angleDiff) > 180 ? 1 : 0
    const sweep = angleDiff > 0 ? 0 : 1
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`
  }

  // Sector path (pie slice)
  const sectorPath = (startDeg: number, endDeg: number) => {
    const start = pointOnCircle(startDeg)
    const end = pointOnCircle(endDeg)
    const angleDiff = endDeg - startDeg
    const largeArc = Math.abs(angleDiff) > 180 ? 1 : 0
    const sweep = angleDiff > 0 ? 0 : 1
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${scaledRadius} ${scaledRadius} 0 ${largeArc} ${sweep} ${end.x} ${end.y} Z`
  }

  return (
    <div className={`geometry-circle ${className}`}>
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

        {/* Main circle fill */}
        <circle
          cx={cx}
          cy={cy}
          r={scaledRadius}
          fill={GEOMETRY_COLORS.shape.fill}
          fillOpacity={GEOMETRY_COLORS.shape.fillOpacity}
          stroke="none"
        />

        {/* Sector (if defined) */}
        {sector && (
          <path
            d={sectorPath(sector.startAngle, sector.endAngle)}
            fill={GEOMETRY_COLORS.highlight.tertiary}
            fillOpacity={0.3}
            stroke={GEOMETRY_COLORS.highlight.tertiary}
            strokeWidth={2}
          />
        )}

        {/* Main circle outline */}
        <circle
          cx={cx}
          cy={cy}
          r={scaledRadius}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        />

        {/* Center point */}
        <circle cx={cx} cy={cy} r={4} fill="currentColor" />
        <text
          x={cx - 15}
          y={cy + 18}
          className="fill-current text-sm font-medium"
        >
          O
        </text>

        {/* Radius line */}
        {showRadius && (
          <g>
            <line
              x1={cx}
              y1={cy}
              x2={cx + scaledRadius}
              y2={cy}
              stroke={GEOMETRY_COLORS.highlight.primary}
              strokeWidth={2}
            />
            <text
              x={cx + scaledRadius / 2}
              y={cy - 8}
              textAnchor="middle"
              className="fill-red-600 dark:fill-red-400 text-sm font-medium"
            >
              {radiusLabel} = {radius}
            </text>
            {/* Endpoint */}
            <circle cx={cx + scaledRadius} cy={cy} r={4} fill={GEOMETRY_COLORS.highlight.primary} />
          </g>
        )}

        {/* Diameter line */}
        {showDiameter && (
          <g>
            <line
              x1={cx - scaledRadius}
              y1={cy}
              x2={cx + scaledRadius}
              y2={cy}
              stroke={GEOMETRY_COLORS.highlight.secondary}
              strokeWidth={2}
            />
            <text
              x={cx}
              y={cy + 20}
              textAnchor="middle"
              className="fill-green-600 dark:fill-green-400 text-sm font-medium"
            >
              {diameterLabel} = {calculations.diameter}
            </text>
          </g>
        )}

        {/* Arc highlight */}
        {arc && !sector && (
          <g>
            <path
              d={arcPath(arc.startAngle, arc.endAngle)}
              fill="none"
              stroke={GEOMETRY_COLORS.highlight.tertiary}
              strokeWidth={4}
            />
            {/* Arc endpoints */}
            <circle {...pointOnCircle(arc.startAngle)} r={4} fill={GEOMETRY_COLORS.highlight.tertiary} />
            <circle {...pointOnCircle(arc.endAngle)} r={4} fill={GEOMETRY_COLORS.highlight.tertiary} />
            {arc.label && (
              <text
                {...pointOnCircle((arc.startAngle + arc.endAngle) / 2, scaledRadius + 15)}
                textAnchor="middle"
                className="fill-amber-600 dark:fill-amber-400 text-xs"
              >
                {arc.label}
              </text>
            )}
          </g>
        )}

        {/* Sector radii and arc */}
        {sector && (
          <g>
            {/* Radii to sector endpoints */}
            <line
              x1={cx}
              y1={cy}
              x2={pointOnCircle(sector.startAngle).x}
              y2={pointOnCircle(sector.startAngle).y}
              stroke={GEOMETRY_COLORS.highlight.tertiary}
              strokeWidth={2}
            />
            <line
              x1={cx}
              y1={cy}
              x2={pointOnCircle(sector.endAngle).x}
              y2={pointOnCircle(sector.endAngle).y}
              stroke={GEOMETRY_COLORS.highlight.tertiary}
              strokeWidth={2}
            />
            {/* Central angle arc */}
            <path
              d={arcPath(sector.startAngle, sector.endAngle, 25)}
              fill="none"
              stroke={GEOMETRY_COLORS.highlight.tertiary}
              strokeWidth={1.5}
            />
            {/* Angle label */}
            {sector.label && (
              <text
                {...pointOnCircle((sector.startAngle + sector.endAngle) / 2, 40)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-amber-600 dark:fill-amber-400 text-xs font-medium"
              >
                {sector.label}
              </text>
            )}
            {/* Arc label on circumference */}
            {sector.showArc && (
              <text
                {...pointOnCircle((sector.startAngle + sector.endAngle) / 2, scaledRadius + 15)}
                textAnchor="middle"
                className="fill-amber-600 dark:fill-amber-400 text-xs"
              >
                arc
              </text>
            )}
          </g>
        )}

        {/* Chord */}
        {chord && (
          <g>
            <line
              x1={pointOnCircle(chord.startAngle).x}
              y1={pointOnCircle(chord.startAngle).y}
              x2={pointOnCircle(chord.endAngle).x}
              y2={pointOnCircle(chord.endAngle).y}
              stroke={GEOMETRY_COLORS.auxiliary.diagonal}
              strokeWidth={2}
            />
            {/* Chord endpoints */}
            <circle {...pointOnCircle(chord.startAngle)} r={4} fill={GEOMETRY_COLORS.auxiliary.diagonal} />
            <circle {...pointOnCircle(chord.endAngle)} r={4} fill={GEOMETRY_COLORS.auxiliary.diagonal} />
            {/* Chord label */}
            {chord.label && (
              <text
                x={(pointOnCircle(chord.startAngle).x + pointOnCircle(chord.endAngle).x) / 2}
                y={(pointOnCircle(chord.startAngle).y + pointOnCircle(chord.endAngle).y) / 2 - 10}
                textAnchor="middle"
                className="fill-purple-600 dark:fill-purple-400 text-xs"
              >
                {chord.label} ≈ {calculations.chordLength?.toFixed(2)}
              </text>
            )}
          </g>
        )}

        {/* Formulas section */}
        {showFormulas && (
          <g transform={`translate(0, ${cy + scaledRadius + 25})`}>
            <text x={10} y={0} className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
              {language === 'he' ? 'נוסחאות:' : 'Formulas:'}
            </text>
            <text x={10} y={18} className="fill-current text-xs">
              {language === 'he' ? 'שטח' : 'Area'}: A = πr² = π×{radius}² ≈ {calculations.area.toFixed(2)}
            </text>
            <text x={10} y={36} className="fill-current text-xs">
              {language === 'he' ? 'היקף' : 'Circumference'}: C = 2πr = 2π×{radius} ≈ {calculations.circumference.toFixed(2)}
            </text>
            {sector && calculations.sectorArea && (
              <text x={10} y={54} className="fill-current text-xs">
                {language === 'he' ? 'שטח גזרה' : 'Sector Area'}: ≈ {calculations.sectorArea.toFixed(2)}
              </text>
            )}
            {calculations.arcLength && (
              <text x={10} y={sector ? 72 : 54} className="fill-current text-xs">
                {language === 'he' ? 'אורך קשת' : 'Arc Length'}: ≈ {calculations.arcLength.toFixed(2)}
              </text>
            )}
          </g>
        )}
      </svg>

      {/* Step-by-step solution */}
      {showStepByStep && showCalculations && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-60 overflow-y-auto">
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
                <div key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">{step.stepNumber}. </span>
                  {step.formula && <span className="font-mono">{step.formula}</span>}
                  {step.substitution && <span className="font-mono"> → {step.substitution}</span>}
                  {step.result && <span className="font-mono text-green-600"> = {step.result}</span>}
                </div>
              ))}
            </div>

            {/* Circumference calculation */}
            <div className="border-l-2 border-green-500 pl-3">
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                {language === 'he' ? 'היקף:' : 'Circumference:'}
              </p>
              {calculations.steps?.circumference.slice(0, currentStep + 1).map((step) => (
                <div key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">{step.stepNumber}. </span>
                  {step.formula && <span className="font-mono">{step.formula}</span>}
                  {step.substitution && <span className="font-mono"> → {step.substitution}</span>}
                  {step.result && <span className="font-mono text-green-600"> = {step.result}</span>}
                </div>
              ))}
            </div>

            {/* Sector area calculation */}
            {sector && calculations.steps?.sector && (
              <div className="border-l-2 border-amber-500 pl-3">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {language === 'he' ? 'שטח גזרה:' : 'Sector Area:'}
                </p>
                {calculations.steps.sector.slice(0, currentStep + 1).map((step) => (
                  <div key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    <span className="font-medium">{step.stepNumber}. </span>
                    {step.formula && <span className="font-mono">{step.formula}</span>}
                    {step.substitution && <span className="font-mono"> → {step.substitution}</span>}
                    {step.result && <span className="font-mono text-green-600"> = {step.result}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CircleGeometry
