'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RotationCoordinatePlaneData, Point2D } from '@/types/geometry'
import { GEOMETRY_COLORS } from '@/types/geometry'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  grid: { en: 'Draw coordinate grid', he: 'ציור מערכת צירים' },
  original: { en: 'Draw original shape', he: 'ציור הצורה המקורית' },
  center: { en: 'Mark center of rotation', he: 'סימון מרכז הסיבוב' },
  arc: { en: 'Show rotation arc', he: 'הצגת קשת הסיבוב' },
  rotated: { en: 'Draw rotated shape', he: 'ציור הצורה המסובבת' },
}

interface RotationCoordinatePlaneProps {
  data: RotationCoordinatePlaneData
  width?: number
  height?: number
  className?: string
  initialStep?: number
  showStepByStep?: boolean
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * Rotate a point around a center by angleDegrees
 */
function rotatePoint(point: Point2D, center: Point2D, angleDegrees: number): Point2D {
  const rad = (angleDegrees * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
    label: point.label ? `${point.label}'` : undefined,
  }
}

/**
 * RotationCoordinatePlane - SVG component for displaying rotation transformations
 *
 * Quality standard checklist:
 * - [x] useDiagramBase hook
 * - [x] DiagramStepControls
 * - [x] pathLength draw animation
 * - [x] Spotlight on current step
 * - [x] Dark/light mode
 * - [x] Responsive width
 * - [x] data-testid attributes
 * - [x] RTL support
 * - [x] Subject-coded colors
 * - [x] Adaptive line weight
 */
export function RotationCoordinatePlane({
  data,
  width = 400,
  height = 400,
  className = '',
  initialStep,
  showStepByStep: _showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
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

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
      { id: 'original', label: STEP_LABELS.original.en, labelHe: STEP_LABELS.original.he },
      { id: 'center', label: STEP_LABELS.center.en, labelHe: STEP_LABELS.center.he },
      { id: 'arc', label: STEP_LABELS.arc.en, labelHe: STEP_LABELS.arc.he },
      { id: 'rotated', label: STEP_LABELS.rotated.en, labelHe: STEP_LABELS.rotated.he },
    ]
    return defs
  }, [])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
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

  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  // Compute rotated vertices
  const rotatedVertices = useMemo(
    () => originalVertices.map((v) => rotatePoint(v, centerOfRotation, angleDegrees)),
    [originalVertices, centerOfRotation, angleDegrees]
  )

  // Grid setup
  const padding = 40
  const allPoints = [...originalVertices, ...rotatedVertices, centerOfRotation]
  const xs = allPoints.map((p) => p.x)
  const ys = allPoints.map((p) => p.y)
  const minX = Math.min(...xs) - 2
  const maxX = Math.max(...xs) + 2
  const minY = Math.min(...ys) - 2
  const maxY = Math.max(...ys) + 2
  const rangeX = maxX - minX
  const rangeY = maxY - minY
  const scaleX = (width - padding * 2) / rangeX
  const scaleY = (height - padding * 2) / rangeY
  const scale = Math.min(scaleX, scaleY)

  const toSvgX = (x: number) => padding + (x - minX) * scale
  const toSvgY = (y: number) => height - padding - (y - minY) * scale

  // Build polygon paths
  const originalPath = originalVertices.map((v, i) =>
    `${i === 0 ? 'M' : 'L'} ${toSvgX(v.x)} ${toSvgY(v.y)}`
  ).join(' ') + ' Z'

  const rotatedPath = rotatedVertices.map((v, i) =>
    `${i === 0 ? 'M' : 'L'} ${toSvgX(v.x)} ${toSvgY(v.y)}`
  ).join(' ') + ' Z'

  // Rotation arc for first vertex
  const arcData = useMemo(() => {
    if (originalVertices.length === 0) return null
    const p = originalVertices[0]
    const cx = toSvgX(centerOfRotation.x)
    const cy = toSvgY(centerOfRotation.y)
    const px = toSvgX(p.x)
    const py = toSvgY(p.y)
    const r = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
    const startAngle = Math.atan2(-(py - cy), px - cx)
    // SVG y is inverted, so negate angle
    const endAngle = startAngle - (angleDegrees * Math.PI) / 180
    const endX = cx + r * Math.cos(endAngle)
    const endY = cy - r * Math.sin(endAngle)
    const largeArc = Math.abs(angleDegrees) > 180 ? 1 : 0
    const sweep = angleDegrees > 0 ? 0 : 1
    return {
      d: `M ${px} ${py} A ${r} ${r} 0 ${largeArc} ${sweep} ${endX} ${endY}`,
      endX,
      endY,
      r,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalVertices, centerOfRotation, angleDegrees, width, height])

  // Grid lines
  const gridLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; major: boolean }> = []
    for (let x = Math.ceil(minX); x <= Math.floor(maxX); x++) {
      lines.push({ x1: toSvgX(x), y1: padding, x2: toSvgX(x), y2: height - padding, major: x === 0 })
    }
    for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
      lines.push({ x1: padding, y1: toSvgY(y), x2: width - padding, y2: toSvgY(y), major: y === 0 })
    }
    return lines
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minX, maxX, minY, maxY, width, height])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="rotation-coordinate-plane-diagram"
      className={`geometry-rotation-coordinate-plane ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Rotation of shape by ${angleDegrees} degrees${title ? `: ${title}` : ''}`}
      >
        <rect
          data-testid="rcp-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {title && (
          <text
            data-testid="rcp-title"
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Step 0: Grid */}
        <AnimatePresence>
          {isVisible('grid') && (
            <motion.g
              data-testid="rcp-grid"
              initial="hidden"
              animate={isCurrent('grid') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {gridLines.map((line, i) => (
                <motion.line
                  key={`grid-${i}`}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={line.major ? 'currentColor' : '#d1d5db'}
                  strokeWidth={line.major ? 1.5 : 0.5}
                  className={line.major ? '' : 'dark:stroke-gray-700'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: line.major ? 0.8 : 0.4 }}
                  transition={{ duration: 0.3, delay: i * 0.01 }}
                />
              ))}
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
                fill={diagram.colors.primary}
                fillOpacity={0.15}
                stroke={diagram.colors.primary}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {originalVertices.map((v, i) => (
                <motion.g key={`orig-v-${i}`}>
                  <circle
                    data-testid={`rcp-original-vertex-${i}`}
                    cx={toSvgX(v.x)}
                    cy={toSvgY(v.y)}
                    r={diagram.lineWeight + 1}
                    fill={diagram.colors.primary}
                  />
                  {v.label && (
                    <motion.text
                      x={toSvgX(v.x) + 8}
                      y={toSvgY(v.y) - 8}
                      style={{ fill: diagram.colors.primary }}
                      className="text-xs font-bold"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: i * 0.1 }}
                    >
                      {v.label}
                    </motion.text>
                  )}
                </motion.g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Center of rotation */}
        <AnimatePresence>
          {isVisible('center') && showCenter && (
            <motion.g
              data-testid="rcp-center"
              initial="hidden"
              animate={isCurrent('center') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.circle
                cx={toSvgX(centerOfRotation.x)}
                cy={toSvgY(centerOfRotation.y)}
                r={5}
                fill={GEOMETRY_COLORS.highlight.primary}
                stroke={GEOMETRY_COLORS.highlight.primary}
                strokeWidth={2}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
              <motion.text
                x={toSvgX(centerOfRotation.x) + 10}
                y={toSvgY(centerOfRotation.y) - 10}
                style={{ fill: GEOMETRY_COLORS.highlight.primary }}
                className="text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'מרכז' : 'Center'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Rotation arc */}
        <AnimatePresence>
          {isVisible('arc') && showArc && arcData && (
            <motion.g
              data-testid="rcp-arc"
              initial="hidden"
              animate={isCurrent('arc') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <defs>
                <marker
                  id="rotation-arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <path d="M 0 0 L 8 3 L 0 6 Z" fill={GEOMETRY_COLORS.highlight.tertiary} />
                </marker>
              </defs>
              <motion.path
                d={arcData.d}
                fill="none"
                stroke={GEOMETRY_COLORS.highlight.tertiary}
                strokeWidth={2}
                strokeDasharray="5,3"
                markerEnd="url(#rotation-arrowhead)"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={toSvgX(centerOfRotation.x)}
                y={toSvgY(centerOfRotation.y) - (arcData.r / 2) - 10}
                textAnchor="middle"
                style={{ fill: GEOMETRY_COLORS.highlight.tertiary }}
                className="text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.3 }}
              >
                {angleDegrees}°
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Rotated shape */}
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
                fill={GEOMETRY_COLORS.highlight.secondary}
                fillOpacity={0.15}
                stroke={GEOMETRY_COLORS.highlight.secondary}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="6,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {rotatedVertices.map((v, i) => (
                <motion.g key={`rot-v-${i}`}>
                  <circle
                    data-testid={`rcp-rotated-vertex-${i}`}
                    cx={toSvgX(v.x)}
                    cy={toSvgY(v.y)}
                    r={diagram.lineWeight + 1}
                    fill={GEOMETRY_COLORS.highlight.secondary}
                  />
                  {showPrime && originalVertices[i]?.label && (
                    <motion.text
                      x={toSvgX(v.x) + 8}
                      y={toSvgY(v.y) - 8}
                      style={{ fill: GEOMETRY_COLORS.highlight.secondary }}
                      className="text-xs font-bold"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: i * 0.1 }}
                    >
                      {originalVertices[i].label}&apos;
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default RotationCoordinatePlane
