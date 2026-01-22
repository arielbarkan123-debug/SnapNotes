'use client'

import { useState, useEffect } from 'react'
import { type SubQuestion } from '@/types'
import { formatMathInText } from '@/lib/utils/math-format'
import { type QuestionRendererProps } from './types'
import { normalizeAnswer, checkTextAnswer } from './utils'

interface SubQuestionProps {
  subQuestion: SubQuestion
  userAnswer: string
  onAnswer: (answer: string) => void
  showResults: boolean
  isCorrect: boolean
}

function SubQuestionMultipleChoice({
  subQuestion,
  userAnswer,
  onAnswer,
  showResults,
}: SubQuestionProps) {
  // Filter out any undefined/null options
  const validOptions = (subQuestion.options || []).filter(
    (opt): opt is string => opt != null && typeof opt === 'string'
  )

  const isSelectedOption = (option: string): boolean => {
    if (!userAnswer) return false
    return normalizeAnswer(userAnswer) === normalizeAnswer(option)
  }

  const isCorrectOption = (option: string): boolean => {
    if (!subQuestion.correct_answer) return false
    return normalizeAnswer(option) === normalizeAnswer(subQuestion.correct_answer)
  }

  const getOptionStyle = (option: string) => {
    const isSelected = isSelectedOption(option)
    const optionIsCorrect = isCorrectOption(option)

    let baseClass = 'w-full p-3 text-left rounded-lg border-2 transition-all text-sm '

    if (showResults) {
      if (optionIsCorrect) {
        baseClass +=
          'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      } else if (isSelected) {
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      } else {
        baseClass += 'border-gray-200 dark:border-gray-700 text-gray-400'
      }
    } else if (isSelected) {
      baseClass += 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700'
    } else {
      baseClass +=
        'border-gray-200 dark:border-gray-700 hover:border-indigo-400 text-gray-700 dark:text-gray-300'
    }

    return baseClass
  }

  const handleClick = (option: string) => {
    if (!showResults) {
      onAnswer(option)
    }
  }

  return (
    <div className="space-y-2">
      <p className="font-medium text-gray-900 dark:text-white">{formatMathInText(subQuestion.question_text)}</p>
      <div className="space-y-2">
        {validOptions.map((option, index) => (
          <button
            key={index}
            onClick={() => handleClick(option)}
            disabled={showResults}
            className={getOptionStyle(option)}
          >
            {formatMathInText(option)}
          </button>
        ))}
      </div>
    </div>
  )
}

function SubQuestionTrueFalse({
  subQuestion,
  userAnswer,
  onAnswer,
  showResults,
}: SubQuestionProps) {
  const correctAnswerNormalized = normalizeAnswer(subQuestion.correct_answer)
  const isCorrectTrue = correctAnswerNormalized === 'true'

  const isSelectedValue = (value: string): boolean => {
    if (!userAnswer) return false
    return normalizeAnswer(userAnswer) === normalizeAnswer(value)
  }

  const getButtonStyle = (value: 'True' | 'False') => {
    const isSelected = isSelectedValue(value)
    const buttonIsCorrect = (value === 'True') === isCorrectTrue

    let baseClass = 'flex-1 p-3 rounded-lg border-2 transition-all font-medium '

    if (showResults) {
      if (buttonIsCorrect) {
        baseClass +=
          'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      } else if (isSelected) {
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      } else {
        baseClass += 'border-gray-200 dark:border-gray-700 text-gray-400'
      }
    } else if (isSelected) {
      baseClass += 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700'
    } else {
      baseClass +=
        'border-gray-200 dark:border-gray-700 hover:border-indigo-400 text-gray-700 dark:text-gray-300'
    }

    return baseClass
  }

  const handleClick = (value: string) => {
    if (!showResults) {
      onAnswer(value)
    }
  }

  return (
    <div className="space-y-2">
      <p className="font-medium text-gray-900 dark:text-white">{formatMathInText(subQuestion.question_text)}</p>
      <div className="flex gap-3">
        <button
          onClick={() => handleClick('True')}
          disabled={showResults}
          className={getButtonStyle('True')}
        >
          True
        </button>
        <button
          onClick={() => handleClick('False')}
          disabled={showResults}
          className={getButtonStyle('False')}
        >
          False
        </button>
      </div>
    </div>
  )
}

