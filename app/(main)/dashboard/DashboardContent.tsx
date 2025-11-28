'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import CourseCard from '@/components/course/CourseCard'
import UploadModal from '@/components/upload/UploadModal'
import { DashboardWidget } from '@/components/srs'
import { StreakWidget, MiniStreak } from '@/components/gamification/StreakWidget'
import { Course } from '@/types'
import { useCourses } from '@/hooks'
import { useToast } from '@/contexts/ToastContext'
import { useXP } from '@/contexts/XPContext'
import { formatXP, getLevelTitle, getLevelBadge } from '@/lib/gamification/xp'

interface GamificationStats {
  totalXP: number
  level: number
  levelTitle: string
  levelProgress: {
    current: number
    target: number
    percent: number
  }
  streak: {
    current: number
    longest: number
    isAtRisk: boolean
    activeToday: boolean
    hoursRemaining: number
  }
}

interface Recommendation {
  type: 'review' | 'practice' | 'new_lesson' | 'break'
  message: string
  action: {
    label: string
    href: string
  }
  reason: string
  priority: number
  icon: string
}

interface SessionSuggestion {
  type: 'quick' | 'standard' | 'deep'
  duration: number
  cardCount: number
  message: string
  icon: string
}

interface DashboardContentProps {
  initialCourses: Course[]
}

