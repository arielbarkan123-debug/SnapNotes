'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'
import type { PictureGraphData } from '@/types/math'

// ---------------------------------------------------------------------------
// Simple SVG icons for categories
// ---------------------------------------------------------------------------

function renderIcon(
  icon: string,
  cx: number,
  cy: number,
  size: number,
  fill: string,
  testId?: string
) {
  const half = size / 2

  switch (icon) {
    case 'star': {
      const points: string[] = []
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 72 - 90) * (Math.PI / 180)
        const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180)
        points.push(`${cx + half * Math.cos(outerAngle)},${cy + half * Math.sin(outerAngle)}`)
        points.push(`${cx + half * 0.4 * Math.cos(innerAngle)},${cy + half * 0.4 * Math.sin(innerAngle)}`)
      }
      return <polygon data-testid={testId} points={points.join(' ')} fill={fill} />
    }
    case 'heart': {
      const s = half * 0.6
      const d = `M ${cx} ${cy + s * 0.8} C ${cx - s * 1.6} ${cy - s * 0.5} ${cx - s * 0.5} ${cy - s * 1.5} ${cx} ${cy - s * 0.4} C ${cx + s * 0.5} ${cy - s * 1.5} ${cx + s * 1.6} ${cy - s * 0.5} ${cx} ${cy + s * 0.8} Z`
      return <path data-testid={testId} d={d} fill={fill} />
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
        />
      )
    case 'triangle': {
      const points = `${cx},${cy - half} ${cx - half * 0.87},${cy + half * 0.5} ${cx + half * 0.87},${cy + half * 0.5}`
      return <polygon data-testid={testId} points={points} fill={fill} />
    }
    case 'diamond': {
      const points = `${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`
      return <polygon data-testid={testId} points={points} fill={fill} />
    }
    case 'circle':
    default:
      return <circle data-testid={testId} cx={cx} cy={cy} r={half * 0.8} fill={fill} />
  }
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  categories: { en: 'Show categories', he: '\u05D4\u05E6\u05D2\u05EA \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA' },
  icons: { en: 'Count the pictures', he: '\u05E1\u05E4\u05D9\u05E8\u05EA \u05D4\u05EA\u05DE\u05D5\u05E0\u05D5\u05EA' },
  key: { en: 'Show the key', he: '\u05D4\u05E6\u05D2\u05EA \u05D4\u05DE\u05E4\u05EA\u05D7' },
}

// ---------------------------------------------------------------------------
// Default colors for rows
// ---------------------------------------------------------------------------

