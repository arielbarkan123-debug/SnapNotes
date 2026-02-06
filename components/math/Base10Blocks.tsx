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
import type { Base10BlocksData } from '@/types/math'

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  number: { en: 'Show the number', he: '\u05D4\u05E6\u05D2\u05EA \u05D4\u05DE\u05E1\u05E4\u05E8' },
  decompose: { en: 'Decompose into blocks', he: '\u05E4\u05D9\u05E8\u05D5\u05E7 \u05DC\u05D1\u05DC\u05D5\u05E7\u05D9\u05DD' },
  blocks: { en: 'Show individual blocks', he: '\u05D4\u05E6\u05D2\u05EA \u05D1\u05DC\u05D5\u05E7\u05D9\u05DD' },
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Base10BlocksProps {
  data: Base10BlocksData
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
// Block rendering helpers
// ---------------------------------------------------------------------------

function renderUnitCube(
  x: number,
  y: number,
  size: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  key: string,
  delay: number
) {
  return (
    <motion.rect
      key={key}
      data-testid={key}
      x={x}
      y={y}
      width={size}
      height={size}
      rx={2}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20, delay }}
    />
  )
}

function renderRod(
  x: number,
  y: number,
  unitSize: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  key: string,
  delay: number
) {
  // A rod is 10 unit cubes stacked vertically
  const rodW = unitSize
  const rodH = unitSize * 10
  return (
    <motion.g key={key} data-testid={key}>
      <motion.rect
        x={x}
        y={y}
        width={rodW}
        height={rodH}
        rx={2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay, ease: 'easeOut' }}
        style={{ transformOrigin: `${x + rodW / 2}px ${y + rodH}px` }}
      />
      {/* Grid lines to show 10 units */}
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.line
          key={`${key}-line-${i}`}
          x1={x}
          y1={y + (i + 1) * unitSize}
          x2={x + rodW}
          y2={y + (i + 1) * unitSize}
          stroke={stroke}
          strokeWidth={strokeWidth * 0.3}
          strokeOpacity={0.4}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.2 }}
        />
      ))}
    </motion.g>
  )
}

