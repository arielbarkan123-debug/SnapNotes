'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'
import type { CountingObjectsData } from '@/types/math'

// ---------------------------------------------------------------------------
// SVG Shape Paths
// ---------------------------------------------------------------------------

function renderShape(
  type: string,
  cx: number,
  cy: number,
  size: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  testId?: string
) {
  const half = size / 2
  switch (type) {
    case 'star': {
      const points: string[] = []
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 72 - 90) * (Math.PI / 180)
        const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180)
        points.push(`${cx + half * Math.cos(outerAngle)},${cy + half * Math.sin(outerAngle)}`)
        points.push(`${cx + half * 0.4 * Math.cos(innerAngle)},${cy + half * 0.4 * Math.sin(innerAngle)}`)
      }
      return (
        <polygon
          data-testid={testId}
          points={points.join(' ')}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      )
    }
    case 'heart': {
      const s = half * 0.6
      const d = `M ${cx} ${cy + s * 0.8} C ${cx - s * 1.6} ${cy - s * 0.5} ${cx - s * 0.5} ${cy - s * 1.5} ${cx} ${cy - s * 0.4} C ${cx + s * 0.5} ${cy - s * 1.5} ${cx + s * 1.6} ${cy - s * 0.5} ${cx} ${cy + s * 0.8} Z`
      return (
        <path
          data-testid={testId}
          d={d}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      )
    }
    case 'square':
      return (
        <rect
          data-testid={testId}
          x={cx - half * 0.7}
          y={cy - half * 0.7}
          width={half * 1.4}
          height={half * 1.4}
          rx={2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )
    case 'circle':
    default:
      return (
        <circle
          data-testid={testId}
          cx={cx}
          cy={cy}
          r={half * 0.8}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )
  }
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  grid: { en: 'Show the grid', he: 'הצגת הלוח' },
  objects: { en: 'Place the objects', he: 'הצבת האובייקטים' },
  result: { en: 'Show the result', he: 'הצגת התוצאה' },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CountingObjectsArrayProps {
  data: CountingObjectsData
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
  language?: 'en' | 'he'
  className?: string
  width?: number
  height?: number
  currentStep?: number
  totalSteps?: number
  onStepComplete?: () => void
  animationDuration?: number
  stepConfig?: Array<{ step: number; stepLabel?: string; stepLabelHe?: string }>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CountingObjectsArray({
  data,
  subject = 'math',
  complexity = 'elementary',
  language = 'en',
  className = '',
  width = 400,
  height = 300,
  currentStep: externalStep,
  totalSteps: externalTotal,
  onStepComplete,
  stepConfig,
}: CountingObjectsArrayProps) {
  const { objects, operation, total, title, groupSize = 5 } = data

  // Determine total object count
  const totalObjects = objects.reduce((sum, g) => sum + g.count, 0)

  // Compute columns for grid layout
  const cols = Math.min(groupSize, 10)
  const rows = Math.ceil(totalObjects / cols)

  // Step definitions
  const stepDefs = useMemo(
    () => [
      { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
      { id: 'objects', label: STEP_LABELS.objects.en, labelHe: STEP_LABELS.objects.he },
      { id: 'result', label: STEP_LABELS.result.en, labelHe: STEP_LABELS.result.he },
    ],
    []
  )

  // Diagram base hook
  const diagram = useDiagramBase({
    totalSteps: externalTotal ?? stepDefs.length,
    subject,
    complexity,
    initialStep: externalStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
    onStepChange: (step) => {
      if (step === (externalTotal ?? stepDefs.length) - 1 && onStepComplete) {
        onStepComplete()
      }
    },
  })

  // Step helpers
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

  // Layout
  const padding = { left: 40, right: 40, top: title ? 50 : 30, bottom: 50 }
  const gridW = width - padding.left - padding.right
  const gridH = height - padding.top - padding.bottom
  const cellW = gridW / cols
  const cellH = gridH / Math.max(rows, 1)
  const shapeSize = Math.min(cellW, cellH) * 0.65

  // Build flat array of objects with group info
  const flatObjects = useMemo(() => {
    const result: Array<{ type: string; color: string; groupIndex: number; index: number }> = []
    let globalIdx = 0
    objects.forEach((group, gi) => {
      for (let i = 0; i < group.count; i++) {
        result.push({
          type: group.type,
          color: group.color || diagram.colors.primary,
          groupIndex: gi,
          index: globalIdx,
        })
        globalIdx++
      }
    })
    return result
  }, [objects, diagram.colors.primary])

  // Operation label
  const operationLabel = useMemo(() => {
    if (operation === 'count') return `${total}`
    if (operation === 'add') {
      const parts = objects.map((o) => o.count).join(' + ')
      return `${parts} = ${total}`
    }
    if (operation === 'subtract') {
      const parts = objects.map((o) => o.count).join(' - ')
      return `${parts} = ${total}`
    }
    return `${total}`
  }, [operation, objects, total])

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = stepConfig?.[diagram.currentStep]?.stepLabel
    ?? (language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label)

  return (
    <div
      data-testid="counting-objects-array"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Counting objects: ${operationLabel}${title ? ` - ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="coa-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="coa-title"
            x={width / 2}
            y={28}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 18 }}
          >
            {title}
          </text>
        )}

        {/* Step 0: Grid outlines */}
        <AnimatePresence>
          {isVisible('grid') && (
            <motion.g
              data-testid="coa-grid"
              initial="hidden"
              animate={isCurrent('grid') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Batch grid cells by row to reduce motion element count */}
              {Array.from({ length: Math.ceil(totalObjects / cols) }).map((_, row) => (
                <motion.g
                  key={`row-${row}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(row * 0.05, 1.0) }}
                >
                  {Array.from({ length: Math.min(cols, totalObjects - row * cols) }).map((_, col) => {
                    const i = row * cols + col
                    const cx = padding.left + col * cellW + cellW / 2
                    const cy = padding.top + row * cellH + cellH / 2
                    return (
                      <rect
                        key={`cell-${i}`}
                        data-testid={`coa-cell-${i}`}
                        x={cx - cellW / 2 + 2}
                        y={cy - cellH / 2 + 2}
                        width={cellW - 4}
                        height={cellH - 4}
                        rx={6}
                        fill="none"
                        stroke={diagram.colors.light}
                        strokeWidth={diagram.lineWeight / 2}
                        strokeDasharray="4 3"
                      />
                    )
                  })}
                </motion.g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Objects appear */}
        <AnimatePresence>
          {isVisible('objects') && (
            <motion.g
              data-testid="coa-objects"
              initial="hidden"
              animate={isCurrent('objects') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Batch objects by row for better animation performance */}
              {Array.from({ length: Math.ceil(flatObjects.length / cols) }).map((_, row) => (
                <motion.g
                  key={`obj-row-${row}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: Math.min(row * 0.1, 1.5),
                  }}
                >
                  {flatObjects.slice(row * cols, (row + 1) * cols).map((obj, colIdx) => {
                    const i = row * cols + colIdx
                    const col = i % cols
                    const cx = padding.left + col * cellW + cellW / 2
                    const cy = padding.top + row * cellH + cellH / 2
                    return (
                      <g key={`obj-${i}`}>
                        {renderShape(
                          obj.type,
                          cx,
                          cy,
                          shapeSize,
                          obj.color,
                          diagram.colors.dark,
                          diagram.lineWeight,
                          `coa-object-${i}`
                        )}
                      </g>
                    )
                  })}
                </motion.g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Result label */}
        <AnimatePresence>
          {isVisible('result') && (
            <motion.g
              data-testid="coa-result"
              initial="hidden"
              animate={isCurrent('result') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Result pill */}
              <motion.rect
                x={width / 2 - 60}
                y={height - 38}
                width={120}
                height={30}
                rx={15}
                fill={diagram.colors.bg}
                stroke={diagram.colors.primary}
                strokeWidth={2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              <motion.text
                data-testid="coa-result-label"
                x={width / 2}
                y={height - 18}
                textAnchor="middle"
                className="font-bold"
                style={{ fontSize: 16, fill: diagram.colors.primary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {operationLabel}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Step Controls */}
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

export default CountingObjectsArray
