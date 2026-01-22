'use client'

import { formatMathInText } from '@/lib/utils/math-format'
import { type QuestionRendererProps } from './types'
import { normalizeAnswer } from './utils'

export default function TrueFalseRenderer({
  question,
  answer,
  onAnswer,
  showResults,
}: QuestionRendererProps) {
  const selectedAnswer = answer?.answer || null

  const handleSelect = (value: string) => {
    if (showResults) return
    onAnswer({ questionId: question.id, answer: value })
  }

  // Handle null/undefined correct_answer - default to comparing normalized value
  const correctAnswerNormalized = normalizeAnswer(question.correct_answer)
  const isCorrectTrue = correctAnswerNormalized === 'true'

  const isSelectedValue = (value: string): boolean => {
    if (!selectedAnswer) return false
    return normalizeAnswer(selectedAnswer) === normalizeAnswer(value)
  }

  const getButtonStyle = (value: 'True' | 'False') => {
    const isSelected = isSelectedValue(value)
    const buttonIsCorrect = (value === 'True') === isCorrectTrue

    let baseClass =
      'flex-1 p-4 rounded-xl border-2 transition-all duration-200 font-bold text-lg '

    if (showResults) {
      if (buttonIsCorrect) {
        baseClass +=
          'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      } else if (isSelected && !buttonIsCorrect) {
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      } else {
        baseClass += 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
      }
    } else {
      if (isSelected) {
        baseClass +=
          'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
      } else {
        baseClass +=
          'border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-300'
      }
    }

    return baseClass
  }

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
        {formatMathInText(question.question_text)}
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => handleSelect('True')}
          disabled={showResults}
          className={getButtonStyle('True')}
        >
          True
        </button>
        <button
          onClick={() => handleSelect('False')}
          disabled={showResults}
          className={getButtonStyle('False')}
        >
          False
        </button>
      </div>

      {showResults && question.explanation && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Explanation</p>
          <p className="text-gray-700 dark:text-gray-300">{formatMathInText(question.explanation)}</p>
        </div>
      )}
    </div>
  )
}
