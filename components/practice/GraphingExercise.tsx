'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { MathInput, type MathInputRef } from '@/components/ui/MathInput'
import { COLORS } from '@/lib/diagram-theme'

// Lazy load the interactive graph component
const InteractiveGraph = dynamic(
  () => import('@/components/math/InteractiveGraph'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    ),
  }
)

// ============================================================================
// Types
// ============================================================================

export interface GraphingExerciseProps {
  /** The exercise prompt/question */
  prompt: string
  /** Expected answer (LaTeX format) - used for validation */
  expectedAnswer?: string
  /** Hint to show on request */
  hint?: string
  /** Callback when student submits their answer */
  onSubmit?: (answer: string, isCorrect: boolean) => void
  /** Callback when exercise is completed */
  onComplete?: () => void
  /** Initial viewport bounds */
  bounds?: {
    xMin: number
    xMax: number
    yMin: number
    yMax: number
  }
  /** Reference curves to show (e.g., the expected answer for comparison) */
  referenceCurves?: Array<{
    expression: string
    color?: string
    label?: string
    hidden?: boolean
  }>
  /** Show the math keyboard by default */
  showKeyboard?: boolean
  /** Allow multiple attempts */
  allowMultipleAttempts?: boolean
  /** Maximum attempts before showing answer */
  maxAttempts?: number
  /** Exercise difficulty level */
  difficulty?: 'easy' | 'medium' | 'hard'
  /** Additional className */
  className?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Compare two LaTeX expressions for equivalence
 * This is a simple comparison - a more robust solution would use a CAS
 */
function compareExpressions(student: string, expected: string): boolean {
  if (!student || !expected) return false

  // Normalize both expressions
  const normalizeExpr = (expr: string) => {
    return expr
      .replace(/\s+/g, '')
      .replace(/\*/g, '')
      .replace(/y=/gi, '')
      .replace(/\\cdot/g, '')
      .replace(/\\times/g, '')
      .toLowerCase()
      .trim()
  }

  return normalizeExpr(student) === normalizeExpr(expected)
}

/**
 * Extract a valid expression from LaTeX input
 */
function extractExpression(latex: string): string {
  // Remove y= prefix if present
  let expr = latex.replace(/^y\s*=\s*/i, '').trim()

  // Convert LaTeX to JS-style expression for graphing
  expr = expr
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
    .replace(/\\sin/g, 'sin')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\ln/g, 'log')
    .replace(/\\log/g, 'log10')
    .replace(/\^/g, '^')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')

  return expr
}

// ============================================================================
// Component
// ============================================================================

/**
 * GraphingExercise - Interactive graphing practice component
 *
 * Students can:
 * - Enter equations using the math input
 * - See their graphs rendered in real-time
 * - Compare with reference curves
 * - Get feedback on their answers
 *
 * @example
 * <GraphingExercise
 *   prompt="Graph the parabola y = x² - 4"
 *   expectedAnswer="x^2-4"
 *   hint="The vertex is at (0, -4)"
 * />
 */
