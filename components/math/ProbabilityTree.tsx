'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ProbabilityTreeData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
  createPathDrawVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProbabilityTreeProps {
  data: ProbabilityTreeData
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
  root: { en: 'Starting point', he: 'נקודת ההתחלה' },
  level1: { en: 'First event branches', he: 'ענפי האירוע הראשון' },
  level2: { en: 'Second event branches', he: 'ענפי האירוע השני' },
  outcomes: { en: 'Outcome probabilities', he: 'הסתברויות התוצאות' },
}

// ---------------------------------------------------------------------------
// Branch colors
// ---------------------------------------------------------------------------

const BRANCH_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProbabilityTree({
  data,
  className = '',
  width = 550,
  height = 350,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: ProbabilityTreeProps) {
  const { levels, outcomes, title, highlightPath } = data

  const hasSecondLevel = levels.length >= 2
  const hasOutcomes = !!(outcomes && outcomes.length > 0)

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'root', label: STEP_LABELS.root.en, labelHe: STEP_LABELS.root.he },
      { id: 'level1', label: STEP_LABELS.level1.en, labelHe: STEP_LABELS.level1.he },
    ]
    if (hasSecondLevel) {
      defs.push({ id: 'level2', label: STEP_LABELS.level2.en, labelHe: STEP_LABELS.level2.he })
    }
    if (hasOutcomes) {
      defs.push({ id: 'outcomes', label: STEP_LABELS.outcomes.en, labelHe: STEP_LABELS.outcomes.he })
    }
    return defs
  }, [hasSecondLevel, hasOutcomes])

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

  const pathDraw = useMemo(() => createPathDrawVariants(0.6), [])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Layout calculations
  const svgWidth = width
  const svgHeight = height
  const rootX = 40
  const rootY = svgHeight / 2
  const level1X = svgWidth * 0.35
  const level2X = svgWidth * 0.65
  const outcomeX = svgWidth * 0.88

  // Calculate level 1 positions
  const level1Branches = levels[0]?.branches ?? []
  const level1Positions = useMemo(() => {
    const count = level1Branches.length
    const totalHeight = svgHeight - 60
    const spacing = count > 1 ? totalHeight / (count - 1) : 0
    const startY = count > 1 ? 30 : svgHeight / 2
    return level1Branches.map((_, i) => ({
      x: level1X,
      y: startY + i * spacing,
    }))
  }, [level1Branches, svgHeight, level1X])

  // Calculate level 2 positions
  const level2Branches = levels[1]?.branches ?? []
  const level2Positions = useMemo(() => {
    if (!hasSecondLevel) return []
    const positions: Array<{ x: number; y: number; parentIdx: number }> = []
    level1Branches.forEach((branch, parentIdx) => {
      const childIndices = branch.children ?? []
      const parentY = level1Positions[parentIdx]?.y ?? 0
      const subCount = childIndices.length
      const subSpacing = subCount > 1 ? Math.min(60, (svgHeight - 40) / (level1Branches.length * subCount)) : 0
      const subStartY = parentY - ((subCount - 1) * subSpacing) / 2
      childIndices.forEach((childIdx, j) => {
        positions.push({
          x: level2X,
          y: subStartY + j * subSpacing,
          parentIdx,
        })
      })
    })
    return positions
  }, [hasSecondLevel, level1Branches, level1Positions, level2Branches, svgHeight, level2X])

  return (
    <div
      data-testid="probability-tree"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="pt-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="pt-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        height="auto"
        className="overflow-visible"
      >
        {/* Step 0: Root node */}
        <AnimatePresence>
          {isVisible('root') && (
            <motion.g
              data-testid="pt-root"
              initial="hidden"
              animate={isCurrent('root') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <circle
                cx={rootX}
                cy={rootY}
                r={8}
                fill={primaryColor}
                stroke={diagram.colors.dark}
                strokeWidth={diagram.lineWeight}
              />
              <text
                x={rootX}
                y={rootY - 16}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                className="fill-gray-700 dark:fill-gray-300"
              >
                {language === 'he' ? 'התחלה' : 'Start'}
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Level 1 branches */}
        <AnimatePresence>
          {isVisible('level1') && (
            <motion.g
              data-testid="pt-level1"
              initial="hidden"
              animate={isCurrent('level1') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {level1Branches.map((branch, i) => {
                const endPos = level1Positions[i]
                if (!endPos) return null
                const isHighlighted = highlightPath && highlightPath[0] === i
                const color = BRANCH_COLORS[i % BRANCH_COLORS.length]
                return (
                  <g key={`l1-${i}`}>
                    <motion.line
                      x1={rootX + 8}
                      y1={rootY}
                      x2={endPos.x}
                      y2={endPos.y}
                      stroke={isHighlighted ? primaryColor : color}
                      strokeWidth={isHighlighted ? diagram.lineWeight + 1 : diagram.lineWeight}
                      initial="hidden"
                      animate="visible"
                      variants={pathDraw}
                    />
                    {/* Probability label on branch */}
                    <motion.text
                      x={(rootX + 8 + endPos.x) / 2}
                      y={(rootY + endPos.y) / 2 - 8}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={500}
                      fill={color}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {branch.probability}
                    </motion.text>
                    {/* Node */}
                    <circle
                      cx={endPos.x}
                      cy={endPos.y}
                      r={6}
                      fill={color}
                    />
                    {/* Label */}
                    <motion.text
                      x={endPos.x + 10}
                      y={endPos.y + 4}
                      textAnchor="start"
                      fontSize={12}
                      fontWeight={500}
                      className="fill-gray-700 dark:fill-gray-300"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {branch.label}
                    </motion.text>
                  </g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Level 2 branches */}
        {hasSecondLevel && (
          <AnimatePresence>
            {isVisible('level2') && (
              <motion.g
                data-testid="pt-level2"
                initial="hidden"
                animate={isCurrent('level2') ? 'spotlight' : 'visible'}
                variants={spotlight}
              >
                {level2Positions.map((pos, i) => {
                  const parentPos = level1Positions[pos.parentIdx]
                  if (!parentPos) return null
                  const branchData = level2Branches[i]
                  const color = BRANCH_COLORS[(pos.parentIdx + i + 2) % BRANCH_COLORS.length]
                  return (
                    <g key={`l2-${i}`}>
                      <motion.line
                        x1={parentPos.x + 6}
                        y1={parentPos.y}
                        x2={pos.x}
                        y2={pos.y}
                        stroke={color}
                        strokeWidth={diagram.lineWeight}
                        initial="hidden"
                        animate="visible"
                        variants={pathDraw}
                      />
                      {branchData && (
                        <motion.text
                          x={(parentPos.x + 6 + pos.x) / 2}
                          y={(parentPos.y + pos.y) / 2 - 6}
                          textAnchor="middle"
                          fontSize={10}
                          fontWeight={500}
                          fill={color}
                          initial="hidden"
                          animate="visible"
                          variants={labelAppearVariants}
                        >
                          {branchData.probability}
                        </motion.text>
                      )}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={5}
                        fill={color}
                      />
                      {branchData && (
                        <text
                          x={pos.x + 8}
                          y={pos.y + 4}
                          textAnchor="start"
                          fontSize={11}
                          className="fill-gray-700 dark:fill-gray-300"
                        >
                          {branchData.label}
                        </text>
                      )}
                    </g>
                  )
                })}
              </motion.g>
            )}
          </AnimatePresence>
        )}

        {/* Step 3: Outcome probabilities */}
        {hasOutcomes && (
          <AnimatePresence>
            {isVisible('outcomes') && (
              <motion.g
                data-testid="pt-outcomes"
                initial="hidden"
                animate={isCurrent('outcomes') ? 'spotlight' : 'visible'}
                variants={spotlight}
              >
                {outcomes!.map((outcome, i) => {
                  const y = level2Positions[i]?.y ?? (30 + i * 30)
                  return (
                    <motion.g
                      key={`outcome-${i}`}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      <text
                        x={outcomeX}
                        y={y - 6}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#6b7280"
                      >
                        {outcome.path.join(', ')}
                      </text>
                      <text
                        x={outcomeX}
                        y={y + 8}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight={700}
                        fill={primaryColor}
                      >
                        P = {outcome.probability}
                      </text>
                    </motion.g>
                  )
                })}
              </motion.g>
            )}
          </AnimatePresence>
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

export default ProbabilityTree
