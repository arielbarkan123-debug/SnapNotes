'use client'

import { useState, useEffect, useCallback } from 'react'

// =============================================================================
// Types
// =============================================================================

export type ReflectionType = 'session' | 'weekly'

interface SessionReflectionProps {
  type: ReflectionType
  // Session context
  sessionType?: 'review' | 'lessons' | 'practice'
  cardsReviewed?: number
  lessonsCompleted?: number
  timeSpentMs?: number
  // Weekly context
  weekStats?: {
    cardsReviewed: number
    currentStreak: number
  }
  // Callbacks
  onComplete: () => void
  onSkip: () => void
}

interface SessionReflectionData {
  learned: string
  challenges: string
}

interface WeeklyReflectionData {
  rating: number
  wentWell: string
  couldBeBetter: string
}

// =============================================================================
// Main Component
// =============================================================================

export default function SessionReflection({
  type,
  sessionType,
  cardsReviewed = 0,
  lessonsCompleted = 0,
  timeSpentMs = 0,
  weekStats,
  onComplete,
  onSkip,
}: SessionReflectionProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  // Session reflection state
  const [sessionData, setSessionData] = useState<SessionReflectionData>({
    learned: '',
    challenges: '',
  })

  // Weekly reflection state
  const [weeklyData, setWeeklyData] = useState<WeeklyReflectionData>({
    rating: 0,
    wentWell: '',
    couldBeBetter: '',
  })

  const isWeekly = type === 'weekly'
  const totalSteps = isWeekly ? 3 : 2

  // Save reflection
  const handleSave = useCallback(async () => {
    setIsSaving(true)

    try {
      const payload = isWeekly
        ? {
            reflectionType: 'weekly',
            rating: weeklyData.rating,
            wentWell: weeklyData.wentWell || null,
            couldBeBetter: weeklyData.couldBeBetter || null,
          }
        : {
            reflectionType: 'session',
            learned: sessionData.learned || null,
            challenges: sessionData.challenges || null,
            sessionType,
            cardsReviewed,
            lessonsCompleted,
            timeSpentMs,
          }

      await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      onComplete()
    } catch {
      onComplete() // Still close on error
    } finally {
      setIsSaving(false)
    }
  }, [isWeekly, weeklyData, sessionData, sessionType, cardsReviewed, lessonsCompleted, timeSpentMs, onComplete])

  // Handle next step
  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleSave()
    }
  }

  // Handle back
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSkip])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative p-6 pb-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center">
            <span className="text-4xl mb-2 block">
              {isWeekly ? '📊' : '✨'}
            </span>
            <h2 className="text-xl font-bold">
              {isWeekly ? 'Weekly Check-in' : 'Quick Reflection'}
            </h2>
            <p className="text-indigo-200 text-sm mt-1">
              {isWeekly
                ? 'How was your study week?'
                : 'Take a moment to reflect on your session'
              }
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep
                    ? 'bg-white scale-125'
                    : i < currentStep
                    ? 'bg-white/80'
                    : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isWeekly ? (
            <WeeklyReflectionContent
              step={currentStep}
              data={weeklyData}
              weekStats={weekStats}
              onChange={setWeeklyData}
            />
          ) : (
            <SessionReflectionContent
              step={currentStep}
              data={sessionData}
              sessionType={sessionType}
              cardsReviewed={cardsReviewed}
              lessonsCompleted={lessonsCompleted}
              timeSpentMs={timeSpentMs}
              onChange={setSessionData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex gap-3">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
            >
              Back
            </button>
          )}

          <div className="flex-1" />

          <button
            onClick={onSkip}
            className="px-4 py-2.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors"
          >
            Skip
          </button>

          <button
            onClick={handleNext}
            disabled={isSaving || (isWeekly && currentStep === 0 && weeklyData.rating === 0)}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : currentStep === totalSteps - 1 ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Session Reflection Content
// =============================================================================

interface SessionReflectionContentProps {
  step: number
  data: SessionReflectionData
  sessionType?: string
  cardsReviewed: number
  lessonsCompleted: number
  timeSpentMs: number
  onChange: (data: SessionReflectionData) => void
}

function SessionReflectionContent({
  step,
  data,
  sessionType,
  cardsReviewed,
  lessonsCompleted,
  timeSpentMs,
  onChange,
}: SessionReflectionContentProps) {
  const formatTime = (ms: number) => {
    const mins = Math.round(ms / 60000)
    return mins < 1 ? '< 1 min' : `${mins} min`
  }

  const getSessionSummary = () => {
    const parts = []
    if (cardsReviewed > 0) parts.push(`${cardsReviewed} cards reviewed`)
    if (lessonsCompleted > 0) parts.push(`${lessonsCompleted} lessons completed`)
    if (parts.length === 0) return 'Great study session!'
    return parts.join(', ')
  }

  if (step === 0) {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-200">
        {/* Session summary */}
        <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
          <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-300">
            <span className="text-2xl">
              {sessionType === 'review' ? '📚' : sessionType === 'lessons' ? '📖' : '✍️'}
            </span>
            <div>
              <p className="font-medium">{getSessionSummary()}</p>
              <p className="text-sm text-indigo-600 dark:text-indigo-400">
                {formatTime(timeSpentMs)} of study time
              </p>
            </div>
          </div>
        </div>

        <label className="block mb-2 font-medium text-gray-900 dark:text-white">
          What&apos;s one thing you learned today?
        </label>
        <textarea
          value={data.learned}
          onChange={(e) => onChange({ ...data, learned: e.target.value })}
          placeholder="Even small insights count! (optional)"
          className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-32"
          autoFocus
        />
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <label className="block mb-2 font-medium text-gray-900 dark:text-white">
        What was challenging?
      </label>
      <textarea
        value={data.challenges}
        onChange={(e) => onChange({ ...data, challenges: e.target.value })}
        placeholder="Identifying challenges helps improve your learning path (optional)"
        className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-32"
        autoFocus
      />
    </div>
  )
}

