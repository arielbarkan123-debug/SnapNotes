'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'

// =============================================================================
// Types
// =============================================================================

interface MatchingProps {
  terms: string[]
  definitions: string[]
  correctPairs: number[] // correctPairs[i] = index of definition that matches terms[i]
  onAnswer: (correct: boolean) => void
}

interface Match {
  termIndex: number
  definitionIndex: number
}

interface ShuffledDefinition {
  text: string
  originalIndex: number
}

// =============================================================================
// Component
// =============================================================================

export default function Matching({
  terms,
  definitions,
  correctPairs,
  onAnswer,
}: MatchingProps) {
  const t = useTranslations('practice')

  const [selectedTerm, setSelectedTerm] = useState<number | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [hasChecked, setHasChecked] = useState(false)
  const [results, setResults] = useState<boolean[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const termRefs = useRef<(HTMLButtonElement | null)[]>([])
  const defRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [linePositions, setLinePositions] = useState<
    { x1: number; y1: number; x2: number; y2: number; termIndex: number }[]
  >([])

  // Keyboard navigation state
  const [focusedColumn, setFocusedColumn] = useState<'terms' | 'definitions'>('terms')
  const [focusedIndex, setFocusedIndex] = useState(0)

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (hasChecked) return

    const maxTermIndex = terms.length - 1
    const maxDefIndex = definitions.length - 1

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        if (focusedColumn === 'terms') {
          setFocusedIndex(Math.max(0, focusedIndex - 1))
          termRefs.current[Math.max(0, focusedIndex - 1)]?.focus()
        } else {
          setFocusedIndex(Math.max(0, focusedIndex - 1))
          defRefs.current[Math.max(0, focusedIndex - 1)]?.focus()
        }
        break

      case 'ArrowDown':
        e.preventDefault()
        if (focusedColumn === 'terms') {
          setFocusedIndex(Math.min(maxTermIndex, focusedIndex + 1))
          termRefs.current[Math.min(maxTermIndex, focusedIndex + 1)]?.focus()
        } else {
          setFocusedIndex(Math.min(maxDefIndex, focusedIndex + 1))
          defRefs.current[Math.min(maxDefIndex, focusedIndex + 1)]?.focus()
        }
        break

      case 'ArrowLeft':
        e.preventDefault()
        if (focusedColumn === 'definitions') {
          setFocusedColumn('terms')
          const newIndex = Math.min(focusedIndex, maxTermIndex)
          setFocusedIndex(newIndex)
          termRefs.current[newIndex]?.focus()
        }
        break

      case 'ArrowRight':
      case 'Tab':
        if (e.key === 'Tab' && e.shiftKey) return // Allow normal shift+tab
        if (focusedColumn === 'terms' && selectedTerm !== null) {
          e.preventDefault()
          setFocusedColumn('definitions')
          setFocusedIndex(0)
          defRefs.current[0]?.focus()
        }
        break

      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedColumn === 'terms') {
          handleTermClick(focusedIndex)
          // If term was selected, move to definitions
          if (!isTermMatched(focusedIndex)) {
            setFocusedColumn('definitions')
            setFocusedIndex(0)
            setTimeout(() => defRefs.current[0]?.focus(), 0)
          }
        } else if (selectedTerm !== null) {
          handleDefinitionClick(focusedIndex)
          // Move back to terms for next match
          setFocusedColumn('terms')
          const nextUnmatchedTerm = terms.findIndex((_, i) =>
            !matches.some(m => m.termIndex === i) && i !== selectedTerm
          )
          if (nextUnmatchedTerm !== -1) {
            setFocusedIndex(nextUnmatchedTerm)
            setTimeout(() => termRefs.current[nextUnmatchedTerm]?.focus(), 0)
          }
        }
        break

      case 'Escape':
        // Deselect current term
        if (selectedTerm !== null) {
          e.preventDefault()
          setSelectedTerm(null)
          setFocusedColumn('terms')
          termRefs.current[focusedIndex]?.focus()
        }
        break
    }
  }

  // Shuffle definitions on mount
  const shuffledDefinitions = useMemo<ShuffledDefinition[]>(() => {
    const indexed = definitions.map((text, originalIndex) => ({ text, originalIndex }))
    // Fisher-Yates shuffle
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indexed[i], indexed[j]] = [indexed[j], indexed[i]]
    }
    return indexed
  }, [definitions])

  // Calculate line positions when matches change
  useEffect(() => {
    const calculateLines = () => {
      if (!containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const newLines: typeof linePositions = []

      matches.forEach((match) => {
        const termEl = termRefs.current[match.termIndex]
        const defEl = defRefs.current[match.definitionIndex]

        if (termEl && defEl) {
          const termRect = termEl.getBoundingClientRect()
          const defRect = defEl.getBoundingClientRect()

          newLines.push({
            x1: termRect.right - containerRect.left,
            y1: termRect.top + termRect.height / 2 - containerRect.top,
            x2: defRect.left - containerRect.left,
            y2: defRect.top + defRect.height / 2 - containerRect.top,
            termIndex: match.termIndex,
          })
        }
      })

      setLinePositions(newLines)
    }

    calculateLines()
    window.addEventListener('resize', calculateLines)
    return () => window.removeEventListener('resize', calculateLines)
  }, [matches])

  const handleTermClick = (termIndex: number) => {
    if (hasChecked) return

    // If term is already matched, remove the match
    const existingMatch = matches.find((m) => m.termIndex === termIndex)
    if (existingMatch) {
      setMatches(matches.filter((m) => m.termIndex !== termIndex))
      setSelectedTerm(null)
      return
    }

    setSelectedTerm(termIndex)
  }

  const handleDefinitionClick = (shuffledIndex: number) => {
    if (hasChecked) return
    if (selectedTerm === null) return

    // If definition is already matched, remove that match first
    const existingDefMatch = matches.find((m) => m.definitionIndex === shuffledIndex)
    if (existingDefMatch) {
      setMatches(matches.filter((m) => m.definitionIndex !== shuffledIndex))
    }

    // Remove any existing match for selected term
    const newMatches = matches.filter((m) => m.termIndex !== selectedTerm)

    // Add new match
    newMatches.push({
      termIndex: selectedTerm,
      definitionIndex: shuffledIndex,
    })

    setMatches(newMatches)
    setSelectedTerm(null)
  }

  const handleCheck = () => {
    // Check each match
    const matchResults = terms.map((_, termIndex) => {
      const match = matches.find((m) => m.termIndex === termIndex)
      if (!match) return false

      const shuffledDef = shuffledDefinitions[match.definitionIndex]
      const correctDefIndex = correctPairs[termIndex]

      return shuffledDef.originalIndex === correctDefIndex
    })

    setResults(matchResults)
    setHasChecked(true)

    const allCorrect = matchResults.every((r) => r)
    onAnswer(allCorrect)
  }

  const isTermMatched = (termIndex: number) => {
    return matches.some((m) => m.termIndex === termIndex)
  }

  const isDefinitionMatched = (shuffledIndex: number) => {
    return matches.some((m) => m.definitionIndex === shuffledIndex)
  }

  const getTermStyle = (termIndex: number) => {
    const isSelected = selectedTerm === termIndex
    const isMatched = isTermMatched(termIndex)

    let baseClass =
      'w-full p-3 text-start rounded-xl border-2 transition-all duration-200 font-medium text-sm sm:text-base '

    if (hasChecked) {
      if (results[termIndex]) {
        baseClass +=
          'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      } else {
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      }
    } else if (isSelected) {
      baseClass +=
        'border-violet-500 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 ring-2 ring-violet-300 dark:ring-violet-700'
    } else if (isMatched) {
      baseClass +=
        'border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
    } else {
      baseClass +=
        'border-gray-200 dark:border-gray-700 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/20 text-gray-700 dark:text-gray-300'
    }

    return baseClass
  }

  const getDefinitionStyle = (shuffledIndex: number) => {
    const isMatched = isDefinitionMatched(shuffledIndex)
    const canSelect = selectedTerm !== null

    let baseClass =
      'w-full p-3 text-start rounded-xl border-2 transition-all duration-200 font-medium text-sm sm:text-base '

    if (hasChecked) {
      // Find if this definition was part of a correct match
      const match = matches.find((m) => m.definitionIndex === shuffledIndex)
      if (match && results[match.termIndex]) {
        baseClass +=
          'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      } else if (match) {
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      } else {
        baseClass += 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
      }
    } else if (isMatched) {
      baseClass +=
        'border-violet-400 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
    } else if (canSelect) {
      baseClass +=
        'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:border-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-gray-700 dark:text-gray-300 cursor-pointer'
    } else {
      baseClass +=
        'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 cursor-default'
    }

    return baseClass
  }

  const getLineColor = (termIndex: number) => {
    if (!hasChecked) return '#6366f1' // indigo
    return results[termIndex] ? '#22c55e' : '#ef4444' // green or red
  }

  const allMatched = matches.length === terms.length
  const correctCount = results.filter((r) => r).length

  return (
    <div className="w-full max-w-3xl mx-auto" onKeyDown={handleKeyDown}>
      {/* Instructions */}
      <div className="mb-4 text-center">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {hasChecked
            ? t('youGot', { correct: correctCount, total: terms.length })
            : selectedTerm !== null
              ? t('nowSelectDefinition')
              : t('selectThenDefinition')}
        </p>
        {/* Keyboard instructions - only show if not checked */}
        {!hasChecked && (
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            {t('keyboardNavInstructions')}
          </p>
        )}
      </div>

      {/* Matching Area */}
      <div ref={containerRef} className="relative mb-6">
        {/* SVG for connection lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {linePositions.map((line, index) => (
            <line
              key={index}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={getLineColor(line.termIndex)}
              strokeWidth="3"
              strokeLinecap="round"
              className="transition-colors duration-300"
            />
          ))}
        </svg>

        {/* Two column layout */}
        <div className="grid grid-cols-2 gap-4 sm:gap-8">
          {/* Terms Column */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              {t('terms')}
            </p>
            {terms.map((term, index) => (
              <button
                key={`term-${index}`}
                ref={(el) => {
                  termRefs.current[index] = el
                }}
                onClick={() => handleTermClick(index)}
                disabled={hasChecked}
                className={getTermStyle(index)}
              >
                <span className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span>{term}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Definitions Column */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              {t('definitions')}
            </p>
            {shuffledDefinitions.map((def, shuffledIndex) => (
              <button
                key={`def-${shuffledIndex}`}
                ref={(el) => {
                  defRefs.current[shuffledIndex] = el
                }}
                onClick={() => handleDefinitionClick(shuffledIndex)}
                disabled={hasChecked || selectedTerm === null}
                className={getDefinitionStyle(shuffledIndex)}
              >
                <span className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(65 + shuffledIndex)}
                  </span>
                  <span>{def.text}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result Message */}
      {hasChecked && (
        <div
          className={`mb-4 p-4 rounded-xl ${
            correctCount === terms.length
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          }`}
        >
          <p
            className={`font-bold text-lg text-center ${
              correctCount === terms.length
                ? 'text-green-700 dark:text-green-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {correctCount === terms.length
              ? t('perfectMatches')
              : t('youGot', { correct: correctCount, total: terms.length })}
          </p>
        </div>
      )}

      {/* Correct Answers (shown if any wrong) */}
      {hasChecked && correctCount < terms.length && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            {t('correctPairings')}
          </p>
          <div className="space-y-2">
            {terms.map((term, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">{term}</span>
                <span className="text-gray-400">→</span>
                <span className="text-green-600 dark:text-green-400">
                  {definitions[correctPairs[index]]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      {!hasChecked ? (
        <button
          onClick={handleCheck}
          disabled={!allMatched}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            !allMatched
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {allMatched ? t('checkAnswers') : t('matchAllPairs', { matched: matches.length, total: terms.length })}
        </button>
      ) : null /* Parent component handles Continue/Next Card button */}
    </div>
  )
}
