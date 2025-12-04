'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Course, UserProgress, Lesson, HelpContext } from '@/types'
import { createClient } from '@/lib/supabase/client'
import ProgressBar from '@/components/lesson/ProgressBar'
import StepContent from '@/components/lesson/StepContent'
import QuestionStep from '@/components/lesson/QuestionStep'

// Dynamic imports for components not needed immediately
const LessonComplete = dynamic(() => import('@/components/lesson/LessonComplete'), {
  loading: () => <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
})
const HelpModal = dynamic(() => import('@/components/help/HelpModal'))

interface QuestionAnswer {
  stepIndex: number
  correct: boolean
}

interface StepTiming {
  stepIndex: number
  stepType: string
  timeMs: number
  wasCorrect?: boolean
  usedHint?: boolean
}

interface LessonViewProps {
  course: Course
  progress: UserProgress
  lessonIndex: number
  lesson: Lesson
  totalLessons: number
}

export default function LessonView({
  course,
  progress: initialProgress,
  lessonIndex,
  lesson,
  totalLessons,
}: LessonViewProps) {
  const router = useRouter()
  const supabase = createClient()

  const steps = lesson.steps || []
  const totalSteps = steps.length

  // Study session tracking
  const sessionIdRef = useRef<string | null>(null)
  const lessonStartTimeRef = useRef<number>(Date.now())

  // Count total questions in this lesson
  const totalQuestions = useMemo(() => {
    return steps.filter(step => step.type === 'question').length
  }, [steps])

  // Determine initial step: if this is the current lesson, resume from saved step
  const getInitialStep = () => {
    if (initialProgress.current_lesson === lessonIndex) {
      return Math.min(initialProgress.current_step, totalSteps - 1)
    }
    return 0
  }

  const [currentStep, setCurrentStep] = useState(getInitialStep)
  const [isSaving, setIsSaving] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  // Question tracking state
  const [answers, setAnswers] = useState<QuestionAnswer[]>([])
  const questionsAnswered = answers.length
  const questionsCorrect = answers.filter(a => a.correct).length

  // Track consecutive wrong answers for hint system
  const consecutiveWrong = useMemo(() => {
    let count = 0
    for (let i = answers.length - 1; i >= 0; i--) {
      if (!answers[i].correct) {
        count++
      } else {
        break
      }
    }
    return count
  }, [answers])

  // Help context for floating help button
  const helpContext: HelpContext = useMemo(() => {
    const stepData = steps[currentStep] || {}
    return {
      courseId: course.id,
      courseTitle: course.generated_course?.title || course.title,
      lessonIndex,
      lessonTitle: lesson.title || `Lesson ${lessonIndex + 1}`,
      stepIndex: currentStep,
      stepContent: stepData.content || '',
      stepType: stepData.type || 'unknown',
    }
  }, [course.id, course.generated_course?.title, course.title, lessonIndex, lesson.title, currentStep, steps])

  // Keyboard shortcut for help (H or ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key === 'h' || e.key === 'H' || e.key === '?') {
        e.preventDefault()
        setShowHelp(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Start study session when lesson begins
  useEffect(() => {
    const startSession = async () => {
      try {
        const res = await fetch('/api/study-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionType: 'lesson',
            courseId: course.id,
            lessonIndex,
          }),
        })
        const data = await res.json()
        if (data.success && data.session?.id) {
          sessionIdRef.current = data.session.id
        }
      } catch (error) {
        console.error('Failed to start study session:', error)
      }
    }

    startSession()
    lessonStartTimeRef.current = Date.now()

    // Cleanup: end session on unmount (if user navigates away without completing)
    return () => {
      if (sessionIdRef.current) {
        // Use sendBeacon for reliable cleanup on page unload
        const payload = JSON.stringify({
          sessionId: sessionIdRef.current,
          questionsAnswered: 0, // Will be updated in handleAdvance for completion
          questionsCorrect: 0,
        })
        navigator.sendBeacon('/api/study-sessions', payload)
      }
    }
  }, [course.id, lessonIndex])

  // Step timing tracking
  const stepStartTimeRef = useRef<number>(Date.now())
  const [stepTimings, setStepTimings] = useState<StepTiming[]>([])

  // Reset step start time when step changes
  useEffect(() => {
    stepStartTimeRef.current = Date.now()
  }, [currentStep])

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === totalSteps - 1
  const isQuestion = currentStepData?.type === 'question'

  // Save progress to database
  const saveProgress = useCallback(async (step: number, completed: boolean = false) => {
    if (!initialProgress.id) return

    setIsSaving(true)
    try {
      const completedLessons = completed
        ? [...new Set([...initialProgress.completed_lessons, lessonIndex])]
        : initialProgress.completed_lessons

      await supabase
        .from('user_progress')
        .update({
          current_lesson: lessonIndex,
          current_step: step,
          completed_lessons: completedLessons,
        })
        .eq('id', initialProgress.id)
    } catch (error) {
      console.error('Failed to save progress:', error)
    } finally {
      setIsSaving(false)
    }
  }, [supabase, initialProgress.id, initialProgress.completed_lessons, lessonIndex])

  // Save question stats on lesson completion
  const saveQuestionStats = useCallback(async (answered: number, correct: number) => {
    if (!initialProgress.id) return

    try {
      // Get current stats to add to them (cumulative)
      const { data: currentProgress } = await supabase
        .from('user_progress')
        .select('questions_answered, questions_correct')
        .eq('id', initialProgress.id)
        .single()

      const currentAnswered = currentProgress?.questions_answered || 0
      const currentCorrect = currentProgress?.questions_correct || 0

      await supabase
        .from('user_progress')
        .update({
          questions_answered: currentAnswered + answered,
          questions_correct: currentCorrect + correct,
        })
        .eq('id', initialProgress.id)
    } catch (error) {
      console.error('Failed to save question stats:', error)
    }
  }, [supabase, initialProgress.id])

  // Save step performance data on lesson completion
  const saveStepPerformance = useCallback(async (timings: StepTiming[]) => {
    if (timings.length === 0) return

    try {
      await fetch('/api/performance/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: course.id,
          lesson_index: lessonIndex,
          steps: timings,
        }),
      })
    } catch (error) {
      console.error('Failed to save step performance:', error)
    }
  }, [course.id, lessonIndex])

  // End study session and update lesson progress
  const endStudySession = useCallback(async (questionsAnswered: number, questionsCorrect: number, completed: boolean) => {
    // End the study session
    if (sessionIdRef.current) {
      try {
        await fetch('/api/study-sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            questionsAnswered,
            questionsCorrect,
          }),
        })
        sessionIdRef.current = null // Clear so cleanup doesn't re-end
      } catch (error) {
        console.error('Failed to end study session:', error)
      }
    }

    // Update lesson progress with mastery calculation
    if (completed) {
      const timeSeconds = Math.round((Date.now() - lessonStartTimeRef.current) / 1000)
      try {
        await fetch('/api/lesson-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseId: course.id,
            lessonIndex,
            lessonTitle: lesson.title,
            questionsAnswered,
            questionsCorrect,
            timeSeconds,
            completed: true,
          }),
        })
      } catch (error) {
        console.error('Failed to update lesson progress:', error)
      }
    }
  }, [course.id, lessonIndex, lesson.title])

  // Record step timing
  const recordStepTiming = useCallback((wasCorrect?: boolean, usedHint?: boolean) => {
    const timeMs = Date.now() - stepStartTimeRef.current
    const timing: StepTiming = {
      stepIndex: currentStep,
      stepType: currentStepData?.type || 'unknown',
      timeMs,
      wasCorrect,
      usedHint,
    }
    setStepTimings(prev => [...prev, timing])
    return timing
  }, [currentStep, currentStepData?.type])

  // Save progress when step changes
  useEffect(() => {
    saveProgress(currentStep)
  }, [currentStep, saveProgress])

  // Handle advancing to next step (used by both Continue button and QuestionStep)
  const handleAdvance = useCallback(async (wasCorrect?: boolean, usedHint?: boolean) => {
    // Record timing for this step
    const timing = recordStepTiming(wasCorrect, usedHint)

    // Track answer for questions
    if (typeof wasCorrect === 'boolean') {
      setAnswers(prev => [...prev, { stepIndex: currentStep, correct: wasCorrect }])
    }

    if (isLastStep) {
      // Complete lesson
      await saveProgress(currentStep, true)

      // Save question stats (need to include current answer if it's a question)
      const finalAnswered = typeof wasCorrect === 'boolean' ? questionsAnswered + 1 : questionsAnswered
      const finalCorrect = wasCorrect === true ? questionsCorrect + 1 : questionsCorrect

      if (finalAnswered > 0) {
        await saveQuestionStats(finalAnswered, finalCorrect)
      }

      // Save all step performance data (including current step timing)
      const allTimings = [...stepTimings, timing]
      await saveStepPerformance(allTimings)

      // End study session and update lesson progress with mastery
      await endStudySession(finalAnswered, finalCorrect, true)

      setShowCompletion(true)
    } else {
      // Go to next step
      setCurrentStep(prev => prev + 1)
    }
  }, [isLastStep, currentStep, saveProgress, saveQuestionStats, questionsAnswered, questionsCorrect, recordStepTiming, stepTimings, saveStepPerformance, endStudySession])

  // Handle exit
  const handleExit = useCallback(() => {
    router.push(`/course/${course.id}`)
  }, [router, course.id])

  // Calculate final stats for completion screen
  const finalQuestionsCorrect = useMemo(() => {
    return answers.filter(a => a.correct).length
  }, [answers])

  // Show completion screen
  if (showCompletion) {
    return (
      <LessonComplete
        lessonTitle={lesson.title}
        lessonIndex={lessonIndex}
        totalLessons={totalLessons}
        courseId={course.id}
        questionsCorrect={finalQuestionsCorrect}
        questionsTotal={totalQuestions}
        lessonSteps={steps}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="container mx-auto px-4 py-3 max-w-2xl">
          <div className="flex items-center gap-4 mb-3">
            {/* Exit button */}
            <button
              onClick={handleExit}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Exit lesson"
            >
              <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Progress bar */}
            <div className="flex-1">
              <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
            </div>
          </div>

          {/* Lesson title */}
          <div className="text-center">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Lesson {lessonIndex + 1} of {totalLessons}
            </span>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {lesson.title}
            </h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-xl">
            {isQuestion ? (
              <QuestionStep
                key={currentStep}
                question={currentStepData.content || (currentStepData as unknown as { question?: string }).question || ''}
                options={currentStepData.options || []}
                correct_answer={currentStepData.correct_answer ?? (currentStepData as unknown as { correctIndex?: number }).correctIndex ?? 0}
                explanation={currentStepData.explanation}
                onComplete={(wasCorrect, usedHint) => handleAdvance(wasCorrect, usedHint)}
                step={currentStepData}
                consecutiveWrong={consecutiveWrong}
                courseId={course.id}
                courseTitle={course.generated_course?.title || course.title}
                lessonIndex={lessonIndex}
                lessonTitle={lesson.title}
                stepIndex={currentStep}
              />
            ) : (
              <StepContent
                key={currentStep}
                step={currentStepData}
                lessonTitle={lesson.title}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer with continue button - only show for non-question steps */}
      {!isQuestion && (
        <footer className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="container mx-auto px-4 py-4 max-w-2xl">
            <button
              onClick={() => handleAdvance()}
              disabled={isSaving}
              className={`
                w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200
                ${!isSaving
                  ? isLastStep
                    ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : isLastStep ? (
                'Complete Lesson'
              ) : (
                'Continue'
              )}
            </button>

            {/* Step navigation hint */}
            {!isLastStep && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
                {totalSteps - currentStep - 1} step{totalSteps - currentStep - 1 !== 1 ? 's' : ''} remaining
              </p>
            )}
          </div>
        </footer>
      )}

      {/* Floating Help Button - only show for non-question steps */}
      {!isQuestion && (
        <button
          onClick={() => setShowHelp(true)}
          className="fixed bottom-24 right-4 md:bottom-8 md:right-8 w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-all hover:scale-110 z-40"
          aria-label="Get help"
          title="Need help? Press H"
          type="button"
        >
          <span className="text-xl">❓</span>
        </button>
      )}

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        context={helpContext}
      />
    </div>
  )
}
