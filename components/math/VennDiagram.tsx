'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { VennDiagramData } from '@/types/math'
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

interface VennDiagramProps {
  data: VennDiagramData
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
  circles: { en: 'Draw circles', he: 'ציור עיגולים' },
  labels: { en: 'Label sets', he: 'סימון קבוצות' },
  elements: { en: 'Show elements', he: 'הצגת איברים' },
  intersections: { en: 'Show intersections', he: 'הצגת חיתוכים' },
}

// ---------------------------------------------------------------------------
// Default set colors
// ---------------------------------------------------------------------------

const SET_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VennDiagram({
  data,
  className = '',
  width = 450,
  height = 350,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: VennDiagramProps) {
  const { sets, intersections, universalSet, title } = data

  const hasIntersections = !!(intersections && intersections.length > 0)

  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'circles', label: STEP_LABELS.circles.en, labelHe: STEP_LABELS.circles.he },
      { id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he },
      { id: 'elements', label: STEP_LABELS.elements.en, labelHe: STEP_LABELS.elements.he },
    ]
    if (hasIntersections) {
      defs.push({ id: 'intersections', label: STEP_LABELS.intersections.en, labelHe: STEP_LABELS.intersections.he })
    }
    return defs
  }, [hasIntersections])

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

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Circle layout
  const svgWidth = width
  const svgHeight = height
  const cx = svgWidth / 2
  const cy = svgHeight / 2
  const numSets = Math.min(sets.length, 3)
  const radius = numSets === 1 ? 90 : numSets === 2 ? 85 : 75
  const overlap = radius * 0.55

  // Position circles
  const circlePositions = useMemo(() => {
    if (numSets === 1) {
      return [{ cx, cy }]
    }
    if (numSets === 2) {
      return [
        { cx: cx - overlap / 2, cy },
        { cx: cx + overlap / 2, cy },
      ]
    }
    // 3 circles in equilateral triangle arrangement
    const angle120 = (2 * Math.PI) / 3
    const dist = overlap * 0.6
    return [
      { cx: cx + dist * Math.cos(-Math.PI / 2), cy: cy + dist * Math.sin(-Math.PI / 2) },
      { cx: cx + dist * Math.cos(-Math.PI / 2 + angle120), cy: cy + dist * Math.sin(-Math.PI / 2 + angle120) },
      { cx: cx + dist * Math.cos(-Math.PI / 2 + 2 * angle120), cy: cy + dist * Math.sin(-Math.PI / 2 + 2 * angle120) },
    ]
  }, [numSets, cx, cy, overlap])

  // Get elements only in this set (not in any intersection)
  const getExclusiveElements = (setIndex: number): string[] => {
    const setElements = sets[setIndex]?.elements ?? []
    if (!intersections) return setElements
    const intersectionElements = new Set<string>()
    intersections.forEach((inter) => {
      if (inter.setIndices.includes(setIndex)) {
        inter.elements.forEach((e) => intersectionElements.add(e))
      }
    })
    return setElements.filter((e) => !intersectionElements.has(e))
  }

  return (
    <div
      data-testid="venn-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="vd-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="vd-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        height="auto"
        className="overflow-visible"
      >
        {/* Universal set rectangle */}
        {universalSet && (
          <rect
            x={10}
            y={10}
            width={svgWidth - 20}
            height={svgHeight - 20}
            fill="none"
            stroke="#9ca3af"
            strokeWidth={1}
            strokeDasharray="6 3"
            rx={8}
          />
        )}

        {/* Step 0: Draw circles */}
        <AnimatePresence>
          {isVisible('circles') && (
            <motion.g
              data-testid="vd-circles"
              initial="hidden"
              animate={isCurrent('circles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {sets.slice(0, numSets).map((set, i) => {
                const pos = circlePositions[i]
                const color = set.color || SET_COLORS[i % SET_COLORS.length]
                return (
                  <motion.circle
                    key={`circle-${i}`}
                    cx={pos.cx}
                    cy={pos.cy}
                    r={radius}
                    fill={hexToRgba(color, 0.15)}
                    stroke={color}
                    strokeWidth={diagram.lineWeight}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: i * 0.2, type: 'spring', stiffness: 200, damping: 20 }}
                  />
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Labels */}
        <AnimatePresence>
          {isVisible('labels') && (
            <motion.g
              data-testid="vd-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {sets.slice(0, numSets).map((set, i) => {
                const pos = circlePositions[i]
                const color = set.color || SET_COLORS[i % SET_COLORS.length]
                // Position label outside the circle
                const labelY = numSets <= 2
                  ? pos.cy - radius - 12
                  : i === 0
                    ? pos.cy - radius - 12
                    : pos.cy + radius + 18
                return (
                  <motion.text
                    key={`label-${i}`}
                    x={pos.cx}
                    y={labelY}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight={700}
                    fill={color}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {set.label}
                  </motion.text>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Elements in each region */}
        <AnimatePresence>
          {isVisible('elements') && (
            <motion.g
              data-testid="vd-elements"
              initial="hidden"
              animate={isCurrent('elements') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {sets.slice(0, numSets).map((_, i) => {
                const pos = circlePositions[i]
                const exclusiveElements = getExclusiveElements(i)
                // Offset text slightly away from center
                const offsetX = numSets > 1 ? (pos.cx - cx) * 0.6 : 0
                const offsetY = numSets > 1 ? (pos.cy - cy) * 0.4 : 0
                return exclusiveElements.map((el, j) => (
                  <motion.text
                    key={`el-${i}-${j}`}
                    x={pos.cx + offsetX}
                    y={pos.cy + offsetY + (j - (exclusiveElements.length - 1) / 2) * 18}
                    textAnchor="middle"
                    fontSize={12}
                    className="fill-gray-700 dark:fill-gray-300"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(j * 0.08, 1.5) }}
                  >
                    {el}
                  </motion.text>
                ))
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Intersections */}
        {hasIntersections && (
          <AnimatePresence>
            {isVisible('intersections') && (
              <motion.g
                data-testid="vd-intersections"
                initial="hidden"
                animate={isCurrent('intersections') ? 'spotlight' : 'visible'}
                variants={spotlight}
              >
                {intersections!.map((inter, idx) => {
                  // Place intersection elements at midpoint of involved set centers
                  const involvedPositions = inter.setIndices.map((si) => circlePositions[si]).filter(Boolean)
                  if (involvedPositions.length === 0) return null
                  const midX = involvedPositions.reduce((s, p) => s + p.cx, 0) / involvedPositions.length
                  const midY = involvedPositions.reduce((s, p) => s + p.cy, 0) / involvedPositions.length
                  return inter.elements.map((el, j) => (
                    <motion.text
                      key={`inter-${idx}-${j}`}
                      x={midX}
                      y={midY + (j - (inter.elements.length - 1) / 2) * 18}
                      textAnchor="middle"
                      fontSize={12}
                      fontWeight={600}
                      fill={primaryColor}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(j * 0.1, 1.5), type: 'spring', stiffness: 300, damping: 20 }}
                    >
                      {el}
                    </motion.text>
                  ))
                })}
              </motion.g>
            )}
          </AnimatePresence>
        )}

        {/* Universal set label */}
        {universalSet && isVisible('elements') && (
          <text
            x={svgWidth - 20}
            y={26}
            textAnchor="end"
            fontSize={13}
            fontWeight={600}
            fill="#6b7280"
          >
            U
          </text>
        )}
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

export default VennDiagram
