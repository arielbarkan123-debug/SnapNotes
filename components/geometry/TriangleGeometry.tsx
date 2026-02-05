'use client'

import { useMemo } from 'react'
import type { TriangleGeometryData, TriangleCalculations, SolutionStep, TriangleType } from '@/types/geometry'
import { GEOMETRY_COLORS } from '@/types/geometry'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

interface TriangleGeometryProps {
  data: TriangleGeometryData
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
 * TriangleGeometry - SVG component for displaying all triangle types
 * Supports: equilateral, isosceles, scalene, right, right-isosceles triangles
 * Shows area, perimeter, angles with step-by-step solutions
 */
export function TriangleGeometry({
  data,
  width = 350,
  height = 400,
  className = '',
  currentStep = 0,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: TriangleGeometryProps) {
  const {
    type,
    vertices,
    sides,
    angles,
    height: heightLine,
    title,
    showFormulas = true,
    showCalculations = true,
    highlightSides = [],
    highlightAngles = [],
    showRightAngleMarker = true,
  } = data

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])

  // Get triangle type display name
  const getTypeName = (t: TriangleType): string => {
    const names = {
      en: {
        equilateral: 'Equilateral Triangle',
        isosceles: 'Isosceles Triangle',
        scalene: 'Scalene Triangle',
        right: 'Right Triangle',
        'right-isosceles': 'Right Isosceles Triangle',
        general: 'Triangle',
      },
      he: {
        equilateral: 'משולש שווה צלעות',
        isosceles: 'משולש שווה שוקיים',
        scalene: 'משולש שונה צלעות',
        right: 'משולש ישר זווית',
        'right-isosceles': 'משולש ישר זווית שווה שוקיים',
        general: 'משולש',
      },
    }
    return names[language][t]
  }

  // Calculate all measurements using Heron's formula and law of cosines
  const calculations: TriangleCalculations = useMemo(() => {
    const { a, b, c } = sides
    const s = (a + b + c) / 2 // semiperimeter
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c))
    const perimeter = a + b + c

    // Calculate angles using law of cosines
    const angleA = Math.acos((b * b + c * c - a * a) / (2 * b * c)) * (180 / Math.PI)
    const angleB = Math.acos((a * a + c * c - b * b) / (2 * a * c)) * (180 / Math.PI)
    const angleC = 180 - angleA - angleB

    // Calculate heights
    const hA = (2 * area) / a
    const hB = (2 * area) / b
    const hC = (2 * area) / c

