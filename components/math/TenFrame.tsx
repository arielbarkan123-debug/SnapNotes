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
import type { TenFrameData } from '@/types/math'

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  frame: { en: 'Show the ten frame', he: 'הצגת מסגרת העשר' },
  counters: { en: 'Place the counters', he: 'הנחת האסימונים' },
  count: { en: 'Count the total', he: 'ספירת הסכום' },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TenFrameProps {
  data: TenFrameData
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

export function TenFrame({
  data,
  subject = 'math',
  complexity = 'elementary',
  language = 'en',
  className = '',
  width = 400,
  height = 250,
  currentStep: externalStep,
  totalSteps: externalTotal,
  onStepComplete,
  stepConfig,
}: TenFrameProps) {
  const { filled, total, color, showSecondFrame, title, highlightFilled = [] } = data

  // Layout for 2x5 grid(s)
  const frameCount = total === 20 || showSecondFrame ? 2 : 1
  const rows = 2
  const colsPerFrame = 5

  // Step definitions
  const stepDefs = useMemo(
    () => [
      { id: 'frame', label: STEP_LABELS.frame.en, labelHe: STEP_LABELS.frame.he },
      { id: 'counters', label: STEP_LABELS.counters.en, labelHe: STEP_LABELS.counters.he },
      { id: 'count', label: STEP_LABELS.count.en, labelHe: STEP_LABELS.count.he },
    ],
    []
  )

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

  // Layout calculations
  const padding = { left: 30, right: 30, top: title ? 50 : 25, bottom: 50 }
  const availableW = width - padding.left - padding.right
  const availableH = height - padding.top - padding.bottom
  const frameGap = 20
  const totalFrameW = frameCount === 2 ? (availableW - frameGap) / 2 : availableW
  const cellW = totalFrameW / colsPerFrame
  const cellH = Math.min(availableH / rows, cellW) // Keep roughly square
  const counterRadius = Math.min(cellW, cellH) * 0.32

  // Render a single frame
  const renderFrame = (frameIndex: number, startX: number, startY: number) => {
    const cells: JSX.Element[] = []
    const counters: JSX.Element[] = []

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < colsPerFrame; col++) {
        const globalIndex = frameIndex * 10 + row * colsPerFrame + col
        const cx = startX + col * cellW + cellW / 2
        const cy = startY + row * cellH + cellH / 2
        const isFilled = globalIndex < filled
        const isHighlighted = highlightFilled.includes(globalIndex)

        // Cell border
        cells.push(
          <motion.rect
            key={`frame-${frameIndex}-cell-${row}-${col}`}
            data-testid={`tf-cell-${globalIndex}`}
            x={startX + col * cellW}
            y={startY + row * cellH}
            width={cellW}
            height={cellH}
            fill="none"
            stroke={diagram.colors.primary}
            strokeWidth={diagram.lineWeight}
            rx={4}
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 1, pathLength: 1 }}
            transition={{ delay: globalIndex * 0.03, duration: 0.3 }}
          />
        )

        // Counter
        if (isFilled) {
          counters.push(
            <motion.circle
              key={`counter-${globalIndex}`}
              data-testid={`tf-counter-${globalIndex}`}
              cx={cx}
              cy={cy}
              r={counterRadius}
              fill={isHighlighted ? diagram.colors.accent : (color || diagram.colors.primary)}
              stroke={diagram.colors.dark}
              strokeWidth={isHighlighted ? diagram.lineWeight : diagram.lineWeight / 2}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'spring',
                stiffness: 250,
                damping: 15,
                delay: globalIndex * 0.08,
              }}
            />
          )
        }
      }
    }

    return { cells, counters }
  }

  // Build frames
  const frames = useMemo(() => {
    const result: Array<{ cells: JSX.Element[]; counters: JSX.Element[] }> = []
    for (let f = 0; f < frameCount; f++) {
      const startX = padding.left + f * (totalFrameW + frameGap)
      const startY = padding.top
      result.push(renderFrame(f, startX, startY))
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameCount, filled, totalFrameW, cellW, cellH, counterRadius, diagram.colors, diagram.lineWeight, color, highlightFilled, padding.left, padding.top, frameGap])

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = stepConfig?.[diagram.currentStep]?.stepLabel
    ?? (language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label)

  return (
    <div
      data-testid="ten-frame"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Ten frame showing ${filled} out of ${total}${title ? `: ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="tf-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="tf-title"
            x={width / 2}
            y={28}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 18 }}
          >
            {title}
          </text>
        )}

        {/* Step 0: Empty frame */}
        <AnimatePresence>
          {isVisible('frame') && (
            <motion.g
              data-testid="tf-frame"
              initial="hidden"
              animate={isCurrent('frame') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {frames.map((frame, fi) => (
                <g key={`frame-cells-${fi}`}>{frame.cells}</g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Counters fill in */}
        <AnimatePresence>
          {isVisible('counters') && (
            <motion.g
              data-testid="tf-counters"
              initial="hidden"
              animate={isCurrent('counters') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {frames.map((frame, fi) => (
                <g key={`frame-counters-${fi}`}>{frame.counters}</g>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Count label */}
        <AnimatePresence>
          {isVisible('count') && (
            <motion.g
              data-testid="tf-count"
              initial="hidden"
              animate={isCurrent('count') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={width / 2 - 40}
                y={height - 40}
                width={80}
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
                data-testid="tf-count-label"
                x={width / 2}
                y={height - 20}
                textAnchor="middle"
                className="font-bold"
                style={{ fontSize: 18, fill: diagram.colors.primary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {filled}
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

export default TenFrame
