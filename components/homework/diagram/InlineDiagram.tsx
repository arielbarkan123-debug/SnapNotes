'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import dynamic from 'next/dynamic'
import { type DiagramState, getDiagramTypeName } from './types'
import DiagramRenderer from './DiagramRenderer'

// Lazy load fullscreen view
const FullScreenDiagramView = dynamic(
  () => import('@/components/diagrams/FullScreenDiagramView'),
  { ssr: false }
)

interface InlineDiagramProps {
  diagram: DiagramState
  currentStep?: number
  onStepAdvance?: () => void
  onStepBack?: () => void
  /** Size variant: 'compact' (350x280), 'default' (400x350), or 'large' (500x400) */
  size?: 'compact' | 'default' | 'large'
  /** Language for labels */
  language?: 'en' | 'he'
  /** Whether to show the expand button */
  showExpandButton?: boolean
}

const SIZE_MAP = {
  compact: { width: 350, height: 280 },
  default: { width: 400, height: 350 },
  large: { width: 500, height: 400 },
}

/**
 * Inline diagram for rendering within message bubbles
 * Now with expand-to-fullscreen capability
 */
export default function InlineDiagram({
  diagram,
  currentStep,
  onStepAdvance,
  onStepBack,
  size = 'compact',
  language,
  showExpandButton = true,
}: InlineDiagramProps) {
  const t = useTranslations('diagram')
  const locale = useLocale()
  const lang = language || (locale as 'en' | 'he')

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenStep, setFullscreenStep] = useState(currentStep ?? 0)

  const { width, height } = SIZE_MAP[size]

  const handleOpenFullscreen = () => {
    setFullscreenStep(currentStep ?? 0)
    setIsFullscreen(true)
  }

  return (
    <>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        {/* Header with diagram type and expand button */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
            📊 {getDiagramTypeName(diagram.type)}
          </span>

          {showExpandButton && (
            <button
              onClick={handleOpenFullscreen}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              title={t('expand')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              {t('expand')}
            </button>
          )}
        </div>

        {/* Diagram container */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto">
          <DiagramRenderer
            diagram={diagram}
            currentStep={currentStep}
            animate={true}
            showControls={true}
            onStepAdvance={onStepAdvance}
            onStepBack={onStepBack}
            width={width}
            height={height}
            language={lang}
          />
        </div>

        {/* Hint to expand for better view */}
        {showExpandButton && (diagram.totalSteps || 1) > 3 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            {lang === 'he' ? 'לחץ להגדלה לצפייה טובה יותר' : 'Click expand for a better view'}
          </p>
        )}
      </div>

      {/* Fullscreen Dialog */}
      <FullScreenDiagramView
        diagram={diagram}
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        initialStep={fullscreenStep}
        language={lang}
        stepConfig={diagram.stepConfig?.map((s, idx) => ({
          step: 'step' in s ? (s as { step: number }).step : idx,
          stepLabel: s.stepLabel || `Step ${idx + 1}`,
          stepLabelHe: s.stepLabelHe,
          showCalculation: typeof s.showCalculation === 'string' ? s.showCalculation : undefined,
        }))}
      />
    </>
  )
}
