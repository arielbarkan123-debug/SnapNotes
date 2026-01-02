'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Hint } from '@/lib/adaptive/hints'

interface HintBubbleProps {
  hint: Hint
  onDismiss?: () => void
  onHelpfulFeedback?: (wasHelpful: boolean) => void
  autoShow?: boolean
}

export default function HintBubble({
  hint,
  onDismiss,
  onHelpfulFeedback,
  autoShow = true,
}: HintBubbleProps) {
  const t = useTranslations('lesson')
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    if (autoShow && !isDismissed) {
      // Slight delay for animation
      const timer = setTimeout(() => setIsVisible(true), 100)
      return () => clearTimeout(timer)
    }
  }, [autoShow, isDismissed])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => {
      setIsDismissed(true)
      onDismiss?.()
    }, 200)
  }

  const handleFeedback = (wasHelpful: boolean) => {
    onHelpfulFeedback?.(wasHelpful)
    setShowFeedback(false)
    handleDismiss()
  }

  if (isDismissed) {
    return null
  }

  // Get background color based on hint type
  const getBgColor = () => {
    switch (hint.type) {
      case 'tip':
        return 'bg-yellow-50 border-yellow-200'
      case 'reminder':
        return 'bg-blue-50 border-blue-200'
      case 'simplification':
        return 'bg-green-50 border-green-200'
      case 'example':
        return 'bg-purple-50 border-purple-200'
      default:
        return 'bg-yellow-50 border-yellow-200'
    }
  }

  const getTextColor = () => {
    switch (hint.type) {
      case 'tip':
        return 'text-yellow-800'
      case 'reminder':
        return 'text-blue-800'
      case 'simplification':
        return 'text-green-800'
      case 'example':
        return 'text-purple-800'
      default:
        return 'text-yellow-800'
    }
  }

  const getIconBgColor = () => {
    switch (hint.type) {
      case 'tip':
        return 'bg-yellow-100'
      case 'reminder':
        return 'bg-blue-100'
      case 'simplification':
        return 'bg-green-100'
      case 'example':
        return 'bg-purple-100'
      default:
        return 'bg-yellow-100'
    }
  }

  return (
    <div
      className={`
        mt-4 p-4 rounded-xl border-2 transition-all duration-200 ease-out
        ${getBgColor()}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getIconBgColor()} flex items-center justify-center`}>
          <span className="text-lg">{hint.icon || '💡'}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${getTextColor()} opacity-70`}>
            {hint.type === 'tip' && t('tipLabel')}
            {hint.type === 'reminder' && t('reminderLabel')}
            {hint.type === 'simplification' && t('tryThisLabel')}
            {hint.type === 'example' && t('exampleLabel')}
          </p>

          {/* Hint text */}
          <p className={`text-sm ${getTextColor()} leading-relaxed`}>
            {hint.content}
          </p>

          {/* Feedback buttons */}
          {showFeedback && (
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-xs ${getTextColor()} opacity-70`}>{t('wasThisHelpful')}</span>
              <button
                onClick={() => handleFeedback(true)}
                className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
              >
                {t('yes')}
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              >
                {t('no')}
              </button>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className={`flex-shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors ${getTextColor()} opacity-50 hover:opacity-100`}
          aria-label={t('dismissHint')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Compact hint button for requesting hints
interface HintButtonProps {
  onClick: () => void
  disabled?: boolean
  hintsRemaining?: number
}

export function HintButton({ onClick, disabled, hintsRemaining }: HintButtonProps) {
  const t = useTranslations('lesson')
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
        transition-all duration-200
        ${disabled
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 active:scale-95'
        }
      `}
    >
      <span>💡</span>
      <span>{t('needAHint')}</span>
      {hintsRemaining !== undefined && hintsRemaining > 0 && (
        <span className="ms-1 px-1.5 py-0.5 bg-yellow-200 rounded-full text-xs">
          {hintsRemaining}
        </span>
      )}
    </button>
  )
}
