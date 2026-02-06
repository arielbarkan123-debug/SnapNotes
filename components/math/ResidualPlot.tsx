'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ResidualPlotData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResidualPlotProps {
  data: ResidualPlotData
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  currentStep?: number
  totalSteps?: number
  onStepComplete?: () => void
  animationDuration?: number
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  axes: { en: 'Draw axes with zero line', he: 'ציור צירים עם קו אפס' },
  points: { en: 'Plot residual points', he: 'סימון נקודות השארית' },
  pattern: { en: 'Show pattern analysis', he: 'הצגת ניתוח דפוס' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResidualPlot({
  data,
  className = '',
  width = 400,
  height = 300,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: ResidualPlotProps) {
  const { residuals, showZeroLine = true, showPattern = false, title } = data

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
      { id: 'points', label: STEP_LABELS.points.en, labelHe: STEP_LABELS.points.he },
    ]
    if (showPattern) {
      defs.push({ id: 'pattern', label: STEP_LABELS.pattern.en, labelHe: STEP_LABELS.pattern.he })
    }
    return defs
  }, [showPattern])

  // useDiagramBase
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'high_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Step visibility helpers
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
  // Layout calculations
  // ---------------------------------------------------------------------------

  const padding = { top: 40, right: 30, bottom: 40, left: 50 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Determine data extents
  const predictedValues = residuals.map((r) => r.predicted)
  const residualValues = residuals.map((r) => r.residual)
  const xMin = Math.min(...predictedValues)
  const xMax = Math.max(...predictedValues)
  const yAbsMax = Math.max(Math.abs(Math.min(...residualValues)), Math.abs(Math.max(...residualValues)))
  const yMin = -yAbsMax * 1.2
  const yMax = yAbsMax * 1.2
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1

  const toSvgX = (val: number) => padding.left + ((val - xMin) / xRange) * plotWidth
  const toSvgY = (val: number) => padding.top + ((yMax - val) / yRange) * plotHeight
  const zeroY = toSvgY(0)

  return (
    <div
      data-testid="residual-plot"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Residual plot${title ? `: ${title}` : ''} with ${residuals.length} points`}
      >
        {/* Background */}
        <rect
          data-testid="rp-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="rp-title"
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* -- Step 0: Axes with zero line --------------------------------- */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="rp-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* X axis */}
              <motion.line
                x1={padding.left}
                y1={padding.top + plotHeight}
                x2={padding.left + plotWidth}
                y2={padding.top + plotHeight}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Y axis */}
              <motion.line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={padding.top + plotHeight}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Zero line (horizontal at residual=0) */}
              {showZeroLine && (
                <motion.line
                  data-testid="rp-zero-line"
                  x1={padding.left}
                  y1={zeroY}
                  x2={padding.left + plotWidth}
                  y2={zeroY}
                  stroke={primaryColor}
                  strokeWidth={diagram.lineWeight}
                  strokeDasharray="6,4"
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                />
              )}

              {/* X axis label */}
              <motion.text
                x={padding.left + plotWidth / 2}
                y={height - 5}
                textAnchor="middle"
                className="fill-current text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'ערכים חזויים' : 'Predicted'}
              </motion.text>

              {/* Y axis label */}
              <motion.text
                x={12}
                y={padding.top + plotHeight / 2}
                textAnchor="middle"
                transform={`rotate(-90, 12, ${padding.top + plotHeight / 2})`}
                className="fill-current text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'שאריות' : 'Residuals'}
              </motion.text>

              {/* Zero label */}
              <motion.text
                x={padding.left - 8}
                y={zeroY + 4}
                textAnchor="end"
                className="fill-current text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                0
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 1: Plot residual points -------------------------------- */}
        <AnimatePresence>
          {isVisible('points') && (
            <motion.g
              data-testid="rp-points"
              initial="hidden"
              animate={isCurrent('points') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {residuals.map((r, i) => {
                const cx = toSvgX(r.predicted)
                const cy = toSvgY(r.residual)
                const isAbove = r.residual >= 0
                const color = isAbove ? primaryColor : accentColor

                return (
                  <motion.circle
                    key={`residual-${i}`}
                    data-testid={`rp-point-${i}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={color}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 20,
                      delay: Math.min(i * 0.05, 1.5),
                    }}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 2: Pattern analysis ------------------------------------ */}
        <AnimatePresence>
          {showPattern && isVisible('pattern') && (
            <motion.g
              data-testid="rp-pattern"
              initial="hidden"
              animate={isCurrent('pattern') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Draw a smooth curve through points to indicate pattern or lack thereof */}
              {residuals.length >= 2 && (() => {
                const sorted = [...residuals].sort((a, b) => a.predicted - b.predicted)
                const pathD = sorted
                  .map((r, i) => {
                    const x = toSvgX(r.predicted)
                    const y = toSvgY(r.residual)
                    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
                  })
                  .join(' ')

                return (
                  <motion.path
                    data-testid="rp-pattern-line"
                    d={pathD}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth={diagram.lineWeight}
                    strokeDasharray="4,3"
                    opacity={0.6}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                )
              })()}

              {/* Pattern label */}
              <motion.text
                x={padding.left + plotWidth / 2}
                y={padding.top + 15}
                textAnchor="middle"
                className="text-xs font-medium"
                fill={accentColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'ניתוח דפוס' : 'Pattern Analysis'}
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
          subjectColor={primaryColor}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default ResidualPlot
