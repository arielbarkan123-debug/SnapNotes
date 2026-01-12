'use client'

import { useState, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { MathProblemType, MathDifficulty, MATH_PROBLEM_CONFIG } from '@/lib/practice/types'
import {
  generateMathProblem,
  LongDivisionProblem,
  FractionProblem,
  EquationProblem,
  MathProblem,
} from '@/lib/practice/math-problem-generator'
import LongDivisionWorkspace from '@/components/practice/LongDivisionWorkspace'
import FractionWorkspace from '@/components/practice/FractionWorkspace'
import EquationWorkspace from '@/components/practice/EquationWorkspace'

type PracticeState = 'select' | 'practice' | 'complete'

interface SessionStats {
  problemsCompleted: number
  problemsCorrect: number
  totalSteps: number
  stepsCorrect: number
}

export default function MathPracticePage() {
  const t = useTranslations('practice')
  const locale = useLocale()
  const language = locale === 'he' ? 'he' : 'en'
  const isRTL = language === 'he'

  // State
  const [state, setState] = useState<PracticeState>('select')
  const [selectedType, setSelectedType] = useState<MathProblemType | null>(null)
  const [difficulty, setDifficulty] = useState<MathDifficulty>('easy')
  const [currentProblem, setCurrentProblem] = useState<MathProblem | null>(null)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    problemsCompleted: 0,
    problemsCorrect: 0,
    totalSteps: 0,
    stepsCorrect: 0,
  })

  // Available problem types (only implemented ones)
  const availableTypes: MathProblemType[] = [
    'long_division',
    'fraction_simplify',
    'fraction_add',
    'fraction_multiply',
    'equation_linear',
  ]

  // Start practice
  const startPractice = useCallback((type: MathProblemType) => {
    setSelectedType(type)
    const problem = generateMathProblem(type, difficulty)
    setCurrentProblem(problem)
    setState('practice')
  }, [difficulty])

  // Handle problem completion
  const handleProblemComplete = useCallback((allCorrect: boolean) => {
    setSessionStats(prev => ({
      ...prev,
      problemsCompleted: prev.problemsCompleted + 1,
      problemsCorrect: prev.problemsCorrect + (allCorrect ? 1 : 0),
    }))
  }, [])

  // Handle step completion
  const handleStepComplete = useCallback((stepIndex: number, correct: boolean) => {
    setSessionStats(prev => ({
      ...prev,
      totalSteps: prev.totalSteps + 1,
      stepsCorrect: prev.stepsCorrect + (correct ? 1 : 0),
    }))
  }, [])

  // Generate next problem
  const nextProblem = useCallback(() => {
    if (selectedType) {
      const problem = generateMathProblem(selectedType, difficulty)
      setCurrentProblem(problem)
    }
  }, [selectedType, difficulty])

  // End session
  const endSession = useCallback(() => {
    setState('complete')
  }, [])

  // Reset to type selection
  const resetSession = useCallback(() => {
    setState('select')
    setSelectedType(null)
    setCurrentProblem(null)
    setSessionStats({
      problemsCompleted: 0,
      problemsCorrect: 0,
      totalSteps: 0,
      stepsCorrect: 0,
    })
  }, [])

  // Render problem type card
  const renderTypeCard = (type: MathProblemType) => {
    const config = MATH_PROBLEM_CONFIG[type]
    if (!config) return null

    return (
      <button
        key={type}
        onClick={() => startPractice(type)}
        className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all border-2 border-transparent hover:border-indigo-300 dark:hover:border-indigo-600 text-left"
      >
        <div className="text-4xl mb-3">{config.icon}</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {language === 'he' ? config.nameHe : config.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          ~{config.estimatedMinutes} {language === 'he' ? 'דקות' : 'min'}
        </p>
      </button>
    )
  }

  // Render workspace based on problem type
  const renderWorkspace = () => {
    if (!currentProblem) return null

    switch (currentProblem.type) {
      case 'long_division': {
        const p = currentProblem as LongDivisionProblem
        return (
          <LongDivisionWorkspace
            dividend={p.dividend}
            divisor={p.divisor}
            language={language}
            onStepComplete={handleStepComplete}
            onProblemComplete={handleProblemComplete}
          />
        )
      }

      case 'fraction_simplify':
      case 'fraction_add':
      case 'fraction_multiply': {
        const p = currentProblem as FractionProblem
        return (
          <FractionWorkspace
            operation={p.operation}
            fraction1={p.fraction1}
            fraction2={p.fraction2}
            language={language}
            onStepComplete={handleStepComplete}
            onProblemComplete={handleProblemComplete}
          />
        )
      }

      case 'equation_linear': {
        const p = currentProblem as EquationProblem
        return (
          <EquationWorkspace
            type="linear"
            equation={{ a: p.a, b: p.b, c: p.c }}
            language={language}
            onStepComplete={handleStepComplete}
            onProblemComplete={handleProblemComplete}
          />
        )
      }

      default:
        return null
    }
  }

  // Type selection screen
  if (state === 'select') {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/practice"
              className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRTL ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
              </svg>
              {language === 'he' ? 'חזרה לתרגול' : 'Back to Practice'}
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {language === 'he' ? 'תרגול מתמטיקה צעד אחר צעד' : 'Step-by-Step Math Practice'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {language === 'he'
                ? 'בחר סוג תרגיל ותלמד לפתור אותו צעד אחר צעד'
                : 'Choose a problem type and learn to solve it step by step'}
            </p>
          </div>

          {/* Difficulty selector */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'he' ? 'רמת קושי' : 'Difficulty'}
            </label>
            <div className="flex gap-3">
              {(['easy', 'medium', 'hard'] as MathDifficulty[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    difficulty === level
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {level === 'easy' && (language === 'he' ? 'קל' : 'Easy')}
                  {level === 'medium' && (language === 'he' ? 'בינוני' : 'Medium')}
                  {level === 'hard' && (language === 'he' ? 'קשה' : 'Hard')}
                </button>
              ))}
            </div>
          </div>

          {/* Problem type grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableTypes.map(renderTypeCard)}
          </div>
        </div>
      </div>
    )
  }

  // Practice screen
  if (state === 'practice') {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Header with stats */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={endSession}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {language === 'he' ? 'תרגילים' : 'Problems'}: {sessionStats.problemsCompleted}
              </span>
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-sm text-green-600">
                {sessionStats.problemsCorrect} {language === 'he' ? 'נכון' : 'correct'}
              </span>
            </div>
            <div className="w-6" /> {/* Spacer for alignment */}
          </div>

          {/* Workspace */}
          {renderWorkspace()}

          {/* Action buttons */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={nextProblem}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {language === 'he' ? 'תרגיל הבא' : 'Next Problem'}
            </button>
            <button
              onClick={endSession}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {language === 'he' ? 'סיום' : 'End'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Complete screen
  if (state === 'complete') {
    const accuracy = sessionStats.totalSteps > 0
      ? Math.round((sessionStats.stepsCorrect / sessionStats.totalSteps) * 100)
      : 0

    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            {/* Celebration */}
            <div className="text-6xl mb-4">
              {accuracy >= 80 ? '🎉' : accuracy >= 60 ? '👍' : '💪'}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {language === 'he' ? 'כל הכבוד!' : 'Great Job!'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {language === 'he' ? 'סיימת את התרגול' : 'You completed the practice session'}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-4">
                <div className="text-3xl font-bold text-indigo-600">{sessionStats.problemsCompleted}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'he' ? 'תרגילים' : 'Problems'}
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-600">{accuracy}%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'he' ? 'דיוק' : 'Accuracy'}
                </div>
              </div>
            </div>

            {/* Detail stats */}
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {language === 'he'
                ? `${sessionStats.stepsCorrect} מתוך ${sessionStats.totalSteps} צעדים נכונים`
                : `${sessionStats.stepsCorrect} of ${sessionStats.totalSteps} steps correct`}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={resetSession}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                {language === 'he' ? 'תרגל עוד' : 'Practice More'}
              </button>
              <Link
                href="/practice"
                className="block w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {language === 'he' ? 'חזרה לתרגול' : 'Back to Practice'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
