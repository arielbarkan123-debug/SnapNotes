'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useXP } from '@/contexts/XPContext'
import { SessionReflection } from '@/components/reflection'
import type { MistakeItem } from '@/components/practice/MistakeReview'

const MistakeReview = dynamic(() => import('@/components/practice/MistakeReview'), { ssr: false })
const ShareResultCard = dynamic(() => import('@/components/export/ShareResultCard'), { ssr: false })

// =============================================================================
// Types
// =============================================================================

interface ReviewCompleteProps {
  cardsReviewed: number
  timeSpentMs: number
  correctCount: number
  againCount: number
  /** Rating counts: [again, hard, good, easy] */
  ratingCounts?: [number, number, number, number]
  /** Mistakes from the session for review */
  mistakes?: MistakeItem[]
}

// =============================================================================
// Component
// =============================================================================

export default function ReviewComplete({
  cardsReviewed,
  timeSpentMs,
  correctCount,
  againCount,
  ratingCounts = [0, 0, 0, 0],
  mistakes = [],
}: ReviewCompleteProps) {
  const [totalXpEarned, setTotalXpEarned] = useState(0)
  const [streakInfo, setStreakInfo] = useState<{ current: number; maintained: boolean } | null>(null)
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null)
  const [showReflection, setShowReflection] = useState(false)
  const hasAwardedXP = useRef(false)
  const hasTriggeredReflection = useRef(false)
  const { showXP, showLevelUp } = useXP()

  const timeSpentMinutes = Math.round(timeSpentMs / 60000)
  const accuracy = cardsReviewed > 0 ? Math.round((correctCount / cardsReviewed) * 100) : 0

  // Calculate XP: 1 base + bonus for ratings
  // Again=0, Hard=0, Good=1, Easy=2 bonus
  const estimatedXP = cardsReviewed + ratingCounts[2] + (ratingCounts[3] * 2)

  // Award XP on mount
  useEffect(() => {
    if (hasAwardedXP.current || cardsReviewed === 0) return
    hasAwardedXP.current = true

    const awardXP = async () => {
      try {
        let totalXP = 0

        // Award XP for each card reviewed
        // We batch this into a single call for efficiency
        const xpResponse = await fetch('/api/gamification/xp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'card_reviewed',
            bonusXP: estimatedXP - cardsReviewed, // Add bonus for good/easy ratings
            metadata: { cardsReviewed, accuracy },
          }),
        })

        if (xpResponse.ok) {
          try {
            const xpData = await xpResponse.json()
            totalXP = xpData.xpAwarded
            setTotalXpEarned(totalXP)

            if (xpData.levelUp && xpData.newLevel) {
              setLevelUp({ level: xpData.newLevel, title: xpData.newTitle })
            }
          } catch {
            // JSON parse failed - continue without XP data
          }
        }

        // Update streak
        const streakResponse = await fetch('/api/gamification/streak', { method: 'POST' })
        if (streakResponse.ok) {
          try {
            const streakData = await streakResponse.json()
            setStreakInfo({
              current: streakData.streak.current,
              maintained: streakData.streak.maintained,
            })

            // Add streak XP to total
            if (streakData.bonusXP > 0) {
              totalXP += streakData.bonusXP
              setTotalXpEarned(totalXP)
            }
          } catch {
            // JSON parse failed - continue without streak data
          }
        }

        // Show XP popup
        if (totalXP > 0) {
          setTimeout(() => {
            showXP(totalXP)
            if (levelUp) {
              setTimeout(() => showLevelUp(levelUp.level, levelUp.title), 1500)
            }
          }, 500)
        }

        // Check for new achievements (fire-and-forget, ignore errors)
        fetch('/api/gamification/check', { method: 'POST' }).catch(() => {})

        // Trigger reflection after a meaningful session (3+ cards)
        if (!hasTriggeredReflection.current && cardsReviewed >= 3) {
          hasTriggeredReflection.current = true
          // Delay to let XP animations finish
          setTimeout(() => {
            setShowReflection(true)
          }, 2500)
        }
      } catch {
        // XP award failed silently - not critical
      }
    }

    awardXP()
  }, [cardsReviewed, estimatedXP, accuracy, showXP, showLevelUp, levelUp])

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
            <svg
              className="w-12 h-12 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Review Complete!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Great job on your study session
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            label="Cards Reviewed"
            value={cardsReviewed.toString()}
            color="text-indigo-600 dark:text-indigo-400"
          />
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Time Spent"
            value={timeSpentMinutes < 1 ? '< 1 min' : `${timeSpentMinutes} min`}
            color="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Accuracy"
            value={`${accuracy}%`}
            color={accuracy >= 80 ? 'text-green-600 dark:text-green-400' : accuracy >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}
          />
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
            label="Need Review"
            value={againCount.toString()}
            color="text-orange-600 dark:text-orange-400"
          />
        </div>

        {/* XP Earned */}
        {totalXpEarned > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-4 mb-4 border border-amber-200 dark:border-amber-800/50">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">⭐</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                +{totalXpEarned} XP
              </span>
            </div>
            {streakInfo?.maintained && (
              <p className="text-amber-600/80 dark:text-amber-400/80 text-sm mt-1">
                Includes streak bonus!
              </p>
            )}
          </div>
        )}

        {/* Streak Status */}
        {streakInfo && streakInfo.current > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 mb-4 border border-orange-200 dark:border-orange-800/50">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🔥</span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {streakInfo.current} Day Streak
              </span>
            </div>
            <p className="text-orange-600/80 dark:text-orange-400/80 text-sm mt-1">
              {streakInfo.maintained ? 'Keep it going!' : 'Streak maintained!'}
            </p>
          </div>
        )}

        {/* Mistake Review */}
        {mistakes.length > 0 && (
          <div className="mb-4">
            <MistakeReview mistakes={mistakes} namespace="review" />
          </div>
        )}

        {/* Share Results */}
        <div className="mb-4">
          <ShareResultCard
            accuracy={accuracy}
            questionsAnswered={cardsReviewed}
            timeTaken={Math.floor(timeSpentMs / 1000)}
          />
        </div>

        {/* Encouragement Message */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 mb-8">
          <p className="text-indigo-700 dark:text-indigo-300 text-sm">
            {getEncouragementMessage(accuracy, cardsReviewed)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-colors text-center"
          >
            Done
          </Link>
          <Link
            href="/review"
            className="block w-full py-3 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium rounded-xl transition-colors text-center"
          >
            Review More Cards
          </Link>
        </div>
      </div>

      {/* Session Reflection Modal */}
      {showReflection && (
        <SessionReflection
          type="session"
          sessionType="review"
          cardsReviewed={cardsReviewed}
          timeSpentMs={timeSpentMs}
          onComplete={() => setShowReflection(false)}
          onSkip={() => setShowReflection(false)}
        />
      )}
    </div>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className={`${color} mb-2 flex justify-center`}>{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function getEncouragementMessage(accuracy: number, count: number): string {
  if (count === 0) {
    return "No cards to review right now. Check back later!"
  }

  if (accuracy >= 90) {
    return "Outstanding! Your memory is on fire! Keep up the excellent work!"
  }

  if (accuracy >= 80) {
    return "Great job! You're building strong memories. Consistency is key!"
  }

  if (accuracy >= 70) {
    return "Good progress! Those tricky cards will get easier with practice."
  }

  if (accuracy >= 60) {
    return "Keep it up! Regular review sessions will help these stick better."
  }

  return "Every review strengthens your memory. The cards you found hard will be shown again soon!"
}
