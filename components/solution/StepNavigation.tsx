'use client'

import { motion } from 'framer-motion'
import { COLORS } from '@/lib/diagram-theme'

interface StepNavigationProps {
  currentStep: number
  totalSteps: number
  isPlaying: boolean
  completed: boolean
  viewedSteps: Set<number>
  subjectColor: string
  language: 'en' | 'he'
  onPrev: () => void
  onNext: () => void
  onPlayPause: () => void
  onStepClick: (index: number) => void
}

/**
 * StepNavigation - Navigation controls for step-by-step solutions
 *
 * Features:
 * - Previous/Next buttons
 * - Auto-play toggle
 * - Step indicator dots
 * - Keyboard navigation support
 */
export function StepNavigation({
  currentStep,
  totalSteps,
  isPlaying,
  completed,
  viewedSteps,
  subjectColor,
  language,
  onPrev,
  onNext,
  onPlayPause,
  onStepClick,
}: StepNavigationProps) {
  const isFirst = currentStep === 0
  const isLast = currentStep === totalSteps - 1

  return (
    <div className="step-navigation mt-4">
      {/* Step indicator dots */}
      <div className="step-dots flex justify-center gap-2 mb-4">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isActive = index === currentStep
          const isViewed = viewedSteps.has(index)

          return (
            <button
              key={index}
              onClick={() => onStepClick(index)}
              className={`
                step-dot w-3 h-3 rounded-full transition-all duration-200
                ${isActive ? 'scale-125' : 'hover:scale-110'}
              `}
              style={{
                backgroundColor: isActive
                  ? subjectColor
                  : isViewed
                    ? `${subjectColor}60`
                    : COLORS.gray[300],
              }}
              aria-label={`${language === 'he' ? 'עבור לשלב' : 'Go to step'} ${index + 1}`}
              aria-current={isActive ? 'step' : undefined}
            />
          )
        })}
      </div>

      {/* Navigation buttons */}
      <div className="nav-buttons flex items-center justify-center gap-3">
        {/* Previous button */}
        <button
          onClick={onPrev}
          disabled={isFirst}
          className={`
            nav-btn flex items-center gap-1 px-4 py-2 rounded-lg
            text-sm font-medium transition-all duration-200
            ${isFirst
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }
          `}
          aria-label={language === 'he' ? 'שלב קודם' : 'Previous step'}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>{language === 'he' ? 'הקודם' : 'Prev'}</span>
        </button>

        {/* Play/Pause button */}
        <button
          onClick={onPlayPause}
          className={`
            play-btn w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-md hover:shadow-lg
          `}
          style={{
            backgroundColor: subjectColor,
            color: 'white',
          }}
          aria-label={isPlaying
            ? (language === 'he' ? 'עצור' : 'Pause')
            : (language === 'he' ? 'הפעל אוטומטית' : 'Auto-play')
          }
        >
          {isPlaying ? (
            // Pause icon
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            // Play icon
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Next button */}
        <button
          onClick={onNext}
          disabled={isLast && completed}
          className={`
            nav-btn flex items-center gap-1 px-4 py-2 rounded-lg
            text-sm font-medium transition-all duration-200
          `}
          style={{
            backgroundColor: isLast && completed ? COLORS.gray[100] : subjectColor,
            color: isLast && completed ? COLORS.gray[400] : 'white',
            cursor: isLast && completed ? 'not-allowed' : 'pointer',
          }}
          aria-label={language === 'he' ? 'שלב הבא' : 'Next step'}
        >
          <span>{language === 'he' ? 'הבא' : 'Next'}</span>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Auto-play indicator */}
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-2"
        >
          <span className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {language === 'he' ? 'מתקדם אוטומטית...' : 'Auto-advancing...'}
          </span>
        </motion.div>
      )}

      {/* Completion indicator */}
      {completed && !isPlaying && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mt-2"
        >
          <span className="text-xs text-green-600 flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {language === 'he' ? 'הושלם!' : 'Completed!'}
          </span>
        </motion.div>
      )}

      <style jsx>{`
        .step-navigation {
          padding-top: 16px;
          border-top: 1px solid ${COLORS.gray[200]};
        }

        @media (prefers-color-scheme: dark) {
          .step-navigation {
            border-color: ${COLORS.gray[700]};
          }
        }
      `}</style>
    </div>
  )
}

export default StepNavigation