const ROW_COLORS = [
  '#6366f1', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#84cc16', '#14b8a6',
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PictureGraphProps {
  data: PictureGraphData
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

export function PictureGraph({
  data,
  subject = 'math',
  complexity = 'elementary',
  language = 'en',
  className = '',
  width = 450,
  height = 350,
  currentStep: externalStep,
  totalSteps: externalTotal,
  onStepComplete,
  stepConfig,
}: PictureGraphProps) {
  const { categories, title, symbolValue = 1, showKey } = data

  // Step definitions
  const stepDefs = useMemo(
    () => [
      { id: 'categories', label: STEP_LABELS.categories.en, labelHe: STEP_LABELS.categories.he },
      { id: 'icons', label: STEP_LABELS.icons.en, labelHe: STEP_LABELS.icons.he },
      { id: 'key', label: STEP_LABELS.key.en, labelHe: STEP_LABELS.key.he },
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

  // Layout
  const padding = { left: 100, right: 30, top: title ? 55 : 30, bottom: showKey !== false ? 50 : 25 }
  const graphW = width - padding.left - padding.right
  const graphH = height - padding.top - padding.bottom
  const rowH = graphH / Math.max(categories.length, 1)
  const maxCount = Math.max(...categories.map((c) => Math.ceil(c.count / symbolValue)), 1)
  const iconSpacing = Math.min(graphW / maxCount, rowH * 0.8)
  const iconSize = iconSpacing * 0.7

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = stepConfig?.[diagram.currentStep]?.stepLabel
    ?? (language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label)

  return (
    <div
      data-testid="picture-graph"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Picture graph: ${title}${categories.length ? ` with ${categories.length} categories` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="pg-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="pg-title"
            x={width / 2}
            y={28}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 18 }}
          >
            {title}
          </text>
        )}

        {/* Step 0: Category labels and row lines */}
        <AnimatePresence>
          {isVisible('categories') && (
            <motion.g
              data-testid="pg-categories"
              initial="hidden"
              animate={isCurrent('categories') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {categories.map((cat, i) => {
                const y = padding.top + i * rowH + rowH / 2

                return (
                  <motion.g
                    key={`cat-${i}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.3 }}
                  >
                    {/* Category label */}
                    <text
                      data-testid={`pg-category-${i}`}
                      x={padding.left - 10}
                      y={y + 5}
                      textAnchor="end"
                      className="fill-current font-medium"
                      style={{ fontSize: 14 }}
                    >
                      {cat.label}
                    </text>

                    {/* Row separator */}
                    <motion.line
                      x1={padding.left}
                      y1={padding.top + (i + 1) * rowH}
                      x2={width - padding.right}
                      y2={padding.top + (i + 1) * rowH}
                      stroke={diagram.colors.light}
                      strokeWidth={1}
                      strokeOpacity={0.4}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                  </motion.g>
                )
              })}

              {/* Vertical axis line */}
              <motion.line
                data-testid="pg-axis"
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={padding.top + graphH}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Icons appear row by row */}
        <AnimatePresence>
          {isVisible('icons') && (
            <motion.g
              data-testid="pg-icons"
              initial="hidden"
              animate={isCurrent('icons') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {categories.map((cat, rowIdx) => {
                const y = padding.top + rowIdx * rowH + rowH / 2
                const iconCount = Math.ceil(cat.count / symbolValue)
                const rowColor = ROW_COLORS[rowIdx % ROW_COLORS.length]

                return (
                  <g key={`icons-row-${rowIdx}`}>
                    {Array.from({ length: iconCount }).map((_, colIdx) => {
                      const cx = padding.left + 15 + colIdx * iconSpacing + iconSize / 2

                      return (
                        <motion.g
                          key={`icon-${rowIdx}-${colIdx}`}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{
                            type: 'spring',
                            stiffness: 250,
                            damping: 15,
                            delay: rowIdx * 0.2 + colIdx * 0.06,
                          }}
                        >
                          {renderIcon(
                            cat.icon,
                            cx,
                            y,
                            iconSize,
                            rowColor,
                            `pg-icon-${rowIdx}-${colIdx}`
                          )}
                        </motion.g>
                      )
                    })}

                    {/* Count number at end of row */}
                    <motion.text
                      data-testid={`pg-count-${rowIdx}`}
                      x={padding.left + 15 + iconCount * iconSpacing + 10}
                      y={y + 5}
                      textAnchor="start"
                      className="font-semibold"
                      style={{ fontSize: 14, fill: rowColor }}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: rowIdx * 0.2 + iconCount * 0.06 + 0.1 }}
                    >
                      {cat.count}
                    </motion.text>
                  </g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show key */}
        <AnimatePresence>
          {isVisible('key') && showKey !== false && (
            <motion.g
              data-testid="pg-key"
              initial="hidden"
              animate={isCurrent('key') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={padding.left}
                y={height - 40}
                width={200}
                height={28}
                rx={14}
                fill={diagram.colors.bg}
                stroke={diagram.colors.primary}
                strokeWidth={1.5}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />

              {/* Key icon */}
              {renderIcon(
                categories[0]?.icon || 'circle',
                padding.left + 24,
                height - 26,
                16,
                diagram.colors.primary
              )}

              <motion.text
                data-testid="pg-key-label"
                x={padding.left + 42}
                y={height - 22}
                textAnchor="start"
                style={{ fontSize: 13, fill: diagram.colors.primary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {symbolValue === 1
                  ? (language === 'he' ? '= 1' : '= 1')
                  : (language === 'he' ? `= ${symbolValue}` : `= ${symbolValue}`)}
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

export default PictureGraph
