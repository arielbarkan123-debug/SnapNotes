'use client'

import { formatMathInText } from '@/lib/utils/math-format'
import { type QuestionRendererProps } from './types'
import { normalizeAnswer } from './utils'

export default function MultipleChoiceRenderer({
  question,
  answer,
  onAnswer,
  showResults,
}: QuestionRendererProps) {
  const selectedAnswer = answer?.answer || null

  // Filter out any undefined/null options
  const validOptions = (question.options || []).filter(
    (opt): opt is string => opt != null && typeof opt === 'string'
  )

  const handleSelect = (option: string) => {
    if (showResults) return
    onAnswer({ questionId: question.id, answer: option })
  }

  const isCorrectOption = (option: string): boolean => {
    if (!question.correct_answer) return false
    return normalizeAnswer(option) === normalizeAnswer(question.correct_answer)
  }

  const isSelectedOption = (option: string): boolean => {
    if (!selectedAnswer) return false
    return normalizeAnswer(selectedAnswer) === normalizeAnswer(option)
  }

  const getOptionStyle = (option: string) => {
    const isSelected = isSelectedOption(option)
    const optionIsCorrect = isCorrectOption(option)

    let baseClass =
      'w-full p-4 text-start rounded-xl border-2 transition-all duration-200 font-medium min-h-[56px] '

    if (showResults) {
      if (optionIsCorrect) {
        baseClass +=
          'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      } else if (isSelected && !optionIsCorrect) {
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      } else {
        baseClass += 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
      }
    } else {
      if (isSelected) {
        baseClass +=
          'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
      } else {
        baseClass +=
          'border-gray-200 dark:border-gray-700 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/20 text-gray-700 dark:text-gray-300'
      }
    }

    return baseClass
  }

  const getCircleStyle = (option: string) => {
    const isSelected = isSelectedOption(option)
    const optionIsCorrect = isCorrectOption(option)

    if (showResults) {
      if (optionIsCorrect) {
        return 'bg-green-500 text-white'
      } else if (isSelected) {
        return 'bg-red-500 text-white'
      } else {
        return 'bg-gray-200 dark:bg-gray-700 text-gray-500'
      }
    } else {
      if (isSelected) {
        return 'bg-violet-500 text-white'
      } else {
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
      }
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
        {formatMathInText(question.question_text)}
      </p>

      <div className="space-y-3">
        {validOptions.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(option)}
            disabled={showResults}
            className={getOptionStyle(option)}
          >
            <span className="flex items-center gap-3">
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getCircleStyle(option)}`}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span className="flex-1">{formatMathInText(option)}</span>
              {showResults && isCorrectOption(option) && (
                <span className="text-green-500 text-xl">✓</span>
              )}
              {showResults && isSelectedOption(option) && !isCorrectOption(option) && (
                <span className="text-red-500 text-xl">✗</span>
              )}
            </span>
          </button>
        ))}
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
