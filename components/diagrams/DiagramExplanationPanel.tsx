'use client'

import { useTranslations } from 'next-intl'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'

// ============================================================================
// Types
// ============================================================================

export interface StepExplanation {
  step: number
  stepLabel: string
  stepLabelHe?: string
  explanation?: string
  explanationHe?: string
  showCalculation?: string
  conceptTip?: string
  conceptTipHe?: string
}

interface DiagramExplanationPanelProps {
  currentStep: number
  totalSteps: number
  stepConfig?: StepExplanation[]
  onStepChange: (step: number) => void
  onPrevious: () => void
  onNext: () => void
  autoPlay?: boolean
  onToggleAutoPlay?: () => void
  language?: 'en' | 'he'
  className?: string
}

// ============================================================================
// Helper: Parse and render math expressions
// ============================================================================

function renderMathExpression(text: string): React.ReactNode {
  // Split text by LaTeX delimiters $ ... $ for inline math
  const parts = text.split(/(\$[^$]+\$)/g)

  return parts.map((part, index) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const mathContent = part.slice(1, -1)
      try {
        return <InlineMath key={index} math={mathContent} />
      } catch {
        return <span key={index} className="font-mono">{mathContent}</span>
      }
    }
    return <span key={index}>{part}</span>
  })
}

// ============================================================================
// Main Component
// ============================================================================

export default function DiagramExplanationPanel({
  currentStep,
  totalSteps,
  stepConfig,
  onStepChange,
  onPrevious,
  onNext,
  autoPlay = false,
  onToggleAutoPlay,
  language = 'en',
  className = '',
}: DiagramExplanationPanelProps) {
  const t = useTranslations('diagram')
  const isRTL = language === 'he'

  // Guard against invalid values
  const safeTotalSteps = Math.max(1, totalSteps || 1)
  const safeCurrentStep = Math.max(0, Math.min(currentStep || 0, safeTotalSteps - 1))

  // Get current step explanation
  const currentStepConfig = stepConfig?.find(s => s.step === safeCurrentStep)

  const stepLabel = isRTL && currentStepConfig?.stepLabelHe
    ? currentStepConfig.stepLabelHe
    : currentStepConfig?.stepLabel || `Step ${safeCurrentStep + 1}`

  const explanation = isRTL && currentStepConfig?.explanationHe
    ? currentStepConfig.explanationHe
    : currentStepConfig?.explanation

  const conceptTip = isRTL && currentStepConfig?.conceptTipHe
    ? currentStepConfig.conceptTipHe
    : currentStepConfig?.conceptTip

  return (
    <section
      className={`bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={isRTL ? 'לוח הסברים' : 'Explanation panel'}
    >
      {/* Progress Bar */}
      <div className="px-4 pt-4">
        <div
          className="relative"
          role="progressbar"
          aria-valuenow={safeCurrentStep + 1}
          aria-valuemin={1}
          aria-valuemax={safeTotalSteps}
          aria-label={isRTL ? `שלב ${safeCurrentStep + 1} מתוך ${safeTotalSteps}` : `Step ${safeCurrentStep + 1} of ${safeTotalSteps}`}
        >
          {/* Track */}
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${((safeCurrentStep + 1) / safeTotalSteps) * 100}%` }}
            />
          </div>

          {/* Step dots - Navigation */}
          <nav
            className="absolute inset-0 flex justify-between items-center px-1"
            aria-label={isRTL ? 'ניווט שלבים' : 'Step navigation'}
          >
            {Array.from({ length: safeTotalSteps }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => onStepChange(idx)}
                className={`w-3 h-3 rounded-full border-2 transition-all ${
                  idx === safeCurrentStep
                    ? 'bg-violet-500 border-violet-500 scale-125'
                    : idx < safeCurrentStep
                      ? 'bg-violet-400 border-violet-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-violet-400'
                }`}
                aria-label={isRTL ? `עבור לשלב ${idx + 1}` : `Go to step ${idx + 1}`}
                aria-current={idx === safeCurrentStep ? 'step' : undefined}
              />
            ))}
          </nav>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between px-4 py-3" role="group" aria-label={isRTL ? 'פקדי ניווט' : 'Navigation controls'}>
        <button
          onClick={onPrevious}
          disabled={safeCurrentStep === 0}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
            ${safeCurrentStep === 0
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          aria-label={isRTL ? `קודם (שלב ${safeCurrentStep})` : `Previous (step ${safeCurrentStep})`}
        >
          <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>{t('previous')}</span>
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400" aria-hidden="true">
            {safeCurrentStep + 1} / {safeTotalSteps}
          </span>

          {onToggleAutoPlay && (
            <button
              onClick={onToggleAutoPlay}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                autoPlay
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              aria-pressed={autoPlay}
              aria-label={autoPlay
                ? (isRTL ? 'עצור הפעלה אוטומטית' : 'Stop auto-play')
                : (isRTL ? 'הפעל אוטומטית' : 'Start auto-play')}
            >
              {autoPlay ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                  <span>{t('pause')}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>{t('autoPlay')}</span>
                </>
              )}
            </button>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={safeCurrentStep >= safeTotalSteps - 1}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
            ${safeCurrentStep >= safeTotalSteps - 1
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          aria-label={isRTL ? `הבא (שלב ${safeCurrentStep + 2})` : `Next (step ${safeCurrentStep + 2})`}
        >
          <span>{t('next')}</span>
          <svg className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Step Explanation */}
      <article className="px-4 pb-4 space-y-3" aria-live="polite" aria-atomic="true">
        {/* Step Label */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white" id="step-label">
          {stepLabel}
        </h3>

        {/* Main Explanation */}
        {explanation && (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed" id="step-explanation">
            {renderMathExpression(explanation)}
          </p>
        )}

        {/* Calculation Display */}
        {currentStepConfig?.showCalculation && (
          <div
            className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 border border-violet-100 dark:border-violet-800"
            role="region"
            aria-label={isRTL ? 'חישוב' : 'Calculation'}
          >
            <div className="flex items-start gap-2">
              <span className="text-violet-600 dark:text-violet-400" aria-hidden="true">📐</span>
              <div className="text-violet-800 dark:text-violet-200 font-medium">
                {renderMathExpression(currentStepConfig.showCalculation)}
              </div>
            </div>
          </div>
        )}

        {/* Concept Tip */}
        {conceptTip && (
          <aside
            className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-100 dark:border-amber-800"
            role="note"
            aria-label={isRTL ? 'טיפ' : 'Tip'}
          >
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400" aria-hidden="true">💡</span>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {conceptTip}
              </p>
            </div>
          </aside>
        )}

        {/* Got it button for last step */}
        {safeCurrentStep === safeTotalSteps - 1 && (
          <div className="pt-2">
            <button
              onClick={() => onStepChange(0)}
              className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-xl transition-colors"
              aria-label={isRTL ? 'הבנתי! חזור לשלב הראשון' : 'Got it! Return to first step'}
            >
              {t('gotIt')} <span aria-hidden="true">✓</span>
            </button>
          </div>
        )}
      </article>
    </section>
  )
}
