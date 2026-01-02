'use client'

import { useTranslations } from 'next-intl'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const t = useTranslations('lesson')
  const progressPercentage = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0

  return (
    <div className="w-full">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t('stepProgress', { current: currentStep + 1, total: totalSteps })}
        </span>
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          {Math.round(progressPercentage)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`
              w-2 h-2 rounded-full transition-all duration-200
              ${index < currentStep
                ? 'bg-indigo-500'
                : index === currentStep
                  ? 'bg-indigo-500 scale-125'
                  : 'bg-gray-300 dark:bg-gray-600'
              }
            `}
          />
        ))}
      </div>
    </div>
  )
}
