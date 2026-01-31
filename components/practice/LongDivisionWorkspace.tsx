'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { type StepStatus } from '@/lib/practice/types'

interface DivisionStep {
  type: 'quotient_digit' | 'multiply' | 'subtract' | 'bring_down'
  position: number // Which digit position this step relates to
  value: string
  status: StepStatus
  attempts: number
}

interface LongDivisionWorkspaceProps {
  dividend: number
  divisor: number
  onStepComplete?: (stepIndex: number, correct: boolean, attempts: number) => void
  onProblemComplete?: (allCorrect: boolean, totalAttempts: number) => void
  language?: 'en' | 'he'
  showHints?: boolean
  maxAttempts?: number
}

export default function LongDivisionWorkspace({
  dividend,
  divisor,
  onStepComplete,
  onProblemComplete,
  language = 'en',
  showHints = true,
  maxAttempts = 3,
}: LongDivisionWorkspaceProps) {
  const isRTL = language === 'he'

  // Calculate the solution
  const quotient = Math.floor(dividend / divisor)
  const remainder = dividend % divisor
  const dividendDigits = dividend.toString().split('').map(Number)
  const _quotientDigits = quotient.toString().split('').map(Number)

  // Generate all steps for this division problem
  const generateSteps = useCallback(() => {
    const steps: DivisionStep[] = []
    let workingNumber = 0
    let stepPosition = 0

    for (let i = 0; i < dividendDigits.length; i++) {
      workingNumber = workingNumber * 10 + dividendDigits[i]

      // If we've started getting quotient digits, or this gives us a quotient digit
      if (workingNumber >= divisor || steps.some(s => s.type === 'quotient_digit')) {
        const quotientDigit = Math.floor(workingNumber / divisor)
        const product = quotientDigit * divisor
        const difference = workingNumber - product

        // Step: Write quotient digit
        steps.push({
          type: 'quotient_digit',
          position: stepPosition,
          value: quotientDigit.toString(),
          status: 'pending',
          attempts: 0,
        })

        // Step: Multiply (divisor × quotient digit)
        steps.push({
          type: 'multiply',
          position: stepPosition,
          value: product.toString(),
          status: 'pending',
          attempts: 0,
        })

        // Step: Subtract
        steps.push({
          type: 'subtract',
          position: stepPosition,
          value: difference.toString(),
          status: 'pending',
          attempts: 0,
        })

        workingNumber = difference
        stepPosition++

        // Step: Bring down next digit (if there is one)
        if (i < dividendDigits.length - 1) {
          const nextDigit = dividendDigits[i + 1]
          const broughtDown = workingNumber * 10 + nextDigit
          steps.push({
            type: 'bring_down',
            position: stepPosition,
            value: broughtDown.toString(),
            status: 'pending',
            attempts: 0,
          })
        }
      }
    }

    return steps
  }, [dividend, divisor, dividendDigits])

  const [steps, setSteps] = useState<DivisionStep[]>(() => generateSteps())
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'hint' } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentStep = steps[currentStepIndex]

  // Focus input when step changes
  useEffect(() => {
    if (inputRef.current && !isComplete) {
      inputRef.current.focus()
    }
  }, [currentStepIndex, isComplete])

  const getStepInstruction = (step: DivisionStep): string => {
    const instructions = {
      en: {
        quotient_digit: `How many times does ${divisor} go into the working number?`,
        multiply: `What is ${divisor} × the quotient digit you just wrote?`,
        subtract: `Subtract the product from the number above`,
        bring_down: `Bring down the next digit and write the new working number`,
      },
      he: {
        quotient_digit: `כמה פעמים ${divisor} נכנס במספר?`,
        multiply: `מה התוצאה של ${divisor} × הספרה שכתבת?`,
        subtract: `הפחת את המכפלה מהמספר שמעל`,
        bring_down: `הורד את הספרה הבאה ורשום את המספר החדש`,
      },
    }
    return instructions[language][step.type]
  }

  const getHint = (step: DivisionStep): string => {
    // Calculate context for hint
    let workingNumber = 0
    let _quotientSoFar = ''

    for (let i = 0; i <= step.position; i++) {
      if (i < dividendDigits.length) {
        workingNumber = workingNumber * 10 + dividendDigits[i]
        if (workingNumber >= divisor) {
          const q = Math.floor(workingNumber / divisor)
          _quotientSoFar += q
          workingNumber = workingNumber - q * divisor
        }
      }
    }

    const hints = {
      en: {
        quotient_digit: `Think: how many times does ${divisor} fit into the number without going over?`,
        multiply: `Multiply ${divisor} by the quotient digit you just found`,
        subtract: `Subtract to find what's left over`,
        bring_down: `Write the remainder, then add the next digit from the dividend`,
      },
      he: {
        quotient_digit: `חשוב: כמה פעמים ${divisor} נכנס במספר בלי לעבור אותו?`,
        multiply: `הכפל ${divisor} בספרה שמצאת`,
        subtract: `הפחת כדי למצוא את השארית`,
        bring_down: `רשום את השארית והוסף את הספרה הבאה מהמחולק`,
      },
    }
    return hints[language][step.type]
  }

  const validateAnswer = useCallback((input: string) => {
    if (!currentStep) return

    const userAnswer = input.trim()
    const correctAnswer = currentStep.value
    const isCorrect = userAnswer === correctAnswer

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

      // Move to next step or complete
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
            ? `התשובה הנכונה היא ${correctAnswer}`
            : `The correct answer is ${correctAnswer}`,
          type: 'error',
        })
        onStepComplete?.(currentStepIndex, false, currentStep.attempts + 1)

        // Move to next step after showing answer
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (userInput.trim()) {
        validateAnswer(userInput)
      }
    }
  }

  // Render the division bracket visualization
  const renderDivisionBracket = () => {
    const completedQuotientDigits = steps
      .filter((s, i) => s.type === 'quotient_digit' && i <= currentStepIndex && s.status === 'correct')
      .map(s => s.value)

    return (
      <div className={`font-mono text-2xl sm:text-3xl ${isRTL ? 'direction-ltr' : ''}`}>
        {/* Quotient row */}
        <div className="flex justify-end mb-1">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold tracking-widest">
            {completedQuotientDigits.join('')}
            {currentStep?.type === 'quotient_digit' && (
              <span className="animate-pulse text-gray-400">_</span>
            )}
          </span>
        </div>

        {/* Division bracket */}
        <div className="flex items-start">
          <span className="text-gray-700 dark:text-gray-300 mr-2">{divisor}</span>
          <div className="border-l-2 border-t-2 border-gray-700 dark:border-gray-300 pl-2 pt-1">
            <span className="tracking-widest">{dividend}</span>
          </div>
        </div>

        {/* Work area - show completed steps */}
        <div className="ml-8 mt-2 space-y-1 text-xl">
          {steps.map((step, index) => {
            if (index > currentStepIndex) return null
            if (step.type === 'quotient_digit') return null

            if (step.status === 'correct' || step.status === 'incorrect') {
              if (step.type === 'multiply') {
                return (
                  <div key={index} className="flex items-center">
                    <span className="text-gray-500 mr-1">-</span>
                    <span className={step.status === 'correct' ? 'text-green-600' : 'text-red-500'}>
                      {step.value}
                    </span>
                  </div>
                )
              }
              if (step.type === 'subtract') {
                // Skip showing difference if next step is a completed bring_down (value already includes it)
                const nextStep = steps[index + 1]
                if (nextStep?.type === 'bring_down' && (nextStep.status === 'correct' || nextStep.status === 'incorrect')) {
                  // Don't render - the bring_down value already includes this difference
                  return null
                }

                return (
                  <div key={index} className="border-t border-gray-400 pt-1">
                    <span className={step.status === 'correct' ? 'text-green-600' : 'text-red-500'}>
                      {step.value}
                    </span>
                  </div>
                )
              }
              if (step.type === 'bring_down') {
                return (
                  <div key={index} className="border-t border-gray-400 pt-1 text-blue-600 dark:text-blue-400">
                    {step.value}
                  </div>
                )
              }
            }
            return null
          })}
        </div>
      </div>
    )
  }

  // Render completion summary
  if (isComplete) {
    const correctCount = steps.filter(s => s.status === 'correct').length
    const totalSteps = steps.length
    const accuracy = Math.round((correctCount / totalSteps) * 100)

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
          <div className="text-center font-mono text-2xl mb-2">
            {dividend} ÷ {divisor} = <span className="text-indigo-600 font-bold">{quotient}</span>
            {remainder > 0 && (
              <span className="text-gray-500"> R{remainder}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{correctCount}/{totalSteps}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {language === 'he' ? 'צעדים נכונים' : 'Steps Correct'}
            </div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-indigo-600">{accuracy}%</div>
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
      <div className="mb-6 text-center">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {language === 'he' ? 'חשב:' : 'Calculate:'}
        </h3>
        <div className="text-3xl font-bold text-gray-900 dark:text-white">
          {dividend} ÷ {divisor} = ?
        </div>
      </div>

      {/* Division bracket visualization */}
      <div className="flex justify-center mb-6">
        {renderDivisionBracket()}
      </div>

      {/* Progress indicator */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>{language === 'he' ? 'התקדמות' : 'Progress'}</span>
          <span>{currentStepIndex + 1} / {steps.length}</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current step instruction */}
      {currentStep && (
        <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
          <p className="text-indigo-800 dark:text-indigo-200 font-medium">
            {getStepInstruction(currentStep)}
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
            pattern="[0-9]*"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === 'he' ? 'הכנס תשובה' : 'Enter answer'}
            className="flex-1 px-4 py-3 text-xl text-center font-mono border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-gray-700 dark:text-white"
            disabled={isComplete}
          />
          <button
            type="submit"
            disabled={!userInput.trim() || isComplete}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            : feedback.type === 'error'
            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* Hint button */}
      {showHints && currentStep && !showHint && !isComplete && (
        <button
          onClick={() => setShowHint(true)}
          className="w-full py-2 text-gray-500 hover:text-indigo-600 text-sm flex items-center justify-center gap-1"
        >
          <span>💡</span>
          <span>{language === 'he' ? 'צריך רמז?' : 'Need a hint?'}</span>
        </button>
      )}

      {/* Hint display */}
      {showHint && currentStep && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg text-yellow-800 dark:text-yellow-200 text-sm">
          💡 {getHint(currentStep)}
        </div>
      )}
    </div>
  )
}
