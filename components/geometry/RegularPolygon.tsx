'use client'

import { useMemo } from 'react'
import type { RegularPolygonData, RegularPolygonCalculations, SolutionStep } from '@/types/geometry'
import { GEOMETRY_COLORS } from '@/types/geometry'

interface RegularPolygonProps {
  data: RegularPolygonData
  width?: number
  height?: number
  className?: string
  currentStep?: number
  showStepByStep?: boolean
  language?: 'en' | 'he'
}

// Polygon names in English and Hebrew
const POLYGON_NAMES: Record<number, { en: string; he: string }> = {
  3: { en: 'Equilateral Triangle', he: 'משולש שווה צלעות' },
  4: { en: 'Square', he: 'ריבוע' },
  5: { en: 'Regular Pentagon', he: 'מחומש משוכלל' },
  6: { en: 'Regular Hexagon', he: 'משושה משוכלל' },
  7: { en: 'Regular Heptagon', he: 'משבע משוכלל' },
  8: { en: 'Regular Octagon', he: 'מתומן משוכלל' },
  9: { en: 'Regular Nonagon', he: 'מתשיעון משוכלל' },
  10: { en: 'Regular Decagon', he: 'מעשרון משוכלל' },
  12: { en: 'Regular Dodecagon', he: 'מתריסרון משוכלל' },
}

/**
 * RegularPolygon - SVG component for displaying regular polygons
 * Supports: pentagon, hexagon, heptagon, octagon, etc.
 * Shows area, perimeter, angles, and apothem calculations
 */
