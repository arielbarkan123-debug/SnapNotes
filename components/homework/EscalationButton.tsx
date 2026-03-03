'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'

// ============================================================================
// Types
// ============================================================================

export type EscalationLevel = 0 | 1 | 2 | 3 | 4 | 5

export type EscalationAction =
  | 'REPHRASE'
  | 'ANALOGY'
  | 'CONCRETE'
  | 'VIDEO'
  | 'EASIER'
  | 'TEACHER'

interface EscalationConfig {
  action: EscalationAction
  labelKey: string
  icon: string
}

const ESCALATION_LEVELS: EscalationConfig[] = [
  { action: 'REPHRASE', labelKey: 'escalation1', icon: '🔄' },
  { action: 'ANALOGY', labelKey: 'escalation2', icon: '💡' },
  { action: 'CONCRETE', labelKey: 'escalation3', icon: '🔢' },
  { action: 'VIDEO', labelKey: 'escalation4', icon: '📺' },
  { action: 'EASIER', labelKey: 'escalation5', icon: '🪜' },
  { action: 'TEACHER', labelKey: 'escalation6', icon: '👩‍🏫' },
]

// ============================================================================
// Props
// ============================================================================

export interface EscalationButtonProps {
  currentLevel: EscalationLevel
  onEscalate: (action: EscalationAction, nextLevel: EscalationLevel) => void
  disabled?: boolean
  topic?: string
  concept?: string
}

// ============================================================================
// Component
// ============================================================================

export default function EscalationButton({
  currentLevel,
  onEscalate,
  disabled = false,
  topic,
  concept,
}: EscalationButtonProps) {
  const t = useTranslations('chat')
  const [showTeacherCard, setShowTeacherCard] = useState(false)
  const [copied, setCopied] = useState(false)

  const config = ESCALATION_LEVELS[currentLevel]
  const isTeacherLevel = currentLevel === 5

  const handleClick = useCallback(() => {
    if (disabled) return

    if (isTeacherLevel) {
      setShowTeacherCard((prev) => !prev)
      return
    }

    const nextLevel = Math.min(currentLevel + 1, 5) as EscalationLevel
    onEscalate(config.action, nextLevel)
  }, [disabled, isTeacherLevel, currentLevel, onEscalate, config.action])

  const handleCopyTeacherMessage = useCallback(async () => {
    const message = t('escalationTeacherMessage', {
      topic: topic || '...',
      concept: concept || '...',
    })

    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may not be available
    }
  }, [t, topic, concept])

  // Button color scheme based on level
  const getButtonClasses = (): string => {
    if (isTeacherLevel) {
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
    }
    if (currentLevel === 0) {
      return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30'
    }
    return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
  }

  return (
    <div
      className="flex flex-col items-start mt-1 mb-1 ms-9"
      role="group"
      aria-label={t('escalationLabel')}
    >
      {/* Label */}
      <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">
        {t('escalationLabel')}
      </span>

      {/* Escalation Button */}
      <motion.button
        onClick={handleClick}
        disabled={disabled}
        whileTap={{ scale: 0.97 }}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
          border transition-colors min-h-[32px]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${getButtonClasses()}
        `}
      >
        <span>{config.icon}</span>
        <span>{t(config.labelKey)}</span>
      </motion.button>

      {/* Teacher Message Card */}
      <AnimatePresence>
        {showTeacherCard && isTeacherLevel && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 max-w-sm">
              <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                {t('escalationTeacherMessage', {
                  topic: topic || '...',
                  concept: concept || '...',
                })}
              </p>
              <button
                onClick={handleCopyTeacherMessage}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/70 transition-colors"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>{t('escalationTeacherShare')}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
