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
  /** Override which step to display (defaults to last step = fully revealed) */
  currentStep?: number
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
  size = 'default',
  language,
  showExpandButton = true,
}: InlineDiagramProps) {
  const t = useTranslations('diagram')
  const locale = useLocale()
  const lang = language || (locale as 'en' | 'he')

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenStep, setFullscreenStep] = useState(currentStep ?? 0)

  const { width, height } = SIZE_MAP[size]

  // Inline diagrams show fully revealed (all steps visible) for quick viewing.
  // Users can expand to fullscreen for the step-by-step experience.
  const totalSteps = diagram.totalSteps ?? diagram.stepConfig?.length ?? 1
  const inlineStep = currentStep ?? (totalSteps > 0 ? totalSteps - 1 : 0)

  const handleOpenFullscreen = () => {
    // Fullscreen starts from step 0 for the full step-by-step experience
    setFullscreenStep(0)
    setIsFullscreen(true)
  }

  return (
    <>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        {/* Header with diagram type and expand button */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
            {getDiagramTypeName(diagram.type)}
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

        {/* Diagram container — fully revealed, no step controls.
             The .diagram-content override removes per-component maxWidth caps
             so the SVG fills available width (components use width:100% + viewBox). */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-hidden [&_.diagram-content]:!max-w-full">
          <DiagramRenderer
            diagram={diagram}
            currentStep={inlineStep}
            animate={false}
            showControls={false}
            width={width}
            height={height}
            language={lang}
          />
        </div>

        {/* Hint to expand for step-by-step view */}
        {showExpandButton && totalSteps > 1 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            {lang === 'he' ? 'לחץ להגדלה לצפייה צעד-אחר-צעד' : 'Expand for step-by-step view'}
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
