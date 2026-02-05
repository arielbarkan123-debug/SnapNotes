'use client'

import { useMemo } from 'react'
import type { TreeDiagramData, TreeNode, TreeDiagramErrorHighlight } from '@/types'
import { getSubjectColor, getAdaptiveLineWeight } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'

interface TreeDiagramDataWithErrors extends TreeDiagramData {
  errorHighlight?: TreeDiagramErrorHighlight
}

interface TreeDiagramProps {
  data: TreeDiagramDataWithErrors
  className?: string
  width?: number
  height?: number
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

interface NodePosition {
  x: number
  y: number
  node: TreeNode
}

/**
 * TreeDiagram - SVG component for displaying tree diagrams
 * Used for probability trees and counting diagrams
 */
export function TreeDiagram({
  data,
  className = '',
  width = 500,
  height = 400,
  subject = 'math',
  complexity = 'middle_school',
}: TreeDiagramProps) {
  const { root, showProbabilities = true, title, errorHighlight } = data

  const subjectColors = useMemo(() => getSubjectColor(subject), [subject])
  const adaptiveLineWeight = useMemo(() => getAdaptiveLineWeight(complexity), [complexity])

  const padding = { top: 40, bottom: 30, left: 50, right: 50 }
  const titleHeight = title ? 30 : 0

  // Calculate tree depth and width
  const getTreeDepth = (node: TreeNode): number => {
    if (!node.children?.length) return 1
    return 1 + Math.max(...node.children.map(getTreeDepth))
  }

  const getTreeWidth = (node: TreeNode): number => {
    if (!node.children?.length) return 1
    return node.children.reduce((sum, child) => sum + getTreeWidth(child), 0)
  }

  const treeDepth = getTreeDepth(root)
  const treeWidth = getTreeWidth(root)

  // Available space
  const availableWidth = width - padding.left - padding.right
  const availableHeight = height - padding.top - padding.bottom - titleHeight

  // Spacing
  const levelHeight = availableHeight / Math.max(treeDepth - 1, 1)
  const _nodeWidth = availableWidth / Math.max(treeWidth, 1)

  // Calculate all node positions
  const positions: NodePosition[] = []

  const calculatePositions = (
    node: TreeNode,
    level: number,
    startX: number,
    widthAvailable: number
  ): number => {
    const nodeTreeWidth = getTreeWidth(node)
    const x = startX + widthAvailable / 2
    const y = padding.top + titleHeight + level * levelHeight

    positions.push({ x, y, node })

    if (node.children?.length) {
      let childStartX = startX
      node.children.forEach((child) => {
        const childWidth = getTreeWidth(child)
        const childWidthPx = (childWidth / nodeTreeWidth) * widthAvailable
        calculatePositions(child, level + 1, childStartX, childWidthPx)
        childStartX += childWidthPx
      })
    }

    return x
  }

  calculatePositions(root, 0, padding.left, availableWidth)

  // Find parent position for drawing edges
  const findParentPosition = (childId: string): NodePosition | null => {
    const findInTree = (
      node: TreeNode,
      parent: TreeNode | null
    ): TreeNode | null => {
      if (node.id === childId && parent) {
        return parent
      }
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

  // Node dimensions
  const nodeRadius = 24

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`text-gray-800 dark:text-gray-200 ${className}`}
    >
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

      {/* Edges (draw first so they're behind nodes) */}
      {positions.slice(1).map((pos) => {
        const parentPos = findParentPosition(pos.node.id)
        if (!parentPos) return null

        return (
          <g key={`edge-${pos.node.id}`}>
            {/* Edge line */}
            <line
              x1={parentPos.x}
              y1={parentPos.y + nodeRadius}
              x2={pos.x}
              y2={pos.y - nodeRadius}
              stroke="currentColor"
              strokeWidth={1.5}
              className="opacity-50"
            />
            {/* Probability label on edge */}
            {showProbabilities && pos.node.value && (
              <text
                x={(parentPos.x + pos.x) / 2 + (pos.x > parentPos.x ? 8 : -8)}
                y={(parentPos.y + pos.y) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-blue-600 dark:fill-blue-400 text-xs font-medium"
              >
                {pos.node.value}
              </text>
            )}
          </g>
        )
      })}

      {/* Nodes */}
      {positions.map((pos) => {
        const isHighlighted = pos.node.highlight
        const isWrongNode = errorHighlight?.wrongNodes?.includes(pos.node.id)
        const isCorrectPath = errorHighlight?.correctPath?.includes(pos.node.id)

        return (
          <g key={`node-${pos.node.id}`}>
            {/* Node circle */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={nodeRadius}
              fill={isWrongNode ? '#FEE2E2' : isCorrectPath ? '#DCFCE7' : isHighlighted ? subjectColors.primary : 'white'}
              stroke={isWrongNode ? '#EF4444' : isCorrectPath ? '#22C55E' : isHighlighted ? subjectColors.primary : 'currentColor'}
              strokeWidth={isWrongNode || isCorrectPath ? adaptiveLineWeight + 1 : adaptiveLineWeight}
              className={isHighlighted && !isWrongNode && !isCorrectPath ? '' : 'dark:fill-gray-800'}
            />
            {/* Node label */}
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={`text-sm font-medium ${isWrongNode ? 'fill-red-600' : isCorrectPath ? 'fill-green-600' : isHighlighted ? 'fill-white' : 'fill-current'}`}
            >
              {pos.node.label}
            </text>
            {/* Error X marker for wrong nodes */}
            {isWrongNode && (
              <g>
                <line x1={pos.x - 8} y1={pos.y - 8} x2={pos.x + 8} y2={pos.y + 8} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
                <line x1={pos.x + 8} y1={pos.y - 8} x2={pos.x - 8} y2={pos.y + 8} stroke="#EF4444" strokeWidth={2} strokeLinecap="round" />
              </g>
            )}
            {/* Checkmark for correct path nodes */}
            {isCorrectPath && (
              <path
                d={`M ${pos.x - 6} ${pos.y} L ${pos.x - 2} ${pos.y + 5} L ${pos.x + 8} ${pos.y - 6}`}
                stroke="#22C55E"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {/* Correction text if available */}
            {isWrongNode && errorHighlight?.corrections?.[pos.node.id] && (
              <text
                x={pos.x}
                y={pos.y + nodeRadius + 14}
                textAnchor="middle"
                className="fill-red-600 text-xs font-medium"
              >
                {errorHighlight.corrections[pos.node.id]}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/**
 * ProbabilityTree - Specialized tree for probability calculations
 */
export function ProbabilityTree({
  events,
  className = '',
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
}) {
  // Convert to TreeNode structure
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
    />
  )
}

/**
 * CountingTree - Simplified tree for counting problems
 */
export function CountingTree({
  levels,
  className = '',
}: {
  levels: string[][] // Each level is an array of options
  className?: string
}) {
  // Build tree recursively
  const buildTree = (
    levelIndex: number,
    parentId: string
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

  // Calculate total paths
  const totalPaths = levels.reduce((acc, level) => acc * level.length, 1)

  return (
    <div className={className}>
      <TreeDiagram
        data={{
          root,
          showProbabilities: false,
          title: `Counting Tree (${totalPaths} paths)`,
        }}
        width={Math.max(400, levels.length * 150)}
        height={Math.max(300, Math.pow(2, levels.length) * 40 + 100)}
      />
    </div>
  )
}

export default TreeDiagram
