'use client'

import dynamic from 'next/dynamic'
import { MathText } from '@/components/ui/MathRenderer'
import { type QuestionRendererProps } from './types'
import { normalizeAnswer } from './utils'

const MarkdownWithMath = dynamic(() => import('@/components/prepare/MarkdownWithMath'), { ssr: false })

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
          'border-violet-500 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
      } else {
        baseClass +=
          'border-gray-200 dark:border-gray-700 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/20 text-gray-700 dark:text-gray-300'
      }
    }

    return baseClass
  }

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
        <MathText>{question.question_text}</MathText>
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
          <MarkdownWithMath className="text-gray-700 dark:text-gray-300 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_strong]:font-semibold dark:[&_strong]:text-white [&_em]:italic [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1 [&_li]:my-0.5 [&_code]:bg-gray-200 dark:[&_code]:bg-gray-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm">
            {question.explanation}
          </MarkdownWithMath>
        </div>
      )}
    </div>
  )
}
