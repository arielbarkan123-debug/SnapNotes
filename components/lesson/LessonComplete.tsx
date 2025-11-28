'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useXP } from '@/contexts/XPContext'
import { LessonStep } from '@/types'
import LessonRecap from './LessonRecap'

// =============================================================================
// Types
// =============================================================================

interface LessonCompleteProps {
  lessonTitle: string
  lessonIndex: number
  totalLessons: number
  courseId: string
  questionsCorrect: number
  questionsTotal: number
  lessonSteps?: LessonStep[]
  onNextLesson?: () => void
}

type AssessmentStep = 'results' | 'confidence' | 'difficulty' | 'goal' | 'complete'

interface SelfAssessment {
  confidence: number | null // 1-4
  difficulty: 'too_easy' | 'just_right' | 'too_hard' | null
  goalAchieved: 'yes' | 'partially' | 'no' | null
  confusionNote: string
}

// =============================================================================
// Constants
// =============================================================================

const CONFIDENCE_OPTIONS = [
  { value: 1, emoji: '😟', label: 'Not confident', color: 'from-red-500 to-red-600' },
  { value: 2, emoji: '😐', label: 'Somewhat', color: 'from-yellow-500 to-orange-500' },
  { value: 3, emoji: '😊', label: 'Confident', color: 'from-green-500 to-emerald-500' },
  { value: 4, emoji: '🤩', label: 'Very confident', color: 'from-blue-500 to-indigo-500' },
]

const DIFFICULTY_OPTIONS = [
  { value: 'too_easy' as const, emoji: '😴', label: 'Too Easy', color: 'from-cyan-500 to-blue-500' },
  { value: 'just_right' as const, emoji: '👌', label: 'Just Right', color: 'from-green-500 to-emerald-500' },
  { value: 'too_hard' as const, emoji: '😰', label: 'Too Hard', color: 'from-orange-500 to-red-500' },
]

const GOAL_OPTIONS = [
  { value: 'yes' as const, emoji: '✅', label: 'Yes', color: 'from-green-500 to-emerald-500' },
  { value: 'partially' as const, emoji: '🔄', label: 'Partially', color: 'from-yellow-500 to-orange-500' },
  { value: 'no' as const, emoji: '❌', label: 'No', color: 'from-red-500 to-red-600' },
]

// =============================================================================
// Main Component
// =============================================================================

