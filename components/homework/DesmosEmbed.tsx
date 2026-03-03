'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { DesmosExpression } from '@/components/diagrams/DesmosRenderer'

const DesmosRenderer = dynamic(() => import('@/components/diagrams/DesmosRenderer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
      <svg className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  ),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DesmosEmbedProps {
  expressions: Array<{
    id?: string
    latex: string
    color?: string
    label?: string
    hidden?: boolean
  }>
  config?: {
    xRange?: [number, number]
    yRange?: [number, number]
    showGrid?: boolean
  }
  /** IDs of expressions that were just added (for visual emphasis) */
  newExpressionIds?: string[]
  title?: string
  darkMode?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DesmosEmbed({
  expressions,
  config,
  newExpressionIds,
  title,
  darkMode = false,
}: DesmosEmbedProps) {
  // Convert to DesmosExpression[] with optional thicker lines for new expressions
  const desmosExpressions: DesmosExpression[] = useMemo(() => {
    return expressions.map((expr, i) => {
      const id = expr.id || `expr-${i}`
      const isNew = newExpressionIds?.includes(id)
      return {
        id,
        latex: expr.latex,
        color: expr.color || '#6366f1',
        label: expr.label,
        showLabel: !!expr.label,
        hidden: expr.hidden,
        lineWidth: isNew ? 4 : 2,
      }
    })
  }, [expressions, newExpressionIds])

  return (
    <DesmosRenderer
      expressions={desmosExpressions}
      xMin={config?.xRange?.[0] ?? -10}
      xMax={config?.xRange?.[1] ?? 10}
      yMin={config?.yRange?.[0] ?? -10}
      yMax={config?.yRange?.[1] ?? 10}
      showGrid={config?.showGrid ?? true}
      title={title}
      darkMode={darkMode}
    />
  )
}