// =============================================================================
// Weekly Reflection Content
// =============================================================================

interface WeeklyReflectionContentProps {
  step: number
  data: WeeklyReflectionData
  weekStats?: {
    cardsReviewed: number
    currentStreak: number
  }
  onChange: (data: WeeklyReflectionData) => void
}

function WeeklyReflectionContent({
  step,
  data,
  weekStats,
  onChange,
}: WeeklyReflectionContentProps) {
  const stars = [1, 2, 3, 4, 5]

  if (step === 0) {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-200">
        {/* Week summary */}
        {weekStats && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl">
            <div className="flex justify-around text-center">
              <div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {weekStats.cardsReviewed}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Cards this week</p>
              </div>
              <div className="w-px bg-gray-200 dark:bg-gray-700" />
              <div>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {weekStats.currentStreak}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Day streak</p>
              </div>
            </div>
          </div>
        )}

        <label className="block mb-4 font-medium text-gray-900 dark:text-white text-center">
          How was your study week overall?
        </label>

        {/* Star rating */}
        <div className="flex justify-center gap-2 mb-4">
          {stars.map((star) => (
            <button
              key={star}
              onClick={() => onChange({ ...data, rating: star })}
              className={`
                p-2 rounded-full transition-all duration-200
                ${data.rating >= star
                  ? 'text-yellow-400 scale-110'
                  : 'text-gray-300 dark:text-gray-600 hover:text-yellow-300'
                }
              `}
            >
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {data.rating === 0 && 'Tap to rate'}
          {data.rating === 1 && 'Challenging week'}
          {data.rating === 2 && 'Could be better'}
          {data.rating === 3 && 'Decent week'}
          {data.rating === 4 && 'Good week!'}
          {data.rating === 5 && 'Amazing week!'}
        </p>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-200">
        <label className="block mb-2 font-medium text-gray-900 dark:text-white">
          What went well this week?
        </label>
        <textarea
          value={data.wentWell}
          onChange={(e) => onChange({ ...data, wentWell: e.target.value })}
          placeholder="Celebrate your wins, big or small! (optional)"
          className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-32"
          autoFocus
        />
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-200">
      <label className="block mb-2 font-medium text-gray-900 dark:text-white">
        What could be better next week?
      </label>
      <textarea
        value={data.couldBeBetter}
        onChange={(e) => onChange({ ...data, couldBeBetter: e.target.value })}
        placeholder="Any adjustments you'd like to make? (optional)"
        className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-32"
        autoFocus
      />
    </div>
  )
}

// =============================================================================
// Export hook for triggering reflections
// =============================================================================

interface SessionContext {
  sessionType: 'review' | 'lessons' | 'practice'
  cardsReviewed?: number
  lessonsCompleted?: number
  timeSpentMs?: number
}

/**
 * Hook to determine if a reflection should be shown
 */
export function useReflectionTrigger() {
  const [showReflection, setShowReflection] = useState<{
    show: boolean
    type: ReflectionType
    context?: SessionContext
    weekStats?: { cardsReviewed: number; currentStreak: number }
  }>({ show: false, type: 'session' })

  // Check for weekly reflection on mount
  useEffect(() => {
    const checkWeekly = async () => {
      try {
        const response = await fetch('/api/reflections?checkWeekly=true')
        if (response.ok) {
          const data = await response.json()
          if (data.isDue) {
            setShowReflection({
              show: true,
              type: 'weekly',
              weekStats: data.weekStats,
            })
          }
        }
      } catch {
        // Weekly check failed silently
      }
    }

    checkWeekly()
  }, [])

  // Trigger session reflection
  const triggerSessionReflection = useCallback((context: SessionContext) => {
    // Only trigger if significant session (3+ cards or lessons)
    const isSignificant =
      (context.cardsReviewed || 0) >= 3 ||
      (context.lessonsCompleted || 0) >= 3

    if (isSignificant) {
      setShowReflection({
        show: true,
        type: 'session',
        context,
      })
    }
  }, [])

  // Close reflection
  const closeReflection = useCallback(() => {
    setShowReflection({ show: false, type: 'session' })
  }, [])

  return {
    showReflection: showReflection.show,
    reflectionType: showReflection.type,
    reflectionContext: showReflection.context,
    weekStats: showReflection.weekStats,
    triggerSessionReflection,
    closeReflection,
  }
}