export default function DashboardContent({ initialCourses }: DashboardContentProps) {
  const router = useRouter()
  const { error: showError } = useToast()
  const { showXP, showLevelUp } = useXP()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [gamificationStats, setGamificationStats] = useState<GamificationStats | null>(null)
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [sessionSuggestion, setSessionSuggestion] = useState<SessionSuggestion | null>(null)
  const hasCheckedStreak = useRef(false)

  // Fetch gamification stats, recommendations, and check streak on mount
  useEffect(() => {
    const fetchStatsAndCheckStreak = async () => {
      try {
        // Fetch gamification stats and recommendations in parallel
        const [statsResponse, recResponse] = await Promise.all([
          fetch('/api/gamification/stats'),
          fetch('/api/recommendations'),
        ])

        if (statsResponse.ok) {
          const stats = await statsResponse.json()
          setGamificationStats(stats)
        }

        if (recResponse.ok) {
          const recData = await recResponse.json()
          setRecommendation(recData.recommendation)
          setSessionSuggestion(recData.session)
        }

        // Check streak (only once per session)
        if (!hasCheckedStreak.current) {
          hasCheckedStreak.current = true

          const streakResponse = await fetch('/api/gamification/streak', { method: 'POST' })
          if (streakResponse.ok) {
            const streakData = await streakResponse.json()

            // Show streak bonus XP if earned
            if (streakData.bonusXP > 0 && streakData.streak.maintained) {
              showXP(streakData.bonusXP)
            }

            // Check for level up from streak
            if (streakData.levelUp && streakData.newLevel) {
              setTimeout(() => showLevelUp(streakData.newLevel), 1500)
            }

            // Refresh stats after streak update
            const updatedStats = await fetch('/api/gamification/stats')
            if (updatedStats.ok) {
              setGamificationStats(await updatedStats.json())
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch gamification stats:', error)
      }
    }

    fetchStatsAndCheckStreak()
  }, [showXP, showLevelUp])

  const {
    filteredCourses,
    totalCount,
    filteredCount,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    clearSearch,
    sortOrder,
    toggleSortOrder,
    isLoading,
    error,
    refetch,
  } = useCourses({
    initialCourses,
    debounceDelay: 300,
  })

  const handleOpenUploadModal = () => {
    setIsUploadModalOpen(true)
  }

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false)
  }

  const handleRefresh = async () => {
    router.refresh()
    try {
      await refetch()
    } catch {
      showError('Failed to refresh courses')
    }
  }

  // Show toast when error occurs
  useEffect(() => {
    if (error) {
      showError(error)
    }
  }, [error, showError])

  const isSearching = searchQuery.trim().length > 0
  const hasNoResults = isSearching && filteredCount === 0
  const hasNoCourses = totalCount === 0

  return (
    <>
      <div className="container mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
        {/* Gamification Stats Header */}
        {gamificationStats && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Level & XP Card */}
            <Link
              href="/profile"
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getLevelBadge(gamificationStats.level)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white">
                      Level {gamificationStats.level}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {gamificationStats.levelTitle}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${gamificationStats.levelProgress.percent}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatXP(gamificationStats.levelProgress.current)} / {formatXP(gamificationStats.levelProgress.target)} XP
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Streak Card */}
            <Link
              href="/profile"
              className={`
                rounded-xl border p-4 transition-shadow hover:shadow-md
                ${gamificationStats.streak.current > 0
                  ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 dark:border-orange-800/50 dark:from-orange-900/20 dark:to-red-900/20'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                }
                ${gamificationStats.streak.isAtRisk ? 'animate-pulse' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">🔥</div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">
                    {gamificationStats.streak.current} Day Streak
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {gamificationStats.streak.isAtRisk && !gamificationStats.streak.activeToday ? (
                      <span className="text-orange-600 dark:text-orange-400">
                        {Math.floor(gamificationStats.streak.hoursRemaining)}h left to maintain!
                      </span>
                    ) : gamificationStats.streak.activeToday ? (
                      <span className="text-green-600 dark:text-green-400">Active today!</span>
                    ) : (
                      `Best: ${gamificationStats.streak.longest} days`
                    )}
                  </div>
                </div>
              </div>
            </Link>

            {/* Total XP Card */}
            <Link
              href="/profile"
              className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1"
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">⭐</div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">
                    {formatXP(gamificationStats.totalXP)} XP
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Total earned
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Personalized Recommendation */}
        {recommendation && (
          <RecommendationCard
            recommendation={recommendation}
            sessionSuggestion={sessionSuggestion}
          />
        )}

        {/* Page Header */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Your Study Courses
              </h1>
              {totalCount > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isSearching
                    ? `${filteredCount} of ${totalCount} courses`
                    : `${totalCount} course${totalCount !== 1 ? 's' : ''}`
                  }
                </p>
              )}
            </div>
            {/* Desktop upload button */}
            <Button
              size="lg"
              onClick={handleOpenUploadModal}
              className="hidden sm:inline-flex"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Upload Notebook Page
            </Button>
          </div>
        </div>

        {/* SRS Review Widget */}
        <DashboardWidget />

        {/* Search and Sort Bar - only show if there are courses */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
            {/* Search Input - full width on mobile */}
            <div className="relative flex-1 sm:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="search"
                inputMode="search"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-10 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-base"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 active:text-gray-700 min-w-[44px] justify-center"
                  aria-label="Clear search"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Sort and Refresh Controls */}
            <div className="flex items-center gap-2">
              {/* Sort Toggle */}
              <button
                onClick={toggleSortOrder}
                className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 dark:active:bg-gray-500 transition-colors text-sm font-medium min-h-[44px]"
                title={`Currently showing ${sortOrder === 'newest' ? 'newest first' : 'oldest first'}`}
              >
                <svg
                  className={`w-5 h-5 sm:w-4 sm:h-4 transition-transform ${sortOrder === 'oldest' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                </span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl sm:rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 dark:active:bg-gray-500 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px]"
                aria-label="Refresh courses"
              >
                <svg
                  className={`w-5 h-5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Debounce Indicator */}
        {searchQuery && searchQuery !== debouncedSearchQuery && (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Searching...
          </div>
        )}

        {/* Courses Grid or Empty State */}
        {hasNoCourses ? (
          <EmptyState onUploadClick={handleOpenUploadModal} />
        ) : hasNoResults ? (
          <NoSearchResults query={debouncedSearchQuery} onClear={clearSearch} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>

      {/* Mobile Floating Action Button */}
      <button
        onClick={handleOpenUploadModal}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors"
        aria-label="Upload notebook page"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={handleCloseUploadModal}
      />
    </>
  )
}

// ============================================================================
// Empty States
// ============================================================================

interface EmptyStateProps {
  onUploadClick: () => void
}

function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4 sm:mb-6">
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-600 dark:text-indigo-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
        No courses yet
      </h2>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-sm sm:max-w-md text-sm sm:text-base">
        Upload your first notebook page to get started. Our AI will transform your notes into an interactive study course.
      </p>
      <Button size="lg" onClick={onUploadClick} className="w-full sm:w-auto">
        <svg
          className="w-5 h-5 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        Upload Your First Notebook Page
      </Button>
    </div>
  )
}

interface NoSearchResultsProps {
  query: string
  onClear: () => void
}

function NoSearchResults({ query, onClear }: NoSearchResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4 sm:mb-6">
        <svg
          className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
        No courses found
      </h2>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-2 text-sm sm:text-base">
        No courses match your search
      </p>
      <p className="text-gray-500 dark:text-gray-500 text-sm mb-6 font-medium text-center break-all max-w-xs">
        &ldquo;{query}&rdquo;
      </p>
      <Button variant="secondary" onClick={onClear} className="w-full sm:w-auto min-h-[44px]">
        Clear search
      </Button>
    </div>
  )
}

// ============================================================================
// Recommendation Card
// ============================================================================

interface RecommendationCardProps {
  recommendation: Recommendation
  sessionSuggestion: SessionSuggestion | null
}

function RecommendationCard({ recommendation, sessionSuggestion }: RecommendationCardProps) {
  // Get background color based on recommendation type
  const getBgClass = () => {
    switch (recommendation.type) {
      case 'review':
        return 'from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-200 dark:border-indigo-800/50'
      case 'practice':
        return 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800/50'
      case 'new_lesson':
        return 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800/50'
      case 'break':
        return 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/50'
      default:
        return 'from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-700'
    }
  }

  const getButtonClass = () => {
    switch (recommendation.type) {
      case 'review':
        return 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
      case 'practice':
        return 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
      case 'new_lesson':
        return 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
      case 'break':
        return 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
    }
  }

  return (
    <div className={`mb-6 rounded-xl border bg-gradient-to-br p-4 sm:p-5 ${getBgClass()}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon and Content */}
        <div className="flex items-start gap-3 flex-1">
          <div className="text-3xl sm:text-4xl flex-shrink-0">{recommendation.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Suggested for you
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">
              {recommendation.message}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {recommendation.reason}
            </p>

            {/* Session suggestion badge */}
            {sessionSuggestion && recommendation.type !== 'break' && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 rounded-full px-2.5 py-1">
                <span>{sessionSuggestion.icon}</span>
                <span>
                  {sessionSuggestion.type === 'quick' ? 'Quick' : sessionSuggestion.type === 'deep' ? 'Deep' : 'Standard'} session
                </span>
                <span className="text-gray-400 dark:text-gray-500">•</span>
                <span>{sessionSuggestion.duration} min</span>
                {sessionSuggestion.cardCount > 0 && (
                  <>
                    <span className="text-gray-400 dark:text-gray-500">•</span>
                    <span>~{sessionSuggestion.cardCount} cards</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Link
          href={recommendation.action.href}
          className={`
            flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-semibold
            transition-colors whitespace-nowrap min-h-[48px] w-full sm:w-auto
            ${getButtonClass()}
          `}
        >
          {recommendation.action.label}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
