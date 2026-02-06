'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PythagoreanTheoremDiagramData } from '@/types/math'
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

interface PythagoreanTheoremDiagramProps {
  data: PythagoreanTheoremDiagramData
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
  triangle: { en: 'Draw right triangle', he: 'ציור משולש ישר-זווית' },
  squareA: { en: 'Draw square on side a', he: 'ציור ריבוע על צלע a' },
  squareB: { en: 'Draw square on side b', he: 'ציור ריבוע על צלע b' },
  squareC: { en: 'Draw square on hypotenuse', he: 'ציור ריבוע על היתר' },
  equation: { en: 'Show a² + b² = c²', he: 'הצגת a² + b² = c²' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PythagoreanTheoremDiagram({
  data,
  className = '',
  width = 450,
  height = 450,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: PythagoreanTheoremDiagramProps) {
  const { sideA, sideB, hypotenuse, title } = data

  // Build step definitions
  const stepDefs = useMemo(() => {
    return [
      { id: 'triangle', label: STEP_LABELS.triangle.en, labelHe: STEP_LABELS.triangle.he },
      { id: 'squareA', label: STEP_LABELS.squareA.en, labelHe: STEP_LABELS.squareA.he },
      { id: 'squareB', label: STEP_LABELS.squareB.en, labelHe: STEP_LABELS.squareB.he },
      { id: 'squareC', label: STEP_LABELS.squareC.en, labelHe: STEP_LABELS.squareC.he },
      { id: 'equation', label: STEP_LABELS.equation.en, labelHe: STEP_LABELS.equation.he },
    ]
  }, [])

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

  const primaryColor = diagram.colors.primary
  const accentColor = diagram.colors.accent
  const spotlight = useMemo(() => createSpotlightVariants(primaryColor), [primaryColor])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Geometry layout
  // Scale factor to fit the triangle and squares in the SVG
  const maxSide = Math.max(sideA, sideB, hypotenuse)
  const scale = (Math.min(width, height) * 0.28) / maxSide

  const a = sideA * scale
  const b = sideB * scale
  const c = hypotenuse * scale

  // Triangle vertices: right angle at bottom-left
  // A = bottom-left (right angle), B = bottom-right, C = top-left
  const triAx = width * 0.35
  const triAy = height * 0.65
  const triBx = triAx + b
  const triBy = triAy
  const triCx = triAx
  const triCy = triAy - a

  // Square on side a (vertical side, left)
  const sqAPoints = `${triCx},${triCy} ${triCx - a},${triCy} ${triCx - a},${triAy} ${triAx},${triAy}`

  // Square on side b (horizontal side, bottom)
  const sqBPoints = `${triAx},${triAy} ${triBx},${triAy} ${triBx},${triAy + b} ${triAx},${triAy + b}`

  // Square on hypotenuse (side c)
  // The hypotenuse goes from C to B
  // Normal direction for the square
  const dx = triBx - triCx
  const dy = triBy - triCy
  const len = Math.sqrt(dx * dx + dy * dy)
  const nx = -dy / len * c
  const ny = dx / len * c

  const sqCx1 = triCx
  const sqCy1 = triCy
  const sqCx2 = triBx
  const sqCy2 = triBy
  const sqCx3 = triBx + nx
  const sqCy3 = triBy + ny
  const sqCx4 = triCx + nx
  const sqCy4 = triCy + ny
  const sqCPoints = `${sqCx1},${sqCy1} ${sqCx2},${sqCy2} ${sqCx3},${sqCy3} ${sqCx4},${sqCy4}`

  return (
    <div
      data-testid="pythagorean-theorem-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-2 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="ptd-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-2"
        >
          {title}
        </div>
      )}

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Pythagorean theorem: ${sideA}² + ${sideB}² = ${hypotenuse}²`}
      >
        {/* Background */}
        <rect
          data-testid="ptd-background"
          x={0}
          y={0}
          width={width}
          height={height}
          fill="white"
          className="dark:fill-gray-900"
        />

        {/* Step 0: Draw right triangle */}
        <AnimatePresence>
          {isVisible('triangle') && (
            <motion.g
              data-testid="ptd-triangle"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.polygon
                points={`${triAx},${triAy} ${triBx},${triBy} ${triCx},${triCy}`}
                fill="none"
                stroke="#374151"
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                variants={lineDrawVariants}
              />

              {/* Right angle marker */}
              <rect
                x={triAx}
                y={triAy - 12}
                width={12}
                height={12}
                fill="none"
                stroke="#6b7280"
                strokeWidth={1.5}
              />

              {/* Side labels */}
              <motion.text
                data-testid="ptd-label-a"
                x={triAx - 14}
                y={(triAy + triCy) / 2 + 4}
                textAnchor="end"
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={14}
                fontWeight={700}
                variants={labelAppearVariants}
              >
                a = {sideA}
              </motion.text>
              <motion.text
                data-testid="ptd-label-b"
                x={(triAx + triBx) / 2}
                y={triAy + 20}
                textAnchor="middle"
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={14}
                fontWeight={700}
                variants={labelAppearVariants}
              >
                b = {sideB}
              </motion.text>
              <motion.text
                data-testid="ptd-label-c"
                x={(triCx + triBx) / 2 + 10}
                y={(triCy + triBy) / 2 - 8}
                textAnchor="start"
                className="fill-gray-700 dark:fill-gray-300"
                fontSize={14}
                fontWeight={700}
                variants={labelAppearVariants}
              >
                c = {hypotenuse}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Square on side a */}
        <AnimatePresence>
          {isVisible('squareA') && (
            <motion.g
              data-testid="ptd-square-a"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.polygon
                points={sqAPoints}
                fill={`${primaryColor}25`}
                stroke={primaryColor}
                strokeWidth={2}
                strokeLinejoin="round"
                variants={lineDrawVariants}
              />
              <motion.text
                x={triCx - a / 2}
                y={(triCy + triAy) / 2 + 4}
                textAnchor="middle"
                fill={primaryColor}
                fontSize={13}
                fontWeight={700}
                variants={labelAppearVariants}
              >
                a² = {sideA * sideA}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Square on side b */}
        <AnimatePresence>
          {isVisible('squareB') && (
            <motion.g
              data-testid="ptd-square-b"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.polygon
                points={sqBPoints}
                fill={`${accentColor}25`}
                stroke={accentColor}
                strokeWidth={2}
                strokeLinejoin="round"
                variants={lineDrawVariants}
              />
              <motion.text
                x={(triAx + triBx) / 2}
                y={triAy + b / 2 + 4}
                textAnchor="middle"
                fill={accentColor}
                fontSize={13}
                fontWeight={700}
                variants={labelAppearVariants}
              >
                b² = {sideB * sideB}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Square on hypotenuse */}
        <AnimatePresence>
          {isVisible('squareC') && (
            <motion.g
              data-testid="ptd-square-c"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.polygon
                points={sqCPoints}
                fill="#22c55e25"
                stroke="#22c55e"
                strokeWidth={2}
                strokeLinejoin="round"
                variants={lineDrawVariants}
              />
              <motion.text
                x={(sqCx1 + sqCx2 + sqCx3 + sqCx4) / 4}
                y={(sqCy1 + sqCy2 + sqCy3 + sqCy4) / 4 + 4}
                textAnchor="middle"
                fill="#22c55e"
                fontSize={13}
                fontWeight={700}
                variants={labelAppearVariants}
              >
                c² = {hypotenuse * hypotenuse}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Equation */}
        <AnimatePresence>
          {isVisible('equation') && (
            <motion.g
              data-testid="ptd-equation"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.rect
                x={width / 2 - 110}
                y={10}
                width={220}
                height={34}
                rx={8}
                fill={primaryColor}
                opacity={0.9}
                variants={labelAppearVariants}
              />
              <motion.text
                data-testid="ptd-equation-text"
                x={width / 2}
                y={32}
                textAnchor="middle"
                fill="white"
                fontSize={16}
                fontWeight={800}
                variants={labelAppearVariants}
              >
                {sideA}² + {sideB}² = {hypotenuse}²  →  {sideA * sideA} + {sideB * sideB} = {hypotenuse * hypotenuse}
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

export default PythagoreanTheoremDiagram
