'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { EXPLANATION_STYLES, type ExplanationStyleId } from '@/lib/homework/explanation-styles'

const STORAGE_KEY = 'xplus1_explanation_style'

interface ExplanationStyleSelectorProps {
  value?: ExplanationStyleId
  onChange: (styleId: ExplanationStyleId) => void
  compact?: boolean
}

function loadSavedStyle(): ExplanationStyleId {
  if (typeof window === 'undefined') return 'step_by_step'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && EXPLANATION_STYLES.some(s => s.id === saved)) {
      return saved as ExplanationStyleId
    }
  } catch {
    // localStorage unavailable
  }
  return 'step_by_step'
}

export default function ExplanationStyleSelector({
  value,
  onChange,
  compact = false,
}: ExplanationStyleSelectorProps) {
  const t = useTranslations('explanationStyles')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<ExplanationStyleId>(
    value || loadSavedStyle()
  )

  // Sync external value
  useEffect(() => {
    if (value && value !== selectedId) {
      setSelectedId(value)
    }
  }, [value, selectedId])

  // Initialize from localStorage on mount
  useEffect(() => {
    if (!value) {
      const saved = loadSavedStyle()
      setSelectedId(saved)
      onChange(saved)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (id: ExplanationStyleId) => {
    setSelectedId(id)
    onChange(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // localStorage unavailable
    }
  }

  return (
    <div className="w-full">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
        {t('selectorLabel')}
      </p>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        role="radiogroup"
        aria-label={t('selectorLabel')}
      >
        {EXPLANATION_STYLES.map((style) => {
          const isActive = selectedId === style.id
          return (
            <button
              key={style.id}
              onClick={() => handleSelect(style.id)}
              role="radio"
              aria-checked={isActive}
              className={`
                relative flex-shrink-0 snap-start rounded-xl border-2 transition-all duration-200
                ${compact ? 'px-3 py-2' : 'px-4 py-3 min-w-[140px]'}
                ${isActive
                  ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="style-indicator"
                  className="absolute inset-0 rounded-xl border-2 border-violet-600"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative flex items-center gap-2">
                <span className="text-lg">{style.icon}</span>
                <div className="text-start">
                  <p className={`text-sm font-medium ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {t(style.labelKey)}
                  </p>
                  {!compact && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {t(style.descriptionKey)}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
