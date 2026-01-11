'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Course, UserProgress, Lesson, PracticeProblem, StructuredWorkedSolution } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { hasMasteredConcept, calculateMasteryLevel, getNextDifficulty } from '@/lib/learning/intensity-config'
import { MathSolutionRenderer, isStructuredMathSolution } from './MathSolutionRenderer'
import { MathText } from '@/components/ui/MathRenderer'

// ============================================================================
// Types
// ============================================================================

interface DeepPracticeState {
  phase: 'intro' | 'worked_example' | 'practice' | 'mastery_complete'
  currentProblemIndex: number
  correctCount: number
  totalAttempts: number
  correctStreak: number
  currentDifficulty: number
  showingHint: boolean
  hintLevel: 0 | 1 | 2
  showingWorkedSolution: boolean
  wrongAttemptsOnCurrent: number
}

interface DeepPracticeLessonViewProps {
  course: Course
  progress: UserProgress
  lessonIndex: number
  lesson: Lesson
  totalLessons: number
}

// ============================================================================
// Component
// ============================================================================

export default function DeepPracticeLessonView({
  course,
  progress: initialProgress,
  lessonIndex,
  lesson,
  totalLessons: _totalLessons,
}: DeepPracticeLessonViewProps) {
  const router = useRouter()
  const _t = useTranslations('lesson')
  const tDeep = useTranslations('deepPractice')
  const supabase = createClient()

  // Extract deep practice content from lesson
  const lessonData = useMemo(() => {
    const steps = lesson.steps || []

    // Find concept intro (first explanation step)
    const introStep = steps.find(s => s.type === 'explanation' || s.type === 'key_point')

    // Find worked example step (if exists) - handles both 'example' and 'worked_example' types
    const workedExampleStep = steps.find(s => s.type === 'example' || s.type === 'worked_example')

    // Extract practice problems from question OR practice_problem steps
    // Deep practice mode generates 'practice_problem' type, standard mode uses 'question'
    const practiceProblems: PracticeProblem[] = steps
      .filter(s => s.type === 'question' || s.type === 'practice_problem')
      .map((s, idx) => {
        // Handle both formats - deep practice uses different field names
        const stepAny = s as unknown as Record<string, unknown>
        return {
          id: `problem_${idx}`,
          problemNumber: (stepAny.problemNumber as number) || idx + 1,
          question: (stepAny.question as string) || s.content || '',
          options: s.options || [],
          correctAnswer: (stepAny.correctIndex as number) ?? s.correct_answer ?? 0,
          hints: (stepAny.hints as string[]) || [],
          workedSolution: (stepAny.workedSolution as string | StructuredWorkedSolution) || s.explanation || '',
          difficulty: (stepAny.difficulty as number) || Math.min(3, Math.floor(idx / 5) + 1),
        }
      })

    // Extract worked example - handle deep practice nested format
    let workedExample = null
    if (workedExampleStep) {
      const stepAny = workedExampleStep as unknown as Record<string, unknown>
      const nestedExample = stepAny.workedExample as Record<string, unknown> | undefined

      workedExample = {
        problem: (nestedExample?.problem as string) || workedExampleStep.title || 'Example',
        steps: (nestedExample?.steps as Array<{step: number; action: string; why: string; result: string}>) || [],
        finalAnswer: (nestedExample?.finalAnswer as string) || workedExampleStep.content || '',
        keyInsight: (nestedExample?.keyInsight as string) || '',
      }
    }

    return {
      introContent: introStep?.content || lesson.title,
      workedExample,
      practiceProblems,
    }
  }, [lesson])

  // Hydration fix: track if component has mounted on client
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // State
  const [state, setState] = useState<DeepPracticeState>({
    phase: 'intro',
    currentProblemIndex: 0,
    correctCount: 0,
    totalAttempts: 0,
    correctStreak: 0,
    currentDifficulty: 1,
    showingHint: false,
    hintLevel: 0,
    showingWorkedSolution: false,
    wrongAttemptsOnCurrent: 0,
  })

  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Session tracking
  const _sessionStartRef = useRef<number>(Date.now())

  // Current problem
  const currentProblem = lessonData.practiceProblems[state.currentProblemIndex]

  // Mastery calculation
  const masteryLevel = useMemo(() => {
    if (state.totalAttempts === 0) return 0
    return calculateMasteryLevel(state.correctCount, state.totalAttempts, state.currentDifficulty, state.correctStreak)
  }, [state.correctCount, state.totalAttempts, state.currentDifficulty, state.correctStreak])

  const isMastered = hasMasteredConcept('deep_practice', state.correctCount, state.totalAttempts, 5)

  // Handle phase transitions
  const goToPhase = useCallback((phase: DeepPracticeState['phase']) => {
    setState(prev => ({ ...prev, phase }))
  }, [])

  // Handle answer submission
  const handleAnswerSubmit = useCallback(() => {
    if (selectedAnswer === null || !currentProblem) return

    const correct = selectedAnswer === currentProblem.correctAnswer
    setIsCorrect(correct)
    setShowFeedback(true)

    setState(prev => {
      const newState = {
        ...prev,
        totalAttempts: prev.totalAttempts + 1,
      }

      if (correct) {
        newState.correctCount = prev.correctCount + 1
        newState.correctStreak = prev.correctStreak + 1
        newState.wrongAttemptsOnCurrent = 0

        // Increase difficulty after 3 correct in a row
        if (newState.correctStreak >= 3 && newState.currentDifficulty < 3) {
          newState.currentDifficulty = getNextDifficulty(prev.currentDifficulty, newState.correctStreak, 0)
          newState.correctStreak = 0
        }
      } else {
        newState.correctStreak = 0
        newState.wrongAttemptsOnCurrent = prev.wrongAttemptsOnCurrent + 1
      }

      return newState
    })
  }, [selectedAnswer, currentProblem])

  // Handle continue after feedback
  const handleContinueAfterFeedback = useCallback(() => {
    setShowFeedback(false)
    setSelectedAnswer(null)
    setState(prev => ({
      ...prev,
      showingHint: false,
      hintLevel: 0,
      showingWorkedSolution: false,
    }))

    // Check if mastery achieved
    if (isMastered || (isCorrect && hasMasteredConcept('deep_practice', state.correctCount + 1, state.totalAttempts + 1, 5))) {
      goToPhase('mastery_complete')
      return
    }

    // Move to next problem if correct
    if (isCorrect) {
      setState(prev => ({
        ...prev,
        currentProblemIndex: Math.min(prev.currentProblemIndex + 1, lessonData.practiceProblems.length - 1),
        wrongAttemptsOnCurrent: 0,
      }))
    }
  }, [isCorrect, isMastered, state.correctCount, state.totalAttempts, lessonData.practiceProblems.length, goToPhase])

  // Handle hint request
  const handleShowHint = useCallback(() => {
    setState(prev => ({
      ...prev,
      showingHint: true,
      hintLevel: Math.min(2, prev.hintLevel + 1) as 0 | 1 | 2,
    }))
  }, [])

  // Handle show worked solution (available for future use)
  const _handleShowSolution = useCallback(() => {
    setState(prev => ({
      ...prev,
      showingWorkedSolution: true,
    }))
  }, [])

  // Save progress and complete lesson
  const saveCompletionAndExit = useCallback(async () => {
    if (!initialProgress.id) return

    setIsSaving(true)
    try {
      // Safely handle null/undefined completed_lessons from database
      const existingCompleted = initialProgress.completed_lessons || []
      const completedLessons = [...new Set([...existingCompleted, lessonIndex])]

      await supabase
        .from('user_progress')
        .update({
          current_lesson: lessonIndex,
          current_step: 0,
          completed_lessons: completedLessons,
          questions_answered: (initialProgress.questions_answered || 0) + state.totalAttempts,
          questions_correct: (initialProgress.questions_correct || 0) + state.correctCount,
        })
        .eq('id', initialProgress.id)

      // Save deep practice progress
      await fetch('/api/deep-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          lessonIndex,
          conceptId: lesson.title,
          mastery: masteryLevel,
          problemsAttempted: state.totalAttempts,
          problemsCorrect: state.correctCount,
          completed: true,
        }),
      })

      router.push(`/course/${course.id}`)
    } catch {
      // Continue anyway
    } finally {
      setIsSaving(false)
    }
  }, [supabase, initialProgress, lessonIndex, course.id, lesson.title, masteryLevel, state, router])

  // Handle exit
  const handleExit = useCallback(() => {
    router.push(`/course/${course.id}`)
  }, [router, course.id])

  // ============================================================================
  // Render: Intro Phase
  // ============================================================================
  if (state.phase === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-3 max-w-4xl">
            <div className="flex items-center justify-between">
              <button onClick={handleExit} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="text-center">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                  {tDeep('deepPractice')}
                </span>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{lesson.title}</h1>
              </div>
              <div className="w-10" />
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-6">
            <span className="text-4xl">🎯</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {tDeep('conceptIntro')}
          </h2>

          <div className="prose dark:prose-invert max-w-none text-center mb-8">
            <p className="text-lg text-gray-600 dark:text-gray-300">{lessonData.introContent}</p>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-6 mb-8 w-full">
            <h3 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-2">{tDeep('masteryGoal')}</h3>
            <ul className="text-sm text-indigo-700 dark:text-indigo-300 space-y-1">
              <li>• {tDeep('masteryRequirement1')}</li>
              <li>• {tDeep('masteryRequirement2')}</li>
            </ul>
          </div>

          <button
            onClick={() => (isMounted && lessonData.workedExample) ? goToPhase('worked_example') : goToPhase('practice')}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-lg transition-all"
          >
            {/* Use isMounted to prevent hydration mismatch - server always shows startPractice */}
            {(isMounted && lessonData.workedExample) ? tDeep('seeWorkedExample') : tDeep('startPractice')}
          </button>
        </main>
      </div>
    )
  }

  // ============================================================================
  // Render: Worked Example Phase
  // ============================================================================
  if (state.phase === 'worked_example' && lessonData.workedExample) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-3 max-w-4xl">
            <div className="flex items-center justify-between">
              <button onClick={() => goToPhase('intro')} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  {tDeep('workedExample')}
                </span>
              </div>
              <div className="w-10" />
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{lessonData.workedExample.problem}</h3>
            <div className="prose dark:prose-invert max-w-none">
              <p>{lessonData.workedExample.finalAnswer}</p>
            </div>
          </div>

          <button
            onClick={() => goToPhase('practice')}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-lg transition-all"
          >
            {tDeep('readyToPractice')}
          </button>
        </main>
      </div>
    )
  }

  // ============================================================================
  // Render: Mastery Complete Phase
  // ============================================================================
  if (state.phase === 'mastery_complete') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <span className="text-5xl">🎉</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {tDeep('masteryAchieved')}
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            {tDeep('masteryDescription')}
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{state.correctCount}</p>
              <p className="text-sm text-gray-500">{tDeep('correctAnswers')}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{Math.round(masteryLevel * 100)}%</p>
              <p className="text-sm text-gray-500">{tDeep('masteryLevel')}</p>
            </div>
          </div>

          <button
            onClick={saveCompletionAndExit}
            disabled={isSaving}
            className="w-full max-w-md py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-lg transition-all disabled:opacity-50"
          >
            {isSaving ? tDeep('saving') : tDeep('completeLesson')}
          </button>
        </div>
      </div>
    )
  }

  // ============================================================================
  // Render: Practice Phase
  // ============================================================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header with Progress */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-4 py-3 max-w-4xl">
          <div className="flex items-center gap-4">
            <button onClick={handleExit} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Mastery Progress Bar */}
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{tDeep('mastery')}</span>
                <span className="font-medium text-indigo-600">{Math.round(masteryLevel * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${masteryLevel * 100}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600 font-medium">✓ {state.correctCount}</span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-500">{state.totalAttempts}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Practice Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl flex flex-col">
        {currentProblem ? (
          <div className="flex-1 flex flex-col">
            {/* Problem Number */}
            <div className="text-center mb-6">
              <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-medium">
                {tDeep('problem')} #{state.currentProblemIndex + 1}
              </span>
              {state.correctStreak >= 2 && (
                <span className="ml-2 inline-block px-2 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded-full text-xs">
                  🔥 {state.correctStreak} {tDeep('streak')}
                </span>
              )}
            </div>

            {/* Question */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
              <p className="text-lg text-gray-900 dark:text-white">{currentProblem.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {(currentProblem.options || []).map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => !showFeedback && setSelectedAnswer(idx)}
                  disabled={showFeedback}
                  className={`
                    w-full p-4 text-left rounded-xl border-2 transition-all
                    ${selectedAnswer === idx
                      ? showFeedback
                        ? isCorrect
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                    ${showFeedback && idx === currentProblem.correctAnswer && !isCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : ''
                    }
                    disabled:cursor-default
                  `}
                >
                  <span className="font-medium text-gray-500 mr-3">{String.fromCharCode(65 + idx)}.</span>
                  <span className="text-gray-900 dark:text-white">{option}</span>
                </button>
              ))}
            </div>

            {/* Feedback */}
            {showFeedback && (
              <div className={`rounded-xl p-4 mb-6 ${isCorrect ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{isCorrect ? '✅' : '❌'}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {isCorrect ? tDeep('correct') : tDeep('incorrect')}
                  </span>
                </div>

                {!isCorrect && currentProblem.workedSolution && (
                  <div className="text-gray-700 dark:text-gray-300 text-sm">
                    {isStructuredMathSolution(currentProblem.workedSolution) ? (
                      <MathSolutionRenderer solution={currentProblem.workedSolution} />
                    ) : typeof currentProblem.workedSolution === 'string' ? (
                      <MathText>{currentProblem.workedSolution}</MathText>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Hints */}
            {!showFeedback && state.showingHint && currentProblem.hints.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-6">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  💡 {currentProblem.hints[Math.min(state.hintLevel, currentProblem.hints.length - 1)]}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">{tDeep('noMoreProblems')}</p>
          </div>
        )}
      </main>

      {/* Footer Actions */}
      <footer className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          {showFeedback ? (
            <button
              onClick={handleContinueAfterFeedback}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
                isCorrect
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isCorrect ? tDeep('nextProblem') : tDeep('tryAgain')}
            </button>
          ) : (
            <div className="flex gap-3">
              {!state.showingWorkedSolution && currentProblem?.hints && currentProblem.hints.length > 0 && (
                <button
                  onClick={handleShowHint}
                  className="flex-1 py-4 border-2 border-amber-500 text-amber-600 dark:text-amber-400 rounded-xl font-semibold transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20"
                >
                  💡 {tDeep('hint')}
                </button>
              )}
              <button
                onClick={handleAnswerSubmit}
                disabled={selectedAnswer === null}
                className={`flex-1 py-4 rounded-xl font-semibold text-lg transition-all ${
                  selectedAnswer !== null
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {tDeep('checkAnswer')}
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}
