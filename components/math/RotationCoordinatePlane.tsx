'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RotationCoordinatePlaneData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
  lineDrawVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RotationCoordinatePlaneProps {
  data: RotationCoordinatePlaneData
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  currentStep?: number
  totalSteps?: number
  showStepCounter?: boolean
  animationDuration?: number
  onStepComplete?: () => void
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  grid: { en: 'Draw coordinate grid', he: 'ציור מערכת צירים' },
  original: { en: 'Draw original shape', he: 'ציור הצורה המקורית' },
  arc: { en: 'Show rotation arc', he: 'הצגת קשת הסיבוב' },
  rotated: { en: 'Draw rotated shape', he: 'ציור הצורה המסובבת' },
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = px - cx
  const dy = py - cy
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }
}

function vertexLabel(index: number): string {
  return String.fromCharCode(65 + index) // A, B, C, ...
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RotationCoordinatePlane({
  data,
  className = '',
  width = 450,
  height = 450,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: RotationCoordinatePlaneProps) {
  const {
    originalVertices,
    centerOfRotation,
    angleDegrees,
    showCenter = true,
    showArc = true,
    showPrime = true,
    title,
  } = data

  // Compute rotated vertices
  const rotatedVertices = useMemo(
    () =>
      originalVertices.map((v) =>
        rotatePoint(v.x, v.y, centerOfRotation.x, centerOfRotation.y, angleDegrees)
      ),
    [originalVertices, centerOfRotation, angleDegrees]
  )

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
      { id: 'original', label: STEP_LABELS.original.en, labelHe: STEP_LABELS.original.he },
    ]
    if (showArc) {
      defs.push({ id: 'arc', label: STEP_LABELS.arc.en, labelHe: STEP_LABELS.arc.he })
    }
    defs.push({ id: 'rotated', label: STEP_LABELS.rotated.en, labelHe: STEP_LABELS.rotated.he })
    return defs
  }, [showArc])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  const primaryColor = diagram.colors.primary
  const accentColor = diagram.colors.accent

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Layout: coordinate plane mapping
  const padding = { left: 40, right: 40, top: 40, bottom: 40 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Determine range from data
  const allPoints = [...originalVertices, ...rotatedVertices, centerOfRotation]
  const allX = allPoints.map((p) => p.x)
  const allY = allPoints.map((p) => p.y)
  const dataMinX = Math.min(...allX)
  const dataMaxX = Math.max(...allX)
  const dataMinY = Math.min(...allY)
  const dataMaxY = Math.max(...allY)
  const rangeBuffer = 1.5
  const rangeX = Math.max(Math.abs(dataMinX), Math.abs(dataMaxX), 3) + rangeBuffer
  const rangeY = Math.max(Math.abs(dataMinY), Math.abs(dataMaxY), 3) + rangeBuffer

  const scaleX = (v: number) => padding.left + ((v + rangeX) / (2 * rangeX)) * plotWidth
  const scaleY = (v: number) => padding.top + ((rangeY - v) / (2 * rangeY)) * plotHeight

  // Grid lines
  const gridMin = -Math.floor(rangeX)
  const gridMax = Math.floor(rangeX)
  const gridMinY = -Math.floor(rangeY)
  const gridMaxY = Math.floor(rangeY)

  // Build polygon path strings
  const originalPath =
    originalVertices.map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(v.x)},${scaleY(v.y)}`).join(' ') + ' Z'
  const rotatedPath =
    rotatedVertices.map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(v.x)},${scaleY(v.y)}`).join(' ') + ' Z'

  // Rotation arc SVG path (from first vertex)
  const arcPath = useMemo(() => {
    if (originalVertices.length === 0) return ''
    const v0 = originalVertices[0]
    const cx = centerOfRotation.x
    const cy = centerOfRotation.y
    const r = Math.sqrt((v0.x - cx) ** 2 + (v0.y - cy) ** 2)
    const rSvg = (r / (2 * rangeX)) * plotWidth
    const startAngleRad = Math.atan2(v0.y - cy, v0.x - cx)
    const endAngleRad = startAngleRad + (angleDegrees * Math.PI) / 180
    const sx = scaleX(cx + r * Math.cos(startAngleRad))
    const sy = scaleY(cy + r * Math.sin(startAngleRad))
    const ex = scaleX(cx + r * Math.cos(endAngleRad))
    const ey = scaleY(cy + r * Math.sin(endAngleRad))
    const largeArc = Math.abs(angleDegrees) > 180 ? 1 : 0
    // SVG y-axis is inverted, so sweep direction flips
    const sweep = angleDegrees > 0 ? 0 : 1
    return `M ${sx} ${sy} A ${rSvg} ${rSvg} 0 ${largeArc} ${sweep} ${ex} ${ey}`
  }, [originalVertices, centerOfRotation, angleDegrees, rangeX, plotWidth, scaleX, scaleY])

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="rotation-coordinate-plane"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="rcp-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg data-testid="rcp-svg" viewBox={viewBox} width="100%" className="overflow-visible">
        {/* Step 0: Coordinate grid */}
        <AnimatePresence>
          {isVisible('grid') && (
            <motion.g
              data-testid="rcp-grid"
              initial="hidden"
              animate={isCurrent('grid') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Grid lines */}
              {Array.from({ length: gridMax - gridMin + 1 }, (_, i) => {
                const v = gridMin + i
                return (
                  <motion.line
                    key={`gx-${v}`}
                    x1={scaleX(v)}
                    y1={padding.top}
                    x2={scaleX(v)}
                    y2={height - padding.bottom}
                    stroke={v === 0 ? '#6b7280' : '#e5e7eb'}
                    strokeWidth={v === 0 ? diagram.lineWeight : 0.5}
                    className="dark:stroke-gray-700"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                )
              })}
              {Array.from({ length: gridMaxY - gridMinY + 1 }, (_, i) => {
                const v = gridMinY + i
                return (
                  <motion.line
                    key={`gy-${v}`}
                    x1={padding.left}
                    y1={scaleY(v)}
                    x2={width - padding.right}
                    y2={scaleY(v)}
                    stroke={v === 0 ? '#6b7280' : '#e5e7eb'}
                    strokeWidth={v === 0 ? diagram.lineWeight : 0.5}
                    className="dark:stroke-gray-700"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                )
              })}

              {/* Axis arrows */}
              <motion.polygon
                points={`${scaleX(0)},${padding.top - 6} ${scaleX(0) - 4},${padding.top + 2} ${scaleX(0) + 4},${padding.top + 2}`}
                fill="#6b7280"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              />
              <motion.polygon
                points={`${width - padding.right + 6},${scaleY(0)} ${width - padding.right - 2},${scaleY(0) - 4} ${width - padding.right - 2},${scaleY(0) + 4}`}
                fill="#6b7280"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              />

              {/* Axis labels */}
              {Array.from({ length: gridMax - gridMin + 1 }, (_, i) => {
                const v = gridMin + i
                if (v === 0) return null
                return (
                  <motion.text
                    key={`lx-${v}`}
                    x={scaleX(v)}
                    y={scaleY(0) + 16}
                    textAnchor="middle"
                    className="fill-gray-500 dark:fill-gray-400"
                    fontSize={10}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {v}
                  </motion.text>
                )
              })}
              {Array.from({ length: gridMaxY - gridMinY + 1 }, (_, i) => {
                const v = gridMinY + i
                if (v === 0) return null
                return (
                  <motion.text
                    key={`ly-${v}`}
                    x={scaleX(0) - 12}
                    y={scaleY(v) + 4}
                    textAnchor="middle"
                    className="fill-gray-500 dark:fill-gray-400"
                    fontSize={10}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {v}
                  </motion.text>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Original shape */}
        <AnimatePresence>
          {isVisible('original') && (
            <motion.g
              data-testid="rcp-original"
              initial="hidden"
              animate={isCurrent('original') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={originalPath}
                fill={`${primaryColor}30`}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {originalVertices.map((v, i) => (
                <motion.g key={`ov-${i}`}>
                  <circle
                    cx={scaleX(v.x)}
                    cy={scaleY(v.y)}
                    r={4}
                    fill={primaryColor}
                    stroke="white"
                    strokeWidth={1}
                  />
                  <motion.text
                    x={scaleX(v.x) - 10}
                    y={scaleY(v.y) - 8}
                    textAnchor="middle"
                    fill={primaryColor}
                    fontSize={12}
                    fontWeight={600}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {vertexLabel(i)}
                  </motion.text>
                </motion.g>
              ))}
              {/* Center of rotation */}
              {showCenter && (
                <motion.g>
                  <circle
                    cx={scaleX(centerOfRotation.x)}
                    cy={scaleY(centerOfRotation.y)}
                    r={5}
                    fill="#ef4444"
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  <motion.text
                    x={scaleX(centerOfRotation.x) + 10}
                    y={scaleY(centerOfRotation.y) - 8}
                    fill="#ef4444"
                    fontSize={11}
                    fontWeight={600}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {language === 'he' ? 'מרכז' : 'Center'}
                  </motion.text>
                </motion.g>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Rotation arc */}
        <AnimatePresence>
          {showArc && isVisible('arc') && arcPath && (
            <motion.g
              data-testid="rcp-arc"
              initial="hidden"
              animate={isCurrent('arc') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={arcPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="6 4"
                markerEnd="url(#rotation-arrowhead)"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Arrowhead marker */}
              <defs>
                <marker
                  id="rotation-arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
                </marker>
              </defs>
              {/* Angle label */}
              <motion.text
                x={scaleX(centerOfRotation.x) + 20}
                y={scaleY(centerOfRotation.y) + 20}
                fill="#f59e0b"
                fontSize={12}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {angleDegrees}&deg;
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Rotated shape */}
        <AnimatePresence>
          {isVisible('rotated') && (
            <motion.g
              data-testid="rcp-rotated"
              initial="hidden"
              animate={isCurrent('rotated') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={rotatedPath}
                fill={`${accentColor}30`}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {rotatedVertices.map((v, i) => (
                <motion.g key={`rv-${i}`}>
                  <circle
                    cx={scaleX(v.x)}
                    cy={scaleY(v.y)}
                    r={4}
                    fill={accentColor}
                    stroke="white"
                    strokeWidth={1}
                  />
                  {showPrime && (
                    <motion.text
                      x={scaleX(v.x) + 10}
                      y={scaleY(v.y) - 8}
                      textAnchor="middle"
                      fill={accentColor}
                      fontSize={12}
                      fontWeight={600}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {vertexLabel(i)}&prime;
                    </motion.text>
                  )}
                </motion.g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {stepDefs.length > 1 && (
        <DiagramStepControls
          currentStep={diagram.currentStep}
          totalSteps={diagram.totalSteps}
          onNext={diagram.next}
          onPrev={diagram.prev}
          stepLabel={stepLabel}
          language={language}
          subjectColor={primaryColor}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default RotationCoordinatePlane
