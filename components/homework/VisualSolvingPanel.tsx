'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations, useLocale } from 'next-intl'
import type { VisualUpdate } from '@/lib/homework/types'

// Lazy-load heavy renderers (client-only)
const DesmosEmbed = dynamic(() => import('./DesmosEmbed'), { ssr: false })
const GeoGebraEmbed = dynamic(() => import('./GeoGebraEmbed'), { ssr: false })
const RechartsRenderer = dynamic(() => import('@/components/diagrams/RechartsRenderer'), { ssr: false })
const DiagramRenderer = dynamic(
  () => import('./diagram').then((mod) => mod.DiagramRenderer),
  { ssr: false }
)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VisualSolvingPanelProps {
  visualUpdates: VisualUpdate[]
  isOpen: boolean
  onClose: () => void
  darkMode?: boolean
}

// ---------------------------------------------------------------------------
// Tool badge i18n keys
// ---------------------------------------------------------------------------

const TOOL_LABEL_KEYS: Record<VisualUpdate['tool'], string> = {
  desmos: 'toolDesmos',
  geogebra: 'toolGeogebra',
  recharts: 'toolRecharts',
  svg: 'toolSvg',
  engine_image: 'toolEngineImage',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VisualSolvingPanel({
  visualUpdates,
  isOpen,
  onClose,
  darkMode = false,
}: VisualSolvingPanelProps) {
  const t = useTranslations('chat')
  const locale = useLocale()
  const [currentStep, setCurrentStep] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(false)

  const totalSteps = visualUpdates.length

  // Auto-advance to latest step when new updates arrive
  useEffect(() => {
    if (totalSteps > 0) {
      setCurrentStep(totalSteps - 1)
    }
  }, [totalSteps])

  // Accumulate Desmos expressions up to the current step
  const accumulatedDesmosExpressions = useMemo(() => {
    const exprs: Array<{
      id?: string
      latex: string
      color?: string
      label?: string
      hidden?: boolean
    }>[] = []

    for (let i = 0; i <= currentStep && i < visualUpdates.length; i++) {
      const update = visualUpdates[i]
      if (update.tool === 'desmos' && update.desmosExpressions) {
        if (update.action === 'replace' || update.action === 'clear') {
          exprs.length = 0
        }
        if (update.action !== 'clear') {
          exprs.push(update.desmosExpressions)
        }
      }
    }

    return exprs.flat()
  }, [visualUpdates, currentStep])

  // Determine new expression IDs for the current step
  const newExpressionIds = useMemo(() => {
    const current = visualUpdates[currentStep]
    if (!current || current.tool !== 'desmos' || !current.desmosExpressions) return []
    return current.desmosExpressions
      .map((e, i) => e.id || `expr-${i}`)
  }, [visualUpdates, currentStep])

  if (!isOpen || totalSteps === 0) return null

  const currentUpdate = visualUpdates[currentStep]
  if (!currentUpdate) return null

  const toolLabelKey = TOOL_LABEL_KEYS[currentUpdate.tool] || 'toolSvg'
  const toolLabel = t(toolLabelKey)

  const panelClasses = isFullScreen
    ? 'fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900'
    : 'flex flex-col h-full'

  return (
    <div className={panelClasses}>
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t('visualPanel')}
          </h3>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
            {toolLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            title={isFullScreen ? t('exitFullScreen') : t('fullScreen')}
          >
            {isFullScreen ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Diagram Area */}
      <div className="flex-1 overflow-auto p-4">
        {(currentUpdate.title || currentUpdate.titleHe) && (
          <h4 className="mb-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
            {locale === 'he'
              ? (currentUpdate.titleHe || currentUpdate.title)
              : currentUpdate.title}
          </h4>
        )}

        {/* Desmos */}
        {currentUpdate.tool === 'desmos' && accumulatedDesmosExpressions.length > 0 && (
          <DesmosEmbed
            expressions={accumulatedDesmosExpressions}
            config={currentUpdate.desmosConfig}
            newExpressionIds={newExpressionIds}
            title={currentUpdate.title}
            darkMode={darkMode}
          />
        )}

        {/* GeoGebra */}
        {currentUpdate.tool === 'geogebra' && currentUpdate.geogebraCommands && (
          <GeoGebraEmbed
            commands={currentUpdate.geogebraCommands}
            title={currentUpdate.title}
            darkMode={darkMode}
          />
        )}

        {/* Recharts */}
        {currentUpdate.tool === 'recharts' && currentUpdate.rechartsData && (
          <RechartsRenderer
            chartType={currentUpdate.rechartsData.chartType}
            data={currentUpdate.rechartsData.data || []}
            boxPlotData={currentUpdate.rechartsData.boxPlotData}
            xAxisLabel={currentUpdate.rechartsData.xLabel}
            yAxisLabel={currentUpdate.rechartsData.yLabel}
            title={currentUpdate.title}
            darkMode={darkMode}
          />
        )}

        {/* SVG (existing diagram system) */}
        {currentUpdate.tool === 'svg' && currentUpdate.svgDiagram && (
          <DiagramRenderer diagram={currentUpdate.svgDiagram} />
        )}

        {/* Engine Image */}
        {currentUpdate.tool === 'engine_image' && currentUpdate.svgDiagram && (
          <DiagramRenderer diagram={currentUpdate.svgDiagram} />
        )}
      </div>

      {/* Step Controls */}
      {totalSteps > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {t('visualStep', { current: currentStep + 1, total: totalSteps })}
            </span>
            {(currentUpdate.stepLabel || currentUpdate.stepLabelHe) && (
              <p className="text-xs font-medium text-gray-800 dark:text-gray-200">
                {locale === 'he'
                  ? (currentUpdate.stepLabelHe || currentUpdate.stepLabel)
                  : currentUpdate.stepLabel}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
            disabled={currentStep >= totalSteps - 1}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
