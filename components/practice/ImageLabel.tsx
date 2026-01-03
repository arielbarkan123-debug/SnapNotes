'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

// =============================================================================
// Types
// =============================================================================

interface LabelPosition {
  id: string
  correct_text: string
  x: number // percentage 0-100
  y: number // percentage 0-100
  box_width?: number
  hints?: string[]
}

interface ImageLabelProps {
  imageUrl: string
  imageAlt?: string
  labels: LabelPosition[]
  interactionMode: 'drag' | 'type' | 'both'
  onAnswer: (correct: boolean, correctCount: number, totalCount: number) => void
  imageCredit?: string
  imageCreditUrl?: string
}

// =============================================================================
// Component
// =============================================================================

export default function ImageLabel({
  imageUrl,
  imageAlt,
  labels,
  interactionMode,
  onAnswer,
  imageCredit,
  imageCreditUrl,
}: ImageLabelProps) {
  const t = useTranslations('practice')

  const [userAnswers, setUserAnswers] = useState<Map<string, string>>(new Map())
  const [hasChecked, setHasChecked] = useState(false)
  const [results, setResults] = useState<Map<string, boolean>>(new Map())
  const [activeMode, setActiveMode] = useState<'drag' | 'type'>(
    interactionMode === 'both' ? 'drag' : interactionMode
  )

  // Drag and drop state
  const [draggedLabel, setDraggedLabel] = useState<string | null>(null)
  const [availableLabels, setAvailableLabels] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize available labels for drag mode
  useEffect(() => {
    const shuffled = [...labels.map(l => l.correct_text)]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    setAvailableLabels(shuffled)
  }, [labels])

  const handleDragStart = (labelText: string) => {
    if (hasChecked) return
    setDraggedLabel(labelText)
  }

  const handleDragEnd = () => {
    setDraggedLabel(null)
  }

  const handleDropOnPosition = (labelId: string) => {
    if (hasChecked || !draggedLabel) return

    // Remove label from available pool
    setAvailableLabels(prev => prev.filter(l => l !== draggedLabel))

    // If this position already had an answer, put it back in pool
    const existingAnswer = userAnswers.get(labelId)
    if (existingAnswer) {
      setAvailableLabels(prev => [...prev, existingAnswer])
    }

    // Set the new answer
    setUserAnswers(prev => {
      const newMap = new Map(prev)
      newMap.set(labelId, draggedLabel)
      return newMap
    })

    setDraggedLabel(null)
  }

  const handleRemoveFromPosition = (labelId: string) => {
    if (hasChecked) return

    const answer = userAnswers.get(labelId)
    if (answer) {
      setAvailableLabels(prev => [...prev, answer])
      setUserAnswers(prev => {
        const newMap = new Map(prev)
        newMap.delete(labelId)
        return newMap
      })
    }
  }

  const handleTypeAnswer = (labelId: string, value: string) => {
    if (hasChecked) return

    setUserAnswers(prev => {
      const newMap = new Map(prev)
      if (value.trim()) {
        newMap.set(labelId, value)
      } else {
        newMap.delete(labelId)
      }
      return newMap
    })
  }

  const handleCheck = () => {
    const newResults = new Map<string, boolean>()

    labels.forEach(label => {
      const userAnswer = userAnswers.get(label.id) || ''
      const isCorrect = normalizeText(userAnswer) === normalizeText(label.correct_text)
      newResults.set(label.id, isCorrect)
    })

    setResults(newResults)
    setHasChecked(true)

    const correctCount = Array.from(newResults.values()).filter(v => v).length
    const allCorrect = correctCount === labels.length
    onAnswer(allCorrect, correctCount, labels.length)
  }

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:'"()[\]{}]/g, '')
      .replace(/\s+/g, ' ')
  }

  const getLabelStyle = (labelId: string) => {
    const hasAnswer = userAnswers.has(labelId)
    const isCorrect = results.get(labelId)

    if (hasChecked) {
      if (isCorrect) {
        return 'bg-green-100 dark:bg-green-900/40 border-green-500 text-green-700 dark:text-green-300'
      } else {
        return 'bg-red-100 dark:bg-red-900/40 border-red-500 text-red-700 dark:text-red-300'
      }
    }

    if (hasAnswer) {
      return 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-500 text-indigo-700 dark:text-indigo-300'
    }

    return 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
  }

  const allAnswered = labels.every(l => userAnswers.has(l.id))
  const correctCount = Array.from(results.values()).filter(v => v).length

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Mode Toggle (only for 'both' mode) */}
      {interactionMode === 'both' && !hasChecked && (
        <div className="mb-4 flex justify-center gap-2">
          <button
            onClick={() => setActiveMode('drag')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeMode === 'drag'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('dragMode') || 'Drag Labels'}
          </button>
          <button
            onClick={() => setActiveMode('type')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeMode === 'type'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t('typeMode') || 'Type Answers'}
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mb-4 text-center">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {hasChecked
            ? t('youGot', { correct: correctCount, total: labels.length })
            : activeMode === 'drag'
              ? t('dragLabelsInstruction') || 'Drag labels to the correct positions on the image'
              : t('typeLabelsInstruction') || 'Type the correct labels in the boxes'}
        </p>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        className="relative mb-6 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900"
      >
        {/* The Image */}
        <div className="relative w-full" style={{ paddingBottom: '66.67%' }}>
          <Image
            src={imageUrl}
            alt={imageAlt || 'Diagram to label'}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 80vw, 60vw"
          />

          {/* Label Positions */}
          {labels.map(label => (
            <div
              key={label.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${label.x}%`,
                top: `${label.y}%`,
                minWidth: label.box_width ? `${label.box_width}%` : '80px',
              }}
            >
              {activeMode === 'drag' ? (
                // Drop Zone for Drag Mode
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropOnPosition(label.id)}
                  onClick={() => userAnswers.has(label.id) && handleRemoveFromPosition(label.id)}
                  className={`min-w-[80px] min-h-[32px] px-2 py-1 rounded-lg border-2 border-dashed transition-all cursor-pointer text-center text-sm font-medium ${getLabelStyle(label.id)} ${
                    draggedLabel && !hasChecked ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : ''
                  }`}
                >
                  {userAnswers.get(label.id) || (
                    <span className="text-gray-400">?</span>
                  )}
                  {hasChecked && !results.get(label.id) && (
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {label.correct_text}
                    </div>
                  )}
                </div>
              ) : (
                // Input for Type Mode
                <input
                  type="text"
                  value={userAnswers.get(label.id) || ''}
                  onChange={(e) => handleTypeAnswer(label.id, e.target.value)}
                  disabled={hasChecked}
                  placeholder="..."
                  className={`min-w-[80px] px-2 py-1 rounded-lg border-2 text-center text-sm font-medium transition-all outline-none ${getLabelStyle(label.id)}`}
                  style={{ width: label.box_width ? `${label.box_width * 3}px` : '100px' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Image Credit */}
        {imageCredit && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-2 py-1 rounded">
            Photo by{' '}
            {imageCreditUrl ? (
              <a href={imageCreditUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {imageCredit}
              </a>
            ) : (
              imageCredit
            )}
          </div>
        )}
      </div>

      {/* Label Bank (Drag Mode) */}
      {activeMode === 'drag' && !hasChecked && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            {t('labelBank') || 'Available Labels'}
          </p>
          <div className="flex flex-wrap gap-2">
            {availableLabels.map((label, index) => (
              <div
                key={`${label}-${index}`}
                draggable
                onDragStart={() => handleDragStart(label)}
                onDragEnd={handleDragEnd}
                className={`px-3 py-2 rounded-lg font-medium cursor-grab active:cursor-grabbing transition-all ${
                  draggedLabel === label
                    ? 'bg-indigo-500 text-white shadow-lg scale-105'
                    : 'bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                }`}
              >
                {label}
              </div>
            ))}
            {availableLabels.length === 0 && (
              <p className="text-gray-400 dark:text-gray-500 text-sm italic">
                {t('allLabelsPlaced') || 'All labels placed'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Result Message */}
      {hasChecked && (
        <div
          className={`mb-4 p-4 rounded-xl ${
            correctCount === labels.length
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          }`}
        >
          <p
            className={`font-bold text-lg text-center ${
              correctCount === labels.length
                ? 'text-green-700 dark:text-green-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {correctCount === labels.length
              ? t('perfectLabeling') || 'Perfect! All labels correct!'
              : t('youGot', { correct: correctCount, total: labels.length })}
          </p>
        </div>
      )}

      {/* Correct Answers (shown if any wrong) */}
      {hasChecked && correctCount < labels.length && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            {t('correctLabels') || 'Correct Labels'}
          </p>
          <div className="space-y-2">
            {labels.map((label) => (
              <div key={label.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    results.get(label.id)
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {results.get(label.id) ? '\u2713' : '\u2717'}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Position ({label.x}%, {label.y}%):
                </span>
                <span className="text-green-600 dark:text-green-400">
                  {label.correct_text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Check Button */}
      {!hasChecked ? (
        <button
          onClick={handleCheck}
          disabled={!allAnswered}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            !allAnswered
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {allAnswered
            ? t('checkAnswers')
            : t('labelAllPositions', { labeled: userAnswers.size, total: labels.length }) ||
              `Label all positions (${userAnswers.size}/${labels.length})`}
        </button>
      ) : null}
    </div>
  )
}