export default function LessonComplete({
  lessonTitle,
  lessonIndex,
  totalLessons,
  courseId,
  questionsCorrect,
  questionsTotal,
  lessonSteps = [],
  onNextLesson,
}: LessonCompleteProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  const [animationStage, setAnimationStage] = useState(0)
  const [xpAwarded, setXpAwarded] = useState(0)
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [showRecap, setShowRecap] = useState(false)
  const hasAwardedXP = useRef(false)
  const { showXP, showLevelUp } = useXP()

  // Self-assessment state
  const [currentStep, setCurrentStep] = useState<AssessmentStep>('results')
  const [assessment, setAssessment] = useState<SelfAssessment>({
    confidence: null,
    difficulty: null,
    goalAchieved: null,
    confusionNote: '',
  })
  const [assessmentSuggestion, setAssessmentSuggestion] = useState<string | null>(null)
  const [isSavingAssessment, setIsSavingAssessment] = useState(false)

  const hasNextLesson = lessonIndex < totalLessons - 1
  const hasQuestions = questionsTotal > 0
  const accuracy = hasQuestions ? Math.round((questionsCorrect / questionsTotal) * 100) : 100
  const isPerfect = accuracy === 100 && hasQuestions
  const needsReview = hasQuestions && accuracy < 80

  // XP calculation: Base 10 + 5 bonus for perfect score
  const baseXp = 10
  const bonusXp = isPerfect ? 5 : 0
  const totalXp = baseXp + bonusXp

  // Award XP on mount
  useEffect(() => {
    if (hasAwardedXP.current) return
    hasAwardedXP.current = true

    const awardXP = async () => {
      try {
        const xpResponse = await fetch('/api/gamification/xp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: isPerfect ? 'lesson_perfect' : 'lesson_complete',
            metadata: { courseId, lessonIndex, accuracy },
          }),
        })

        if (xpResponse.ok) {
          const xpData = await xpResponse.json()
          setXpAwarded(xpData.xpAwarded)

          setTimeout(() => {
            showXP(xpData.xpAwarded)
            if (xpData.levelUp && xpData.newLevel) {
              setTimeout(() => showLevelUp(xpData.newLevel, xpData.newTitle), 1500)
            }
          }, 1500)
        }

        await fetch('/api/gamification/streak', { method: 'POST' })

        const achievementResponse = await fetch('/api/gamification/check', { method: 'POST' })
        if (achievementResponse.ok) {
          const achievementData = await achievementResponse.json()
          if (achievementData.newAchievements?.length > 0) {
            setNewAchievements(achievementData.newAchievements.map((a: { name: string }) => a.name))
          }
        }
      } catch (error) {
        console.error('Failed to award XP:', error)
      }
    }

    awardXP()
  }, [isPerfect, courseId, lessonIndex, accuracy, showXP, showLevelUp])

  // Staggered animation stages
  useEffect(() => {
    const timers = [
      setTimeout(() => setAnimationStage(1), 200),
      setTimeout(() => setAnimationStage(2), 600),
      setTimeout(() => setAnimationStage(3), 900),
      setTimeout(() => setAnimationStage(4), 1200),
      setTimeout(() => setShowConfetti(false), 4000),
    ]

    return () => timers.forEach(clearTimeout)
  }, [])

  // Handlers
  const handleConfidenceSelect = (value: number) => {
    setAssessment(prev => ({ ...prev, confidence: value }))
    setCurrentStep('difficulty')
  }

  const handleDifficultySelect = (value: 'too_easy' | 'just_right' | 'too_hard') => {
    setAssessment(prev => ({ ...prev, difficulty: value }))
    setCurrentStep('goal')
  }

  const handleGoalSelect = async (value: 'yes' | 'partially' | 'no' | null) => {
    const updatedAssessment = { ...assessment, goalAchieved: value }
    setAssessment(updatedAssessment)

    // If "no", allow confusion note, otherwise save immediately
    if (value === 'no') {
      // Stay on goal step to allow confusion note input
      return
    }

    await saveAssessment(updatedAssessment)
  }

  const handleConfusionSubmit = async () => {
    await saveAssessment(assessment)
  }

  const saveAssessment = async (data: SelfAssessment) => {
    if (!data.confidence || !data.difficulty) return

    setIsSavingAssessment(true)

    try {
      const response = await fetch('/api/self-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonIndex,
          selfConfidence: data.confidence,
          perceivedDifficulty: data.difficulty,
          goalAchieved: data.goalAchieved,
          confusionNote: data.confusionNote || null,
          actualAccuracy: accuracy,
          questionsTotal,
          questionsCorrect,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.analysis?.suggestion) {
          setAssessmentSuggestion(result.analysis.suggestion)
        }
      }
    } catch (error) {
      console.error('Failed to save assessment:', error)
    } finally {
      setIsSavingAssessment(false)
      setCurrentStep('complete')
    }
  }

  const skipAssessment = () => {
    setCurrentStep('complete')
  }

  // Check for content steps that can be reviewed
  const hasContentToReview = lessonSteps.some(step => step.type !== 'question' && step.content)

  // Show recap view
  if (showRecap) {
    return (
      <LessonRecap
        lessonTitle={lessonTitle}
        steps={lessonSteps}
        onClose={() => setShowRecap(false)}
        onContinue={() => setShowRecap(false)}
      />
    )
  }

  // Render
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center z-50 overflow-hidden">
      {showConfetti && <Confetti />}

      <div className="relative z-10 text-center px-6 max-w-md w-full max-h-screen overflow-y-auto py-8">
        {currentStep === 'results' && (
          <ResultsView
            animationStage={animationStage}
            lessonTitle={lessonTitle}
            xpAwarded={xpAwarded}
            totalXp={totalXp}
            isPerfect={isPerfect}
            newAchievements={newAchievements}
            hasQuestions={hasQuestions}
            questionsCorrect={questionsCorrect}
            questionsTotal={questionsTotal}
            accuracy={accuracy}
            onContinue={() => setCurrentStep('confidence')}
          />
        )}

        {currentStep === 'confidence' && (
          <ConfidenceStep
            onSelect={handleConfidenceSelect}
            onSkip={skipAssessment}
          />
        )}

        {currentStep === 'difficulty' && (
          <DifficultyStep
            onSelect={handleDifficultySelect}
            onBack={() => setCurrentStep('confidence')}
          />
        )}

        {currentStep === 'goal' && (
          <GoalStep
            goalAchieved={assessment.goalAchieved}
            confusionNote={assessment.confusionNote}
            onSelect={handleGoalSelect}
            onConfusionChange={(note) => setAssessment(prev => ({ ...prev, confusionNote: note }))}
            onConfusionSubmit={handleConfusionSubmit}
            onSkip={() => saveAssessment(assessment)}
            isSaving={isSavingAssessment}
          />
        )}

        {currentStep === 'complete' && (
          <CompleteView
            lessonIndex={lessonIndex}
            totalLessons={totalLessons}
            courseId={courseId}
            hasNextLesson={hasNextLesson}
            needsReview={needsReview}
            suggestion={assessmentSuggestion}
            hasContentToReview={hasContentToReview}
            onReviewContent={() => setShowRecap(true)}
            onNextLesson={onNextLesson}
          />
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Results View (Step 1)
// =============================================================================

interface ResultsViewProps {
  animationStage: number
  lessonTitle: string
  xpAwarded: number
  totalXp: number
  isPerfect: boolean
  newAchievements: string[]
  hasQuestions: boolean
  questionsCorrect: number
  questionsTotal: number
  accuracy: number
  onContinue: () => void
}

function ResultsView({
  animationStage,
  lessonTitle,
  xpAwarded,
  totalXp,
  isPerfect,
  newAchievements,
  hasQuestions,
  questionsCorrect,
  questionsTotal,
  accuracy,
  onContinue,
}: ResultsViewProps) {
  const getAccuracyColor = () => {
    if (accuracy >= 80) return 'text-green-400'
    if (accuracy >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getAccuracyBgColor = () => {
    if (accuracy >= 80) return 'bg-green-400'
    if (accuracy >= 60) return 'bg-yellow-400'
    return 'bg-red-400'
  }

  const getPerformanceMessage = () => {
    if (!hasQuestions) return { emoji: '✨', text: 'Great job completing this lesson!' }
    if (accuracy >= 80) return { emoji: '🎯', text: "Excellent! You've mastered this lesson." }
    if (accuracy >= 60) return { emoji: '👍', text: 'Good job! Consider reviewing the tricky parts.' }
    return { emoji: '💪', text: 'Keep practicing to improve your score!' }
  }

  const performanceMessage = getPerformanceMessage()

  return (
    <>
      {/* Checkmark */}
      <div
        className={`
          mx-auto mb-6 w-28 h-28 bg-white rounded-full flex items-center justify-center
          shadow-2xl shadow-green-500/30 transition-all duration-500 ease-out
          ${animationStage >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
        `}
      >
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
          <svg
            className={`w-10 h-10 text-white transition-all duration-300 delay-200 ${animationStage >= 1 ? 'scale-100' : 'scale-0'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <div className={`transition-all duration-500 ease-out ${animationStage >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Lesson Complete!</h1>
        <p className="text-indigo-200 text-lg mb-3">{lessonTitle}</p>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full">
          <span className="text-2xl">⭐</span>
          <span className="text-xl font-bold text-yellow-300">
            +{xpAwarded || totalXp} XP
            {isPerfect && <span className="text-green-300 ml-1">(Perfect!)</span>}
          </span>
        </div>

        {newAchievements.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {newAchievements.map((name) => (
              <div key={name} className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/30 backdrop-blur-sm rounded-full text-amber-200 text-sm font-medium">
                <span>🏆</span>
                <span>{name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className={`mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-5 transition-all duration-500 ease-out ${animationStage >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        {hasQuestions ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-indigo-200 text-sm mb-1">Questions</p>
              <p className={`text-2xl font-bold ${getAccuracyColor()}`}>
                {questionsCorrect} of {questionsTotal} correct ({accuracy}%)
              </p>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${getAccuracyBgColor()}`}
                style={{ width: animationStage >= 3 ? `${accuracy}%` : '0%' }}
              />
            </div>
            <div className={`p-3 rounded-xl ${accuracy >= 80 ? 'bg-green-500/20 border border-green-400/30' : accuracy >= 60 ? 'bg-yellow-500/20 border border-yellow-400/30' : 'bg-red-500/20 border border-red-400/30'}`}>
              <p className="text-white font-medium">
                <span className="mr-2">{performanceMessage.emoji}</span>
                {performanceMessage.text}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-white font-medium">
              <span className="mr-2">{performanceMessage.emoji}</span>
              {performanceMessage.text}
            </p>
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className={`mt-6 transition-all duration-500 ease-out ${animationStage >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
        <button
          onClick={onContinue}
          className="w-full py-4 bg-white text-indigo-600 font-bold text-lg rounded-2xl shadow-lg hover:bg-gray-100 active:bg-gray-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </>
  )
}

// =============================================================================
// Confidence Step (Step 2)
// =============================================================================

interface ConfidenceStepProps {
  onSelect: (value: number) => void
  onSkip: () => void
}

function ConfidenceStep({ onSelect, onSkip }: ConfidenceStepProps) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="mb-6">
        <span className="text-4xl mb-4 block">🤔</span>
        <h2 className="text-2xl font-bold text-white mb-2">
          How confident do you feel?
        </h2>
        <p className="text-indigo-200">
          About the material you just learned
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {CONFIDENCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`
              p-4 rounded-2xl bg-gradient-to-br ${option.color}
              hover:scale-105 active:scale-95 transition-all duration-200
              shadow-lg hover:shadow-xl
            `}
          >
            <span className="text-3xl block mb-2">{option.emoji}</span>
            <span className="text-white font-semibold text-sm">{option.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={onSkip}
        className="text-white/60 hover:text-white text-sm transition-colors"
      >
        Skip self-assessment
      </button>
    </div>
  )
}

// =============================================================================
// Difficulty Step (Step 3)
// =============================================================================

interface DifficultyStepProps {
  onSelect: (value: 'too_easy' | 'just_right' | 'too_hard') => void
  onBack: () => void
}

function DifficultyStep({ onSelect, onBack }: DifficultyStepProps) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="mb-6">
        <span className="text-4xl mb-4 block">📊</span>
        <h2 className="text-2xl font-bold text-white mb-2">
          How difficult was this lesson?
        </h2>
        <p className="text-indigo-200">
          This helps us personalize your learning
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {DIFFICULTY_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`
              w-full p-4 rounded-2xl bg-gradient-to-r ${option.color}
              hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
              shadow-lg hover:shadow-xl flex items-center gap-4
            `}
          >
            <span className="text-3xl">{option.emoji}</span>
            <span className="text-white font-semibold text-lg">{option.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={onBack}
        className="text-white/60 hover:text-white text-sm transition-colors flex items-center gap-1 mx-auto"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </div>
  )
}

// =============================================================================
// Goal Step (Step 4 - Optional)
// =============================================================================

interface GoalStepProps {
  goalAchieved: 'yes' | 'partially' | 'no' | null
  confusionNote: string
  onSelect: (value: 'yes' | 'partially' | 'no' | null) => void
  onConfusionChange: (note: string) => void
  onConfusionSubmit: () => void
  onSkip: () => void
  isSaving: boolean
}

function GoalStep({
  goalAchieved,
  confusionNote,
  onSelect,
  onConfusionChange,
  onConfusionSubmit,
  onSkip,
  isSaving,
}: GoalStepProps) {
  const showConfusionInput = goalAchieved === 'no'

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="mb-6">
        <span className="text-4xl mb-4 block">🎯</span>
        <h2 className="text-2xl font-bold text-white mb-2">
          {showConfusionInput ? 'What was confusing?' : 'Did you achieve your learning goal?'}
        </h2>
        <p className="text-indigo-200">
          {showConfusionInput ? 'Optional - helps us improve' : 'Optional feedback'}
        </p>
      </div>

      {!showConfusionInput ? (
        <>
          <div className="space-y-3 mb-6">
            {GOAL_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onSelect(option.value)}
                disabled={isSaving}
                className={`
                  w-full p-4 rounded-2xl bg-gradient-to-r ${option.color}
                  hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
                  shadow-lg hover:shadow-xl flex items-center gap-4
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <span className="text-3xl">{option.emoji}</span>
                <span className="text-white font-semibold text-lg">{option.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onSkip}
            disabled={isSaving}
            className="text-white/60 hover:text-white text-sm transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Skip'}
          </button>
        </>
      ) : (
        <>
          <textarea
            value={confusionNote}
            onChange={(e) => onConfusionChange(e.target.value)}
            placeholder="What concepts or parts were unclear? (optional)"
            className="w-full p-4 rounded-2xl bg-white/20 backdrop-blur-sm text-white placeholder-white/50 border border-white/30 focus:border-white/50 focus:outline-none resize-none h-32 mb-4"
          />

          <div className="space-y-3">
            <button
              onClick={onConfusionSubmit}
              disabled={isSaving}
              className="w-full py-4 bg-white text-indigo-600 font-bold text-lg rounded-2xl shadow-lg hover:bg-gray-100 active:bg-gray-200 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Submit Feedback'}
            </button>
            <button
              onClick={() => onSelect(null)}
              disabled={isSaving}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              Change answer
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// Complete View (Final Step)
// =============================================================================

interface CompleteViewProps {
  lessonIndex: number
  totalLessons: number
  courseId: string
  hasNextLesson: boolean
  needsReview: boolean
  suggestion: string | null
  hasContentToReview: boolean
  onReviewContent: () => void
  onNextLesson?: () => void
}

function CompleteView({
  lessonIndex,
  totalLessons,
  courseId,
  hasNextLesson,
  needsReview,
  suggestion,
  hasContentToReview,
  onReviewContent,
  onNextLesson,
}: CompleteViewProps) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Suggestion from assessment analysis */}
      {suggestion && (
        <div className="mb-6 p-4 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <p className="text-white text-left text-sm">{suggestion}</p>
          </div>
        </div>
      )}

      {/* Thank you message */}
      <div className="mb-6">
        <span className="text-4xl mb-4 block">✨</span>
        <h2 className="text-2xl font-bold text-white mb-2">
          Thanks for your feedback!
        </h2>
        <p className="text-indigo-200">
          Your responses help personalize your learning experience
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Review What You Learned - Quick recap of key points */}
        {hasContentToReview && (
          <button
            onClick={onReviewContent}
            className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold text-lg rounded-2xl shadow-lg hover:from-teal-600 hover:to-cyan-600 active:from-teal-700 active:to-cyan-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Review What You Learned
          </button>
        )}

        {needsReview && (
          <Link
            href={`/course/${courseId}/lesson/${lessonIndex}?restart=true`}
            className="flex items-center justify-center gap-2 w-full py-4 bg-white/20 backdrop-blur-sm text-white font-bold text-lg rounded-2xl border-2 border-white/30 hover:bg-white/30 active:bg-white/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Redo Lesson
          </Link>
        )}

        {hasNextLesson ? (
          <>
            <Link
              href={`/course/${courseId}/lesson/${lessonIndex + 1}`}
              onClick={onNextLesson}
              className="flex items-center justify-center gap-2 w-full py-4 bg-white text-indigo-600 font-bold text-lg rounded-2xl shadow-lg hover:bg-gray-100 active:bg-gray-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Next Lesson
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href={`/course/${courseId}`}
              className="flex items-center justify-center w-full py-3 text-white/80 font-medium hover:text-white transition-colors"
            >
              Back to Course
            </Link>
          </>
        ) : (
          <>
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-2">
              <span className="text-2xl mb-2 block">🎓</span>
              <p className="text-white font-semibold">Course Complete!</p>
              <p className="text-indigo-200 text-sm">You've finished all lessons</p>
            </div>
            <Link
              href={`/course/${courseId}`}
              className="flex items-center justify-center gap-2 w-full py-4 bg-white text-indigo-600 font-bold text-lg rounded-2xl shadow-lg hover:bg-gray-100 active:bg-gray-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Back to Course
            </Link>
          </>
        )}
      </div>

      {/* Lesson progress indicator */}
      <p className="mt-4 text-indigo-200/60 text-sm">
        Lesson {lessonIndex + 1} of {totalLessons}
      </p>
    </div>
  )
}

// =============================================================================
// Confetti Component
// =============================================================================

function Confetti() {
  const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3', '#a8d8ea']
  const confettiCount = 50

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: confettiCount }).map((_, i) => {
        const color = colors[i % colors.length]
        const left = `${Math.random() * 100}%`
        const animationDelay = `${Math.random() * 3}s`
        const animationDuration = `${3 + Math.random() * 2}s`
        const size = 8 + Math.random() * 8

        return (
          <div
            key={i}
            className="absolute animate-confetti"
            style={{
              left,
              top: '-20px',
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animationDelay,
              animationDuration,
            }}
          />
        )
      })}
    </div>
  )
}
