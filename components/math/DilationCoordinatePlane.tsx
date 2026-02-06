'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DilationCoordinatePlaneData } from '@/types/math'
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

interface DilationCoordinatePlaneProps {
  data: DilationCoordinatePlaneData
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
  rays: { en: 'Show dilation rays', he: 'הצגת קרני ההרחבה' },
  dilated: { en: 'Draw dilated shape', he: 'ציור הצורה המורחבת' },
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function dilatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  scale: number
): { x: number; y: number } {
  return {
    x: cx + (px - cx) * scale,
    y: cy + (py - cy) * scale,
  }
}

function vertexLabel(index: number): string {
  return String.fromCharCode(65 + index)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DilationCoordinatePlane({
  data,
  className = '',
  width = 450,
  height = 450,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
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

  // Compute dilated vertices
  const dilatedVertices = useMemo(
    () =>
      originalVertices.map((v) =>
        dilatePoint(v.x, v.y, centerOfDilation.x, centerOfDilation.y, scaleFactor)
      ),
    [originalVertices, centerOfDilation, scaleFactor]
  )

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
      { id: 'original', label: STEP_LABELS.original.en, labelHe: STEP_LABELS.original.he },
    ]
    if (showRays) {
      defs.push({ id: 'rays', label: STEP_LABELS.rays.en, labelHe: STEP_LABELS.rays.he })
    }
    defs.push({ id: 'dilated', label: STEP_LABELS.dilated.en, labelHe: STEP_LABELS.dilated.he })
    return defs
  }, [showRays])

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

  // Layout
  const padding = { left: 40, right: 40, top: 40, bottom: 40 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Determine range from data
  const allPoints = [...originalVertices, ...dilatedVertices, centerOfDilation]
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

  const gridMin = -Math.floor(rangeX)
  const gridMax = Math.floor(rangeX)
  const gridMinY = -Math.floor(rangeY)
  const gridMaxY = Math.floor(rangeY)

  // Polygon paths
  const originalPath =
    originalVertices.map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(v.x)},${scaleY(v.y)}`).join(' ') + ' Z'
  const dilatedPath =
    dilatedVertices.map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(v.x)},${scaleY(v.y)}`).join(' ') + ' Z'

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="dilation-coordinate-plane"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="dcp-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg data-testid="dcp-svg" viewBox={viewBox} width="100%" className="overflow-visible">
        {/* Step 0: Coordinate grid */}
        <AnimatePresence>
          {isVisible('grid') && (
            <motion.g
              data-testid="dcp-grid"
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
              data-testid="dcp-original"
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
              {/* Center of dilation */}
              {showCenter && (
                <motion.g>
                  <circle
                    cx={scaleX(centerOfDilation.x)}
                    cy={scaleY(centerOfDilation.y)}
                    r={5}
                    fill="#ef4444"
                    stroke="white"
                    strokeWidth={1.5}
                  />
                  <motion.text
                    x={scaleX(centerOfDilation.x) + 10}
                    y={scaleY(centerOfDilation.y) - 8}
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

        {/* Step 2: Dilation rays */}
        <AnimatePresence>
          {showRays && isVisible('rays') && (
            <motion.g
              data-testid="dcp-rays"
              initial="hidden"
              animate={isCurrent('rays') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {originalVertices.map((v, i) => {
                const dv = dilatedVertices[i]
                // Extend the ray slightly past the dilated vertex
                const extendFactor = 1.15
                const ex = centerOfDilation.x + (dv.x - centerOfDilation.x) * extendFactor
                const ey = centerOfDilation.y + (dv.y - centerOfDilation.y) * extendFactor
                return (
                  <motion.line
                    key={`ray-${i}`}
                    x1={scaleX(centerOfDilation.x)}
                    y1={scaleY(centerOfDilation.y)}
                    x2={scaleX(ex)}
                    y2={scaleY(ey)}
                    stroke="#9ca3af"
                    strokeWidth={1}
                    strokeDasharray="6 4"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                )
              })}
              {/* Scale factor label */}
              <motion.text
                x={width - padding.right - 10}
                y={padding.top + 16}
                textAnchor="end"
                fill="#6b7280"
                fontSize={12}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                k = {scaleFactor}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Dilated shape */}
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
                fill={`${accentColor}30`}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {dilatedVertices.map((v, i) => (
                <motion.g key={`dv-${i}`}>
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

export default DilationCoordinatePlane