    const areaSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'חישוב חצי היקף (s)' : 'Calculate semi-perimeter (s)',
        formula: `s = \\frac{a + b + c}{2}`,
        substitution: `s = \\frac{${a} + ${b} + ${c}}{2} = ${s}`,
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'נוסחת הרון לשטח' : "Heron's formula for area",
        formula: `A = \\sqrt{s(s-a)(s-b)(s-c)}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `A = \\sqrt{${s}(${s}-${a})(${s}-${b})(${s}-${c})}`,
      },
      {
        stepNumber: 4,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `A = \\sqrt{${(s * (s - a) * (s - b) * (s - c)).toFixed(2)}} \\approx ${area.toFixed(2)}`,
      },
    ]

    // Alternative area formula for right triangle
    if (type === 'right' || type === 'right-isosceles') {
      areaSteps.splice(0, areaSteps.length,
        {
          stepNumber: 1,
          description: language === 'he' ? 'נוסחת שטח משולש ישר זווית' : 'Area formula for right triangle',
          formula: `A = \\frac{1}{2} \\times base \\times height`,
        },
        {
          stepNumber: 2,
          description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
          substitution: `A = \\frac{1}{2} \\times ${b} \\times ${c}`,
        },
        {
          stepNumber: 3,
          description: language === 'he' ? 'חישוב' : 'Calculate',
          result: `A = ${area.toFixed(2)}`,
        }
      )
    }

    const perimeterSteps: SolutionStep[] = [
      {
        stepNumber: 1,
        description: language === 'he' ? 'נוסחת היקף משולש' : 'Perimeter formula',
        formula: `P = a + b + c`,
      },
      {
        stepNumber: 2,
        description: language === 'he' ? 'הצבת ערכים' : 'Substitute values',
        substitution: `P = ${a} + ${b} + ${c}`,
      },
      {
        stepNumber: 3,
        description: language === 'he' ? 'חישוב' : 'Calculate',
        result: `P = ${perimeter}`,
      },
    ]

    return {
      area,
      perimeter,
      semiperimeter: s,
      heights: { hA, hB, hC },
      angles: { A: angleA, B: angleB, C: angleC },
      steps: { area: areaSteps, perimeter: perimeterSteps },
    }
  }, [sides, type, language])

  // SVG dimensions and scaling
  const padding = 50
  const plotHeight = height - 150

  // Transform vertices to SVG coordinates
  const xs = vertices.map((v) => v.x)
  const ys = vertices.map((v) => v.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const dataWidth = maxX - minX || 1
  const dataHeight = maxY - minY || 1

  const plotWidth = width - padding * 2
  const scale = Math.min(plotWidth / dataWidth, plotHeight / dataHeight) * 0.8

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  const transform = (x: number, y: number) => ({
    x: width / 2 + (x - centerX) * scale,
    y: padding + 30 + plotHeight / 2 - (y - centerY) * scale,
  })

  const transformedVertices = vertices.map((v, i) => ({
    ...transform(v.x, v.y),
    label: v.label || String.fromCharCode(65 + i), // A, B, C
  }))

  const trianglePath = `M ${transformedVertices[0].x} ${transformedVertices[0].y}
                        L ${transformedVertices[1].x} ${transformedVertices[1].y}
                        L ${transformedVertices[2].x} ${transformedVertices[2].y} Z`

  // Find midpoint of a side
  const getMidpoint = (i1: number, i2: number) => ({
    x: (transformedVertices[i1].x + transformedVertices[i2].x) / 2,
    y: (transformedVertices[i1].y + transformedVertices[i2].y) / 2,
  })

  // Get perpendicular offset for label placement
  const getLabelOffset = (i1: number, i2: number, offset: number = 15) => {
    const dx = transformedVertices[i2].x - transformedVertices[i1].x
    const dy = transformedVertices[i2].y - transformedVertices[i1].y
    const len = Math.hypot(dx, dy)
    return { x: (-dy / len) * offset, y: (dx / len) * offset }
  }

  // Draw angle arc
  const drawAngle = (vertexIndex: number, radius: number = 20) => {
    const vertex = transformedVertices[vertexIndex]
    const prev = transformedVertices[(vertexIndex + 2) % 3]
    const next = transformedVertices[(vertexIndex + 1) % 3]

    const angle1 = Math.atan2(prev.y - vertex.y, prev.x - vertex.x)
    const angle2 = Math.atan2(next.y - vertex.y, next.x - vertex.x)

    const startX = vertex.x + radius * Math.cos(angle1)
    const startY = vertex.y + radius * Math.sin(angle1)
    const endX = vertex.x + radius * Math.cos(angle2)
    const endY = vertex.y + radius * Math.sin(angle2)

    let angleDiff = angle2 - angle1
    if (angleDiff < 0) angleDiff += 2 * Math.PI
    const largeArc = angleDiff > Math.PI ? 1 : 0

    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`
  }

  // Draw right angle marker
  const drawRightAngle = (vertexIndex: number, size: number = 12) => {
    const vertex = transformedVertices[vertexIndex]
    const prev = transformedVertices[(vertexIndex + 2) % 3]
    const next = transformedVertices[(vertexIndex + 1) % 3]

    const dir1 = {
      x: (prev.x - vertex.x) / Math.hypot(prev.x - vertex.x, prev.y - vertex.y),
      y: (prev.y - vertex.y) / Math.hypot(prev.x - vertex.x, prev.y - vertex.y),
    }
    const dir2 = {
      x: (next.x - vertex.x) / Math.hypot(next.x - vertex.x, next.y - vertex.y),
      y: (next.y - vertex.y) / Math.hypot(next.x - vertex.x, next.y - vertex.y),
    }

    const p1 = { x: vertex.x + dir1.x * size, y: vertex.y + dir1.y * size }
    const p2 = { x: vertex.x + (dir1.x + dir2.x) * size, y: vertex.y + (dir1.y + dir2.y) * size }
    const p3 = { x: vertex.x + dir2.x * size, y: vertex.y + dir2.y * size }

    return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
  }

  // Determine which vertex has the right angle (if any)
  const rightAngleVertex = useMemo(() => {
    if (type !== 'right' && type !== 'right-isosceles') return null
    // Find angle closest to 90 degrees
    const angleDiffs = [
      { index: 0, diff: Math.abs(calculations.angles.A - 90) },
      { index: 1, diff: Math.abs(calculations.angles.B - 90) },
      { index: 2, diff: Math.abs(calculations.angles.C - 90) },
    ]
    const closest = angleDiffs.reduce((a, b) => (a.diff < b.diff ? a : b))
    return closest.diff < 5 ? closest.index : null
  }, [type, calculations.angles])

  // Side mapping: a = BC, b = AC, c = AB
  const sideIndices = {
    a: [1, 2], // B to C
    b: [0, 2], // A to C
    c: [0, 1], // A to B
  }

  return (
    <div className={`geometry-triangle ${className}`}>
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
          {title || getTypeName(type)}
        </text>

        {/* Triangle fill */}
        <path
          d={trianglePath}
          fill={subjectColors.primary}
          fillOpacity={0.1}
          stroke="none"
        />

        {/* Triangle outline */}
        <path
          d={trianglePath}
          fill="none"
          stroke="currentColor"
          strokeWidth={adaptiveLineWeight}
        />

        {/* Highlighted sides */}
        {highlightSides.map((sideKey) => {
          const [i1, i2] = sideIndices[sideKey]
          return (
            <line
              key={`highlight-${sideKey}`}
              x1={transformedVertices[i1].x}
              y1={transformedVertices[i1].y}
              x2={transformedVertices[i2].x}
              y2={transformedVertices[i2].y}
              stroke={subjectColors.primary}
              strokeWidth={adaptiveLineWeight + 1}
            />
          )
        })}

        {/* Height line */}
        {heightLine?.showLine && (() => {
          const fromIndex = { A: 0, B: 1, C: 2 }[heightLine.from]
          const from = transformedVertices[fromIndex]
          // Calculate foot of altitude to opposite side
          const oppIndices = [[1, 2], [0, 2], [0, 1]][fromIndex]
          const p1 = transformedVertices[oppIndices[0]]
          const p2 = transformedVertices[oppIndices[1]]
          
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const t = ((from.x - p1.x) * dx + (from.y - p1.y) * dy) / (dx * dx + dy * dy)
          const foot = { x: p1.x + t * dx, y: p1.y + t * dy }

          return (
            <g>
              <line
                x1={from.x}
                y1={from.y}
                x2={foot.x}
                y2={foot.y}
                stroke={GEOMETRY_COLORS.auxiliary.height}
                strokeWidth={adaptiveLineWeight}
                strokeDasharray="5,3"
              />
              {/* Height label */}
              <text
                x={(from.x + foot.x) / 2 + 10}
                y={(from.y + foot.y) / 2}
                style={{ fill: GEOMETRY_COLORS.auxiliary.height }}
                className="text-xs"
              >
                h = {heightLine.value}
              </text>
            </g>
          )
        })()}

        {/* Angle arcs */}
        {[0, 1, 2].map((i) => {
          const isRight = rightAngleVertex === i && showRightAngleMarker
          const angleLabel = ['A', 'B', 'C'][i] as 'A' | 'B' | 'C'
          const isHighlighted = highlightAngles.includes(angleLabel)
          const _angleValue = calculations.angles[angleLabel]

          return (
            <g key={`angle-${i}`}>
              {isRight ? (
                <path
                  d={drawRightAngle(i)}
                  fill="none"
                  stroke={isHighlighted ? GEOMETRY_COLORS.highlight.primary : GEOMETRY_COLORS.label.angle}
                  strokeWidth={1.5}
                />
              ) : (
                <path
                  d={drawAngle(i)}
                  fill="none"
                  stroke={isHighlighted ? GEOMETRY_COLORS.highlight.primary : GEOMETRY_COLORS.label.angle}
                  strokeWidth={1.5}
                />
              )}
              {/* Angle value label */}
              {angles && angles[angleLabel] && (
                <text
                  x={transformedVertices[i].x + (i === 0 ? 25 : i === 1 ? -20 : 0)}
                  y={transformedVertices[i].y + (i === 2 ? -20 : 20)}
                  textAnchor="middle"
                  className="fill-gray-600 dark:fill-gray-400 text-xs"
                >
                  {angles[angleLabel]}°
                </text>
              )}
            </g>
          )
        })}

        {/* Side labels */}
        {(['a', 'b', 'c'] as const).map((sideKey) => {
          const [i1, i2] = sideIndices[sideKey]
          const mid = getMidpoint(i1, i2)
          const offset = getLabelOffset(i1, i2)
          const label = sides.labels?.[sideKey] || sideKey
          const value = sides[sideKey]

          return (
            <text
              key={`side-${sideKey}`}
              x={mid.x + offset.x}
              y={mid.y + offset.y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fill: subjectColors.primary }}
              className="text-sm font-medium"
            >
              {label} = {value}
            </text>
          )
        })}

        {/* Vertex labels */}
        {transformedVertices.map((v, i) => {
          const center = {
            x: transformedVertices.reduce((sum, vt) => sum + vt.x, 0) / 3,
            y: transformedVertices.reduce((sum, vt) => sum + vt.y, 0) / 3,
          }
          const dx = v.x - center.x
          const dy = v.y - center.y
          const dist = Math.hypot(dx, dy)
          const labelDist = 20

          return (
            <g key={`vertex-${i}`}>
              <circle cx={v.x} cy={v.y} r={adaptiveLineWeight} fill="currentColor" />
              <text
                x={v.x + (dx / dist) * labelDist}
                y={v.y + (dy / dist) * labelDist}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-current text-sm font-bold"
              >
                {v.label}
              </text>
            </g>
          )
        })}

        {/* Formulas section */}
        {showFormulas && (
          <g transform={`translate(0, ${height - 90})`}>
            <text x={10} y={0} className="fill-gray-600 dark:fill-gray-400 text-xs font-medium">
              {language === 'he' ? 'חישובים:' : 'Calculations:'}
            </text>
            <text x={10} y={18} className="fill-current text-xs">
              {language === 'he' ? 'שטח' : 'Area'}: A ≈ {calculations.area.toFixed(2)}
            </text>
            <text x={10} y={36} className="fill-current text-xs">
              {language === 'he' ? 'היקף' : 'Perimeter'}: P = {sides.a} + {sides.b} + {sides.c} = {calculations.perimeter}
            </text>
            <text x={10} y={54} className="fill-current text-xs">
              {language === 'he' ? 'זוויות' : 'Angles'}: ∠A ≈ {calculations.angles.A.toFixed(1)}°, ∠B ≈ {calculations.angles.B.toFixed(1)}°, ∠C ≈ {calculations.angles.C.toFixed(1)}°
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
                {language === 'he' ? 'שטח (נוסחת הרון):' : "Area (Heron's Formula):"}
              </p>
              {calculations.steps?.area.slice(0, currentStep + 1).map((step) => (
                <div key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">{step.stepNumber}. </span>
                  {step.description}
                  {step.formula && <span className="block ml-4 font-mono">{step.formula}</span>}
                  {step.substitution && <span className="block ml-4 font-mono">{step.substitution}</span>}
                  {step.result && <span className="block ml-4 font-mono font-medium text-green-600">{step.result}</span>}
                </div>
              ))}
            </div>

            {/* Perimeter calculation */}
            <div className="border-l-2 border-green-500 pl-3">
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                {language === 'he' ? 'היקף:' : 'Perimeter:'}
              </p>
              {calculations.steps?.perimeter.slice(0, currentStep + 1).map((step) => (
                <div key={step.stepNumber} className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">{step.stepNumber}. </span>
                  {step.formula || step.substitution || step.result}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TriangleGeometry