export function GraphingExercise({
  prompt,
  expectedAnswer,
  hint,
  onSubmit,
  onComplete,
  bounds = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },
  referenceCurves = [],
  showKeyboard = true,
  allowMultipleAttempts = true,
  maxAttempts = 3,
  difficulty = 'medium',
  className = '',
}: GraphingExerciseProps) {
  const mathInputRef = useRef<MathInputRef>(null)
  const [equation, setEquation] = useState('')
  const [studentCurve, setStudentCurve] = useState<{ expression: string; color: string } | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  // Handle equation change
  const handleEquationChange = useCallback((latex: string) => {
    setEquation(latex)
    setFeedbackMessage(null)

    // Update the graph preview
    if (latex.trim()) {
      const expr = extractExpression(latex)
      setStudentCurve({
        expression: expr,
        color: COLORS.primary[500],
      })
    } else {
      setStudentCurve(null)
    }
  }, [])

  // Handle submission
  const handleSubmit = useCallback((latex: string) => {
    if (!latex.trim()) {
      setFeedbackMessage('Please enter an equation first.')
      return
    }

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    // Check if correct
    const correct = expectedAnswer ? compareExpressions(latex, expectedAnswer) : true
    setIsCorrect(correct)

    if (correct) {
      setFeedbackMessage('Excellent! Your graph is correct!')
      onSubmit?.(latex, true)
      onComplete?.()
    } else {
      if (newAttempts >= maxAttempts && !allowMultipleAttempts) {
        setFeedbackMessage(`Not quite. The correct answer was: y = ${expectedAnswer}`)
        setShowAnswer(true)
        onSubmit?.(latex, false)
        onComplete?.()
      } else {
        const attemptsLeft = maxAttempts - newAttempts
        setFeedbackMessage(
          attemptsLeft > 0
            ? `Not quite right. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining. Try again!`
            : 'Keep trying! You can do this.'
        )
        onSubmit?.(latex, false)
      }
    }
  }, [attempts, expectedAnswer, maxAttempts, allowMultipleAttempts, onSubmit, onComplete])

  // Build curves array for the graph
  const allCurves = [
    ...(studentCurve ? [{ expression: studentCurve.expression, color: studentCurve.color, label: 'Your graph' }] : []),
    ...(showAnswer && expectedAnswer
      ? [{ expression: extractExpression(expectedAnswer), color: '#22c55e', label: 'Expected answer' }]
      : []
    ),
    ...referenceCurves.filter((c) => !c.hidden),
  ]

  // Difficulty badge color
  const difficultyColors = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{prompt}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${difficultyColors[difficulty]}`}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </span>
            {attempts > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Attempts: {attempts}/{maxAttempts}
              </span>
            )}
          </div>
        </div>

        {/* Hint button */}
        {hint && !showHint && (
          <button
            onClick={() => setShowHint(true)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Hint
          </button>
        )}
      </div>

      {/* Hint display */}
      <AnimatePresence>
        {showHint && hint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
          >
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p className="text-sm text-amber-800 dark:text-amber-200">{hint}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Graph area */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <InteractiveGraph
          mode={allCurves.length > 0 ? 'static' : 'static'}
          curves={allCurves}
          bounds={bounds}
          showGrid={true}
          height={350}
          title="Your Graph"
        />
      </div>

      {/* Equation input */}
      <div className="space-y-3">
        <MathInput
          ref={mathInputRef}
          value={equation}
          onChange={handleEquationChange}
          onSubmit={handleSubmit}
          placeholder="Enter your equation (e.g., x^2 - 4)"
          label="Your equation"
          helperText="Type your equation and press Enter to check"
          showPreview={true}
          showKeyboard={showKeyboard}
          disabled={isCorrect === true}
        />

        {/* Submit button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSubmit(equation)}
            disabled={!equation.trim() || isCorrect === true}
            className={`
              flex items-center gap-2 rounded-xl px-6 py-2.5 font-medium transition-all
              ${isCorrect === true
                ? 'cursor-not-allowed bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-primary-500 text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50'
              }
            `}
          >
            {isCorrect === true ? (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Correct!
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Check Answer
              </>
            )}
          </button>

          {/* Clear button */}
          <button
            onClick={() => {
              setEquation('')
              setStudentCurve(null)
              setIsCorrect(null)
              setFeedbackMessage(null)
              mathInputRef.current?.clear()
              mathInputRef.current?.focus()
            }}
            disabled={!equation.trim()}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Feedback message */}
      <AnimatePresence>
        {feedbackMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`
              rounded-xl p-4
              ${isCorrect === true
                ? 'border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                : isCorrect === false
                  ? 'border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                  : 'border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
              }
            `}
          >
            <div className="flex items-start gap-3">
              {isCorrect === true ? (
                <svg className="mt-0.5 h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : isCorrect === false ? (
                <svg className="mt-0.5 h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : null}
              <p className={`text-sm ${isCorrect === true ? 'text-green-700 dark:text-green-300' : isCorrect === false ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                {feedbackMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GraphingExercise
