'use client'

import { useState, useEffect, useMemo } from 'react'
import { ExamQuestion, ExamAnswer, MatchingPair, SubQuestion, ImageLabel } from '@/types'
import { formatMathInText } from '@/lib/utils/math-format'
import Image from 'next/image'

// =============================================================================
// Types
// =============================================================================

interface QuestionRendererProps {
  question: ExamQuestion
  answer: ExamAnswer | undefined
  onAnswer: (answer: ExamAnswer) => void
  showResults: boolean
}

// =============================================================================
// Main Component
// =============================================================================

export default function QuestionRenderer({
  question,
  answer,
  onAnswer,
  showResults,
}: QuestionRendererProps) {
  switch (question.question_type) {
    case 'multiple_choice':
      return (
        <MultipleChoiceRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'true_false':
      return (
        <TrueFalseRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'fill_blank':
      return (
        <FillBlankRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'short_answer':
      return (
        <ShortAnswerRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'matching':
      return (
        <MatchingRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'ordering':
      return (
        <OrderingRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'passage_based':
      return (
        <PassageBasedRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'image_label':
      return (
        <ImageLabelRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    default:
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
          Unknown question type: {question.question_type}
        </div>
      )
  }
}

// =============================================================================
// Multiple Choice Renderer
// =============================================================================

function MultipleChoiceRenderer({
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
      'w-full p-4 text-left rounded-xl border-2 transition-all duration-200 font-medium min-h-[56px] '

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
          'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
      } else {
        baseClass +=
          'border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-300'
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
        return 'bg-indigo-500 text-white'
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

// =============================================================================
// True/False Renderer
// =============================================================================

function TrueFalseRenderer({
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

// =============================================================================
// Fill in the Blank Renderer
// =============================================================================

function FillBlankRenderer({
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
          {formatMathInText(question.question_text)}
        </p>
      )
    }

    return (
      <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed mb-4">
        {parts.map((part, index) => (
          <span key={index}>
            {formatMathInText(part)}
            {index < parts.length - 1 && (
              <span
                className={`inline-block min-w-[100px] mx-1 px-2 py-1 rounded-lg border-2 border-dashed ${
                  showResults
                    ? userIsCorrect
                      ? 'border-green-500 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'border-red-500 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {formatMathInText(inputValue) || '___'}
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

// =============================================================================
// Short Answer Renderer
// =============================================================================

function ShortAnswerRenderer({
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

// =============================================================================
// Matching Renderer
// =============================================================================

function MatchingRenderer({
  question,
  answer,
  onAnswer,
  showResults,
}: QuestionRendererProps) {
  // Memoize correctPairs to prevent useMemo dependency changes
  const correctPairs = useMemo(() => question.matching_pairs || [], [question.matching_pairs])

  // Shuffle definitions on mount
  const shuffledDefinitions = useMemo(() => {
    const defs = correctPairs
      .map((pair, index) => ({ text: pair?.right || '', originalIndex: index }))
      .filter(d => d.text) // Filter out empty definitions
    for (let i = defs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[defs[i], defs[j]] = [defs[j], defs[i]]
    }
    return defs
  }, [correctPairs])

  const [selectedTerm, setSelectedTerm] = useState<number | null>(null)
  const [matches, setMatches] = useState<Map<number, number>>(new Map())

  // Initialize matches from answer if available (only on mount)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (answer?.matchingAnswers && answer.matchingAnswers.length > 0) {
      const newMatches = new Map<number, number>()
      answer.matchingAnswers.forEach((pair) => {
        if (!pair?.left || !pair?.right) return
        const termIndex = correctPairs.findIndex(
          (p) => p?.left && normalizeAnswer(p.left) === normalizeAnswer(pair.left)
        )
        const defIndex = shuffledDefinitions.findIndex(
          (d) => {
            const correctPair = correctPairs[d.originalIndex]
            return correctPair?.right && normalizeAnswer(correctPair.right) === normalizeAnswer(pair.right)
          }
        )
        if (termIndex >= 0 && defIndex >= 0) {
          newMatches.set(termIndex, defIndex)
        }
      })
      setMatches(newMatches)
    }
  }, [])

  const handleTermClick = (termIndex: number) => {
    if (showResults) return
    if (matches.has(termIndex)) {
      const newMatches = new Map(matches)
      newMatches.delete(termIndex)
      setMatches(newMatches)
      updateAnswer(newMatches)
      setSelectedTerm(null)
    } else {
      setSelectedTerm(termIndex)
    }
  }

  const handleDefinitionClick = (defIndex: number) => {
    if (showResults || selectedTerm === null) return

    const newMatches = new Map(matches)
    // Remove any existing match to this definition
    for (const [term, def] of newMatches) {
      if (def === defIndex) {
        newMatches.delete(term)
      }
    }
    newMatches.set(selectedTerm, defIndex)
    setMatches(newMatches)
    updateAnswer(newMatches)
    setSelectedTerm(null)
  }

  const updateAnswer = (matchMap: Map<number, number>) => {
    const matchingAnswers: MatchingPair[] = []
    matchMap.forEach((defIndex, termIndex) => {
      const termPair = correctPairs[termIndex]
      const defOriginalIndex = shuffledDefinitions[defIndex]?.originalIndex
      const defPair = defOriginalIndex != null ? correctPairs[defOriginalIndex] : null
      if (termPair?.left && defPair?.right) {
        matchingAnswers.push({
          left: termPair.left,
          right: defPair.right,
        })
      }
    })
    onAnswer({ questionId: question.id, answer: '', matchingAnswers })
  }

  const handleReset = () => {
    if (showResults) return
    setMatches(new Map())
    setSelectedTerm(null)
    onAnswer({ questionId: question.id, answer: '', matchingAnswers: [] })
  }

  const isMatchCorrect = (termIndex: number): boolean | null => {
    if (!matches.has(termIndex)) return null
    const defIndex = matches.get(termIndex)
    if (defIndex == null) return null
    const shuffledDef = shuffledDefinitions[defIndex]
    if (!shuffledDef) return null
    return shuffledDef.originalIndex === termIndex
  }

  const getTermStyle = (termIndex: number) => {
    const isSelected = selectedTerm === termIndex
    const isMatched = matches.has(termIndex)
    const correct = isMatchCorrect(termIndex)

    let baseClass =
      'w-full p-3 text-left rounded-xl border-2 transition-all duration-200 font-medium text-sm '

    if (showResults) {
      if (correct === true) {
        baseClass +=
          'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      } else if (correct === false) {
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      } else {
        baseClass += 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
      }
    } else if (isSelected) {
      baseClass +=
        'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-300'
    } else if (isMatched) {
      baseClass +=
        'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
    } else {
      baseClass +=
        'border-gray-200 dark:border-gray-700 hover:border-indigo-400 text-gray-700 dark:text-gray-300'
    }

    return baseClass
  }

  const getDefinitionStyle = (defIndex: number) => {
    const isMatched = Array.from(matches.values()).includes(defIndex)
    const canSelect = selectedTerm !== null

    // Find if this definition was matched and check correctness
    let matchedTermIndex: number | null = null
    for (const [term, def] of matches) {
      if (def === defIndex) {
        matchedTermIndex = term
        break
      }
    }
    const shuffledDef = shuffledDefinitions[defIndex]
    const correct =
      matchedTermIndex !== null && shuffledDef
        ? shuffledDef.originalIndex === matchedTermIndex
        : null

    let baseClass =
      'w-full p-3 text-left rounded-xl border-2 transition-all duration-200 font-medium text-sm '

    if (showResults) {
      if (correct === true) {
        baseClass +=
          'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      } else if (correct === false) {
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      } else {
        baseClass += 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500'
      }
    } else if (isMatched) {
      baseClass +=
        'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
    } else if (canSelect) {
      baseClass +=
        'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:border-amber-500 text-gray-700 dark:text-gray-300 cursor-pointer'
    } else {
      baseClass += 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
    }

    return baseClass
  }

  return (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-gray-900 dark:text-white leading-relaxed">
        {formatMathInText(question.question_text)}
      </p>

      {!showResults && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {selectedTerm !== null
            ? 'Now tap a definition to match'
            : 'Tap a term, then tap its matching definition'}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Terms Column */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Terms
          </p>
          {correctPairs.map((pair, index) => (
            pair?.left ? (
              <button
                key={`term-${index}`}
                onClick={() => handleTermClick(index)}
                disabled={showResults}
                className={getTermStyle(index)}
              >
                <span className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span>{formatMathInText(pair.left)}</span>
                </span>
              </button>
            ) : null
          ))}
        </div>

        {/* Definitions Column */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Definitions
          </p>
          {shuffledDefinitions.map((def, index) => (
            <button
              key={`def-${index}`}
              onClick={() => handleDefinitionClick(index)}
              disabled={showResults || selectedTerm === null}
              className={getDefinitionStyle(index)}
            >
              <span className="flex items-center gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{formatMathInText(def.text)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {!showResults && matches.size > 0 && (
        <button
          onClick={handleReset}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 underline"
        >
          Reset all matches
        </button>
      )}

      {showResults && correctPairs.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Correct pairings:
          </p>
          <div className="space-y-1">
            {correctPairs.map((pair, index) => (
              pair?.left && pair?.right ? (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{formatMathInText(pair.left)}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-green-600 dark:text-green-400">{formatMathInText(pair.right)}</span>
                </div>
              ) : null
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Ordering Renderer
// =============================================================================

function OrderingRenderer({
  question,
  answer,
  onAnswer,
  showResults,
}: QuestionRendererProps) {
  // Memoize correctOrder to prevent dependency changes
  const correctOrder = useMemo(() => question.ordering_items || [], [question.ordering_items])

  // Shuffle items on mount (intentionally only on mount)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialOrder = useMemo(() => {
    const items = [...correctOrder]
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }
    return items
  }, [])

  const [currentOrder, setCurrentOrder] = useState<string[]>(
    answer?.orderingAnswer || initialOrder
  )

  // Initialize from answer (only on mount)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (answer?.orderingAnswer) {
      setCurrentOrder(answer.orderingAnswer)
    }
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
                      : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
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
                      : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
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

// =============================================================================
// Passage Based Renderer
// =============================================================================

function PassageBasedRenderer({
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (answer?.subAnswers) {
      const map = new Map<string, string>()
      answer.subAnswers.forEach((sa) => {
        map.set(sa.subQuestionId, sa.answer)
      })
      setSubAnswers(map)
    }
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

// =============================================================================
// Image Label Renderer
// =============================================================================

function ImageLabelRenderer({
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

// =============================================================================
// Sub-question Components
// =============================================================================

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

// =============================================================================
// Helper Functions
// =============================================================================

function normalizeAnswer(text: string | null | undefined): string {
  if (text == null) return ''
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
}

function checkTextAnswer(
  userAnswer: string | null | undefined,
  correctAnswer: string | null | undefined,
  acceptableAnswers: string[] | null | undefined
): boolean {
  if (!userAnswer || !correctAnswer) return false

  const normalizedUser = normalizeAnswer(userAnswer)
  const normalizedCorrect = normalizeAnswer(correctAnswer)

  if (!normalizedUser) return false
  if (normalizedUser === normalizedCorrect) return true

  if (acceptableAnswers && Array.isArray(acceptableAnswers)) {
    return acceptableAnswers.some((alt) => alt && normalizeAnswer(alt) === normalizedUser)
  }

  return false
}
