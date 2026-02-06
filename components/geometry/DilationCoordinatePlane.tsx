'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DilationCoordinatePlaneData } from '@/types/geometry'
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
  center: { en: 'Mark center of dilation', he: 'סימון מרכז ההרחבה' },
  rays: { en: 'Draw rays from center', he: 'ציור קרניים מהמרכז' },
  dilated: { en: 'Draw dilated shape', he: 'ציור הצורה המורחבת' },
}

interface DilationCoordinatePlaneProps {
  data: DilationCoordinatePlaneData
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
 * DilationCoordinatePlane - SVG component for displaying dilation transformations
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
export function DilationCoordinatePlane({
  data,
  width = 400,
  height = 400,
  className = '',
  initialStep,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'middle_school',
}: DilationCoordinatePlaneProps) {
  const {
    originalVertices,
    centerOfDilation,
    scaleFactor,
    showCenter = true,
    showRays = true,
    showPrime = true,
    title,
  } = data

  const stepDefs = useMemo(() => [
    { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
    { id: 'original', label: STEP_LABELS.original.en, labelHe: STEP_LABELS.original.he },
    { id: 'center', label: STEP_LABELS.center.en, labelHe: STEP_LABELS.center.he },
    { id: 'rays', label: STEP_LABELS.rays.en, labelHe: STEP_LABELS.rays.he },
    { id: 'dilated', label: STEP_LABELS.dilated.en, labelHe: STEP_LABELS.dilated.he },
  ], [])

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

  // Compute dilated vertices
  const dilatedVertices = useMemo(
    () =>
      originalVertices.map((v) => ({
        x: centerOfDilation.x + (v.x - centerOfDilation.x) * scaleFactor,
        y: centerOfDilation.y + (v.y - centerOfDilation.y) * scaleFactor,
        label: v.label ? `${v.label}'` : undefined,
      })),
    [originalVertices, centerOfDilation, scaleFactor]
  )

  // Grid setup
  const padding = 40
  const allPoints = [...originalVertices, ...dilatedVertices, centerOfDilation]
  const xs = allPoints.map((p) => p.x)
  const ys = allPoints.map((p) => p.y)
  const minX = Math.min(...xs) - 2
  const maxX = Math.max(...xs) + 2
  const minY = Math.min(...ys) - 2
  const maxY = Math.max(...ys) + 2
  const rangeX = maxX - minX
  const rangeY = maxY - minY
  const scaleXCoord = (width - padding * 2) / rangeX
  const scaleYCoord = (height - padding * 2) / rangeY
  const coordScale = Math.min(scaleXCoord, scaleYCoord)

  const toSvgX = (x: number) => padding + (x - minX) * coordScale
  const toSvgY = (y: number) => height - padding - (y - minY) * coordScale

  const originalPath = originalVertices.map((v, i) =>
    `${i === 0 ? 'M' : 'L'} ${toSvgX(v.x)} ${toSvgY(v.y)}`
  ).join(' ') + ' Z'

  const dilatedPath = dilatedVertices.map((v, i) =>
    `${i === 0 ? 'M' : 'L'} ${toSvgX(v.x)} ${toSvgY(v.y)}`
  ).join(' ') + ' Z'

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
      data-testid="dilation-coordinate-plane-diagram"
      className={`geometry-dilation-coordinate-plane ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Dilation of shape by scale factor ${scaleFactor}${title ? `: ${title}` : ''}`}
      >
        <rect
          data-testid="dcp-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {title && (
          <text
            data-testid="dcp-title"
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
              data-testid="dcp-grid"
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
              data-testid="dcp-original"
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
                    data-testid={`dcp-original-vertex-${i}`}
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

        {/* Step 2: Center of dilation */}
        <AnimatePresence>
          {isVisible('center') && showCenter && (
            <motion.g
              data-testid="dcp-center"
              initial="hidden"
              animate={isCurrent('center') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.circle
                cx={toSvgX(centerOfDilation.x)}
                cy={toSvgY(centerOfDilation.y)}
                r={5}
                fill={GEOMETRY_COLORS.highlight.primary}
                stroke={GEOMETRY_COLORS.highlight.primary}
                strokeWidth={2}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
              <motion.text
                x={toSvgX(centerOfDilation.x) + 10}
                y={toSvgY(centerOfDilation.y) - 10}
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

        {/* Step 3: Rays from center through vertices */}
        <AnimatePresence>
          {isVisible('rays') && showRays && (
            <motion.g
              data-testid="dcp-rays"
              initial="hidden"
              animate={isCurrent('rays') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {originalVertices.map((v, i) => {
                const dv = dilatedVertices[i]
                // Extend ray beyond dilated vertex
                const dx = dv.x - centerOfDilation.x
                const dy = dv.y - centerOfDilation.y
                const ext = 1.3
                const endX = centerOfDilation.x + dx * ext
                const endY = centerOfDilation.y + dy * ext
                return (
                  <motion.line
                    key={`ray-${i}`}
                    data-testid={`dcp-ray-${i}`}
                    x1={toSvgX(centerOfDilation.x)}
                    y1={toSvgY(centerOfDilation.y)}
                    x2={toSvgX(endX)}
                    y2={toSvgY(endY)}
                    stroke={GEOMETRY_COLORS.highlight.tertiary}
                    strokeWidth={1}
                    strokeDasharray="4,3"
                    opacity={0.6}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                    transition={{ delay: i * 0.15 }}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Dilated shape */}
        <AnimatePresence>
          {isVisible('dilated') && (
            <motion.g
              data-testid="dcp-dilated"
              initial="hidden"
              animate={isCurrent('dilated') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={dilatedPath}
                fill={GEOMETRY_COLORS.highlight.secondary}
                fillOpacity={0.15}
                stroke={GEOMETRY_COLORS.highlight.secondary}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="6,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {dilatedVertices.map((v, i) => (
                <motion.g key={`dil-v-${i}`}>
                  <circle
                    data-testid={`dcp-dilated-vertex-${i}`}
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
              {/* Scale factor label */}
              <motion.text
                x={width - padding - 10}
                y={height - padding + 25}
                textAnchor="end"
                style={{ fill: GEOMETRY_COLORS.highlight.secondary }}
                className="text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.4 }}
              >
                k = {scaleFactor}
              </motion.text>
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

export default DilationCoordinatePlane
