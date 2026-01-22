'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { type StepStatus } from '@/lib/practice/types'

type FractionOperation = 'simplify' | 'add' | 'multiply' | 'divide'

interface Fraction {
  numerator: number
  denominator: number
}

interface FractionStep {
  type: 'find_gcd' | 'divide_both' | 'find_lcd' | 'convert_fraction' | 'add_numerators' | 'multiply_numerators' | 'multiply_denominators' | 'simplify_result'
  instruction: string
  instructionHe: string
  expectedAnswer: string
  hint: string
  hintHe: string
  status: StepStatus
  attempts: number
}

interface FractionWorkspaceProps {
  operation: FractionOperation
  fraction1: Fraction
  fraction2?: Fraction  // Only for add/multiply/divide
  onStepComplete?: (stepIndex: number, correct: boolean, attempts: number) => void
  onProblemComplete?: (allCorrect: boolean, totalAttempts: number) => void
  language?: 'en' | 'he'
  showHints?: boolean
  maxAttempts?: number
}

// Helper functions
const gcd = (a: number, b: number): number => {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    const temp = b
    b = a % b
    a = temp
  }
  return a
}

const lcm = (a: number, b: number): number => {
  return Math.abs(a * b) / gcd(a, b)
}

const simplifyFraction = (num: number, den: number): Fraction => {
  const g = gcd(num, den)
  return { numerator: num / g, denominator: den / g }
}