function SubQuestionFillBlank({
  subQuestion,
  userAnswer,
  onAnswer,
  showResults,
  isCorrect,
}: SubQuestionProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!showResults) {
      onAnswer(e.target.value)
    }
  }

  return (
    <div className="space-y-2">
      <p className="font-medium text-gray-900 dark:text-white">{formatMathInText(subQuestion.question_text)}</p>
      <input
        type="text"
        value={userAnswer || ''}
        onChange={handleChange}
        disabled={showResults}
        placeholder="Your answer..."
        className={`w-full px-3 py-2 rounded-lg border-2 transition-all outline-none ${
          showResults
            ? isCorrect
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700'
              : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-indigo-500'
        }`}
      />
      {showResults && !isCorrect && subQuestion.correct_answer && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Correct: <span className="font-semibold">{formatMathInText(subQuestion.correct_answer)}</span>
        </p>
      )}
    </div>
  )
}

export default function PassageBasedRenderer({
  question,
  answer,
  onAnswer,
  showResults,
}: QuestionRendererProps) {
  // Filter out invalid sub_questions
  const subQuestions = (question.sub_questions || []).filter(
    (sq): sq is SubQuestion => sq != null && typeof sq.id === 'string'
  )

  const [subAnswers, setSubAnswers] = useState<Map<string, string>>(new Map())

  // Initialize from answer (only on mount)
  useEffect(() => {
    if (answer?.subAnswers) {
      const map = new Map<string, string>()
      answer.subAnswers.forEach((sa) => {
        map.set(sa.subQuestionId, sa.answer)
      })
      setSubAnswers(map)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubAnswer = (subQuestionId: string, answerValue: string) => {
    const newAnswers = new Map(subAnswers)
    newAnswers.set(subQuestionId, answerValue)
    setSubAnswers(newAnswers)

    const subAnswersArray = Array.from(newAnswers).map(([id, ans]) => ({
      subQuestionId: id,
      answer: ans,
    }))
    onAnswer({ questionId: question.id, answer: '', subAnswers: subAnswersArray })
  }

  const isSubQuestionCorrect = (sq: SubQuestion): boolean => {
    if (!sq?.id) return false
    const userAnswer = subAnswers.get(sq.id)
    if (!userAnswer || !sq.correct_answer) return false
    return checkTextAnswer(userAnswer, sq.correct_answer, sq.acceptable_answers)
  }

  return (
    <div className="space-y-6">
      {/* Passage */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
          Read the passage:
        </p>
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
          {formatMathInText(question.passage || '')}
        </p>
      </div>

      {/* Sub-questions */}
      <div className="space-y-6">
        {subQuestions.map((sq, index) => (
          <div
            key={sq.id}
            className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Question {index + 1} ({sq.points} point{sq.points > 1 ? 's' : ''})
            </p>

            {sq.question_type === 'multiple_choice' && (
              <SubQuestionMultipleChoice
                subQuestion={sq}
                userAnswer={subAnswers.get(sq.id) || ''}
                onAnswer={(ans) => handleSubAnswer(sq.id, ans)}
                showResults={showResults}
                isCorrect={isSubQuestionCorrect(sq)}
              />
            )}

            {sq.question_type === 'true_false' && (
              <SubQuestionTrueFalse
                subQuestion={sq}
                userAnswer={subAnswers.get(sq.id) || ''}
                onAnswer={(ans) => handleSubAnswer(sq.id, ans)}
                showResults={showResults}
                isCorrect={isSubQuestionCorrect(sq)}
              />
            )}

            {(sq.question_type === 'fill_blank' || sq.question_type === 'short_answer') && (
              <SubQuestionFillBlank
                subQuestion={sq}
                userAnswer={subAnswers.get(sq.id) || ''}
                onAnswer={(ans) => handleSubAnswer(sq.id, ans)}
                showResults={showResults}
                isCorrect={isSubQuestionCorrect(sq)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
