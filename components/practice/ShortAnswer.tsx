'use client'

import { useState, useRef, useEffect } from 'react'

// =============================================================================
// Types
// =============================================================================

interface ShortAnswerProps {
  question: string
  modelAnswer: string
  onAnswer: (correct: boolean, score?: number) => void
  context?: string // Optional context for better AI evaluation
}

interface EvaluationResult {
  isCorrect: boolean
  score: number
  feedback: string
  evaluationMethod: 'exact' | 'fuzzy' | 'ai'
  evaluationTimeMs?: number
}

// =============================================================================
// Component
// =============================================================================

export default function ShortAnswer({
  question,
  modelAnswer,
  onAnswer,
  context,
}: ShortAnswerProps) {
  const [userInput, setUserInput] = useState('')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus textarea on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async () => {
    if (!userInput.trim() || isEvaluating) return

    setIsEvaluating(true)
    setHasSubmitted(true)

    try {
      const response = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          expectedAnswer: modelAnswer,
          userAnswer: userInput.trim(),
          context,
        }),
      })

      if (!response.ok) {
        throw new Error('Evaluation failed')
      }

      const result: EvaluationResult = await response.json()
      setEvaluationResult(result)
      onAnswer(result.isCorrect, result.score)
    } catch (error) {
      console.error('Evaluation error:', error)
      // Fallback: Show manual grading option
      setEvaluationResult({
        isCorrect: false,
        score: 0,
        feedback: 'Could not evaluate automatically. Please compare with the model answer.',
        evaluationMethod: 'fuzzy',
      })
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 50) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    if (score >= 50) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Question */}
      <div className="mb-6">
        <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed">
          {question}
        </p>
      </div>

      {/* User's Answer Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          Your answer:
        </label>
        <textarea
          ref={textareaRef}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={hasSubmitted}
          placeholder="Type your answer here..."
          rows={4}
          className={`w-full px-4 py-3 text-base rounded-xl border-2 transition-all outline-none resize-none ${
            hasSubmitted
              ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800'
          }`}
        />
        {!hasSubmitted && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Press Ctrl+Enter to submit
          </p>
        )}
      </div>

      {/* Submit Button */}
      {!hasSubmitted && (
        <button
          onClick={handleSubmit}
          disabled={!userInput.trim() || isEvaluating}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
            !userInput.trim()
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white hover:shadow-xl'
          }`}
        >
          Check Answer
        </button>
      )}

      {/* Loading State */}
      {isEvaluating && (
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 dark:text-gray-400 font-medium">
            AI is checking your answer...
          </span>
        </div>
      )}

      {/* Evaluation Result */}
      {evaluationResult && !isEvaluating && (
        <>
          {/* Score Display */}
          <div className={`mb-4 p-4 rounded-xl border ${getScoreBgColor(evaluationResult.score)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-2xl font-bold ${getScoreColor(evaluationResult.score)}`}>
                {evaluationResult.score >= 80 ? '✓ Correct!' : evaluationResult.score >= 50 ? '~ Partial Credit' : '✗ Incorrect'}
              </span>
              <span className={`text-3xl font-bold ${getScoreColor(evaluationResult.score)}`}>
                {evaluationResult.score}%
              </span>
            </div>
            <p className={`text-sm ${getScoreColor(evaluationResult.score)}`}>
              {evaluationResult.feedback}
            </p>
            {evaluationResult.evaluationTimeMs && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Evaluated in {evaluationResult.evaluationTimeMs}ms
                {evaluationResult.evaluationMethod === 'ai' && ' (AI)'}
                {evaluationResult.evaluationMethod === 'fuzzy' && ' (fuzzy match)'}
                {evaluationResult.evaluationMethod === 'exact' && ' (exact match)'}
              </p>
            )}
          </div>

          {/* User's Answer Display */}
          {userInput.trim() && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                  You
                </span>
                Your answer
              </p>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{userInput}</p>
            </div>
          )}

          {/* Model Answer Display */}
          <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border-2 border-indigo-200 dark:border-indigo-800">
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-200 dark:bg-indigo-800 flex items-center justify-center text-xs">
                ✓
              </span>
              Model answer
            </p>
            <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-medium">
              {modelAnswer}
            </p>
          </div>

          {/* Parent component handles Continue/Next Card button */}
        </>
      )}
    </div>
  )
}
