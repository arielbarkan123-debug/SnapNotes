'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { type StepStatus } from '@/lib/practice/types'

type EquationType = 'linear' | 'quadratic'

interface LinearEquation {
  // ax + b = c format
  a: number  // coefficient of x
  b: number  // constant on left side
  c: number  // constant on right side
}

interface EquationStep {
  instruction: string
  instructionHe: string
  expectedAnswer: string
  acceptableAnswers?: string[]
  hint: string
  hintHe: string
  equationState: string  // Visual representation of equation at this step
  status: StepStatus
  attempts: number
}

interface EquationWorkspaceProps {
  type: EquationType
  equation: LinearEquation  // For now, only linear equations
  onStepComplete?: (stepIndex: number, correct: boolean, attempts: number) => void
  onProblemComplete?: (allCorrect: boolean, totalAttempts: number) => void
  language?: 'en' | 'he'
  showHints?: boolean
  maxAttempts?: number
}

export default function EquationWorkspace({
  type: _type,
  equation,
  onStepComplete,
  onProblemComplete,
  language = 'en',
  showHints = true,
  maxAttempts = 3,
}: EquationWorkspaceProps) {
  const isRTL = language === 'he'
  const { a, b, c } = equation

  // Calculate solution
  const solution = (c - b) / a

  // Format equation string
  const formatEquation = (coef: number, varPart: string, constant: number, equals: number): string => {
    let left = ''
    if (coef === 1) left = varPart
    else if (coef === -1) left = `-${varPart}`
    else left = `${coef}${varPart}`

    if (constant > 0) left += ` + ${constant}`
    else if (constant < 0) left += ` - ${Math.abs(constant)}`

    return `${left} = ${equals}`
  }

  // Generate steps for linear equation: ax + b = c
  const generateSteps = useCallback((): EquationStep[] => {
    const steps: EquationStep[] = []

    // Step 1: Subtract b from both sides (if b !== 0)
    if (b !== 0) {
      const newRight = c - b
      const operation = b > 0 ? `- ${b}` : `+ ${Math.abs(b)}`

      steps.push({
        instruction: `To isolate the x term, ${b > 0 ? 'subtract' : 'add'} ${Math.abs(b)} ${b > 0 ? 'from' : 'to'} both sides. What is ${c} ${operation}?`,
        instructionHe: `כדי לבודד את האיבר עם x, ${b > 0 ? 'החסר' : 'הוסף'} ${Math.abs(b)} ${b > 0 ? 'משני הצדדים' : 'לשני הצדדים'}. מה זה ${c} ${operation}?`,
        expectedAnswer: newRight.toString(),
        hint: `${c} ${operation} = ?`,
        hintHe: `${c} ${operation} = ?`,
        equationState: formatEquation(a, 'x', b, c),
        status: 'pending',
        attempts: 0,
      })
    }

    // Step 2: Divide both sides by a (if a !== 1)
    if (a !== 1 && a !== -1) {
      const rightAfterSubtract = c - b

      steps.push({
        instruction: `Now divide both sides by ${a} to find x. What is ${rightAfterSubtract} ÷ ${a}?`,
        instructionHe: `עכשיו חלק את שני הצדדים ב-${a} כדי למצוא את x. מה זה ${rightAfterSubtract} ÷ ${a}?`,
        expectedAnswer: solution.toString(),
        acceptableAnswers: Number.isInteger(solution) ? undefined : [solution.toFixed(2), solution.toFixed(1)],
        hint: `${rightAfterSubtract} ÷ ${a} = ?`,
        hintHe: `${rightAfterSubtract} ÷ ${a} = ?`,
        equationState: `${a}x = ${rightAfterSubtract}`,
        status: 'pending',
        attempts: 0,
      })
    } else if (a === -1) {
      const rightAfterSubtract = c - b

      steps.push({
        instruction: `The equation is -x = ${rightAfterSubtract}. Multiply both sides by -1 to find x.`,
        instructionHe: `המשוואה היא x- = ${rightAfterSubtract}. הכפל את שני הצדדים ב-1- כדי למצוא את x.`,
        expectedAnswer: solution.toString(),
        hint: `If -x = ${rightAfterSubtract}, then x = ?`,
        hintHe: `אם x- = ${rightAfterSubtract}, אז x = ?`,
        equationState: `-x = ${rightAfterSubtract}`,
        status: 'pending',
        attempts: 0,
      })
    }

    // Final verification step
    steps.push({
      instruction: `Verify: Substitute x = ${solution} back into the original equation. What is ${a} × ${solution}?`,
      instructionHe: `בדיקה: הצב x = ${solution} בחזרה למשוואה המקורית. מה זה ${a} × ${solution}?`,
      expectedAnswer: (a * solution).toString(),
      hint: `${a} × ${solution} = ?`,
      hintHe: `${a} × ${solution} = ?`,
      equationState: `x = ${solution}`,
      status: 'pending',
      attempts: 0,
    })

    return steps
  }, [a, b, c, solution])

  const [steps, setSteps] = useState<EquationStep[]>(() => generateSteps())
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentStep = steps[currentStepIndex]

  useEffect(() => {
    if (inputRef.current && !isComplete) {
      inputRef.current.focus()
    }
  }, [currentStepIndex, isComplete])

  const validateAnswer = useCallback((input: string) => {
    if (!currentStep) return

    const userAnswer = input.trim()
    const isCorrect = userAnswer === currentStep.expectedAnswer ||
      currentStep.acceptableAnswers?.includes(userAnswer)

    const newSteps = [...steps]
    newSteps[currentStepIndex] = {
      ...currentStep,
      attempts: currentStep.attempts + 1,
      status: isCorrect ? 'correct' : (currentStep.attempts + 1 >= maxAttempts ? 'incorrect' : 'active'),
    }
    setSteps(newSteps)

    if (isCorrect) {
      setFeedback({
        message: language === 'he' ? 'נכון!' : 'Correct!',
        type: 'success',
      })
      onStepComplete?.(currentStepIndex, true, currentStep.attempts + 1)

      setTimeout(() => {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1)
          setUserInput('')
          setShowHint(false)
          setFeedback(null)
        } else {
          setIsComplete(true)
          const allCorrect = newSteps.every(s => s.status === 'correct')
          const totalAttempts = newSteps.reduce((sum, s) => sum + s.attempts, 0)
          onProblemComplete?.(allCorrect, totalAttempts)
        }
      }, 800)
    } else {
      if (currentStep.attempts + 1 >= maxAttempts) {
        setFeedback({
          message: language === 'he'
            ? `התשובה הנכונה היא ${currentStep.expectedAnswer}`
            : `The correct answer is ${currentStep.expectedAnswer}`,
          type: 'error',
        })
        onStepComplete?.(currentStepIndex, false, currentStep.attempts + 1)

        setTimeout(() => {
          if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1)
            setUserInput('')
            setShowHint(false)
            setFeedback(null)
          } else {
            setIsComplete(true)
            const allCorrect = newSteps.every(s => s.status === 'correct')
            const totalAttempts = newSteps.reduce((sum, s) => sum + s.attempts, 0)
            onProblemComplete?.(allCorrect, totalAttempts)
          }
        }, 1500)
      } else {
        setFeedback({
          message: language === 'he'
            ? `לא נכון. נסה שוב (${maxAttempts - currentStep.attempts - 1} נסיונות נותרו)`
            : `Not quite. Try again (${maxAttempts - currentStep.attempts - 1} attempts left)`,
          type: 'error',
        })
      }
    }
  }, [currentStep, currentStepIndex, steps, maxAttempts, language, onStepComplete, onProblemComplete])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userInput.trim()) {
      validateAnswer(userInput)
    }
  }

  // Render equation with balance scale visualization
  const renderEquation = (equationStr: string, highlight?: boolean) => {
    return (
      <div className={`text-2xl sm:text-3xl font-mono ${highlight ? 'text-violet-600' : 'text-gray-900 dark:text-white'}`}>
        {equationStr}
      </div>
    )
  }

  // Render balance scale visualization
  const renderBalanceScale = () => {
    return (
      <div className="flex justify-center my-4">
        <div className="relative w-64 h-32">
          {/* Scale base */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-16 bg-gray-400 dark:bg-gray-500" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-3 bg-gray-500 dark:bg-gray-400 rounded" />

          {/* Scale beam */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-56 h-2 bg-gray-600 dark:bg-gray-300 rounded" />

          {/* Left pan */}
          <div className="absolute bottom-8 left-2 w-20 h-1 bg-gray-500" />
          <div className="absolute bottom-4 left-2 w-20 h-8 border-2 border-gray-400 rounded-b-lg flex items-center justify-center text-xs bg-white dark:bg-gray-700">
            {a !== 1 && a !== -1 ? `${a}x` : a === -1 ? '-x' : 'x'}{b > 0 ? `+${b}` : b < 0 ? b : ''}
          </div>

          {/* Right pan */}
          <div className="absolute bottom-8 right-2 w-20 h-1 bg-gray-500" />
          <div className="absolute bottom-4 right-2 w-20 h-8 border-2 border-gray-400 rounded-b-lg flex items-center justify-center text-xs bg-white dark:bg-gray-700">
            {c}
          </div>

          {/* Equal sign */}
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 text-lg font-bold text-gray-600 dark:text-gray-300">
            =
          </div>
        </div>
      </div>
    )
  }

  if (isComplete) {
    const correctCount = steps.filter(s => s.status === 'correct').length
    const accuracy = Math.round((correctCount / steps.length) * 100)

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="text-center mb-6">
          {accuracy === 100 ? (
            <div className="text-5xl mb-2">🎉</div>
          ) : accuracy >= 70 ? (
            <div className="text-5xl mb-2">👍</div>
          ) : (
            <div className="text-5xl mb-2">💪</div>
          )}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {language === 'he' ? 'סיימת!' : 'Complete!'}
          </h3>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
          <div className="text-center">
            <div className="text-lg text-gray-600 dark:text-gray-400 mb-2">
              {language === 'he' ? 'המשוואה:' : 'Equation:'}
            </div>
            {renderEquation(formatEquation(a, 'x', b, c))}
            <div className="text-lg mt-4">
              {language === 'he' ? 'הפתרון:' : 'Solution:'}
              <span className="font-bold text-violet-600 ml-2">x = {solution}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{correctCount}/{steps.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'he' ? 'צעדים נכונים' : 'Steps Correct'}
            </div>
          </div>
          <div className="bg-violet-50 dark:bg-violet-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-violet-600">{accuracy}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'he' ? 'דיוק' : 'Accuracy'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Problem display */}
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {language === 'he' ? 'פתור את המשוואה:' : 'Solve the equation:'}
        </h3>
        {renderEquation(formatEquation(a, 'x', b, c))}
      </div>

      {/* Balance scale visualization */}
      {renderBalanceScale()}

      {/* Current equation state */}
      {currentStep && (
        <div className="text-center mb-4 text-lg text-gray-600 dark:text-gray-400">
          {language === 'he' ? 'מצב נוכחי:' : 'Current state:'} <span className="font-mono font-bold">{currentStep.equationState}</span>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>{language === 'he' ? 'התקדמות' : 'Progress'}</span>
          <span>{currentStepIndex + 1} / {steps.length}</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current step instruction */}
      {currentStep && (
        <div className="mb-4 p-4 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
          <p className="text-violet-800 dark:text-violet-200 font-medium">
            {language === 'he' ? currentStep.instructionHe : currentStep.instruction}
          </p>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9.-]*"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={language === 'he' ? 'הכנס תשובה' : 'Enter answer'}
            className="flex-1 px-4 py-3 text-xl text-center font-mono border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-violet-500 focus:ring-2 focus:ring-violet-200 dark:bg-gray-700 dark:text-white"
            disabled={isComplete}
          />
          <button
            type="submit"
            disabled={!userInput.trim() || isComplete}
            className="px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {language === 'he' ? 'בדוק' : 'Check'}
          </button>
        </div>
      </form>

      {/* Feedback */}
      {feedback && (
        <div className={`p-3 rounded-lg text-center mb-4 ${
          feedback.type === 'success'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Hint button */}
      {showHints && currentStep && !showHint && !isComplete && (
        <button
          onClick={() => setShowHint(true)}
          className="w-full py-2 text-gray-500 hover:text-violet-600 text-sm flex items-center justify-center gap-1"
        >
          <span>💡</span>
          <span>{language === 'he' ? 'צריך רמז?' : 'Need a hint?'}</span>
        </button>
      )}

      {/* Hint display */}
      {showHint && currentStep && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg text-yellow-800 dark:text-yellow-200 text-sm">
          💡 {language === 'he' ? currentStep.hintHe : currentStep.hint}
        </div>
      )}
    </div>
  )
}
