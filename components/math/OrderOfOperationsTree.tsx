'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OrderOfOperationsTreeData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
  lineDrawVariants,
} from '@/lib/diagram-animations'
import { hexToRgba } from '@/lib/diagram-theme'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderOfOperationsTreeProps {
  data: OrderOfOperationsTreeData
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
// Constants
// ---------------------------------------------------------------------------

const NODE_RADIUS = 22
const NODE_COLORS = [
  '#6366f1', '#f59e0b', '#22c55e', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrderOfOperationsTree({
  data,
  className = '',
  width = 500,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: OrderOfOperationsTreeProps) {
  const { expression, steps, title } = data

  // Steps: step 0 = show expression, steps 1..N = each operation, final = final answer
  const totalOperationSteps = steps.length
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'expression', label: 'Show expression', labelHe: 'הצגת הביטוי' },
    ]
    steps.forEach((step, i) => {
      defs.push({
        id: `op-${i}`,
        label: `Step ${i + 1}: ${step.operation}`,
        labelHe: `שלב ${i + 1}: ${step.operation}`,
      })
    })
    defs.push({
      id: 'final',
      label: 'Final answer',
      labelHe: 'תשובה סופית',
    })
    return defs
  }, [steps])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'elementary',
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

  // Layout: expression at top, tree nodes below
  const expressionY = 50
  const treeStartY = 100
  const treeSpacingY = 70
  const nodeCenterX = width / 2

  // Last result
  const finalResult = steps.length > 0 ? steps[steps.length - 1].result : 0

  return (
    <div
      data-testid="order-of-operations-tree"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Order of operations tree for: ${expression}`}
      >
        {/* Background */}
        <rect
          data-testid="oot-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <motion.text
            data-testid="oot-title"
            x={width / 2}
            y={24}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 16 }}
            initial="hidden"
            animate="visible"
            variants={labelAppearVariants}
          >
            {title}
          </motion.text>
        )}

        {/* Step 0: Show full expression */}
        <AnimatePresence>
          {isVisible('expression') && (
            <motion.g
              data-testid="oot-expression"
              initial="hidden"
              animate={isCurrent('expression') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Expression box */}
              <motion.rect
                x={width / 2 - 150}
                y={expressionY - 18}
                width={300}
                height={36}
                rx={18}
                fill={hexToRgba(primaryColor, 0.1)}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight * 0.6}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              <motion.text
                x={width / 2}
                y={expressionY + 6}
                textAnchor="middle"
                style={{ fontSize: 18, fill: primaryColor, fontWeight: 700, fontFamily: 'monospace' }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {expression}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Steps 1..N: Each operation node */}
        {steps.map((step, i) => {
          const stepId = `op-${i}`
          const nodeY = treeStartY + i * treeSpacingY
          const nodeColor = NODE_COLORS[i % NODE_COLORS.length]
          const isHighlighted = step.highlighted || isCurrent(stepId)

          return (
            <AnimatePresence key={stepId}>
              {isVisible(stepId) && (
                <motion.g
                  data-testid={`oot-step-${i}`}
                  initial="hidden"
                  animate={isHighlighted ? 'spotlight' : 'visible'}
                  variants={spotlight}
                >
                  {/* Connecting line from previous node */}
                  {i === 0 ? (
                    <motion.line
                      x1={nodeCenterX}
                      y1={expressionY + 18}
                      x2={nodeCenterX}
                      y2={nodeY - NODE_RADIUS}
                      stroke="currentColor"
                      strokeWidth={1.5}
                      opacity={0.3}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                  ) : (
                    <motion.line
                      x1={nodeCenterX}
                      y1={nodeY - treeSpacingY + NODE_RADIUS}
                      x2={nodeCenterX}
                      y2={nodeY - NODE_RADIUS}
                      stroke="currentColor"
                      strokeWidth={1.5}
                      opacity={0.3}
                      initial="hidden"
                      animate="visible"
                      variants={lineDrawVariants}
                    />
                  )}

                  {/* Node circle with spotlight effect */}
                  {isHighlighted && (
                    <motion.circle
                      cx={nodeCenterX}
                      cy={nodeY}
                      r={NODE_RADIUS + 6}
                      fill="none"
                      stroke={nodeColor}
                      strokeWidth={2}
                      opacity={0.3}
                      initial={{ scale: 0 }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}

                  <motion.circle
                    cx={nodeCenterX}
                    cy={nodeY}
                    r={NODE_RADIUS}
                    fill={hexToRgba(nodeColor, 0.15)}
                    stroke={nodeColor}
                    strokeWidth={diagram.lineWeight * 0.7}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />

                  {/* Result number inside node */}
                  <motion.text
                    x={nodeCenterX}
                    y={nodeY + 5}
                    textAnchor="middle"
                    style={{ fontSize: 14, fill: nodeColor, fontWeight: 700 }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {step.result}
                  </motion.text>

                  {/* Operation label to the right */}
                  <motion.text
                    x={nodeCenterX + NODE_RADIUS + 12}
                    y={nodeY + 5}
                    textAnchor="start"
                    style={{ fontSize: 13, fill: nodeColor, fontWeight: 500, fontFamily: 'monospace' }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {step.operation} = {step.result}
                  </motion.text>

                  {/* Step number to the left */}
                  <motion.text
                    x={nodeCenterX - NODE_RADIUS - 12}
                    y={nodeY + 5}
                    textAnchor="end"
                    className="fill-current"
                    style={{ fontSize: 11, fontWeight: 500 }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {language === 'he' ? `\u05E9\u05DC\u05D1 ${i + 1}` : `Step ${i + 1}`}
                  </motion.text>
                </motion.g>
              )}
            </AnimatePresence>
          )
        })}

        {/* Final: Show final answer */}
        <AnimatePresence>
          {isVisible('final') && (
            <motion.g
              data-testid="oot-final"
              initial="hidden"
              animate={isCurrent('final') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Line from last operation to final */}
              {totalOperationSteps > 0 && (
                <motion.line
                  x1={nodeCenterX}
                  y1={treeStartY + (totalOperationSteps - 1) * treeSpacingY + NODE_RADIUS}
                  x2={nodeCenterX}
                  y2={treeStartY + totalOperationSteps * treeSpacingY - NODE_RADIUS - 4}
                  stroke="currentColor"
                  strokeWidth={1.5}
                  opacity={0.3}
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                />
              )}

              {/* Final answer box */}
              <motion.rect
                x={nodeCenterX - 60}
                y={treeStartY + totalOperationSteps * treeSpacingY - NODE_RADIUS - 4}
                width={120}
                height={40}
                rx={20}
                fill={hexToRgba('#22c55e', 0.15)}
                stroke="#22c55e"
                strokeWidth={diagram.lineWeight}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              <motion.text
                data-testid="oot-final-answer"
                x={nodeCenterX}
                y={treeStartY + totalOperationSteps * treeSpacingY + 16 - NODE_RADIUS}
                textAnchor="middle"
                style={{ fontSize: 20, fill: '#22c55e', fontWeight: 700 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                = {finalResult}
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

export default OrderOfOperationsTree
