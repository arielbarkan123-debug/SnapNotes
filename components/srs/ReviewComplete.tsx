'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useXP } from '@/contexts/XPContext'
import { SessionReflection } from '@/components/reflection'
import type { MistakeItem } from '@/components/practice/MistakeReview'

const MistakeReview = dynamic(() => import('@/components/practice/MistakeReview'), { ssr: false })
const StreakPopup = dynamic(() => import('@/components/gamification/StreakPopup'), { ssr: false })
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
  const { showXP, showLevelUp, showAchievement } = useXP()
  const [showStreakPopup, setShowStreakPopup] = useState(false)
  const t = useTranslations('review')

  const timeSpentMinutes = Math.round(timeSpentMs / 60000)
  const accuracy = cardsReviewed > 0 ? Math.round((correctCount / cardsReviewed) * 100) : 0

  // Calculate XP: 1 base + bonus for ratings
  // Again=0, Hard=0, Good=1, Easy=2 bonus
  const estimatedXP = cardsReviewed + ratingCounts[2] + (ratingCounts[3] * 2)

  const getEncouragementMessage = useCallback((acc: number, count: number): string => {
    if (count === 0) {
      return t('complete.encouragement.noCards')
    }
    if (acc >= 90) {
      return t('complete.encouragement.outstanding')
    }
    if (acc >= 80) {
      return t('complete.encouragement.great')
    }
    if (acc >= 70) {
      return t('complete.encouragement.good')
    }
    if (acc >= 60) {
      return t('complete.encouragement.keepItUp')
    }
    return t('complete.encouragement.default')
  }, [t])

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
              current: streakData.streak?.current ?? 0,
              maintained: streakData.streak?.maintained ?? false,
            })
            if (streakData.streak?.maintained) {
              setShowStreakPopup(true)
            }

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
          }, 500)
        }

        // Check for new achievements
        try {
          const checkResponse = await fetch('/api/gamification/check', { method: 'POST' })
          if (checkResponse.ok) {
            const checkData = await checkResponse.json()
            if (checkData.newAchievements && Array.isArray(checkData.newAchievements)) {
              for (let i = 0; i < checkData.newAchievements.length; i++) {
                const achievement = checkData.newAchievements[i]
                setTimeout(() => {
                  showAchievement(achievement.name, achievement.xpReward || 0, achievement.emoji)
                }, 2000 + i * 2000)
              }
            }
          }
        } catch {
          // Achievement check failed silently
        }

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
  }, [cardsReviewed, estimatedXP, accuracy, showXP, showAchievement])

  // Show level up popup when levelUp state is set (separate effect to avoid stale closure)
  useEffect(() => {
    if (levelUp && totalXpEarned > 0) {
      setTimeout(() => showLevelUp(levelUp.level, levelUp.title), 1500)
    }
  }, [levelUp, totalXpEarned, showLevelUp])

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
          {t('complete.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t('complete.subtitle')}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            label={t('complete.cardsReviewed')}
            value={cardsReviewed.toString()}
            color="text-violet-600 dark:text-violet-400"
          />
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label={t('complete.timeSpent')}
            value={timeSpentMinutes < 1 ? t('complete.lessThanOneMin') : t('complete.minutes', { count: timeSpentMinutes })}
            color="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label={t('complete.accuracy')}
            value={`${accuracy}%`}
            color={accuracy >= 80 ? 'text-green-600 dark:text-green-400' : accuracy >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}
          />
          <StatCard
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
            label={t('complete.needReview')}
            value={againCount.toString()}
            color="text-orange-600 dark:text-orange-400"
          />
        </div>

        {/* XP Earned */}
        {totalXpEarned > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-[22px] shadow-card p-4 mb-4 border border-amber-200 dark:border-amber-800/50">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">⭐</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                +{totalXpEarned} XP
              </span>
            </div>
            {streakInfo?.maintained && (
              <p className="text-amber-600/80 dark:text-amber-400/80 text-sm mt-1">
                {t('complete.streakBonus')}
              </p>
            )}
          </div>
        )}

        {/* Streak Status */}
        {streakInfo && streakInfo.current > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-[22px] shadow-card p-4 mb-4 border border-orange-200 dark:border-orange-800/50">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🔥</span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {t('complete.dayStreak', { count: streakInfo.current })}
              </span>
            </div>
            <p className="text-orange-600/80 dark:text-orange-400/80 text-sm mt-1">
              {streakInfo.maintained ? t('complete.keepItGoing') : t('complete.streakMaintained')}
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
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-[22px] shadow-card p-4 mb-8">
          <p className="text-violet-700 dark:text-violet-300 text-sm">
            {getEncouragementMessage(accuracy, cardsReviewed)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full py-3 px-6 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white font-semibold rounded-xl transition-colors text-center"
          >
            {t('complete.done')}
          </Link>
          <Link
            href="/review"
            className="block w-full py-3 px-6 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium rounded-xl transition-colors text-center"
          >
            {t('complete.reviewMore')}
          </Link>
        </div>

        {/* Practice Weak Topics CTA */}
        {accuracy < 80 && (
          <div className="mt-6 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-[22px] shadow-card p-4 border border-purple-200 dark:border-purple-800/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div className="flex-1">
                <p className="font-semibold text-purple-900 dark:text-purple-100 text-sm">
                  {t('complete.practiceWeak')}
                </p>
                <p className="text-purple-700 dark:text-purple-300 text-xs mt-0.5">
                  {t('complete.practiceWeakDesc')}
                </p>
              </div>
              <Link
                href="/practice"
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                {t('complete.startPractice')}
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Streak Popup */}
      {showStreakPopup && streakInfo && (
        <StreakPopup
          days={streakInfo.current}
          onComplete={() => setShowStreakPopup(false)}
        />
      )}

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
    <div className="bg-white dark:bg-gray-800 rounded-[22px] p-4 shadow-card border border-gray-100 dark:border-gray-700">
      <div className={`${color} mb-2 flex justify-center`}>{icon}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  )
}