export default function FractionWorkspace({
  operation,
  fraction1,
  fraction2,
  onStepComplete,
  onProblemComplete,
  language = 'en',
  showHints = true,
  maxAttempts = 3,
}: FractionWorkspaceProps) {
  const isRTL = language === 'he'

  // Generate steps based on operation
  const generateSteps = useCallback((): FractionStep[] => {
    const steps: FractionStep[] = []

    if (operation === 'simplify') {
      const g = gcd(fraction1.numerator, fraction1.denominator)

      if (g > 1) {
        steps.push({
          type: 'find_gcd',
          instruction: `Find the GCD (Greatest Common Divisor) of ${fraction1.numerator} and ${fraction1.denominator}`,
          instructionHe: `מצא את המחלק המשותף הגדול ביותר של ${fraction1.numerator} ו-${fraction1.denominator}`,
          expectedAnswer: g.toString(),
          hint: `What is the largest number that divides both ${fraction1.numerator} and ${fraction1.denominator}?`,
          hintHe: `מהו המספר הגדול ביותר שמחלק גם את ${fraction1.numerator} וגם את ${fraction1.denominator}?`,
          status: 'pending',
          attempts: 0,
        })

        steps.push({
          type: 'divide_both',
          instruction: `Divide the numerator ${fraction1.numerator} by ${g}`,
          instructionHe: `חלק את המונה ${fraction1.numerator} ב-${g}`,
          expectedAnswer: (fraction1.numerator / g).toString(),
          hint: `${fraction1.numerator} ÷ ${g} = ?`,
          hintHe: `${fraction1.numerator} ÷ ${g} = ?`,
          status: 'pending',
          attempts: 0,
        })

        steps.push({
          type: 'divide_both',
          instruction: `Divide the denominator ${fraction1.denominator} by ${g}`,
          instructionHe: `חלק את המכנה ${fraction1.denominator} ב-${g}`,
          expectedAnswer: (fraction1.denominator / g).toString(),
          hint: `${fraction1.denominator} ÷ ${g} = ?`,
          hintHe: `${fraction1.denominator} ÷ ${g} = ?`,
          status: 'pending',
          attempts: 0,
        })
      }
    }

    if (operation === 'add' && fraction2) {
      const lcd = lcm(fraction1.denominator, fraction2.denominator)
      const newNum1 = fraction1.numerator * (lcd / fraction1.denominator)
      const newNum2 = fraction2.numerator * (lcd / fraction2.denominator)
      const sumNum = newNum1 + newNum2
      const simplified = simplifyFraction(sumNum, lcd)

      steps.push({
        type: 'find_lcd',
        instruction: `Find the LCD (Least Common Denominator) of ${fraction1.denominator} and ${fraction2.denominator}`,
        instructionHe: `מצא את המכנה המשותף הקטן ביותר של ${fraction1.denominator} ו-${fraction2.denominator}`,
        expectedAnswer: lcd.toString(),
        hint: `What is the smallest number that both ${fraction1.denominator} and ${fraction2.denominator} divide into?`,
        hintHe: `מהו המספר הקטן ביותר שגם ${fraction1.denominator} וגם ${fraction2.denominator} מתחלקים בו?`,
        status: 'pending',
        attempts: 0,
      })

      steps.push({
        type: 'convert_fraction',
        instruction: `Convert ${fraction1.numerator}/${fraction1.denominator} to have denominator ${lcd}. What is the new numerator?`,
        instructionHe: `המר את ${fraction1.numerator}/${fraction1.denominator} למכנה ${lcd}. מהו המונה החדש?`,
        expectedAnswer: newNum1.toString(),
        hint: `Multiply ${fraction1.numerator} by ${lcd / fraction1.denominator}`,
        hintHe: `הכפל ${fraction1.numerator} ב-${lcd / fraction1.denominator}`,
        status: 'pending',
        attempts: 0,
      })

      steps.push({
        type: 'convert_fraction',
        instruction: `Convert ${fraction2.numerator}/${fraction2.denominator} to have denominator ${lcd}. What is the new numerator?`,
        instructionHe: `המר את ${fraction2.numerator}/${fraction2.denominator} למכנה ${lcd}. מהו המונה החדש?`,
        expectedAnswer: newNum2.toString(),
        hint: `Multiply ${fraction2.numerator} by ${lcd / fraction2.denominator}`,
        hintHe: `הכפל ${fraction2.numerator} ב-${lcd / fraction2.denominator}`,
        status: 'pending',
        attempts: 0,
      })

      steps.push({
        type: 'add_numerators',
        instruction: `Add the numerators: ${newNum1} + ${newNum2}`,
        instructionHe: `חבר את המונים: ${newNum1} + ${newNum2}`,
        expectedAnswer: sumNum.toString(),
        hint: `Simply add the two numerators together`,
        hintHe: `פשוט חבר את שני המונים`,
        status: 'pending',
        attempts: 0,
      })

      if (simplified.numerator !== sumNum || simplified.denominator !== lcd) {
        const g = gcd(sumNum, lcd)
        steps.push({
          type: 'simplify_result',
          instruction: `Simplify ${sumNum}/${lcd}. What is the simplified numerator?`,
          instructionHe: `צמצם את ${sumNum}/${lcd}. מהו המונה המצומצם?`,
          expectedAnswer: simplified.numerator.toString(),
          hint: `Divide both by their GCD (${g})`,
          hintHe: `חלק את שניהם במחלק המשותף הגדול ביותר (${g})`,
          status: 'pending',
          attempts: 0,
        })
      }
    }

    if (operation === 'multiply' && fraction2) {
      const productNum = fraction1.numerator * fraction2.numerator
      const productDen = fraction1.denominator * fraction2.denominator
      const simplified = simplifyFraction(productNum, productDen)

      steps.push({
        type: 'multiply_numerators',
        instruction: `Multiply the numerators: ${fraction1.numerator} × ${fraction2.numerator}`,
        instructionHe: `הכפל את המונים: ${fraction1.numerator} × ${fraction2.numerator}`,
        expectedAnswer: productNum.toString(),
        hint: `${fraction1.numerator} × ${fraction2.numerator} = ?`,
        hintHe: `${fraction1.numerator} × ${fraction2.numerator} = ?`,
        status: 'pending',
        attempts: 0,
      })

      steps.push({
        type: 'multiply_denominators',
        instruction: `Multiply the denominators: ${fraction1.denominator} × ${fraction2.denominator}`,
        instructionHe: `הכפל את המכנים: ${fraction1.denominator} × ${fraction2.denominator}`,
        expectedAnswer: productDen.toString(),
        hint: `${fraction1.denominator} × ${fraction2.denominator} = ?`,
        hintHe: `${fraction1.denominator} × ${fraction2.denominator} = ?`,
        status: 'pending',
        attempts: 0,
      })

      if (simplified.numerator !== productNum || simplified.denominator !== productDen) {
        const g = gcd(productNum, productDen)
        steps.push({
          type: 'simplify_result',
          instruction: `Simplify ${productNum}/${productDen}. What is the simplified numerator?`,
          instructionHe: `צמצם את ${productNum}/${productDen}. מהו המונה המצומצם?`,
          expectedAnswer: simplified.numerator.toString(),
          hint: `Divide both by their GCD (${g})`,
          hintHe: `חלק את שניהם במחלק המשותף הגדול ביותר (${g})`,
          status: 'pending',
          attempts: 0,
        })

        steps.push({
          type: 'simplify_result',
          instruction: `What is the simplified denominator?`,
          instructionHe: `מהו המכנה המצומצם?`,
          expectedAnswer: simplified.denominator.toString(),
          hint: `Divide ${productDen} by ${g}`,
          hintHe: `חלק את ${productDen} ב-${g}`,
          status: 'pending',
          attempts: 0,
        })
      }
    }

    return steps
  }, [operation, fraction1, fraction2])

  const [steps, setSteps] = useState<FractionStep[]>(() => generateSteps())
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
    const isCorrect = userAnswer === currentStep.expectedAnswer

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

  // Render fraction display
  const renderFraction = (num: number, den: number, highlight?: boolean) => (
    <div className={`inline-flex flex-col items-center mx-2 ${highlight ? 'text-indigo-600' : ''}`}>
      <span className="border-b-2 border-current px-2">{num}</span>
      <span className="px-2">{den}</span>
    </div>
  )

  // Get operation symbol
  const getOperationSymbol = () => {
    switch (operation) {
      case 'add': return '+'
      case 'multiply': return '×'
      case 'divide': return '÷'
      default: return ''
    }
  }

  // Calculate final answer for display
  const getFinalAnswer = (): Fraction => {
    if (operation === 'simplify') {
      return simplifyFraction(fraction1.numerator, fraction1.denominator)
    }
    if (operation === 'add' && fraction2) {
      const lcd = lcm(fraction1.denominator, fraction2.denominator)
      const sum = fraction1.numerator * (lcd / fraction1.denominator) + fraction2.numerator * (lcd / fraction2.denominator)
      return simplifyFraction(sum, lcd)
    }
    if (operation === 'multiply' && fraction2) {
      return simplifyFraction(
        fraction1.numerator * fraction2.numerator,
        fraction1.denominator * fraction2.denominator
      )
    }
    return fraction1
  }

  if (isComplete) {
    const correctCount = steps.filter(s => s.status === 'correct').length
    const accuracy = Math.round((correctCount / steps.length) * 100)
    const finalAnswer = getFinalAnswer()

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
          <div className="flex items-center justify-center text-2xl">
            {renderFraction(fraction1.numerator, fraction1.denominator)}
            {fraction2 && (
              <>
                <span className="mx-2">{getOperationSymbol()}</span>
                {renderFraction(fraction2.numerator, fraction2.denominator)}
              </>
            )}
            <span className="mx-2">=</span>
            {renderFraction(finalAnswer.numerator, finalAnswer.denominator, true)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{correctCount}/{steps.length}</div>
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
          {operation === 'simplify'
            ? (language === 'he' ? 'צמצם:' : 'Simplify:')
            : (language === 'he' ? 'חשב:' : 'Calculate:')}
        </h3>
        <div className="flex items-center justify-center text-3xl font-bold text-gray-900 dark:text-white">
          {renderFraction(fraction1.numerator, fraction1.denominator)}
          {fraction2 && (
            <>
              <span className="mx-3">{getOperationSymbol()}</span>
              {renderFraction(fraction2.numerator, fraction2.denominator)}
            </>
          )}
          <span className="mx-3">=</span>
          <span className="text-gray-400">?</span>
        </div>
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
            pattern="[0-9-]*"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
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
            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
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
          💡 {language === 'he' ? currentStep.hintHe : currentStep.hint}
        </div>
      )}
    </div>
  )
}
