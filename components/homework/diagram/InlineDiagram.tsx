'use client'

import { useLocale } from 'next-intl'
import { type DiagramState, getDiagramTypeName } from './types'
import DiagramRenderer from './DiagramRenderer'

interface InlineDiagramProps {
  diagram: DiagramState
  /** Size variant: 'compact' (350x280), 'default' (400x350), or 'large' (500x400) */
  size?: 'compact' | 'default' | 'large'
  /** Language for labels */
  language?: 'en' | 'he'
}

const SIZE_MAP = {
  compact: { width: 350, height: 280 },
  default: { width: 400, height: 350 },
  large: { width: 500, height: 400 },
}

/**
 * Inline diagram for rendering engine-generated images within message bubbles.
 * All diagrams are now engine_image (static PNG) — no step controls needed.
 */
export default function InlineDiagram({
  diagram,
  size = 'default',
  language,
}: InlineDiagramProps) {
  const locale = useLocale()
  const lang = language || (locale as 'en' | 'he')
  const { width, height } = SIZE_MAP[size]

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
      {/* Header with diagram type */}
      <div className="flex items-center mb-3">
        <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
          {getDiagramTypeName(diagram.type)}
        </span>
      </div>

      {/* Diagram container */}
      <div className="rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <DiagramRenderer
          diagram={diagram}
          width={width}
          height={height}
          language={lang}
        />
      </div>
    </div>
  )
}
