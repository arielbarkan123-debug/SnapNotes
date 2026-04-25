'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MathText } from '@/components/ui/MathRenderer'
import { type QuestionRendererProps } from './types'
import { checkTextAnswer } from './utils'

const MarkdownWithMath = dynamic(() => import('@/components/prepare/MarkdownWithMath'), { ssr: false })

export default function FillBlankRenderer({
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

  // Parse question text to find blank
  const renderQuestionWithBlank = () => {
    const blankPattern = /_{2,}|\[blank\]|\[___\]/gi
    const parts = question.question_text.split(blankPattern)

    if (parts.length === 1) {
      return (
        <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed mb-4">
          <MathText>{question.question_text}</MathText>
        </p>
      )
    }

    return (
      <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed mb-4">
        {parts.map((part, index) => (
          <span key={index}>
            <MathText>{part}</MathText>
            {index < parts.length - 1 && (
              <span
                className={`inline-block min-w-[100px] mx-1 px-2 py-1 rounded-lg border-2 border-dashed ${
                  showResults
                    ? userIsCorrect
                      ? 'border-green-500 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'border-red-500 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                }`}
              >
                {inputValue ? <MathText>{inputValue}</MathText> : '___'}
              </span>
            )}
          </span>
        ))}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {renderQuestionWithBlank()}

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Your answer:
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
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-800'
          }`}
        />
      </div>

      {showResults && !userIsCorrect && question.correct_answer && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-600 dark:text-red-400">
            Correct answer:{' '}
            <span className="font-semibold"><MathText>{question.correct_answer}</MathText></span>
          </p>
        </div>
      )}

      {showResults && question.explanation && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Explanation</p>
          <MarkdownWithMath className="text-gray-700 dark:text-gray-300 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold dark:[&_strong]:text-white [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0.5 [&_code]:bg-gray-200 dark:[&_code]:bg-gray-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm">
            {question.explanation}
          </MarkdownWithMath>
        </div>
      )}
    </div>
  )
}