function renderFlat(
  x: number,
  y: number,
  unitSize: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  key: string,
  delay: number
) {
  // A flat is 10x10 unit cubes
  const flatSize = unitSize * 10
  return (
    <motion.g key={key} data-testid={key}>
      <motion.rect
        x={x}
        y={y}
        width={flatSize}
        height={flatSize}
        rx={3}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20, delay }}
      />
      {/* Grid lines */}
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.g key={`${key}-grid-${i}`}>
          <line
            x1={x}
            y1={y + (i + 1) * unitSize}
            x2={x + flatSize}
            y2={y + (i + 1) * unitSize}
            stroke={stroke}
            strokeWidth={strokeWidth * 0.2}
            strokeOpacity={0.3}
          />
          <line
            x1={x + (i + 1) * unitSize}
            y1={y}
            x2={x + (i + 1) * unitSize}
            y2={y + flatSize}
            stroke={stroke}
            strokeWidth={strokeWidth * 0.2}
            strokeOpacity={0.3}
          />
        </motion.g>
      ))}
    </motion.g>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Base10Blocks({
  data,
  subject = 'math',
  complexity = 'elementary',
  language = 'en',
  className = '',
  width = 500,
  height = 350,
  currentStep: externalStep,
  totalSteps: externalTotal,
  onStepComplete,
  stepConfig,
}: Base10BlocksProps) {
  const { number, showDecomposition, title } = data

  // Decompose number
  const decomposition = useMemo(() => {
    const n = Math.abs(Math.round(number))
    return {
      thousands: Math.floor(n / 1000),
      hundreds: Math.floor((n % 1000) / 100),
      tens: Math.floor((n % 100) / 10),
      ones: n % 10,
    }
  }, [number])

  // Step definitions
  const stepDefs = useMemo(
    () => [
      { id: 'number', label: STEP_LABELS.number.en, labelHe: STEP_LABELS.number.he },
      { id: 'decompose', label: STEP_LABELS.decompose.en, labelHe: STEP_LABELS.decompose.he },
      { id: 'blocks', label: STEP_LABELS.blocks.en, labelHe: STEP_LABELS.blocks.he },
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
  const padding = { left: 20, right: 20, top: title ? 55 : 30, bottom: 50 }
  const areaW = width - padding.left - padding.right
  const areaH = height - padding.top - padding.bottom

  // Unit size based on available space (scale to fit)
  const unitSize = Math.min(areaW / 40, areaH / 15, 8)

  // Decomposition text
  const decompText = useMemo(() => {
    const parts: string[] = []
    if (decomposition.thousands > 0) parts.push(`${decomposition.thousands} \u00D7 1000`)
    if (decomposition.hundreds > 0) parts.push(`${decomposition.hundreds} \u00D7 100`)
    if (decomposition.tens > 0) parts.push(`${decomposition.tens} \u00D7 10`)
    if (decomposition.ones > 0) parts.push(`${decomposition.ones} \u00D7 1`)
    return parts.join(' + ')
  }, [decomposition])

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = stepConfig?.[diagram.currentStep]?.stepLabel
    ?? (language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label)

  return (
    <div
      data-testid="base10-blocks"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Base 10 blocks for ${number}${title ? `: ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="b10-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="b10-title"
            x={width / 2}
            y={28}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 18 }}
          >
            {title}
          </text>
        )}

        {/* Step 0: Show number */}
        <AnimatePresence>
          {isVisible('number') && (
            <motion.g
              data-testid="b10-number"
              initial="hidden"
              animate={isCurrent('number') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                data-testid="b10-number-display"
                x={width / 2}
                y={padding.top + 10}
                textAnchor="middle"
                className="font-bold"
                style={{ fontSize: 36, fill: diagram.colors.primary }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                {number}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Show decomposition */}
        <AnimatePresence>
          {isVisible('decompose') && showDecomposition && (
            <motion.g
              data-testid="b10-decomposition"
              initial="hidden"
              animate={isCurrent('decompose') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                data-testid="b10-decomp-text"
                x={width / 2}
                y={padding.top + 40}
                textAnchor="middle"
                style={{ fontSize: 15, fill: diagram.colors.accent }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {decompText}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show blocks */}
        <AnimatePresence>
          {isVisible('blocks') && (
            <motion.g
              data-testid="b10-blocks-group"
              initial="hidden"
              animate={isCurrent('blocks') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Render blocks from left to right: thousands (cubes), hundreds (flats), tens (rods), ones (unit cubes) */}
              {(() => {
                const elements: JSX.Element[] = []
                let xOffset = padding.left + 10
                const blockY = padding.top + 60
                let delayBase = 0

                // Thousands (show as big labeled blocks since 3D is complex in SVG)
                for (let i = 0; i < decomposition.thousands; i++) {
                  const cubeSize = unitSize * 10
                  elements.push(
                    <motion.g key={`thousand-${i}`} data-testid={`b10-thousand-${i}`}>
                      <motion.rect
                        x={xOffset}
                        y={blockY}
                        width={cubeSize}
                        height={cubeSize}
                        rx={3}
                        fill={diagram.colors.primary}
                        fillOpacity={0.3}
                        stroke={diagram.colors.primary}
                        strokeWidth={diagram.lineWeight}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20, delay: delayBase + i * 0.15 }}
                      />
                      <motion.text
                        x={xOffset + cubeSize / 2}
                        y={blockY + cubeSize / 2 + 6}
                        textAnchor="middle"
                        className="font-bold"
                        style={{ fontSize: 14, fill: diagram.colors.primary }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: delayBase + i * 0.15 + 0.1 }}
                      >
                        1000
                      </motion.text>
                    </motion.g>
                  )
                  xOffset += cubeSize + 8
                }
                delayBase += decomposition.thousands * 0.15

                // Hundreds (flats)
                for (let i = 0; i < decomposition.hundreds; i++) {
                  elements.push(
                    renderFlat(
                      xOffset,
                      blockY,
                      unitSize,
                      diagram.colors.accent + '33',
                      diagram.colors.accent,
                      diagram.lineWeight,
                      `b10-hundred-${i}`,
                      delayBase + i * 0.12
                    )
                  )
                  xOffset += unitSize * 10 + 6
                }
                delayBase += decomposition.hundreds * 0.12

                // Tens (rods)
                for (let i = 0; i < decomposition.tens; i++) {
                  elements.push(
                    renderRod(
                      xOffset,
                      blockY,
                      unitSize,
                      diagram.colors.highlight + '55',
                      diagram.colors.primary,
                      diagram.lineWeight * 0.75,
                      `b10-ten-${i}`,
                      delayBase + i * 0.1
                    )
                  )
                  xOffset += unitSize + 4
                }
                delayBase += decomposition.tens * 0.1

                // Some spacing before ones
                xOffset += 8

                // Ones (unit cubes)
                for (let i = 0; i < decomposition.ones; i++) {
                  const row = Math.floor(i / 3)
                  const col = i % 3
                  elements.push(
                    renderUnitCube(
                      xOffset + col * (unitSize + 3),
                      blockY + row * (unitSize + 3),
                      unitSize,
                      diagram.colors.light,
                      diagram.colors.primary,
                      diagram.lineWeight * 0.5,
                      `b10-one-${i}`,
                      delayBase + i * 0.08
                    )
                  )
                }

                return elements
              })()}

              {/* Labels below blocks */}
              <motion.g
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.8 }}
              >
                <text
                  data-testid="b10-blocks-summary"
                  x={width / 2}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  style={{ fontSize: 13, fill: diagram.colors.accent }}
                >
                  {decomposition.thousands > 0 && `${decomposition.thousands} cube${decomposition.thousands > 1 ? 's' : ''}  `}
                  {decomposition.hundreds > 0 && `${decomposition.hundreds} flat${decomposition.hundreds > 1 ? 's' : ''}  `}
                  {decomposition.tens > 0 && `${decomposition.tens} rod${decomposition.tens > 1 ? 's' : ''}  `}
                  {decomposition.ones > 0 && `${decomposition.ones} unit${decomposition.ones > 1 ? 's' : ''}`}
                </text>
              </motion.g>
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

export default Base10Blocks