export function RegularPolygon({
  data,
  width = 350,
  height = 400,
  className = '',
  currentStep = 0,
  showStepByStep = false,
  language = 'en',
}: RegularPolygonProps) {
  const {
    sides: n,
    sideLength: s,
    sideLabel = 's',
    apothem: providedApothem,
    apothemLabel = 'a',
    showApothem = true,
    showCentralAngle = false,
    showInteriorAngle = true,
    title,
    showFormulas = true,
    showCalculations = true,
  } = data

  // Get polygon name
  const getPolygonName = (numSides: number): string => {
    const names = POLYGON_NAMES[numSides]
    if (names) return names[language]
    return language === 'he' ? `מצולע משוכלל בעל ${numSides} צלעות` : `Regular ${numSides}-gon`
  }

  // Calculate all measurements
  const calculations: RegularPolygonCalculations = useMemo(() => {
    // Central angle = 360° / n
    const centralAngle = 360 / n

    // Interior angle = (n - 2) × 180° / n
    const interiorAngle = ((n - 2) * 180) / n

    // Exterior angle = 360° / n
    const exteriorAngle = 360 / n

    // Sum of interior angles = (n - 2) × 180°
    const sumInteriorAngles = (n - 2) * 180

    // Apothem = s / (2 × tan(π/n))
    const apothem = providedApothem || s / (2 * Math.tan(Math.PI / n))

    // Perimeter = n × s
    const perimeter = n * s

    // Area = (1/2) × perimeter × apothem = (1/2) × n × s × a
    const area = (n * s * apothem) / 2

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת שטח מצולע משוכלל' : 'Area formula for a regular polygon',
        formula: 'A = \\frac{1}{2} \\times P \\times a = \\frac{1}{2} \\times n \\times s \\times a',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'חישוב אפותם (מרחק מהמרכז לאמצע צלע)' : 'Calculate apothem (distance from center to midpoint of side)',
        formula: `a = \\frac{s}{2 \\times \\tan(\\frac{\\pi}{n})} = \\frac{${s}}{2 \\times \\tan(\\frac{\\pi}{${n}})} \\approx ${apothem.toFixed(3)}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = \\frac{1}{2} \\times ${n} \\times ${s} \\times ${apothem.toFixed(3)}`,
      },
      {
        stepNumber: 4,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `A \\approx ${area.toFixed(2)}`,
      },
    ]

    const perimeterSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת היקף מצולע משוכלל' : 'Perimeter formula for a regular polygon',
        formula: 'P = n \\times s',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `P = ${n} \\times ${s}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `P = ${perimeter}`,
      },
    ]

    const anglesSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת זווית פנימית' : 'Interior angle formula',
        formula: '\\theta = \\frac{(n-2) \\times 180°}{n}',
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `\\theta = \\frac{(${n}-2) \\times 180°}{${n}}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `\\theta = \\frac{${n - 2} \\times 180°}{${n}} = ${interiorAngle.toFixed(2)}°`,
      },
    ]

    return {
      area,
      perimeter,
      apothem,
      centralAngle,
      interiorAngle,
      exteriorAngle,
      sumInteriorAngles,
      steps: { area: areaSteps, perimeter: perimeterSteps, angles: anglesSteps },
    }
  }, [n, s, providedApothem, language])

  // SVG dimensions
  const padding = 50
  const plotSize = Math.min(width, height - 130) - padding * 2

  // Calculate circumradius (distance from center to vertex)
  // R = s / (2 × sin(π/n))
  const circumradius = s / (2 * Math.sin(Math.PI / n))
  const scale = (plotSize / 2) / circumradius * 0.85

  const scaledCircumradius = circumradius * scale
  const _scaledApothem = calculations.apothem * scale
  const cx = width / 2
  const cy = padding + 30 + plotSize / 2

  // Generate vertices (starting from top, going clockwise)
  const vertices = useMemo(() => {
    const verts = []
    for (let i = 0; i < n; i++) {
      // Start at top (-90°) and go clockwise
      const angle = (-Math.PI / 2) + (2 * Math.PI * i) / n
      verts.push({
        x: cx + scaledCircumradius * Math.cos(angle),
        y: cy + scaledCircumradius * Math.sin(angle),
        label: String.fromCharCode(65 + i), // A, B, C, ...
      })
    }
    return verts
  }, [n, scaledCircumradius, cx, cy])

  // Generate polygon path
  const polygonPath = vertices
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`)
    .join(' ') + ' Z'

  // Get midpoint of first side (for apothem visualization)
  const midX = (vertices[0].x + vertices[1].x) / 2
  const midY = (vertices[0].y + vertices[1].y) / 2

  return (
    <div className={`geometry-regular-polygon ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
      >
        {/* Title */}
        <text
          x={width / 2}
          y={20}
          textAnchor="middle"
          className="fill-current text-sm font-medium"
        >
          {title || getPolygonName(n)}
        </text>

        {/* Polygon fill */}
        <path
          d={polygonPath}
          fill={GEOMETRY_COLORS.shape.fill}
          fillOpacity={GEOMETRY_COLORS.shape.fillOpacity}
          stroke="none"
        />

        {/* Polygon outline */}
        <path
          d={polygonPath}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        />

        {/* Center point */}
        <circle cx={cx} cy={cy} r={3} fill="currentColor" />
        <text x={cx + 10} y={cy + 5} className="fill-current text-xs">O</text>

        {/* Apothem line (from center to midpoint of first side) */}
        {showApothem && (
          <g>
            <line
              x1={cx}
              y1={cy}
              x2={midX}
              y2={midY}
              stroke={GEOMETRY_COLORS.auxiliary.apothem}
              strokeWidth={2}
              strokeDasharray="5,3"
            />
            {/* Right angle marker at midpoint */}
            <path
              d={`M ${midX - 8} ${midY} L ${midX - 8} ${midY + 8} L ${midX} ${midY + 8}`}
              fill="none"
              stroke={GEOMETRY_COLORS.auxiliary.apothem}
              strokeWidth={1}
              transform={`rotate(${-360/n/2 - 90}, ${midX}, ${midY})`}
            />
            {/* Apothem label */}
            <text
              x={(cx + midX) / 2 - 15}
              y={(cy + midY) / 2}
              className="fill-amber-600 dark:fill-amber-400 text-xs font-medium"
            >
              {apothemLabel} ≈ {calculations.apothem.toFixed(2)}
            </text>
          </g>
        )}

        {/* Central angle */}
        {showCentralAngle && (
          <g>
            {/* Lines from center to first two vertices */}
            <line
              x1={cx}
              y1={cy}
              x2={vertices[0].x}
              y2={vertices[0].y}
              stroke={GEOMETRY_COLORS.label.angle}
              strokeWidth={1}
              strokeDasharray="3,2"
            />
            <line
              x1={cx}
              y1={cy}
              x2={vertices[1].x}
              y2={vertices[1].y}
              stroke={GEOMETRY_COLORS.label.angle}
              strokeWidth={1}
              strokeDasharray="3,2"
            />
            {/* Arc for central angle */}
            <path
              d={`M ${cx + 20 * Math.cos(-Math.PI/2)} ${cy + 20 * Math.sin(-Math.PI/2)} 
                  A 20 20 0 0 1 ${cx + 20 * Math.cos(-Math.PI/2 + 2*Math.PI/n)} ${cy + 20 * Math.sin(-Math.PI/2 + 2*Math.PI/n)}`}
              fill="none"
              stroke={GEOMETRY_COLORS.label.angle}
              strokeWidth={1.5}
            />
            <text
              x={cx + 30}
              y={cy - 15}
              className="fill-gray-600 dark:fill-gray-400 text-xs"
            >
              {calculations.centralAngle.toFixed(1)}°
            </text>
          </g>
        )}

        {/* Interior angle arc at first vertex */}
        {showInteriorAngle && (
          <g>
            {/* Calculate angle directions for the arc */}
            {(() => {
              const v = vertices[0]
              const prev = vertices[n - 1]
              const next = vertices[1]
              const angle1 = Math.atan2(prev.y - v.y, prev.x - v.x)
              const angle2 = Math.atan2(next.y - v.y, next.x - v.x)
              const radius = 15
              
              return (
                <>
                  <path
                    d={`M ${v.x + radius * Math.cos(angle1)} ${v.y + radius * Math.sin(angle1)} 
                        A ${radius} ${radius} 0 0 1 ${v.x + radius * Math.cos(angle2)} ${v.y + radius * Math.sin(angle2)}`}
                    fill="none"
                    stroke={GEOMETRY_COLORS.highlight.secondary}
                    strokeWidth={2}
                  />
                  <text
                    x={v.x + 25 * Math.cos((angle1 + angle2) / 2)}
                    y={v.y + 25 * Math.sin((angle1 + angle2) / 2)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-green-600 dark:fill-green-400 text-xs font-medium"
                  >
                    {calculations.interiorAngle.toFixed(1)}°
                  </text>
                </>
              )
            })()}
          </g>
        )}

        {/* Side label on first side */}
        <text
          x={(vertices[0].x + vertices[1].x) / 2}
          y={(vertices[0].y + vertices[1].y) / 2 - 12}
          textAnchor="middle"
          className="fill-blue-600 dark:fill-blue-400 text-sm font-medium"
        >
          {sideLabel} = {s}
        </text>

        {/* Equal side marks on all sides */}
        {vertices.map((v, i) => {
          const nextV = vertices[(i + 1) % n]
          const mx = (v.x + nextV.x) / 2
          const my = (v.y + nextV.y) / 2
          const dx = nextV.x - v.x
          const dy = nextV.y - v.y
          const len = Math.hypot(dx, dy)
          const perpX = (-dy / len) * 6
          const perpY = (dx / len) * 6
          
          return (
            <line
              key={`mark-${i}`}
              x1={mx - perpX}
              y1={my - perpY}
              x2={mx + perpX}
              y2={my + perpY}
              stroke="currentColor"
              strokeWidth={1.5}
            />
          )
        })}

        {/* Vertex labels (only first few to avoid clutter) */}
        {vertices.slice(0, Math.min(6, n)).map((v, i) => {
          const dx = v.x - cx
          const dy = v.y - cy
          const dist = Math.hypot(dx, dy)
          const labelDist = 15

          return (
            <g key={`vertex-${i}`}>
              <circle cx={v.x} cy={v.y} r={3} fill="currentColor" />
              <text
                x={v.x + (dx / dist) * labelDist}
                y={v.y + (dy / dist) * labelDist}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-current text-xs font-bold"
              >
                {v.label}
              </text>
            </g>
          )
        })}

        {/* Formulas section */}
        {showFormulas && (
          <g transform={`translate(0, ${cy + scaledCircumradius + 20})`}>
            <text x={10} y={0} className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
              {language === 'he' ? 'נוסחאות:' : 'Formulas:'} (n={n})
            </text>
            <text x={10} y={18} className="fill-current text-xs">
              {language === 'he' ? 'שטח' : 'Area'}: A = ½×n×s×a ≈ {calculations.area.toFixed(2)}
            </text>
            <text x={10} y={36} className="fill-current text-xs">
              {language === 'he' ? 'היקף' : 'Perimeter'}: P = n×s = {n}×{s} = {calculations.perimeter}
            </text>
            <text x={10} y={54} className="fill-current text-xs">
              {language === 'he' ? 'זווית פנימית' : 'Interior ∠'}: θ = (n-2)×180°/n = {calculations.interiorAngle.toFixed(1)}°
            </text>
          </g>
        )}
      </svg>

      {/* Step-by-step solution */}
      {showStepByStep && showCalculations && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-48 overflow-y-auto">
          <h4 className="text-sm font-medium mb-2">
            {language === 'he' ? 'פתרון מפורט:' : 'Step-by-Step Solution:'}
          </h4>
          <div className="space-y-3">
            {/* Perimeter calculation */}
            <div className="border-l-2 border-blue-500 pl-3">
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {language === 'he' ? 'היקף:' : 'Perimeter:'}
              </p>
              {calculations.steps?.perimeter.slice(0, currentStep + 1).map((step) => (
                <p key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400">
                  {step.formula || step.substitution || step.result}
                </p>
              ))}
            </div>

            {/* Interior angle calculation */}
            <div className="border-l-2 border-green-500 pl-3">
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                {language === 'he' ? 'זווית פנימית:' : 'Interior Angle:'}
              </p>
              {calculations.steps?.angles?.slice(0, currentStep + 1).map((step) => (
                <p key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400">
                  {step.formula || step.substitution || step.result}
                </p>
              ))}
            </div>

            {/* Area calculation */}
            <div className="border-l-2 border-amber-500 pl-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {language === 'he' ? 'שטח:' : 'Area:'}
              </p>
              {calculations.steps?.area.slice(0, currentStep + 1).map((step) => (
                <p key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegularPolygon
