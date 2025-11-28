'use client'

import { useState, useRef, useEffect } from 'react'

// =============================================================================
// Types
// =============================================================================

interface FillBlankProps {
  sentence: string
  answer: string
  acceptableAnswers?: string[]
  onAnswer: (correct: boolean) => void
}

// =============================================================================
// Component
// =============================================================================

export default function FillBlank({
  sentence,
  answer,
  acceptableAnswers = [],
  onAnswer,
}: FillBlankProps) {
  const [userInput, setUserInput] = useState('')
  const [hasChecked, setHasChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleCheck = () => {
    if (!userInput.trim()) return

    const correct = checkAnswer(userInput, answer, acceptableAnswers)
    setIsCorrect(correct)
    setHasChecked(true)
    onAnswer(correct)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !hasChecked && userInput.trim()) {
      handleCheck()
    }
  }

  // Parse sentence to find blank position
  const renderSentence = () => {
    const blankPattern = /_{2,}|\[blank\]|\[___\]/gi
    const parts = sentence.split(blankPattern)

    if (parts.length === 1) {
      // No blank found, show sentence with input below
      return (
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed mb-4">
            {sentence}
          </p>
        </div>
      )
    }

    // Render with inline blank
    return (
      <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed text-center">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              <span
                className={`inline-block min-w-[120px] mx-1 px-3 py-1 rounded-lg border-2 border-dashed ${
                  hasChecked
                    ? isCorrect
                      ? 'border-green-500 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'border-red-500 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {hasChecked ? (isCorrect ? userInput : userInput) : '___'}
              </span>
            )}
          </span>
        ))}
      </p>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Sentence with Blank */}
      <div className="mb-8">{renderSentence()}</div>

      {/* Input Field */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Your answer:
        </label>
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={hasChecked}
          placeholder="Type your answer..."
          autoComplete="off"
          autoCapitalize="off"
          spellCheck="false"
          className={`w-full px-4 py-4 text-lg rounded-xl border-2 transition-all outline-none ${
            hasChecked
              ? isCorrect
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800'
          }`}
        />
      </div>

      {/* Result Message */}
      {hasChecked && (
        <div
          className={`mb-4 p-4 rounded-xl ${
            isCorrect
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}
        >
          <p
            className={`font-bold text-lg ${
              isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
            }`}
          >
            {isCorrect ? 'Correct! 🎉' : 'Not quite right'}
          </p>
          {!isCorrect && (
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              The correct answer is:{' '}
              <span className="font-semibold text-green-600 dark:text-green-400">{answer}</span>
            </p>
          )}
          {isCorrect && userInput.toLowerCase().trim() !== answer.toLowerCase().trim() && (
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              (Also accepted: {answer})
            </p>
          )}
        </div>
      )}

      {/* Action Button */}
      {!hasChecked ? (
        <button
          onClick={handleCheck}
          disabled={!userInput.trim()}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            !userInput.trim()
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          Check Answer
        </button>
      ) : (
        <button
          onClick={() => {
            // Parent handles navigation via onAnswer callback
          }}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
        >
          Continue
        </button>
      )}
    </div>
  )
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if user's answer matches the correct answer
 * Uses fuzzy matching with:
 * - Case insensitivity
 * - Whitespace normalization
 * - Acceptable alternatives
 * - Levenshtein distance for minor typos
 */
function checkAnswer(
  userInput: string,
  correctAnswer: string,
  acceptableAnswers: string[]
): boolean {
  const normalizedInput = normalizeString(userInput)
  const normalizedCorrect = normalizeString(correctAnswer)

  // Exact match (normalized)
  if (normalizedInput === normalizedCorrect) {
    return true
  }

  // Check acceptable answers
  for (const acceptable of acceptableAnswers) {
    if (normalizedInput === normalizeString(acceptable)) {
      return true
    }
  }

  // Fuzzy match - allow 1-2 character differences for longer answers
  const maxDistance = correctAnswer.length <= 4 ? 0 : correctAnswer.length <= 8 ? 1 : 2
  if (levenshteinDistance(normalizedInput, normalizedCorrect) <= maxDistance) {
    return true
  }

  // Check fuzzy match against acceptable answers
  for (const acceptable of acceptableAnswers) {
    const normalizedAcceptable = normalizeString(acceptable)
    const acceptableMaxDistance = acceptable.length <= 4 ? 0 : acceptable.length <= 8 ? 1 : 2
    if (levenshteinDistance(normalizedInput, normalizedAcceptable) <= acceptableMaxDistance) {
      return true
    }
  }

  return false
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/['']/g, "'") // Normalize quotes
    .replace(/[""]/g, '"')
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length

  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // Deletion
          dp[i][j - 1] + 1, // Insertion
          dp[i - 1][j - 1] + 1 // Substitution
        )
      }
    }
  }

  return dp[m][n]
}
