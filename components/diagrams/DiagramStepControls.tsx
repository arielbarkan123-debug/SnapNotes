'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DiagramStepControlsProps {
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  stepLabel?: string
  stepLabelHe?: string
  language?: 'en' | 'he'
  subjectColor?: string
  className?: string
}

export function DiagramStepControls({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  stepLabel,
  stepLabelHe,
  language = 'en',
  subjectColor,
  className = '',
}: DiagramStepControlsProps) {
  const isRTL = language === 'he'
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1
  const label = isRTL && stepLabelHe ? stepLabelHe : stepLabel
  const prevLabel = isRTL ? 'הצעד הקודם' : 'Previous step'
  const nextLabel = isRTL ? 'הצעד הבא' : 'Next step'

  return (
    <div
      data-diagram-controls
      className={`flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <button
        onClick={onPrev}
        disabled={isFirst}
        aria-label={prevLabel}
        className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {isRTL ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => {
          const isActive = i === currentStep
          const isPast = i < currentStep
          return (
            <div
              key={i}
              data-testid="step-dot"
              data-active={isActive}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isActive
                  ? subjectColor
                    ? 'scale-125'
                    : 'bg-indigo-500 dark:bg-indigo-400 scale-125'
                  : isPast
                    ? subjectColor
                      ? ''
                      : 'bg-indigo-300 dark:bg-indigo-600'
                    : 'bg-gray-300 dark:bg-gray-600'
              }`}
              style={
                subjectColor && (isActive || isPast)
                  ? { backgroundColor: subjectColor, opacity: isActive ? 1 : 0.4 }
                  : undefined
              }
            />
          )
        })}
      </div>

      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums">
        {currentStep + 1} / {totalSteps}
      </span>

      <button
        onClick={onNext}
        disabled={isLast}
        aria-label={nextLabel}
        className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        {isRTL ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      {label && (
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate" style={isRTL ? { marginRight: '0.5rem' } : { marginLeft: '0.5rem' }}>
          {label}
        </span>
      )}
    </div>
  )
}
