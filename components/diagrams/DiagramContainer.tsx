'use client'

import dynamic from 'next/dynamic'
import type { DesmosRendererProps } from './DesmosRenderer'
import type { GeoGebraRendererProps } from './GeoGebraRenderer'
import type { RechartsRendererProps } from './RechartsRenderer'
import type { MermaidRendererProps } from './MermaidRenderer'
import type { HybridPipeline } from '@/lib/diagram-engine/router'

// ---------------------------------------------------------------------------
// Dynamic imports (no SSR for external script loaders)
// ---------------------------------------------------------------------------

const LoadingFallback = () => (
  <div className="flex h-[300px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Loading...
    </div>
  </div>
)

const DesmosRenderer = dynamic(() => import('./DesmosRenderer'), {
  ssr: false,
  loading: LoadingFallback,
})

const GeoGebraRenderer = dynamic(() => import('./GeoGebraRenderer'), {
  ssr: false,
  loading: LoadingFallback,
})

const RechartsRenderer = dynamic(() => import('./RechartsRenderer'), {
  ssr: false,
  loading: LoadingFallback,
})

const MermaidRenderer = dynamic(() => import('./MermaidRenderer'), {
  ssr: false,
  loading: LoadingFallback,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiagramContainerProps {
  engine: HybridPipeline
  desmosProps?: DesmosRendererProps
  geogebraProps?: GeoGebraRendererProps
  rechartsProps?: RechartsRendererProps
  mermaidProps?: MermaidRendererProps
  fallbackImageUrl?: string
  title?: string
  darkMode?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DiagramContainer({
  engine,
  desmosProps,
  geogebraProps,
  rechartsProps,
  mermaidProps,
  fallbackImageUrl,
  title,
  darkMode = false,
}: DiagramContainerProps) {
  switch (engine) {
    case 'desmos':
      if (desmosProps) {
        return <DesmosRenderer {...desmosProps} darkMode={darkMode} title={title || desmosProps.title} />
      }
      break

    case 'geogebra':
      if (geogebraProps) {
        return <GeoGebraRenderer {...geogebraProps} darkMode={darkMode} title={title || geogebraProps.title} />
      }
      break

    case 'recharts':
      if (rechartsProps) {
        return <RechartsRenderer {...rechartsProps} darkMode={darkMode} title={title || rechartsProps.title} />
      }
      break

    case 'mermaid':
      if (mermaidProps) {
        return <MermaidRenderer {...mermaidProps} darkMode={darkMode} title={title || mermaidProps.title} />
      }
      break

    // Server-side pipelines fall through to image display
    case 'e2b-latex':
    case 'e2b-matplotlib':
    case 'tikz':
    case 'recraft':
      if (fallbackImageUrl) {
        return (
          <div className="w-full">
            {title && (
              <h3 className="mb-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                {title}
              </h3>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fallbackImageUrl}
              alt={title || 'Diagram'}
              className="mx-auto max-h-[500px] rounded-lg"
            />
          </div>
        )
      }
      break
  }

  // Empty state: no matching props for the engine
  return (
    <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400">
      {title || 'No diagram data available'}
    </div>
  )
}
