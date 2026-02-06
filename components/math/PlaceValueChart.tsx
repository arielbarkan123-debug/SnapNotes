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
import type { PlaceValueChartData } from '@/types/math'

// ---------------------------------------------------------------------------
// Column display config
// ---------------------------------------------------------------------------

const COLUMN_CONFIG: Record<string, { en: string; he: string; abbr: string }> = {
  ones: { en: 'Ones', he: '\u05D0\u05D7\u05D3\u05D5\u05EA', abbr: '1s' },
  tens: { en: 'Tens', he: '\u05E2\u05E9\u05E8\u05D5\u05EA', abbr: '10s' },
  hundreds: { en: 'Hundreds', he: '\u05DE\u05D0\u05D5\u05EA', abbr: '100s' },
  thousands: { en: 'Thousands', he: '\u05D0\u05DC\u05E4\u05D9\u05DD', abbr: '1000s' },
  ten_thousands: { en: 'Ten Thousands', he: '\u05E2\u05E9\u05E8\u05D5\u05EA \u05D0\u05DC\u05E4\u05D9\u05DD', abbr: '10000s' },
}

const PLACE_DIVISORS: Record<string, number> = {
  ones: 1,
  tens: 10,
  hundreds: 100,
  thousands: 1000,
  ten_thousands: 10000,
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  headers: { en: 'Show column headers', he: '\u05D4\u05E6\u05D2\u05EA \u05DB\u05D5\u05EA\u05E8\u05D5\u05EA' },
  digits: { en: 'Show digits', he: '\u05D4\u05E6\u05D2\u05EA \u05E1\u05E4\u05E8\u05D5\u05EA' },
  expanded: { en: 'Show expanded form', he: '\u05D4\u05E6\u05D2\u05EA \u05E6\u05D5\u05E8\u05D4 \u05DE\u05E4\u05D5\u05E8\u05E7\u05EA' },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlaceValueChartProps {
  data: PlaceValueChartData
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

export function PlaceValueChart({
  data,
  subject = 'math',
  complexity = 'elementary',
  language = 'en',
  className = '',
  width = 450,
  height = 280,
  currentStep: externalStep,
  totalSteps: externalTotal,
  onStepComplete,
  stepConfig,
}: PlaceValueChartProps) {
  const { number, columns, showExpanded, title, highlightColumn } = data

  // Extract digit for each column
  const digitValues = useMemo(() => {
    const result: Record<string, number> = {}
    columns.forEach((col) => {
      const divisor = PLACE_DIVISORS[col] || 1
      result[col] = Math.floor(Math.abs(number) / divisor) % 10
    })
    return result
  }, [number, columns])

  // Step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'headers', label: STEP_LABELS.headers.en, labelHe: STEP_LABELS.headers.he },
      { id: 'digits', label: STEP_LABELS.digits.en, labelHe: STEP_LABELS.digits.he },
    ]
    if (showExpanded) {
      defs.push({ id: 'expanded', label: STEP_LABELS.expanded.en, labelHe: STEP_LABELS.expanded.he })
    }
    return defs
  }, [showExpanded])

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

  // Layout - columns are ordered from highest to lowest place value (left to right)
  const orderedColumns = useMemo(
    () =>
      [...columns].sort(
        (a, b) => (PLACE_DIVISORS[b] || 0) - (PLACE_DIVISORS[a] || 0)
      ),
    [columns]
  )

  const padding = { left: 30, right: 30, top: title ? 55 : 30, bottom: 60 }
  const tableW = width - padding.left - padding.right
  const colW = tableW / orderedColumns.length
  const headerH = 40
  const digitH = 60
  const tableTop = padding.top

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = stepConfig?.[diagram.currentStep]?.stepLabel
    ?? (language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label)

  // Expanded form string
  const expandedForm = useMemo(() => {
    const parts: string[] = []
    orderedColumns.forEach((col) => {
      const digit = digitValues[col]
      const divisor = PLACE_DIVISORS[col]
      if (digit > 0) {
        parts.push(`${digit} \u00D7 ${divisor}`)
      }
    })
    return parts.length > 0 ? parts.join(' + ') + ` = ${number}` : `${number}`
  }, [orderedColumns, digitValues, number])

  return (
    <div
      data-testid="place-value-chart"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Place value chart for ${number}${title ? `: ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="pvc-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="pvc-title"
            x={width / 2}
            y={28}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 18 }}
          >
            {title}
          </text>
        )}

        {/* Number display */}
        <text
          data-testid="pvc-number"
          x={width / 2}
          y={title ? 48 : 22}
          textAnchor="middle"
          className="font-bold"
          style={{ fontSize: 14, fill: diagram.colors.accent }}
        >
          {number}
        </text>

        {/* Step 0: Column headers */}
        <AnimatePresence>
          {isVisible('headers') && (
            <motion.g
              data-testid="pvc-headers"
              initial="hidden"
              animate={isCurrent('headers') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {orderedColumns.map((col, i) => {
                const x = padding.left + i * colW
                const isHighlighted = highlightColumn === col
                const colConfig = COLUMN_CONFIG[col]

                return (
                  <motion.g
                    key={`header-${col}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.1, 1.5) }}
                  >
                    {/* Column header background */}
                    <rect
                      data-testid={`pvc-header-${col}`}
                      x={x + 2}
                      y={tableTop}
                      width={colW - 4}
                      height={headerH}
                      rx={4}
                      fill={isHighlighted ? diagram.colors.primary : diagram.colors.bg}
                      stroke={diagram.colors.primary}
                      strokeWidth={diagram.lineWeight * 0.5}
                    />

                    {/* Column header text */}
                    <text
                      x={x + colW / 2}
                      y={tableTop + headerH / 2 + 5}
                      textAnchor="middle"
                      className="font-semibold"
                      style={{
                        fontSize: 13,
                        fill: isHighlighted ? '#ffffff' : diagram.colors.primary,
                      }}
                    >
                      {language === 'he' ? colConfig?.he : colConfig?.en}
                    </text>

                    {/* Column divider */}
                    <motion.line
                      x1={x + colW}
                      y1={tableTop}
                      x2={x + colW}
                      y2={tableTop + headerH + digitH}
                      stroke={diagram.colors.light}
                      strokeWidth={1}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                  </motion.g>
                )
              })}

              {/* Table border */}
              <rect
                x={padding.left}
                y={tableTop}
                width={tableW}
                height={headerH + digitH}
                rx={6}
                fill="none"
                stroke={diagram.colors.primary}
                strokeWidth={diagram.lineWeight}
              />

              {/* Header/digit divider */}
              <line
                x1={padding.left}
                y1={tableTop + headerH}
                x2={padding.left + tableW}
                y2={tableTop + headerH}
                stroke={diagram.colors.primary}
                strokeWidth={diagram.lineWeight * 0.5}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Show digits */}
        <AnimatePresence>
          {isVisible('digits') && (
            <motion.g
              data-testid="pvc-digits"
              initial="hidden"
              animate={isCurrent('digits') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {orderedColumns.map((col, i) => {
                const x = padding.left + i * colW
                const digit = digitValues[col]
                const isHighlighted = highlightColumn === col

                return (
                  <motion.text
                    key={`digit-${col}`}
                    data-testid={`pvc-digit-${col}`}
                    x={x + colW / 2}
                    y={tableTop + headerH + digitH / 2 + 10}
                    textAnchor="middle"
                    className="font-bold"
                    style={{
                      fontSize: 32,
                      fill: isHighlighted ? diagram.colors.primary : diagram.colors.dark,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 20,
                      delay: Math.min(i * 0.15, 1.5),
                    }}
                  >
                    {digit}
                  </motion.text>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Expanded form */}
        <AnimatePresence>
          {showExpanded && isVisible('expanded') && (
            <motion.g
              data-testid="pvc-expanded"
              initial="hidden"
              animate={isCurrent('expanded') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={padding.left}
                y={height - 48}
                width={tableW}
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
                data-testid="pvc-expanded-form"
                x={width / 2}
                y={height - 28}
                textAnchor="middle"
                className="font-semibold"
                style={{ fontSize: 14, fill: diagram.colors.primary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {expandedForm}
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

export default PlaceValueChart
