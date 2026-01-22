'use client'

import { useState, useEffect } from 'react'
import { formatMathInText } from '@/lib/utils/math-format'
import { type QuestionRendererProps } from './types'
import { checkTextAnswer } from './utils'

export default function ShortAnswerRenderer({
  question,
  answer,
  onAnswer,
  showResults,
}: QuestionRendererProps) {
  const [inputValue, setInputValue] = useState(answer?.answer || '')

  useEffect(() => {
    setInputValue(answer?.answer || '')
  }, [answer])

  const handleChange = (value: string) => {
    setInputValue(value)
    onAnswer({ questionId: question.id, answer: value })
  }

  const userIsCorrect = checkTextAnswer(
    inputValue,
    question.correct_answer,
    question.acceptable_answers
  )

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
        {formatMathInText(question.question_text)}
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Your answer (1-3 words):
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={showResults}
          placeholder="Type your answer..."
          autoComplete="off"
          className={`w-full px-4 py-3 text-lg rounded-xl border-2 transition-all outline-none ${
            showResults
              ? userIsCorrect
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800'
          }`}
        />
      </div>

      {showResults && !userIsCorrect && question.correct_answer && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-600 dark:text-red-400">
            Correct answer:{' '}
            <span className="font-semibold">{formatMathInText(question.correct_answer)}</span>
          </p>
        </div>
      )}

      {showResults && question.explanation && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Explanation</p>
          <p className="text-gray-700 dark:text-gray-300">{formatMathInText(question.explanation)}</p>
        </div>
      )}
    </div>
  )
}
