'use client'

import { useState, useEffect, useMemo } from 'react'
import { formatMathInText } from '@/lib/utils/math-format'
import { type QuestionRendererProps } from './types'
import { normalizeAnswer } from './utils'

export default function OrderingRenderer({
  question,
  answer,
  onAnswer,
  showResults,
}: QuestionRendererProps) {
  // Memoize correctOrder to prevent dependency changes
  const correctOrder = useMemo(() => question.ordering_items || [], [question.ordering_items])

  // Shuffle items on mount (intentionally only on mount)
  const initialOrder = useMemo(() => {
    const items = [...correctOrder]
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [currentOrder, setCurrentOrder] = useState<string[]>(
    answer?.orderingAnswer || initialOrder
  )

  // Initialize from answer (only on mount)
  useEffect(() => {
    if (answer?.orderingAnswer) {
      setCurrentOrder(answer.orderingAnswer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (showResults) return
    const newOrder = [...currentOrder]
    const [movedItem] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, movedItem)
    setCurrentOrder(newOrder)
    onAnswer({ questionId: question.id, answer: '', orderingAnswer: newOrder })
  }

  const moveUp = (index: number) => {
    if (index > 0) moveItem(index, index - 1)
  }

  const moveDown = (index: number) => {
    if (index < currentOrder.length - 1) moveItem(index, index + 1)
  }

  const isPositionCorrect = (index: number): boolean => {
    const currentItem = currentOrder[index]
    const correctItem = correctOrder[index]
    if (currentItem == null || correctItem == null) return false
    return normalizeAnswer(currentItem) === normalizeAnswer(correctItem)
  }

  const getItemStyle = (index: number) => {
    const correct = isPositionCorrect(index)

    let baseClass =
      'w-full p-4 rounded-xl border-2 transition-all duration-200 font-medium flex items-center gap-3 '

    if (showResults) {
      if (correct) {
        baseClass +=
          'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      } else {
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      }
    } else {
      baseClass +=
        'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
    }

    return baseClass
  }

  const correctCount = currentOrder.filter((_, i) => isPositionCorrect(i)).length

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
        {formatMathInText(question.question_text)}
      </p>

      {!showResults && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Use the arrows to arrange in correct order
        </p>
      )}

      <div className="space-y-2">
        {currentOrder.map((item, index) => (
          <div key={`${item}-${index}`} className={getItemStyle(index)}>
            {/* Position Number */}
            <span
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                showResults
                  ? isPositionCorrect(index)
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {index + 1}
            </span>

            {/* Item Text */}
            <span className="flex-1">{formatMathInText(item)}</span>

            {/* Up/Down Buttons */}
            {!showResults && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className={`p-1 rounded transition-colors ${
                    index === 0
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === currentOrder.length - 1}
                  className={`p-1 rounded transition-colors ${
                    index === currentOrder.length - 1
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}

            {/* Result Icon */}
            {showResults && (
              <span className="text-xl">{isPositionCorrect(index) ? '✓' : '✗'}</span>
            )}
          </div>
        ))}
      </div>

      {showResults && correctCount < correctOrder.length && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Correct order:
          </p>
          <ol className="space-y-1">
            {correctOrder.map((item, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-xs">
                  {index + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{formatMathInText(item)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
