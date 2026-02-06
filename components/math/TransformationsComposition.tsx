'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TransformationsCompositionData } from '@/types/math'
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

interface TransformationsCompositionProps {
  data: TransformationsCompositionData
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
  drawGrid: { en: 'Draw coordinate grid', he: '\u05e6\u05d9\u05d5\u05e8 \u05e8\u05e9\u05ea \u05e7\u05d5\u05d0\u05d5\u05e8\u05d3\u05d9\u05e0\u05d8\u05d5\u05ea' },
  drawOriginal: { en: 'Draw original shape', he: '\u05e6\u05d9\u05d5\u05e8 \u05d4\u05e6\u05d5\u05e8\u05d4 \u05d4\u05de\u05e7\u05d5\u05e8\u05d9\u05ea' },
}

const TRANSFORM_NAMES: Record<string, { en: string; he: string }> = {
  translation: { en: 'Translation', he: '\u05d4\u05d6\u05d6\u05d4' },
  rotation: { en: 'Rotation', he: '\u05e1\u05d9\u05d1\u05d5\u05d1' },
  reflection: { en: 'Reflection', he: '\u05e9\u05d9\u05e7\u05d5\u05e3' },
  dilation: { en: 'Dilation', he: '\u05d4\u05e8\u05d7\u05d1\u05d4/\u05db\u05d9\u05d5\u05d5\u05e5' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEG = Math.PI / 180
const PADDING = 40
const VERTEX_LABELS = 'ABCDEFGHIJ'.split('')

/** Apply a single geometric transformation to a set of points */
function applyTransformation(
  points: Array<{ x: number; y: number }>,
  type: string,
  params: Record<string, number | string>
): Array<{ x: number; y: number }> {
  switch (type) {
    case 'translation': {
      const dx = Number(params.dx ?? params.x ?? 0)
      const dy = Number(params.dy ?? params.y ?? 0)
      return points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
    }

    case 'rotation': {
      const angleDeg = Number(params.angle ?? params.degrees ?? 0)
      const cx = Number(params.cx ?? params.centerX ?? 0)
      const cy = Number(params.cy ?? params.centerY ?? 0)
      const rad = angleDeg * DEG
      const cosA = Math.cos(rad)
      const sinA = Math.sin(rad)
      return points.map((p) => {
        const ddx = p.x - cx
        const ddy = p.y - cy
        return {
          x: cx + ddx * cosA - ddy * sinA,
          y: cy + ddx * sinA + ddy * cosA,
        }
      })
    }

    case 'reflection': {
      const axis = String(params.axis ?? params.line ?? 'x')
      const val = Number(params.value ?? params.lineValue ?? 0)
      if (axis === 'x' || axis === 'x-axis') {
        return points.map((p) => ({ x: p.x, y: -p.y + 2 * val }))
      }
      if (axis === 'y' || axis === 'y-axis') {
        return points.map((p) => ({ x: -p.x + 2 * val, y: p.y }))
      }
      if (axis === 'y=x') {
        return points.map((p) => ({ x: p.y, y: p.x }))
      }
      if (axis === 'y=-x') {
        return points.map((p) => ({ x: -p.y, y: -p.x }))
      }
      return points.map((p) => ({ x: p.x, y: -p.y }))
    }

    case 'dilation': {
      const scale = Number(params.scale ?? params.factor ?? params.k ?? 1)
      const cx = Number(params.cx ?? params.centerX ?? 0)
      const cy = Number(params.cy ?? params.centerY ?? 0)
      return points.map((p) => ({
        x: cx + (p.x - cx) * scale,
        y: cy + (p.y - cy) * scale,
      }))
    }

    default:
      return points
  }
}

/** Generate a description of a transformation */
function transformDescription(
  type: string,
  params: Record<string, number | string>,
  lang: 'en' | 'he'
): string {
  const name = TRANSFORM_NAMES[type]?.[lang] ?? type

  switch (type) {
    case 'translation': {
      const dx = Number(params.dx ?? params.x ?? 0)
      const dy = Number(params.dy ?? params.y ?? 0)
      return name + ' (' + dx + ', ' + dy + ')'
    }
    case 'rotation': {
      const angle = Number(params.angle ?? params.degrees ?? 0)
      return name + ' ' + angle + '\u00b0'
    }
    case 'reflection': {
      const axis = String(params.axis ?? params.line ?? 'x')
      return name + ': ' + axis
    }
    case 'dilation': {
      const scale = Number(params.scale ?? params.factor ?? params.k ?? 1)
      return name + ' \u00d7' + scale
    }
    default:
      return name
  }
}

/** Get a color for a transformation step */
function getStepColor(
  stepIndex: number,
  total: number,
  _primaryColor: string,
  accentColor: string
): string {
  if (total <= 1) return accentColor
  if (stepIndex === total - 1) return accentColor
  const intermediateColors = [
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#f59e0b', // amber
    '#ec4899', // pink
    '#14b8a6', // teal
  ]
  return intermediateColors[stepIndex % intermediateColors.length]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransformationsComposition({
  data,
  className = '',
  width = 500,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: TransformationsCompositionProps) {
  const {
    originalShape,
    transformations,
    finalShape,
    showIntermediate = true,
    showOrder = true,
    title,
  } = data

  // ---------------------------------------------------------------------------
  // Compute intermediate shapes by applying transformations sequentially
  // ---------------------------------------------------------------------------

  const intermediateShapes = useMemo(() => {
    const shapes: Array<Array<{ x: number; y: number }>> = []
    let currentPoints = originalShape
    for (const t of transformations) {
      currentPoints = applyTransformation(currentPoints, t.type, t.params)
      shapes.push(currentPoints)
    }
    return shapes
  }, [originalShape, transformations])

  // Use the provided finalShape if available, otherwise the last intermediate
  const actualFinalShape = useMemo(() => {
    if (finalShape && finalShape.length > 0) return finalShape
    return intermediateShapes.length > 0
      ? intermediateShapes[intermediateShapes.length - 1]
      : originalShape
  }, [finalShape, intermediateShapes, originalShape])

  // ---------------------------------------------------------------------------
  // Build step definitions: grid, original, one per transformation
  // ---------------------------------------------------------------------------

  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawGrid', label: STEP_LABELS.drawGrid.en, labelHe: STEP_LABELS.drawGrid.he },
      { id: 'drawOriginal', label: STEP_LABELS.drawOriginal.en, labelHe: STEP_LABELS.drawOriginal.he },
    ]
    transformations.forEach((t, i) => {
      const name = TRANSFORM_NAMES[t.type] ?? { en: t.type, he: t.type }
      defs.push({
        id: 'transform_' + i,
        label: name.en + ' ' + (i + 1),
        labelHe: name.he + ' ' + (i + 1),
      })
    })
    return defs
  }, [transformations])

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

  // ---------------------------------------------------------------------------
  // Coordinate system: auto-fit all shapes
  // ---------------------------------------------------------------------------

  const allPoints = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = [...originalShape, ...actualFinalShape]
    if (showIntermediate) {
      intermediateShapes.forEach((shape) => pts.push(...shape))
    }
    return pts
  }, [originalShape, actualFinalShape, intermediateShapes, showIntermediate])

  const domainRange = useMemo(() => {
    const xs = allPoints.map((p) => p.x)
    const ys = allPoints.map((p) => p.y)
    const margin = 2
    return {
      xMin: Math.min(...xs, 0) - margin,
      xMax: Math.max(...xs, 0) + margin,
      yMin: Math.min(...ys, 0) - margin,
      yMax: Math.max(...ys, 0) + margin,
    }
  }, [allPoints])

  const plotW = width - PADDING * 2
  const plotH = height - PADDING * 2
  const { xMin, xMax, yMin, yMax } = domainRange

  const toSvgX = (x: number) => PADDING + ((x - xMin) / (xMax - xMin)) * plotW
  const toSvgY = (y: number) => PADDING + ((yMax - y) / (yMax - yMin)) * plotH

  // Grid lines
  const gridLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; isAxis: boolean }> = []
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      lines.push({
        x1: toSvgX(x), y1: PADDING,
        x2: toSvgX(x), y2: PADDING + plotH,
        isAxis: x === 0,
      })
    }
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
      lines.push({
        x1: PADDING, y1: toSvgY(y),
        x2: PADDING + plotW, y2: toSvgY(y),
        isAxis: y === 0,
      })
    }
    return lines
  }, [xMin, xMax, yMin, yMax, plotW, plotH])

  // Polygon points strings
  const originalPoints = originalShape.map((p) => toSvgX(p.x) + ',' + toSvgY(p.y)).join(' ')

  const intermediatePointStrings = useMemo(
    () => intermediateShapes.map((shape) =>
      shape.map((p) => toSvgX(p.x) + ',' + toSvgY(p.y)).join(' ')
    ),
    [intermediateShapes]
  )

  // Arrow: from centroid of one shape to centroid of next
  const shapeArrows = useMemo(() => {
    const arrows: Array<{
      x1: number; y1: number; x2: number; y2: number; label: string
    }> = []

    const shapes = [originalShape, ...intermediateShapes]
    for (let i = 0; i < transformations.length; i++) {
      const fromShape = shapes[i]
      const toShape = shapes[i + 1]
      if (!fromShape || !toShape) continue

      const fromCx = fromShape.reduce((s, p) => s + p.x, 0) / fromShape.length
      const fromCy = fromShape.reduce((s, p) => s + p.y, 0) / fromShape.length
      const toCx = toShape.reduce((s, p) => s + p.x, 0) / toShape.length
      const toCy = toShape.reduce((s, p) => s + p.y, 0) / toShape.length

      const dx = toCx - fromCx
      const dy = toCy - fromCy
      const len = Math.sqrt(dx * dx + dy * dy)
      const shortenFactor = len > 30 ? 15 / len : 0

      arrows.push({
        x1: toSvgX(fromCx + dx * shortenFactor),
        y1: toSvgY(fromCy + dy * shortenFactor),
        x2: toSvgX(toCx - dx * shortenFactor),
        y2: toSvgY(toCy - dy * shortenFactor),
        label: transformDescription(transformations[i].type, transformations[i].params, language),
      })
    }
    return arrows
  }, [originalShape, intermediateShapes, transformations, language])

  const viewBox = '0 0 ' + width + ' ' + height

  return (
    <div
      data-testid="transformations-composition"
      className={'bg-white dark:bg-gray-900 rounded-lg p-2 ' + className}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="tc-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-2"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="tc-svg"
        viewBox={viewBox}
        width="100%"
        role="img"
        aria-label="Transformations composition diagram"
        className="overflow-visible"
      >
        {/* Background */}
        <rect
          x={0} y={0} width={width} height={height}
          fill="white" className="dark:fill-gray-900"
        />

        {/* Arrow marker */}
        <defs>
          <marker
            id="tc-arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#9ca3af" />
          </marker>
        </defs>

        {/* Step 0: Draw grid */}
        <AnimatePresence>
          {isVisible('drawGrid') && (
            <motion.g
              data-testid="tc-grid"
              initial="hidden"
              animate={isCurrent('drawGrid') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Grid lines */}
              {gridLines.map((gl, i) => (
                <line
                  key={'gl-' + i}
                  x1={gl.x1} y1={gl.y1} x2={gl.x2} y2={gl.y2}
                  stroke={gl.isAxis ? '#374151' : '#e5e7eb'}
                  className={gl.isAxis ? 'dark:stroke-gray-400' : 'dark:stroke-gray-700'}
                  strokeWidth={gl.isAxis ? diagram.lineWeight : 0.5}
                />
              ))}
              {/* Axis labels */}
              <text
                x={PADDING + plotW - 5}
                y={toSvgY(0) - 8}
                textAnchor="end"
                fontSize={12}
                className="fill-gray-700 dark:fill-gray-300"
                fontWeight={600}
              >
                x
              </text>
              <text
                x={toSvgX(0) + 10}
                y={PADDING + 12}
                textAnchor="start"
                fontSize={12}
                className="fill-gray-700 dark:fill-gray-300"
                fontWeight={600}
              >
                y
              </text>
              {/* Tick labels on axes */}
              {(() => {
                const ticks: JSX.Element[] = []
                for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
                  if (x === 0) continue
                  ticks.push(
                    <text
                      key={'xtick-' + x}
                      x={toSvgX(x)}
                      y={toSvgY(0) + 14}
                      textAnchor="middle"
                      fontSize={9}
                      className="fill-gray-500 dark:fill-gray-400"
                    >
                      {x}
                    </text>
                  )
                }
                for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
                  if (y === 0) continue
                  ticks.push(
                    <text
                      key={'ytick-' + y}
                      x={toSvgX(0) - 8}
                      y={toSvgY(y) + 4}
                      textAnchor="end"
                      fontSize={9}
                      className="fill-gray-500 dark:fill-gray-400"
                    >
                      {y}
                    </text>
                  )
                }
                return ticks
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Draw original shape */}
        <AnimatePresence>
          {isVisible('drawOriginal') && (
            <motion.g
              data-testid="tc-original"
              initial="hidden"
              animate={isCurrent('drawOriginal') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.polygon
                points={originalPoints}
                fill={primaryColor + '30'}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Vertices */}
              {originalShape.map((p, i) => (
                <motion.circle
                  key={'ov-' + i}
                  cx={toSvgX(p.x)}
                  cy={toSvgY(p.y)}
                  r={4}
                  fill={primaryColor}
                  stroke="white"
                  strokeWidth={1.5}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                />
              ))}
              {/* Vertex labels */}
              {originalShape.map((p, i) => (
                <motion.text
                  key={'ol-' + i}
                  x={toSvgX(p.x)}
                  y={toSvgY(p.y) - 10}
                  textAnchor="middle"
                  fill={primaryColor}
                  fontSize={11}
                  fontWeight={700}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {VERTEX_LABELS[i] ?? ('P' + i)}
                </motion.text>
              ))}
              {/* "Original" badge */}
              {(() => {
                const cx = originalShape.reduce((s, p) => s + p.x, 0) / originalShape.length
                const cy = originalShape.reduce((s, p) => s + p.y, 0) / originalShape.length
                return (
                  <motion.text
                    x={toSvgX(cx)}
                    y={toSvgY(cy) + 4}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={primaryColor}
                    fontSize={10}
                    fontWeight={600}
                    opacity={0.7}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {language === 'he' ? '\u05de\u05e7\u05d5\u05e8' : 'Original'}
                  </motion.text>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Steps 2+: Each transformation */}
        {transformations.map((t, tIdx) => {
          const stepId = 'transform_' + tIdx
          const isLastTransform = tIdx === transformations.length - 1
          const shapePoints = intermediatePointStrings[tIdx]
          const shapeData = intermediateShapes[tIdx]
          const color = getStepColor(tIdx, transformations.length, primaryColor, accentColor)
          const fillOpacity = isLastTransform ? '40' : '20'
          const strokeStyle = isLastTransform ? undefined : '6 3'
          const arrow = shapeArrows[tIdx]

          const shouldRenderShape = showIntermediate || isLastTransform

          return (
            <AnimatePresence key={stepId}>
              {isVisible(stepId) && (
                <motion.g
                  data-testid={'tc-' + stepId}
                  initial="hidden"
                  animate={isCurrent(stepId) ? 'spotlight' : 'visible'}
                  variants={spotlight}
                >
                  {/* Arrow from previous shape to this one */}
                  {arrow && (
                    <motion.g>
                      <motion.line
                        x1={arrow.x1} y1={arrow.y1}
                        x2={arrow.x2} y2={arrow.y2}
                        stroke="#9ca3af"
                        strokeWidth={1.5}
                        strokeDasharray="5 3"
                        markerEnd="url(#tc-arrowhead)"
                        initial="hidden"
                        animate="visible"
                        variants={lineDrawVariants}
                      />
                      {/* Transformation label near the arrow midpoint */}
                      {showOrder && (
                        <motion.g
                          initial="hidden"
                          animate="visible"
                          variants={labelAppearVariants}
                        >
                          <rect
                            x={(arrow.x1 + arrow.x2) / 2 - 45}
                            y={(arrow.y1 + arrow.y2) / 2 - 18}
                            width={90}
                            height={18}
                            rx={4}
                            fill={color}
                            opacity={0.85}
                          />
                          <text
                            x={(arrow.x1 + arrow.x2) / 2}
                            y={(arrow.y1 + arrow.y2) / 2 - 6}
                            textAnchor="middle"
                            fill="white"
                            fontSize={9}
                            fontWeight={600}
                          >
                            {(tIdx + 1) + '. ' + arrow.label}
                          </text>
                        </motion.g>
                      )}
                    </motion.g>
                  )}

                  {/* Transformed shape */}
                  {shouldRenderShape && shapePoints && (
                    <>
                      <motion.polygon
                        points={shapePoints}
                        fill={color + fillOpacity}
                        stroke={color}
                        strokeWidth={diagram.lineWeight}
                        strokeLinejoin="round"
                        strokeDasharray={strokeStyle}
                        initial="hidden"
                        animate="visible"
                        variants={lineDrawVariants}
                      />
                      {/* Vertices */}
                      {shapeData?.map((p, i) => (
                        <motion.circle
                          key={'tv-' + tIdx + '-' + i}
                          cx={toSvgX(p.x)}
                          cy={toSvgY(p.y)}
                          r={3.5}
                          fill={color}
                          stroke="white"
                          strokeWidth={1.5}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.06 }}
                        />
                      ))}
                      {/* Vertex labels with prime marks */}
                      {shapeData?.map((p, i) => {
                        const primes = '\u2032'.repeat(tIdx + 1)
                        return (
                          <motion.text
                            key={'tl-' + tIdx + '-' + i}
                            x={toSvgX(p.x)}
                            y={toSvgY(p.y) - 9}
                            textAnchor="middle"
                            fill={color}
                            fontSize={10}
                            fontWeight={700}
                            initial="hidden"
                            animate="visible"
                            variants={labelAppearVariants}
                          >
                            {(VERTEX_LABELS[i] ?? ('P' + i)) + primes}
                          </motion.text>
                        )
                      })}
                    </>
                  )}
                </motion.g>
              )}
            </AnimatePresence>
          )
        })}
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

export default TransformationsComposition
