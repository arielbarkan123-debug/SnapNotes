'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TreeDiagramData, TreeNode, TreeDiagramErrorHighlight } from '@/types'
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

interface TreeDiagramDataWithErrors extends TreeDiagramData {
  errorHighlight?: TreeDiagramErrorHighlight
}

interface TreeDiagramProps {
  data: TreeDiagramDataWithErrors
  className?: string
  /** ViewBox width -- SVG scales responsively to container */
  width?: number
  height?: number
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
  language?: 'en' | 'he'
  /** Override the starting step (defaults to 0 for progressive reveal) */
  initialStep?: number
}

interface NodePosition {
  x: number
  y: number
  node: TreeNode
  level: number
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  root: { en: 'Draw the root', he: '\u05E6\u05D9\u05D5\u05E8 \u05D4\u05E9\u05D5\u05E8\u05E9' },
  probabilities: { en: 'Show probabilities', he: '\u05D4\u05E6\u05D2\u05EA \u05D4\u05E1\u05EA\u05D1\u05E8\u05D5\u05D9\u05D5\u05EA' },
  errors: { en: 'Show corrections', he: '\u05D4\u05E6\u05D2\u05EA \u05EA\u05D9\u05E7\u05D5\u05E0\u05D9\u05DD' },
}

function levelLabel(n: number): { en: string; he: string } {
  return {
    en: `Show level ${n}`,
    he: `\u05D4\u05E6\u05D2\u05EA \u05E8\u05DE\u05D4 ${n}`,
  }
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

function getTreeDepth(node: TreeNode): number {
  if (!node.children?.length) return 1
  return 1 + Math.max(...node.children.map(getTreeDepth))
}

function getTreeWidth(node: TreeNode): number {
  if (!node.children?.length) return 1
  return node.children.reduce((sum, child) => sum + getTreeWidth(child), 0)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * TreeDiagram -- Phase 2 reference implementation for tree visuals.
 *
 * Quality standard checklist:
 * - [x] useDiagramBase hook
 * - [x] DiagramStepControls
 * - [x] pathLength draw animation on edges
 * - [x] Spotlight on current step
 * - [x] Dark/light mode
 * - [x] Responsive width
 * - [x] data-testid attributes
 * - [x] RTL support
 * - [x] Subject-coded colors
 * - [x] Adaptive line weight
 * - [x] Progressive reveal with AnimatePresence + isVisible()
 * - [x] Props: subject?, complexity?, language?, initialStep?
 * - [x] No dead code
 * - [x] Bilingual step labels
 */
export function TreeDiagram({
  data,
  className = '',
  width = 500,
  height = 400,
  subject = 'math',
  complexity = 'middle_school',
  language = 'en',
  initialStep,
}: TreeDiagramProps) {
  const { root, showProbabilities = true, title, errorHighlight } = data

  const treeDepth = useMemo(() => getTreeDepth(root), [root])

  // Determine which step groups exist
  const hasErrors = !!(
    errorHighlight?.wrongNodes?.length ||
    errorHighlight?.wrongPaths?.length ||
    errorHighlight?.correctPath?.length
  )

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'root', label: STEP_LABELS.root.en, labelHe: STEP_LABELS.root.he },
    ]
    // One step per depth level (level 1, level 2, ...)
    for (let lvl = 1; lvl < treeDepth; lvl++) {
      const ll = levelLabel(lvl)
      defs.push({ id: `level-${lvl}`, label: ll.en, labelHe: ll.he })
    }
    if (showProbabilities) {
      defs.push({
        id: 'probabilities',
        label: STEP_LABELS.probabilities.en,
        labelHe: STEP_LABELS.probabilities.he,
      })
    }
    if (hasErrors) {
      defs.push({
        id: 'errors',
        label: STEP_LABELS.errors.en,
        labelHe: STEP_LABELS.errors.he,
      })
    }
    return defs
  }, [treeDepth, showProbabilities, hasErrors])

  // useDiagramBase -- step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Convenience: step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  // Subject-coded spotlight
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary],
  )

  // ---------------------------------------------------------------------------
  // Geometry calculations
  // ---------------------------------------------------------------------------

  const padding = { top: 40, bottom: 30, left: 50, right: 50 }
  const titleHeight = title ? 30 : 0

  const treeWidth = useMemo(() => getTreeWidth(root), [root])
  const availableWidth = width - padding.left - padding.right
  const availableHeight = height - padding.top - padding.bottom - titleHeight
  const levelHeight = availableHeight / Math.max(treeDepth - 1, 1)
  const nodeRadius = 24

  // Calculate all node positions
  const positions: NodePosition[] = useMemo(() => {
    const result: NodePosition[] = []

    const calculatePositions = (
      node: TreeNode,
      level: number,
      startX: number,
      widthAvailable: number,
    ) => {
      const nodeTreeW = getTreeWidth(node)
      const x = startX + widthAvailable / 2
      const y = padding.top + titleHeight + level * levelHeight

      result.push({ x, y, node, level })

      if (node.children?.length) {
        let childStartX = startX
        node.children.forEach((child) => {
          const childW = getTreeWidth(child)
          const childWidthPx = (childW / nodeTreeW) * widthAvailable
          calculatePositions(child, level + 1, childStartX, childWidthPx)
          childStartX += childWidthPx
        })
      }
    }

    calculatePositions(root, 0, padding.left, availableWidth)
    return result
  }, [root, padding.left, padding.top, titleHeight, availableWidth, levelHeight])

  // Find parent position for drawing edges
  const findParentPosition = (childId: string): NodePosition | null => {
    const findInTree = (node: TreeNode, parent: TreeNode | null): TreeNode | null => {
      if (node.id === childId && parent) return parent
      if (node.children) {
        for (const child of node.children) {
          const found = findInTree(child, node)
          if (found) return found
        }
      }
      return null
    }
    const parent = findInTree(root, null)
    if (!parent) return null
    return positions.find((p) => p.node.id === parent.id) || null
  }

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Which tree levels are visible?
  const isLevelVisible = (level: number): boolean => {
    if (level === 0) return isVisible('root')
    return isVisible(`level-${level}`)
  }

  const isLevelCurrent = (level: number): boolean => {
    if (level === 0) return isCurrent('root')
    return isCurrent(`level-${level}`)
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="tree-diagram"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* SVG Diagram */}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Tree diagram${title ? `: ${title}` : ''} with ${treeDepth} levels`}
      >
        {/* Background */}
        <rect
          data-testid="td-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* -- Step 0: Root node ---------------------------------------- */}
        <AnimatePresence>
          {isLevelVisible(0) && (() => {
            const rootPos = positions.find((p) => p.level === 0)
            if (!rootPos) return null
            return (
              <motion.g
                key="root-group"
                data-testid="td-root"
                initial="hidden"
                animate={isLevelCurrent(0) ? 'spotlight' : 'visible'}
                variants={spotlight}
              >
                <circle
                  data-testid={`td-node-${rootPos.node.id}`}
                  cx={rootPos.x}
                  cy={rootPos.y}
                  r={nodeRadius}
                  fill={rootPos.node.highlight ? diagram.colors.primary : 'white'}
                  stroke={rootPos.node.highlight ? diagram.colors.primary : 'currentColor'}
                  strokeWidth={diagram.lineWeight}
                  className={rootPos.node.highlight ? '' : 'dark:fill-gray-800'}
                />
                <text
                  x={rootPos.x}
                  y={rootPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`text-sm font-medium ${rootPos.node.highlight ? 'fill-white' : 'fill-current'}`}
                >
                  {rootPos.node.label}
                </text>
              </motion.g>
            )
          })()}
        </AnimatePresence>

        {/* -- Steps 1..N-1: Tree levels -------------------------------- */}
        {Array.from({ length: treeDepth - 1 }, (_, i) => i + 1).map((lvl) => (
          <AnimatePresence key={`level-group-${lvl}`}>
            {isLevelVisible(lvl) && (
              <motion.g
                data-testid={`td-level-${lvl}`}
                initial="hidden"
                animate={isLevelCurrent(lvl) ? 'spotlight' : 'visible'}
                variants={spotlight}
              >
                {/* Edges from parent to children at this level */}
                {positions
                  .filter((p) => p.level === lvl)
                  .map((pos) => {
                    const parentPos = findParentPosition(pos.node.id)
                    if (!parentPos) return null
                    return (
                      <motion.path
                        key={`edge-${pos.node.id}`}
                        data-testid={`td-edge-${pos.node.id}`}
                        d={`M ${parentPos.x} ${parentPos.y + nodeRadius} L ${pos.x} ${pos.y - nodeRadius}`}
                        stroke="currentColor"
                        strokeWidth={diagram.lineWeight}
                        fill="none"
                        opacity={0.5}
                        initial="hidden"
                        animate="visible"
                        variants={lineDrawVariants}
                      />
                    )
                  })}

                {/* Nodes at this level */}
                {positions
                  .filter((p) => p.level === lvl)
                  .map((pos, index) => {
                    const isHighlighted = pos.node.highlight
                    return (
                      <motion.g
                        key={`node-${pos.node.id}`}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 300,
                          damping: 25,
                          delay: Math.min(index * 0.08, 1.5),
                        }}
                      >
                        <circle
                          data-testid={`td-node-${pos.node.id}`}
                          cx={pos.x}
                          cy={pos.y}
                          r={nodeRadius}
                          fill={isHighlighted ? diagram.colors.primary : 'white'}
                          stroke={isHighlighted ? diagram.colors.primary : 'currentColor'}
                          strokeWidth={diagram.lineWeight}
                          className={isHighlighted ? '' : 'dark:fill-gray-800'}
                        />
                        <motion.text
                          x={pos.x}
                          y={pos.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className={`text-sm font-medium ${isHighlighted ? 'fill-white' : 'fill-current'}`}
                          initial="hidden"
                          animate="visible"
                          variants={labelAppearVariants}
                          transition={{ delay: Math.min(index * 0.08, 1.5) + 0.1 }}
                        >
                          {pos.node.label}
                        </motion.text>
                      </motion.g>
                    )
                  })}
              </motion.g>
            )}
          </AnimatePresence>
        ))}

        {/* -- Probability labels step ---------------------------------- */}
        <AnimatePresence>
          {showProbabilities && isVisible('probabilities') && (
            <motion.g
              data-testid="td-probabilities"
              initial="hidden"
              animate={isCurrent('probabilities') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {positions
                .filter((p) => p.level > 0 && p.node.value)
                .map((pos, index) => {
                  const parentPos = findParentPosition(pos.node.id)
                  if (!parentPos) return null
                  return (
                    <motion.text
                      key={`prob-${pos.node.id}`}
                      data-testid={`td-probability-${pos.node.id}`}
                      x={(parentPos.x + pos.x) / 2 + (pos.x > parentPos.x ? 10 : -10)}
                      y={(parentPos.y + pos.y) / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ fill: diagram.colors.primary }}
                      className="text-xs font-medium"
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                      transition={{ delay: Math.min(index * 0.06, 1.5) }}
                    >
                      {pos.node.value}
                    </motion.text>
                  )
                })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Error highlights step ------------------------------------ */}
        <AnimatePresence>
          {hasErrors && isVisible('errors') && (
            <motion.g
              data-testid="td-errors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Wrong nodes */}
              {errorHighlight?.wrongNodes?.map((nodeId) => {
                const pos = positions.find((p) => p.node.id === nodeId)
                if (!pos) return null
                return (
                  <g key={`wrong-${nodeId}`} data-testid={`td-wrong-${nodeId}`}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={nodeRadius + 4}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth={2}
                      strokeDasharray="4,2"
                    />
                    <line
                      x1={pos.x - 8}
                      y1={pos.y - 8}
                      x2={pos.x + 8}
                      y2={pos.y + 8}
                      stroke="#EF4444"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                    <line
                      x1={pos.x + 8}
                      y1={pos.y - 8}
                      x2={pos.x - 8}
                      y2={pos.y + 8}
                      stroke="#EF4444"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                    {errorHighlight?.corrections?.[nodeId] && (
                      <text
                        x={pos.x}
                        y={pos.y + nodeRadius + 16}
                        textAnchor="middle"
                        style={{ fill: '#EF4444', fontSize: '12px', fontWeight: 500 }}
                      >
                        {errorHighlight.corrections[nodeId]}
                      </text>
                    )}
                  </g>
                )
              })}

              {/* Correct path */}
              {errorHighlight?.correctPath?.map((nodeId) => {
                const pos = positions.find((p) => p.node.id === nodeId)
                if (!pos) return null
                return (
                  <g key={`correct-${nodeId}`} data-testid={`td-correct-${nodeId}`}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={nodeRadius + 4}
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth={2}
                    />
                    <path
                      d={`M ${pos.x - 5} ${pos.y} L ${pos.x - 1} ${pos.y + 4} L ${pos.x + 7} ${pos.y - 5}`}
                      stroke="#22C55E"
                      strokeWidth={2.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )
              })}
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

// ---------------------------------------------------------------------------
// Wrapper Components
// ---------------------------------------------------------------------------

/**
 * ProbabilityTree - Specialized tree for probability calculations
 */
export function ProbabilityTree({
  events,
  className = '',
  subject,
  complexity,
  language,
  initialStep,
}: {
  events: Array<{
    name: string
    probability: string
    children?: Array<{
      name: string
      probability: string
    }>
  }>
  className?: string
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
  language?: 'en' | 'he'
  initialStep?: number
}) {
  const root: TreeNode = {
    id: 'root',
    label: 'Start',
    children: events.map((event, i) => ({
      id: `event-${i}`,
      label: event.name,
      value: event.probability,
      children: event.children?.map((child, j) => ({
        id: `event-${i}-${j}`,
        label: child.name,
        value: child.probability,
      })),
    })),
  }

  return (
    <TreeDiagram
      data={{ root, showProbabilities: true, title: 'Probability Tree' }}
      className={className}
      subject={subject}
      complexity={complexity}
      language={language}
      initialStep={initialStep}
    />
  )
}

/**
 * CountingTree - Simplified tree for counting problems
 */
export function CountingTree({
  levels,
  className = '',
  subject,
  complexity,
  language,
  initialStep,
}: {
  levels: string[][]
  className?: string
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
  language?: 'en' | 'he'
  initialStep?: number
}) {
  const buildTree = (
    levelIndex: number,
    parentId: string,
  ): TreeNode[] | undefined => {
    if (levelIndex >= levels.length) return undefined
    return levels[levelIndex].map((option, i) => ({
      id: `${parentId}-${levelIndex}-${i}`,
      label: option,
      children: buildTree(levelIndex + 1, `${parentId}-${levelIndex}-${i}`),
    }))
  }

  const root: TreeNode = {
    id: 'root',
    label: 'Start',
    children: buildTree(0, 'root'),
  }

  const totalPaths = levels.reduce((acc, level) => acc * level.length, 1)

  return (
    <TreeDiagram
      data={{
        root,
        showProbabilities: false,
        title: `Counting Tree (${totalPaths} paths)`,
      }}
      className={className}
      width={Math.max(400, levels.length * 150)}
      height={Math.max(300, Math.pow(2, levels.length) * 40 + 100)}
      subject={subject}
      complexity={complexity}
      language={language}
      initialStep={initialStep}
    />
  )
}

export default TreeDiagram
