'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ScaleDrawingData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import { hexToRgba } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScaleDrawingProps {
  data: ScaleDrawingData
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
  original: { en: 'Original shape', he: 'הצורה המקורית' },
  scaleFactor: { en: 'Scale factor', he: 'יחס הקנה מידה' },
  scaled: { en: 'Scaled version', he: 'הגרסה המוקטנת/מוגדלת' },
  measurements: { en: 'Compare measurements', he: 'השוואת מידות' },
}

// ---------------------------------------------------------------------------
// Shape generators
// ---------------------------------------------------------------------------

function generateRectangle(
  cx: number, cy: number, w: number, h: number
): string {
  const x = cx - w / 2
  const y = cy - h / 2
  return `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`
}

function generateTriangle(
  cx: number, cy: number, base: number, height: number
): string {
  const halfBase = base / 2
  return `M${cx},${cy - height / 2} L${cx + halfBase},${cy + height / 2} L${cx - halfBase},${cy + height / 2} Z`
}

function generatePolygon(
  cx: number, cy: number, dims: Record<string, number>, sides: number = 5
): string {
  const radius = (dims.side ?? 40) * 0.8
  const points: string[] = []
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`)
  }
  return `M${points.join(' L')} Z`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScaleDrawing({
  data,
  className = '',
  width = 550,
  height = 300,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: ScaleDrawingProps) {
  const { scaleFactor, originalDimensions, scaledDimensions, shape, title } = data

  const stepDefs = useMemo(() => [
    { id: 'original', label: STEP_LABELS.original.en, labelHe: STEP_LABELS.original.he },
    { id: 'scaleFactor', label: STEP_LABELS.scaleFactor.en, labelHe: STEP_LABELS.scaleFactor.he },
    { id: 'scaled', label: STEP_LABELS.scaled.en, labelHe: STEP_LABELS.scaled.he },
    { id: 'measurements', label: STEP_LABELS.measurements.en, labelHe: STEP_LABELS.measurements.he },
  ], [])

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

  const svgWidth = width
  const svgHeight = height
  const leftCx = svgWidth * 0.25
  const rightCx = svgWidth * 0.72
  const centerY = svgHeight * 0.48

  // Compute drawable sizes (normalize to fit SVG)
  const maxDim = Math.max(
    ...Object.values(originalDimensions),
    ...Object.values(scaledDimensions)
  )
  const unitSize = Math.min(80, (svgHeight * 0.5) / (maxDim || 1)) * (maxDim > 0 ? 1 : 1)

  // Shape paths
  const originalPath = useMemo(() => {
    const w = (originalDimensions.width ?? originalDimensions.base ?? 40) * Math.min(unitSize, 2)
    const h = (originalDimensions.height ?? originalDimensions.side ?? 40) * Math.min(unitSize, 2)
    switch (shape) {
      case 'rectangle':
        return generateRectangle(leftCx, centerY, Math.min(w, 100), Math.min(h, 80))
      case 'triangle':
        return generateTriangle(leftCx, centerY, Math.min(w, 100), Math.min(h, 80))
      case 'polygon':
        return generatePolygon(leftCx, centerY, originalDimensions)
      default:
        return generateRectangle(leftCx, centerY, Math.min(w, 100), Math.min(h, 80))
    }
  }, [shape, originalDimensions, leftCx, centerY, unitSize])

  const scaledPath = useMemo(() => {
    const w = (scaledDimensions.width ?? scaledDimensions.base ?? 40) * Math.min(unitSize, 2)
    const h = (scaledDimensions.height ?? scaledDimensions.side ?? 40) * Math.min(unitSize, 2)
    switch (shape) {
      case 'rectangle':
        return generateRectangle(rightCx, centerY, Math.min(w, 140), Math.min(h, 110))
      case 'triangle':
        return generateTriangle(rightCx, centerY, Math.min(w, 140), Math.min(h, 110))
      case 'polygon':
        return generatePolygon(rightCx, centerY, scaledDimensions)
      default:
        return generateRectangle(rightCx, centerY, Math.min(w, 140), Math.min(h, 110))
    }
  }, [shape, scaledDimensions, rightCx, centerY, unitSize])

  // Dimension labels
  const originalLabels = Object.entries(originalDimensions)
  const scaledLabels = Object.entries(scaledDimensions)

  return (
    <div
      data-testid="scale-drawing"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="sd-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="sd-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Original shape with measurements */}
        <AnimatePresence>
          {isVisible('original') && (
            <motion.g
              data-testid="sd-original"
              initial="hidden"
              animate={isCurrent('original') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={originalPath}
                fill={hexToRgba(primaryColor, 0.1)}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              />
              <text
                x={leftCx}
                y={svgHeight - 10}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill={primaryColor}
              >
                {language === 'he' ? 'מקורי' : 'Original'}
              </text>

              {/* Original dimension labels */}
              {originalLabels.map(([key, value], i) => (
                <motion.text
                  key={`orig-${key}`}
                  x={leftCx - 60 + i * 40}
                  y={centerY + 60 + i * 16}
                  textAnchor="start"
                  fontSize={11}
                  fill={primaryColor}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {key}: {value}
                </motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Scale factor */}
        <AnimatePresence>
          {isVisible('scaleFactor') && (
            <motion.g
              data-testid="sd-scale-factor"
              initial="hidden"
              animate={isCurrent('scaleFactor') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Arrow from original to scaled */}
              <motion.line
                x1={leftCx + 60}
                y1={30}
                x2={rightCx - 60}
                y2={30}
                stroke="#9ca3af"
                strokeWidth={2}
                markerEnd="url(#scale-arrow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              />
              <defs>
                <marker
                  id="scale-arrow"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
                </marker>
              </defs>

              {/* Scale factor label */}
              <motion.g initial="hidden" animate="visible" variants={labelAppearVariants}>
                <rect
                  x={(leftCx + rightCx) / 2 - 40}
                  y={16}
                  width={80}
                  height={28}
                  rx={14}
                  fill={accentColor}
                />
                <text
                  x={(leftCx + rightCx) / 2}
                  y={35}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={700}
                  fill="#ffffff"
                >
                  {'\u00D7'}{scaleFactor}
                </text>
              </motion.g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Scaled version */}
        <AnimatePresence>
          {isVisible('scaled') && (
            <motion.g
              data-testid="sd-scaled"
              initial="hidden"
              animate={isCurrent('scaled') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={scaledPath}
                fill={hexToRgba(accentColor, 0.1)}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              />
              <text
                x={rightCx}
                y={svgHeight - 10}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill={accentColor}
              >
                {language === 'he' ? 'מוקטן/מוגדל' : 'Scaled'}
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Corresponding measurements with connecting lines */}
        <AnimatePresence>
          {isVisible('measurements') && (
            <motion.g
              data-testid="sd-measurements"
              initial="hidden"
              animate={isCurrent('measurements') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Scaled dimension labels */}
              {scaledLabels.map(([key, value], i) => (
                <motion.text
                  key={`scaled-${key}`}
                  x={rightCx - 60 + i * 40}
                  y={centerY + 60 + i * 16}
                  textAnchor="start"
                  fontSize={11}
                  fill={accentColor}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {key}: {value}
                </motion.text>
              ))}

              {/* Connecting dashed lines between corresponding parts */}
              {originalLabels.map(([, ], i) => {
                const y1 = centerY + 55 + i * 16
                return (
                  <motion.line
                    key={`connect-${i}`}
                    x1={leftCx + 30}
                    y1={y1}
                    x2={rightCx - 70}
                    y2={y1}
                    stroke="#d1d5db"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    transition={{ delay: i * 0.15 }}
                  />
                )
              })}
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

export default ScaleDrawing
