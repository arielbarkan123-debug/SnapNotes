'use client'

import { useState, useEffect, useMemo } from 'react'
import { type MatchingPair } from '@/types'
import { formatMathInText } from '@/lib/utils/math-format'
import { type QuestionRendererProps } from './types'
import { normalizeAnswer } from './utils'

export default function MatchingRenderer({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      'w-full p-3 text-start rounded-xl border-2 transition-all duration-200 font-medium text-sm '

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
        'border-violet-500 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 ring-2 ring-violet-300'
    } else if (isMatched) {
      baseClass +=
        'border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
    } else {
      baseClass +=
        'border-gray-200 dark:border-gray-700 hover:border-violet-400 text-gray-700 dark:text-gray-300'
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
      'w-full p-3 text-start rounded-xl border-2 transition-all duration-200 font-medium text-sm '

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
        'border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
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
