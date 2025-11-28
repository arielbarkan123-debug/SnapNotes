'use client'

import { useState, useRef, useEffect } from 'react'

// =============================================================================
// Types
// =============================================================================

interface ShortAnswerProps {
  question: string
  modelAnswer: string
  onAnswer: (correct: boolean) => void
}

// =============================================================================
// Component
// =============================================================================

export default function ShortAnswer({
  question,
  modelAnswer,
  onAnswer,
}: ShortAnswerProps) {
  const [userInput, setUserInput] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [hasGraded, setHasGraded] = useState(false)
  const [selfGrade, setSelfGrade] = useState<boolean | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus textarea on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const handleShowAnswer = () => {
    setShowAnswer(true)
  }

  const handleSelfGrade = (correct: boolean) => {
    setSelfGrade(correct)
    setHasGraded(true)
    onAnswer(correct)
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
          disabled={showAnswer}
          placeholder="Type your answer here..."
          rows={4}
          className={`w-full px-4 py-3 text-base rounded-xl border-2 transition-all outline-none resize-none ${
            showAnswer
              ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800'
          }`}
        />
      </div>

      {/* Show Answer Button */}
      {!showAnswer && (
        <button
          onClick={handleShowAnswer}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
        >
          Show Answer
        </button>
      )}

      {/* Answer Comparison Section */}
      {showAnswer && !hasGraded && (
        <>
          {/* User's Answer Display */}
          {userInput.trim() && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                  👤
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

          {/* Self-Grade Prompt */}
          <div className="mb-4">
            <p className="text-center text-gray-600 dark:text-gray-400 font-medium mb-4">
              How did you do? Compare your answer to the model answer.
            </p>
          </div>

          {/* Self-Grade Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleSelfGrade(true)}
              className="flex-1 py-4 px-6 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <span className="text-xl">✓</span>
              <span>I got it right</span>
            </button>
            <button
              onClick={() => handleSelfGrade(false)}
              className="flex-1 py-4 px-6 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <span className="text-xl">✗</span>
              <span>I got it wrong</span>
            </button>
          </div>
        </>
      )}

      {/* Result After Grading */}
      {hasGraded && (
        <>
          {/* Result Message */}
          <div
            className={`mb-4 p-4 rounded-xl ${
              selfGrade
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <p
              className={`font-bold text-lg text-center ${
                selfGrade
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {selfGrade ? 'Great job! 🎉' : "Keep practicing! You'll get it next time 💪"}
            </p>
          </div>

          {/* Model Answer Reference */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              Model answer for reference:
            </p>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{modelAnswer}</p>
          </div>

          {/* Continue Button */}
          <button
            onClick={() => {
              // Parent handles navigation via onAnswer callback
            }}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Continue
          </button>
        </>
      )}
    </div>
  )
}
