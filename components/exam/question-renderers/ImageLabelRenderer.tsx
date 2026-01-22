'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { type ImageLabel } from '@/types'
import { formatMathInText } from '@/lib/utils/math-format'
import { type QuestionRendererProps } from './types'
import { normalizeAnswer } from './utils'

export default function ImageLabelRenderer({
  question,
  answer,
  onAnswer,
  showResults,
}: QuestionRendererProps) {
  const imageLabelData = question.image_label_data
  const labels = imageLabelData?.labels || []
  const interactionMode = imageLabelData?.interaction_mode || 'type'

  const [userAnswers, setUserAnswers] = useState<Map<string, string>>(new Map())
  const [activeMode, setActiveMode] = useState<'drag' | 'type'>(
    interactionMode === 'both' ? 'type' : interactionMode
  )

  // For drag mode - available labels pool
  const [availableLabels, setAvailableLabels] = useState<string[]>([])
  const [draggedLabel, setDraggedLabel] = useState<string | null>(null)

  // Initialize from existing answer
  useEffect(() => {
    if (answer?.imageLabelAnswers) {
      const map = new Map<string, string>()
      answer.imageLabelAnswers.forEach((la) => {
        map.set(la.labelId, la.answer)
      })
      setUserAnswers(map)

      // Update available labels for drag mode
      if (interactionMode === 'drag' || interactionMode === 'both') {
        const usedLabels = new Set(answer.imageLabelAnswers.map(la => la.answer))
        const available = labels
          .map(l => l.correct_text)
          .filter(text => !usedLabels.has(text))
        setAvailableLabels(available)
      }
    } else {
      // Initialize shuffled labels for drag mode
      const shuffled = [...labels.map(l => l.correct_text)]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      setAvailableLabels(shuffled)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateAnswer = (newAnswers: Map<string, string>) => {
    const imageLabelAnswers = Array.from(newAnswers).map(([labelId, ans]) => ({
      labelId,
      answer: ans,
    }))
    onAnswer({ questionId: question.id, answer: '', imageLabelAnswers })
  }

  const handleTypeAnswer = (labelId: string, value: string) => {
    if (showResults) return
    const newAnswers = new Map(userAnswers)
    if (value.trim()) {
      newAnswers.set(labelId, value)
    } else {
      newAnswers.delete(labelId)
    }
    setUserAnswers(newAnswers)
    updateAnswer(newAnswers)
  }

  const handleDragStart = (labelText: string) => {
    if (showResults) return
    setDraggedLabel(labelText)
  }

  const handleDropOnPosition = (labelId: string) => {
    if (showResults || !draggedLabel) return

    setAvailableLabels(prev => prev.filter(l => l !== draggedLabel))

    const existingAnswer = userAnswers.get(labelId)
    if (existingAnswer) {
      setAvailableLabels(prev => [...prev, existingAnswer])
    }

    const newAnswers = new Map(userAnswers)
    newAnswers.set(labelId, draggedLabel)
    setUserAnswers(newAnswers)
    updateAnswer(newAnswers)
    setDraggedLabel(null)
  }

  const handleRemoveFromPosition = (labelId: string) => {
    if (showResults) return
    const answer = userAnswers.get(labelId)
    if (answer) {
      setAvailableLabels(prev => [...prev, answer])
      const newAnswers = new Map(userAnswers)
      newAnswers.delete(labelId)
      setUserAnswers(newAnswers)
      updateAnswer(newAnswers)
    }
  }

  const isLabelCorrect = (label: ImageLabel): boolean => {
    const userAnswer = userAnswers.get(label.id)
    if (!userAnswer) return false
    return normalizeAnswer(userAnswer) === normalizeAnswer(label.correct_text)
  }

  const getLabelStyle = (label: ImageLabel) => {
    const hasAnswer = userAnswers.has(label.id)
    const isCorrect = isLabelCorrect(label)

    if (showResults) {
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

  const correctCount = labels.filter(l => isLabelCorrect(l)).length

  if (!imageLabelData) {
    return (
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400">
        Image label data not available for this question.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
        {formatMathInText(question.question_text)}
      </p>

      {/* Mode Toggle (only for 'both' mode) */}
      {interactionMode === 'both' && !showResults && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setActiveMode('drag')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeMode === 'drag'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Drag Labels
          </button>
          <button
            onClick={() => setActiveMode('type')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeMode === 'type'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Type Answers
          </button>
        </div>
      )}

      {/* Image Container */}
      <div className="relative rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
        <div className="relative w-full" style={{ paddingBottom: '66.67%' }}>
          <Image
            src={imageLabelData.image_url}
            alt={imageLabelData.image_alt || 'Diagram to label'}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 80vw"
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
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropOnPosition(label.id)}
                  onClick={() => userAnswers.has(label.id) && handleRemoveFromPosition(label.id)}
                  className={`min-w-[70px] min-h-[28px] px-2 py-1 rounded border-2 border-dashed transition-all cursor-pointer text-center text-xs font-medium ${getLabelStyle(label)} ${
                    draggedLabel && !showResults ? 'border-amber-400 bg-amber-50/80 dark:bg-amber-900/30' : ''
                  }`}
                >
                  {userAnswers.get(label.id) || <span className="text-gray-400">?</span>}
                  {showResults && !isLabelCorrect(label) && (
                    <div className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
                      {label.correct_text}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={userAnswers.get(label.id) || ''}
                  onChange={(e) => handleTypeAnswer(label.id, e.target.value)}
                  disabled={showResults}
                  placeholder="..."
                  className={`min-w-[70px] px-2 py-1 rounded border-2 text-center text-xs font-medium transition-all outline-none ${getLabelStyle(label)}`}
                  style={{ width: label.box_width ? `${label.box_width * 2.5}px` : '90px' }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Image Credit */}
        {imageLabelData.image_credit && (
          <div className="absolute bottom-1 right-1 text-[10px] text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 px-1.5 py-0.5 rounded">
            Photo by{' '}
            {imageLabelData.image_credit_url ? (
              <a href={imageLabelData.image_credit_url} target="_blank" rel="noopener noreferrer" className="underline">
                {imageLabelData.image_credit}
              </a>
            ) : (
              imageLabelData.image_credit
            )}
          </div>
        )}
      </div>

      {/* Label Bank (Drag Mode) */}
      {activeMode === 'drag' && !showResults && availableLabels.length > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Available Labels
          </p>
          <div className="flex flex-wrap gap-2">
            {availableLabels.map((label, index) => (
              <div
                key={`${label}-${index}`}
                draggable
                onDragStart={() => handleDragStart(label)}
                onDragEnd={() => setDraggedLabel(null)}
                className={`px-2 py-1 rounded text-sm font-medium cursor-grab active:cursor-grabbing transition-all ${
                  draggedLabel === label
                    ? 'bg-indigo-500 text-white shadow-lg scale-105'
                    : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {showResults && (
        <div className={`p-3 rounded-xl ${
          correctCount === labels.length
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
        }`}>
          <p className={`font-bold text-center ${
            correctCount === labels.length
              ? 'text-green-700 dark:text-green-400'
              : 'text-amber-700 dark:text-amber-400'
          }`}>
            {correctCount === labels.length
              ? 'Perfect! All labels correct!'
              : `${correctCount} of ${labels.length} labels correct`}
          </p>
        </div>
      )}

      {/* Correct Answers */}
      {showResults && correctCount < labels.length && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Correct Labels:
          </p>
          <div className="space-y-1">
            {labels.map((label) => (
              <div key={label.id} className="flex items-center gap-2 text-sm">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  isLabelCorrect(label) ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {isLabelCorrect(label) ? '\u2713' : '\u2717'}
                </span>
                <span className="text-green-600 dark:text-green-400 font-medium">
                  {label.correct_text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {question.explanation && showResults && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Explanation</p>
          <p className="text-gray-700 dark:text-gray-300">{formatMathInText(question.explanation)}</p>
        </div>
      )}
    </div>
  )
}
