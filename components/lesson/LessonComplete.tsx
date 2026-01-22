'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useXP } from '@/contexts/XPContext'
import { type LessonStep } from '@/types'
import LessonRecap from './LessonRecap'

// =============================================================================
// Types
// =============================================================================

interface ConceptMasteryGain {
  conceptId: string
  conceptName: string
  previousMastery: number
  newMastery: number
  change: number
}

interface LessonCompleteProps {
  lessonTitle: string
  lessonIndex: number
  totalLessons: number
  courseId: string
  questionsCorrect: number
  questionsTotal: number
  lessonSteps?: LessonStep[]
  onNextLesson?: () => void
  conceptsGained?: ConceptMasteryGain[]
}

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
  conceptsGained = [],
}: LessonCompleteProps) {
  const t = useTranslations('lesson')
  const [animationStage, setAnimationStage] = useState(0)
  const [xpAwarded, setXpAwarded] = useState(0)
  const [showRecap, setShowRecap] = useState(false)
  const hasAwardedXP = useRef(false)
  const { showXP, showLevelUp } = useXP()

  const hasNextLesson = lessonIndex < totalLessons - 1
  const hasQuestions = questionsTotal > 0
  const accuracy = hasQuestions ? Math.round((questionsCorrect / questionsTotal) * 100) : 100
  const isPerfect = accuracy === 100 && hasQuestions

  // Extract key points from lesson for summary
  const keyPoints = lessonSteps
    .filter(step => step.type === 'key_point' || step.type === 'summary')
    .slice(0, 3)
    .map(step => step.content)

  // XP calculation
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
          }, 1000)
        }

        await fetch('/api/gamification/streak', { method: 'POST' })
        await fetch('/api/gamification/check', { method: 'POST' })
      } catch {
        // XP award failed silently - not critical
      }
    }

    awardXP()
  }, [isPerfect, courseId, lessonIndex, accuracy, showXP, showLevelUp])

  // Staggered animations
  useEffect(() => {
    const timers = [
      setTimeout(() => setAnimationStage(1), 100),
      setTimeout(() => setAnimationStage(2), 300),
      setTimeout(() => setAnimationStage(3), 500),
      setTimeout(() => setAnimationStage(4), 700),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const hasContentToReview = lessonSteps.some(step => step.type !== 'question' && step.content)

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

  return (
    <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 flex items-start sm:items-center justify-center z-50 overflow-y-auto">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto px-4 xs:px-6 py-6 xs:py-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        {/* Success Icon */}
        <div className={`flex justify-center mb-8 transition-all duration-500 ${animationStage >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {/* Ring animation */}
            <div className="absolute inset-0 rounded-full border-4 border-green-400/50 animate-ping" />
          </div>
        </div>

        {/* Title & Lesson Name */}
        <div className={`text-center mb-8 transition-all duration-500 ${animationStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('lessonComplete')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {lessonTitle}
          </p>
        </div>

        {/* Stats Card */}
        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-all duration-500 ${animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('xpEarned')}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">+{xpAwarded || totalXp}</p>
              </div>
            </div>
            {isPerfect && (
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium rounded-full">
                {t('perfect')}
              </span>
            )}
          </div>

          {hasQuestions && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500 dark:text-gray-400">{t('accuracy')}</span>
                <span className={`font-medium ${accuracy >= 80 ? 'text-green-600 dark:text-green-400' : accuracy >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {questionsCorrect}/{questionsTotal} ({accuracy}%)
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${accuracy >= 80 ? 'bg-green-500' : accuracy >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${accuracy}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Key Points Summary */}
        {keyPoints.length > 0 && (
          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-all duration-500 ${animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              {t('whatYouLearned')}
            </h3>
            <ul className="space-y-3">
              {keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concept Mastery Gained */}
        {conceptsGained.length > 0 && (
          <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6 transition-all duration-500 ${animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {t('conceptMastery')}
            </h3>
            <div className="space-y-3">
              {conceptsGained.slice(0, 5).map((concept) => (
                <div key={concept.conceptId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {concept.conceptName}
                      </span>
                      <span className={`text-xs font-medium ${concept.change > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {concept.change > 0 && '+'}
                        {Math.round(concept.change * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.round(concept.newMastery * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                      <span>{Math.round(concept.previousMastery * 100)}%</span>
                      <span>{Math.round(concept.newMastery * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {conceptsGained.length > 5 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                {t('moreConceptsPracticed', { count: conceptsGained.length - 5 })}
              </p>
            )}
            <Link
              href="/knowledge-map"
              className="flex items-center justify-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-4"
            >
              {t('viewKnowledgeMap')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Progress Indicator */}
        <div className={`mb-6 transition-all duration-500 ${animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>{t('courseProgress')}</span>
            <span>{t('lessonsProgress', { current: lessonIndex + 1, total: totalLessons })}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalLessons }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= lessonIndex
                    ? 'bg-blue-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`space-y-3 transition-all duration-500 ${animationStage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {hasNextLesson ? (
            <Link
              href={`/course/${courseId}/lesson/${lessonIndex + 1}`}
              onClick={onNextLesson}
              className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              {t('continueToNextLesson')}
              <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          ) : (
            <div className="text-center py-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl mb-3">
              <span className="text-2xl mb-1 block">🎓</span>
              <p className="text-white font-semibold">{t('courseComplete')}</p>
              <p className="text-blue-100 text-sm">{t('congratsFinished')}</p>
            </div>
          )}

          <div className="flex gap-3">
            {hasContentToReview && (
              <button
                onClick={() => setShowRecap(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {t('review')}
              </button>
            )}
            <Link
              href={`/course/${courseId}`}
              className={`${hasContentToReview ? 'flex-1' : 'w-full'} flex items-center justify-center gap-2 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl border border-gray-200 dark:border-gray-700 transition-colors`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              {t('courseOverview')}
            </Link>
          </div>

          {accuracy < 80 && hasQuestions && (
            <Link
              href={`/course/${courseId}/lesson/${lessonIndex}?restart=true`}
              className="flex items-center justify-center gap-2 w-full py-3 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('retryLesson')}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
