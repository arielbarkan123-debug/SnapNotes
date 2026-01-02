'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LessonStep } from '@/types'

// =============================================================================
// Types
// =============================================================================

interface LessonRecapProps {
  lessonTitle: string
  steps: LessonStep[]
  onClose: () => void
  onContinue: () => void
}

interface RecapItem {
  type: 'explanation' | 'key_point' | 'formula' | 'diagram' | 'example' | 'summary'
  title: string
  content: string
}

// =============================================================================
// Component
// =============================================================================

export default function LessonRecap({
  lessonTitle,
  steps,
  onClose,
  onContinue,
}: LessonRecapProps) {
  const t = useTranslations('lesson')
  const [currentIndex, setCurrentIndex] = useState(0)

  // Extract content steps (exclude questions)
  const contentSteps = steps.filter(step => step.type !== 'question')

  // Generate recap items from content steps
  const recapItems = generateRecapItems(contentSteps)

  const currentItem = recapItems[currentIndex]
  const isLastItem = currentIndex === recapItems.length - 1
  const progress = ((currentIndex + 1) / recapItems.length) * 100

  const handleNext = () => {
    if (isLastItem) {
      onContinue()
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  if (recapItems.length === 0) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center z-50">
        <div className="text-center px-6">
          <span className="text-6xl mb-4 block">📚</span>
          <h2 className="text-2xl font-bold text-white mb-4">{t('noContentToReview')}</h2>
          <p className="text-indigo-200 mb-6">{t('noContentDescription')}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-xl"
          >
            {t('goBack')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-500 flex flex-col z-50">
      {/* Header */}
      <header className="flex-shrink-0 p-4 border-b border-white/20">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label={t('closeRecap')}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <span className="text-xs font-medium text-white/70 uppercase tracking-wide">
                {t('reviewing')}
              </span>
              <h1 className="text-lg font-semibold text-white truncate max-w-[200px]">
                {lessonTitle}
              </h1>
            </div>
            <div className="w-10" /> {/* Spacer for alignment */}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs text-white/60 mt-2">
            {t('keyPointsProgress', { current: currentIndex + 1, total: recapItems.length })}
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto">
          <RecapCard item={currentItem} index={currentIndex} t={t} />
        </div>
      </main>

      {/* Footer with navigation */}
      <footer className="flex-shrink-0 p-4 border-t border-white/20">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
              ${currentIndex === 0
                ? 'opacity-40 cursor-not-allowed text-white/60'
                : 'bg-white/20 text-white hover:bg-white/30 active:bg-white/40'
              }
            `}
          >
            <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('previous')}
          </button>

          <button
            onClick={handleNext}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white text-cyan-600 font-bold rounded-xl shadow-lg hover:bg-gray-100 active:bg-gray-200 transition-all"
          >
            {isLastItem ? (
              <>
                {t('doneReviewing')}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            ) : (
              <>
                {t('next')}
                <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  )
}

// =============================================================================
// RecapCard Component
// =============================================================================

interface RecapCardProps {
  item: RecapItem
  index: number
  t: ReturnType<typeof useTranslations<'lesson'>>
}

function RecapCard({ item, index, t }: RecapCardProps) {
  const getTypeConfig = (type: RecapItem['type']) => {
    switch (type) {
      case 'explanation':
        return { emoji: '💡', labelKey: 'conceptType' as const, bgColor: 'from-amber-500/20 to-yellow-500/20', borderColor: 'border-amber-400/40' }
      case 'key_point':
        return { emoji: '📌', labelKey: 'keyPointType' as const, bgColor: 'from-blue-500/20 to-indigo-500/20', borderColor: 'border-blue-400/40' }
      case 'formula':
        return { emoji: '🔢', labelKey: 'formulaType' as const, bgColor: 'from-purple-500/20 to-pink-500/20', borderColor: 'border-purple-400/40' }
      case 'diagram':
        return { emoji: '📊', labelKey: 'diagramType' as const, bgColor: 'from-cyan-500/20 to-blue-500/20', borderColor: 'border-cyan-400/40' }
      case 'example':
        return { emoji: '✨', labelKey: 'exampleLabel' as const, bgColor: 'from-green-500/20 to-emerald-500/20', borderColor: 'border-green-400/40' }
      case 'summary':
        return { emoji: '📋', labelKey: 'summaryType' as const, bgColor: 'from-indigo-500/20 to-violet-500/20', borderColor: 'border-indigo-400/40' }
      default:
        return { emoji: '📝', labelKey: 'noteType' as const, bgColor: 'from-gray-500/20 to-gray-600/20', borderColor: 'border-gray-400/40' }
    }
  }

  const config = getTypeConfig(item.type)

  return (
    <div
      key={index}
      className={`
        bg-gradient-to-br ${config.bgColor} backdrop-blur-sm
        rounded-2xl p-6 border ${config.borderColor}
        animate-in fade-in slide-in-from-right-4 duration-300
      `}
    >
      {/* Type badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{config.emoji}</span>
        <span className="text-sm font-medium text-white/80 uppercase tracking-wide">
          {t(config.labelKey)}
        </span>
      </div>

      {/* Title */}
      {item.title && (
        <h3 className="text-xl font-bold text-white mb-3">
          {item.title}
        </h3>
      )}

      {/* Content */}
      <div className="text-white/90 leading-relaxed whitespace-pre-wrap">
        {item.content}
      </div>
    </div>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function generateRecapItems(contentSteps: LessonStep[]): RecapItem[] {
  const items: RecapItem[] = []

  for (const step of contentSteps) {
    if (!step.content) continue

    // Determine the type based on step type
    let type: RecapItem['type'] = 'key_point'
    let title = ''
    let content = step.content

    // Map step type to recap item type
    const validTypes: RecapItem['type'][] = ['explanation', 'key_point', 'formula', 'diagram', 'example', 'summary']
    if (validTypes.includes(step.type as RecapItem['type'])) {
      type = step.type as RecapItem['type']
    }

    // Try to extract title from content if it starts with a heading-like pattern
    const headingMatch = content.match(/^(?:#{1,3}\s*)?([^:\n]+)(?::|$)/m)
    if (headingMatch && headingMatch[1].length < 60) {
      title = headingMatch[1].trim()
      // Remove the title from content if found
      content = content.replace(headingMatch[0], '').trim()
    }

    // Use step title if available
    if (step.title) {
      title = step.title
    }

    // Clean up content
    content = cleanContent(content)

    // Only add if there's meaningful content
    if (content.length > 10) {
      items.push({ type, title, content })
    }
  }

  // If no items were generated, create summary items from content
  if (items.length === 0 && contentSteps.length > 0) {
    for (const step of contentSteps) {
      if (step.content && step.content.length > 10) {
        items.push({
          type: 'key_point',
          title: step.title || '',
          content: cleanContent(step.content),
        })
      }
    }
  }

  return items
}

function cleanContent(content: string): string {
  // Remove markdown headers
  let cleaned = content.replace(/^#{1,6}\s+/gm, '')

  // Remove excessive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // Trim whitespace
  cleaned = cleaned.trim()

  // Truncate very long content
  if (cleaned.length > 500) {
    cleaned = cleaned.substring(0, 500).trim() + '...'
  }

  return cleaned
}
